import { CreateActividadDto } from '../dtos/create-actividad.dto';
import { UpdateActividadDto } from '../dtos/update-actividad.dto';
interface Actividad {
    id: number;
    nombre: string;
    activo: boolean;
}
export declare class ActividadesService {
    private actividades;
    private idCounter;
    findAll(): Actividad[];
    findOne(id: number): Actividad;
    create(dto: CreateActividadDto): Actividad;
    update(id: number, dto: UpdateActividadDto): Actividad;
    deactivate(id: number): Actividad;
}
export {};
