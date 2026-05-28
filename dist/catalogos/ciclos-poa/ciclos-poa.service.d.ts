import { CreateCicloPoaDto } from '../dtos/create-ciclo-poa.dto';
import { UpdateCicloPoaDto } from '../dtos/update-ciclo-poa.dto';
interface CicloPoa {
    id: number;
    nombre: string;
    activo: boolean;
}
export declare class CiclosPoaService {
    private ciclos;
    private idCounter;
    findAll(): CicloPoa[];
    findOne(id: number): CicloPoa;
    create(dto: CreateCicloPoaDto): CicloPoa;
    update(id: number, dto: UpdateCicloPoaDto): CicloPoa;
    deactivate(id: number): CicloPoa;
}
export {};
