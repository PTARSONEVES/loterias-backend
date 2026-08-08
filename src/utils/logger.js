const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '../../execucao.log');

function escreverLog(mensagem, tipo = 'INFO') {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const linha = `[${timestamp}] [${tipo}] ${mensagem}\n`;
  try {
    fs.appendFileSync(LOG_PATH, linha, 'utf8');
  } catch (erro) {
    console.error(`❌ Erro ao escrever log: ${erro.message}`);
  }
}

module.exports = { escreverLog };