import { ContribuyentesService } from './contribuyentes.service';
import { CreateContribuyenteDto } from '../dtos/create-contribuyente.dto';
import { UpdateContribuyenteDto } from '../dtos/update-contribuyente.dto';
export declare class ContribuyentesController {
    private readonly contribuyentesService;
    constructor(contribuyentesService: ContribuyentesService);
    findAll(): any;
    findOne(id: string): any;
    create(createContribuyenteDto: CreateContribuyenteDto): any;
    update(id: string, updateContribuyenteDto: UpdateContribuyenteDto): any;
    deactivate(id: string): any;
}
