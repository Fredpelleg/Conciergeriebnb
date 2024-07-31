const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  console.log('Using Stripe Secret Key:', process.env.STRIPE_SECRET_KEY); // Vérifiez la clé ici

  const { amount, currency, email } = JSON.parse(event.body);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method_types: ['card'],
      capture_method: 'manual', // Pour créer une autorisation
      metadata: { email: email }, // Ajout de l'email dans les métadonnées
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id }),
    };
  } catch (error) {
    console.log('Error creating PaymentIntent:', error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
