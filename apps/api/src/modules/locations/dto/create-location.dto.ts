import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsArray,
  ValidateNested,
  MaxLength,
  Matches,
  Min,
  Max,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationStatus, LocationType } from '../interfaces';

export class LocationHoursDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  @Type(() => Number)
  day_of_week: number;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  open_time: string;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  close_time: string;

  @IsBoolean()
  is_closed: boolean;
}

export class LocationCoordinatesDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;
}

export class CreateLocationDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9-]+$/)
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsEnum(LocationType)
  type: LocationType;

  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address_line_2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postal_code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationCoordinatesDto)
  coordinates?: LocationCoordinatesDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationHoursDto)
  hours?: LocationHoursDto[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  seating_capacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max_occupancy?: number;

  @IsOptional()
  @IsUUID()
  manager_id?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  opening_date?: Date;

  @IsOptional()
  @IsBoolean()
  allow_online_orders?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_delivery?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_pickup?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_dine_in?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
