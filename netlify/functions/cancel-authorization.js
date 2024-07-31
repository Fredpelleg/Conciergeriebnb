const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { email, reservationId } = JSON.parse(event.body);

  try {
    const paymentIntents = await stripe.paymentIntents.list({ limit: 100 });

    const intentsToCancel = paymentIntents.data.filter(intent =>
      intent.metadata.email === email && intent.description === `ID: ${reservationId}` && intent.status === 'requires_capture'
    );

    const canceledIntents = [];
    for (const intent of intentsToCancel) {
      const canceledPaymentIntent = await stripe.paymentIntents.cancel(intent.id);
      canceledIntents.push(canceledPaymentIntent);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, canceledIntents }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
