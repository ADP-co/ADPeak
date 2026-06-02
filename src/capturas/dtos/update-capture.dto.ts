import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCaptureDto {
  @IsObject()
  payload: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivoCambio?: string;
}
