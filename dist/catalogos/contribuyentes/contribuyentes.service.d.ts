import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreateContribuyenteDto } from '../dtos/create-contribuyente.dto';
import { UpdateContribuyenteDto } from '../dtos/update-contribuyente.dto';
export declare class ContribuyentesService extends InMemoryCrudService<CreateContribuyenteDto, UpdateContribuyenteDto> {
    constructor();
}
