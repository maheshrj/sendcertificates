import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failures
  },
};
const BASE_URL = 'http://localhost:3000';
export default function () {
  const res = http.get(`${BASE_URL}/api/health`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'status is healthy': (r) => {
      try {
        return JSON.parse(r.body).status === 'healthy';
      } catch {
        return false;
      }
    },
  });
  sleep(1);
}
