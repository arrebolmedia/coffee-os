import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProfitAndLoss } from './interfaces';
import { calcularIsr, esRegimen, RegimenFiscal } from './isr';
import { finDelDia, inicioDelDia } from '../../common/time/day-range';
import { zonaDelNegocio } from '../../common/time/zona-negocio';

// Las tasas y la tabla de RESICO viven en `isr.ts`, que es lógica pura y el
// único sitio que hay que auditar —o enseñarle al contador— para saber con qué
// se está calculando el impuesto.

/** Dónde viven los ajustes fiscales, con el mismo esquema que el resto. */
const AJUSTE_ISR = { categoria: 'finance', clave: 'isr_rate' } as const;
const AJUSTE_REGIMEN = {
  categoria: 'finance',
  clave: 'regimen_fiscal',
} as const;

/**
 * Régimen que se supone cuando no hay ninguno configurado.
 *
 * Persona moral no porque sea lo más probable en una cafetería —no lo es— sino
 * porque es lo que el sistema venía calculando: cambiar el valor por defecto
 * movería en silencio todos los informes históricos. La respuesta marca que es
 * un supuesto para que nadie lo lea como un dato.
 */
const REGIMEN_POR_DEFECTO: RegimenFiscal = 'persona_moral';

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

@Injectable()
export class PnLService {
  constructor(private readonly prisma: PrismaService) {}

  /** Round to 2 decimal places preserving cents. */
  private r2(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Number(value.toFixed(2));
  }

