import { ActividadesService } from './actividades.service';
import { CreateActividadDto } from '../dtos/create-actividad.dto';
import { UpdateActividadDto } from '../dtos/update-actividad.dto';
export declare class ActividadesController {
    private readonly actividadesService;
    constructor(actividadesService: ActividadesService);
    findAll(): any;
    findOne(id: string): any;
    create(createActividadDto: CreateActividadDto): any;
    update(id: string, updateActividadDto: UpdateActividadDto): any;
    deactivate(id: string): any;
}
