// k6 Stress Test — Edge CDN (React Static Bundle + MinIO Media Proxy Cache)
// Menguji performa pengiriman aset statis dan gambar bukti pengiriman dari lacakin-cdn (10 -> 100 -> 500 -> 1000 VU)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const errors = new Rate('cdn_errors');
const cacheHits = new Counter('cdn_cache_hits');
const BASE = __ENV.BASE_URL || 'http://lacakin-lb-1';
const HOLD = __ENV.HOLD || '10s';
const RAMP = __ENV.RAMP || '5s';
const USER_ID = __ENV.TEST_USER || 'superadmin';
const USER_PW = __ENV.TEST_PASS || 'super123';

// 1x1 Valid PNG base64 untuk pengujian upload ke MinIO -> cache di Edge CDN
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

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
    http_req_duration: ['p(95)<500'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  let mediaUrl = '/logo.svg';
  const loginRes = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ identifier: USER_ID, password: USER_PW }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (loginRes.status === 200) {
    const token = loginRes.json('access_token');
    const upRes = http.post(
      `${BASE}/api/uploads`,
      JSON.stringify({ shipment_code: 'BENCH-CDN', content_base64: TINY_PNG_B64 }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (upRes.status === 201) {
      mediaUrl = upRes.json('url') || mediaUrl;
      // Warm cache once (MISS -> HIT)
      http.get(`${BASE}${mediaUrl}`);
    }
  }
  return { mediaUrl };
}

const STATIC_PATHS = ['/logo.svg', '/lacak', '/tarif', '/index.html'];

export default function (data) {
  const paths = data?.mediaUrl ? [...STATIC_PATHS, data.mediaUrl] : STATIC_PATHS;
  const path = paths[Math.floor(Math.random() * paths.length)];
  const res = http.get(`${BASE}${path}`, { tags: { name: `GET ${path}` } });

  if ((res.headers['X-Cache-Status'] || '').includes('HIT')) {
    cacheHits.add(1);
  }

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'body non-empty': (r) => r.body && r.body.length > 0,
  });
  errors.add(!ok);
  sleep(Math.random() * 0.2 + 0.05);
}
