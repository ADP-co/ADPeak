import { CreatePeriodoDto } from '../dtos/create-periodo.dto';
import { UpdatePeriodoDto } from '../dtos/update-periodo.dto';
interface Periodo {
    id: number;
    nombre: string;
    activo: boolean;
}
export declare class PeriodosService {
    private periodos;
    private idCounter;
    findAll(): Periodo[];
    findOne(id: number): Periodo;
    create(dto: CreatePeriodoDto): Periodo;
    update(id: number, dto: UpdatePeriodoDto): Periodo;
    deactivate(id: number): Periodo;
}
export {};
