import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { actorFromHeaders } from '../auth/request-actor';
import { CapturasService } from '../capturas/capturas.service';
import { ResolveReviewDto } from './dtos/resolve-review.dto';

@Controller('revisiones')
export class RevisionesController {
  constructor(private readonly capturasService: CapturasService) {}

  @Get()
  findForReview(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.capturasService.listForReview(actorFromHeaders(headers));
  }

  @Post(':capturaId/resolver')
  resolve(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('capturaId', ParseIntPipe) capturaId: number,
    @Body() dto: ResolveReviewDto,
  ) {
    return this.capturasService.resolveReview(
      capturaId,
      actorFromHeaders(headers),
      dto.estado,
      dto.comentario,
    );
  }
}
