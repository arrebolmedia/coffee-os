/**
 * Unit conversion for recipe -> inventory stock deduction.
 *
 * A recipe ingredient is expressed in the unit the cook uses ("18 g de café"),
 * while the inventory item is stocked in its own unit ("kg"). Deducting 18
 * from a kg-denominated item would wipe out the stock, so every deduction MUST
 * go through `convertQuantity` and a failed conversion MUST be reported instead
 * of silently deducting the raw number.
 */

type Dimension = 'mass' | 'volume' | 'count';

interface UnitDef {
  dimension: Dimension;
  /** How many base units (g / ml / piece) one of this unit is worth. */
  factor: number;
}

const UNITS: Record<string, UnitDef> = {
  // ---- mass (base: gram) ----
  mg: { dimension: 'mass', factor: 0.001 },
  g: { dimension: 'mass', factor: 1 },
  gr: { dimension: 'mass', factor: 1 },
  gram: { dimension: 'mass', factor: 1 },
  grams: { dimension: 'mass', factor: 1 },
  gramo: { dimension: 'mass', factor: 1 },
  gramos: { dimension: 'mass', factor: 1 },
  kg: { dimension: 'mass', factor: 1000 },
  kilo: { dimension: 'mass', factor: 1000 },
  kilos: { dimension: 'mass', factor: 1000 },
  kilogram: { dimension: 'mass', factor: 1000 },
  kilogramo: { dimension: 'mass', factor: 1000 },
  lb: { dimension: 'mass', factor: 453.59237 },
  libra: { dimension: 'mass', factor: 453.59237 },
  oz: { dimension: 'mass', factor: 28.349523125 },
  onza: { dimension: 'mass', factor: 28.349523125 },

  // ---- volume (base: millilitre) ----
  ml: { dimension: 'volume', factor: 1 },
  mililitro: { dimension: 'volume', factor: 1 },
  mililitros: { dimension: 'volume', factor: 1 },
  cl: { dimension: 'volume', factor: 10 },
  dl: { dimension: 'volume', factor: 100 },
  l: { dimension: 'volume', factor: 1000 },
  lt: { dimension: 'volume', factor: 1000 },
  lts: { dimension: 'volume', factor: 1000 },
  litro: { dimension: 'volume', factor: 1000 },
  litros: { dimension: 'volume', factor: 1000 },
  liter: { dimension: 'volume', factor: 1000 },
  litre: { dimension: 'volume', factor: 1000 },

  // ---- count (base: piece) ----
  unit: { dimension: 'count', factor: 1 },
  units: { dimension: 'count', factor: 1 },
  unidad: { dimension: 'count', factor: 1 },
  unidades: { dimension: 'count', factor: 1 },
  pza: { dimension: 'count', factor: 1 },
  pz: { dimension: 'count', factor: 1 },
  pieza: { dimension: 'count', factor: 1 },
  piezas: { dimension: 'count', factor: 1 },
  piece: { dimension: 'count', factor: 1 },
  pieces: { dimension: 'count', factor: 1 },
  each: { dimension: 'count', factor: 1 },
  ea: { dimension: 'count', factor: 1 },
  porcion: { dimension: 'count', factor: 1 },
  porciones: { dimension: 'count', factor: 1 },
  shot: { dimension: 'count', factor: 1 },
  shots: { dimension: 'count', factor: 1 },
};

function normalize(unit: string | null | undefined): string {
  return (
    (unit ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      // strip accents so "porción" matches "porcion"
      .split('')
      .filter((ch) => {
        const code = ch.charCodeAt(0);
        return code < 0x0300 || code > 0x036f;
      })
      .join('')
      .replace(/\.$/, '')
  );
}

export interface ConversionResult {
  ok: boolean;
  /** Converted quantity in the target unit. `0` when `ok` is false. */
  value: number;
  /** Why the conversion failed. `undefined` when `ok` is true. */
  reason?: string;
  from: string;
  to: string;
}

/**
 * Convert `quantity` from `fromUnit` into `toUnit`.
 *
 * Returns `ok: false` (never a guessed number) when either unit is unknown or
 * when the two units belong to different physical dimensions.
 */
export function convertQuantity(
  quantity: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
): ConversionResult {
  const from = normalize(fromUnit);
  const to = normalize(toUnit);

  if (from === to) {
    return { ok: true, value: quantity, from, to };
  }

  const fromDef = UNITS[from];
  const toDef = UNITS[to];

  if (!fromDef) {
    return {
      ok: false,
      value: 0,
      reason: `Unknown recipe unit "${fromUnit}"`,
      from,
      to,
    };
  }
  if (!toDef) {
    return {
      ok: false,
      value: 0,
      reason: `Unknown inventory unit "${toUnit}"`,
      from,
      to,
    };
  }
  if (fromDef.dimension !== toDef.dimension) {
    return {
      ok: false,
      value: 0,
      reason: `Incompatible units: cannot convert ${fromDef.dimension} ("${fromUnit}") to ${toDef.dimension} ("${toUnit}")`,
      from,
      to,
    };
  }

  return {
    ok: true,
    value: (quantity * fromDef.factor) / toDef.factor,
    from,
    to,
  };
}

/** Round to 6 decimals so float noise never leaks into stock values. */
export function roundQuantity(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
