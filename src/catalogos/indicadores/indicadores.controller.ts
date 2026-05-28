import { Controller, Get, Post, Body, Param, Patch, Put } from '@nestjs/common';
import { IndicadoresService } from './indicadores.service';
import { CreateIndicadorDto } from '../dtos/create-indicador.dto';
import { UpdateIndicadorDto } from '../dtos/update-indicador.dto';

@Controller('catalogos/indicadores')
export class IndicadoresController {
  constructor(private readonly indicadoresService: IndicadoresService) {}

  @Get()
  findAll(): any {
    return this.indicadoresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): any {
    return this.indicadoresService.findOne(+id);
  }

  @Post()
  create(@Body() createIndicadorDto: CreateIndicadorDto): any {
    return this.indicadoresService.create(createIndicadorDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateIndicadorDto: UpdateIndicadorDto): any {
    return this.indicadoresService.update(+id, updateIndicadorDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string): any {
    return this.indicadoresService.deactivate(+id);
  }
}
