import { contrasenaTemporal } from '../contrasena';

describe('Contraseña temporal de un empleado nuevo', () => {
  it('se puede dictar: sin caracteres que se confundan al leerlos', () => {
    for (let i = 0; i < 200; i++) {
      expect(contrasenaTemporal()).toMatch(
        /^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}$/,
      );
    }
  });

  it('no repite: cada alta lleva la suya', () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 500; i++) vistas.add(contrasenaTemporal());

    expect(vistas.size).toBe(500);
  });

  it('usa todo el alfabeto, sin sesgo hacia el principio', () => {
    // 32 simbolos y 256 valores de byte: 32 divide a 256, asi que `% 32` no
    // sesga. Si alguien cambia el alfabeto a un largo que no divida, esto cae.
    const cuenta = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      for (const c of contrasenaTemporal().replace('-', '')) {
        cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
      }
    }

    expect(cuenta.size).toBe(32);
    const frecuencias = [...cuenta.values()];
    const esperada = 40000 / 32;
    expect(Math.min(...frecuencias)).toBeGreaterThan(esperada * 0.75);
    expect(Math.max(...frecuencias)).toBeLessThan(esperada * 1.25);
  });
});
