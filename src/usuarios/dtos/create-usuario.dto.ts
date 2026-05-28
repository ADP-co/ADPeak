import { IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(2)
  nombre: string;
}
