import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateActividadDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;
}
