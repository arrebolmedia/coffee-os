import {
  esSoloFecha,
  fechaEnZona,
  rangoDelDia,
  rangoEntreDias,
  ZONA_POR_DEFECTO,
  zonaOPorDefecto,
  zonaValida,
} from '../day-range';

/**
 * Todas las comprobaciones son sobre instantes absolutos (`toISOString`), nunca
 * sobre componentes locales. Es lo unico que prueba lo que interesa: que el
 * resultado no dependa de la zona en la que corra el proceso. La version
 * anterior de este calculo pasaba en el portatil de desarrollo
 * (America/Mexico_City) y se equivocaba seis horas dentro de un contenedor.
 */
describe('rango del dia por zona horaria', () => {
  describe('recorta el dia donde esta la cafeteria', () => {
    it('Ciudad de Mexico empieza el dia a las 06:00 UTC', () => {
      const rango = rangoDelDia('2026-08-27', 'America/Mexico_City');

      expect(rango?.gte.toISOString()).toBe('2026-08-27T06:00:00.000Z');
      expect(rango?.lte.toISOString()).toBe('2026-08-28T05:59:59.999Z');
    });

    it('una zona en UTC empieza a medianoche UTC', () => {
      const rango = rangoDelDia('2026-08-27', 'UTC');

      expect(rango?.gte.toISOString()).toBe('2026-08-27T00:00:00.000Z');
      expect(rango?.lte.toISOString()).toBe('2026-08-27T23:59:59.999Z');
    });

    it('el dia dura 24 horas justas', () => {
      const rango = rangoDelDia('2026-08-27', 'America/Mexico_City');
      const duracion = rango!.lte.getTime() - rango!.gte.getTime();

      expect(duracion).toBe(24 * 60 * 60 * 1000 - 1);
    });
  });

  describe('horario de verano', () => {
    // Mexico lo abolio en 2022 salvo en la franja fronteriza, pero Tijuana
    // sigue cambiando la hora y es una sucursal perfectamente posible.
    it('Tijuana en agosto va a UTC-7', () => {
      const rango = rangoDelDia('2026-08-27', 'America/Tijuana');

      expect(rango?.gte.toISOString()).toBe('2026-08-27T07:00:00.000Z');
    });

    it('Tijuana en enero va a UTC-8', () => {
      const rango = rangoDelDia('2026-01-15', 'America/Tijuana');

      expect(rango?.gte.toISOString()).toBe('2026-01-15T08:00:00.000Z');
    });

    it('el dia en que atrasan el reloj dura 25 horas', () => {
      // 1 de noviembre de 2026: Tijuana pasa de PDT a PST de madrugada. Es el
      // caso que obliga a calcular el desfase dos veces, una por extremo: con
      // una sola pasada el final del dia se queda una hora corto.
      const rango = rangoDelDia('2026-11-01', 'America/Tijuana');
      const horas = (rango!.lte.getTime() - rango!.gte.getTime() + 1) / 3600000;

      expect(horas).toBe(25);
    });
  });

  describe('la venta de la tarde cae en el dia correcto', () => {
    // El caso medido en la base de desarrollo: seis tickets cobrados la tarde
    // del 26 de agosto quedaron sellados como del 27 al mirarlos en UTC.
    const ventaDeLaTarde = new Date('2026-08-27T01:25:00.000Z'); // 19:25 CDMX

    it('entra en el dia 26, que es cuando se cobro', () => {
      const rango = rangoDelDia('2026-08-26', 'America/Mexico_City');

      expect(ventaDeLaTarde >= rango!.gte && ventaDeLaTarde <= rango!.lte).toBe(
        true,
      );
    });

    it('no entra en el dia 27', () => {
      const rango = rangoDelDia('2026-08-27', 'America/Mexico_City');

      expect(ventaDeLaTarde >= rango!.gte).toBe(false);
    });

    it('en cambio si es del 27 para una cafeteria que estuviera en UTC', () => {
      const rango = rangoDelDia('2026-08-27', 'UTC');

      expect(ventaDeLaTarde >= rango!.gte && ventaDeLaTarde <= rango!.lte).toBe(
        true,
      );
    });
  });

  describe('entradas que no son una fecha', () => {
    it('devuelve null en vez de filtrar por basura', () => {
      expect(rangoDelDia('ayer', 'America/Mexico_City')).toBeNull();
    });

    it('rechaza un dia que no existe en el calendario', () => {
      // `new Date(2026, 1, 31)` se desborda a marzo sin avisar.
      expect(rangoDelDia('2026-02-31', 'America/Mexico_City')).toBeNull();
    });

    it('rechaza un mes fuera de rango', () => {
      expect(rangoDelDia('2026-13-01', 'America/Mexico_City')).toBeNull();
    });

    it('acepta una marca de tiempo completa y usa el dia que vive en la zona', () => {
      const rango = rangoDelDia(
        '2026-08-27T01:25:00.000Z',
        'America/Mexico_City',
      );

      expect(rango?.gte.toISOString()).toBe('2026-08-26T06:00:00.000Z');
    });
  });

  describe('zona invalida', () => {
    it('no revienta: se cae a la zona por defecto', () => {
      // El `timezone` de la organizacion es texto libre en la base; uno mal
      // escrito no puede dejar sin lista de ordenes a la cafeteria.
      const rango = rangoDelDia('2026-08-27', 'Marte/Olympus_Mons');

      expect(rango?.gte.toISOString()).toBe('2026-08-27T06:00:00.000Z');
    });

    it('zonaValida distingue una zona real de una inventada', () => {
      expect(zonaValida('America/Mexico_City')).toBe(true);
      expect(zonaValida('Marte/Olympus_Mons')).toBe(false);
      expect(zonaValida(null)).toBe(false);
      expect(zonaValida('')).toBe(false);
    });

    it('zonaOPorDefecto devuelve la mexicana cuando no hay nada util', () => {
      expect(zonaOPorDefecto(undefined)).toBe(ZONA_POR_DEFECTO);
      expect(zonaOPorDefecto('UTC')).toBe('UTC');
    });
  });

  describe('fechaEnZona', () => {
    it('la madrugada UTC sigue siendo la tarde de ayer en Mexico', () => {
      expect(
        fechaEnZona(
          new Date('2026-08-27T01:25:00.000Z'),
          'America/Mexico_City',
        ),
      ).toBe('2026-08-26');
    });

    it('la misma marca en UTC ya es el dia siguiente', () => {
      expect(fechaEnZona(new Date('2026-08-27T01:25:00.000Z'), 'UTC')).toBe(
        '2026-08-27',
      );
    });
  });

  describe('rangoEntreDias', () => {
    it('cubre desde el principio del primer dia hasta el final del ultimo', () => {
      const rango = rangoEntreDias(
        '2026-08-01',
        '2026-08-31',
        'America/Mexico_City',
      );

      expect(rango?.gte.toISOString()).toBe('2026-08-01T06:00:00.000Z');
      expect(rango?.lte.toISOString()).toBe('2026-09-01T05:59:59.999Z');
    });

    it('respeta una marca de tiempo completa en vez de redondearla', () => {
      // Quien pide un instante concreto esta pidiendo ese instante; redondear
      // al dia le cambiaria la respuesta sin avisar.
      const rango = rangoEntreDias(
        '2026-08-27T14:00:00.000Z',
        '2026-08-27T16:00:00.000Z',
        'America/Mexico_City',
      );

      expect(rango?.gte.toISOString()).toBe('2026-08-27T14:00:00.000Z');
      expect(rango?.lte.toISOString()).toBe('2026-08-27T16:00:00.000Z');
    });

    it('devuelve null si alguno de los dos extremos no es una fecha', () => {
      expect(rangoEntreDias('2026-08-01', 'pasado', 'UTC')).toBeNull();
      expect(rangoEntreDias('cuando sea', '2026-08-31', 'UTC')).toBeNull();
    });

    it('esSoloFecha distingue el dia suelto de la marca completa', () => {
      expect(esSoloFecha('2026-08-27')).toBe(true);
      expect(esSoloFecha('2026-08-27T14:00:00Z')).toBe(false);
      expect(esSoloFecha(new Date())).toBe(false);
    });
  });
});
