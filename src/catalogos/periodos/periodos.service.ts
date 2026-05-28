import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePeriodoDto } from '../dtos/create-periodo.dto';
import { UpdatePeriodoDto } from '../dtos/update-periodo.dto';

interface Periodo {
  id: number;
  nombre: string;
  activo: boolean;
}

@Injectable()
export class PeriodosService {
  private periodos: Periodo[] = [];
  private idCounter = 1;

  findAll() {
    return this.periodos;
  }

  findOne(id: number) {
    const periodo = this.periodos.find(p => p.id === id);
    if (!periodo) throw new NotFoundException('Periodo no encontrado');
    return periodo;
  }

  create(dto: CreatePeriodoDto) {
    const periodo: Periodo = {
      id: this.idCounter++,
      nombre: dto.nombre,
      activo: true,
    };
    this.periodos.push(periodo);
    return periodo;
  }

  update(id: number, dto: UpdatePeriodoDto) {
    const periodo = this.findOne(id);
    periodo.nombre = dto.nombre ?? periodo.nombre;
    return periodo;
  }

  deactivate(id: number) {
    const periodo = this.findOne(id);
    periodo.activo = false;
    return periodo;
  }
}
