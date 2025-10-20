import { test, expect } from '@playwright/test';

test.describe('Health Check Endpoints', () => {
  const API_URL = process.env.API_URL || 'http://localhost:4000';

  test('GET /health returns 200', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/health`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });

  test('GET /health/ready returns 200', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/health/ready`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ready');
    expect(data).toHaveProperty('timestamp');
  });

  test('GET /health/live returns 200', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/health/live`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'alive');
    expect(data).toHaveProperty('timestamp');
  });

  test('health endpoints return valid JSON', async ({ request }) => {
    const endpoints = ['/health', '/health/ready', '/health/live'];
    
    for (const endpoint of endpoints) {
      const response = await request.get(`${API_URL}/api/v1${endpoint}`);
      const contentType = response.headers()['content-type'];
      
      expect(contentType).toContain('application/json');
    }
  });

  test('health timestamp is recent', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/health/live`);
    const data = await response.json();
    
    const timestamp = new Date(data.timestamp).getTime();
    const now = Date.now();
    const diff = now - timestamp;
    
    // Timestamp should be within last 5 seconds
    expect(diff).toBeLessThan(5000);
  });
});
