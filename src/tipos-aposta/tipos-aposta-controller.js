const express = require('express');
const pool = require('../config/loterias');

const router = express.Router();

// Lista tipos ativos (para o front montar a tela de geração)
router.get('/', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, jogo, nome, modelo, dezenas_min, dezenas_max
     FROM tipos_aposta
     WHERE ativo = 1
     ORDER BY jogo, nome`
  );
  res.json({ tipos: rows });
});

// Detalhe de um tipo
router.get('/:id', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, jogo, nome, modelo, dezenas_min, dezenas_max
     FROM tipos_aposta
     WHERE id = ? AND ativo = 1`,
    [req.params.id]
  );

  if (rows.length === 0) return res.status(404).json({ erro: 'tipo_nao_encontrado' });
  res.json({ tipo: rows[0] });
});

module.exports = router;