import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 200 },   // Ramp up to 200 users
    { duration: '10s', target: 1000 }, // Spike to 1,000 concurrent users
    { duration: '15s', target: 2000 }, // High load: 2,000 users
    { duration: '5s', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    // 99% of requests should be below 50ms
    http_req_duration: ['p(99)<50', 'p(95)<20'],
    // Error rate must be less than 0.1%
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.SERVER_URL || 'http://127.0.0.1:4000';

export default function () {
  // 1. Script Serving Request
  const res = http.get(`${BASE_URL}/run/web-dev`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'cache header is HIT': (r) => r.headers['X-Cache'] === 'HIT',
    'has bash header': (r) => r.body.includes('#!/usr/bin/env bash'),
  });

  sleep(0.05); // Tiny user pause
}
