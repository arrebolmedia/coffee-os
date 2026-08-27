/**
 * El dia de calendario de una cafeteria, no el del servidor.
 *
 * Todo lo que reporta «hoy» —el corte de caja, las ventas del dia, la lista de
 * ordenes— tiene que recortar el dia en la zona horaria del negocio. El codigo
 * anterior lo recortaba con `setHours(0,0,0,0)`, que usa la zona del proceso:
 * en el portatil de desarrollo (America/Mexico_City) daba bien, y en un
 * contenedor —que arranca en UTC porque nadie fija `TZ`— el «dia» iba de las
 * 18:00 de ayer a las 18:00 de hoy. Toda venta de la tarde se contaba en el
 * corte del dia siguiente.
 *
 * Medido contra la base de desarrollo: 6 de 39 tickets cerrados caen en un dia
 * distinto segun se mire en UTC o en hora de Ciudad de Mexico, y los seis son
 * de la tarde (18:11 a 19:25).
 */

/** Zona por defecto: el producto es para cafeterias mexicanas. */
export const ZONA_POR_DEFECTO = 'America/Mexico_City';

/** Un dia de calendario, ya convertido a instantes para consultar la base. */
export interface RangoDia {
  gte: Date;
  lte: Date;
}

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Comprueba que la zona exista antes de usarla.
 *
 * El `timezone` de una organizacion es texto libre en la base. Uno mal escrito
 * no puede tumbar la lista de ordenes: se cae a la zona por defecto.
 */
export function zonaValida(zona: string | null | undefined): boolean {
  if (!zona) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

/** La zona pedida si sirve; si no, la de por defecto. */
export function zonaOPorDefecto(zona: string | null | undefined): string {
  return zonaValida(zona) ? (zona as string) : ZONA_POR_DEFECTO;
}

/**
 * Cuantos minutos va la zona por delante de UTC en ese instante concreto.
 *
 * Se pregunta por instante y no por zona porque el desfase cambia con el
 * horario de verano. Mexico lo abolio en 2022 salvo en la franja fronteriza,
 * pero `America/Tijuana` sigue teniendolo y el mismo codigo sirve para ambas.
 */
function desfaseMinutos(instante: Date, zona: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante);

  const v: Record<string, number> = {};
  for (const parte of partes) {
    if (parte.type !== 'literal') v[parte.type] = Number(parte.value);
  }

  const comoSiFueraUtc = Date.UTC(
    v.year,
    v.month - 1,
    v.day,
    v.hour,
    v.minute,
    v.second,
  );

  // `formatToParts` no devuelve milisegundos: se comparan segundos enteros o el
  // desfase saldria con un resto de hasta 999 ms.
  const enSegundos = Math.floor(instante.getTime() / 1000) * 1000;
  return (comoSiFueraUtc - enSegundos) / 60000;
}

/**
 * El instante que corresponde a una hora de pared en una zona.
 *
 * Dos pasadas: la primera estima el desfase suponiendo que la hora de pared es
 * UTC, la segunda lo recalcula ya sobre el instante aproximado. Hace falta
 * porque el desfase depende del instante, y en un cambio de horario la primera
 * estimacion puede caer al otro lado del salto.
 */
export function instanteEnZona(
  anio: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  segundo: number,
  ms: number,
  zona: string,
): Date {
  const pared = Date.UTC(anio, mes - 1, dia, hora, minuto, segundo, ms);
  let ts = pared - desfaseMinutos(new Date(pared), zona) * 60000;
  ts = pared - desfaseMinutos(new Date(ts), zona) * 60000;
  return new Date(ts);
}

/** La fecha `YYYY-MM-DD` que se vive en esa zona en ese instante. */
export function fechaEnZona(instante: Date, zona: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaOPorDefecto(zona),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instante);

  const v: Record<string, string> = {};
  for (const parte of partes) {
    if (parte.type !== 'literal') v[parte.type] = parte.value;
  }
  return `${v.year}-${v.month}-${v.day}`;
}

