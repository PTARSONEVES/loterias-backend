const fs = require('fs');
const path = require('path');

const CONTROLE_PATH = path.join(__dirname, '../../ultimo_importado.txt');

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
  } catch (erro) {
    console.error(`❌ Erro ao salvar arquivo de controle: ${erro.message}`);
  }
}

module.exports = { lerUltimoImportado, salvarUltimoImportado };