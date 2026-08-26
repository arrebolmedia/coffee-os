import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * Query DTOs for the P&L endpoints.
 *
 * Todas las fechas son obligatorias: un estado de resultados sobre un periodo
 * que el llamador no pidió es peor que un error. Sin estas validaciones el
 * controller construía `new Date(undefined)` ("Invalid Date") y Prisma
 * reventaba con PrismaClientValidationError -> 500.
 *
 * Una sola restricción por campo a propósito: el ValidationPipe global no usa
 * `stopAtFirstError`, así que varios decoradores sobre el mismo campo devuelven
 * una ristra de mensajes contradictorios cuando el parámetro simplemente falta
 * ("year must be <= 2100" para un year ausente). Los rangos (year 2000-2100,
 * month 1-12, start <= end) los valida PnLService, que lanza el mismo 400 con
 * el mismo texto — ver `assertValidYear` / `assertValidRange`.
 *
 * `organization_id` se acepta sólo por compatibilidad con clientes existentes
 * (y lo valida el TenantGuard global contra el JWT); los controllers NUNCA lo
 * usan — la organización siempre sale del token.
 */

const isoDate = (param: string) =>
  IsDateString(
    {},
    {
      message: `${param} is required and must be a valid ISO date (format: YYYY-MM-DD)`,
    },
  );

const yearInt = () =>
  IsInt({
    message: 'year is required and must be an integer between 2000 and 2100',
  });

class PnLScopeQueryDto {
  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsString()
  location_id?: string;
}

export class PnLRangeQueryDto extends PnLScopeQueryDto {
  @isoDate('start_date')
  start_date: string;

  @isoDate('end_date')
  end_date: string;
}

export class PnLMonthlyQueryDto extends PnLScopeQueryDto {
  @Type(() => Number)
  @yearInt()
  year: number;

  @Type(() => Number)
  @IsInt({
    message: 'month is required and must be an integer between 1 and 12',
  })
  month: number;
}

export class PnLYearlyQueryDto extends PnLScopeQueryDto {
  @Type(() => Number)
  @yearInt()
  year: number;
}

export class PnLCompareQueryDto extends PnLScopeQueryDto {
  @isoDate('period1_start')
  period1_start: string;

  @isoDate('period1_end')
  period1_end: string;

  @isoDate('period2_start')
  period2_start: string;

  @isoDate('period2_end')
  period2_end: string;
}
