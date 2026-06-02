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
import { ResponsablesService } from './responsables.service';
import { CreateResponsableDto } from '../dtos/create-responsable.dto';
import { UpdateResponsableDto } from '../dtos/update-responsable.dto';

@Controller('catalogos/responsables')
export class ResponsablesController {
  constructor(private readonly responsablesService: ResponsablesService) {}

  @Get()
  findAll() {
    return this.responsablesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.responsablesService.findOne(id);
  }

  @Post()
  create(@Body() createResponsableDto: CreateResponsableDto) {
    return this.responsablesService.create(createResponsableDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateResponsableDto: UpdateResponsableDto,
  ) {
    return this.responsablesService.update(id, updateResponsableDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.responsablesService.deactivate(id);
  }
}
