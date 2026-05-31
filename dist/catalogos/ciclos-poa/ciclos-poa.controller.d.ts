import { CiclosPoaService } from './ciclos-poa.service';
import { CreateCicloPoaDto } from '../dtos/create-ciclo-poa.dto';
import { UpdateCicloPoaDto } from '../dtos/update-ciclo-poa.dto';
export declare class CiclosPoaController {
    private readonly ciclosPoaService;
    constructor(ciclosPoaService: CiclosPoaService);
    findAll(): import("../../common/in-memory-crud.service").CrudEntity<CreateCicloPoaDto>[];
    findOne(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateCicloPoaDto>;
    create(createCicloPoaDto: CreateCicloPoaDto): import("../../common/in-memory-crud.service").CrudEntity<CreateCicloPoaDto>;
    update(id: number, updateCicloPoaDto: UpdateCicloPoaDto): import("../../common/in-memory-crud.service").CrudEntity<CreateCicloPoaDto>;
    deactivate(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateCicloPoaDto>;
}
