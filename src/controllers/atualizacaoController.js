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
      "USE lotmegasenaprod;",
      "TRUNCATE TABLE auditoria;",
      "CALL PACriaTabelas('txtmega');",
      "LOAD DATA INFILE 'D:/temp/loterias/DOWNLOADS/Mega-Sena.csv' INTO TABLE txtmega FIELDS TERMINATED BY '|';",
      "CALL PAObtemMegas('atualiza');",
      "CALL loterias.PAAtualizaTabelasNumeros(1,'atualiza','megasena');",
      "CALL loterias.PAAtualizaTabelasNumeros(2,'atualiza','megasena');",
      "CALL loterias.PAAtualizaTabelasNumeros(3,'atualiza','megasena');",
      "CALL loterias.PAAtualizaTabelasNumeros(4,'atualiza','megasena');",
      "CALL loterias.PAAtualizaTabelasNumeros(5,'atualiza','megasena');",
      "CALL loterias.PAAtualizaTabelasNumeros(6,'atualiza','megasena');"
    ]
  },
  {
    nome: 'Lotofácil',
    pastaOrigem: 'D:/Downloads/Chrome',
    nomeBase: 'Lotofácil',
    arquivoDestino: 'D:/temp/Lotofacil.csv',
    sps: [
      "USE lotfacilprod;",
      "TRUNCATE TABLE auditoria;",
      "CALL PACriaTabelas('txtfacil');",
      "LOAD DATA INFILE 'D:/temp/loterias/DOWNLOADS/Lotofacil.csv' INTO TABLE txtfacil FIELDS TERMINATED BY '|';",
      "CALL PAObtemLotofacil('atualiza');",
      "CALL loterias.PAAtualizaTabelasNumeros(1,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(2,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(3,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(4,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(5,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(6,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(7,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(8,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(9,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(10,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(11,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(12,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(13,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(14,'atualiza','lotofacil');",
      "CALL loterias.PAAtualizaTabelasNumeros(15,'atualiza','lotofacil');"
    ]
  },
  {
    nome: 'Quina',
    pastaOrigem: 'D:/Downloads/Chrome',
    nomeBase: 'Quina',
    arquivoDestino: 'D:/temp/Quina.csv',
    sps: [
      "USE lotquinaprod;",
      "TRUNCATE TABLE auditoria;",
      "CALL PACriaTabelas('txtquina');",
      "LOAD DATA INFILE 'D:/temp/loterias/DOWNLOADS/Quina.csv' INTO TABLE txtquina FIELDS TERMINATED BY '|';",
      "CALL PAObtemQuina('atualiza');",
      "CALL loterias.PAAtualizaTabelasNumeros(1,'atualiza','quina');",
      "CALL loterias.PAAtualizaTabelasNumeros(2,'atualiza','quina');",
      "CALL loterias.PAAtualizaTabelasNumeros(3,'atualiza','quina');",
      "CALL loterias.PAAtualizaTabelasNumeros(4,'atualiza','quina');",
      "CALL loterias.PAAtualizaTabelasNumeros(5,'atualiza','quina');"
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