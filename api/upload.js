const { json, parseBody, verifyPassword, isConfigured, writeBinaryFile } = require('../lib/cms');

function safeName(name='arquivo') {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '') || 'arquivo';
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { error: 'Método não permitido.' });
    }

    if (!isConfigured()) {
      return json(res, 503, { error: 'Painel ainda não configurado.' });
    }

    const { password, filename, contentBase64, kind } = parseBody(req);

    if (!verifyPassword(password)) {
      return json(res, 401, { error: 'PIN incorreto.' });
    }

    if (!contentBase64) {
      return json(res, 400, { error: 'Arquivo vazio.' });
    }

    const folder = ['hero','story','experience','gallery','menu'].includes(kind)
      ? kind
      : 'uploads';

   const name = kind === 'menu'
  ? 'cardapio-nonna-mery.pdf'
  : `${Date.now()}-${safeName(filename)}`;
    const path = `assets/${folder}/${name}`;
    const buffer = Buffer.from(contentBase64, 'base64');

    if (!buffer.length) {
      return json(res, 400, { error: 'Arquivo inválido.' });
    }

    if (buffer.length > 4 * 1024 * 1024) {
      return json(res, 413, { error: 'Arquivo muito grande. Use no máximo 4 MB.' });
    }

    await writeBinaryFile(path, buffer, `CMS: enviar ${folder}`);

    const url =
      `https://raw.githubusercontent.com/Thomastigre-ux/nonna-mery-trattoria/main/${path}?v=${Date.now()}`;

    return json(res, 200, { ok: true, url });

  } catch (e) {
    console.error(e);
    return json(res, 500, { error: e.message || 'Falha no upload.' });
  }
};
