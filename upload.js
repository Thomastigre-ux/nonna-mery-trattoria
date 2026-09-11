const { json, parseBody, verifyPassword, isConfigured, uploadBase64 } = require('../lib/cms');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
    if (!isConfigured()) return json(res, 503, { error: 'Painel ainda não configurado.' });
    const { password, filename, contentBase64, kind } = parseBody(req);
    if (!verifyPassword(password)) return json(res, 401, { error: 'PIN incorreto.' });
    const url = await uploadBase64({ filename, contentBase64, kind });
    return json(res, 200, { ok: true, url });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: e.message || 'Falha no upload.' });
  }
};
