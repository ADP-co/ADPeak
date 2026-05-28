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
exports.PeriodosController = void 0;
const common_1 = require("@nestjs/common");
const periodos_service_1 = require("./periodos.service");
const create_periodo_dto_1 = require("../dtos/create-periodo.dto");
const update_periodo_dto_1 = require("../dtos/update-periodo.dto");
let PeriodosController = class PeriodosController {
    periodosService;
    constructor(periodosService) {
        this.periodosService = periodosService;
    }
    findAll() {
        return this.periodosService.findAll();
    }
    findOne(id) {
        return this.periodosService.findOne(+id);
    }
    create(createPeriodoDto) {
        return this.periodosService.create(createPeriodoDto);
    }
    update(id, updatePeriodoDto) {
        return this.periodosService.update(+id, updatePeriodoDto);
    }
    deactivate(id) {
        return this.periodosService.deactivate(+id);
    }
};
exports.PeriodosController = PeriodosController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], PeriodosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], PeriodosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_periodo_dto_1.CreatePeriodoDto]),
    __metadata("design:returntype", Object)
], PeriodosController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_periodo_dto_1.UpdatePeriodoDto]),
    __metadata("design:returntype", Object)
], PeriodosController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/desactivar'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], PeriodosController.prototype, "deactivate", null);
exports.PeriodosController = PeriodosController = __decorate([
    (0, common_1.Controller)('catalogos/periodos'),
    __metadata("design:paramtypes", [periodos_service_1.PeriodosService])
], PeriodosController);
//# sourceMappingURL=periodos.controller.js.map