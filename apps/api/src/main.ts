import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());
  
  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

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

bootstrap();