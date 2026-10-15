const mysql = require('mysql2/promise');
require('dotenv').config();

const poolLoterias = mysql.createPool({
  host: process.env.LT_HOST,
  user: process.env.LT_USER,
  password: process.env.LT_PASSWORD,
  database: process.env.LT_DATABASE,   // loterias
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4_unicode_ci',
});

module.exports = poolLoterias;