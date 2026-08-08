const { importarLoteria } = require('../services/importadorService');
const { escreverLog } = require('../utils/logger');
const { fork } = require('child_process');
const path = require('path');

// Lista de loterias com suas configurações e SPs
const LOTERIAS = [
  {
    nome: 'Mega-Sena',
    pastaOrigem: 'D:/Downloads/Chrome',
    nomeBase: 'Mega-Sena',
    arquivoDestino: 'D:/temp/Mega-Sena.csv',
    sps: [
      "TRUNCATE TABLE auditoria;",
      "CALL PACriaTabelas('txtmega');",
      "LOAD DATA INFILE 'D:/temp/Mega-Sena.csv' INTO TABLE txtmega FIELDS TERMINATED BY '|' ENCLOSED BY '\"' ESCAPED BY '\\\\' IGNORE 2 ROWS (concurso, dta, b1, b2, b3, b4, b5, b6, g6, `local`, rt6, g5, rt5, g4, rt4, ac6, atot, estima, acummegavirada, obs, @dummy1, @dummy2, @dummy3, @dummy4, @dummy5, @dummy6, @dummy7, @dummy8, @dummy9, @dummy10);",
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
    sps: [
      "TRUNCATE TABLE auditoria;",
      "CALL PACriaTabelas('txtfacil');",
      "LOAD DATA INFILE 'D:/temp/Lotofacil.csv' INTO TABLE txtfacil FIELDS TERMINATED BY '|' ENCLOSED BY '\"' ESCAPED BY '\\\\' IGNORE 2 ROWS (concurso, dta, b01, b02, b03, b04, b05, b06, b07, b08, b09, b10, b11, b12, b13, b14, b15, g15, `local`, rt15, g14, rt14, g13, rt13, g12, rt12, g11, rt11, ac15, atot, estima, acumindependencia, obs, @dummy1, @dummy2, @dummy3, @dummy4, @dummy5, @dummy6, @dummy7, @dummy8, @dummy9, @dummy10);",
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

function atualizarTudo(req, res) {
  // Responde imediatamente
  res.json({ sucesso: true, mensagem: 'Atualização iniciada em segundo plano.' });

  // Cria um processo filho para executar a atualização
  const scriptPath = path.join(__dirname, '../scripts/executar-atualizacao.js');
  const child = fork(scriptPath);

  child.on('error', (erro) => {
    console.error('❌ Erro no processo filho:', erro);
  });

  child.on('exit', (code) => {
    console.log(`📦 Processo filho finalizado com código ${code}`);
  });
}

module.exports = { atualizarTudo };