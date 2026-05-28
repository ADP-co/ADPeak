import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateResponsableDto } from '../dtos/create-responsable.dto';
import { UpdateResponsableDto } from '../dtos/update-responsable.dto';

interface Responsable {
  id: number;
  nombre: string;
  activo: boolean;
}

@Injectable()
export class ResponsablesService {
  private responsables: Responsable[] = [];
  private idCounter = 1;

  findAll() {
    return this.responsables;
  }

  findOne(id: number) {
    const responsable = this.responsables.find(p => p.id === id);
    if (!responsable) throw new NotFoundException('Responsable no encontrado');
    return responsable;
  }

  create(dto: CreateResponsableDto) {
    const responsable: Responsable = {
      id: this.idCounter++,
      nombre: dto.nombre,
      activo: true,
    };
    this.responsables.push(responsable);
    return responsable;
  }

  update(id: number, dto: UpdateResponsableDto) {
    const responsable = this.findOne(id);
    responsable.nombre = dto.nombre ?? responsable.nombre;
    return responsable;
  }

  deactivate(id: number) {
    const responsable = this.findOne(id);
    responsable.activo = false;
    return responsable;
  }
}
