// ============================================================
// atualizar-producao.js (versão corrigida - lê qualquer aba)
// ============================================================

const mysql = require('mysql2');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const encoding = require('encoding');
const iconv = require('iconv-lite'); // instale com npm install iconv-lite
require('dotenv').config();

// ===== FUNÇÕES AUXILIARES =====

// Encontra o arquivo .xlsx mais recente em uma pasta
function encontrarArquivoMaisRecente(pasta, nomeBase) {
  if (!fs.existsSync(pasta)) {
    throw new Error(`Pasta não encontrada: ${pasta}`);
  }

  const arquivos = fs.readdirSync(pasta)
    .filter(file => file.startsWith(nomeBase) && file.endsWith('.xlsx'))
    .map(file => ({
      nome: file,
      caminho: path.join(pasta, file),
      mtime: fs.statSync(path.join(pasta, file)).mtime
    }));

  if (arquivos.length === 0) {
    throw new Error(`Nenhum arquivo .xlsx com base "${nomeBase}" encontrado em ${pasta}`);
  }

  arquivos.sort((a, b) => b.mtime - a.mtime);
  return arquivos[0].caminho;
}

// Tenta desbloquear o arquivo no Windows
function desbloquearArquivo(caminho) {
  try {
    execSync(`powershell -Command "Unblock-File -Path '${caminho}'"`, { stdio: 'ignore' });
    console.log(`🔓 Desbloqueado: ${caminho}`);
  } catch {
    console.warn(`⚠️ Falha ao desbloquear, tentando cópia alternativa...`);
  }
}

// Fecha qualquer instância do Excel aberta
function fecharExcel() {
  try {
    execSync('taskkill /f /im excel.exe', { stdio: 'ignore' });
    console.log('📁 Excel fechado forçadamente.');
  } catch {
    // Excel não estava aberto, tudo bem
  }
}

// Converte .xlsx para .csv com separador '|' e encoding UTF-8
function converterXlsxParaCsv(caminhoOrigem, caminhoDestino) {
  console.log(`📄 Lendo arquivo como texto: ${path.basename(caminhoOrigem)}`);
  
  // Lê o arquivo como texto puro (ANSI)
  const conteudo = fs.readFileSync(caminhoOrigem, 'latin1');
  
  // Substitui separador por pipe (|)
  // A Caixa usa ponto-e-vírgula como separador
  const csv = conteudo.replace(/;/g, '|');
  
  // Salva como UTF-8
  fs.writeFileSync(caminhoDestino, csv, 'utf8');
  
  // Conta as linhas
  const linhas = csv.split('\n').filter(line => line.trim() !== '').length;
  console.log(`✅ CSV UTF-8 gerado com ${linhas} linhas.`);
}
// Executa uma lista de comandos SQL em sequência
async function executarSps(bancoConfig, sps) {
  const db = mysql.createConnection({
    host: bancoConfig.host,
    user: bancoConfig.user,
    password: bancoConfig.password,
    database: bancoConfig.banco
  });

  console.log(`🔌 Conectado ao banco: ${bancoConfig.banco}`);

  for (let i = 0; i < sps.length; i++) {
    const cmd = sps[i];
    console.log(`  ▶️ Executando: ${cmd.substring(0, 60)}...`);
    
    await new Promise((resolve, reject) => {
      db.query(cmd, (err) => {
        if (err) {
          console.error(`❌ Erro no comando: ${cmd}`);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  db.end();
  console.log(`✅ Banco ${bancoConfig.banco} atualizado.`);
}

// ===== CONFIGURAÇÃO =====
const LOTERIAS = [
  {
    nome: 'Mega-Sena',
    pastaOrigem: 'D:/Downloads/Chrome',
    nomeBase: 'Mega-Sena',
    arquivoDestino: 'D:/temp/Mega-Sena.csv',
    banco: process.env.MS_PROD_DATABASE,
    host: process.env.MS_PROD_HOST,
    user: process.env.MS_PROD_USER,
    password: process.env.MS_PROD_PASSWORD,
    sps: [
      "TRUNCATE TABLE auditoria;",
      "CALL PACriaTabelas('txtmega');",
      "LOAD DATA INFILE 'D:/temp/Mega-Sena.csv' INTO TABLE txtmega FIELDS TERMINATED BY '|' ENCLOSED BY '\"' LINES TERMINATED BY '\n' IGNORE 1 ROWS;",
      "CALL PAObtemMegas('atualiza');",
      "CALL PACombinaUms('atualiza');",
      "CALL PACombinaDois('atualiza');",
      "CALL PACombinaTres('atualiza');",
      "CALL PACombinaQuatros('atualiza');",
      "CALL PAGeraCiclos();",
      "CALL PACombinaRestante('atualiza',5);"
    ]
  },
  {
    nome: 'Lotofácil',
    pastaOrigem: 'D:/Downloads/Chrome',
    nomeBase: 'Lotofácil',
    arquivoDestino: 'D:/temp/Lotofacil.csv',
    banco: process.env.LF_PROD_DATABASE,
    host: process.env.LF_PROD_HOST,
    user: process.env.LF_PROD_USER,
    password: process.env.LF_PROD_PASSWORD,
    sps: [
      "TRUNCATE TABLE auditoria;",
      "CALL PACriaTabelas('txtfacil');",
      "LOAD DATA INFILE 'D:/temp/Lotofacil.csv' INTO TABLE txtfacil FIELDS TERMINATED BY '|';",
      "CALL PAObtemLotofacil('atualiza');",
      "CALL PAAtualizaJogos();",
      "CALL PACombinaUms('atualiza');",
      "CALL PACombinaDois('atualiza');",
      "CALL PACombinaTres('atualiza');",
      "CALL PACombinaQuatros('atualiza');",
      "CALL PACombinaCincos('atualiza');",
      "CALL PACombinaSeis('atualiza');",
      "CALL PACombinaSetes('atualiza');",
      "CALL PACombinaOitos('atualiza');",
      "CALL PAGeraCiclos();",
      "CALL PACombinaRestante('atualiza',9);",
      "CALL PACombinaRestante('atualiza',10);",
      "CALL PACombinaRestante('atualiza',11);",
      "CALL PACombinaRestante('atualiza',12);",
      "CALL PACombinaRestante('atualiza',13);",
      "CALL PACombinaRestante('atualiza',14);"
    ]
  }
];

// ===== EXECUÇÃO PRINCIPAL =====

(async function() {
  console.log('🚀 Iniciando atualização de produção...\n');

  for (const loteria of LOTERIAS) {
    try {
      console.log(`\n--- ${loteria.nome} ---`);
      
      // 1. Encontra o arquivo mais recente
      const caminhoOrigem = encontrarArquivoMaisRecente(loteria.pastaOrigem, loteria.nomeBase);
      console.log(`📂 Arquivo mais recente: ${path.basename(caminhoOrigem)}`);
      
      // 2. Converte para CSV
      converterXlsxParaCsv(caminhoOrigem, loteria.arquivoDestino);
      
      // 3. Executa as Stored Procedures
      await executarSps(loteria, loteria.sps);
      
      console.log(`✅ ${loteria.nome} atualizada com sucesso!`);
    } catch (erro) {
      console.error(`❌ Erro na atualização da ${loteria.nome}:`, erro.message);
    }
  }

  console.log('\n🏁 Processo de atualização concluído!');
})();