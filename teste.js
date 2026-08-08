const express = require('express');
const app = express();

app.get('/ping', (req, res) => {
  res.json({ status: 'pong' });
});

app.listen(3000, () => {
  console.log('🚀 Servidor de teste rodando na porta 3000');
});