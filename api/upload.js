const { PDFDocument } = require('pdf-lib');
const {
  json,
  parseBody,
  verifyPassword,
  isConfigured,
  readJsonFile,
  writeJsonFile,
  writeBinaryFile
} = require('../lib/cms');

function safeName(name = 'arquivo') {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '') || 'arquivo';
}

async function normalizePdf(buffer) {
  try {
    const pdf = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
      throwOnInvalidObject: false,
      updateMetadata: false
    });

    const pageCount = pdf.getPageCount();
    if (!pageCount) throw new Error('PDF sem páginas.');

    const bytes = await pdf.save({
      useObjectStreams: false,
      addDefaultPage: false,
      updateFieldAppearances: false
    });

    const normalized = Buffer.from(bytes);

    if (normalized.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error('Falha ao normalizar o PDF.');
    }

    return { buffer: normalized, pageCount };
  } catch (err) {
    const message = String(err?.message || 'PDF inválido.');

    if (/encrypted|password/i.test(message)) {
      throw new Error('O PDF está protegido por senha. Envie uma versão sem proteção.');
    }

    throw new Error(
      'O PDF está corrompido ou possui estrutura inválida. Exporte-o novamente como PDF e tente de novo.'
    );
  }
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

    const folder = ['hero', 'story', 'experience', 'gallery', 'menu'].includes(kind)
      ? kind
      : 'uploads';

    const name = kind === 'menu'
      ? 'cardapio-nonna-mery.pdf'
      : `${Date.now()}-${safeName(filename)}`;

    const path = `assets/${folder}/${name}`;
    let buffer = Buffer.from(contentBase64, 'base64');

    if (!buffer.length) {
      return json(res, 400, { error: 'Arquivo inválido.' });
    }

    if (buffer.length > 4 * 1024 * 1024) {
      return json(res, 413, { error: 'Arquivo muito grande. Use no máximo 4 MB.' });
    }

    let pageCount = null;

    if (kind === 'menu') {
      if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        return json(res, 400, { error: 'O arquivo selecionado não é um PDF válido.' });
      }

      const normalized = await normalizePdf(buffer);
      buffer = normalized.buffer;
      pageCount = normalized.pageCount;
    }

    await writeBinaryFile(path, buffer, `CMS: atualizar ${folder}`);

    const version = Date.now();

    const url = kind === 'menu'
      ? `/api/menu?v=${version}`
      : `/assets/${folder}/${name}?v=${version}`;

    if (kind === 'menu') {
      let current = {};

      try {
        const result = await readJsonFile('content.json');
        current = result?.data || {};
      } catch (e) {
        console.warn(
          'Não foi possível ler content.json antes de atualizar o PDF:',
          e.message
        );
      }

      current.pdfUrl = url;
      await writeJsonFile(
        'content.json',
        current,
        'CMS: atualizar cardápio oficial'
      );
    }

    return json(res, 200, {
      ok: true,
      url,
      normalized: kind === 'menu',
      pageCount
    });
  } catch (e) {
    console.error(e);
    return json(res, 500, {
      error: e.message || 'Falha no upload.'
    });
  }
};
