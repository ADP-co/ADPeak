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
exports.ResponsablesController = void 0;
const common_1 = require("@nestjs/common");
const responsables_service_1 = require("./responsables.service");
const create_responsable_dto_1 = require("../dtos/create-responsable.dto");
const update_responsable_dto_1 = require("../dtos/update-responsable.dto");
let ResponsablesController = class ResponsablesController {
    responsablesService;
    constructor(responsablesService) {
        this.responsablesService = responsablesService;
    }
    findAll() {
        return this.responsablesService.findAll();
    }
    findOne(id) {
        return this.responsablesService.findOne(+id);
    }
    create(createResponsableDto) {
        return this.responsablesService.create(createResponsableDto);
    }
    update(id, updateResponsableDto) {
        return this.responsablesService.update(+id, updateResponsableDto);
    }
    deactivate(id) {
        return this.responsablesService.deactivate(+id);
    }
};
exports.ResponsablesController = ResponsablesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], ResponsablesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], ResponsablesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_responsable_dto_1.CreateResponsableDto]),
    __metadata("design:returntype", Object)
], ResponsablesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_responsable_dto_1.UpdateResponsableDto]),
    __metadata("design:returntype", Object)
], ResponsablesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/desactivar'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], ResponsablesController.prototype, "deactivate", null);
exports.ResponsablesController = ResponsablesController = __decorate([
    (0, common_1.Controller)('catalogos/responsables'),
    __metadata("design:paramtypes", [responsables_service_1.ResponsablesService])
], ResponsablesController);
//# sourceMappingURL=responsables.controller.js.map