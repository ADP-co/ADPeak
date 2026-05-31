import { InMemoryCrudService } from '../../common/in-memory-crud.service';
import { CreateUsuarioDto } from '../dtos/create-usuario.dto';
import { UpdateUsuarioDto } from '../dtos/update-usuario.dto';
export declare class UsuariosService extends InMemoryCrudService<CreateUsuarioDto, UpdateUsuarioDto> {
    constructor();
}
