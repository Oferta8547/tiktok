'use strict';
const { orderStatus, CORS } = require('../../api/_lib/core.js');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const q = event.queryStringParameters || {};
  try {
    const out = await orderStatus(q.id, q);
    return { statusCode: out.status, headers: CORS, body: JSON.stringify(out.body) };
  } catch (e) {
    console.error('[orders_status]', e);
    return { statusCode: 200, headers: CORS, body: JSON.stringify([{ status: 'pending' }]) };
  }
};
