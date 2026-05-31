import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateResponsableDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usuarioId: number;

  @IsIn(['Indicador', 'Actividad', 'Plantel'])
  entidadTipo: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  entidadId: number;

  @IsIn(['Primario', 'Secundario'])
  tipoResponsabilidad: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;
}
