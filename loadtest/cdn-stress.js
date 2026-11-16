import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errors = new Rate('cdn_errors');
const BASE = __ENV.BASE_URL || 'http://lacakin-lb-1';
const HOLD = __ENV.HOLD || '10s';
const RAMP = __ENV.RAMP || '5s';

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

const ASSETS = [
  '/static/app.css',
  '/static/app.js',
  '/static/logo.svg',
  '/lacak',
];

export default function () {
  const path = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const res = http.get(`${BASE}${path}`, { tags: { name: `GET ${path}` } });
  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'body non-empty': (r) => r.body && r.body.length > 0,
  });
  errors.add(!ok);
  sleep(Math.random() * 0.2 + 0.05);
}

