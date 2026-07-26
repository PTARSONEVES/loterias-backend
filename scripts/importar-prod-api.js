const mysql = require('mysql2');
const axios = require('axios');
require('dotenv').config();

// ===== FUNÇÃO DE CONVERSÃO DE DATA =====
function converterData(dataStr) {
  if (!dataStr) return null;
  const partes = dataStr.split('/');
  if (partes.length !== 3) return dataStr;
  const [dia, mes, ano] = partes;
  return `${ano}-${mes}-${dia}`;
}

// ===== CONFIGURAÇÃO =====
const LOTERIAS = [
  {
    nome: 'Mega-Sena',
    apiUrl: 'https://loteriascaixa-api.herokuapp.com/api/megasena',
    banco: process.env.MS_PROD_DATABASE,
    host: process.env.MS_PROD_HOST,
    user: process.env.MS_PROD_USER,
    password: process.env.MS_PROD_PASSWORD,
    tabela: 'megasenas',
    colunas: ['nummega', 'datamega', 'bl1', 'bl2', 'bl3', 'bl4', 'bl5', 'bl6', 'rateio6', 'rateio5', 'rateio4', 'numganha6', 'numganha5', 'numganha4', 'acumulado', 'arrecadacao', 'estimativa'],
    mapeamento: (row) => ({
      nummega: parseInt(row.concurso),
      datamega: converterData(row.data),
      bl1: row.dezenas[0],
      bl2: row.dezenas[1],
      bl3: row.dezenas[2],
      bl4: row.dezenas[3],
      bl5: row.dezenas[4],
      bl6: row.dezenas[5],
      rateio6: parseFloat(row.premiacao?.seis?.valor || 0),
      rateio5: parseFloat(row.premiacao?.cinco?.valor || 0),
      rateio4: parseFloat(row.premiacao?.quatro?.valor || 0),
      numganha6: parseInt(row.premiacao?.seis?.ganhadores || 0),
      numganha5: parseInt(row.premiacao?.cinco?.ganhadores || 0),
      numganha4: parseInt(row.premiacao?.quatro?.ganhadores || 0),
      acumulado: parseFloat(row.acumulado || 0),
      arrecadacao: parseFloat(row.arrecadacao || 0),
      estimativa: parseFloat(row.estimativa || 0)
    })
  },
  {
    nome: 'Lotofácil',
    apiUrl: 'https://loteriascaixa-api.herokuapp.com/api/lotofacil',
    banco: process.env.LF_PROD_DATABASE,
    host: process.env.LF_PROD_HOST,
    user: process.env.LF_PROD_USER,
    password: process.env.LF_PROD_PASSWORD,
    tabela: 'lotofacils',
    colunas: ['numfacil', 'datafacil', 'bl01', 'bl02', 'bl03', 'bl04', 'bl05', 'bl06', 'bl07', 'bl08', 'bl09', 'bl10', 'bl11', 'bl12', 'bl13', 'bl14', 'bl15', 'rateio15', 'rateio14', 'rateio13', 'rateio12', 'rateio11', 'numganha15', 'numganha14', 'numganha13', 'numganha12', 'numganha11', 'acumulado', 'arrecadacao', 'estimativa'],
    mapeamento: (row) => ({
      numfacil: parseInt(row.concurso),
      datafacil: converterData(row.data),
      bl01: row.dezenas[0],
      bl02: row.dezenas[1],
      bl03: row.dezenas[2],
      bl04: row.dezenas[3],
      bl05: row.dezenas[4],
      bl06: row.dezenas[5],
      bl07: row.dezenas[6],
      bl08: row.dezenas[7],
      bl09: row.dezenas[8],
      bl10: row.dezenas[9],
      bl11: row.dezenas[10],
      bl12: row.dezenas[11],
      bl13: row.dezenas[12],
      bl14: row.dezenas[13],
      bl15: row.dezenas[14],
      rateio15: parseFloat(row.premiacao?.quinze?.valor || 0),
      rateio14: parseFloat(row.premiacao?.quatorze?.valor || 0),
      rateio13: parseFloat(row.premiacao?.treze?.valor || 0),
      rateio12: parseFloat(row.premiacao?.doze?.valor || 0),
      rateio11: parseFloat(row.premiacao?.onze?.valor || 0),
      numganha15: parseInt(row.premiacao?.quinze?.ganhadores || 0),
      numganha14: parseInt(row.premiacao?.quatorze?.ganhadores || 0),
      numganha13: parseInt(row.premiacao?.treze?.ganhadores || 0),
      numganha12: parseInt(row.premiacao?.doze?.ganhadores || 0),
      numganha11: parseInt(row.premiacao?.onze?.ganhadores || 0),
      acumulado: parseFloat(row.acumulado || 0),
      arrecadacao: parseFloat(row.arrecadacao || 0),
      estimativa: parseFloat(row.estimativa || 0)
    })
  }
];

// ===== FUNÇÕES =====

async function importarDaAPI(config) {
  console.log(`📥 Buscando dados da API: ${config.apiUrl}`);
  
  const response = await axios.get(config.apiUrl);
  const dados = response.data;
  
  console.log(`✅ ${dados.length} concursos encontrados.`);

  const db = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.banco
  });

  let inseridos = 0;
  let erros = 0;

  const concursos = dados.reverse();

  for (let i = 0; i < concursos.length; i++) {
    const row = concursos[i];
    try {
      const dadosMapeados = config.mapeamento(row);
      const placeholders = config.colunas.map(() => '?').join(', ');
      const sql = `
        INSERT INTO ${config.tabela} (${config.colunas.join(', ')})
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE
        ${config.colunas.slice(1).map(col => `${col} = VALUES(${col})`).join(', ')}
      `;

      const valores = config.colunas.map(col => dadosMapeados[col]);
      await new Promise((resolve, reject) => {
        db.query(sql, valores, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      inseridos++;
    } catch (e) {
      console.error(`❌ Erro no concurso ${row.concurso}:`, e.message);
      erros++;
    }
  }

  db.end();
  console.log(`✅ ${config.nome}: ${inseridos} concursos importados, ${erros} erros.`);
  return { inseridos, erros };
}

// ===== EXECUÇÃO =====

(async function() {
  console.log('🚀 Iniciando importação via API da comunidade...');
  
  for (const loteria of LOTERIAS) {
    try {
      console.log(`\n--- ${loteria.nome} ---`);
      await importarDaAPI(loteria);
    } catch (erro) {
      console.error(`❌ Erro ao processar ${loteria.nome}:`, erro.message);
    }
  }

  console.log('\n🏁 Importação concluída!');
})();