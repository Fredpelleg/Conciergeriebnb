const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
require('dotenv').config();

exports.handler = async (event) => {
  try {
    const { amount, currency, email, reservationId, clientConsent, reservationDuration } = JSON.parse(event.body);

    // Vérifier si le client existe déjà avec l'e-mail fourni
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`Client existant trouvé: ${customerId}`);
    } else {
      // Créer un nouveau client si non existant
      const customer = await stripe.customers.create({
        email,
        metadata: {
          clientConsent,
          reservationId
        }
      });
      customerId = customer.id;
      console.log(`Nouveau client créé: ${customerId}`);
    }

    // Créer l'intention de paiement
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId, // Associer le client à l'intention de paiement
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

    console.log(`Intention de paiement créée: ${paymentIntent.id}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };
  } catch (error) {
    console.error('Erreur lors de la création de l\'intention de paiement:', error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
