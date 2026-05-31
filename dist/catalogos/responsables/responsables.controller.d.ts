import { ResponsablesService } from './responsables.service';
import { CreateResponsableDto } from '../dtos/create-responsable.dto';
import { UpdateResponsableDto } from '../dtos/update-responsable.dto';
export declare class ResponsablesController {
    private readonly responsablesService;
    constructor(responsablesService: ResponsablesService);
    findAll(): import("../../common/in-memory-crud.service").CrudEntity<CreateResponsableDto>[];
    findOne(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateResponsableDto>;
    create(createResponsableDto: CreateResponsableDto): import("../../common/in-memory-crud.service").CrudEntity<CreateResponsableDto>;
    update(id: number, updateResponsableDto: UpdateResponsableDto): import("../../common/in-memory-crud.service").CrudEntity<CreateResponsableDto>;
    deactivate(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateResponsableDto>;
}
