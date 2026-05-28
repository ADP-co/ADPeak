import { Controller, Get, Post, Body, Param, Patch, Put } from '@nestjs/common';
import { PlantelesService } from './planteles.service';
import { CreatePlantelDto } from '../dtos/create-plantel.dto';
import { UpdatePlantelDto } from '../dtos/update-plantel.dto';

@Controller('catalogos/planteles')
export class PlantelesController {
  constructor(private readonly plantelesService: PlantelesService) {}

  @Get()
  findAll(): any {
    return this.plantelesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): any {
    return this.plantelesService.findOne(+id);
  }

  @Post()
  create(@Body() createPlantelDto: CreatePlantelDto): any {
    return this.plantelesService.create(createPlantelDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updatePlantelDto: UpdatePlantelDto): any {
    return this.plantelesService.update(+id, updatePlantelDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string): any {
    return this.plantelesService.deactivate(+id);
  }
}
