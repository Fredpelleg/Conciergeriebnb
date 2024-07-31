const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ paymentIntents: paymentIntents.data }),
    };
  } catch (error) {
    console.error('Error retrieving Payment Intents:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
