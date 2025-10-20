import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordDenominationDto {
  @ApiProperty({ description: 'Count of 1000 bills', default: 0 })
  @IsNumber()
  @Min(0)
  1000: number;

  @ApiProperty({ description: 'Count of 500 bills', default: 0 })
  @IsNumber()
  @Min(0)
  500: number;

  @ApiProperty({ description: 'Count of 200 bills', default: 0 })
  @IsNumber()
  @Min(0)
  200: number;

  @ApiProperty({ description: 'Count of 100 bills', default: 0 })
  @IsNumber()
  @Min(0)
  100: number;

  @ApiProperty({ description: 'Count of 50 bills', default: 0 })
  @IsNumber()
  @Min(0)
  50: number;

  @ApiProperty({ description: 'Count of 20 bills', default: 0 })
  @IsNumber()
  @Min(0)
  20: number;

  @ApiProperty({ description: 'Count of 10 coins', default: 0 })
  @IsNumber()
  @Min(0)
  10: number;

  @ApiProperty({ description: 'Count of 5 coins', default: 0 })
  @IsNumber()
  @Min(0)
  5: number;

  @ApiProperty({ description: 'Count of 2 coins', default: 0 })
  @IsNumber()
  @Min(0)
  2: number;

  @ApiProperty({ description: 'Count of 1 coins', default: 0 })
  @IsNumber()
  @Min(0)
  1: number;

  @ApiProperty({ description: 'Count of 0.50 coins', default: 0 })
  @IsNumber()
  @Min(0)
  0.5: number;
}
