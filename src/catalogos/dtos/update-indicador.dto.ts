import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateIndicadorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;
}
