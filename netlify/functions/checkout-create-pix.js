'use strict';
const { createPix, CORS } = require('../../api/_lib/core.js');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  let body = null;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '');
    body = JSON.parse(raw);
  } catch (_) { body = null; }

  if (!body) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, error: 'Invalid JSON body' }) };
  }

  try {
    const out = await createPix(body);
    return { statusCode: out.status, headers: CORS, body: JSON.stringify(out.body) };
  } catch (e) {
    console.error('[create-pix]', e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, error: 'Erro interno: ' + (e && e.message) }) };
  }
};
