const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        // Rechercher le client
        const customer = await stripe.customers.retrieve(paymentIntent.customer);
        
        if (!customer) {
          console.error('Client non trouvé:', paymentIntent.customer);
          return { statusCode: 404, body: 'Client non trouvé' };
        }

        // Créer une nouvelle intention de paiement avec la même méthode de paiement
        const newPaymentIntent = await stripe.paymentIntents.create({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customer: paymentIntent.customer,
          payment_method_types: ['card'],
          capture_method: 'manual',
          description: paymentIntent.description,
          receipt_email: paymentIntent.receipt_email,
          payment_method: paymentIntent.payment_method, // Reuse the same payment method
          metadata: {
            email: paymentIntent.metadata.email,
            client_consent: paymentIntent.metadata.client_consent,
            reservation_duration: paymentIntent.metadata.reservation_duration,
            end_date: paymentIntent.metadata.end_date,
            is_caution: "true"
          },
        });

        console.info(`Nouvelle intention de paiement créée: ${newPayment






