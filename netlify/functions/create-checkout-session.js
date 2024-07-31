//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

exports.handler = async (event) => {
  console.log('Handler invoked for create-checkout-session');

  const { amount, currency, email, reservationId, clientConsent, reservationDuration } = JSON.parse(event.body);

  try {
    const now = new Date();
    const endDate = new Date(now.getTime() + (reservationDuration * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method_types: ['card'],
      capture_method: 'manual',
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

    console.log('PaymentIntent created with metadata:', paymentIntent.metadata);

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
