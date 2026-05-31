import { UsuariosService } from '../services/usuarios.service';
import { CreateUsuarioDto } from '../dtos/create-usuario.dto';
import { UpdateUsuarioDto } from '../dtos/update-usuario.dto';
export declare class UsuariosController {
    private readonly usuariosService;
    constructor(usuariosService: UsuariosService);
    findAll(): import("../../common/in-memory-crud.service").CrudEntity<CreateUsuarioDto>[];
    findOne(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateUsuarioDto>;
    create(createUsuarioDto: CreateUsuarioDto): import("../../common/in-memory-crud.service").CrudEntity<CreateUsuarioDto>;
    update(id: number, updateUsuarioDto: UpdateUsuarioDto): import("../../common/in-memory-crud.service").CrudEntity<CreateUsuarioDto>;
    deactivate(id: number): import("../../common/in-memory-crud.service").CrudEntity<CreateUsuarioDto>;
}
