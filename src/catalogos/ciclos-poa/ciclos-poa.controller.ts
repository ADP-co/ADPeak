import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { CiclosPoaService } from './ciclos-poa.service';
import { CreateCicloPoaDto } from '../dtos/create-ciclo-poa.dto';
import { UpdateCicloPoaDto } from '../dtos/update-ciclo-poa.dto';

@Controller('catalogos/ciclos-poa')
export class CiclosPoaController {
  constructor(private readonly ciclosPoaService: CiclosPoaService) {}

  @Get()
  findAll() {
    return this.ciclosPoaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ciclosPoaService.findOne(id);
  }

  @Post()
  create(@Body() createCicloPoaDto: CreateCicloPoaDto) {
    return this.ciclosPoaService.create(createCicloPoaDto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCicloPoaDto: UpdateCicloPoaDto) {
    return this.ciclosPoaService.update(id, updateCicloPoaDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.ciclosPoaService.deactivate(id);
  }
}
