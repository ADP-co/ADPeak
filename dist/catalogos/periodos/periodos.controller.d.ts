import { PeriodosService } from './periodos.service';
import { CreatePeriodoDto } from '../dtos/create-periodo.dto';
import { UpdatePeriodoDto } from '../dtos/update-periodo.dto';
export declare class PeriodosController {
    private readonly periodosService;
    constructor(periodosService: PeriodosService);
    findAll(): any;
    findOne(id: string): any;
    create(createPeriodoDto: CreatePeriodoDto): any;
    update(id: string, updatePeriodoDto: UpdatePeriodoDto): any;
    deactivate(id: string): any;
}
