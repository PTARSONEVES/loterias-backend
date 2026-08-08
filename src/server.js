const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// API primeiro
const apiRoutes = require('./routes/apiRoutes');
app.use('/api', apiRoutes);

// Front-end depois
app.use(express.static(path.join(__dirname, '../../loterias-frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../loterias-frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});