/**
 * El dia de calendario completo, de 00:00:00.000 a 23:59:59.999 en la zona
 * indicada, devuelto como instantes listos para `gte`/`lte`.
 *
 * `fecha` acepta `YYYY-MM-DD` o un instante, en cuyo caso se usa el dia que ese
 * instante vive en la zona. Un texto que no sea una fecha valida devuelve
 * `null`: mejor no filtrar que filtrar por basura.
 */
export function rangoDelDia(
  fecha: string | Date | undefined,
  zona: string | null | undefined,
): RangoDia | null {
  const zonaFinal = zonaOPorDefecto(zona);

  let anio: number;
  let mes: number;
  let dia: number;

  if (fecha === undefined) {
    [anio, mes, dia] = fechaEnZona(new Date(), zonaFinal)
      .split('-')
      .map(Number);
  } else if (fecha instanceof Date) {
    if (isNaN(fecha.getTime())) return null;
    [anio, mes, dia] = fechaEnZona(fecha, zonaFinal).split('-').map(Number);
  } else {
    const partes = SOLO_FECHA.exec(fecha.trim());
    if (!partes) {
      // Puede venir un ISO completo: se toma el dia que vive en la zona.
      const instante = new Date(fecha);
      if (isNaN(instante.getTime())) return null;
      [anio, mes, dia] = fechaEnZona(instante, zonaFinal)
        .split('-')
        .map(Number);
    } else {
      anio = Number(partes[1]);
      mes = Number(partes[2]);
      dia = Number(partes[3]);
      // `new Date(2026, 1, 31)` se desborda a marzo sin avisar: se comprueba
      // que la fecha exista antes de construir el rango.
      const comprobacion = new Date(Date.UTC(anio, mes - 1, dia));
      if (
        comprobacion.getUTCFullYear() !== anio ||
        comprobacion.getUTCMonth() !== mes - 1 ||
        comprobacion.getUTCDate() !== dia
      ) {
        return null;
      }
    }
  }

  return {
    gte: instanteEnZona(anio, mes, dia, 0, 0, 0, 0, zonaFinal),
    lte: instanteEnZona(anio, mes, dia, 23, 59, 59, 999, zonaFinal),
  };
}

/** Si el valor es `YYYY-MM-DD` a secas, sin hora. */
export function esSoloFecha(valor: unknown): valor is string {
  return typeof valor === 'string' && SOLO_FECHA.test(valor.trim());
}

/**
 * El primer instante del dia al que se refiere `valor`.
 *
 * Un `YYYY-MM-DD` se entiende como el dia entero; una marca de tiempo completa
 * se respeta tal cual. Quien pide `?startDate=2026-08-27T14:00:00Z` esta
 * pidiendo ese instante, no ese dia, y redondearlo le cambiaria la respuesta.
 */
export function inicioDelDia(
  valor: string | Date | undefined,
  zona: string | null | undefined,
): Date | null {
  if (typeof valor === 'string' && !esSoloFecha(valor)) {
    const instante = new Date(valor);
    return isNaN(instante.getTime()) ? null : instante;
  }
  return rangoDelDia(valor, zona)?.gte ?? null;
}

/** El ultimo instante del dia al que se refiere `valor`. Ver `inicioDelDia`. */
export function finDelDia(
  valor: string | Date | undefined,
  zona: string | null | undefined,
): Date | null {
  if (typeof valor === 'string' && !esSoloFecha(valor)) {
    const instante = new Date(valor);
    return isNaN(instante.getTime()) ? null : instante;
  }
  return rangoDelDia(valor, zona)?.lte ?? null;
}

/**
 * Rango que cubre desde el principio del dia `desde` hasta el final del dia
 * `hasta`, ambos en la zona indicada. Sin argumentos, el dia de hoy.
 */
export function rangoEntreDias(
  desde: string | Date | undefined,
  hasta: string | Date | undefined,
  zona: string | null | undefined,
): RangoDia | null {
  const gte = inicioDelDia(desde, zona);
  const lte = finDelDia(hasta, zona);
  if (!gte || !lte) return null;
  return { gte, lte };
}
