'use strict';
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    msg: 'Serverless funcionando corretamente',
    hora: new Date().toISOString(),
    runtime: 'node ' + process.version,
    host: 'vercel',
  });
};
