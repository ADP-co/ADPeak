import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateResponsableDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usuarioId?: number;

  @IsOptional()
  @IsIn(['Indicador', 'Actividad', 'Plantel'])
  entidadTipo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entidadId?: number;

  @IsOptional()
  @IsIn(['Primario', 'Secundario'])
  tipoResponsabilidad?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;
}
