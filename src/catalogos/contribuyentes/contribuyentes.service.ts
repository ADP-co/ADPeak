import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateContribuyenteDto } from '../dtos/create-contribuyente.dto';
import { UpdateContribuyenteDto } from '../dtos/update-contribuyente.dto';

interface Contribuyente {
  id: number;
  nombre: string;
  activo: boolean;
}

@Injectable()
export class ContribuyentesService {
  private contribuyentes: Contribuyente[] = [];
  private idCounter = 1;

  findAll() {
    return this.contribuyentes;
  }

  findOne(id: number) {
    const contribuyente = this.contribuyentes.find(p => p.id === id);
    if (!contribuyente) throw new NotFoundException('Contribuyente no encontrado');
    return contribuyente;
  }

  create(dto: CreateContribuyenteDto) {
    const contribuyente: Contribuyente = {
      id: this.idCounter++,
      nombre: dto.nombre,
      activo: true,
    };
    this.contribuyentes.push(contribuyente);
    return contribuyente;
  }

  update(id: number, dto: UpdateContribuyenteDto) {
    const contribuyente = this.findOne(id);
    contribuyente.nombre = dto.nombre ?? contribuyente.nombre;
    return contribuyente;
  }

  deactivate(id: number) {
    const contribuyente = this.findOne(id);
    contribuyente.activo = false;
    return contribuyente;
  }
}
