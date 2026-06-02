import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateContribuyenteDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  responsableId?: number;

  @IsOptional()
  @IsIn(['Indicador', 'Actividad', 'Plantel'])
  entidadTipo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entidadId?: number;
}
