const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { amount, currency, email, reservationId, clientConsent } = JSON.parse(event.body);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method_types: ['card'],
      capture_method: 'manual',
      metadata: {
        email: email,
        reservation_id: reservationId,  // Assurez-vous que l'ID de réservation est inclus
        client_consent: clientConsent,
        stay_duration: 'X days',
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
