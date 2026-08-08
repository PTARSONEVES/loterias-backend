const mysql = require('mysql2');
require('dotenv').config();

// Configurações das conexões
const configs = {
  megasena: {
    host: process.env.MS_PROD_HOST,
    user: process.env.MS_PROD_USER,
    password: process.env.MS_PROD_PASSWORD,
    database: process.env.MS_PROD_DATABASE
  },
  lotofacil: {
    host: process.env.LF_PROD_HOST,
    user: process.env.LF_PROD_USER,
    password: process.env.LF_PROD_PASSWORD,
    database: process.env.LF_PROD_DATABASE
  }
};

function getConnection(tipo) {
  if (!configs[tipo]) {
    throw new Error(`Banco de dados para '${tipo}' não configurado.`);
  }
  return mysql.createConnection(configs[tipo]);
}

// Teste rápido de conexão
try {
  const db = getConnection('megasena');
  console.log('✅ Conexão com megasena OK');
  db.end();
} catch (erro) {
  console.error('❌ Erro ao conectar em megasena:', erro.message);
}

module.exports = { getConnection };