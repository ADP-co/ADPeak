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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateResponsableDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreateResponsableDto {
    usuarioId;
    entidadTipo;
    entidadId;
    tipoResponsabilidad;
    nombre;
}
exports.CreateResponsableDto = CreateResponsableDto;
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateResponsableDto.prototype, "usuarioId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['Indicador', 'Actividad', 'Plantel']),
    __metadata("design:type", String)
], CreateResponsableDto.prototype, "entidadTipo", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateResponsableDto.prototype, "entidadId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['Primario', 'Secundario']),
    __metadata("design:type", String)
], CreateResponsableDto.prototype, "tipoResponsabilidad", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CreateResponsableDto.prototype, "nombre", void 0);
//# sourceMappingURL=create-responsable.dto.js.map