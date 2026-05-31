import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateActividadDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  indicadorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  plantelId?: number;
}
