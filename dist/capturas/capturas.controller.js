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
exports.CapturasController = void 0;
const common_1 = require("@nestjs/common");
const request_actor_1 = require("../auth/request-actor");
const capturas_service_1 = require("./capturas.service");
const create_capture_draft_dto_1 = require("./dtos/create-capture-draft.dto");
const update_capture_dto_1 = require("./dtos/update-capture.dto");
let CapturasController = class CapturasController {
    capturasService;
    constructor(capturasService) {
        this.capturasService = capturasService;
    }
    createDraft(headers, dto) {
        return this.capturasService.createDraft((0, request_actor_1.actorFromHeaders)(headers), dto);
    }
    findOne(headers, id) {
        return this.capturasService.findOneForActor(id, (0, request_actor_1.actorFromHeaders)(headers));
    }
    getStatus(headers, id) {
        return this.capturasService.getStatus(id, (0, request_actor_1.actorFromHeaders)(headers));
    }
    getHistory(headers, id) {
        return this.capturasService.getHistory(id, (0, request_actor_1.actorFromHeaders)(headers));
    }
    updateDraft(headers, id, dto) {
        return this.capturasService.updateDraft(id, (0, request_actor_1.actorFromHeaders)(headers), dto);
    }
    sendToReview(headers, id) {
        return this.capturasService.sendToReview(id, (0, request_actor_1.actorFromHeaders)(headers));
    }
};
exports.CapturasController = CapturasController;
__decorate([
    (0, common_1.Post)('borradores'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_capture_draft_dto_1.CreateCaptureDraftDto]),
    __metadata("design:returntype", void 0)
], CapturasController.prototype, "createDraft", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CapturasController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/estado'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CapturasController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)(':id/historial'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CapturasController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, update_capture_dto_1.UpdateCaptureDto]),
    __metadata("design:returntype", void 0)
], CapturasController.prototype, "updateDraft", null);
__decorate([
    (0, common_1.Post)(':id/enviar-revision'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CapturasController.prototype, "sendToReview", null);
exports.CapturasController = CapturasController = __decorate([
    (0, common_1.Controller)('capturas'),
    __metadata("design:paramtypes", [capturas_service_1.CapturasService])
], CapturasController);
//# sourceMappingURL=capturas.controller.js.map