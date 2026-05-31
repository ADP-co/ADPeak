import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePlantelDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  clave?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  municipio?: string;
}
