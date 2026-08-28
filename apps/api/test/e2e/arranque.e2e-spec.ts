import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * Que la aplicación se pueda construir por el mismo camino que `main.ts`.
 *
 * El resto de la suite monta la aplicación con `Test.createTestingModule()`, y
 * `@nestjs/testing` trae `@nestjs/platform-express` como dependencia propia y lo
 * importa de forma estática. Por eso, cuando el paquete dejó de estar donde
 * `@nestjs/core` lo busca al arrancar de verdad, las 62 suites unitarias y los
 * 80 e2e siguieron en verde mientras la API no levantaba:
 *
 *   ERROR [PackageLoader] No driver (HTTP) has been selected.
 *
 * Nada cubría el arranque real. Esto sí: usa `NestFactory` directamente, sin
 * pasar por `@nestjs/testing`, que es lo que hace el binario en producción.
 */
describe('Arranque de la aplicación (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(),
      { logger: false },
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  it('se construye y responde por HTTP', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('tiene un adaptador HTTP seleccionado', () => {
    // Es justamente lo que faltaba: sin driver, `NestFactory.create` construye
    // el contexto pero no hay servidor que escuche.
    expect(app.getHttpAdapter()).toBeDefined();
    expect(app.getHttpAdapter().getType()).toBe('express');
  });
});
