import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlantelDto } from '../dtos/create-plantel.dto';
import { UpdatePlantelDto } from '../dtos/update-plantel.dto';

interface Plantel {
  id: number;
  nombre: string;
  activo: boolean;
}

@Injectable()
export class PlantelesService {
  private planteles: Plantel[] = [];
  private idCounter = 1;

  findAll() {
    return this.planteles;
  }

  findOne(id: number) {
    const plantel = this.planteles.find(p => p.id === id);
    if (!plantel) throw new NotFoundException('Plantel no encontrado');
    return plantel;
  }

  create(dto: CreatePlantelDto) {
    const plantel: Plantel = {
      id: this.idCounter++,
      nombre: dto.nombre,
      activo: true,
    };
    this.planteles.push(plantel);
    return plantel;
  }

  update(id: number, dto: UpdatePlantelDto) {
    const plantel = this.findOne(id);
    plantel.nombre = dto.nombre ?? plantel.nombre;
    return plantel;
  }

  deactivate(id: number) {
    const plantel = this.findOne(id);
    plantel.activo = false;
    return plantel;
  }
}
