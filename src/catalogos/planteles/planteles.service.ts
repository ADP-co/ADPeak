import { Injectable } from '@nestjs/common';
import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreatePlantelDto } from '../dtos/create-plantel.dto';
import { UpdatePlantelDto } from '../dtos/update-plantel.dto';

@Injectable()
export class PlantelesService extends InMemoryCrudService<
  CreatePlantelDto,
  UpdatePlantelDto
> {
  constructor() {
    super('Plantel');
  }
}
