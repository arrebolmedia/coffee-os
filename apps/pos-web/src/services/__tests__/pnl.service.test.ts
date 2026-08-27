import { api } from '@/lib/api';
import { pnlService } from '../pnl.service';

jest.mock('@/lib/api', () => {
  const real = jest.requireActual('@/lib/api');
  return { api: { get: jest.fn() }, buildQueryString: real.buildQueryString };
});

const get = api.get as jest.Mock;

/**
 * La URL con la que se pide el estado de resultados.
 *
 * Las cuatro llamadas armaban la query con `new URLSearchParams(params)`, que
 * convierte `undefined` en el TEXTO «undefined». Sin sucursal seleccionada
 * —que es como entra la pantalla— salía `location_id=undefined` y el API
 * respondía `404 Location undefined not found`. El estado de resultados no
 * cargaba nunca: sólo se veía el cartel de error.
 */
describe('pnlService — la URL que se pide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({});
  });

  /** La ruta con la que se llamó a `api.get`. */
  const rutaPedida = () => get.mock.calls[0][0] as string;

  const base = {
    organization_id: 'org1',
    start_date: '2026-08-01',
    end_date: '2026-08-31',
  };

  it('no manda la sucursal cuando no hay ninguna elegida', async () => {
    await pnlService.calculatePnL({ ...base, location_id: undefined });

    expect(rutaPedida()).not.toContain('undefined');
    expect(rutaPedida()).not.toContain('location_id');
  });

  it('sí la manda cuando se elige una', async () => {
    await pnlService.calculatePnL({ ...base, location_id: 'loc1' });

    expect(rutaPedida()).toContain('location_id=loc1');
  });

  it('el informe mensual tampoco arrastra el undefined', async () => {
    // Es el que usa la pantalla al abrirse, y el que devolvía 404.
    await pnlService.calculateMonthlyPnL({
      organization_id: 'org1',
      year: 2026,
      month: 8,
      location_id: undefined,
    });

    expect(rutaPedida()).toBe(
      '/finance/pnl/monthly?organization_id=org1&year=2026&month=8',
    );
  });

  it('ni el anual', async () => {
    await pnlService.calculateYearlyPnL({
      organization_id: 'org1',
      year: 2026,
      location_id: undefined,
    });

    expect(rutaPedida()).not.toContain('undefined');
  });

  it('ni la comparación de periodos', async () => {
    await pnlService.comparePeriods({
      organization_id: 'org1',
      period1_start: '2026-07-01',
      period1_end: '2026-07-31',
      period2_start: '2026-08-01',
      period2_end: '2026-08-31',
      location_id: undefined,
    });

    expect(rutaPedida()).not.toContain('undefined');
  });
});
