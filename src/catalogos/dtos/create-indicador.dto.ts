import { IsString, MinLength } from 'class-validator';

export class CreateIndicadorDto {
  @IsString()
  @MinLength(2)
  nombre: string;
}
