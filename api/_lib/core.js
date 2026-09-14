'use strict';

/**
 * Núcleo compartilhado — porte 1:1 de checkout-create-pix.php e orders_status.php
 * Roda igual em Vercel (/api) e Netlify (/netlify/functions).
 * Sem filesystem, sem PHP, sem estado local obrigatório.
 */

const IRONPAY_API_TOKEN = process.env.IRONPAY_API_TOKEN || 'KaSgW7NzhNJoqmls1E55wAIJLHRSmXBlehcif6VudWo6xFhvdpgtZh5tJmXV';
const IRONPAY_PRODUCT_HASH = process.env.IRONPAY_PRODUCT_HASH || 'aygjmmenrb';
const IRONPAY_OFFER_HASH = process.env.IRONPAY_OFFER_HASH || 'n5gw5vcbqx';
const IRONPAY_BASE_URL = process.env.IRONPAY_BASE_URL || 'https://api.ironpayapp.com.br/api/public/v1';

const UTMIFY_API_TOKEN = process.env.UTMIFY_API_TOKEN || 'CDjUDBS3yT2Rz844h2NSB5sORwykC2yBBkjX';
const UTMIFY_PLATFORM = process.env.UTMIFY_PLATFORM || 'IronPay';
const UTMIFY_URL = 'https://api.utmify.com.br/api-credentials/orders';

// Lock opcional via Upstash Redis (REST). Se não configurado, usa memória.
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
};

// ---------------------------------------------------------------- helpers

const onlyDigits = (v) => String(v == null ? '' : v).replace(/\D/g, '');

function toCents(val) {
  const str = String(val == null ? 0 : val);
  if (str.indexOf('.') !== -1) return Math.round(parseFloat(str) * 100) || 0;
  return parseInt(str, 10) || 0;
}

function utcNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function fakeCpf() {
  const n = [];
  for (let i = 0; i < 9; i++) n.push(Math.floor(Math.random() * 10));
  let d1 = 11 - ((n[8] * 2 + n[7] * 3 + n[6] * 4 + n[5] * 5 + n[4] * 6 + n[3] * 7 + n[2] * 8 + n[1] * 9 + n[0] * 10) % 11);
  if (d1 >= 10) d1 = 0;
  let d2 = 11 - ((d1 * 2 + n[8] * 3 + n[7] * 4 + n[6] * 5 + n[5] * 6 + n[4] * 7 + n[3] * 8 + n[2] * 9 + n[1] * 10 + n[0] * 11) % 11);
  if (d2 >= 10) d2 = 0;
  return n.join('') + d1 + d2;
}

async function fetchJson(url, options, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 20000);
  try {
    const res = await fetch(url, Object.assign({}, options, { signal: ctrl.signal }));
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) { /* resposta não-JSON */ }
    return { ok: res.ok, status: res.status, json, text };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------- lock "paid"

const memLock = new Set();

async function alreadySentPaid(orderId) {
  if (memLock.has(orderId)) return true;
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      // SET key 1 NX EX 604800 -> retorna null se já existia
      const r = await fetchJson(
        `${UPSTASH_URL}/set/utmify_paid_${encodeURIComponent(orderId)}/1?NX=true&EX=604800`,
        { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } },
        5000
      );
      if (r.json && r.json.result === null) { memLock.add(orderId); return true; }
      memLock.add(orderId);
      return false;
    } catch (_) { /* cai para memória */ }
  }
  memLock.add(orderId);
  return false;
}

// ---------------------------------------------------------------- UTMify

function buildProducts(items, amount) {
  const products = (items || []).map((item, i) => {
    const price = toCents(item && item.price);
    return {
      id: item && item.id != null ? String(item.id) : `produto-${i + 1}`,
      name: (item && item.name) || 'Produto',
      planId: null,
      planName: null,
      quantity: parseInt((item && item.quantity) || 1, 10) || 1,
      priceInCents: price > 0 ? price : amount,
    };
  });
  if (!products.length) {
    products.push({ id: 'produto-1', name: 'Pedido', planId: null, planName: null, quantity: 1, priceInCents: amount });
  }
  return products;
}

