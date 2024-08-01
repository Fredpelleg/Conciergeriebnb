// Exemple de fonction Netlify pour créer un PaymentIntent
const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { amount, currency, email, reservationId, clientConsent, reservationDuration } = JSON.parse(event.body);

    // Validation: Ensure all required fields are provided
    if (!amount || !currency || !email || !reservationId || !clientConsent || !reservationDuration) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'All fields are required.' }),
      };
    }

    // Create a customer or retrieve existing one
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
        description: `Client for reservation ${reservationId}`,
      });
    }

    // Create a PaymentIntent with manual capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      customer: customer.id,  // Associate with customer
      payment_method_types: ['card'],
      capture_method: 'manual',
      description: reservationId,
      metadata: {
        email: email,
        client_consent: clientConsent,
        reservation_duration: reservationDuration.toString(),
        end_date: new Date(Date.now() + (reservationDuration * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000)).toISOString(),
        is_caution: 'true',  // Indicate this is a caution
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,  // Return customer ID if needed
      }),
    };
  } catch (error) {
    console.error(`Erreur lors de la création de la session de paiement : ${error.message}`);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

