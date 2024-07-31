const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { amount, currency, email, reservationId, clientConsent, reservationDuration } = JSON.parse(event.body);

  try {
    // Créer la première autorisation
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method_types: ['card'],
      capture_method: 'manual',
      description: reservationId,
      metadata: {
        email: email,
        client_consent: clientConsent,
        reservation_duration: reservationDuration,
      },
    });

    if (reservationDuration > 7) {
      // Planifier la réautorisation après 7 jours moins 2 jours avant la fin de la réservation
      const reauthorizationTime = (reservationDuration - 7) * 24 * 60 * 60 * 1000 - 2 * 24 * 60 * 60 * 1000;
      
      setTimeout(async () => {
        // Annuler l'autorisation existante
        await stripe.paymentIntents.cancel(paymentIntent.id);

        // Créer une nouvelle autorisation pour le montant total
        await stripe.paymentIntents.create({
          amount: amount,
          currency: currency,
          payment_method_types: ['card'],
          capture_method: 'manual',
          description: reservationId,
          metadata: {
            email: email,
            client_consent: clientConsent,
            reservation_duration: reservationDuration,
          },
        });
      }, reauthorizationTime);
    }

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
