const express = require('express');
const router = express.Router();

// --- Rota 1: ping ---
router.get('/ping', (req, res) => {
  console.log('📥 Ping recebido!');
  res.json({ status: 'pong', timestamp: new Date().toISOString() });
});

const { getConnection } = require('../config/database');

// ============================================================
// ROTA: Últimos Sorteios (Mega-Sena)
// ============================================================
router.get('/megasena/ultimos-sorteios', (req, res) => {
  console.log('📥 Rota /megasena/ultimos-sorteios chamada!');

  try {
    const db = getConnection('megasena');

    const sql = `SELECT * FROM megasenas ORDER BY nummega DESC LIMIT 50`;

    db.query(sql, (err, results) => {
      db.end();
      if (err) {
        console.error('❌ Erro na consulta:', err);
        return res.status(500).json({ erro: err.message });
      }
      console.log(`✅ ${results.length} registros encontrados.`);
      res.json(results);
    });
  } catch (erro) {
    console.error('❌ Erro no try/catch:', erro);
    res.status(500).json({ erro: erro.message });
  }
});

// ============================================================
// ROTA: Frequência por Coluna (Mega-Sena)
// ============================================================
router.get('/megasena/frequencia-colunas', (req, res) => {
  console.log('📥 Rota /megasena/frequencia-colunas chamada!');

  try {
    const db = getConnection('megasena');

    const sql = `
      SELECT 'coluna01' as coluna, bl1 as numero, COUNT(*) as frequencia FROM megasenas GROUP BY bl1
      UNION ALL SELECT 'coluna02', bl2, COUNT(*) FROM megasenas GROUP BY bl2
      UNION ALL SELECT 'coluna03', bl3, COUNT(*) FROM megasenas GROUP BY bl3
      UNION ALL SELECT 'coluna04', bl4, COUNT(*) FROM megasenas GROUP BY bl4
      UNION ALL SELECT 'coluna05', bl5, COUNT(*) FROM megasenas GROUP BY bl5
      UNION ALL SELECT 'coluna06', bl6, COUNT(*) FROM megasenas GROUP BY bl6
      ORDER BY coluna, frequencia DESC
    `;

    db.query(sql, (err, results) => {
      db.end();
      if (err) {
        console.error('❌ Erro na consulta:', err);
        return res.status(500).json({ erro: err.message });
      }
      console.log(`✅ ${results.length} registros encontrados.`);
      res.json(results);
    });
  } catch (erro) {
    console.error('❌ Erro no try/catch:', erro);
    res.status(500).json({ erro: erro.message });
  }
});

