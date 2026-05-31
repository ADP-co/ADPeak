import { Injectable } from '@nestjs/common';
import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreateResponsableDto } from '../dtos/create-responsable.dto';
import { UpdateResponsableDto } from '../dtos/update-responsable.dto';

@Injectable()
export class ResponsablesService extends InMemoryCrudService<CreateResponsableDto, UpdateResponsableDto> {
  constructor() {
    super('Responsable');
  }
}