async function sendUtmify(payload) {
  try {
    const r = await fetchJson(UTMIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-token': UTMIFY_API_TOKEN,
      },
      body: JSON.stringify(payload),
    }, 8000);
    // Diagnostico: 401/403 = token errado ou de outra workspace.
    if (!r.ok) {
      console.error('[UTMify] HTTP ' + r.status + ' status=' + payload.status +
        ' order=' + payload.orderId + ' resp=' + String(r.text || '').slice(0, 400));
    } else {
      console.log('[UTMify] OK ' + payload.status + ' order=' + payload.orderId +
        ' utm_source=' + (payload.trackingParameters && payload.trackingParameters.utm_source));
    }
    return { ok: r.ok, httpStatus: r.status };
  } catch (e) {
    console.error('[UTMify] falhou:', e && e.message);
    return { ok: false, httpStatus: 0, error: String(e && e.message) };
  }
}

function utmifyPayload({ orderId, status, customer, products, utm, amount, createdAt, approvedDate }) {
  const u = utm || {};
  return {
    orderId: String(orderId),
    platform: UTMIFY_PLATFORM,
    paymentMethod: 'pix',
    status,
    createdAt: createdAt || utcNow(),
    approvedDate: approvedDate || null,
    refundedAt: null,
    customer: {
      name: (customer && customer.name) || '',
      email: (customer && customer.email) || '',
      phone: (customer && onlyDigits(customer.phone)) || null,
      document: (customer && onlyDigits(customer.document)) || null,
      country: 'BR',
    },
    products,
    trackingParameters: {
      src: u.src || null,
      sck: u.sck || null,
      utm_source: u.utm_source || null,
      utm_campaign: u.utm_campaign || null,
      utm_medium: u.utm_medium || null,
      utm_content: u.utm_content || null,
      utm_term: u.utm_term || null,
    },
    commission: {
      totalPriceInCents: amount,
      gatewayFeeInCents: 0,
      userCommissionInCents: amount,
    },
    isTest: false,
  };
}

// ---------------------------------------------------------------- CREATE PIX

