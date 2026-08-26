import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/database/prisma.service';

describe('Products Integration Tests (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  const testPassword = 'IntegrationPass123!';

  const testData: {
    organizationId?: string;
    roleId?: string;
    userEmail?: string;
    categoryId?: string;
    productId?: string;
    recipeId?: string;
    inventoryItemId?: string;
  } = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Organization-Id',
        'X-Location-Id',
        'X-Requested-With',
      ],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);

    await setupTestData();
    await authenticateTestUser();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe('GET /api/v1/products', () => {
    it('returns the catalog of products', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(
        response.body.some((item: any) => item.id === testData.productId),
      ).toBe(true);
    });

    it('includes required product fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const product = response.body.find(
        (item: any) => item.id === testData.productId,
      );

      expect(product).toBeDefined();
      expect(product).toHaveProperty('id', testData.productId);
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('categoryId', testData.categoryId);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('retrieves a specific product', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${testData.productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testData.productId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('categoryId', testData.categoryId);
    });

    it('returns 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('System Integration - Products & Recipes', () => {
    it('exposes recipe details when available', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/recipes?organization_id=${testData.organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.length > 0) {
        const recipe = response.body.find(
          (item: any) => item.product_id === testData.productId,
        );

        expect(recipe).toBeDefined();
        expect(recipe).toHaveProperty('ingredients');
        expect(Array.isArray(recipe.ingredients)).toBe(true);

        await request(app.getHttpServer())
          .get(`/api/v1/products/${recipe.product_id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
    });
  });

  describe('Categories Integration', () => {
    it('returns available categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(
        response.body.some((item: any) => item.id === testData.categoryId),
      ).toBe(true);
    });

    it('links products to their categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const product = response.body.find(
        (item: any) => item.id === testData.productId,
      );

      expect(product).toBeDefined();
      expect(product.categoryId).toBe(testData.categoryId);
      expect(product.category).toBeDefined();
    });
  });

  describe('Health & Connectivity', () => {
    it('responds to health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('exposes CORS headers for product endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'http://localhost:3001')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  async function setupTestData() {
    const suffix = Date.now().toString();

    const organization = await prisma.organization.create({
      data: {
        name: `Integration Org ${suffix}`,
        slug: `integration-org-${suffix}`,
        timezone: 'America/Mexico_City',
      },
    });

    const role = await prisma.role.create({
      data: {
        name: `INTEGRATION_ROLE_${suffix}`,
        // `code` es obligatorio desde la migración de roles a Prisma; es único
        // por organización, de ahí el sufijo.
        code: `integration_role_${suffix}`,
        description: 'Role for integration tests',
        scopes: ['products:read'],
      },
    });

    const hashedPassword = await bcrypt.hash(testPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: `integration.user.${suffix}@coffeeos.test`,
        password: hashedPassword,
        firstName: 'Integration',
        lastName: 'User',
        organizationId: organization.id,
        roleId: role.id,
        active: true,
      },
    });

    const category = await prisma.category.create({
      data: {
        organizationId: organization.id,
        name: `Integration Category ${suffix}`,
        sortOrder: 0,
        color: '#000000',
        icon: 'test',
      },
    });

    const product = await prisma.product.create({
      data: {
        organizationId: organization.id,
        categoryId: category.id,
        sku: `SKU-${suffix}`,
        name: 'Integration Espresso',
        description: 'Test product for integration suite',
        price: 45,
        cost: 20,
        tags: [],
        allowModifiers: true,
        trackInventory: false,
        active: true,
      },
    });

    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        organizationId: organization.id,
        code: `INV-${suffix}`,
        name: 'Integration Coffee Beans',
        unitOfMeasure: 'g',
        costPerUnit: 0.5,
        category: 'Ingredients',
        parLevel: 1000,
        reorderPoint: 200,
        active: true,
      },
    });

    const recipe = await prisma.recipe.create({
      data: {
        organizationId: organization.id,
        productId: product.id,
        name: 'Integration Espresso Recipe',
        description: 'Recipe for integration tests',
        yield: 1,
        prepTime: 120,
        active: true,
        ingredients: {
          create: [
            {
              inventoryItemId: inventoryItem.id,
              quantity: 18,
              unit: 'g',
              notes: 'Main ingredient',
              isCosted: true,
            },
          ],
        },
      },
    });

    testData.organizationId = organization.id;
    testData.roleId = role.id;
    testData.userEmail = user.email;
    testData.categoryId = category.id;
    testData.productId = product.id;
    testData.recipeId = recipe.id;
    testData.inventoryItemId = inventoryItem.id;
  }

  async function authenticateTestUser() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testData.userEmail,
        password: testPassword,
      })
      .expect(200);

    authToken = response.body.accessToken;
  }

  async function cleanupTestData() {
    if (!testData.organizationId) {
      return;
    }

    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: testData.recipeId },
    });

    await prisma.recipe.deleteMany({
      where: { id: testData.recipeId },
    });

    await prisma.inventoryItem.deleteMany({
      where: { id: testData.inventoryItemId },
    });

    await prisma.product.deleteMany({
      where: { id: testData.productId },
    });

    await prisma.category.deleteMany({
      where: { id: testData.categoryId },
    });

    await prisma.user.deleteMany({
      where: { email: testData.userEmail },
    });

    await prisma.role.deleteMany({
      where: { id: testData.roleId },
    });

    await prisma.organization.deleteMany({
      where: { id: testData.organizationId },
    });
  }
});
