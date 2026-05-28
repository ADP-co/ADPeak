import { IsString, MinLength } from 'class-validator';

export class CreatePlantelDto {
  @IsString()
  @MinLength(2)
  nombre: string;
}
