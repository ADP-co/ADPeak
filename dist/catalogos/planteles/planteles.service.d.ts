import { CreatePlantelDto } from '../dtos/create-plantel.dto';
import { UpdatePlantelDto } from '../dtos/update-plantel.dto';
interface Plantel {
    id: number;
    nombre: string;
    activo: boolean;
}
export declare class PlantelesService {
    private planteles;
    private idCounter;
    findAll(): Plantel[];
    findOne(id: number): Plantel;
    create(dto: CreatePlantelDto): Plantel;
    update(id: number, dto: UpdatePlantelDto): Plantel;
    deactivate(id: number): Plantel;
}
export {};
