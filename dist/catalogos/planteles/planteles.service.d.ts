import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreatePlantelDto } from '../dtos/create-plantel.dto';
import { UpdatePlantelDto } from '../dtos/update-plantel.dto';
export declare class PlantelesService extends InMemoryCrudService<CreatePlantelDto, UpdatePlantelDto> {
    constructor();
}
