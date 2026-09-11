module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      return res.end('Método não permitido.');
    }

    const rawUrl =
      'https://raw.githubusercontent.com/Thomastigre-ux/nonna-mery-trattoria/main/assets/menu/cardapio-nonna-mery.pdf';

    const upstream = await fetch(rawUrl, { cache: 'no-store' });

    if (!upstream.ok) {
      res.statusCode = upstream.status || 502;
      return res.end('Cardápio indisponível.');
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());

    if (!bytes.length || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
      res.statusCode = 502;
      return res.end('Arquivo de cardápio inválido.');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="cardapio-nonna-mery.pdf"');
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method === 'HEAD') return res.end();
    return res.end(bytes);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    return res.end('Falha ao abrir o cardápio.');
  }
};
