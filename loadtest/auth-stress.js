// k6 Per-API Stress & Rate-Limit Verification — Auth Microservice
// Membuktikan:
//   1. Throughput verifikasi profil JWT (/api/auth/me) & pengaturan publik (/api/settings/public)
//   2. Proteksi Rate Limiting Nginx (HTTP 429) saat endpoint /api/auth/login dibanjiri request
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://lacakin-lb-1';
const HOLD = __ENV.HOLD || '10s';
const RAMP = __ENV.RAMP || '5s';
const USER_ID = __ENV.TEST_USER || 'superadmin';
const USER_PW = __ENV.TEST_PASS || 'super123';

export const authErrors = new Rate('auth_unexpected_errors');
export const rateLimited429 = new Counter('auth_rate_limited_429');

export const options = {
  stages: [
    { duration: RAMP, target: 10 },   { duration: HOLD, target: 10 },
    { duration: RAMP, target: 100 },  { duration: HOLD, target: 100 },
    { duration: RAMP, target: 500 },  { duration: HOLD, target: 500 },
    { duration: RAMP, target: 0 },
  ],
  thresholds: {
    auth_unexpected_errors: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ identifier: USER_ID, password: USER_PW }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return { token: res.status === 200 ? res.json('access_token') : '' };
}

export default function (data) {
  const r = Math.random();
  let res;

  if (r < 0.65 && data.token) {
    res = http.get(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
      tags: { name: 'GET /api/auth/me' },
    });
  } else if (r < 0.90) {
    res = http.get(`${BASE}/api/settings/public`, {
      tags: { name: 'GET /api/settings/public' },
    });
  } else {
    // 10% simulasi percobaan login beruntun untuk menguji aktivasi Rate Limit 429
    res = http.post(
      `${BASE}/api/auth/login`,
      JSON.stringify({ identifier: USER_ID, password: USER_PW }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/auth/login' },
      }
    );
    if (res.status === 429) {
      rateLimited429.add(1);
    }
  }

  // Status 200 (sukses) dan 429 (ditahan rate limiter Nginx) keduanya adalah respons valid
  const valid = check(res, {
    'status 200 or 429 rate-limited': (x) => x.status === 200 || x.status === 429,
  });
  authErrors.add(!valid);
  sleep(Math.random() * 0.3 + 0.05);
}
