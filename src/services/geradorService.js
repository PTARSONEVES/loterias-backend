const { getConnection } = require('../config/database');

function executarGeracao(loteria, params) {
  return new Promise((resolve, reject) => {
    const db = getConnection(loteria);

    // Define o nome da SP conforme a loteria
    let spNome = '';
    if (loteria === 'megasena') spNome = 'PASimulacaoMegasena';
    else if (loteria === 'lotofacil') spNome = 'PASimulacaoLotofacil';
    else {
      db.end();
      reject(new Error('Loteria não suportada'));
      return;
    }

    const sql = `CALL ${spNome}(?, ?, ?, ?, ?, ?, ?, ?)`;
    const paramsArray = [
      params.nciclos || 100,
      params.njogos || 10,
      params.intervalo || 1,
      params.seqbase || 0,
      params.criterio || 'Médio',
      params.tiposimulacao || 'GERACAO',
      params.tipoprocessamento || 'GERAR_CARTOES'
    ];

    db.query(sql, paramsArray, (err, results) => {
      db.end();
      if (err) reject(err);
      else resolve(results[0] || []);
    });
  });
}

module.exports = { executarGeracao };