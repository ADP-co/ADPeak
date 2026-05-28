import { IsString, MinLength } from 'class-validator';

export class CreateActividadDto {
  @IsString()
  @MinLength(2)
  nombre: string;
}
