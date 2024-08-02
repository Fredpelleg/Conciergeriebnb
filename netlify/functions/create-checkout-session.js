// Importer Stripe
const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

// Fonction pour attacher une méthode de paiement à un client
async function attachPaymentMethodToCustomer(paymentMethodId, customerId) {
  try {
    // Attacher la méthode de paiement au client
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Mettre à jour le client pour définir la méthode par défaut
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    console.log(`Méthode de paiement ${paymentMethodId} attachée au client ${customerId}`);
  } catch (error) {
    console.error('Erreur lors de l\'attachement de la méthode de paiement:', error.message);
  }
}

// Exemple d'utilisation dans la création de l'intention de paiement
exports.handler = async (event) => {
  try {
    const { amount, currency, email, reservationId, clientConsent, reservationDuration, paymentMethodId } = JSON.parse(event.body);

    // Rechercher un client existant ou en créer un
    let customerId;
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`Client existant trouvé: ${customerId}`);
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          clientConsent,
          reservationId,
        },
      });
      customerId = customer.id;
      console.log(`Nouveau client créé: ${customerId}`);
    }

    // Attacher la méthode de paiement
    await attachPaymentMethodToCustomer(paymentMethodId, customerId);

    // Créer l'intention de paiement avec le client et la méthode de paiement attachée
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId, // Spécifiez la méthode de paiement
      capture_method: 'manual',
      confirm: true, // Confirmez immédiatement pour éviter les étapes supplémentaires
      metadata: {
        email,
        clientConsent,
        reservationId,
        reservationDuration,
        end_date: new Date(new Date().setDate(new Date().getDate() + parseInt(reservationDuration))).toISOString(),
        is_caution: "true",
      },
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
