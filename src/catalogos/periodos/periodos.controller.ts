import { Controller, Get, Post, Body, Param, Patch, Put } from '@nestjs/common';
import { PeriodosService } from './periodos.service';
import { CreatePeriodoDto } from '../dtos/create-periodo.dto';
import { UpdatePeriodoDto } from '../dtos/update-periodo.dto';

@Controller('catalogos/periodos')
export class PeriodosController {
  constructor(private readonly periodosService: PeriodosService) {}

  @Get()
  findAll(): any {
    return this.periodosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): any {
    return this.periodosService.findOne(+id);
  }

  @Post()
  create(@Body() createPeriodoDto: CreatePeriodoDto): any {
    return this.periodosService.create(createPeriodoDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updatePeriodoDto: UpdatePeriodoDto): any {
    return this.periodosService.update(+id, updatePeriodoDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string): any {
    return this.periodosService.deactivate(+id);
  }
}
