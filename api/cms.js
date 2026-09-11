const { json, parseBody, verifyPassword, isConfigured, readJsonFile, writeJsonFile } = require('../lib/cms');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      try {
        const { data } = await readJsonFile('content.json');
        return json(res, 200, { data, configured: isConfigured() });
      } catch (e) {
        return json(res, 200, { data: null, configured: isConfigured(), warning: 'Conteúdo remoto indisponível.' });
      }
    }

    if (req.method === 'POST') {
      if (!isConfigured()) return json(res, 503, { error: 'Painel ainda não configurado.' });

      const { password, data } = parseBody(req);

      if (!verifyPassword(password)) {
        return json(res, 401, { error: 'PIN incorreto.' });
      }

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return json(res, 400, { error: 'Conteúdo inválido.' });
      }

      await writeJsonFile('content.json', data, 'CMS: atualizar conteúdo do site');

      return json(res, 200, { ok: true, data });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: e.message || 'Erro interno.' });
  }
};
