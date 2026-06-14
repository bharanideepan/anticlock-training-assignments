import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('error_rate');
const customerListDuration = new Trend('customer_list_duration', true);
const searchDuration = new Trend('search_duration', true);

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TOKEN = __ENV.API_TOKEN || '';

const params = {
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
};

export const options = {
  scenarios: {
    // SC-003: Customer list with 10k records p95 < 3s
    customer_list: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      exec: 'customerList',
      tags: { scenario: 'customer_list' },
    },
    // SC-004: Search under 50 VUs p95 < 2s
    search: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '15s', target: 0 },
      ],
      exec: 'globalSearch',
      tags: { scenario: 'search' },
    },
    // SC-005: 100-VU ramp mixed reads error rate < 1%
    mixed_reads: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '0s', target: 0 },
      ],
      exec: 'mixedReads',
      tags: { scenario: 'mixed_reads' },
    },
  },
  thresholds: {
    'customer_list_duration{scenario:customer_list}': ['p(95)<3000'],
    'search_duration{scenario:search}': ['p(95)<2000'],
    'error_rate{scenario:mixed_reads}': ['rate<0.01'],
  },
};

export function customerList() {
  const res = http.get(`${BASE_URL}/customers?pageSize=50`, params);
  const ok = check(res, { 'customer list 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  customerListDuration.add(res.timings.duration);
  sleep(1);
}

export function globalSearch() {
  const terms = ['acme', 'test', 'corp', 'inc', 'john'];
  const term = terms[Math.floor(Math.random() * terms.length)];
  const res = http.get(`${BASE_URL}/search?q=${term}`, params);
  const ok = check(res, { 'search 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  searchDuration.add(res.timings.duration);
  sleep(0.5);
}

export function mixedReads() {
  const endpoints = [
    '/customers?pageSize=25',
    '/contacts?pageSize=25',
    '/opportunities?pageSize=25',
    '/tasks?pageSize=25',
    '/dashboard/metrics',
  ];
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`, params);
  const ok = check(res, { 'mixed read 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  sleep(0.3);
}
