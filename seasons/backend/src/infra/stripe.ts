import Stripe from 'stripe';
import { config } from 'dotenv';

// Load environment variables
config();

// Ensure the API key is available
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY environment variable');
  process.exit(1);
}

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { 
  apiVersion: '2023-10-16' 
});

/**
 * Create a new subscription for a user
 * @param email User's email address
 * @param paymentMethod Stripe payment method ID
 * @returns Subscription ID
 */
export const createSubscription = async (email: string, paymentMethod: string) => {
  try {
    // Create or retrieve customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer;
    
    if (customers.data.length > 0) {
      customer = customers.data[0];
      // Attach the payment method to the existing customer
      await stripe.paymentMethods.attach(paymentMethod, { customer: customer.id });
    } else {
      // Create a new customer with the payment method
      customer = await stripe.customers.create({ 
        email, 
        payment_method: paymentMethod,
        invoice_settings: {
          default_payment_method: paymentMethod,
        }
      });
    }
    
    // Set the payment method as the default
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod,
      },
    });
    
    // Create the subscription with a trial period
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      trial_period_days: 60,
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });
    
    return subscription.id;
  } catch (error) {
    console.error('Stripe subscription creation error:', error);
    throw error;
  }
};

/**
 * Get the status of a subscription
 * @param subscriptionId Stripe subscription ID
 * @returns Subscription object
 */
export const getSubscriptionStatus = async (subscriptionId: string) => {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Failed to retrieve subscription:', error);
    throw error;
  }
};

/**
 * Cancel a subscription immediately or at period end
 * @param subscriptionId Stripe subscription ID
 * @param atPeriodEnd Whether to cancel at period end (true) or immediately (false)
 */
export const cancelSubscription = async (subscriptionId: string, atPeriodEnd = true) => {
  try {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: atPeriodEnd,
    });
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw error;
  }
};

/**
 * Create a checkout session for purchasing a card
 * @param cardId ID of the card being purchased
 * @param price Price in USD
 * @param customerId Stripe customer ID
 * @param successUrl URL to redirect on success
 * @param cancelUrl URL to redirect on cancel
 */
export const createCardCheckoutSession = async (
  cardId: string,
  price: number,
  customerId: string,
  successUrl: string,
  cancelUrl: string
) => {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Season Card #${cardId}`,
              description: 'Digital collectible card',
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        cardId,
      },
    });
    
    return session;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    throw error;
  }
}; 