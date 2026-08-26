import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProfitAndLoss } from './interfaces';

const DEFAULT_TAX_RATE = 0.3;
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

  private assertValidRange(
    startDate: Date,
    endDate: Date,
    startParam: string,
    endParam: string,
  ): void {
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

  async calculatePnL(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    locationId?: string,
  ): Promise<ProfitAndLoss> {
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

    // Tax rate: try org settings, fall back to DEFAULT_TAX_RATE.
    const { taxRate, taxRateDefaultUsed } =
      await this.resolveTaxRate(organizationId);

    const taxesAmount = ebt > 0 ? ebt * taxRate : 0;
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
      net_profit: this.r2(netProfit),
      net_margin_percent: this.r2(netMarginPercent),
      labor_percent: this.r2(laborPercent),
      prime_cost: this.r2(primeCost),
      prime_cost_percent: this.r2(primeCostPercent),
      break_even_point: breakEvenPoint,
      cogs_estimated: cogsEstimated || undefined,
      tax_rate_default_used: taxRateDefaultUsed || undefined,
      break_even_not_reachable: breakEvenNotReachable || undefined,
    };
  }

  /**
   * Resolve the corporate income-tax rate. The Organization model has no
   * settings column in the current schema, so we always use DEFAULT_TAX_RATE
   * (0.30) and flag the response so callers know the default was used.
   *
   * TODO(schema): agregar Organization.settings Json para tax rate configurable
   */
  private async resolveTaxRate(
    _organizationId: string,
  ): Promise<{ taxRate: number; taxRateDefaultUsed: boolean }> {
    return { taxRate: DEFAULT_TAX_RATE, taxRateDefaultUsed: true };
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

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    return this.calculatePnL(organizationId, startDate, endDate, locationId);
  }

  async calculateYearlyPnL(
    organizationId: string,
    year: number,
    locationId?: string,
  ): Promise<ProfitAndLoss> {
    this.assertValidYear(year);

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    return this.calculatePnL(organizationId, startDate, endDate, locationId);
  }

  async comparePeriods(
    organizationId: string,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date,
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
