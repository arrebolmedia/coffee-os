import type { SignOptions } from 'jsonwebtoken';

/** Lo que `jsonwebtoken` acepta como caducidad: segundos, o una cadena tipo `7d`. */
export type JwtTtl = NonNullable<SignOptions['expiresIn']>;

// Formatos que entiende `ms`, que es quien interpreta la cadena: un numero con
// unidad opcional, con o sin espacio. `900`, `15m`, `7 days`.
const TTL_VALIDO =
  /^\d+(\.\d+)?\s*(ms|s|m|h|d|w|y|milliseconds?|seconds?|minutes?|hours?|days?|weeks?|years?)?$/i;

/**
 * Convierte un valor de configuracion en una caducidad de JWT valida.
 *
 * `@nestjs/jwt@11` dejo de aceptar un `string` cualquiera en `expiresIn`: el
 * tipo exige el formato concreto de `ms`. No es burocracia del compilador —
 * `jsonwebtoken` lanza en tiempo de ejecucion con una cadena que no sepa
 * interpretar, y un `JWT_EXPIRES_IN` mal escrito tumbaria el login entero.
 *
 * Validar aqui, en la frontera, permite un unico cast comentado en vez de tres
 * repartidos, y convierte un error de configuracion en un mensaje que dice cual
 * es la variable en lugar de una excepcion de una libreria.
 */
export function parseJwtTtl(
  value: string | undefined,
  fallback: JwtTtl,
  variable: string,
): JwtTtl {
  if (value === undefined || value === '') return fallback;

  if (!TTL_VALIDO.test(value.trim())) {
    throw new Error(
      `${variable} no es una caducidad valida: "${value}". ` +
        'Se espera un numero de segundos (900) o una cadena con unidad (15m, 7d).',
    );
  }

  // Unico cast, y sobre un valor ya validado: el tipo de `ms` es una union de
  // literales que TypeScript no puede derivar de un string en tiempo de
  // compilacion, por mucho que en tiempo de ejecucion sea correcto.
  return value.trim() as JwtTtl;
}
