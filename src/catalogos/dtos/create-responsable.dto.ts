import { IsString, MinLength } from 'class-validator';

export class CreateResponsableDto {
  @IsString()
  @MinLength(2)
  nombre: string;
}
