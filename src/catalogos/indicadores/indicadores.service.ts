import { Injectable } from '@nestjs/common';
import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreateIndicadorDto } from '../dtos/create-indicador.dto';
import { UpdateIndicadorDto } from '../dtos/update-indicador.dto';

@Injectable()
export class IndicadoresService extends InMemoryCrudService<CreateIndicadorDto, UpdateIndicadorDto> {
  constructor() {
    super('Indicador');
  }
}