  /**
   * Defense in depth: nunca dejar que un Date inválido llegue a Prisma.
   * `new Date(undefined)` / `new Date('hola')` producen "Invalid Date" y
   * prisma.ticket.aggregate() lanza PrismaClientValidationError -> 500.
   * Aquí se convierte en un 400 con el nombre del parámetro culpable.
   */
  private assertValidDate(value: Date, param: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new BadRequestException(
        `${param} is required and must be a valid ISO date (format: YYYY-MM-DD)`,
      );
    }
  }

  /**
   * Comprueba que el rango tenga sentido. Acepta texto además de `Date`, porque
   * los extremos llegan como `YYYY-MM-DD` desde el controlador y el recorte por
   * zona horaria se hace después, ya dentro de `calculatePnL`. Aquí sólo
   * interesa el orden y que sean fechas de verdad.
   */
  private assertValidRange(
    inicio: Date | string,
    fin: Date | string,
    startParam: string,
    endParam: string,
  ): void {
    const startDate = inicio instanceof Date ? inicio : new Date(inicio);
    const endDate = fin instanceof Date ? fin : new Date(fin);
    this.assertValidDate(startDate, startParam);
    this.assertValidDate(endDate, endParam);
    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException(
        `${startParam} must be earlier than or equal to ${endParam}`,
      );
    }
  }

  private assertValidYear(year: number, param = 'year'): void {
    if (!Number.isInteger(year) || year < YEAR_MIN || year > YEAR_MAX) {
      throw new BadRequestException(
        `${param} is required and must be an integer between ${YEAR_MIN} and ${YEAR_MAX}`,
      );
    }
  }

  /**
   * El estado de resultados de un periodo.
   *
   * `startDate` y `endDate` aceptan `YYYY-MM-DD` además de un `Date`. Con la
   * fecha suelta, el periodo se recorta en la zona de la cafetería: del primer
   * instante del primer día al último del último.
   *
   * Hacía falta porque el controlador pasaba `new Date('2026-08-27')` para los
   * dos extremos y salía un rango de ancho cero — el P&L de un solo día, que es
   * como lo mira un dueño cada noche, devolvía todo en cero. Y los informes
   * mensual y anual construían su rango con `new Date(año, mes, 1)`, en hora del
   * servidor: dentro de un contenedor, «agosto» empezaba a las 18:00 del 31 de
   * julio.
   *
   * Un `Date` se sigue respetando tal cual: quien pide un instante concreto
   * está pidiendo ese instante.
   */
  async calculatePnL(
    organizationId: string,
    desde: Date | string,
    hasta: Date | string,
    locationId?: string,
  ): Promise<ProfitAndLoss> {
    const zonaDelPeriodo = await zonaDelNegocio(this.prisma, {
      organizationId,
      locationId,
    });

    const inicio =
      typeof desde === 'string' ? inicioDelDia(desde, zonaDelPeriodo) : desde;
    const fin =
      typeof hasta === 'string' ? finDelDia(hasta, zonaDelPeriodo) : hasta;

    if (!inicio) {
      throw new BadRequestException(
        'start_date is required and must be a valid ISO date (format: YYYY-MM-DD)',
      );
    }
    if (!fin) {
      throw new BadRequestException(
        'end_date is required and must be a valid ISO date (format: YYYY-MM-DD)',
      );
    }

    const startDate: Date = inicio;
    const endDate: Date = fin;
    this.assertValidRange(startDate, endDate, 'start_date', 'end_date');

    // Multi-tenant guard: if a locationId is provided, it must belong to the
    // caller's organization (404 otherwise — don't leak existence).
    if (locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        select: { id: true, organizationId: true },
      });
      if (!location || location.organizationId !== organizationId) {
        throw new NotFoundException(`Location ${locationId} not found`);
      }
    }

    // Resolve locationIds for this org in range
    const locationWhere: any = { organizationId };
    if (locationId) locationWhere.id = locationId;
    const locations = await this.prisma.location.findMany({
      where: locationWhere,
      select: { id: true },
    });
    const locationIds = locations.map((l) => l.id);

    // Revenue from closed tickets
    const revenueAgg = await this.prisma.ticket.aggregate({
      where: {
        locationId: { in: locationIds },
        status: 'CLOSED' as any,
        closedAt: { gte: startDate, lte: endDate },
      },
      _sum: { total: true, discount: true, subtotal: true },
    });

    const grossRevenue = revenueAgg._sum.subtotal ?? 0;
    const discounts = revenueAgg._sum.discount ?? 0;
    const returns = 0;
    const netRevenue = grossRevenue - returns;

    // COGS: real cost from closed ticket lines in period (quantity * product.cost)
    let cogs = 0;
    let cogsEstimated = false;
    try {
      const ticketLines = await this.prisma.ticketLine.findMany({
        where: {
          ticket: {
            locationId: { in: locationIds },
            status: 'CLOSED' as any,
            closedAt: { gte: startDate, lte: endDate },
          },
        },
        select: {
          quantity: true,
          product: { select: { cost: true } },
        },
      });
      for (const line of ticketLines) {
        const cost = line.product?.cost;
        if (cost === null || cost === undefined) {
          // Null cost contributes 0 but flags the response.
          cogsEstimated = true;
          continue;
        }
        cogs += (line.quantity ?? 0) * cost;
      }
    } catch {
      // If ticketLine query fails for any reason, fall back to flagged value.
      cogsEstimated = true;
      cogs = 0;
    }

    const grossProfit = netRevenue - cogs;
    const grossMarginPercent =
      netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    // Operating expenses from Expense table (paid expenses in period)
    const expenseGroups = await this.prisma.expense.groupBy({
      by: ['category'],
      where: {
        organizationId,
        ...(locationId ? { locationId } : {}),
        status: 'PAID' as any,
        paidDate: { gte: startDate, lte: endDate },
      },
      _sum: { totalAmount: true },
    });

    const expenseByCategory = expenseGroups.reduce(
      (acc, row) => {
        acc[row.category] = row._sum.totalAmount ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    const get = (cat: string) => expenseByCategory[cat] ?? 0;

    const laborCost = get('LABOR');
    const rent = get('RENT');
    const utilities = get('UTILITIES');
    const marketing = get('MARKETING');
    const supplies = get('SUPPLIES');
    const equipmentMaintenance = get('EQUIPMENT');
    const insurance = get('INSURANCE');
    const permitsLicenses = get('PERMITS_LICENSES');
    const professionalServices = get('PROFESSIONAL_SERVICES');
    const wasteManagement = get('WASTE_MANAGEMENT');
    const security = get('SECURITY');
    const otherExpenses = get('OTHER') + get('TAXES');

    const totalOperatingExpenses =
      laborCost +
      rent +
      utilities +
      marketing +
      supplies +
      equipmentMaintenance +
      insurance +
      permitsLicenses +
      professionalServices +
      wasteManagement +
      security +
      otherExpenses;

    const ebitda = grossProfit - totalOperatingExpenses;
    const depreciation = 0;
    const amortization = 0;
    const ebit = ebitda - depreciation - amortization;
    const interestExpense = 0;
    const ebt = ebit - interestExpense;

    // El impuesto depende del régimen: RESICO grava los ingresos cobrados y
    // persona moral la utilidad. Antes había una sola fórmula —30 % sobre la
    // utilidad— aplicada a todos por igual.
    const { regimen, tasaFija, ajustesPorDefecto } =
      await this.resolveRegimenFiscal(organizationId);

    const dias = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
    );

    const isr = calcularIsr({
      regimen,
      ingresos: netRevenue,
      utilidad: ebt,
      dias,
      tasaFija,
    });

    const taxesAmount = isr.impuesto;
    const netProfit = ebt - taxesAmount;
    const netMarginPercent =
      netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    const laborPercent = netRevenue > 0 ? (laborCost / netRevenue) * 100 : 0;
    const primeCost = cogs + laborCost;
    const primeCostPercent =
      netRevenue > 0 ? (primeCost / netRevenue) * 100 : 0;

    const fixedCosts = rent + insurance + permitsLicenses + security;
    const variableCosts = cogs + supplies + utilities;
    const variableCostRatio = netRevenue > 0 ? variableCosts / netRevenue : 0;

    let breakEvenPoint: number | null = null;
    let breakEvenNotReachable = false;
    if (variableCostRatio < 1 && fixedCosts > 0) {
      breakEvenPoint = this.r2(fixedCosts / (1 - variableCostRatio));
    } else if (fixedCosts > 0 && variableCostRatio >= 1) {
      breakEvenPoint = null;
      breakEvenNotReachable = true;
    } else {
      breakEvenPoint = 0;
    }

    return {
      organization_id: organizationId,
      location_id: locationId,
      period_start: startDate,
      period_end: endDate,
      gross_revenue: this.r2(grossRevenue),
      discounts: this.r2(discounts),
      returns: this.r2(returns),
      net_revenue: this.r2(netRevenue),
      cogs: this.r2(cogs),
      gross_profit: this.r2(grossProfit),
      gross_margin_percent: this.r2(grossMarginPercent),
      labor_cost: this.r2(laborCost),
      rent: this.r2(rent),
      utilities: this.r2(utilities),
      marketing: this.r2(marketing),
      supplies: this.r2(supplies),
      equipment_maintenance: this.r2(equipmentMaintenance),
      insurance: this.r2(insurance),
      permits_licenses: this.r2(permitsLicenses),
      professional_services: this.r2(professionalServices),
      waste_management: this.r2(wasteManagement),
      security: this.r2(security),
      other_expenses: this.r2(otherExpenses),
      total_operating_expenses: this.r2(totalOperatingExpenses),
      ebitda: this.r2(ebitda),
      depreciation: this.r2(depreciation),
      amortization: this.r2(amortization),
      ebit: this.r2(ebit),
      interest_expense: this.r2(interestExpense),
      ebt: this.r2(ebt),
      taxes: this.r2(taxesAmount),
      tax_rate: isr.tasa,
      tax_regime: regimen,
      tax_basis: isr.base,
      net_profit: this.r2(netProfit),
      net_margin_percent: this.r2(netMarginPercent),
      labor_percent: this.r2(laborPercent),
      prime_cost: this.r2(primeCost),
      prime_cost_percent: this.r2(primeCostPercent),
      break_even_point: breakEvenPoint,
      cogs_estimated: cogsEstimated || undefined,
      tax_rate_default_used: ajustesPorDefecto || undefined,
      break_even_not_reachable: breakEvenNotReachable || undefined,
    };
  }

  /**
   * El régimen fiscal del negocio y, si aplica, su tasa.
   *
   * Antes esto devolvía siempre el 30 % con un TODO que decía que no había
   * dónde guardarlo. Sí lo había: la tabla `settings`, con la misma forma
   * (organización + categoría + clave) que ya usa la configuración de descuento
   * automático de inventario.
   *
   * Y el problema era más de fondo que la tasa: el 30 % sobre la utilidad es la
   * fórmula de persona moral. En RESICO el impuesto sale de los ingresos
   * cobrados y con otra tabla, así que no bastaba con hacer configurable el
   * número — hacía falta poder decir en qué régimen se tributa.
   *
   * Nada de lo que se lea aquí puede tumbar el informe: un régimen que no se
   * reconozca o una consulta que falle caen en el valor por defecto, marcado
   * como supuesto.
   */
  private async resolveRegimenFiscal(organizationId: string): Promise<{
    regimen: RegimenFiscal;
    tasaFija?: number;
    ajustesPorDefecto: boolean;
  }> {
    try {
      const ajustes = await this.prisma.setting.findMany({
        where: {
          organizationId,
          category: AJUSTE_ISR.categoria,
          key: { in: [AJUSTE_ISR.clave, AJUSTE_REGIMEN.clave] },
        },
        select: { key: true, value: true },
      });

      const porClave = new Map(ajustes.map((a) => [a.key, a.value]));
      const crudoRegimen = this.desenvolver(porClave.get(AJUSTE_REGIMEN.clave));
      const tasaFija =
        this.leerTasa(porClave.get(AJUSTE_ISR.clave)) ?? undefined;

      if (esRegimen(crudoRegimen)) {
        return { regimen: crudoRegimen, tasaFija, ajustesPorDefecto: false };
      }

      // Compatibilidad: quien ya tenía una tasa configurada y ningún régimen
      // estaba pidiendo justo eso, una tasa fija sobre la utilidad.
      if (tasaFija !== undefined) {
        return { regimen: 'tasa_fija', tasaFija, ajustesPorDefecto: false };
      }
    } catch {
      // Un fallo al leer la configuración no puede dejar sin estado de
      // resultados: se sigue con el supuesto, ya marcado como tal.
    }

    return { regimen: REGIMEN_POR_DEFECTO, ajustesPorDefecto: true };
  }

  /** El valor de un ajuste, venga suelto o envuelto en `{ value: ... }`. */
  private desenvolver(value: unknown): unknown {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>).value
      : value;
  }

  /**
   * Interpreta el valor guardado como tasa.
   *
   * El `value` de un ajuste es Json, así que puede llegar como número, como
   * texto o envuelto en un objeto `{ value: ... }`. Sólo se acepta una fracción
   * entre 0 y 1: un 30 escrito pensando en «30 %» daría un impuesto de treinta
   * veces la utilidad, que es el mismo error que ya costó caro en el IVA de los
   * productos.
   */
  private leerTasa(value: unknown): number | null {
    const crudo = this.desenvolver(value);
    const numero =
      typeof crudo === 'string' && crudo.trim() !== '' ? Number(crudo) : crudo;

    if (typeof numero !== 'number' || !Number.isFinite(numero)) return null;
    if (numero < 0 || numero > 1) return null;

    return numero;
  }

  async calculateMonthlyPnL(
    organizationId: string,
    year: number,
    month: number,
    locationId?: string,
  ): Promise<ProfitAndLoss> {
    this.assertValidYear(year);
    // Sin este check, month=99 rodaba silenciosamente a marzo de 2034 y
    // month=0 a diciembre del año anterior: un P&L de un periodo que nadie pidió.
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException(
        'month is required and must be an integer between 1 and 12',
      );
    }

    // Las fechas van como texto para que el periodo se recorte en la zona de
    // la cafeteria y no en la del servidor: con `new Date(anio, mes, 1)`,
    // dentro de un contenedor en UTC, «agosto» empezaba a las 18:00 del 31 de
    // julio.
    const mm = String(month).padStart(2, '0');
    const ultimoDia = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return this.calculatePnL(
      organizationId,
      `${year}-${mm}-01`,
      `${year}-${mm}-${String(ultimoDia).padStart(2, '0')}`,
      locationId,
    );
  }

  async calculateYearlyPnL(
    organizationId: string,
    year: number,
    locationId?: string,
  ): Promise<ProfitAndLoss> {
    this.assertValidYear(year);

    // Igual que el mensual: el anio es el de la cafeteria.
    return this.calculatePnL(
      organizationId,
      `${year}-01-01`,
      `${year}-12-31`,
      locationId,
    );
  }

  async comparePeriods(
    organizationId: string,
    period1Start: Date | string,
    period1End: Date | string,
    period2Start: Date | string,
    period2End: Date | string,
    locationId?: string,
  ): Promise<any> {
    this.assertValidRange(
      period1Start,
      period1End,
      'period1_start',
      'period1_end',
    );
    this.assertValidRange(
      period2Start,
      period2End,
      'period2_start',
      'period2_end',
    );

    const [pnl1, pnl2] = await Promise.all([
      this.calculatePnL(organizationId, period1Start, period1End, locationId),
      this.calculatePnL(organizationId, period2Start, period2End, locationId),
    ]);

    return {
      period1: pnl1,
      period2: pnl2,
      changes: {
        revenue_change: pnl2.net_revenue - pnl1.net_revenue,
        revenue_change_percent:
          pnl1.net_revenue > 0
            ? ((pnl2.net_revenue - pnl1.net_revenue) / pnl1.net_revenue) * 100
            : 0,
        profit_change: pnl2.net_profit - pnl1.net_profit,
        profit_change_percent:
          pnl1.net_profit !== 0
            ? ((pnl2.net_profit - pnl1.net_profit) /
                Math.abs(pnl1.net_profit)) *
              100
            : 0,
        margin_change: pnl2.net_margin_percent - pnl1.net_margin_percent,
      },
    };
  }
}
