const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

exports.handler = async (event) => {
  const signature = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, signature, endpointSecret);
  } catch (err) {
    console.error('Erreur de signature:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'payment_intent.canceled') {
    const paymentIntent = stripeEvent.data.object;
    console.info(`Caution annulée détectée pour : ${paymentIntent.id}`);

    try {
      // Récupérer le PaymentMethod et Customer associés à l'intention de paiement
      const paymentMethodId = paymentIntent.payment_method;
      const customerId = paymentIntent.customer;

      if (!paymentMethodId || !customerId) {
        console.error('PaymentMethod ou Customer non attaché.');
        return { statusCode: 400, body: 'PaymentMethod ou Customer non trouvé.' };
      }

      // Créer une nouvelle intention de paiement avec la même méthode de paiement
      const newPaymentIntent = await stripe.paymentIntents.create({
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customer: customerId, // Utiliser le client existant
        payment_method: paymentMethodId, // Réutiliser la même méthode de paiement
        off_session: true,  // Permet la réutilisation du PaymentMethod
        confirm: true, // Confirmer automatiquement la nouvelle intention de paiement
        capture_method: 'manual',
        metadata: paymentIntent.metadata
      });

      console.info(`Nouvelle intention de paiement créée: ${newPaymentIntent.id}`);
    } catch (error) {
      console.error('Erreur lors du traitement de l\'événement webhook:', error.message);
      return { statusCode: 500, body: `Erreur lors du traitement de l'événement webhook: ${error.message}` };
    }
  }

  return { statusCode: 200, body: 'Événement reçu' };
};
