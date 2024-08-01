const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);

    if (stripeEvent.type === 'payment_intent.canceled') {
      const paymentIntent = stripeEvent.data.object;

      if (paymentIntent.metadata.is_caution === 'true') {
        const reservationDuration = parseInt(paymentIntent.metadata.reservation_duration);

        if (reservationDuration > 7) {
          const remainingDays = reservationDuration - 7;
          const newEndDate = new Date();
          newEndDate.setDate(newEndDate.getDate() + remainingDays + 2);

          try {
            const newPaymentIntent = await stripe.paymentIntents.create({
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              payment_method_types: ['card'],
              capture_method: 'manual',
              description: paymentIntent.description,
              receipt_email: paymentIntent.metadata.email,
              metadata: {
                email: paymentIntent.metadata.email,
                client_consent: paymentIntent.metadata.client_consent,
                reservation_duration: remainingDays.toString(),
                end_date: newEndDate.toISOString(),
                is_caution: 'true',
              },
            });
            console.log('Nouvelle intention de paiement créée:', newPaymentIntent.id);
          } catch (error) {
            console.error('Erreur lors de la création de la nouvelle intention de paiement:', error.message);
          }
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err) {
    console.error('Erreur lors du traitement du webhook:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
};

