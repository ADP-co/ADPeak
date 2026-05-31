import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreatePeriodoDto } from '../dtos/create-periodo.dto';
import { UpdatePeriodoDto } from '../dtos/update-periodo.dto';
export declare class PeriodosService extends InMemoryCrudService<CreatePeriodoDto, UpdatePeriodoDto> {
    constructor();
}
