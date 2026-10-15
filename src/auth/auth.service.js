const argon2 = require('argon2');
const crypto = require('crypto');
const pool = require('../config/loterias');

const SESSAO_DIAS = 7;

async function registrar({ email, senha, nome }) {
  const hash = await argon2.hash(senha, { type: argon2.argon2id });

  const [result] = await pool.execute(
    'INSERT INTO users (email, senha_hash, nome) VALUES (?, ?, ?)',
    [email, hash, nome]
  );

  return { id: result.insertId, email, nome, role: 'visitor' };
}

async function login({ email, senha, ip, userAgent }) {
  const [rows] = await pool.execute(
    'SELECT id, email, nome, senha_hash, role, profile_complete FROM users WHERE email = ? AND ativo = 1',
    [email]
  );

  if (rows.length === 0) throw new Error('CREDENCIAIS_INVALIDAS');

  const user = rows[0];
  const ok = await argon2.verify(user.senha_hash, senha);
  if (!ok) throw new Error('CREDENCIAIS_INVALIDAS');

  const token = crypto.randomBytes(32).toString('hex');
  const expiraEm = new Date(Date.now() + SESSAO_DIAS * 24 * 60 * 60 * 1000);

  await pool.execute(
    'INSERT INTO sessoes (id, user_id, ip, user_agent, expira_em) VALUES (?, ?, ?, ?, ?)',
    [token, user.id, ip, userAgent, expiraEm]
  );

  delete user.senha_hash;
  return { token, user };
}

async function logout(token) {
  await pool.execute('DELETE FROM sessoes WHERE id = ?', [token]);
}

async function usuarioPorToken(token) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.email, u.nome, u.role, u.profile_complete
     FROM sessoes s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expira_em > NOW() AND u.ativo = 1`,
    [token]
  );
  return rows[0] || null;
}

module.exports = { registrar, login, logout, usuarioPorToken };