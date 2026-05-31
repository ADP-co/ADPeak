import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreateIndicadorDto } from '../dtos/create-indicador.dto';
import { UpdateIndicadorDto } from '../dtos/update-indicador.dto';
export declare class IndicadoresService extends InMemoryCrudService<CreateIndicadorDto, UpdateIndicadorDto> {
    constructor();
}
