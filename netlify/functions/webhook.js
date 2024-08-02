//const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const stripeEvent = JSON.parse(event.body);

  try {
    switch (stripeEvent.type) {
      case 'payment_intent.canceled':
        const paymentIntent = stripeEvent.data.object;
        console.log(`Caution annulée détectée pour : ${paymentIntent.id}`);

        // Vérifiez la durée de la réservation pour décider de créer une nouvelle caution
        if (paymentIntent.metadata.is_caution === "true") {
          const reservationDuration = parseInt(paymentIntent.metadata.reservation_duration, 10);
          if (reservationDuration > 7) {
            const newEndDate = new Date(Date.now() + ((reservationDuration - 7) * 24 * 60 * 60 * 1000)).toISOString();

            // Créez une nouvelle intention de paiement pour la prolongation
            const newPaymentIntent = await stripe.paymentIntents.create({
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              customer: paymentIntent.customer, // Réutilisez le client existant
              payment_method: paymentIntent.payment_method, // Réutilisez le PaymentMethod
              capture_method: 'manual',
              confirm: true,
              description: paymentIntent.metadata.reservationId,
              metadata: {
                reservationId: paymentIntent.metadata.reservationId,
                client_consent: paymentIntent.metadata.client_consent,
                reservation_duration: (reservationDuration - 7).toString(),
                end_date: newEndDate,
                is_caution: "true",
              },
            });

            console.log(`Nouvelle intention de paiement créée: ${newPaymentIntent.id}`);
          }
        }
        break;

      default:
        console.log(`Événement non pris en charge : ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Erreur lors du traitement de l\'événement webhook :', error);
    return {
      statusCode: 400,
      body: `Erreur lors du traitement de l'événement webhook : ${error.message}`,
    };
  }
};





