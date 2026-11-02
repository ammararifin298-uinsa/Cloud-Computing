// k6 stress test: 10 -> 100 -> 500 -> 1000 VU, tiap tahap ditahan HOLD.
// Env: BASE_URL (default http://lb), HOLD (default 2m), RAMP (default 20s)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://lb';
const HOLD = __ENV.HOLD || '2m';
const RAMP = __ENV.RAMP || '20s';

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

const STATUSES = ['DITERIMA', 'DISIMPAN', 'DALAM_PERJALANAN', 'DIKIRIM', 'SELESAI'];
const params = { headers: { 'Content-Type': 'application/json' } };

export default function () {
  const r = Math.random();
  let res;
  if (r < 0.5) {            // 50% baca dashboard (query agregasi)
    res = http.get(`${BASE}/api/dashboard`, { tags: { name: 'GET /api/dashboard' } });
  } else if (r < 0.8) {     // 30% tulis event checkpoint
    const body = JSON.stringify({
      shipment_code: `LOAD-${__VU % 200}`,
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      location: 'Gudang Surabaya',
    });
    res = http.post(`${BASE}/api/events`, body, { ...params, tags: { name: 'POST /api/events' } });
  } else {                  // 20% list pengiriman
    res = http.get(`${BASE}/api/shipments`, { tags: { name: 'GET /api/shipments' } });
  }
  const ok = check(res, { 'status 2xx': (x) => x.status >= 200 && x.status < 300 });
  errors.add(!ok);
  sleep(Math.random() * 0.5 + 0.1);
}
