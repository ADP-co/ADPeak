import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { IndicadoresService } from './indicadores.service';
import { CreateIndicadorDto } from '../dtos/create-indicador.dto';
import { UpdateIndicadorDto } from '../dtos/update-indicador.dto';

@Controller('catalogos/indicadores')
export class IndicadoresController {
  constructor(private readonly indicadoresService: IndicadoresService) {}

  @Get()
  findAll() {
    return this.indicadoresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.indicadoresService.findOne(id);
  }

  @Post()
  create(@Body() createIndicadorDto: CreateIndicadorDto) {
    return this.indicadoresService.create(createIndicadorDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateIndicadorDto: UpdateIndicadorDto,
  ) {
    return this.indicadoresService.update(id, updateIndicadorDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.indicadoresService.deactivate(id);
  }
}
