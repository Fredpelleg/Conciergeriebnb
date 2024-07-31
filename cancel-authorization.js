const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { reservationId } = JSON.parse(event.body);

  try {
    // Rechercher les PaymentIntents avec l'ID de réservation dans les métadonnées
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100, // Limite à 100 résultats pour la recherche
    });

    // Trouver le PaymentIntent correspondant à l'ID de réservation
    const paymentIntent = paymentIntents.data.find(pi => pi.metadata.reservationId === reservationId);

    if (!paymentIntent) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No PaymentIntent found for the given reservation ID' }),
      };
    }

    // Annuler le PaymentIntent
    const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntent.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, paymentIntent: canceledPaymentIntent }),
    };
  } catch (error) {
    console.error('Error canceling PaymentIntent:', error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
