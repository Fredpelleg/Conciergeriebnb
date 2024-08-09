const stripe = require('stripe')(process.env.STRIPE_NEW_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { amount, currency, email, reservationId, clientConsent, reservationDuration, paymentMethodId } = JSON.parse(event.body);

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

    // Attacher le PaymentMethod au client
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

    // Mettre à jour le client avec la méthode de paiement par défaut
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Créer l'intention de paiement
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
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
