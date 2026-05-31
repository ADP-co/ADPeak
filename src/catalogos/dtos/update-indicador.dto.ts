import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateIndicadorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  plantelId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  actividadId?: number;

  @IsOptional()
  @IsString()
  unidadMedida?: string;
}
