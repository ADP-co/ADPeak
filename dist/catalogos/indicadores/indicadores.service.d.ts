import { CreateIndicadorDto } from '../dtos/create-indicador.dto';
import { UpdateIndicadorDto } from '../dtos/update-indicador.dto';
interface Indicador {
    id: number;
    nombre: string;
    activo: boolean;
}
export declare class IndicadoresService {
    private indicadores;
    private idCounter;
    findAll(): Indicador[];
    findOne(id: number): Indicador;
    create(dto: CreateIndicadorDto): Indicador;
    update(id: number, dto: UpdateIndicadorDto): Indicador;
    deactivate(id: number): Indicador;
}
export {};
