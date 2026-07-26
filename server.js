const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { getConnection } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Servir os arquivos estáticos da pasta frontend
app.use(express.static(path.join(__dirname, '../loterias-frontend')));

// Rota raiz - envia o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../loterias-frontend/index.html'));
});

// --- ROTA: Últimos sorteios ---
app.get('/api/:loteria/ultimos-sorteios', (req, res) => {
  const loteria = req.params.loteria;
  
  try {
    const db = getConnection(loteria);
    
    let tabela = '';
    let campoConcurso = '';
    
    if (loteria === 'lotofacil') {
      tabela = 'lotofacils';
      campoConcurso = 'numfacil';
    } else if (loteria === 'megasena') {
      tabela = 'megasenas';
      campoConcurso = 'nummega';
    } else {
      return res.status(400).json({ erro: 'Loteria não suportada' });
    }
    
    const sql = `SELECT * FROM ${tabela} ORDER BY ${campoConcurso} DESC LIMIT 50`;
    
    db.query(sql, (err, results) => {
      db.end();
      if (err) return res.status(500).json({ erro: err.message });
      res.json(results);
    });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// --- ROTA: Frequência por coluna ---
app.get('/api/:loteria/frequencia-colunas', (req, res) => {
  const loteria = req.params.loteria;
  
  try {
    const db = getConnection(loteria);
    
    let sql = '';
    
    if (loteria === 'lotofacil') {
      sql = `
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
    } else if (loteria === 'megasena') {
      sql = `
        SELECT 'coluna01' as coluna, bl1 as numero, COUNT(*) as frequencia FROM megasenas GROUP BY bl1
        UNION ALL SELECT 'coluna02', bl2, COUNT(*) FROM megasenas GROUP BY bl2
        UNION ALL SELECT 'coluna03', bl3, COUNT(*) FROM megasenas GROUP BY bl3
        UNION ALL SELECT 'coluna04', bl4, COUNT(*) FROM megasenas GROUP BY bl4
        UNION ALL SELECT 'coluna05', bl5, COUNT(*) FROM megasenas GROUP BY bl5
        UNION ALL SELECT 'coluna06', bl6, COUNT(*) FROM megasenas GROUP BY bl6
        ORDER BY coluna, frequencia DESC
      `;
    } else {
      return res.status(400).json({ erro: 'Loteria não suportada' });
    }
    
    db.query(sql, (err, results) => {
      db.end();
      if (err) return res.status(500).json({ erro: err.message });
      res.json(results);
    });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// --- ROTA: Comparador de jogo ---
// --- ROTA: Comparador de jogo (inteligente) ---
app.post('/api/:loteria/comparar', (req, res) => {
  const loteria = req.params.loteria;
  const { numeros } = req.body;

  if (!numeros || !Array.isArray(numeros) || numeros.length === 0) {
    return res.status(400).json({ erro: 'Envie um array de números válido.' });
  }

  try {
    const db = getConnection(loteria);
    
    // Define as colunas conforme a loteria
    let colunas = [];
    let tabela = '';
    if (loteria === 'lotofacil') {
      colunas = ['bl01', 'bl02', 'bl03', 'bl04', 'bl05', 'bl06', 'bl07', 'bl08', 'bl09', 'bl10', 'bl11', 'bl12', 'bl13', 'bl14', 'bl15'];
      tabela = 'lotofacils';
    } else if (loteria === 'megasena') {
      colunas = ['bl1', 'bl2', 'bl3', 'bl4', 'bl5', 'bl6'];
      tabela = 'megasenas';
    } else {
      return res.status(400).json({ erro: 'Loteria não suportada' });
    }

    if (numeros.length !== colunas.length) {
      return res.status(400).json({ 
        erro: `Esta loteria requer ${colunas.length} números. Você enviou ${numeros.length}.` 
      });
    }

    // Para cada número, consulta a frequência
    const promessas = numeros.map((numero, index) => {
      const coluna = colunas[index];
      return new Promise((resolve, reject) => {
        const sql = `SELECT COUNT(*) as frequencia FROM ${tabela} WHERE ${coluna} = ?`;
        db.query(sql, [numero.toString()], (err, results) => {
          if (err) reject(err);
          else resolve({ numero, coluna, frequencia: results[0].frequencia });
        });
      });
    });

    Promise.all(promessas).then(resultados => {
      // Calcula a média de frequência
      const totalFrequencia = resultados.reduce((sum, item) => sum + item.frequencia, 0);
      const mediaFrequencia = totalFrequencia / resultados.length;

      // Classifica cada número
      const classificacao = resultados.map(item => {
        let status = 'Frio';
        if (item.frequencia > mediaFrequencia * 1.2) status = 'Quente';
        else if (item.frequencia >= mediaFrequencia * 0.8) status = 'Morno';
        return { ...item, status, media: mediaFrequencia };
      });

      // --- SUGESTÕES INTELIGENTES (por coluna) ---
      // Para cada número frio, busca o número mais quente da mesma coluna
      const sugestoes = [];
      const promessasSugestoes = classificacao.map(item => {
        if (item.status === 'Frio') {
          return new Promise((resolve, reject) => {
            const sql = `
              SELECT ${item.coluna} as numero, COUNT(*) as frequencia 
              FROM ${tabela} 
              WHERE ${item.coluna} != ? 
              GROUP BY ${item.coluna} 
              ORDER BY frequencia DESC LIMIT 1
            `;
            db.query(sql, [item.numero.toString()], (err, results) => {
              if (err) reject(err);
              else {
                if (results.length > 0) {
                  sugestoes.push({
                    coluna: item.coluna,
                    numeroOriginal: item.numero,
                    numeroSugerido: parseInt(results[0].numero),
                    frequencia: results[0].frequencia,
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
          totalJogos: resultados.length,
          mediaFrequencia: mediaFrequencia.toFixed(1),
          numeros: classificacao,
          sugestoes: sugestoes
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
    res.status(400).json({ erro: erro.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Back-end rodando na porta ${process.env.PORT || 3000}`);
});

// ============================================================
// ROTA: Simular quantidade de jogos (retorna apenas o número)
// ============================================================
app.post('/api/:loteria/simular', async (req, res) => {
  const loteria = req.params.loteria;
  const { nivelRisco, nciclos, njogos, intervalo, seqbase } = req.body;

  // Mapeia o nível de risco para o critério
  const criterioMap = {
    'baixo': 'Baixo',
    'medio': 'Médio',
    'alto': 'Alto'
  };
  const criterio = criterioMap[nivelRisco] || 'Médio';

  // Define a SP correta conforme a loteria
  let spNome = '';
  if (loteria === 'megasena') spNome = 'PASimuladorMegasena';
  else if (loteria === 'lotofacil') spNome = 'PASimuladorLotofacil';
  else return res.status(400).json({ erro: 'Loteria não suportada' });

  try {
    const db = getConnection(loteria); // usa a conexão de produção ou dev

    // Executa a SP com os parâmetros
    // Nota: os parâmetros devem seguir a ordem correta da sua SP
    const sql = `CALL ${spNome}(?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      nciclos || 100,        // nciclos
      njogos || 10,          // njogos (quantidade desejada, mas a SP pode ignorar)
      intervalo || 1,        // intervalo
      seqbase || 0,          // seqbase (INT)
      criterio,              // criterio (Baixo/Médio/Alto)
      'SIMULACAO',           // tiposimulacao
      'GERAR_CARTOES'        // tipoprocessamento
    ];

    db.query(sql, params, (err, results) => {
      db.end();
      if (err) {
        console.error('Erro na SP de simulação:', err);
        return res.status(500).json({ erro: 'Erro ao simular. Verifique os parâmetros.' });
      }

      // A SP deve retornar um resultado com a quantidade gerada
      // Exemplo de retorno esperado: [ { quantidade: 47 } ]
      const quantidade = results[0] && results[0][0] ? results[0][0].quantidade : 0;

      res.json({
        nivel: nivelRisco,
        criterio: criterio,
        quantidade: parseInt(quantidade) || 0,
        mensagem: quantidade > 0 
          ? `Com o nível "${nivelRisco}", o algoritmo gerou ${quantidade} cartões.`
          : 'Nenhum cartão gerado com este nível.'
      });
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ============================================================
// ROTA: Gerar cartões (após o usuário aceitar a quantidade)
// ============================================================
app.post('/api/:loteria/gerar', async (req, res) => {
  const loteria = req.params.loteria;
  const { nivelRisco, nciclos, njogos, intervalo, seqbase } = req.body;

  const criterioMap = {
    'baixo': 'Baixo',
    'medio': 'Médio',
    'alto': 'Alto'
  };
  const criterio = criterioMap[nivelRisco] || 'Médio';

  let spNome = '';
  if (loteria === 'megasena') spNome = 'PASimuladorMegasena';
  else if (loteria === 'lotofacil') spNome = 'PASimuladorLotofacil';
  else return res.status(400).json({ erro: 'Loteria não suportada' });

  try {
    const db = getConnection(loteria);

    const sql = `CALL ${spNome}(?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      nciclos || 1,
      njogos || 1000,
      seqbase || 3,
      intervalo || 1,
      criterio,
      'COLUNA_UMS',
      'GERAR_CARTOES'
    ];

    db.query(sql, params, (err, results) => {
      db.end();
      if (err) {
        console.error('Erro na SP de geração:', err);
        return res.status(500).json({ erro: 'Erro ao gerar cartões.' });
      }

      // O retorno da SP é um array de registros da tabela 'apostas'
      // Cada registro tem: id, numbolas, bl1, bl2, ... bl20
      const apostasRaw = results[0] || [];

      // Transforma cada aposta em um array de dezenas (apenas as que existem)
      const apostasFormatadas = apostasRaw.map(aposta => {
        const dezenas = [];
        for (let i = 1; i <= aposta.numbolas; i++) {
          const col = `bl${i}`;
          if (aposta[col]) {
            dezenas.push(aposta[col]);
          }
        }
        return {
          id: aposta.id,
          numbolas: aposta.numbolas,
          dezenas: dezenas.join(' - ')
        };
      });

      res.json({
        nivel: nivelRisco,
        criterio: criterio,
        quantidade: apostasFormatadas.length,
        apostas: apostasFormatadas
      });
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});