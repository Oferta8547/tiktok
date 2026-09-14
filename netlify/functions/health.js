'use strict';
exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify({
      ok: true,
      msg: 'Serverless funcionando corretamente',
      hora: new Date().toISOString(),
      runtime: 'node ' + process.version,
      host: 'netlify',
    }),
  };
};
