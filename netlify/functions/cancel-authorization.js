<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Annulation de la Caution</title>
</head>
<body>
  <h1>Annulation de la Caution</h1>
  <form id="cancel-form">
    <input type="email" id="email" placeholder="Email du client" required> <!-- Saisie de l'email -->
    <button type="submit">Annuler la Caution</button>
  </form>
  <div id="message" style="color: red;"></div>
  <script>
    document.getElementById('cancel-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const
