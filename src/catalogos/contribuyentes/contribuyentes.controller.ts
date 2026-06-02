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
import { ContribuyentesService } from './contribuyentes.service';
import { CreateContribuyenteDto } from '../dtos/create-contribuyente.dto';
import { UpdateContribuyenteDto } from '../dtos/update-contribuyente.dto';

@Controller('catalogos/contribuyentes')
export class ContribuyentesController {
  constructor(private readonly contribuyentesService: ContribuyentesService) {}

  @Get()
  findAll() {
    return this.contribuyentesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contribuyentesService.findOne(id);
  }

  @Post()
  create(@Body() createContribuyenteDto: CreateContribuyenteDto) {
    return this.contribuyentesService.create(createContribuyenteDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContribuyenteDto: UpdateContribuyenteDto,
  ) {
    return this.contribuyentesService.update(id, updateContribuyenteDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.contribuyentesService.deactivate(id);
  }
}
