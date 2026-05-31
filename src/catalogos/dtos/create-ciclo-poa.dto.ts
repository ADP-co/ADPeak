import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateCicloPoaDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  anio: number;

  @IsOptional()
  @IsIn(['planeacion', 'abierto', 'cerrado'])
  estado?: string;
}
