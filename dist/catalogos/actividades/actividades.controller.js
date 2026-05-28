"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActividadesController = void 0;
const common_1 = require("@nestjs/common");
const actividades_service_1 = require("./actividades.service");
const create_actividad_dto_1 = require("../dtos/create-actividad.dto");
const update_actividad_dto_1 = require("../dtos/update-actividad.dto");
let ActividadesController = class ActividadesController {
    actividadesService;
    constructor(actividadesService) {
        this.actividadesService = actividadesService;
    }
    findAll() {
        return this.actividadesService.findAll();
    }
    findOne(id) {
        return this.actividadesService.findOne(+id);
    }
    create(createActividadDto) {
        return this.actividadesService.create(createActividadDto);
    }
    update(id, updateActividadDto) {
        return this.actividadesService.update(+id, updateActividadDto);
    }
    deactivate(id) {
        return this.actividadesService.deactivate(+id);
    }
};
exports.ActividadesController = ActividadesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], ActividadesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], ActividadesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_actividad_dto_1.CreateActividadDto]),
    __metadata("design:returntype", Object)
], ActividadesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_actividad_dto_1.UpdateActividadDto]),
    __metadata("design:returntype", Object)
], ActividadesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/desactivar'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], ActividadesController.prototype, "deactivate", null);
exports.ActividadesController = ActividadesController = __decorate([
    (0, common_1.Controller)('catalogos/actividades'),
    __metadata("design:paramtypes", [actividades_service_1.ActividadesService])
], ActividadesController);
//# sourceMappingURL=actividades.controller.js.map