// ============================================================
// ROTA: Comparador (Mega-Sena)
// ============================================================
router.post('/megasena/comparar', (req, res) => {
  const { numeros } = req.body;

  if (!numeros || !Array.isArray(numeros) || numeros.length !== 6) {
    return res.status(400).json({ erro: 'Envie um array com 6 números.' });
  }

  try {
    const db = getConnection('megasena');

    const colunas = ['bl1', 'bl2', 'bl3', 'bl4', 'bl5', 'bl6'];

    const promessas = numeros.map((numero, index) => {
      const coluna = colunas[index];
      return new Promise((resolve, reject) => {
        const sql = `SELECT COUNT(*) as freq FROM megasenas WHERE ${coluna} = ?`;
        db.query(sql, [numero.toString()], (err, results) => {
          if (err) reject(err);
          else resolve({ numero, coluna, frequencia: results[0].freq });
        });
      });
    });

    Promise.all(promessas).then(resultados => {
      const total = resultados.reduce((s, i) => s + i.frequencia, 0);
      const media = total / resultados.length;

      const classificacao = resultados.map(item => {
        let status = 'Frio';
        if (item.frequencia > media * 1.2) status = 'Quente';
        else if (item.frequencia >= media * 0.8) status = 'Morno';
        return { ...item, status };
      });

      // Sugestões (ainda com a conexão aberta)
      const sugestoes = [];
      const promessasSugestoes = classificacao.map(item => {
        if (item.status === 'Frio') {
          return new Promise((resolve, reject) => {
            const sql = `
              SELECT ${item.coluna} as numero, COUNT(*) as freq
              FROM megasenas
              WHERE ${item.coluna} != ?
              GROUP BY ${item.coluna}
              ORDER BY freq DESC
              LIMIT 1
            `;
            db.query(sql, [item.numero.toString()], (err, results) => {
              if (err) reject(err);
              else {
                if (results.length > 0) {
                  sugestoes.push({
                    coluna: item.coluna,
                    numeroOriginal: item.numero,
                    numeroSugerido: parseInt(results[0].numero),
                    frequencia: results[0].freq,
                    status: 'Quente'
                  });
                }
                resolve();
              }
            });
          });
        } else {
          return Promise.resolve();
        }
      });

      Promise.all(promessasSugestoes).then(() => {
        db.end(); // <-- FECHA A CONEXÃO AQUI
        res.json({
          mediaFrequencia: media.toFixed(1),
          numeros: classificacao,
          sugestoes
        });
      }).catch(erro => {
        db.end();
        res.status(500).json({ erro: erro.message });
      });
    }).catch(erro => {
      db.end();
      res.status(500).json({ erro: erro.message });
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ============================================================
// ROTA GENÉRICA DE GERAÇÃO (Mega-Sena, Lotofácil, Quina)
// ============================================================
router.post('/:loteria/gerar', (req, res) => {
  const loteria = req.params.loteria;
  const { modelo, opcao } = req.body;

  console.log(`📥 Rota /${loteria}/gerar chamada! Modelo: ${modelo}, Opção: ${opcao}`);

  // Valida modelo
  if (!modelo || ![1, 2, '1', '2'].includes(modelo)) {
    return res.status(400).json({ erro: 'Modelo inválido. Use 1 ou 2.' });
  }

  // Define as colunas de dezenas conforme a loteria
  let colunasDezenas = [];
  if (loteria === 'megasena') {
    colunasDezenas = ['bl1', 'bl2', 'bl3', 'bl4', 'bl5', 'bl6'];
  } else if (loteria === 'lotofacil') {
    colunasDezenas = ['bl01','bl02','bl03','bl04','bl05','bl06','bl07','bl08','bl09','bl10','bl11','bl12','bl13','bl14','bl15'];
  } else if (loteria === 'quina') {
    colunasDezenas = ['bl01', 'bl02', 'bl03', 'bl04', 'bl05'];
  } else {
    return res.status(400).json({ erro: 'Loteria não suportada.' });
  }

  // Se modelo 2, opcao = 0
  const opcaoFinal = parseInt(modelo) === 1 ? parseInt(opcao) : 0;

  try {
    const db = getConnection(loteria);
    const sql = `CALL PAApostas(?, ?)`;
    const params = [parseInt(modelo), opcaoFinal];

    db.query(sql, params, (err, results) => {
      if (err) {
        db.end();
        console.error('❌ Erro na SP PAApostas:', err);
        return res.status(500).json({ erro: err.message });
      }

      const dbConsulta = getConnection(loteria);
      const sqlConsulta = `SELECT id, numbolas, ${colunasDezenas.join(', ')} FROM apostas ORDER BY id DESC LIMIT 150`;

      dbConsulta.query(sqlConsulta, (err, resultados) => {
        dbConsulta.end();
        db.end();
        if (err) {
          console.error('❌ Erro na consulta:', err);
          return res.status(500).json({ erro: err.message });
        }

        const apostas = resultados.map(row => {
          const dezenas = colunasDezenas.map(col => row[col]).filter(Boolean);
          return {
            id: row.id,
            numbolas: row.numbolas,
            dezenas: dezenas.join(' - ')
          };
        });

        res.json({
          modelo: parseInt(modelo),
          opcao: opcaoFinal,
          quantidade: apostas.length,
          apostas
        });
      });
    });
  } catch (erro) {
    console.error('❌ Erro no try/catch:', erro);
    res.status(500).json({ erro: erro.message });
  }
});
// ============================================================
// LOTOFÁCIL - Últimos Sorteios
// ============================================================
router.get('/lotofacil/ultimos-sorteios', (req, res) => {
  console.log('📥 Rota /lotofacil/ultimos-sorteios chamada!');
  const db = getConnection('lotofacil');
  db.query('SELECT * FROM lotofacils ORDER BY numfacil DESC LIMIT 50', (err, results) => {
    db.end();
    if (err) return res.status(500).json({ erro: err.message });
    res.json(results);
  });
});

// ============================================================
// LOTOFÁCIL - Frequência por Coluna
// ============================================================
router.get('/lotofacil/frequencia-colunas', (req, res) => {
  console.log('📥 Rota /lotofacil/frequencia-colunas chamada!');
  const db = getConnection('lotofacil');
  const sql = `
    SELECT 'coluna01' as coluna, bl01 as numero, COUNT(*) as frequencia FROM lotofacils GROUP BY bl01
    UNION ALL SELECT 'coluna02', bl02, COUNT(*) FROM lotofacils GROUP BY bl02
    UNION ALL SELECT 'coluna03', bl03, COUNT(*) FROM lotofacils GROUP BY bl03
    UNION ALL SELECT 'coluna04', bl04, COUNT(*) FROM lotofacils GROUP BY bl04
    UNION ALL SELECT 'coluna05', bl05, COUNT(*) FROM lotofacils GROUP BY bl05
    UNION ALL SELECT 'coluna06', bl06, COUNT(*) FROM lotofacils GROUP BY bl06
    UNION ALL SELECT 'coluna07', bl07, COUNT(*) FROM lotofacils GROUP BY bl07
    UNION ALL SELECT 'coluna08', bl08, COUNT(*) FROM lotofacils GROUP BY bl08
    UNION ALL SELECT 'coluna09', bl09, COUNT(*) FROM lotofacils GROUP BY bl09
    UNION ALL SELECT 'coluna10', bl10, COUNT(*) FROM lotofacils GROUP BY bl10
    UNION ALL SELECT 'coluna11', bl11, COUNT(*) FROM lotofacils GROUP BY bl11
    UNION ALL SELECT 'coluna12', bl12, COUNT(*) FROM lotofacils GROUP BY bl12
    UNION ALL SELECT 'coluna13', bl13, COUNT(*) FROM lotofacils GROUP BY bl13
    UNION ALL SELECT 'coluna14', bl14, COUNT(*) FROM lotofacils GROUP BY bl14
    UNION ALL SELECT 'coluna15', bl15, COUNT(*) FROM lotofacils GROUP BY bl15
    ORDER BY coluna, frequencia DESC
  `;
  db.query(sql, (err, results) => {
    db.end();
    if (err) return res.status(500).json({ erro: err.message });
    res.json(results);
  });
});

// ============================================================
// LOTOFÁCIL - Comparador
// ============================================================
router.post('/lotofacil/comparar', (req, res) => {
  console.log('📥 Rota /lotofacil/comparar chamada!');
  const { numeros } = req.body;
  if (!numeros || !Array.isArray(numeros) || numeros.length !== 15) {
    return res.status(400).json({ erro: 'Envie um array com 15 números.' });
  }
  const db = getConnection('lotofacil');
  const colunas = ['bl01','bl02','bl03','bl04','bl05','bl06','bl07','bl08','bl09','bl10','bl11','bl12','bl13','bl14','bl15'];
  const promessas = numeros.map((numero, index) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as freq FROM lotofacils WHERE ${colunas[index]} = ?`;
      db.query(sql, [numero.toString()], (err, results) => {
        if (err) reject(err);
        else resolve({ numero, coluna: colunas[index], frequencia: results[0].freq });
      });
    });
  });
  Promise.all(promessas).then(resultados => {
    const total = resultados.reduce((s, i) => s + i.frequencia, 0);
    const media = total / resultados.length;
    const classificacao = resultados.map(item => {
      let status = 'Frio';
      if (item.frequencia > media * 1.2) status = 'Quente';
      else if (item.frequencia >= media * 0.8) status = 'Morno';
      return { ...item, status };
    });
    const sugestoes = [];
    const promessasSugestoes = classificacao.map(item => {
      if (item.status === 'Frio') {
        return new Promise((resolve, reject) => {
          const sql = `
            SELECT ${item.coluna} as numero, COUNT(*) as freq
            FROM lotofacils
            WHERE ${item.coluna} != ?
            GROUP BY ${item.coluna}
            ORDER BY freq DESC LIMIT 1
          `;
          db.query(sql, [item.numero.toString()], (err, results) => {
            if (err) reject(err);
            else {
              if (results.length > 0) {
                sugestoes.push({
                  coluna: item.coluna,
                  numeroOriginal: item.numero,
                  numeroSugerido: parseInt(results[0].numero),
                  frequencia: results[0].freq,
                  status: 'Quente'
                });
              }
              resolve();
            }
          });
        });
      } else {
        return Promise.resolve();
      }
    });
    Promise.all(promessasSugestoes).then(() => {
      db.end();
      res.json({
        mediaFrequencia: media.toFixed(1),
        numeros: classificacao,
        sugestoes
      });
    }).catch(erro => {
      db.end();
      res.status(500).json({ erro: erro.message });
    });
  }).catch(erro => {
    db.end();
    res.status(500).json({ erro: erro.message });
  });
});


// ============================================================
// QUINA - Últimos Sorteios
// ============================================================
router.get('/quina/ultimos-sorteios', (req, res) => {
  console.log('📥 Rota /quina/ultimos-sorteios chamada!');
  const db = getConnection('quina');
  db.query('SELECT * FROM quinas ORDER BY numquina DESC LIMIT 50', (err, results) => {
    db.end();
    if (err) return res.status(500).json({ erro: err.message });
    res.json(results);
  });
});

// ============================================================
// QUINA - Frequência por Coluna
// ============================================================
router.get('/quina/frequencia-colunas', (req, res) => {
  console.log('📥 Rota /quina/frequencia-colunas chamada!');
  const db = getConnection('quina');
  const sql = `
    SELECT 'coluna01' as coluna, bl01 as numero, COUNT(*) as frequencia FROM quinas GROUP BY bl01
    UNION ALL SELECT 'coluna02', bl02, COUNT(*) FROM quinas GROUP BY bl02
    UNION ALL SELECT 'coluna03', bl03, COUNT(*) FROM quinas GROUP BY bl03
    UNION ALL SELECT 'coluna04', bl04, COUNT(*) FROM quinas GROUP BY bl04
    UNION ALL SELECT 'coluna05', bl05, COUNT(*) FROM quinas GROUP BY bl05
    ORDER BY coluna, frequencia DESC
  `;
  db.query(sql, (err, results) => {
    db.end();
    if (err) return res.status(500).json({ erro: err.message });
    res.json(results);
  });
});

// ============================================================
// QUINA - Comparador
// ============================================================
router.post('/quina/comparar', (req, res) => {
  console.log('📥 Rota /quina/comparar chamada!');
  const { numeros } = req.body;
  if (!numeros || !Array.isArray(numeros) || numeros.length !== 5) {
    return res.status(400).json({ erro: 'Envie um array com 5 números.' });
  }
  const db = getConnection('quina');
  const colunas = ['bl01', 'bl02', 'bl03', 'bl04', 'bl05'];
  const promessas = numeros.map((numero, index) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as freq FROM quinas WHERE ${colunas[index]} = ?`;
      db.query(sql, [numero.toString()], (err, results) => {
        if (err) reject(err);
        else resolve({ numero, coluna: colunas[index], frequencia: results[0].freq });
      });
    });
  });
  Promise.all(promessas).then(resultados => {
    const total = resultados.reduce((s, i) => s + i.frequencia, 0);
    const media = total / resultados.length;
    const classificacao = resultados.map(item => {
      let status = 'Frio';
      if (item.frequencia > media * 1.2) status = 'Quente';
      else if (item.frequencia >= media * 0.8) status = 'Morno';
      return { ...item, status };
    });
    db.end();
    res.json({
      mediaFrequencia: media.toFixed(1),
      numeros: classificacao
    });
  }).catch(erro => {
    db.end();
    res.status(500).json({ erro: erro.message });
  });
});


module.exports = router;