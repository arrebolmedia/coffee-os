import {
  calcularIsr,
  esRegimen,
  TABLA_RESICO_PF,
  TASA_PERSONA_MORAL,
  tasaResico,
} from '../isr';

/**
 * El ISR por régimen.
 *
 * Antes había una sola fórmula, 30 % sobre la utilidad, que es la de persona
 * moral. Para un negocio en RESICO no es una imprecisión sino otro impuesto:
 * se calcula sobre los ingresos cobrados y con otra tasa.
 */
describe('ISR por régimen fiscal', () => {
  describe('RESICO de persona física', () => {
    const resico = (ingresos: number, dias = 30) =>
      calcularIsr({ regimen: 'resico_pf', ingresos, utilidad: 0, dias });

    it('grava los ingresos, no la utilidad', () => {
      // Un negocio que factura 20.000 y pierde dinero igual paga ISR en RESICO.
      const r = calcularIsr({
        regimen: 'resico_pf',
        ingresos: 20_000,
        utilidad: -5_000,
        dias: 30,
      });

      expect(r.base).toBe('ingresos');
      expect(r.impuesto).toBeCloseTo(200, 2); // 1 % de 20.000
    });

    it('aplica el 1 % en el primer tramo', () => {
      expect(resico(20_000).tasa).toBe(0.01);
      expect(resico(20_000).impuesto).toBeCloseTo(200, 2);
    });

    it('la tasa NO es marginal: se aplica a todo el ingreso', () => {
      // Es la particularidad del régimen. Con 60.000 al mes la tasa es 1.5 %
      // sobre los 60.000 enteros, no por escalones.
      const r = resico(60_000);

      expect(r.tasa).toBe(0.015);
      expect(r.impuesto).toBeCloseTo(900, 2);
    });

    it('sube de tramo justo al pasar el límite', () => {
      expect(tasaResico(25_000)).toBe(0.01);
      expect(tasaResico(25_000.01)).toBe(0.011);
      expect(tasaResico(50_000)).toBe(0.011);
      expect(tasaResico(50_000.01)).toBe(0.015);
    });

    it('por encima del techo del régimen sigue calculando con la última tasa', () => {
      // 291.666,67 al mes son los 3,5 millones anuales que marcan el techo.
      // Quien avisa de que se salió del régimen es el contador, no el informe.
      expect(tasaResico(500_000)).toBe(0.025);
    });

    it('sin ingresos no hay impuesto', () => {
      expect(resico(0).impuesto).toBe(0);
    });

    it('una pérdida no genera impuesto negativo', () => {
      const r = calcularIsr({
        regimen: 'resico_pf',
        ingresos: 0,
        utilidad: -10_000,
        dias: 30,
      });

      expect(r.impuesto).toBe(0);
    });

    describe('el tramo se busca con el equivalente mensual', () => {
      it('un año de ingresos no se va al último tramo por ser un año', () => {
        // 240.000 en 365 días son 20.000 al mes: primer tramo, 1 %. Buscando el
        // tramo con el acumulado anual saldría 2 %, el doble.
        const r = calcularIsr({
          regimen: 'resico_pf',
          ingresos: 240_000,
          utilidad: 0,
          dias: 365,
        });

        expect(r.tasa).toBe(0.01);
        expect(r.impuesto).toBeCloseTo(2_400, 2);
      });

      it('una semana buena no dispara la tasa de todo el mes', () => {
        // 20.000 en 7 días equivalen a ~87.000 al mes: cuarto tramo.
        const r = calcularIsr({
          regimen: 'resico_pf',
          ingresos: 20_000,
          utilidad: 0,
          dias: 7,
        });

        expect(r.tasa).toBe(0.02);
      });

      it('con un mes de calendario el ajuste es prácticamente neutro', () => {
        // Es el caso normal: la pantalla filtra por año y mes.
        expect(
          calcularIsr({
            regimen: 'resico_pf',
            ingresos: 24_000,
            utilidad: 0,
            dias: 31,
          }).tasa,
        ).toBe(0.01);
      });

      it('un periodo sin días no revienta', () => {
        const r = calcularIsr({
          regimen: 'resico_pf',
          ingresos: 20_000,
          utilidad: 0,
          dias: 0,
        });

        expect(r.impuesto).toBeCloseTo(200, 2);
      });
    });
  });

  describe('persona moral', () => {
    it('aplica el 30 % sobre la utilidad', () => {
      const r = calcularIsr({
        regimen: 'persona_moral',
        ingresos: 100_000,
        utilidad: 10_000,
        dias: 30,
      });

      expect(r.base).toBe('utilidad');
      expect(r.tasa).toBe(TASA_PERSONA_MORAL);
      expect(r.impuesto).toBeCloseTo(3_000, 2);
    });

    it('sin utilidad no hay impuesto, por mucho que se facture', () => {
      const r = calcularIsr({
        regimen: 'persona_moral',
        ingresos: 500_000,
        utilidad: -1,
        dias: 30,
      });

      expect(r.impuesto).toBe(0);
    });
  });

  describe('tasa fija', () => {
    it('usa la tasa que diga el contador, sobre la utilidad', () => {
      const r = calcularIsr({
        regimen: 'tasa_fija',
        ingresos: 100_000,
        utilidad: 10_000,
        dias: 30,
        tasaFija: 0.12,
      });

      expect(r.tasa).toBe(0.12);
      expect(r.impuesto).toBeCloseTo(1_200, 2);
      expect(r.base).toBe('utilidad');
    });

    it('sin tasa configurada cae en la de persona moral', () => {
      const r = calcularIsr({
        regimen: 'tasa_fija',
        ingresos: 100_000,
        utilidad: 10_000,
        dias: 30,
      });

      expect(r.tasa).toBe(TASA_PERSONA_MORAL);
    });

    it('tasa 0 es una tasa, no «sin configurar»', () => {
      const r = calcularIsr({
        regimen: 'tasa_fija',
        ingresos: 100_000,
        utilidad: 10_000,
        dias: 30,
        tasaFija: 0,
      });

      expect(r.tasa).toBe(0);
      expect(r.impuesto).toBe(0);
    });
  });

  describe('la diferencia entre regímenes no es un matiz', () => {
    it('el mismo mes paga muy distinto según el régimen', () => {
      const mes = { ingresos: 120_000, utilidad: 30_000, dias: 30 };

      const moral = calcularIsr({ regimen: 'persona_moral', ...mes });
      const resico = calcularIsr({ regimen: 'resico_pf', ...mes });

      expect(moral.impuesto).toBeCloseTo(9_000, 2); // 30 % de la utilidad
      expect(resico.impuesto).toBeCloseTo(2_400, 2); // 2 % de los ingresos

      // Casi cuatro veces. Aplicar el régimen de otro no es redondear.
      expect(moral.impuesto / resico.impuesto).toBeGreaterThan(3);
    });
  });

  describe('esRegimen', () => {
    it('reconoce los tres que sabe calcular', () => {
      expect(esRegimen('resico_pf')).toBe(true);
      expect(esRegimen('persona_moral')).toBe(true);
      expect(esRegimen('tasa_fija')).toBe(true);
    });

    it('rechaza cualquier otra cosa', () => {
      expect(esRegimen('resico')).toBe(false);
      expect(esRegimen('')).toBe(false);
      expect(esRegimen(null)).toBe(false);
      expect(esRegimen(0.3)).toBe(false);
    });
  });

  describe('la tabla', () => {
    it('va de menor a mayor, que es de lo que depende la búsqueda del tramo', () => {
      const limites = TABLA_RESICO_PF.map((t) => t.hastaIngresoMensual);
      const tasas = TABLA_RESICO_PF.map((t) => t.tasa);

      expect([...limites].sort((a, b) => a - b)).toEqual(limites);
      expect([...tasas].sort((a, b) => a - b)).toEqual(tasas);
    });
  });
});
