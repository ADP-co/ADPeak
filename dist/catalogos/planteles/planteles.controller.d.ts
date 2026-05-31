import { PlantelesService } from './planteles.service';
import { CreatePlantelDto } from '../dtos/create-plantel.dto';
import { UpdatePlantelDto } from '../dtos/update-plantel.dto';
export declare class PlantelesController {
    private readonly plantelesService;
    constructor(plantelesService: PlantelesService);
    findAll(): import("../../common/in-memory-crud.service").CrudEntity<CreatePlantelDto>[];
    findOne(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreatePlantelDto>;
    create(createPlantelDto: CreatePlantelDto): import("../../common/in-memory-crud.service").CrudEntity<CreatePlantelDto>;
    update(id: number, updatePlantelDto: UpdatePlantelDto): import("../../common/in-memory-crud.service").CrudEntity<CreatePlantelDto>;
    deactivate(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreatePlantelDto>;
}
