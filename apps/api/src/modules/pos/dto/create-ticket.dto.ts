import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketModifierDto {
  @IsString()
  modifierId!: string;

  @IsNumber()
  priceDelta!: number;
}

export class CreateTicketLineDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketModifierDto)
  modifiers?: CreateTicketModifierDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTicketDto {
  /**
   * Clave de idempotencia generada por el cliente.
   *
   * La cola de sincronizacion offline reintenta lo que fallo, y no puede
   * distinguir "no se creo" de "se creo y no me entere" cuando la red cae
   * despues de que el servidor respondiera. Mandando el mismo valor en cada
   * reintento, el segundo devuelve el ticket que ya existe en vez de cobrar la
   * venta otra vez.
   */
  @IsOptional()
  @IsString()
  clientRequestId?: string;

  @IsString()
  locationId!: string;

  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTicketLineDto)
  lines!: CreateTicketLineDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  // When true (and customerId set), the backend validates the customer's
  // loyalty points and applies the 9+1 reward discount server-side.
  @IsOptional()
  @IsBoolean()
  redeemLoyalty?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
