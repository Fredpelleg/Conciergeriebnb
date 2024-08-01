// Exemple de fonction Netlify pour créer un PaymentIntent
const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);
//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { amount, currency, email, reservationId, clientConsent, reservationDuration, paymentMethodId } = JSON.parse(event.body);

  try {
    // Vérifiez si un client existe déjà avec cet e-mail
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      // Création d'un nouveau client Stripe
      customer = await stripe.customers.create({
        email: email,
        description: `Client pour la réservation ${reservationId}`,
      });
    }

    // Attachez le PaymentMethod au client
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Définissez le PaymentMethod par défaut pour le client
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Créer un PaymentIntent avec le PaymentMethod attaché
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      customer: customer.id,
      payment_method: paymentMethodId,
      capture_method: 'manual',
      off_session: true,
      confirm: true,
      description: reservationId,
      metadata: {
        email: email,
        client_consent: clientConsent,
        reservation_duration: reservationDuration.toString(),
        end_date: new Date(Date.now() + (reservationDuration * 24 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000)).toISOString(),
        is_caution: 'true',
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id }),
    };
  } catch (error) {
    console.error(`Erreur lors de la création de l'intention de paiement : ${error.message}`);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};


