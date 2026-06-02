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
exports.RevisionesController = void 0;
const common_1 = require("@nestjs/common");
const request_actor_1 = require("../auth/request-actor");
const capturas_service_1 = require("../capturas/capturas.service");
const resolve_review_dto_1 = require("./dtos/resolve-review.dto");
let RevisionesController = class RevisionesController {
    capturasService;
    constructor(capturasService) {
        this.capturasService = capturasService;
    }
    findForReview(headers) {
        return this.capturasService.listForReview((0, request_actor_1.actorFromHeaders)(headers));
    }
    resolve(headers, capturaId, dto) {
        return this.capturasService.resolveReview(capturaId, (0, request_actor_1.actorFromHeaders)(headers), dto.estado, dto.comentario);
    }
};
exports.RevisionesController = RevisionesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RevisionesController.prototype, "findForReview", null);
__decorate([
    (0, common_1.Post)(':capturaId/resolver'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('capturaId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, resolve_review_dto_1.ResolveReviewDto]),
    __metadata("design:returntype", void 0)
], RevisionesController.prototype, "resolve", null);
exports.RevisionesController = RevisionesController = __decorate([
    (0, common_1.Controller)('revisiones'),
    __metadata("design:paramtypes", [capturas_service_1.CapturasService])
], RevisionesController);
//# sourceMappingURL=revisiones.controller.js.map