// Exemple de fonction Netlify pour créer un PaymentIntent
const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
exports.handler = async (event) => {
  const { amount, currency, email, reservationId, clientConsent, reservationDuration } = JSON.parse(event.body);

  try {
    // Créer un nouveau client Stripe
    const customer = await stripe.customers.create({
      email: email,
      description: `Client pour la réservation ${reservationId}`,
    });

    const now = new Date();
    const endDate = new Date(now.getTime() + (reservationDuration * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method_types: ['card'],
      capture_method: 'manual',
      description: reservationId,
      receipt_email: email,
      customer: customer.id, // Associer le client à l'intention de paiement
      metadata: {
        email: email,
        client_consent: clientConsent,
        reservation_duration: reservationDuration.toString(),
        end_date: endDate.toISOString(),
        is_caution: 'true',
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

