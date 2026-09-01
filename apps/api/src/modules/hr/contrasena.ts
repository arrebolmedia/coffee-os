import { randomBytes } from 'crypto';

/**
 * La contraseña temporal que el dueño le entrega a un empleado nuevo.
 *
 * Se dicta en voz alta o se apunta en un papel, así que el alfabeto deja fuera
 * los caracteres que se confunden al leerlos: `0` y `O`, `1` e `I` y `l`. Son
 * 32 símbolos, y 32 divide a 256, de modo que tomar `byte % 32` no introduce
 * sesgo: cada símbolo sale con la misma probabilidad.
 *
 * Diez símbolos son 50 bits de entropía, de sobra para una credencial que se
 * usa una vez y se cambia. Va en dos grupos de cinco porque así se dicta sin
 * perder la cuenta.
 *
 * Antes esto era `randomBytes(16).toString('hex')` — 32 caracteres que nadie
 * podía teclear— y, sobre todo, **no se le enseñaba a nadie**: el empleado
 * quedaba encerrado fuera del sistema para siempre.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function contrasenaTemporal(): string {
  const bytes = randomBytes(10);
  const simbolos = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]);
  return `${simbolos.slice(0, 5).join('')}-${simbolos.slice(5).join('')}`;
}
