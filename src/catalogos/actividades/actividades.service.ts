import { Injectable } from '@nestjs/common';
import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreateActividadDto } from '../dtos/create-actividad.dto';
import { UpdateActividadDto } from '../dtos/update-actividad.dto';

@Injectable()
export class ActividadesService extends InMemoryCrudService<CreateActividadDto, UpdateActividadDto> {
  constructor() {
    super('Actividad');
  }
}
