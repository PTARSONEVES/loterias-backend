const { execSync } = require('child_process');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { escreverLog } = require('../utils/logger');
const { lerUltimoImportado, salvarUltimoImportado } = require('../utils/controle');

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
  return new Promise((resolve, reject) => {
    const scriptPath = 'D:\\xampp\\htdocs\\loterias\\loterias-backend\\src\\scripts\\limpar_csv.ps1';
    const comando = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -caminhoArquivo "${caminho}"`;
    exec(comando, (erro, stdout, stderr) => {
      if (erro) {
        console.error(`❌ Erro ao limpar CSV: ${erro.message}`);
        reject(erro);
      } else {
        console.log(stdout.trim());
        resolve();
      }
    });
  });
}

function converterComPowerShell(caminhoOrigem, caminhoDestino) {
  return new Promise((resolve, reject) => {
    const scriptPath = 'D:\\xampp\\htdocs\\loterias\\loterias-backend\\src\\scripts\\converter-python.ps1';
    const comando = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -caminhoOrigem "${caminhoOrigem}" -caminhoDestino "${caminhoDestino}"`;
    exec(comando, (erro, stdout, stderr) => {
      if (erro) {
        console.error(`❌ Erro ao converter: ${erro.message}`);
        reject(erro);
      } else {
        console.log(stdout.trim());
        resolve();
      }
    });
  });
}

async function importarLoteria(loteria, sps) {
  const { nome, pastaOrigem, nomeBase, arquivoDestino } = loteria;
  
  const caminhoOrigem = encontrarArquivoMaisRecente(pastaOrigem, nomeBase);
  const nomeArquivo = path.basename(caminhoOrigem);
  const mtime = fs.statSync(caminhoOrigem).mtime.toISOString();

  const ultimoImportado = lerUltimoImportado();
  if (ultimoImportado[nome] === `${nomeArquivo}|${mtime}`) {
    escreverLog(`⏩ ${nome} - Arquivo "${nomeArquivo}" já importado. Pulando.`, 'SKIP');
    return false;
  }

  escreverLog(`📂 Processando ${nome} - Arquivo: ${nomeArquivo} (${mtime})`);

  // Agora executa as tarefas em paralelo (assíncrono)
  await converterComPowerShell(caminhoOrigem, arquivoDestino);
  await limparCSV(arquivoDestino);

  // Executa as SPs (já é assíncrono)
  const Model = nome === 'Mega-Sena' 
    ? require('../models/MegasenaModel') 
    : require('../models/LotofacilModel');
  await Model.executarSps(nome === 'Mega-Sena' ? 'megasena' : 'lotofacil', sps);

  salvarUltimoImportado(nome, nomeArquivo, mtime);
  escreverLog(`✅ ${nome} atualizada com sucesso!`, 'SUCCESS');
  return true;
}

module.exports = { importarLoteria };