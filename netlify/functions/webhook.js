const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

exports.handler = async (event) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = event.headers['stripe-signature'];
  
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Erreur lors de la vérification de la signature : ${err.message}`);
    return {
      statusCode: 400,
      body: `Erreur lors de la vérification de la signature : ${err.message}`,
    };
  }

  const eventType = stripeEvent.type;

  try {
    if (eventType === 'payment_intent.canceled') {
      const paymentIntent = stripeEvent.data.object;
      console.log(`Caution annulée détectée pour : ${paymentIntent.id}`);

      const reservationDuration = parseInt(paymentIntent.metadata.reservation_duration, 10);
      const remainingDays = reservationDuration - 7;

      if (remainingDays > 0 && paymentIntent.metadata.is_caution === 'true') {
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + remainingDays + 2);

        // Crée une nouvelle intention de paiement avec le même client et la même méthode de paiement
        const newPaymentIntent = await stripe.paymentIntents.create({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          payment_method_types: ['card'],
          capture_method: 'manual',
          description: paymentIntent.description,
          receipt_email: paymentIntent.metadata.email,
          customer: paymentIntent.customer, // Réutiliser le même client
          payment_method: paymentIntent.payment_method, // Utiliser la même méthode de paiement
          confirm: true, // Confirmer immédiatement l'intention de paiement
          metadata: {
            email: paymentIntent.metadata.email,
            client_consent: paymentIntent.metadata.client_consent,
            reservation_duration: remainingDays.toString(),
            end_date: newEndDate.toISOString(),
            is_caution: 'true',
          },
        });

        console.log(`Nouvelle intention de paiement créée : ${newPaymentIntent.id}`);
      }
    }
  } catch (error) {
    console.error(`Erreur lors du traitement de l'événement ${eventType} : ${error.message}`);
    return {
      statusCode: 500,
      body: `Erreur lors du traitement de l'événement ${eventType} : ${error.message}`,
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};


