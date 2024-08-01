const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

exports.handler = async (event) => {
  const payload = event.body;
  const sig = event.headers['stripe-signature'];

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeEvent = stripe.webhooks.constructEvent(payload, sig, webhookSecret);

    // Vérification de l'événement annulé
    if (stripeEvent.type === 'payment_intent.canceled') {
      const paymentIntent = stripeEvent.data.object;

      console.log('Paiement annulé:', paymentIntent.id);

      // Logique pour créer une nouvelle autorisation si nécessaire
      if (paymentIntent.metadata.reservation_duration > 7) {
        const newPaymentIntent = await stripe.paymentIntents.create({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          payment_method_types: ['card'],
          capture_method: 'manual',
          description: paymentIntent.description,
          receipt_email: paymentIntent.receipt_email,
          metadata: paymentIntent.metadata, // Conserver les métadonnées
        });

        console.log('Nouvelle autorisation créée:', newPaymentIntent.id);
      }
    }

    return { statusCode: 200 };
  } catch (err) {
    console.error('Erreur Webhook:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
};
