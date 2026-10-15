const express = require('express');
const { registrar, login, logout } = require('./auth.service');
const { autenticar } = require('./auth.middleware');
const { registroSchema, loginSchema } = require('./auth.schema');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

router.post('/register', async (req, res) => {
  const parsed = registroSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: 'dados_invalidos', detalhes: parsed.error.issues });

  try {
    const user = await registrar(parsed.data);
    res.status(201).json({ user });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'email_ja_existe' });
    res.status(500).json({ erro: 'erro_interno' });
  }
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: 'dados_invalidos' });

  try {
    const { token, user } = await login({
      ...parsed.data,
      ip: req.ip,
      userAgent: req.get('user-agent')?.slice(0, 255),
    });

    res.cookie('session', token, COOKIE_OPTS);
    res.json({ user });
  } catch (e) {
    if (e.message === 'CREDENCIAIS_INVALIDAS') return res.status(401).json({ erro: 'credenciais_invalidas' });
    res.status(500).json({ erro: 'erro_interno' });
  }
});

router.post('/logout', autenticar, async (req, res) => {
  await logout(req.token);
  res.clearCookie('session', { ...COOKIE_OPTS, maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', autenticar, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;