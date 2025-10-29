const ALLOWED_ORIGIN = 'https://dashboard-internal.privacy-safe.io';
const LEMLIST_BASE = 'https://api.lemlist.com/api';

export async function handler(event) {
  const origin = event.headers.origin || '';
  const allowOrigin = origin === ALLOWED_ORIGIN ? origin : 'null';

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Reconstruit le chemin cible (après /api/lemlist/)
  const path = event.path.replace(/^\/api\/lemlist\/?/, '');
  const qs = event.rawQuery ? `?${event.rawQuery}` : '';
  const upstreamUrl = `${LEMLIST_BASE}/${path}${qs}`;

  const apiKey = process.env.LEMLIST_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': allowOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'LEMLIST_API_KEY manquant' }),
    };
  }

  const auth = 'Basic ' + Buffer.from(':' + apiKey).toString('base64');

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    const text = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Vary': 'Origin',
        'Cache-Control': 'public, max-age=60',
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
      },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': allowOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e?.message || 'Bad gateway' }),
    };
  }
}
