import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { TenantGuard } from '../tenant.guard';

/**
 * El guard no tenia ningun test, y por ahi se colo una fuga entre
 * organizaciones que no era de logica sino de ortografia: buscaba
 * `organizationId` y `organization_id`, y cinco rutas del POS declaran el
 * parametro como `orgId`.
 *
 * Comprobado contra la API en marcha antes de arreglarlo, con el token de una
 * organizacion y el id de otra en el path:
 *
 *   GET /waste/stats/:organization_id      -> 403
 *   GET /pos/stats/daily/:orgId            -> 200  (corte de caja ajeno)
 *   GET /pos/orders/organization/:orgId/today -> 200  (tickets ajenos)
 *
 * Lo unico que separaba el 403 del 200 era como estaba escrito el parametro.
 */
describe('TenantGuard', () => {
  const guard = new TenantGuard(new Reflector());

  // El Reflector lee metadatos del handler y de la clase: tienen que ser
  // objetos reales aunque no lleven ninguno.
  const handler = function handlerDePrueba() {};
  class ControladorDePrueba {}

  /** Contexto minimo con la superficie que mira el guard. */
  function contexto(request: any): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => handler,
      getClass: () => ControladorDePrueba,
    } as unknown as ExecutionContext;
  }

  const usuario = { organizationId: 'org-propia', isSuperAdmin: false };

  describe('organizacion ajena, se escriba como se escriba', () => {
    const ajena = 'org-ajena';

    it.each([
      ['organizationId', { params: { organizationId: ajena } }],
      ['organization_id', { params: { organization_id: ajena } }],
      ['orgId', { params: { orgId: ajena } }],
      ['en la query', { query: { orgId: ajena } }],
      ['en el body', { body: { organizationId: ajena } }],
    ])('la rechaza cuando viene como %s', (_nombre, partes) => {
      expect(() =>
        guard.canActivate(contexto({ user: usuario, ...partes })),
      ).toThrow(ForbiddenException);
    });
  });

  describe('la organizacion propia', () => {
    it('pasa con cualquiera de las grafias', () => {
      expect(
        guard.canActivate(
          contexto({
            user: usuario,
            params: { orgId: 'org-propia' },
            query: { organization_id: 'org-propia' },
            body: { organizationId: 'org-propia' },
          }),
        ),
      ).toBe(true);
    });

    it('pasa si no se menciona ninguna organizacion', () => {
      // Omitirla no puede significar «sin filtro»: de eso se encarga el
      // controlador usando @CurrentOrg().
      expect(
        guard.canActivate(contexto({ user: usuario, params: { id: 'x' } })),
      ).toBe(true);
    });

    it('no confunde otros parametros que acaben en Id', () => {
      expect(
        guard.canActivate(
          contexto({ user: usuario, params: { locationId: 'loc-ajena' } }),
        ),
      ).toBe(true);
    });
  });

  describe('casos limite', () => {
    it('un super admin cruza organizaciones a proposito', () => {
      expect(
        guard.canActivate(
          contexto({
            user: { organizationId: 'org-propia', isSuperAdmin: true },
            params: { orgId: 'org-ajena' },
          }),
        ),
      ).toBe(true);
    });

    it('sin usuario autenticado no pasa', () => {
      expect(() => guard.canActivate(contexto({}))).toThrow(
        UnauthorizedException,
      );
    });

    it('un body que no es un objeto no rompe el guard', () => {
      // `request.body` puede llegar como array o como texto.
      expect(
        guard.canActivate(contexto({ user: usuario, body: ['algo'] })),
      ).toBe(true);
      expect(
        guard.canActivate(contexto({ user: usuario, body: 'texto' })),
      ).toBe(true);
    });

    it('una organizacion vacia no cuenta como intento', () => {
      expect(
        guard.canActivate(contexto({ user: usuario, query: { orgId: '' } })),
      ).toBe(true);
    });
  });
});
