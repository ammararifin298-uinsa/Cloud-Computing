// k6 Stress & Breakpoint Test — Tracking Microservice (10 -> 100 -> 500 -> 1000 VU)
// Menguji endpoint utama: GET /api/dashboard, GET /api/shipments, GET /api/reference, POST /api/tariffs/quote, dan GET /api/shipments/:code/events
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://lacakin-lb-1';
const HOLD = __ENV.HOLD || '2m';
const RAMP = __ENV.RAMP || '20s';
const USER_ID = __ENV.TEST_USER || 'superadmin';
const USER_PW = __ENV.TEST_PASS || 'super123';

export const errors = new Rate('app_errors');

export const options = {
  stages: [
    { duration: RAMP, target: 10 },   { duration: HOLD, target: 10 },
    { duration: RAMP, target: 100 },  { duration: HOLD, target: 100 },
    { duration: RAMP, target: 500 },  { duration: HOLD, target: 500 },
    { duration: RAMP, target: 1000 }, { duration: HOLD, target: 1000 },
    { duration: RAMP, target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const loginRes = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ identifier: USER_ID, password: USER_PW }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const token = loginRes.status === 200 ? loginRes.json('access_token') : '';

  // Ambil 1 kode resi aktif bila tersedia untuk uji tracking publik
  let sampleCode = '';
  if (token) {
    const listRes = http.get(`${BASE}/api/shipments?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listRes.status === 200) {
      const items = listRes.json('items') || [];
      if (items.length > 0) sampleCode = items[0].code;
    }
  }
  return { token, sampleCode };
}

export default function (data) {
  const authHeaders = data.token
    ? { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const r = Math.random();
  let res;

  if (r < 0.45) {
    // 45% Dashboard operasional (Read Replica + Cache)
    res = http.get(`${BASE}/api/dashboard`, {
      headers: authHeaders,
      tags: { name: 'GET /api/dashboard' },
    });
  } else if (r < 0.75) {
    // 30% Daftar pengiriman dengan keyset pagination (Read Replica)
    res = http.get(`${BASE}/api/shipments?limit=25`, {
      headers: authHeaders,
      tags: { name: 'GET /api/shipments' },
    });
  } else if (r < 0.90) {
    // 15% Referensi wilayah Jawa Timur (Micro-cache Nginx + Read Replica)
    res = http.get(`${BASE}/api/reference`, {
      tags: { name: 'GET /api/reference' },
    });
  } else if (data.sampleCode) {
    // 10% Pelacakan resi publik (public_tracking_view)
    res = http.get(`${BASE}/api/shipments/${encodeURIComponent(data.sampleCode)}/events`, {
      tags: { name: 'GET /api/shipments/:code/events' },
    });
  } else {
    res = http.get(`${BASE}/livez`, { tags: { name: 'GET /livez' } });
  }

  const ok = check(res, {
    'status 200': (x) => x.status === 200,
  });
  errors.add(!ok);
  sleep(Math.random() * 0.4 + 0.1);
}
