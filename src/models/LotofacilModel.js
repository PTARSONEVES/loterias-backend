// Mesma estrutura, mas com banco 'lotofacil'
const { getConnection } = require('../config/database');

async function executarSps(banco, sps) {
  const db = getConnection(banco);
  try {
    for (const cmd of sps) {
      await new Promise((resolve, reject) => {
        db.query(cmd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  } finally {
    db.end();
  }
}

module.exports = { executarSps };