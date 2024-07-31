const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let webhookEvent;

  try {
    webhookEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  switch (webhookEvent.type) {
    case 'payment_intent.requires_action':
      const paymentIntent = webhookEvent.data.object;
      const createdDate = new Date(paymentIntent.created * 1000);
      const currentDate = new Date();
      const diffDays = Math.floor((currentDate - createdDate) / (1000 * 60 * 60 * 24));

      if (diffDays >= 6) {
        await stripe.paymentIntents.cancel(paymentIntent.id);

        const newPaymentIntent = await stripe.paymentIntents.create({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          payment_method: paymentIntent.payment_method,
          capture_method: 'manual',
          metadata: paymentIntent.metadata,
        });

        return { statusCode: 200, body: JSON.stringify({ new_payment_intent: newPaymentIntent }) };
      } else {
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
      }
    default:
      return { statusCode: 400, body: 'Unhandled event type' };
  }
};
