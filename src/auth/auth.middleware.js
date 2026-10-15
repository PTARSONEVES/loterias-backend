const { usuarioPorToken } = require('./auth.service');

async function autenticar(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ erro: 'nao_autenticado' });

  const user = await usuarioPorToken(token);
  if (!user) return res.status(401).json({ erro: 'sessao_invalida' });

  req.user = user;
  req.token = token;
  next();
}

module.exports = { autenticar };