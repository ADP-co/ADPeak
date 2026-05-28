"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponsablesService = void 0;
const common_1 = require("@nestjs/common");
let ResponsablesService = class ResponsablesService {
    responsables = [];
    idCounter = 1;
    findAll() {
        return this.responsables;
    }
    findOne(id) {
        const responsable = this.responsables.find(p => p.id === id);
        if (!responsable)
            throw new common_1.NotFoundException('Responsable no encontrado');
        return responsable;
    }
    create(dto) {
        const responsable = {
            id: this.idCounter++,
            nombre: dto.nombre,
            activo: true,
        };
        this.responsables.push(responsable);
        return responsable;
    }
    update(id, dto) {
        const responsable = this.findOne(id);
        responsable.nombre = dto.nombre ?? responsable.nombre;
        return responsable;
    }
    deactivate(id) {
        const responsable = this.findOne(id);
        responsable.activo = false;
        return responsable;
    }
};
exports.ResponsablesService = ResponsablesService;
exports.ResponsablesService = ResponsablesService = __decorate([
    (0, common_1.Injectable)()
], ResponsablesService);
//# sourceMappingURL=responsables.service.js.map