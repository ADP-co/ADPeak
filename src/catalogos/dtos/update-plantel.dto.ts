import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePlantelDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;
}
