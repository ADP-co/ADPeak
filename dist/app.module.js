"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const usuarios_module_1 = require("./usuarios/usuarios.module");
const catalogos_module_1 = require("./catalogos/catalogos.module");
const capturas_module_1 = require("./capturas/capturas.module");
const evidencias_module_1 = require("./evidencias/evidencias.module");
const revisiones_module_1 = require("./revisiones/revisiones.module");
const reportes_module_1 = require("./reportes/reportes.module");
const healthcheck_controller_1 = require("./healthcheck/healthcheck.controller");
const healthcheck_service_1 = require("./healthcheck/healthcheck.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, usuarios_module_1.UsuariosModule, catalogos_module_1.CatalogosModule, capturas_module_1.CapturasModule, evidencias_module_1.EvidenciasModule, revisiones_module_1.RevisionesModule, reportes_module_1.ReportesModule],
        controllers: [app_controller_1.AppController, healthcheck_controller_1.HealthcheckController],
        providers: [app_service_1.AppService, healthcheck_service_1.HealthcheckService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map