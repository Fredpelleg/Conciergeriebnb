const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Définition du gestionnaire de fonction serverless
exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Vérifie la signature de l'événement pour s'assurer qu'il provient de Stripe
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // Traite l'événement en fonction de son type
  switch (stripeEvent.type) {
    case 'payment_intent.amount_capturable_updated':
      await handleAmountCapturableUpdated(stripeEvent);
      break;

    case 'payment_intent.canceled':
      handleCanceled(stripeEvent);
      break;

    default:
      console.log(`Unhandled event type ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: 'Success',
  };
};

// Fonction pour gérer l'événement amount_capturable_updated
async function handleAmountCapturableUpdated(stripeEvent) {
  const paymentIntent = stripeEvent.data.object;

  // Vérifie si le paymentIntent concerne une caution
  if (paymentIntent.metadata.is_caution === 'true') {
    const reservationDuration = parseInt(paymentIntent.metadata.reservation_duration);
    const endDate = new Date(paymentIntent.metadata.end_date);
    const now = new Date();

    // Si la durée de la réservation est supérieure à 7 jours et que la date actuelle est avant la date de fin
    if (reservationDuration > 7 && now < endDate) {
      const newReservationDuration = reservationDuration - 7;
      const newEndDate = new Date(now.getTime() + (newReservationDuration * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000));

      try {
        // Annuler l'autorisation existante
        await stripe.paymentIntents.cancel(paymentIntent.id);

        // Créer une nouvelle autorisation avec les nouvelles durées et métadonnées
        await stripe.paymentIntents.create({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          payment_method_types: ['card'],
          capture_method: 'manual',
          description: paymentIntent.description,
          metadata: {
            email: paymentIntent.metadata.email,
            client_consent: paymentIntent.metadata.client_consent,
            reservation_duration: newReservationDuration.toString(),
            end_date: newEndDate.toISOString(),
            is_caution: 'true', // Marque la nouvelle autorisation comme caution
          },
        });
      } catch (error) {
        console.error(`Error reauthorizing PaymentIntent: ${error.message}`);
      }
    }
  }
}

// Fonction pour gérer l'événement canceled
function handleCanceled(stripeEvent) {
  const canceledIntent = stripeEvent.data.object;

  // Vérifie si l'annulation concerne une caution
  if (canceledIntent.metadata.is_caution === 'true') {
    // Gère l'annulation de la caution (par exemple, en enregistrant l'annulation dans les logs)
    console.log(`Caution annulée pour la réservation ${canceledIntent.description}`);
  }
}
