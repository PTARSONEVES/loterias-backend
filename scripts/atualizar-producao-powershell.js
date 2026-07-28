// ============================================================
// atualizar-producao-powershell.js
// Versão final com logs e controle de duplicidade
// ============================================================

const mysql = require('mysql2');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ===== CONTROLE DE ÚLTIMO ARQUIVO IMPORTADO =====
const CONTROLE_PATH = path.join(__dirname, 'ultimo_importado.txt');

function lerUltimoImportado() {
  try {
    if (fs.existsSync(CONTROLE_PATH)) {
      const linhas = fs.readFileSync(CONTROLE_PATH, 'utf8').trim().split('\n');
      const dados = {};
      linhas.forEach(linha => {
        const [chave, valor] = linha.split('|');
        if (chave && valor) dados[chave] = valor;
      });
      return dados;
    }
  } catch (erro) {
    console.warn(`⚠️ Aviso: Não foi possível ler o arquivo de controle.`);
  }
  return {};
}

function salvarUltimoImportado(loteriaNome, nomeArquivo, mtime) {
  try {
    const dados = lerUltimoImportado();
    dados[loteriaNome] = `${nomeArquivo}|${mtime}`;
    
    const linhas = Object.entries(dados).map(([chave, valor]) => `${chave}|${valor}`);
    fs.writeFileSync(CONTROLE_PATH, linhas.join('\n'), 'utf8');
    console.log(`📝 ${loteriaNome} registrada: ${nomeArquivo} (${mtime})`);
  } catch (erro) {
    console.error(`❌ Erro ao salvar arquivo de controle: ${erro.message}`);
  }
}

// ===== SISTEMA DE LOGS =====
const LOG_PATH = path.join(__dirname, 'execucao.log');

