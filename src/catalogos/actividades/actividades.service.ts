import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateActividadDto } from '../dtos/create-actividad.dto';
import { UpdateActividadDto } from '../dtos/update-actividad.dto';

interface Actividad {
  id: number;
  nombre: string;
  activo: boolean;
}

@Injectable()
export class ActividadesService {
  private actividades: Actividad[] = [];
  private idCounter = 1;

  findAll() {
    return this.actividades;
  }

  findOne(id: number) {
    const actividad = this.actividades.find(p => p.id === id);
    if (!actividad) throw new NotFoundException('Actividad no encontrada');
    return actividad;
  }

  create(dto: CreateActividadDto) {
    const actividad: Actividad = {
      id: this.idCounter++,
      nombre: dto.nombre,
      activo: true,
    };
    this.actividades.push(actividad);
    return actividad;
  }

  update(id: number, dto: UpdateActividadDto) {
    const actividad = this.findOne(id);
    actividad.nombre = dto.nombre ?? actividad.nombre;
    return actividad;
  }

  deactivate(id: number) {
    const actividad = this.findOne(id);
    actividad.activo = false;
    return actividad;
  }
}
