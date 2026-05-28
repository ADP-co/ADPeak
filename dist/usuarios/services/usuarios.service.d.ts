import { CreateUsuarioDto } from '../dtos/create-usuario.dto';
import { UpdateUsuarioDto } from '../dtos/update-usuario.dto';
interface Usuario {
    id: number;
    nombre: string;
    activo: boolean;
}
export declare class UsuariosService {
    private usuarios;
    private idCounter;
    findAll(): Usuario[];
    findOne(id: number): Usuario;
    create(dto: CreateUsuarioDto): Usuario;
    update(id: number, dto: UpdateUsuarioDto): Usuario;
    deactivate(id: number): Usuario;
}
export {};
