/**
 * CoffeeOS Integration Test
 * Script para verificar la conexión entre frontend y backend
 */

import axios from 'axios';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface HealthCheck {
  status: string;
  info?: Record<string, any>;
  error?: Record<string, any>;
  details?: Record<string, any>;
}

async function testConnection() {
  console.log('🔍 CoffeeOS Integration Test\n');
  console.log(`API URL: ${API_URL}`);
  console.log('─'.repeat(50));

  try {
    // Test 1: Health Check
    console.log('\n1️⃣  Testing Health Endpoint...');
    const healthResponse = await axios.get<HealthCheck>(
      `${API_URL.replace('/api/v1', '')}/health`,
    );
    console.log('✅ Health check passed:', healthResponse.data.status);

    // Test 2: Products endpoint
    console.log('\n2️⃣  Testing Products Endpoint...');
    try {
      const productsResponse = await axios.get(`${API_URL}/products`);
      console.log(`✅ Products endpoint accessible`);
      console.log(`   Found ${productsResponse.data?.length || 0} products`);
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('⚠️  Products endpoint requires authentication (expected)');
      } else {
        console.log('❌ Products endpoint error:', error.message);
      }
    }

    // Test 3: Categories endpoint
    console.log('\n3️⃣  Testing Categories Endpoint...');
    try {
      const categoriesResponse = await axios.get(`${API_URL}/categories`);
      console.log(`✅ Categories endpoint accessible`);
      console.log(
        `   Found ${categoriesResponse.data?.length || 0} categories`,
      );
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log(
          '⚠️  Categories endpoint requires authentication (expected)',
        );
      } else {
        console.log('❌ Categories endpoint error:', error.message);
      }
    }

    // Test 4: Auth endpoint
    console.log('\n4️⃣  Testing Auth Endpoint...');
    try {
      // Se manda a proposito una contrasena incorrecta: lo que se comprueba es
      // que el endpoint RESPONDA, no que deje entrar. Que conteste 200 seria
      // justamente el problema, asi que se dice.
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword',
      });
      console.log(
        `⚠️  Auth endpoint aceptó credenciales incorrectas (HTTP ${res.status})`,
      );
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        console.log(
          '✅ Auth endpoint accessible (credentials incorrect as expected)',
        );
      } else {
        console.log('❌ Auth endpoint error:', error.message);
      }
    }

    console.log('\n' + '─'.repeat(50));
    console.log('✅ Backend is reachable and responding');
    console.log('\n💡 Next steps:');
    console.log('   1. Create a test user in the database');
    console.log('   2. Add test products and categories');
    console.log('   3. Run frontend with: npm run dev');
    console.log('   4. Test full integration in browser\n');
  } catch (error: any) {
    console.log('\n' + '─'.repeat(50));
    console.log('❌ Backend connection failed');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 Make sure:');
    console.log('   1. Backend is running: cd apps/api && npm run dev');
    console.log('   2. Port 4000 is not blocked');
    console.log('   3. .env.local has correct API_URL\n');
  }
}

testConnection();
