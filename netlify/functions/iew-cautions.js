const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { startDate, endDate } = JSON.parse(event.body);

  try {
    const paymentIntents = await stripe.paymentIntents.list({
      created: {
        gte: startDate,
        lte: endDate
      },
      limit: 100
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ paymentIntents: paymentIntents.data }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
