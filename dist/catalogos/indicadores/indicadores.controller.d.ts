import { IndicadoresService } from './indicadores.service';
import { CreateIndicadorDto } from '../dtos/create-indicador.dto';
import { UpdateIndicadorDto } from '../dtos/update-indicador.dto';
export declare class IndicadoresController {
    private readonly indicadoresService;
    constructor(indicadoresService: IndicadoresService);
    findAll(): any;
    findOne(id: string): any;
    create(createIndicadorDto: CreateIndicadorDto): any;
    update(id: string, updateIndicadorDto: UpdateIndicadorDto): any;
    deactivate(id: string): any;
}
