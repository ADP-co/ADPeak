import { UsuariosService } from '../services/usuarios.service';
import { CreateUsuarioDto } from '../dtos/create-usuario.dto';
import { UpdateUsuarioDto } from '../dtos/update-usuario.dto';
export declare class UsuariosController {
    private readonly usuariosService;
    constructor(usuariosService: UsuariosService);
    findAll(): any;
    findOne(id: string): any;
    create(createUsuarioDto: CreateUsuarioDto): any;
    update(id: string, updateUsuarioDto: UpdateUsuarioDto): any;
    deactivate(id: string): any;
}
