import { api } from '@/lib/api';
import { onboardingService } from '../onboarding.service';

jest.mock('@/lib/api', () => {
  const real = jest.requireActual('@/lib/api');
  return {
    api: { get: jest.fn(), post: jest.fn() },
    buildQueryString: real.buildQueryString,
  };
});

const get = api.get as jest.Mock;

/**
 * La URL con la que se piden los planes de onboarding.
 *
 * Se armaba con `new URLSearchParams(params)`, que convierte `undefined` en el
 * TEXTO «undefined». La pantalla entra sin empleado ni periodo elegidos, así
 * que salía `?employee_id=undefined&period=undefined` y el API respondía 400:
 * la pantalla no cargaba nunca. Es el mismo fallo que tenía el estado de
 * resultados, encontrado auditando todas las rutas.
 */
describe('onboardingService — la URL que se pide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue([]);
  });

  const rutaPedida = () => get.mock.calls[0][0] as string;

  it('no manda los filtros que el usuario no ha elegido', async () => {
    await onboardingService.getPlans({
      organization_id: 'org1',
      employee_id: undefined,
      period: undefined,
    });

    expect(rutaPedida()).not.toContain('undefined');
    expect(rutaPedida()).toBe('/hr/onboarding?organization_id=org1');
  });

  it('sí manda los que se eligen', async () => {
    await onboardingService.getPlans({
      organization_id: 'org1',
      employee_id: 'emp1',
    });

    expect(rutaPedida()).toContain('employee_id=emp1');
  });
});
