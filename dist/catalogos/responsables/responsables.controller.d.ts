import { ResponsablesService } from './responsables.service';
import { CreateResponsableDto } from '../dtos/create-responsable.dto';
import { UpdateResponsableDto } from '../dtos/update-responsable.dto';
export declare class ResponsablesController {
    private readonly responsablesService;
    constructor(responsablesService: ResponsablesService);
    findAll(): any;
    findOne(id: string): any;
    create(createResponsableDto: CreateResponsableDto): any;
    update(id: string, updateResponsableDto: UpdateResponsableDto): any;
    deactivate(id: string): any;
}
