import { ContribuyentesService } from './contribuyentes.service';
import { CreateContribuyenteDto } from '../dtos/create-contribuyente.dto';
import { UpdateContribuyenteDto } from '../dtos/update-contribuyente.dto';
export declare class ContribuyentesController {
    private readonly contribuyentesService;
    constructor(contribuyentesService: ContribuyentesService);
    findAll(): import("../../common/in-memory-crud.service").CrudEntity<CreateContribuyenteDto>[];
    findOne(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateContribuyenteDto>;
    create(createContribuyenteDto: CreateContribuyenteDto): import("../../common/in-memory-crud.service").CrudEntity<CreateContribuyenteDto>;
    update(id: number, updateContribuyenteDto: UpdateContribuyenteDto): import("../../common/in-memory-crud.service").CrudEntity<CreateContribuyenteDto>;
    deactivate(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateContribuyenteDto>;
}
