import { Controller, Get, Post, Body, Param, Patch, Put } from '@nestjs/common';
import { CiclosPoaService } from './ciclos-poa.service';
import { CreateCicloPoaDto } from '../dtos/create-ciclo-poa.dto';
import { UpdateCicloPoaDto } from '../dtos/update-ciclo-poa.dto';

@Controller('catalogos/ciclos-poa')
export class CiclosPoaController {
  constructor(private readonly ciclosPoaService: CiclosPoaService) {}

  @Get()
  findAll(): any {
    return this.ciclosPoaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): any {
    return this.ciclosPoaService.findOne(+id);
  }

  @Post()
  create(@Body() createCicloPoaDto: CreateCicloPoaDto): any {
    return this.ciclosPoaService.create(createCicloPoaDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCicloPoaDto: UpdateCicloPoaDto): any {
    return this.ciclosPoaService.update(+id, updateCicloPoaDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string): any {
    return this.ciclosPoaService.deactivate(+id);
  }
}
