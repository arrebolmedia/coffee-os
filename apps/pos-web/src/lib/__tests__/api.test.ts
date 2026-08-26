import { apiFetch, buildQueryString } from '../api';

jest.mock('next-auth/react', () => ({
  getSession: jest.fn().mockResolvedValue(null),
}));

jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

/** Respuesta mínima con la superficie que usa apiFetch. */
function respuesta({
  status = 200,
  body = '',
}: {
  status?: number;
  body?: string;
}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'test',
    text: async () => body,
    json: async () => JSON.parse(body),
  } as Response;
}

describe('apiFetch — cuerpos de respuesta', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('devuelve el JSON cuando viene contenido', async () => {
    fetchMock.mockResolvedValue(
      respuesta({ body: JSON.stringify({ total: 156.0 }) }),
    );

    await expect(apiFetch('/pnl', { requiresAuth: false })).resolves.toEqual({
      total: 156.0,
    });
  });

  it('devuelve null en 204 sin intentar parsear', async () => {
    fetchMock.mockResolvedValue(respuesta({ status: 204 }));

    await expect(
      apiFetch('/algo', { requiresAuth: false }),
    ).resolves.toBeNull();
  });

  it('devuelve null en un 200 con cuerpo VACÍO', async () => {
    // Este es el caso que rompía: sólo se contemplaba el 204, así que un 200
    // vacío llegaba a response.json() y lanzaba "Unexpected end of JSON input".
    // El error subía como fallo de red y dejaba la query en error — es lo que
    // llenaba la consola del POS desde use-costing.
    fetchMock.mockResolvedValue(respuesta({ status: 200, body: '' }));

    await expect(
      apiFetch('/costing', { requiresAuth: false }),
    ).resolves.toBeNull();
  });

  it('devuelve null cuando el cuerpo es sólo espacios', async () => {
    fetchMock.mockResolvedValue(respuesta({ status: 200, body: '  \n ' }));

    await expect(
      apiFetch('/costing', { requiresAuth: false }),
    ).resolves.toBeNull();
  });

  it('sigue propagando un JSON mal formado, que sí es un error real', async () => {
    // No hay que confundir "sin cuerpo" con "cuerpo roto": lo segundo tiene que
    // seguir fallando o esconderíamos respuestas corruptas del backend.
    fetchMock.mockResolvedValue(respuesta({ status: 200, body: '{"a":' }));

    await expect(
      apiFetch('/costing', { requiresAuth: false }),
    ).rejects.toThrow();
  });

  it('lanza con el mensaje del backend en un error HTTP', async () => {
    fetchMock.mockResolvedValue(
      respuesta({
        status: 400,
        body: JSON.stringify({ message: 'startDate inválida' }),
      }),
    );

    await expect(apiFetch('/pnl', { requiresAuth: false })).rejects.toThrow(
      /startDate inválida/,
    );
  });
});

describe('buildQueryString', () => {
  it('omite null, undefined y cadena vacía', () => {
    // Importa en las rutas del dinero: mandar `?startDate=` hacía que el API
    // construyera new Date('') y respondiera 500 en los 4 endpoints de P&L.
    expect(
      buildQueryString({ a: 1, b: null, c: undefined, d: '', e: 'x' }),
    ).toBe('?a=1&e=x');
  });

  it('devuelve cadena vacía cuando no queda ningún parámetro', () => {
    expect(buildQueryString({ a: null, b: undefined })).toBe('');
  });
});
