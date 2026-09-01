import { construirRecibo, pesos } from '../recibo';

/**
 * El comprobante que se le da al cliente.
 *
 * Lo que importa aquí no es el HTML sino que las cifras impresas sean las mismas
 * que vio el cajero en pantalla y las mismas que se cobraron. Un ticket que no
 * cuadra es el papel con el que el cliente reclama.
 */
describe('Comprobante del cliente', () => {
  const base = {
    negocio: 'Cafetería Demo',
    sucursal: 'Sucursal Centro',
    direccion: 'Av. Reforma 100, CDMX',
    telefono: '55 1234 5678',
    ticketNumber: 'TKT-20260901-abc123',
    fechaHora: '01/09/2026 14:32',
    atendio: 'Roberto Dueño',
    lineas: [{ cantidad: 1, nombre: 'Affogato', importe: 78 }],
    subtotal: 67.24,
    tax: 10.76,
    discount: 0,
    total: 78,
    pagos: [{ metodo: 'CASH', importe: 78 }],
  };

  const texto = (html: string) =>
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

  it('imprime el precio de carta como total y el IVA como incluido', () => {
    const t = texto(construirRecibo(base));

    // $78 en la carta, $78 cobrados. El IVA no se suma: se desglosa.
    expect(t).toContain('Subtotal $78.00');
    expect(t).toContain('TOTAL $78.00');
    expect(t).toContain('IVA incluido $10.76');
    expect(t).not.toContain('$90.48');
  });

  it('el subtotal impreso deja seguir la resta del descuento', () => {
    // El ticket guarda base e IVA YA descontados, asi que imprimir `subtotal`
    // tal cual daba una resta que no cerraba delante del cliente.
    const t = texto(
      construirRecibo({
        ...base,
        lineas: [{ cantidad: 1, nombre: 'Latte', importe: 62 }],
        subtotal: 36.21,
        tax: 5.79,
        discount: 20,
        total: 42,
      }),
    );

    expect(t).toContain('Subtotal $62.00');
    expect(t).toContain('Descuento -$20.00');
    expect(t).toContain('TOTAL $42.00');
  });

  it('enseña los modificadores debajo de su producto', () => {
    const t = texto(
      construirRecibo({
        ...base,
        lineas: [
          {
            cantidad: 1,
            nombre: 'Latte',
            importe: 74,
            modificadores: ['Leche de avena'],
          },
        ],
      }),
    );

    expect(t).toContain('1 Latte $74.00');
    expect(t).toContain('+ Leche de avena');
  });

  it('desglosa los pagos con nombres que el cliente entiende', () => {
    const t = texto(
      construirRecibo({
        ...base,
        pagos: [
          { metodo: 'CASH', importe: 50 },
          { metodo: 'CARD', importe: 28 },
        ],
      }),
    );

    expect(t).toContain('Efectivo $50.00');
    expect(t).toContain('Tarjeta $28.00');
  });

  it('dice que no es una factura, en vez de prometer una', () => {
    // El timbrado no está integrado. Prometer un CFDI en el pie seria mandar al
    // cliente a pedir algo que el sistema no puede emitir.
    expect(texto(construirRecibo(base))).toContain(
      'Comprobante simplificado. No es un CFDI.',
    );
  });

  it('escapa el nombre del producto en vez de inyectarlo como HTML', () => {
    const html = construirRecibo({
      ...base,
      lineas: [
        { cantidad: 1, nombre: '<script>alert(1)</script>', importe: 10 },
      ],
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('sale con el ancho del rollo de 80 mm', () => {
    const html = construirRecibo(base);

    expect(html).toContain('@page { size: 80mm auto');
  });

  it('formatea en pesos mexicanos con dos decimales', () => {
    expect(pesos(1234.5)).toBe('$1,234.50');
    expect(pesos(0)).toBe('$0.00');
  });
});
