import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCicloPoaDto } from '../dtos/create-ciclo-poa.dto';
import { UpdateCicloPoaDto } from '../dtos/update-ciclo-poa.dto';

interface CicloPoa {
  id: number;
  nombre: string;
  activo: boolean;
}

@Injectable()
export class CiclosPoaService {
  private ciclos: CicloPoa[] = [];
  private idCounter = 1;

  findAll() {
    return this.ciclos;
  }

  findOne(id: number) {
    const ciclo = this.ciclos.find(p => p.id === id);
    if (!ciclo) throw new NotFoundException('Ciclo POA no encontrado');
    return ciclo;
  }

  create(dto: CreateCicloPoaDto) {
    const ciclo: CicloPoa = {
      id: this.idCounter++,
      nombre: dto.nombre,
      activo: true,
    };
    this.ciclos.push(ciclo);
    return ciclo;
  }

  update(id: number, dto: UpdateCicloPoaDto) {
    const ciclo = this.findOne(id);
    ciclo.nombre = dto.nombre ?? ciclo.nombre;
    return ciclo;
  }

  deactivate(id: number) {
    const ciclo = this.findOne(id);
    ciclo.activo = false;
    return ciclo;
  }
}
