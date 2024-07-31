const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { email } = JSON.parse(event.body);

  try {
    // Rechercher le PaymentIntent à partir des métadonnées
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100, // Limite du nombre de résultats (ajustez si nécessaire)
    });

    const paymentIntent = paymentIntents.data.find(intent => intent.metadata.email === email);

    if (!paymentIntent) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'PaymentIntent not found' }),
      };
    }

    // Annuler le PaymentIntent
    const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntent.id);

    // Mettre à jour la réservation Smoobu pour confirmer l'annulation de la caution
    const smoobuUpdateUrl = `https://api.smoobu.com/api/v1/bookings/${paymentIntent.metadata.bookingId}`;
    const updateResponse = await fetch(smoobuUpdateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMOOBU_API_TOKEN}`,
      },
      body: JSON.stringify({
        fields: {
          CautionStatus: 'Cancelled' // Assurez-vous que ce champ personnalisé existe dans Smoobu
        }
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update Smoobu booking: ${updateResponse.statusText}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, paymentIntent: canceledPaymentIntent }),
    };
  } catch (error) {
    console.log('Error canceling PaymentIntent:', error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