async function createPix(body) {
  if (!body || typeof body !== 'object') {
    return { status: 400, body: { success: false, error: 'Invalid JSON body' } };
  }

  const customer = body.customer || {};
  const items = body.items || [];
  const shippingAddr = body.shippingAddress || {};
  const utm = body.utm || {};

  const amount = toCents(body.amount);
  if (amount <= 0) {
    return { status: 400, body: { success: false, error: 'Amount invalido' } };
  }

  let cart = items.map((item) => {
    const price = toCents(item && item.price);
    return {
      product_hash: IRONPAY_PRODUCT_HASH,
      title: (item && item.name) || 'Produto',
      cover: null,
      price: price > 0 ? price : amount,
      quantity: parseInt((item && item.quantity) || 1, 10) || 1,
      operation_type: 1,
      tangible: false,
    };
  });
  if (!cart.length) {
    cart = [{ product_hash: IRONPAY_PRODUCT_HASH, title: 'Pedido', cover: null, price: amount, quantity: 1, operation_type: 1, tangible: false }];
  }

  const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '') || '';

  const streetName = pick(shippingAddr.address, shippingAddr.street, customer.street_name);
  const zipCode = pick(shippingAddr.cep, shippingAddr.zip_code, customer.zip_code);
  const neighborhood = pick(shippingAddr.neighborhood, customer.neighborhood);
  const city = pick(shippingAddr.city, customer.city);
  const state = pick(shippingAddr.state, customer.state);
  const number = pick(shippingAddr.number, customer.number) || 'S/N';
  const complement = pick(shippingAddr.complement, customer.complement);

  let document = pick(customer.cpf, customer.document);
  if (!onlyDigits(document)) document = fakeCpf();
  const phone = pick(customer.phone, customer.phone_number);

  const payload = {
    amount,
    offer_hash: IRONPAY_OFFER_HASH,
    payment_method: 'pix',
    customer: {
      name: customer.name || '',
      email: customer.email || '',
      phone_number: onlyDigits(phone),
      document: onlyDigits(document),
      street_name: streetName,
      number,
      complement,
      neighborhood,
      city,
      state,
      zip_code: onlyDigits(zipCode),
    },
    cart,
    expire_in_days: 1,
    transaction_origin: 'api',
    tracking: {
      src: utm.src || '',
      utm_source: utm.utm_source || '',
      utm_medium: utm.utm_medium || '',
      utm_campaign: utm.utm_campaign || '',
      utm_term: utm.utm_term || '',
      utm_content: utm.utm_content || '',
    },
  };

  let res;
  try {
    res = await fetchJson(
      `${IRONPAY_BASE_URL}/transactions?api_token=${IRONPAY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      },
      25000
    );
  } catch (e) {
    return { status: 500, body: { success: false, error: 'Erro de conexao: ' + (e && e.message) } };
  }

  const data = res.json;
  if (res.status !== 201 || !data) {
    return {
      status: 502,
      body: {
        success: false,
        error: (data && data.message) || 'Erro ao criar transacao PIX',
        debug_code: res.status,
        debug_raw: res.text,
      },
    };
  }

  const transHash = data.hash || '';
  const pixCopyPaste = (data.pix && data.pix.pix_qr_code) || '';
  let pixQrCode = '';
  if (data.pix && data.pix.qr_code_base64) {
    pixQrCode = 'data:image/png;base64,' + data.pix.qr_code_base64;
  } else if (pixCopyPaste) {
    pixQrCode = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(pixCopyPaste);
  }

  const responseBody = {
    success: true,
    qrCode: pixQrCode,
    copyPaste: pixCopyPaste,
    externalId: transHash,
    orderId: transHash,
    gatewayName: 'ironpay',
  };

  // UTMify waiting_payment — em serverless precisa ser await (não existe background)
  if (transHash) {
    const up = utmifyPayload({
      orderId: transHash,
      status: 'waiting_payment',
      customer: { name: customer.name || '', email: customer.email || '', phone, document },
      products: buildProducts(items, amount),
      utm,
      amount,
      createdAt: utcNow(),
    });
    const ures = await sendUtmify(up);
    responseBody.utmify = {
      sent: !!(ures && ures.ok),
      httpStatus: (ures && ures.httpStatus) || 0,
      utm_source: up.trackingParameters.utm_source,
      utm_campaign: up.trackingParameters.utm_campaign,
    };
  }

  return { status: 200, body: responseBody };
}

// ---------------------------------------------------------------- STATUS

const STATUS_MAP = {
  waiting_payment: 'pending',
  paid: 'paid',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  refunded: 'cancelled',
  expired: 'cancelled',
  chargedback: 'cancelled',
};

async function orderStatus(rawId, query) {
  let id = String(rawId || '');
  if (id.startsWith('eq.')) id = id.slice(3);
  id = id.replace(/[^a-zA-Z0-9\-_]/g, '');
  if (!id) return { status: 400, body: [{ status: 'pending' }] };

  let res;
  try {
    res = await fetchJson(
      `${IRONPAY_BASE_URL}/transactions/${id}?api_token=${IRONPAY_API_TOKEN}`,
      { headers: { Accept: 'application/json' } },
      12000
    );
  } catch (_) {
    return { status: 200, body: [{ status: 'pending' }] };
  }

  if (res.status !== 200 || !res.json) return { status: 200, body: [{ status: 'pending' }] };

  const data = res.json;
  const gwStatus = data.payment_status || 'waiting_payment';
  const status = STATUS_MAP[gwStatus] || 'pending';

  if (gwStatus === 'paid') {
    const done = await alreadySentPaid(id);
    if (!done) {
      // Reconstrói o payload direto da transação do gateway (sem arquivo local)
      const q = query || {};
      const track = data.tracking || {};
      const utm = {
        src: q.src || track.src || null,
        sck: q.sck || track.sck || null,
        utm_source: q.utm_source || track.utm_source || null,
        utm_medium: q.utm_medium || track.utm_medium || null,
        utm_campaign: q.utm_campaign || track.utm_campaign || null,
        utm_content: q.utm_content || track.utm_content || null,
        utm_term: q.utm_term || track.utm_term || null,
      };
      const c = data.customer || {};
      const amount = parseInt(data.amount, 10) || 0;
      const products = buildProducts(
        (data.cart || []).map((it) => ({
          id: it.product_hash,
          name: it.title,
          quantity: it.quantity,
          price: it.price,
        })),
        amount
      );
      const createdAt = data.created_at
        ? String(data.created_at).replace('T', ' ').slice(0, 19)
        : utcNow();

      await sendUtmify(utmifyPayload({
        orderId: id,
        status: 'paid',
        customer: { name: c.name || '', email: c.email || '', phone: c.phone_number, document: c.document },
        products,
        utm,
        amount,
        createdAt,
        approvedDate: utcNow(),
      }));
    }
  }

  return { status: 200, body: [{ status }] };
}

module.exports = { createPix, orderStatus, CORS };
