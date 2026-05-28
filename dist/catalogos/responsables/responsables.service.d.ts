import { CreateResponsableDto } from '../dtos/create-responsable.dto';
import { UpdateResponsableDto } from '../dtos/update-responsable.dto';
interface Responsable {
    id: number;
    nombre: string;
    activo: boolean;
}
export declare class ResponsablesService {
    private responsables;
    private idCounter;
    findAll(): Responsable[];
    findOne(id: number): Responsable;
    create(dto: CreateResponsableDto): Responsable;
    update(id: number, dto: UpdateResponsableDto): Responsable;
    deactivate(id: number): Responsable;
}
export {};
