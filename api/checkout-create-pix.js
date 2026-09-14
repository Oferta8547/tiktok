'use strict';
const { createPix, CORS } = require('./_lib/core.js');

module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = null; } }
  if (!body) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (_) { body = null; }
  }
  if (!body) return res.status(400).json({ success: false, error: 'Invalid JSON body' });

  try {
    const out = await createPix(body);
    return res.status(out.status).json(out.body);
  } catch (e) {
    console.error('[create-pix]', e);
    return res.status(500).json({ success: false, error: 'Erro interno: ' + (e && e.message) });
  }
};
