import { Controller, Get, Post, Body, Param, Patch, Put } from '@nestjs/common';
import { ActividadesService } from './actividades.service';
import { CreateActividadDto } from '../dtos/create-actividad.dto';
import { UpdateActividadDto } from '../dtos/update-actividad.dto';

@Controller('catalogos/actividades')
export class ActividadesController {
  constructor(private readonly actividadesService: ActividadesService) {}

  @Get()
  findAll(): any {
    return this.actividadesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): any {
    return this.actividadesService.findOne(+id);
  }

  @Post()
  create(@Body() createActividadDto: CreateActividadDto): any {
    return this.actividadesService.create(createActividadDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateActividadDto: UpdateActividadDto): any {
    return this.actividadesService.update(+id, updateActividadDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string): any {
    return this.actividadesService.deactivate(+id);
  }
}
