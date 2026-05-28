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
exports.PlantelesController = void 0;
const common_1 = require("@nestjs/common");
const planteles_service_1 = require("./planteles.service");
const create_plantel_dto_1 = require("../dtos/create-plantel.dto");
const update_plantel_dto_1 = require("../dtos/update-plantel.dto");
let PlantelesController = class PlantelesController {
    plantelesService;
    constructor(plantelesService) {
        this.plantelesService = plantelesService;
    }
    findAll() {
        return this.plantelesService.findAll();
    }
    findOne(id) {
        return this.plantelesService.findOne(+id);
    }
    create(createPlantelDto) {
        return this.plantelesService.create(createPlantelDto);
    }
    update(id, updatePlantelDto) {
        return this.plantelesService.update(+id, updatePlantelDto);
    }
    deactivate(id) {
        return this.plantelesService.deactivate(+id);
    }
};
exports.PlantelesController = PlantelesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], PlantelesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], PlantelesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_plantel_dto_1.CreatePlantelDto]),
    __metadata("design:returntype", Object)
], PlantelesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_plantel_dto_1.UpdatePlantelDto]),
    __metadata("design:returntype", Object)
], PlantelesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/desactivar'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], PlantelesController.prototype, "deactivate", null);
exports.PlantelesController = PlantelesController = __decorate([
    (0, common_1.Controller)('catalogos/planteles'),
    __metadata("design:paramtypes", [planteles_service_1.PlantelesService])
], PlantelesController);
//# sourceMappingURL=planteles.controller.js.map