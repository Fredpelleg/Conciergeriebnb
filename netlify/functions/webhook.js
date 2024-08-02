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
      if (paymentIntent.metadata.is_caution === 'true' && paymentIntent.metadata.reservation_duration > 7) {
        const customerId = paymentIntent.customer;
        const paymentMethodId = paymentIntent.payment_method;

        if (!customerId || !paymentMethodId) {
          console.error('Client ou méthode de paiement non attachée:', paymentMethodId);
          return { statusCode: 400, body: 'Client ou méthode de paiement non trouvée pour l\'intention de paiement annulée' };
        }

        // Attacher la méthode de paiement si elle n'est pas encore attachée
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

        if (paymentMethod.customer !== customerId) {
          await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
          });
        }

        const newPaymentIntent = await stripe.paymentIntents.create({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customer: customerId,
          payment_method: paymentMethodId,
          capture_method: 'manual',
          payment_method_types: ['card'],
          metadata: {
            email: paymentIntent.metadata.email,
            client_consent: paymentIntent.metadata.client_consent,
            reservation_duration: paymentIntent.metadata.reservation_duration,
            end_date: paymentIntent.metadata.end_date,
            is_caution: "true"
          },
        });

        console.info(`Nouvelle intention de paiement créée: ${newPaymentIntent.id}`);
      }
    } catch (error) {
      console.error('Erreur lors du traitement de l\'événement webhook:', error.message);
      return { statusCode: 500, body: `Erreur lors du traitement de l'événement webhook: ${error.message}` };
    }
  }

  return { statusCode: 200, body: 'Événement reçu' };
};
