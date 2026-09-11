const { json, parseBody, verifyPassword, isConfigured } = require('../lib/cms');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Método não permitido.' });
  }

  if (!isConfigured()) {
    return json(res, 503, { error: 'Painel ainda não configurado.' });
  }

  const { password } = parseBody(req);

  if (!verifyPassword(password)) {
    return json(res, 401, { error: 'PIN incorreto.' });
  }

  return json(res, 200, { ok: true });
};
