// Exemple de fonction Netlify pour créer un PaymentIntent
const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { amount, currency, email, reservationId, clientConsent, reservationDuration } = JSON.parse(event.body);

  if (!amount || !currency || !email || !reservationId || !reservationDuration || !clientConsent) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Tous les champs sont requis.' }),
    };
  }

  try {
    // Rechercher un client existant par email
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      // Utiliser le client existant
      customer = existingCustomers.data[0];
    } else {
      // Créer un nouveau client
      customer = await stripe.customers.create({
        email: email
      });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + (reservationDuration * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method_types: ['card'],
      capture_method: 'manual',
      description: reservationId,
      receipt_email: email,
      customer: customer.id, // Attacher le client
      metadata: {
        email: email,
        client_consent: clientConsent.toString(),
        reservation_duration: reservationDuration.toString(),
        end_date: endDate.toISOString(),
        is_caution: "true"
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id }),
    };
  } catch (error) {
    console.error('Erreur lors de la création de l\'intention de paiement:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};





