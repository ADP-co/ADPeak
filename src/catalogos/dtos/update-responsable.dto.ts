import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateResponsableDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;
}
