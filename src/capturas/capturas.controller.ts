import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { actorFromHeaders } from '../auth/request-actor';
import { CapturasService } from './capturas.service';
import { CreateCaptureDraftDto } from './dtos/create-capture-draft.dto';
import { UpdateCaptureDto } from './dtos/update-capture.dto';

@Controller('capturas')
export class CapturasController {
  constructor(private readonly capturasService: CapturasService) {}

  @Post('borradores')
  createDraft(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() dto: CreateCaptureDraftDto,
  ) {
    return this.capturasService.createDraft(actorFromHeaders(headers), dto);
  }

  @Get(':id')
  findOne(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.capturasService.findOneForActor(id, actorFromHeaders(headers));
  }

  @Get(':id/estado')
  getStatus(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.capturasService.getStatus(id, actorFromHeaders(headers));
  }

  @Get(':id/historial')
  getHistory(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.capturasService.getHistory(id, actorFromHeaders(headers));
  }

  @Put(':id')
  updateDraft(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCaptureDto,
  ) {
    return this.capturasService.updateDraft(id, actorFromHeaders(headers), dto);
  }

  @Post(':id/enviar-revision')
  sendToReview(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.capturasService.sendToReview(id, actorFromHeaders(headers));
  }
}
