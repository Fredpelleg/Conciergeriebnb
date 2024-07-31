const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  switch (stripeEvent.type) {
    case 'payment_intent.canceled':
      const paymentIntent = stripeEvent.data.object;
      const reservationDuration = parseInt(paymentIntent.metadata.reservation_duration);
      const endDate = new Date(paymentIntent.metadata.end_date);
      const now = new Date();

      if (reservationDuration > 7 && now < endDate) {
        const newReservationDuration = reservationDuration - 7;
        const newEndDate = new Date(now.getTime() + (newReservationDuration * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000));

        try {
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
              end_date: newEndDate.toISOString(), // Mise à jour de la date de fin
            },
          });
        } catch (error) {
          return {
            statusCode: 400,
            body: `Error reauthorizing PaymentIntent: ${error.message}`,
          };
        }
      }
      break;

    default:
      console.log(`Unhandled event type ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: 'Success',
  };
};
