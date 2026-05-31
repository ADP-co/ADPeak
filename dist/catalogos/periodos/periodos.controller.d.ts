import { PeriodosService } from './periodos.service';
import { CreatePeriodoDto } from '../dtos/create-periodo.dto';
import { UpdatePeriodoDto } from '../dtos/update-periodo.dto';
export declare class PeriodosController {
    private readonly periodosService;
    constructor(periodosService: PeriodosService);
    findAll(): import("../../common/in-memory-crud.service").CrudEntity<CreatePeriodoDto>[];
    findOne(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreatePeriodoDto>;
    create(createPeriodoDto: CreatePeriodoDto): import("../../common/in-memory-crud.service").CrudEntity<CreatePeriodoDto>;
    update(id: number, updatePeriodoDto: UpdatePeriodoDto): import("../../common/in-memory-crud.service").CrudEntity<CreatePeriodoDto>;
    deactivate(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreatePeriodoDto>;
}
