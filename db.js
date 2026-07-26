const mysql = require('mysql2');
require('dotenv').config();

// Mapa de configurações por tipo de loteria
const configs = {
  lotofacil: {
    host: process.env.LF_PROD_HOST,
    user: process.env.LF_PROD_USER,
    password: process.env.LF_PROD_PASSWORD,
    database: process.env.LF_PROD_DATABASE
  },
  megasena: {
    host: process.env.MS_PROD_HOST,
    user: process.env.MS_PROD_USER,
    password: process.env.MS_PROD_PASSWORD,
    database: process.env.MS_PROD_DATABASE
  }
};

// Função que retorna uma nova conexão para o banco solicitado
function getConnection(tipo) {
  if (!configs[tipo]) {
    throw new Error(`Banco de dados para '${tipo}' não configurado.`);
  }
  return mysql.createConnection(configs[tipo]);
}

module.exports = { getConnection };