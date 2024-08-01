const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    const paymentIntentCanceled = 'payment_intent.canceled';
    const paymentIntentAmountCapturableUpdated = 'payment_intent.amount_capturable_updated';

    let stripeEvent;

    try {
      // Vérification de la signature du webhook pour la sécurité
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } catch (err) {
      console.error(`Erreur lors de la vérification de la signature : ${err.message}`);
      return {
        statusCode: 400,
        body: `Webhook Error: ${err.message}`,
      };
    }

    if (stripeEvent.type === paymentIntentCanceled) {
      const paymentIntent = stripeEvent.data.object;

      console.log(`Caution annulée détectée pour : ${paymentIntent.id}`);

      // Vérifier que c'est une caution avec une durée de réservation supérieure à 7 jours
      if (paymentIntent.metadata.is_caution === 'true' && paymentIntent.metadata.reservation_duration > 7) {
        
        // Création d'un nouveau client si non existant
        let customerId = paymentIntent.customer;
        
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: paymentIntent.metadata.email,
            description: `Client pour la réservation ${paymentIntent.description}`,
          });
          customerId = customer.id;
        }

        // Création d'une nouvelle intention de paiement
        const newPaymentIntent = await stripe.paymentIntents.create({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customer: customerId,
          payment_method: paymentIntent.payment_method,
          off_session: true,
          confirm: true,
          payment_method_types: ['card'],
          capture_method: 'manual',
          description: paymentIntent.description,
          metadata: {
            ...paymentIntent.metadata,
            reservation_duration: (paymentIntent.metadata.reservation_duration - 7).toString(), // Réduire la durée de 7 jours
            end_date: new Date(Date.now() + ((paymentIntent.metadata.reservation_duration - 7) * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000)).toISOString(),
          },
        });

        console.log(`Nouvelle intention de paiement créée : ${newPaymentIntent.id}`);
      }
    }

    return {
      statusCode: 200,
      body: 'Webhook reçu',
    };
  } catch (error) {
    console.error(`Erreur lors du traitement de l'événement webhook : ${error.message}`);
    return {
      statusCode: 400,
      body: `Erreur lors du traitement de l'événement webhook : ${error.message}`,
    };
  }
};



