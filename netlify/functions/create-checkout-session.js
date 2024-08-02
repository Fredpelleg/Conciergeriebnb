// Exemple de fonction Netlify pour créer un PaymentIntent
const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
// Import the Stripe library using the secret key
//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    // Parse the request body to extract necessary data
    const {
      amount,
      currency,
      email,
      reservationId,
      clientConsent,
      reservationDuration,
      paymentMethodId,
    } = JSON.parse(event.body);

    // Validate that all necessary information is present
    if (!email || !amount || !currency || !reservationId || !paymentMethodId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "All fields are required." }),
      };
    }

    // Check if the customer already exists in Stripe
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      // Use the existing customer
      customer = existingCustomers.data[0];
    } else {
      // Create a new customer if one doesn't already exist
      customer = await stripe.customers.create({
        email: email,
        description: `Customer for ${email}`,
      });
    }

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set the default payment method for future transactions
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Calculate the end date for the reservation
    const now = new Date();
    const endDate = new Date(now.getTime() + reservationDuration * 24 * 60 * 60 * 1000 + 2 * 24 * 60 * 60 * 1000);

    // Create the payment intent with all relevant metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method: paymentMethodId,
      customer: customer.id,
      capture_method: 'manual',
      confirm: true, // Confirm the payment intent immediately
      metadata: {
        reservation_id: reservationId,
        email: email,
        client_consent: clientConsent,
        reservation_duration: reservationDuration.toString(),
        end_date: endDate.toISOString(),
        is_caution: 'true', // Indicate this is a deposit/caution
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id }),
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};




