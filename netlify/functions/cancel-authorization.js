const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { email } = JSON.parse(event.body);

  try {
    // Rechercher les intents de paiement avec l'email fourni dans les métadonnées
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 10, // Vous pouvez ajuster cette limite selon vos besoins
    });

    // Filtrer les intents de paiement pour trouver celui avec l'email correspondant
    const paymentIntent = paymentIntents.data.find(intent => intent.metadata.email === email);

    if (!paymentIntent) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No payment intent found for the provided email.' }),
      };
    }

    // Annuler l'intent de paiement trouvé
    const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntent.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, paymentIntent: canceledPaymentIntent }),
    };
  } catch (error) {
    console.log('Error canceling PaymentIntent:', error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
