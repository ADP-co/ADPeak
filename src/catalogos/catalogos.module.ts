import { Module } from '@nestjs/common';
import { PlantelesController } from './planteles/planteles.controller';
import { PlantelesService } from './planteles/planteles.service';
import { IndicadoresController } from './indicadores/indicadores.controller';
import { IndicadoresService } from './indicadores/indicadores.service';
import { ActividadesController } from './actividades/actividades.controller';
import { ActividadesService } from './actividades/actividades.service';
import { PeriodosController } from './periodos/periodos.controller';
import { PeriodosService } from './periodos/periodos.service';
import { CiclosPoaController } from './ciclos-poa/ciclos-poa.controller';
import { CiclosPoaService } from './ciclos-poa/ciclos-poa.service';
import { ResponsablesController } from './responsables/responsables.controller';
import { ResponsablesService } from './responsables/responsables.service';
import { ContribuyentesController } from './contribuyentes/contribuyentes.controller';
import { ContribuyentesService } from './contribuyentes/contribuyentes.service';

@Module({
	controllers: [
		PlantelesController,
		IndicadoresController,
		ActividadesController,
		PeriodosController,
		CiclosPoaController,
		ResponsablesController,
		ContribuyentesController,
	],
	providers: [
		PlantelesService,
		IndicadoresService,
		ActividadesService,
		PeriodosService,
		CiclosPoaService,
		ResponsablesService,
		ContribuyentesService,
	],
})
export class CatalogosModule {}
