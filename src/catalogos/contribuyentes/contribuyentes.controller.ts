import { Controller, Get, Post, Body, Param, Patch, Put } from '@nestjs/common';
import { ContribuyentesService } from './contribuyentes.service';
import { CreateContribuyenteDto } from '../dtos/create-contribuyente.dto';
import { UpdateContribuyenteDto } from '../dtos/update-contribuyente.dto';

@Controller('catalogos/contribuyentes')
export class ContribuyentesController {
  constructor(private readonly contribuyentesService: ContribuyentesService) {}

  @Get()
  findAll(): any {
    return this.contribuyentesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): any {
    return this.contribuyentesService.findOne(+id);
  }

  @Post()
  create(@Body() createContribuyenteDto: CreateContribuyenteDto): any {
    return this.contribuyentesService.create(createContribuyenteDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateContribuyenteDto: UpdateContribuyenteDto): any {
    return this.contribuyentesService.update(+id, updateContribuyenteDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string): any {
    return this.contribuyentesService.deactivate(+id);
  }
}
