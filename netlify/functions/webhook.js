const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

exports.handler = async (event) => {
  const signature = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, signature, endpointSecret);
  } catch (err) {
    console.error('Signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'payment_intent.canceled') {
    const paymentIntent = stripeEvent.data.object;
    console.info(`Caution annulée détectée pour : ${paymentIntent.id}`);

    try {
      // Check if it's a caution to be renewed
      if (paymentIntent.metadata.is_caution === 'true' && paymentIntent.metadata.reservationDuration > 7) {
        const customerId = paymentIntent.customer;

        if (!customerId) {
          console.error('Client not attached to payment method:', paymentIntent.payment_method);
          return { statusCode: 400, body: 'Client not found for the canceled payment intent' };
        }

        // Create a new payment intent with the same payment method
        const newPaymentIntent = await stripe.paymentIntents.create({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customer: customerId, // Use existing customer
          payment_method_types: ['card'],
          capture_method: 'manual',
          payment_method: paymentIntent.payment_method, // Reuse the same payment method
          metadata: {
            email: paymentIntent.metadata.email,
            clientConsent: paymentIntent.metadata.clientConsent,
            reservationDuration: paymentIntent.metadata.reservationDuration,
            end_date: paymentIntent.metadata.end_date,
            is_caution: "true"
          },
        });

        console.info(`New payment intent created: ${newPaymentIntent.id}`);
      }
    } catch (error) {
      console.error('Error processing webhook event:', error.message);
      return { statusCode: 500, body: `Error processing webhook event: ${error.message}` };
    }
  }

  return { statusCode: 200, body: 'Event received' };
};
