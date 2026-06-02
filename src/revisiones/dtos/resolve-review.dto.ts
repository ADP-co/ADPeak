import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveReviewDto {
  @IsIn(['correccion_solicitada', 'aprobado', 'cerrado'])
  estado: 'correccion_solicitada' | 'aprobado' | 'cerrado';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentario?: string;
}
