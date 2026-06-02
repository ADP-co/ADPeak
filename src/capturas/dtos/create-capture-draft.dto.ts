import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCaptureDraftDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  plantelId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  indicadorId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodoId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  actividadId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  responsableId?: number;

  @IsObject()
  payload: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivoCambio?: string;
}
