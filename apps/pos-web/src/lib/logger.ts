/**
 * CoffeeOS POS Web - Logger
 * Wrapper mínimo sobre console con niveles.
 *
 * Por qué existe: el build de producción corre ESLint con `no-console` en
 * `error` (ver .eslintrc.js en la raíz), así que cualquier `console.*` suelto
 * rompe `next build`. Además, la traza de debug no debe llegar al bundle del
 * cliente en producción.
 *
 * Niveles:
 *   debug / info  → solo en desarrollo. Traza para depurar.
 *   warn / error  → siempre. Son señales reales que hay que ver en producción.
 */

/* eslint-disable no-console */

const isDev = process.env.NODE_ENV !== 'production';

type LogArgs = readonly unknown[];

export interface Logger {
  /** Traza de depuración. Silenciada en producción. */
  debug(...args: LogArgs): void;
  /** Información de operación normal. Silenciada en producción. */
  info(...args: LogArgs): void;
  /** Algo inesperado pero recuperable. Visible siempre. */
  warn(...args: LogArgs): void;
  /** Fallo real. Visible siempre. */
  error(...args: LogArgs): void;
  /** Deriva un logger con prefijo, p. ej. `logger.scope('sync')`. */
  scope(name: string): Logger;
}

function build(prefix: string): Logger {
  const tag = prefix ? [`[${prefix}]`] : [];

  return {
    debug: (...args) => {
      if (isDev) console.log(...tag, ...args);
    },
    info: (...args) => {
      if (isDev) console.info(...tag, ...args);
    },
    warn: (...args) => console.warn(...tag, ...args),
    error: (...args) => console.error(...tag, ...args),
    scope: (name) => build(prefix ? `${prefix}:${name}` : name),
  };
}

export const logger = build('');
