import { IsString, MinLength } from 'class-validator';

export class CreateContribuyenteDto {
  @IsString()
  @MinLength(2)
  nombre: string;
}
