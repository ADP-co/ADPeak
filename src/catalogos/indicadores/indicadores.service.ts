import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateIndicadorDto } from '../dtos/create-indicador.dto';
import { UpdateIndicadorDto } from '../dtos/update-indicador.dto';

interface Indicador {
  id: number;
  nombre: string;
  activo: boolean;
}

@Injectable()
export class IndicadoresService {
  private indicadores: Indicador[] = [];
  private idCounter = 1;

  findAll() {
    return this.indicadores;
  }

  findOne(id: number) {
    const indicador = this.indicadores.find(p => p.id === id);
    if (!indicador) throw new NotFoundException('Indicador no encontrado');
    return indicador;
  }

  create(dto: CreateIndicadorDto) {
    const indicador: Indicador = {
      id: this.idCounter++,
      nombre: dto.nombre,
      activo: true,
    };
    this.indicadores.push(indicador);
    return indicador;
  }

  update(id: number, dto: UpdateIndicadorDto) {
    const indicador = this.findOne(id);
    indicador.nombre = dto.nombre ?? indicador.nombre;
    return indicador;
  }

  deactivate(id: number) {
    const indicador = this.findOne(id);
    indicador.activo = false;
    return indicador;
  }
}
