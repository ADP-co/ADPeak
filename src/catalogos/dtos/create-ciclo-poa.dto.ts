import { IsString, MinLength } from 'class-validator';

export class CreateCicloPoaDto {
  @IsString()
  @MinLength(2)
  nombre: string;
}
