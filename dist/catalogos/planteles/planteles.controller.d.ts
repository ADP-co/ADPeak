import { PlantelesService } from './planteles.service';
import { CreatePlantelDto } from '../dtos/create-plantel.dto';
import { UpdatePlantelDto } from '../dtos/update-plantel.dto';
export declare class PlantelesController {
    private readonly plantelesService;
    constructor(plantelesService: PlantelesService);
    findAll(): any;
    findOne(id: string): any;
    create(createPlantelDto: CreatePlantelDto): any;
    update(id: string, updatePlantelDto: UpdatePlantelDto): any;
    deactivate(id: string): any;
}
