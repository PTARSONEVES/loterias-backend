const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// ===== CONFIGURAÇÃO =====
const LOTERIAS = [
  {
    nome: 'Mega-Sena',
    url: 'https://loterias.caixa.gov.br/resultados/megasena/json/',
    banco: process.env.MS_PROD_DATABASE,
    host: process.env.MS_PROD_HOST,
    user: process.env.MS_PROD_USER,
    password: process.env.MS_PROD_PASSWORD,
    tabela: 'megasenas',
    colunas: ['nummega', 'datamega', 'bl1', 'bl2', 'bl3', 'bl4', 'bl5', 'bl6', 'rateio6', 'rateio5', 'rateio4', 'numganha6', 'numganha5', 'numganha4', 'acumulado', 'arrecadacao', 'estimativa'],
    mapeamento: (row) => ({
      nummega: parseInt(row.concurso),
      datamega: row.data,
      bl1: row.dezenas[0],
      bl2: row.dezenas[1],
      bl3: row.dezenas[2],
      bl4: row.dezenas[3],
      bl5: row.dezenas[4],
      bl6: row.dezenas[5],
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
    url: 'https://loterias.caixa.gov.br/resultados/lotofacil/json/',
    banco: process.env.LF_PROD_DATABASE,
    host: process.env.LF_PROD_HOST,
    user: process.env.LF_PROD_USER,
    password: process.env.LF_PROD_PASSWORD,
    tabela: 'lotofacils',
    colunas: ['numfacil', 'datafacil', 'bl01', 'bl02', 'bl03', 'bl04', 'bl05', 'bl06', 'bl07', 'bl08', 'bl09', 'bl10', 'bl11', 'bl12', 'bl13', 'bl14', 'bl15', 'rateio15', 'rateio14', 'rateio13', 'rateio12', 'rateio11', 'numganha15', 'numganha14', 'numganha13', 'numganha12', 'numganha11', 'acumulado', 'arrecadacao', 'estimativa'],
    mapeamento: (row) => ({
      numfacil: parseInt(row.concurso),
      datafacil: row.data,
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

// Baixar JSON da Caixa
async function baixarJSON(url) {
  console.log(`📥 Baixando ${url}...`);
  const response = await axios({
    method: 'get',
    url: url,
    headers: { 'User-Agent': 'Mozilla/5.0' } // evita bloqueio
  });
  return response.data;
}

// Importar JSON para o banco de produção
function importarJSON(dados, config) {
  return new Promise((resolve, reject) => {
    const db = mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.banco
    });

    let linhas = 0;
    let erros = 0;

    // Processa cada concurso (ordem decrescente)
    const concursos = dados.sort((a, b) => a.concurso - b.concurso);

    concursos.forEach((row, index) => {
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
            console.error(`❌ Erro ao inserir concurso ${row.concurso}:`, err.message);
            erros++;
          } else {
            linhas++;
            if (linhas % 100 === 0) console.log(`   ${linhas} concursos importados...`);
          }

          if (index === concursos.length - 1) {
            console.log(`✅ ${config.nome}: ${linhas} concursos importados, ${erros} erros.`);
            db.end();
            resolve({ linhas, erros });
          }
        });
      } catch (e) {
        console.error(`❌ Erro ao processar concurso ${row.concurso}:`, e.message);
        erros++;
      }
    });
  });
}

// ===== EXECUÇÃO PRINCIPAL =====

(async function() {
  console.log('🚀 Iniciando importação para produção (JSON)...');
  
  for (const loteria of LOTERIAS) {
    try {
      console.log(`\n--- ${loteria.nome} ---`);
      
      // 1. Baixar JSON
      const dados = await baixarJSON(loteria.url);
      console.log(`✅ Download concluído! ${dados.length} concursos encontrados.`);

      // 2. Importar para o banco
      const resultado = await importarJSON(dados, loteria);
      console.log(`✅ Importação finalizada: ${resultado.linhas} concursos inseridos.`);
      
    } catch (erro) {
      console.error(`❌ Erro ao processar ${loteria.nome}:`, erro.message);
    }
  }

  console.log('\n🏁 Importação para produção concluída!');
})();