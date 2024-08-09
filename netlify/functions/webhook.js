const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
require('dotenv').config();

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
      // Vérifier si c'est une caution à renouveler
      if (paymentIntent.metadata.is_caution === 'true' && paymentIntent.metadata.reservation_duration > 7) {
        // Récupérer le client associé à l'intention de paiement
        const customerId = paymentIntent.customer;
        const paymentMethod = paymentIntent.payment_method;

        if (!customerId) {
          console.error('Client non attaché à la méthode de paiement:', paymentMethod);
          return { statusCode: 400, body: 'Client non trouvé pour l\'intention de paiement annulée' };
        }

        if (!paymentMethod) {
          console.error('Méthode de paiement manquante pour l\'intention de paiement:', paymentIntent.id);
          return { statusCode: 400, body: 'Méthode de paiement manquante.' };
        }

        // Créer une nouvelle intention de paiement avec la même méthode de paiement
        const newPaymentIntent = await stripe.paymentIntents.create({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customer: customerId, // Utiliser le client existant
          payment_method: paymentMethod, // Réutiliser la même méthode de paiement
          payment_method_types: ['card'],
          capture_method: 'manual',
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
