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
exports.CiclosPoaController = void 0;
const common_1 = require("@nestjs/common");
const ciclos_poa_service_1 = require("./ciclos-poa.service");
const create_ciclo_poa_dto_1 = require("../dtos/create-ciclo-poa.dto");
const update_ciclo_poa_dto_1 = require("../dtos/update-ciclo-poa.dto");
let CiclosPoaController = class CiclosPoaController {
    ciclosPoaService;
    constructor(ciclosPoaService) {
        this.ciclosPoaService = ciclosPoaService;
    }
    findAll() {
        return this.ciclosPoaService.findAll();
    }
    findOne(id) {
        return this.ciclosPoaService.findOne(+id);
    }
    create(createCicloPoaDto) {
        return this.ciclosPoaService.create(createCicloPoaDto);
    }
    update(id, updateCicloPoaDto) {
        return this.ciclosPoaService.update(+id, updateCicloPoaDto);
    }
    deactivate(id) {
        return this.ciclosPoaService.deactivate(+id);
    }
};
exports.CiclosPoaController = CiclosPoaController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], CiclosPoaController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], CiclosPoaController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_ciclo_poa_dto_1.CreateCicloPoaDto]),
    __metadata("design:returntype", Object)
], CiclosPoaController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_ciclo_poa_dto_1.UpdateCicloPoaDto]),
    __metadata("design:returntype", Object)
], CiclosPoaController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/desactivar'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], CiclosPoaController.prototype, "deactivate", null);
exports.CiclosPoaController = CiclosPoaController = __decorate([
    (0, common_1.Controller)('catalogos/ciclos-poa'),
    __metadata("design:paramtypes", [ciclos_poa_service_1.CiclosPoaService])
], CiclosPoaController);
//# sourceMappingURL=ciclos-poa.controller.js.map