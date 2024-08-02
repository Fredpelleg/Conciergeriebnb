const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
// Import the Stripe library using the secret key
//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const stripeSignature = event.headers['stripe-signature'];

  let stripeEvent;

  try {
    // Verify the Stripe event using the webhook secret
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      stripeSignature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Error verifying Stripe webhook:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // Handle the event type
  switch (stripeEvent.type) {
    case 'payment_intent.canceled':
      {
        const paymentIntent = stripeEvent.data.object;

        // Log the cancellation event
        console.log(`Caution annulée détectée pour : ${paymentIntent.id}`);

        // Check if the reservation duration is more than 7 days
        const reservationDuration = parseInt(paymentIntent.metadata.reservation_duration, 10);

        if (reservationDuration > 7) {
          try {
            // Calculate the new end date
            const now = new Date();
            const newEndDate = new Date(
              now.getTime() +
                (reservationDuration - 7) * 24 * 60 * 60 * 1000 +
                2 * 24 * 60 * 60 * 1000
            );

            // Create a new payment intent with updated end date
            const newPaymentIntent = await stripe.paymentIntents.create({
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              customer: paymentIntent.customer,
              payment_method: paymentIntent.payment_method,
              capture_method: 'manual',
              confirm: true, // Confirm the payment intent immediately
              metadata: {
                reservation_id: paymentIntent.metadata.reservation_id,
                email: paymentIntent.metadata.email,
                client_consent: paymentIntent.metadata.client_consent,
                reservation_duration: (reservationDuration - 7).toString(),
                end_date: newEndDate.toISOString(),
                is_caution: 'true', // Indicate this is a deposit/caution
              },
            });

            // Log the creation of the new payment intent
            console.log(`Nouvelle intention de paiement créée : ${newPaymentIntent.id}`);
          } catch (error) {
            console.error('Erreur lors de la création d\'une nouvelle intention de paiement :', error);
          }
        }
      }
      break;

    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: 'Success',
  };
};







