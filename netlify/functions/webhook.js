const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // Log the type of event received
  console.log(`Received event: ${stripeEvent.type}`);

  switch (stripeEvent.type) {
    case 'payment_intent.amount_capturable_updated':
      await handleAmountCapturableUpdated(stripeEvent);
      break;

    case 'payment_intent.canceled':
      await handleCanceled(stripeEvent);
      break;

    default:
      console.log(`Unhandled event type ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: 'Success',
  };
};

async function handleAmountCapturableUpdated(stripeEvent) {
  const paymentIntent = stripeEvent.data.object;
  console.log('Handling amount_capturable_updated for:', paymentIntent.id);

  if (paymentIntent.metadata.is_caution === 'true') {
    const reservationDuration = parseInt(paymentIntent.metadata.reservation_duration);
    const endDate = new Date(paymentIntent.metadata.end_date);
    const now = new Date();

    // Simuler la condition où 7 jours se sont écoulés pour les tests
    const simulateTestCondition = true;  // Modifiez cette variable pour activer/désactiver la simulation

    if (reservationDuration > 7 && (now < endDate || simulateTestCondition)) {
      const newReservationDuration = reservationDuration - 7;
      const newEndDate = new Date(now.getTime() + (newReservationDuration * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000));

      try {
        console.log('Canceling existing PaymentIntent:', paymentIntent.id);
        await stripe.paymentIntents.cancel(paymentIntent.id);

        console.log('Creating new PaymentIntent for:', paymentIntent.id);
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
            is_caution: 'true',
          },
        });
        console.log('New PaymentIntent created successfully.');
      } catch (error) {
        console.error(`Error reauthorizing PaymentIntent: ${error.message}`);
      }
    }
  }
}

async function handleCanceled(stripeEvent) {
  const canceledIntent = stripeEvent.data.object;
  console.log('Handling canceled for:', canceledIntent.id);

  if (canceledIntent.metadata.is_caution === 'true') {
    console.log(`Caution annulée pour la réservation ${canceledIntent.description}`);
  }
}
