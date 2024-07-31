<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement de Caution</title>
  <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
  <h1>Paiement de la Caution</h1>
  <form id="payment-form">
    <div id="card-element"></div>
    <input type="hidden" id="amount" value="5000"> <!-- Montant en centimes -->
    <input type="email" id="email" placeholder="Votre email" required> <!-- Saisie de l'email -->
    <button type="submit">Payer la Caution</button>
  </form>
  <div id="error-message" style="color: red;"></div>
  <script>
    const stripe = Stripe('pk_test_51HyIanFP8glmTVRLzwVosP8ZdIsI6wKyApyzGMWmgSjfXEHJ1Oo9qzReFUdZRHvJIyCZusaM6V4kLdZ28TwKF8AU00TBfPxsab'); // Utilisez votre clé Stripe publiable
    const elements = stripe.elements();
    const cardElement = elements.create('card');
    cardElement.mount('#card-element');

    document.getElementById('payment-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      console.log('Form submitted');
      
      const amount = document.getElementById('amount').value;
      const email = document.getElementById('email').value;
      console.log('Amount:', amount, 'Email:', email);
      
      try {
        const response = await fetch('/.netlify/functions/create-checkout-session', { // Chemin relatif
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, currency: 'eur', email })
        });

        console.log('Response status:', response.status);

        const result = await response.json();
        console.log('Result:', result);

        if (response.ok) {
          const { clientSecret, id } = result;
          const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: 'Jenny Rosen',
              },
            },
          });

          if (error) {
            document.getElementById('error-message').textContent = error.message;
          } else if (paymentIntent.status === 'requires_capture') {
            // L'autorisation est réussie
            window.location.href = '/success.html';
          }
        } else {
          document.getElementById('error-message').textContent = result.error;
        }
      } catch (error) {
        console.error('Error:', error);
        document.getElementById('error-message').textContent = 'An error occurred';
      }
    });
  </script>
</body>
</html>
