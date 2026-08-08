const { executarGeracao } = require('../services/geradorService');

function gerarApostas(req, res) {
  const loteria = req.params.loteria;
  const { nivelRisco, nciclos, njogos, intervalo, seqbase } = req.body;

  const criterioMap = {
    'baixo': 'Baixo',
    'medio': 'Médio',
    'alto': 'Alto'
  };
  const criterio = criterioMap[nivelRisco] || 'Médio';

  const params = {
    nciclos: nciclos || 100,
    njogos: njogos || 10,
    intervalo: intervalo || 1,
    seqbase: seqbase || 0,
    criterio: criterio,
    tiposimulacao: 'GERACAO',
    tipoprocessamento: 'GERAR_CARTOES'
  };

  executarGeracao(loteria, params)
    .then(apostas => {
      const apostasFormatadas = apostas.map(aposta => ({
        id: aposta.id,
        numbolas: aposta.numbolas,
        dezenas: aposta.dezenas || aposta.jogo || aposta.cartao || ''
      }));

      res.json({
        nivel: nivelRisco,
        criterio: criterio,
        quantidade: apostasFormatadas.length,
        apostas: apostasFormatadas
      });
    })
    .catch(erro => {
      console.error('Erro na geração:', erro);
      res.status(500).json({ erro: 'Erro ao gerar apostas.' });
    });
}

module.exports = { gerarApostas };