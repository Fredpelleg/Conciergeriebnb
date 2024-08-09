const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { amount, currency, email, reservationId, clientConsent, reservationDuration } = JSON.parse(event.body);

    // Recherche du client existant par e-mail
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Créer un nouveau client s'il n'existe pas
      const customer = await stripe.customers.create({
        email,
        metadata: { clientConsent, reservationId }
      });
      customerId = customer.id;
    }

    // Créer l'intention de paiement
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

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
