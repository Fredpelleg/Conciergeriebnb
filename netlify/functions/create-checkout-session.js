const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
require('dotenv').config();

exports.handler = async (event) => {
  try {
    const { amount, currency, email, reservationId, clientConsent, reservationDuration } = JSON.parse(event.body);

    // Check if customer already exists
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`Existing customer found: ${customerId}`);
    } else {
      // Create new customer if not existing
      const customer = await stripe.customers.create({
        email,
        metadata: {
          clientConsent,
          reservationId
        }
      });
      customerId = customer.id;
      console.log(`New customer created: ${customerId}`);
    }

    // Create PaymentIntent and attach the payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method_types: ['card'],
      capture_method: 'manual',
      metadata: {
        email,
        clientConsent,
        reservationId,
        reservationDuration,
        end_date: new Date(new Date().setDate(new Date().getDate() + parseInt(reservationDuration))).toISOString(),
        is_caution: "true"
      }
    });

    console.log(`Payment intent created: ${paymentIntent.id}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };
  } catch (error) {
    console.error('Error creating payment intent:', error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
