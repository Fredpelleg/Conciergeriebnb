const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];

  let stripeEvent;

  try {
    // Vérification de la signature du webhook
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Erreur de vérification du webhook : ${err.message}`);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // Traiter l'événement payment_intent.canceled
  if (stripeEvent.type === 'payment_intent.canceled') {
    const paymentIntent = stripeEvent.data.object;

    console.log(`Caution annulée détectée pour : ${paymentIntent.id}`);

    try {
      // Vérifiez si un client existe déjà avec cet e-mail
      let customer;
      const existingCustomers = await stripe.customers.list({
        email: paymentIntent.metadata.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        // Création d'un nouveau client Stripe si nécessaire
        customer = await stripe.customers.create({
          email: paymentIntent.metadata.email,
          description: `Client pour la réservation ${paymentIntent.description}`,
        });
      }

      // Attacher le PaymentMethod au client
      await stripe.paymentMethods.attach(paymentIntent.payment_method, {
        customer: customer.id,
      });

      // Créer une nouvelle intention de paiement avec le PaymentMethod attaché
      const newPaymentIntent = await stripe.paymentIntents.create({
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customer: customer.id,
        payment_method: paymentIntent.payment_method,
        off_session: true,
        confirm: true,
        capture_method: 'manual',
        description: paymentIntent.description,
        metadata: paymentIntent.metadata,
      });

      console.log(`Nouvelle intention de paiement créée : ${newPaymentIntent.id}`);
    } catch (error) {
      console.error(`Erreur lors du traitement de l'événement webhook : ${error.message}`);
      return {
        statusCode: 500,
        body: `Erreur lors du traitement de l'événement webhook : ${error.message}`,
      };
    }
  }

  return {
    statusCode: 200,
    body: 'Webhook handled',
  };
};




