import { CiclosPoaService } from './ciclos-poa.service';
import { CreateCicloPoaDto } from '../dtos/create-ciclo-poa.dto';
import { UpdateCicloPoaDto } from '../dtos/update-ciclo-poa.dto';
export declare class CiclosPoaController {
    private readonly ciclosPoaService;
    constructor(ciclosPoaService: CiclosPoaService);
    findAll(): any;
    findOne(id: string): any;
    create(createCicloPoaDto: CreateCicloPoaDto): any;
    update(id: string, updateCicloPoaDto: UpdateCicloPoaDto): any;
    deactivate(id: string): any;
}
