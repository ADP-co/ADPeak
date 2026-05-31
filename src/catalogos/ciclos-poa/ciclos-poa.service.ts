import { Injectable } from '@nestjs/common';
import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreateCicloPoaDto } from '../dtos/create-ciclo-poa.dto';
import { UpdateCicloPoaDto } from '../dtos/update-ciclo-poa.dto';

@Injectable()
export class CiclosPoaService extends InMemoryCrudService<CreateCicloPoaDto, UpdateCicloPoaDto> {
  constructor() {
    super('Ciclo POA');
  }
}
