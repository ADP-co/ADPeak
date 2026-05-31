import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdateCicloPoaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  anio?: number;

  @IsOptional()
  @IsIn(['planeacion', 'abierto', 'cerrado'])
  estado?: string;
}
