/**
 * El comprobante que se le da al cliente.
 *
 * Vive aparte del servicio y sin dependencias de Prisma para que se pueda leer
 * —y probar— sin levantar nada. Lo que sale de aquí es un documento HTML
 * completo pensado para un rollo de 80 mm, que es el ancho de las impresoras
 * térmicas de mostrador; sale bien igual en una impresora de hojas y en
 * pantalla, así que no ata al negocio a comprar un modelo concreto.
 *
 * Sobre las cifras: el precio que se exhibe ya lleva el IVA dentro (art. 7 bis
 * de la LFPC), así que el comprobante enseña la suma de precios de carta, el
 * descuento en pesos y el total; el IVA baja al final como informativo, porque
 * ya está contenido en lo que el cliente paga. Es el mismo orden que el carrito
 * del cajero: si los dos no dicen lo mismo, uno de los dos está mintiendo.
 *
 * NO es un CFDI. El timbrado está sin integrar a propósito y el pie lo dice, en
 * vez de prometer una factura que el sistema no puede emitir.
 */

export interface LineaRecibo {
  cantidad: number;
  nombre: string;
  importe: number;
  modificadores?: string[];
}

export interface PagoRecibo {
  metodo: string;
  importe: number;
}

export interface DatosRecibo {
  negocio: string;
  sucursal?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  ticketNumber: string;
  fechaHora: string;
  atendio?: string | null;
  lineas: LineaRecibo[];
  /** Base gravable ya descontada, como la guarda el ticket. */
  subtotal: number;
  /** IVA devengado, ya descontado. */
  tax: number;
  /** Pesos rebajados al cliente. */
  discount: number;
  total: number;
  pagos: PagoRecibo[];
}

/** Ancho del rollo en caracteres, para las líneas de separación. */
const ANCHO = 34;

const METODOS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  DIGITAL_WALLET: 'Monedero digital',
  BANK_TRANSFER: 'Transferencia',
  LOYALTY_POINTS: 'Puntos de lealtad',
  MIXED: 'Pago mixto',
};

export function escaparHtml(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function pesos(monto: number): string {
  const n = Number.isFinite(monto) ? monto : 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fila(etiqueta: string, valor: string, clase = ''): string {
  return `<div class="fila ${clase}"><span>${escaparHtml(
    etiqueta,
  )}</span><span>${escaparHtml(valor)}</span></div>`;
}

export function construirRecibo(datos: DatosRecibo): string {
  const separador = `<div class="sep">${'-'.repeat(ANCHO)}</div>`;

  const encabezado = [
    `<div class="negocio">${escaparHtml(datos.negocio)}</div>`,
    datos.sucursal ? `<div>${escaparHtml(datos.sucursal)}</div>` : '',
    datos.direccion ? `<div>${escaparHtml(datos.direccion)}</div>` : '',
    datos.telefono ? `<div>Tel. ${escaparHtml(datos.telefono)}</div>` : '',
  ]
    .filter(Boolean)
    .join('');

  const lineas = datos.lineas
    .map((l) => {
      const extras = (l.modificadores ?? [])
        .map((m) => `<div class="extra">+ ${escaparHtml(m)}</div>`)
        .join('');
      return `<div class="fila linea"><span>${escaparHtml(
        l.cantidad,
      )} ${escaparHtml(l.nombre)}</span><span>${escaparHtml(
        pesos(l.importe),
      )}</span></div>${extras}`;
    })
    .join('');

  // El subtotal que se enseña es la suma de precios de carta —lo que costaban
  // las cosas antes del descuento—, no la base gravable: el cliente tiene que
  // poder seguir la resta. `ticket.subtotal` ya viene descontado y sin IVA.
  const precioDeCarta = datos.total + datos.discount;

  const totales = [
    fila('Subtotal', pesos(precioDeCarta)),
    datos.discount > 0 ? fila('Descuento', `-${pesos(datos.discount)}`) : '',
    fila('TOTAL', pesos(datos.total), 'total'),
    fila('IVA incluido', pesos(datos.tax), 'tenue'),
  ]
    .filter(Boolean)
    .join('');

  const pagos = datos.pagos
    .map((p) => fila(METODOS[p.metodo] ?? p.metodo, pesos(p.importe)))
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Ticket ${escaparHtml(datos.ticketNumber)}</title>
<style>
  /* 80 mm es el rollo de mostrador. Con \`auto\` de alto, la impresora térmica
     corta donde termina el contenido en vez de expulsar una hoja entera. */
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto;
    width: 74mm;
    max-width: 100%;
    font-family: "Consolas", "Menlo", "Courier New", monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #000;
    background: #fff;
  }
  .centro { text-align: center; }
  .negocio { font-size: 15px; font-weight: 700; }
  .sep { white-space: nowrap; overflow: hidden; opacity: .6; }
  .fila { display: flex; justify-content: space-between; gap: 8px; }
  .fila span:last-child { white-space: nowrap; }
  .linea span:first-child { word-break: break-word; }
  .extra { padding-left: 1.2em; opacity: .75; }
  .total { font-weight: 700; font-size: 14px; }
  .tenue { opacity: .75; }
  .pie { margin-top: 6px; text-align: center; opacity: .85; }
  /* En pantalla se ve como un ticket sobre fondo gris; al imprimir, limpio. */
  @media screen {
    body { padding: 10mm 4mm; box-shadow: 0 1px 6px rgba(0,0,0,.25); margin-top: 12px; }
  }
</style>
</head>
<body>
  <div class="centro">${encabezado}</div>
  ${separador}
  <div>Ticket: ${escaparHtml(datos.ticketNumber)}</div>
  <div>${escaparHtml(datos.fechaHora)}</div>
  ${datos.atendio ? `<div>Atendió: ${escaparHtml(datos.atendio)}</div>` : ''}
  ${separador}
  ${lineas}
  ${separador}
  ${totales}
  ${pagos ? separador + pagos : ''}
  ${separador}
  <div class="pie">¡Gracias por su compra!</div>
  <div class="pie">Comprobante simplificado. No es un CFDI.</div>
</body>
</html>`;
}
