"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogosModule = void 0;
const common_1 = require("@nestjs/common");
const planteles_controller_1 = require("./planteles/planteles.controller");
const planteles_service_1 = require("./planteles/planteles.service");
const indicadores_controller_1 = require("./indicadores/indicadores.controller");
const indicadores_service_1 = require("./indicadores/indicadores.service");
const actividades_controller_1 = require("./actividades/actividades.controller");
const actividades_service_1 = require("./actividades/actividades.service");
const periodos_controller_1 = require("./periodos/periodos.controller");
const periodos_service_1 = require("./periodos/periodos.service");
const ciclos_poa_controller_1 = require("./ciclos-poa/ciclos-poa.controller");
const ciclos_poa_service_1 = require("./ciclos-poa/ciclos-poa.service");
const responsables_controller_1 = require("./responsables/responsables.controller");
const responsables_service_1 = require("./responsables/responsables.service");
const contribuyentes_controller_1 = require("./contribuyentes/contribuyentes.controller");
const contribuyentes_service_1 = require("./contribuyentes/contribuyentes.service");
let CatalogosModule = class CatalogosModule {
};
exports.CatalogosModule = CatalogosModule;
exports.CatalogosModule = CatalogosModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            planteles_controller_1.PlantelesController,
            indicadores_controller_1.IndicadoresController,
            actividades_controller_1.ActividadesController,
            periodos_controller_1.PeriodosController,
            ciclos_poa_controller_1.CiclosPoaController,
            responsables_controller_1.ResponsablesController,
            contribuyentes_controller_1.ContribuyentesController,
        ],
        providers: [
            planteles_service_1.PlantelesService,
            indicadores_service_1.IndicadoresService,
            actividades_service_1.ActividadesService,
            periodos_service_1.PeriodosService,
            ciclos_poa_service_1.CiclosPoaService,
            responsables_service_1.ResponsablesService,
            contribuyentes_service_1.ContribuyentesService,
        ],
    })
], CatalogosModule);
//# sourceMappingURL=catalogos.module.js.map