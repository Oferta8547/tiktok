'use strict';
const { orderStatus, CORS } = require('./_lib/core.js');

module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = req.query || {};
  try {
    const out = await orderStatus(q.id, q);
    return res.status(out.status).json(out.body);
  } catch (e) {
    console.error('[orders_status]', e);
    return res.status(200).json([{ status: 'pending' }]);
  }
};
