import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePeriodoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;
}
