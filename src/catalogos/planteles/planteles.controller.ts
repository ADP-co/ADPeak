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
import { PlantelesService } from './planteles.service';
import { CreatePlantelDto } from '../dtos/create-plantel.dto';
import { UpdatePlantelDto } from '../dtos/update-plantel.dto';

@Controller('catalogos/planteles')
export class PlantelesController {
  constructor(private readonly plantelesService: PlantelesService) {}

  @Get()
  findAll() {
    return this.plantelesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.plantelesService.findOne(id);
  }

  @Post()
  create(@Body() createPlantelDto: CreatePlantelDto) {
    return this.plantelesService.create(createPlantelDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlantelDto: UpdatePlantelDto,
  ) {
    return this.plantelesService.update(id, updatePlantelDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.plantelesService.deactivate(id);
  }
}
