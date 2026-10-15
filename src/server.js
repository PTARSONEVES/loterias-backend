const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const apiRoutes = require('./routes/apiRoutes');
const authRoutes = require('./auth/auth.controller');
const tiposApostaRoutes = require('./tipos-aposta/tipos-aposta-controller');

// API primeiro
app.use('/api', apiRoutes);
// Auth
app.use('/auth', authRoutes);
// Tipos de Aposta
app.use('/tipos-aposta', tiposApostaRoutes);

const JOGOS_VALIDOS = ['megasena', 'lotofacil', 'quina'];
app.get('/gerar/:jogo', (req, res) => {
  const { jogo } = req.params;

  if (!JOGOS_VALIDOS.includes(jogo)) {
    return res.status(404).send('Jogo não encontrado');
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <title>Gerar aposta - ${jogo}</title>
    </head>
    <body>
      <h1>Gerar aposta: ${jogo}</h1>
      <p>Tela de geração em construção.</p>
      <a href="/tipos.html">Voltar</a>
    </body>
    </html>
  `);
});

// Front-end depois
app.use(express.static(path.join(__dirname, '../../loterias-frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../loterias-frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Servidor rodando em http://127.0.0.1:${PORT}`);
});