import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsEmail()
  email: string;

  @IsIn(['Admin', 'Responsable', 'Plantel'])
  rol: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  plantelId?: number;
}
