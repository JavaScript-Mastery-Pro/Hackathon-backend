import { Type } from 'class-transformer';
import {
  IsString,
  MinLength,
  MaxLength,
  MinDate,
  IsOptional,
  IsBoolean,
  IsDate,
} from 'class-validator';

export class CreateHackathonDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @Type(() => Date)
  @IsDate()
  @MinDate(new Date(), {
    message: 'Start date must be in the future',
  })
  startsAt: Date;

  @Type(() => Date)
  @IsDate()
  @MinDate(new Date(), {
    message: 'End date must be in the future',
  })
  endsAt: Date;

  @IsOptional()
  @IsBoolean()
  isActive: boolean;
}
