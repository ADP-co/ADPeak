import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCicloPoaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;
}
