/**
 * Lo que comparten el montaje del sandbox y el día de operación.
 *
 * Vive aparte para que importarlo no ejecute el seed: `cafeteria.ts` borra y
 * recrea la organización al cargarse, así que importar constantes desde ahí
 * arrasaba los datos en mitad del día de prueba.
 */

export const SLUG = 'sandbox-tc';
export const PASSWORD = 'Sandbox123!';

export const CUENTAS = {
  dueño: 'duena@sandbox.test',
  cajero: 'cajero@sandbox.test',
  barista: 'barista@sandbox.test',
} as const;
