import { Controller, Get, Post, Body, Param, Patch, Put } from '@nestjs/common';
import { ResponsablesService } from './responsables.service';
import { CreateResponsableDto } from '../dtos/create-responsable.dto';
import { UpdateResponsableDto } from '../dtos/update-responsable.dto';

@Controller('catalogos/responsables')
export class ResponsablesController {
  constructor(private readonly responsablesService: ResponsablesService) {}

  @Get()
  findAll(): any {
    return this.responsablesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): any {
    return this.responsablesService.findOne(+id);
  }

  @Post()
  create(@Body() createResponsableDto: CreateResponsableDto): any {
    return this.responsablesService.create(createResponsableDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateResponsableDto: UpdateResponsableDto): any {
    return this.responsablesService.update(+id, updateResponsableDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string): any {
    return this.responsablesService.deactivate(+id);
  }
}
