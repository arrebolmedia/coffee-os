/**
 * El ISR del periodo según el régimen fiscal del negocio.
 *
 * Lógica pura: no toca Prisma ni el request, y está cubierta por tests. Es el
 * único sitio que hay que auditar —o que enseñarle al contador— para saber con
 * qué se está calculando el impuesto.
 *
 * Antes había una sola fórmula, `30 % × utilidad`, que es la de persona moral.
 * Aplicarla a un negocio en RESICO no es una imprecisión: es otro impuesto
 * distinto, calculado sobre otra base. En RESICO de persona física el ISR sale
 * de los INGRESOS cobrados, no de la utilidad, y la tasa depende de cuánto se
 * facture.
 *
 * ADVERTENCIA: las tasas de abajo son las del artículo 113-E de la LISR y
 * sirven como estimación para el estado de resultados. No sustituyen a la
 * declaración: quien presenta ante el SAT es el contador, y conviene que
 * confirme la tabla antes de tomar decisiones con estos números.
 */

/** Regímenes que sabe calcular el sistema. */
export type RegimenFiscal =
  /** RESICO de persona física: tasa sobre ingresos cobrados (art. 113-E LISR). */
  | 'resico_pf'
  /** Persona moral: 30 % sobre la utilidad antes de impuestos. */
  | 'persona_moral'
  /** Escape: una tasa fija sobre la utilidad, la que diga el contador. */
  | 'tasa_fija';

export const REGIMENES: readonly RegimenFiscal[] = [
  'resico_pf',
  'persona_moral',
  'tasa_fija',
] as const;

/** Sobre qué se aplicó la tasa. Va en la respuesta para que la pantalla lo diga. */
export type BaseImpuesto = 'ingresos' | 'utilidad';

/** ISR de persona moral. */
export const TASA_PERSONA_MORAL = 0.3;

/**
 * Tabla mensual de RESICO para personas físicas (art. 113-E LISR).
 *
 * La tasa NO es marginal: la que corresponde al tramo se aplica a la totalidad
 * de los ingresos. Es la particularidad del régimen, y por eso no se calcula
 * por escalones como en la tarifa progresiva de actividad empresarial.
 *
 * El último tramo, $291,666.67 al mes, son los $3.5 millones anuales que marcan
 * el techo del régimen: por encima se deja de tributar en RESICO.
 */
export const TABLA_RESICO_PF: ReadonlyArray<{
  hastaIngresoMensual: number;
  tasa: number;
}> = [
  { hastaIngresoMensual: 25_000, tasa: 0.01 },
  { hastaIngresoMensual: 50_000, tasa: 0.011 },
  { hastaIngresoMensual: 83_333.33, tasa: 0.015 },
  { hastaIngresoMensual: 208_333.33, tasa: 0.02 },
  { hastaIngresoMensual: 291_666.67, tasa: 0.025 },
];

/** Días de un mes promedio, para llevar cualquier periodo a su equivalente mensual. */
const DIAS_POR_MES = 30.44;

export interface EntradaIsr {
  regimen: RegimenFiscal;
  /** Ingresos netos del periodo, sin IVA. Base de RESICO. */
  ingresos: number;
  /** Utilidad antes de impuestos. Base de persona moral y de la tasa fija. */
  utilidad: number;
  /** Duración del periodo, para situar los ingresos en la tabla mensual. */
  dias: number;
  /** Sólo para `tasa_fija`: la tasa a aplicar, como fracción. */
  tasaFija?: number;
}

export interface ResultadoIsr {
  /** Importe del impuesto del periodo. */
  impuesto: number;
  /** Tasa efectivamente aplicada, como fracción. */
  tasa: number;
  /** Sobre qué se aplicó. */
  base: BaseImpuesto;
}

/** Si el texto nombra un régimen que el sistema sabe calcular. */
export function esRegimen(valor: unknown): valor is RegimenFiscal {
  return (
    typeof valor === 'string' && REGIMENES.includes(valor as RegimenFiscal)
  );
}

/**
 * La tasa de RESICO que corresponde a un nivel de ingresos mensuales.
 *
 * Por encima del último tramo se devuelve su tasa: el negocio ya habría salido
 * del régimen, y el estado de resultados no es el sitio para decidir eso — pero
 * tampoco puede dejar de calcular. Quien avisa de que se pasó el techo es el
 * contador.
 */
export function tasaResico(ingresoMensual: number): number {
  for (const tramo of TABLA_RESICO_PF) {
    if (ingresoMensual <= tramo.hastaIngresoMensual) return tramo.tasa;
  }
  return TABLA_RESICO_PF[TABLA_RESICO_PF.length - 1].tasa;
}

/**
 * El impuesto del periodo.
 *
 * Para RESICO, los ingresos del periodo se llevan a su equivalente mensual para
 * situarlos en la tabla —un informe de un año no puede buscar su tramo con el
 * acumulado de doce meses—, pero la tasa resultante se aplica a los ingresos
 * reales del periodo. Con un mes de calendario el ajuste es prácticamente
 * neutro, que es como se mira esta pantalla casi siempre.
 */
export function calcularIsr(entrada: EntradaIsr): ResultadoIsr {
  const { regimen, ingresos, utilidad, dias } = entrada;

  if (regimen === 'resico_pf') {
    // RESICO grava el ingreso: no hay impuesto que calcular si no se facturó,
    // y una pérdida no lo reduce, a diferencia de la utilidad.
    if (ingresos <= 0) return { impuesto: 0, tasa: 0, base: 'ingresos' };

    const mensualEquivalente =
      dias > 0 ? (ingresos * DIAS_POR_MES) / dias : ingresos;
    const tasa = tasaResico(mensualEquivalente);

    return { impuesto: ingresos * tasa, tasa, base: 'ingresos' };
  }

  const tasa =
    regimen === 'tasa_fija'
      ? (entrada.tasaFija ?? TASA_PERSONA_MORAL)
      : TASA_PERSONA_MORAL;

  // Sobre utilidad: sin utilidad no hay impuesto.
  return {
    impuesto: utilidad > 0 ? utilidad * tasa : 0,
    tasa,
    base: 'utilidad',
  };
}
