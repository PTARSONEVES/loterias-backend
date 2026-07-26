// ============================================================
// atualizar-producao-powershell.js
// Chama o PowerShell e executa as SPs
// ============================================================

const mysql = require('mysql2');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
      // Garante que a tabela tenha as colunas do CSV
//      "ALTER TABLE txtmega ADD COLUMN IF NOT EXISTS observacao TEXT;",
//      "ALTER TABLE txtmega ADD COLUMN IF NOT EXISTS rateio_especial DECIMAL(20,6);",
      "LOAD DATA INFILE 'D:/temp/Mega-Sena.csv' INTO TABLE txtmega FIELDS TERMINATED BY '|' ENCLOSED BY '\"' LINES TERMINATED BY '\\n' IGNORE 1 ROWS;",
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
      "LOAD DATA INFILE 'D:/temp/Mega-Sena.csv' INTO TABLE txtmega FIELDS TERMINATED BY '|' ENCLOSED BY '\"' LINES TERMINATED BY '\\n' IGNORE 2 ROWS;",
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
    throw new Error(`Nenhum arquivo .xlsx com base "${nomeBase}" encontrado`);
  }

  arquivos.sort((a, b) => b.mtime - a.mtime);
  return arquivos[0].caminho;
}

function converterComPowerShell(caminhoOrigem, caminhoDestino) {
  console.log(`📄 Convertendo: ${path.basename(caminhoOrigem)} -> ${caminhoDestino}`);
  
  const scriptPath = 'D:\\xampp\\htdocs\\loterias\\loterias-backend\\scripts\\converter.ps1';
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
        if (err) reject(err);
        else resolve();
      });
    });
  }

  db.end();
  console.log(`✅ Banco ${bancoConfig.banco} atualizado.`);
}

// ===== EXECUÇÃO PRINCIPAL =====

(async function() {
  console.log('🚀 Iniciando atualização com PowerShell...\n');

  for (const loteria of LOTERIAS) {
    try {
      console.log(`\n--- ${loteria.nome} ---`);
      
      const caminhoOrigem = encontrarArquivoMaisRecente(loteria.pastaOrigem, loteria.nomeBase);
      console.log(`📂 Arquivo mais recente: ${path.basename(caminhoOrigem)}`);
      
      converterComPowerShell(caminhoOrigem, loteria.arquivoDestino);
      
      await executarSps(loteria, loteria.sps);
      
      console.log(`✅ ${loteria.nome} atualizada com sucesso!`);
    } catch (erro) {
      console.error(`❌ Erro na atualização da ${loteria.nome}:`, erro.message);
    }
  }

  console.log('\n🏁 Processo de atualização concluído!');
})();