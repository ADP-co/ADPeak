import { Injectable } from '@nestjs/common';
import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreateContribuyenteDto } from '../dtos/create-contribuyente.dto';
import { UpdateContribuyenteDto } from '../dtos/update-contribuyente.dto';

@Injectable()
export class ContribuyentesService extends InMemoryCrudService<
  CreateContribuyenteDto,
  UpdateContribuyenteDto
> {
  constructor() {
    super('Contribuyente');
  }
}
