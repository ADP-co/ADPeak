import { Controller, Get, Post, Body, Param, Patch, Put } from '@nestjs/common';
import { UsuariosService } from '../services/usuarios.service';
import { CreateUsuarioDto } from '../dtos/create-usuario.dto';
import { UpdateUsuarioDto } from '../dtos/update-usuario.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  findAll(): any {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): any {
    return this.usuariosService.findOne(+id);
  }

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto): any {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto): any {
    return this.usuariosService.update(+id, updateUsuarioDto);
  }

  @Patch(':id/desactivar')
  deactivate(@Param('id') id: string): any {
    return this.usuariosService.deactivate(+id);
  }
}
