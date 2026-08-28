import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  // El adaptador va explícito. Sin él, Nest lo carga por su cuenta con un
  // `require('@nestjs/platform-express')` resuelto desde donde vive
  // `@nestjs/core`, que en un monorepo depende de dónde acabe hoisteado el
  // paquete. Al rehacerse el árbol de dependencias dejó de estar en la raíz y
  // la API no volvió a arrancar: «No driver (HTTP) has been selected».
  //
  // Lo llamativo es que las 62 suites unitarias y los 80 e2e siguieron pasando,
  // porque montan la aplicación con `Test.createTestingModule()` y no por aquí.
  // Nada del arranque real estaba cubierto: se descubrió abriendo el navegador.
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
  );
  const configService = app.get(ConfigService);

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  // CORS - Configuración explícita
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

  console.log('✅ CORS enabled for:', [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ]);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('CoffeeOS API')
    .setDescription('Multi-tenant coffee shop management platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('pos', 'Point of Sale operations')
    .addTag('inventory', 'Inventory management')
    .addTag('recipes', 'Recipe management')
    .addTag('quality', 'Quality control and checklists')
    .addTag('crm', 'Customer relationship management')
    .addTag('finance', 'Financial operations')
    .addTag('hr', 'Human resources')
    .addTag('analytics', 'Analytics and reporting')
    .addTag('integrations', 'External integrations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'CoffeeOS API Documentation',
  });

  const port = configService.get('PORT') || 4000;
  await app.listen(port);

  console.log(`🚀 CoffeeOS API running on: http://localhost:${port}`);
  console.log(`📚 Documentation: http://localhost:${port}/docs`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
