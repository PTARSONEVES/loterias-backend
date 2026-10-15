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
  },
  quina: {
    host: process.env.QN_PROD_HOST,
    user: process.env.QN_PROD_USER,
    password: process.env.QN_PROD_PASSWORD,
    database: process.env.QN_PROD_DATABASE
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
  console.log('Testando conexão com o banco de dados. Escolhendo quina...');
  const db = getConnection('quina');
  console.log('✅ Conexão com quina OK');
  db.end();
} catch (erro) {
  console.error('❌ Erro ao conectar em quina:', erro.message);
}

module.exports = { getConnection };