const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

exports.handler = async (event) => {
  const { amount, currency, email, reservationId, clientConsent, reservationDuration } = JSON.parse(event.body);

  console.log('Données reçues:', { amount, currency, email, reservationId, clientConsent, reservationDuration });

  if (!amount || !currency || !email || !reservationId || !clientConsent || !reservationDuration) {
    console.error('Tous les champs sont requis:', { amount, currency, email, reservationId, clientConsent, reservationDuration });
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Tous les champs sont requis.' }),
    };
  }

  try {
    const now = new Date();
    const endDate = new Date(now.getTime() + (parseInt(reservationDuration, 10) * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(amount, 10),
      currency: currency,
      payment_method_types: ['card'],
      capture_method: 'manual', // Pour créer une autorisation
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

    console.log('PaymentIntent créé avec succès:', paymentIntent);

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id }),
    };
  } catch (error) {
    console.error('Erreur lors de la création du PaymentIntent:', error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
