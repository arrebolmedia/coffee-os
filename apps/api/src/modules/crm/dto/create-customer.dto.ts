import { IsNotEmpty, IsString, IsEmail, IsOptional, IsDateString, IsBoolean, IsPhoneNumber } from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  preferred_language?: string; // es, en

  @IsOptional()
  @IsString()
  notes?: string;

  // LFPDPPP - Ley Federal de Protección de Datos Personales en Posesión de Particulares
  @IsBoolean()
  consent_marketing: boolean; // Consent for marketing communications

  @IsBoolean()
  consent_whatsapp: boolean; // Consent for WhatsApp messages

  @IsBoolean()
  consent_email: boolean; // Consent for email communications

  @IsBoolean()
  consent_sms: boolean; // Consent for SMS messages

  @IsOptional()
  @IsDateString()
  consent_date?: string; // Date consent was given

  @IsOptional()
  @IsString()
  consent_ip_address?: string; // IP address when consent was given

  // Customer preferences
  @IsOptional()
  @IsString()
  favorite_drink?: string;

  @IsOptional()
  @IsString()
  dietary_restrictions?: string; // lactose intolerant, vegan, etc.

  @IsOptional()
  @IsString()
  allergies?: string;
}
