const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);  // Use the new secret key

exports.handler = async (event) => {
  const { amount, currency, email, reservationId, clientConsent, reservationDuration } = JSON.parse(event.body);

  console.log('Received data:', { amount, currency, email, reservationId, clientConsent, reservationDuration });

  if (!amount || !currency || !email || !reservationId || !clientConsent || !reservationDuration) {
    console.error('All fields are required:', { amount, currency, email, reservationId, clientConsent, reservationDuration });
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'All fields are required.' }),
    };
  }

  try {
    const now = new Date();
    const endDate = new Date(now.getTime() + (parseInt(reservationDuration, 10) * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(amount, 10), // Ensure the amount is an integer
      currency: currency,
      payment_method_types: ['card'],
      capture_method: 'manual', // Create an authorization
      description: reservationId,
      receipt_email: email,
      metadata: {
        email: email,
        client_consent: clientConsent,
        reservation_duration: reservationDuration.toString(),
        end_date: endDate.toISOString(),
        is_caution: 'true',
      },
    });

    console.log('PaymentIntent created successfully:', paymentIntent);

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id }),
    };
  } catch (error) {
    console.error('Error creating PaymentIntent:', error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
