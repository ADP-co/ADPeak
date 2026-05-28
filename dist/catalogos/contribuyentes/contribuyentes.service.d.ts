import { CreateContribuyenteDto } from '../dtos/create-contribuyente.dto';
import { UpdateContribuyenteDto } from '../dtos/update-contribuyente.dto';
interface Contribuyente {
    id: number;
    nombre: string;
    activo: boolean;
}
export declare class ContribuyentesService {
    private contribuyentes;
    private idCounter;
    findAll(): Contribuyente[];
    findOne(id: number): Contribuyente;
    create(dto: CreateContribuyenteDto): Contribuyente;
    update(id: number, dto: UpdateContribuyenteDto): Contribuyente;
    deactivate(id: number): Contribuyente;
}
export {};
