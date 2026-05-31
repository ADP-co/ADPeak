import { ActividadesService } from './actividades.service';
import { CreateActividadDto } from '../dtos/create-actividad.dto';
import { UpdateActividadDto } from '../dtos/update-actividad.dto';
export declare class ActividadesController {
    private readonly actividadesService;
    constructor(actividadesService: ActividadesService);
    findAll(): import("../../common/in-memory-crud.service").CrudEntity<CreateActividadDto>[];
    findOne(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateActividadDto>;
    create(createActividadDto: CreateActividadDto): import("../../common/in-memory-crud.service").CrudEntity<CreateActividadDto>;
    update(id: number, updateActividadDto: UpdateActividadDto): import("../../common/in-memory-crud.service").CrudEntity<CreateActividadDto>;
    deactivate(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateActividadDto>;
}
