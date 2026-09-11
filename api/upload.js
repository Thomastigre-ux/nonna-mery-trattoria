const {
  json,
  parseBody,
  verifyPassword,
  isConfigured,
  readJsonFile,
  writeJsonFile,
  writeBinaryFile
} = require('../lib/cms');

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

    // O PDF do cardápio sempre substitui o mesmo arquivo.
    // Assim o administrador não precisa renomear nada manualmente.
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

    // Validação simples para impedir arquivo que não seja PDF real.
    if (kind === 'menu') {
      const header = buffer.subarray(0, 5).toString('ascii');
      if (header !== '%PDF-') {
        return json(res, 400, { error: 'O arquivo selecionado não é um PDF válido.' });
      }
    }

    await writeBinaryFile(path, buffer, `CMS: atualizar ${folder}`);

    const version = Date.now();
    const url = `https://raw.githubusercontent.com/Thomastigre-ux/nonna-mery-trattoria/main/${path}?v=${version}`;

    // Ao trocar o cardápio, atualiza content.json automaticamente.
    // Mesmo que o usuário não edite nenhum outro campo, o novo PDF vira o oficial.
    if (kind === 'menu') {
      let current = {};
      try {
        const result = await readJsonFile('content.json');
        current = result?.data || {};
      } catch (e) {
        console.warn('Não foi possível ler content.json antes de atualizar o PDF:', e.message);
      }

      current.pdfUrl = url;
      await writeJsonFile('content.json', current, 'CMS: atualizar cardápio oficial');
    }

    return json(res, 200, { ok: true, url });

  } catch (e) {
    console.error(e);
    return json(res, 500, { error: e.message || 'Falha no upload.' });
  }
};
