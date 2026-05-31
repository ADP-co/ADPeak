import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreatePeriodoDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;
}
