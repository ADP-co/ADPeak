import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateContribuyenteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;
}
