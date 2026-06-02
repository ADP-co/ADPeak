import { Injectable } from '@nestjs/common';
import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreatePeriodoDto } from '../dtos/create-periodo.dto';
import { UpdatePeriodoDto } from '../dtos/update-periodo.dto';

@Injectable()
export class PeriodosService extends InMemoryCrudService<
  CreatePeriodoDto,
  UpdatePeriodoDto
> {
  constructor() {
    super('Periodo');
  }
}
