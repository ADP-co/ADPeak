import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from '../dtos/create-usuario.dto';
import { UpdateUsuarioDto } from '../dtos/update-usuario.dto';

interface Usuario {
  id: number;
  nombre: string;
  activo: boolean;
}

@Injectable()
export class UsuariosService {
  private usuarios: Usuario[] = [];
  private idCounter = 1;

  findAll() {
    return this.usuarios;
  }

  findOne(id: number) {
    const usuario = this.usuarios.find(p => p.id === id);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  create(dto: CreateUsuarioDto) {
    const usuario: Usuario = {
      id: this.idCounter++,
      nombre: dto.nombre,
      activo: true,
    };
    this.usuarios.push(usuario);
    return usuario;
  }

  update(id: number, dto: UpdateUsuarioDto) {
    const usuario = this.findOne(id);
    usuario.nombre = dto.nombre ?? usuario.nombre;
    return usuario;
  }

  deactivate(id: number) {
    const usuario = this.findOne(id);
    usuario.activo = false;
    return usuario;
  }
}
