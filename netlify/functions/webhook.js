const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const payload = event.body;
  const sig = event.headers['stripe-signature'];

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeEvent = stripe.webhooks.constructEvent(payload, sig, webhookSecret);

    // Vérifie si l'événement est payment_intent.canceled
    if (stripeEvent.type === 'payment_intent.canceled') {
      const paymentIntent = stripeEvent.data.object;
      console.log('Reçu payment_intent.canceled pour:', paymentIntent.id);

      // Vérifie si la réservation est une caution et que la durée > 7 jours
      if (paymentIntent.metadata.is_caution === 'true' && parseInt(paymentIntent.metadata.reservation_duration) > 7) {
        const newEndDate = new Date(paymentIntent.metadata.end_date);
        const currentDate = new Date();
        const remainingDays = Math.floor((newEndDate - currentDate) / (1000 * 60 * 60 * 24));

        // Ne réautoriser que s'il reste plus de 7 jours
        if (remainingDays > 7) {
          const newPaymentIntent = await stripe.paymentIntents.create({
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            payment_method_types: ['card'],
            capture_method: 'manual',
            description: paymentIntent.description,
            receipt_email: paymentIntent.receipt_email,
            metadata: {
              ...paymentIntent.metadata, // Copie les métadonnées existantes
              end_date: new Date(newEndDate.setDate(newEndDate.getDate() + remainingDays)).toISOString(),
            },
          });

          console.log('Nouvelle intention de paiement créée:', newPaymentIntent.id);
        }
      }
    }

    return { statusCode: 200 };
  } catch (err) {
    console.error('Erreur de webhook:', err.message);
    return { statusCode: 400, body: `Erreur de webhook: ${err.message}` };
  }
};
