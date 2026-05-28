"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActividadesService = void 0;
const common_1 = require("@nestjs/common");
let ActividadesService = class ActividadesService {
    actividades = [];
    idCounter = 1;
    findAll() {
        return this.actividades;
    }
    findOne(id) {
        const actividad = this.actividades.find(p => p.id === id);
        if (!actividad)
            throw new common_1.NotFoundException('Actividad no encontrada');
        return actividad;
    }
    create(dto) {
        const actividad = {
            id: this.idCounter++,
            nombre: dto.nombre,
            activo: true,
        };
        this.actividades.push(actividad);
        return actividad;
    }
    update(id, dto) {
        const actividad = this.findOne(id);
        actividad.nombre = dto.nombre ?? actividad.nombre;
        return actividad;
    }
    deactivate(id) {
        const actividad = this.findOne(id);
        actividad.activo = false;
        return actividad;
    }
};
exports.ActividadesService = ActividadesService;
exports.ActividadesService = ActividadesService = __decorate([
    (0, common_1.Injectable)()
], ActividadesService);
//# sourceMappingURL=actividades.service.js.map