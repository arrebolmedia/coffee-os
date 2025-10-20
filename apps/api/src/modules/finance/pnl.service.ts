import { Injectable } from '@nestjs/common';
import { ProfitAndLoss } from './interfaces';
import { ExpenseCategory } from './dto';

@Injectable()
export class PnLService {
  // Mock data sources - in production these would query actual data
  private mockRevenue: Map<string, any> = new Map();
  private mockCOGS: Map<string, any> = new Map();

  async calculatePnL(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    locationId?: string,
  ): Promise<ProfitAndLoss> {
    // In a real implementation, this would query:
    // 1. Transactions/Orders for revenue
    // 2. Recipe costs for COGS
    // 3. Expenses service for operating expenses
    // 4. HR service for labor costs

    // Mock calculation for demonstration
    const grossRevenue = 150000; // From POS transactions
    const discounts = 5000; // From discount module
    const returns = 1000; // From returns/refunds
    const netRevenue = grossRevenue - discounts - returns;

    const cogs = 40000; // From recipe costs * quantities sold
    const grossProfit = netRevenue - cogs;
    const grossMarginPercent = (grossProfit / netRevenue) * 100;

    // Operating Expenses (from Expenses service)
    const laborCost = 30000; // From HR payroll
    const rent = 20000;
    const utilities = 3000;
    const marketing = 2000;
    const supplies = 1500;
    const equipmentMaintenance = 1000;
    const insurance = 800;
    const permitsLicenses = 500;
    const professionalServices = 1200;
    const wasteManagement = 400;
    const security = 600;
    const otherExpenses = 800;

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
    const depreciation = 2000; // Equipment depreciation
    const amortization = 500; // Intangible assets
    const ebit = ebitda - depreciation - amortization;
    const interestExpense = 1000; // Loan interest
    const ebt = ebit - interestExpense;
    const taxes = ebt * 0.30; // 30% tax rate (ISR México)
    const netProfit = ebt - taxes;
    const netMarginPercent = (netProfit / netRevenue) * 100;

    // Key Metrics
    const laborPercent = (laborCost / netRevenue) * 100;
    const primeCost = cogs + laborCost;
    const primeCostPercent = (primeCost / netRevenue) * 100;

    // Break-even calculation
    // Break-even = Fixed Costs / (1 - Variable Cost %)
    const fixedCosts = rent + insurance + permitsLicenses + security;
    const variableCosts = cogs + supplies + utilities;
    const variableCostPercent = variableCosts / netRevenue;
    const breakEvenPoint = fixedCosts / (1 - variableCostPercent);

    const pnl: ProfitAndLoss = {
      organization_id: organizationId,
      location_id: locationId,
      period_start: startDate,
      period_end: endDate,
      gross_revenue: grossRevenue,
      discounts: discounts,
      returns: returns,
      net_revenue: netRevenue,
      cogs: cogs,
      gross_profit: grossProfit,
      gross_margin_percent: Math.round(grossMarginPercent * 10) / 10,
      labor_cost: laborCost,
      rent: rent,
      utilities: utilities,
      marketing: marketing,
      supplies: supplies,
      equipment_maintenance: equipmentMaintenance,
      insurance: insurance,
      permits_licenses: permitsLicenses,
      professional_services: professionalServices,
      waste_management: wasteManagement,
      security: security,
      other_expenses: otherExpenses,
      total_operating_expenses: totalOperatingExpenses,
      ebitda: ebitda,
      depreciation: depreciation,
      amortization: amortization,
      ebit: ebit,
      interest_expense: interestExpense,
      ebt: ebt,
      taxes: Math.round(taxes),
      net_profit: Math.round(netProfit),
      net_margin_percent: Math.round(netMarginPercent * 10) / 10,
      labor_percent: Math.round(laborPercent * 10) / 10,
      prime_cost: primeCost,
      prime_cost_percent: Math.round(primeCostPercent * 10) / 10,
      break_even_point: Math.round(breakEvenPoint),
    };

    return pnl;
  }

  async calculateMonthlyPnL(organizationId: string, year: number, month: number, locationId?: string): Promise<ProfitAndLoss> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    return this.calculatePnL(organizationId, startDate, endDate, locationId);
  }

  async calculateYearlyPnL(organizationId: string, year: number, locationId?: string): Promise<ProfitAndLoss> {
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
    const pnl1 = await this.calculatePnL(organizationId, period1Start, period1End, locationId);
    const pnl2 = await this.calculatePnL(organizationId, period2Start, period2End, locationId);

    return {
      period1: pnl1,
      period2: pnl2,
      changes: {
        revenue_change: pnl2.net_revenue - pnl1.net_revenue,
        revenue_change_percent: ((pnl2.net_revenue - pnl1.net_revenue) / pnl1.net_revenue) * 100,
        profit_change: pnl2.net_profit - pnl1.net_profit,
        profit_change_percent: ((pnl2.net_profit - pnl1.net_profit) / pnl1.net_profit) * 100,
        margin_change: pnl2.net_margin_percent - pnl1.net_margin_percent,
      },
    };
  }
}
