import { api, buildQueryString } from '@/lib/api';
import { PnLComparison, ProfitAndLoss } from '@/types';

interface PnLQueryParams {
  organization_id: string;
  start_date: string;
  end_date: string;
  location_id?: string;
}

interface MonthlyPnLParams {
  organization_id: string;
  year: number;
  month: number;
  location_id?: string;
}

interface YearlyPnLParams {
  organization_id: string;
  year: number;
  location_id?: string;
}

interface ComparePnLParams {
  organization_id: string;
  period1_start: string;
  period1_end: string;
  period2_start: string;
  period2_end: string;
  location_id?: string;
}

/**
 * Cliente del estado de resultados.
 *
 * Las cuatro llamadas armaban la query con `new URLSearchParams(params)`, que
 * convierte `undefined` en el TEXTO «undefined». Sin sucursal seleccionada
 * —que es como entra la pantalla— la petición salía con
 * `location_id=undefined` y el API respondía `404 Location undefined not
 * found`: el estado de resultados no cargaba nunca, sólo el cartel de error.
 *
 * `buildQueryString` descarta null, undefined y cadena vacía. Ya existía en
 * `lib/api` justamente por esto; aquí no se estaba usando.
 */
class PnLService {
  /**
   * Calculate P&L for a custom date range
   */
  async calculatePnL(params: PnLQueryParams): Promise<ProfitAndLoss> {
    return api.get<ProfitAndLoss>(`/finance/pnl${buildQueryString(params)}`);
  }

  /**
   * Calculate P&L for a specific month
   */
  async calculateMonthlyPnL(params: MonthlyPnLParams): Promise<ProfitAndLoss> {
    return api.get<ProfitAndLoss>(
      `/finance/pnl/monthly${buildQueryString(params)}`,
    );
  }

  /**
   * Calculate P&L for a full year
   */
  async calculateYearlyPnL(params: YearlyPnLParams): Promise<ProfitAndLoss> {
    return api.get<ProfitAndLoss>(
      `/finance/pnl/yearly${buildQueryString(params)}`,
    );
  }

  /**
   * Compare P&L between two periods
   */
  async comparePeriods(params: ComparePnLParams): Promise<PnLComparison> {
    return api.get<PnLComparison>(
      `/finance/pnl/compare${buildQueryString(params)}`,
    );
  }
}

export const pnlService = new PnLService();