function escreverLog(mensagem, tipo = 'INFO') {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const linha = `[${timestamp}] [${tipo}] ${mensagem}\n`;
  try {
    fs.appendFileSync(LOG_PATH, linha, 'utf8');
  } catch (erro) {
    console.error(`❌ Erro ao escrever log: ${erro.message}`);
  }
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
      "LOAD DATA INFILE 'D:/temp/Mega-Sena.csv' INTO TABLE txtmega FIELDS TERMINATED BY '|' ENCLOSED BY '\"' ESCAPED BY '\\\\' IGNORE 2 ROWS (concurso, dta, b1, b2, b3, b4, b5, b6, g6, `local`, rt6, g5, rt5, g4, rt4, ac6, atot, estima, acummegavirada, obs, @dummy1, @dummy2, @dummy3, @dummy4, @dummy5, @dummy6, @dummy7, @dummy8, @dummy9, @dummy10);",
      "SELECT COUNT(*) AS total FROM txtmega;",
      "CALL PAObtemMegas('atualiza');",
      "SELECT COUNT(*) AS total FROM megasenas;",
      "CALL PACombinaUms('atualiza');",
      "CALL PACombinaDois('atualiza');",
      "CALL PACombinaTres('atualiza');",
      "CALL PACombinaQuatros('atualiza');",
      "CALL PAGeraCiclos();"
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
      "LOAD DATA INFILE 'D:/temp/Lotofacil.csv' INTO TABLE txtfacil FIELDS TERMINATED BY '|' ENCLOSED BY '\"' ESCAPED BY '\\\\' IGNORE 2 ROWS (concurso, dta, b01, b02, b03, b04, b05, b06, b07, b08, b09, b10, b11, b12, b13, b14, b15, g15, `local`, rt15, g14, rt14, g13, rt13, g12, rt12, g11, rt11, ac15, atot, estima, acumindependencia, obs, @dummy1, @dummy2, @dummy3, @dummy4, @dummy5, @dummy6, @dummy7, @dummy8, @dummy9, @dummy10);",
      "SELECT COUNT(*) AS total FROM txtfacil;",
      "CALL PAObtemLotofacil('atualiza');",
      "SELECT COUNT(*) AS total FROM lotofacils;",
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

// ===== FUNÇÕES =====

function encontrarArquivoMaisRecente(pasta, nomeBase) {
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

function limparCSV(caminho) {
  console.log(`🧹 Limpando caracteres de controle: ${caminho}`);
  const scriptPath = 'D:\\xampp\\htdocs\\loterias\\loterias-backend\\scripts\\limpar_csv.ps1';
  const comando = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -caminhoArquivo "${caminho}"`;
  try {
    execSync(comando, { stdio: 'inherit' });
    console.log(`✅ CSV limpo: ${caminho}`);
  } catch (erro) {
    console.error(`❌ Erro ao limpar CSV: ${erro.message}`);
  }
}

function converterComPowerShell(caminhoOrigem, caminhoDestino) {
  console.log(`📄 Convertendo: ${path.basename(caminhoOrigem)} -> ${caminhoDestino}`);
  const scriptPath = 'D:\\xampp\\htdocs\\loterias\\loterias-backend\\scripts\\converter-python.ps1';
  const comando = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -caminhoOrigem "${caminhoOrigem}" -caminhoDestino "${caminhoDestino}"`;
  try {
    const output = execSync(comando, { encoding: 'utf8' });
    console.log(output.trim());
    console.log(`✅ Conversão concluída!`);
  } catch (erro) {
    console.error(`❌ Erro no PowerShell:`);
    console.error(erro.stdout);
    console.error(erro.stderr);
    throw new Error(`Erro ao executar PowerShell: ${erro.message}`);
  }
}

async function executarSps(bancoConfig, sps) {
  const pool = mysql.createPool({
    host: bancoConfig.host,
    user: bancoConfig.user,
    password: bancoConfig.password,
    database: bancoConfig.banco,
    connectionLimit: 1,
    waitForConnections: true
  });

  console.log(`🔌 Conectado ao banco: ${bancoConfig.banco}`);

  for (let i = 0; i < sps.length; i++) {
    const cmd = sps[i];
    console.log(`  ▶️ Executando: ${cmd.substring(0, 60)}...`);
    try {
      const results = await new Promise((resolve, reject) => {
        pool.query(cmd, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      if (cmd.trim().toUpperCase().startsWith('SELECT')) {
        if (results && results.length > 0) {
          console.log(`  📊 Resultado: ${JSON.stringify(results[0])}`);
        }
      }
    } catch (err) {
      console.error(`❌ Erro no comando: ${cmd}`);
      console.error(`❌ Detalhes: ${err.message}`);
      pool.end();
      throw err;
    }
  }

  pool.end();
  console.log(`✅ Banco ${bancoConfig.banco} atualizado.`);
}

// ===== EXECUÇÃO PRINCIPAL =====

(async function() {
  escreverLog('🚀 Iniciando atualização do sistema.');
  console.log('🚀 Iniciando atualização com PowerShell...\n');

  for (const loteria of LOTERIAS) {
    try {
      console.log(`\n--- ${loteria.nome} ---`);

      const caminhoOrigem = encontrarArquivoMaisRecente(loteria.pastaOrigem, loteria.nomeBase);
      const nomeArquivo = path.basename(caminhoOrigem);
      const mtime = fs.statSync(caminhoOrigem).mtime.toISOString();

      const ultimoImportado = lerUltimoImportado();
      const chave = loteria.nome;

      if (ultimoImportado[chave] === `${nomeArquivo}|${mtime}`) {
        console.log(`⏩ ${loteria.nome}: "${nomeArquivo}" (${mtime}) já foi importado. Pulando...`);
        escreverLog(`⏩ ${loteria.nome} - Arquivo "${nomeArquivo}" já importado. Pulando.`, 'SKIP');
        continue;
      }

      console.log(`📂 ${loteria.nome} - Novo arquivo: ${nomeArquivo} (${mtime})`);
      escreverLog(`📂 Processando ${loteria.nome} - Arquivo: ${nomeArquivo} (${mtime})`);

      converterComPowerShell(caminhoOrigem, loteria.arquivoDestino);
      limparCSV(loteria.arquivoDestino);
      await executarSps(loteria, loteria.sps);

      salvarUltimoImportado(loteria.nome, nomeArquivo, mtime);
      escreverLog(`✅ ${loteria.nome} atualizada com sucesso!`, 'SUCCESS');

      console.log(`✅ ${loteria.nome} atualizada com sucesso!`);
    } catch (erro) {
      console.error(`❌ Erro na atualização da ${loteria.nome}:`, erro.message);
      escreverLog(`❌ Erro na ${loteria.nome}: ${erro.message}`, 'ERROR');
    }
  }

  escreverLog('🏁 Processo de atualização concluído.');
  console.log('\n🏁 Processo de atualização concluído!');
})();