// ============================================================
// importar-prod.js - Importa dados da Caixa para produção
// ============================================================

const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');
require('dotenv').config();

// ===== CONFIGURAÇÃO =====
const LOTERIAS = [
  {
    nome: 'Mega-Sena',
    url: 'https://loterias.caixa.gov.br/resultados/megasena.csv',
    arquivo: './megasena.csv',
    banco: process.env.MS_PROD_DATABASE,
    host: process.env.MS_PROD_HOST,
    user: process.env.MS_PROD_USER,
    password: process.env.MS_PROD_PASSWORD,
    tabela: 'megasenas',
    colunas: ['nummega', 'datamega', 'bl1', 'bl2', 'bl3', 'bl4', 'bl5', 'bl6', 'rateio6', 'rateio5', 'rateio4', 'numganha6', 'numganha5', 'numganha4', 'acumulado', 'arrecadacao', 'estimativa'],
    mapeamento: (row) => ({
      nummega: parseInt(row.concurso),
      datamega: row.data_sorteio,
      bl1: row.b1,
      bl2: row.b2,
      bl3: row.b3,
      bl4: row.b4,
      bl5: row.b5,
      bl6: row.b6,
      rateio6: parseFloat(row.rateio6),
      rateio5: parseFloat(row.rateio5),
      rateio4: parseFloat(row.rateio4),
      numganha6: parseInt(row.ganhadores6),
      numganha5: parseInt(row.ganhadores5),
      numganha4: parseInt(row.ganhadores4),
      acumulado: parseFloat(row.acumulado),
      arrecadacao: parseFloat(row.arrecadacao),
      estimativa: parseFloat(row.estimativa)
    })
  },
  {
    nome: 'Lotofácil',
    url: 'https://loterias.caixa.gov.br/resultados/lotofacil.csv',
    arquivo: './lotofacil.csv',
    banco: process.env.LF_PROD_DATABASE,
    host: process.env.LF_PROD_HOST,
    user: process.env.LF_PROD_USER,
    password: process.env.LF_PROD_PASSWORD,
    tabela: 'lotofacils',
    colunas: ['numfacil', 'datafacil', 'bl01', 'bl02', 'bl03', 'bl04', 'bl05', 'bl06', 'bl07', 'bl08', 'bl09', 'bl10', 'bl11', 'bl12', 'bl13', 'bl14', 'bl15', 'rateio15', 'rateio14', 'rateio13', 'rateio12', 'rateio11', 'numganha15', 'numganha14', 'numganha13', 'numganha12', 'numganha11', 'acumulado', 'arrecadacao', 'estimativa'],
    mapeamento: (row) => ({
      numfacil: parseInt(row.concurso),
      datafacil: row.data_sorteio,
      bl01: row.b1, // o CSV da Lotofácil chama de b1, b2, ... b15
      bl02: row.b2,
      bl03: row.b3,
      bl04: row.b4,
      bl05: row.b5,
      bl06: row.b6,
      bl07: row.b7,
      bl08: row.b8,
      bl09: row.b9,
      bl10: row.b10,
      bl11: row.b11,
      bl12: row.b12,
      bl13: row.b13,
      bl14: row.b14,
      bl15: row.b15,
      rateio15: parseFloat(row.rateio15),
      rateio14: parseFloat(row.rateio14),
      rateio13: parseFloat(row.rateio13),
      rateio12: parseFloat(row.rateio12),
      rateio11: parseFloat(row.rateio11),
      numganha15: parseInt(row.ganhadores15),
      numganha14: parseInt(row.ganhadores14),
      numganha13: parseInt(row.ganhadores13),
      numganha12: parseInt(row.ganhadores12),
      numganha11: parseInt(row.ganhadores11),
      acumulado: parseFloat(row.acumulado),
      arrecadacao: parseFloat(row.arrecadacao),
      estimativa: parseFloat(row.estimativa)
    })
  }
];

// ===== FUNÇÕES =====

// Baixar arquivo CSV da Caixa
async function baixarCSV(url, destino) {
  console.log(`📥 Baixando ${url}...`);
  const response = await axios({
    method: 'get',
    url: url,
    responseType: 'stream'
  });
  const writer = fs.createWriteStream(destino);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Importar CSV para o banco de produção
function importarCSV(arquivo, config) {
  return new Promise((resolve, reject) => {
    const db = mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.banco
    });

    let linhas = 0;
    let erros = 0;

    fs.createReadStream(arquivo)
      .pipe(csv({ separator: ';' })) // ou ',' dependendo do formato
      .on('data', (row) => {
        try {
          const dados = config.mapeamento(row);
          const placeholders = config.colunas.map(() => '?').join(', ');
          const sql = `
            INSERT INTO ${config.tabela} (${config.colunas.join(', ')})
            VALUES (${placeholders})
            ON DUPLICATE KEY UPDATE
            ${config.colunas.slice(1).map(col => `${col} = VALUES(${col})`).join(', ')}
          `;

          const valores = config.colunas.map(col => dados[col]);
          db.query(sql, valores, (err) => {
            if (err) {
              console.error(`❌ Erro ao inserir linha:`, err.message);
              erros++;
            } else {
              linhas++;
            }
          });
        } catch (e) {
          console.error(`❌ Erro ao processar linha:`, e.message);
          erros++;
        }
      })
      .on('end', () => {
        console.log(`✅ ${config.nome}: ${linhas} linhas importadas, ${erros} erros.`);
        db.end();
        resolve({ linhas, erros });
      })
      .on('error', reject);
  });
}

// ===== EXECUÇÃO PRINCIPAL =====

(async function() {
  console.log('🚀 Iniciando importação para produção...');
  
  for (const loteria of LOTERIAS) {
    try {
      console.log(`\n--- ${loteria.nome} ---`);
      
      // 1. Baixar CSV
      await baixarCSV(loteria.url, loteria.arquivo);
      console.log(`✅ Download concluído: ${loteria.arquivo}`);

      // 2. Importar para o banco
      const resultado = await importarCSV(loteria.arquivo, loteria);
      console.log(`✅ Importação finalizada: ${resultado.linhas} linhas inseridas.`);
      
      // 3. Remover arquivo temporário (opcional)
      fs.unlinkSync(loteria.arquivo);
      console.log(`🗑️ Arquivo temporário removido: ${loteria.arquivo}`);
      
    } catch (erro) {
      console.error(`❌ Erro ao processar ${loteria.nome}:`, erro.message);
    }
  }

  console.log('\n🏁 Importação para produção concluída!');
})();