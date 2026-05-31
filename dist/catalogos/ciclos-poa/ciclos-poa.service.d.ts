import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreateCicloPoaDto } from '../dtos/create-ciclo-poa.dto';
import { UpdateCicloPoaDto } from '../dtos/update-ciclo-poa.dto';
export declare class CiclosPoaService extends InMemoryCrudService<CreateCicloPoaDto, UpdateCicloPoaDto> {
    constructor();
}
