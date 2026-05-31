import { IndicadoresService } from './indicadores.service';
import { CreateIndicadorDto } from '../dtos/create-indicador.dto';
import { UpdateIndicadorDto } from '../dtos/update-indicador.dto';
export declare class IndicadoresController {
    private readonly indicadoresService;
    constructor(indicadoresService: IndicadoresService);
    findAll(): import("../../common/in-memory-crud.service").CrudEntity<CreateIndicadorDto>[];
    findOne(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateIndicadorDto>;
    create(createIndicadorDto: CreateIndicadorDto): import("../../common/in-memory-crud.service").CrudEntity<CreateIndicadorDto>;
    update(id: number, updateIndicadorDto: UpdateIndicadorDto): import("../../common/in-memory-crud.service").CrudEntity<CreateIndicadorDto>;
    deactivate(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateIndicadorDto>;
}
