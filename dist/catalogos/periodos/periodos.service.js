"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeriodosService = void 0;
const common_1 = require("@nestjs/common");
let PeriodosService = class PeriodosService {
    periodos = [];
    idCounter = 1;
    findAll() {
        return this.periodos;
    }
    findOne(id) {
        const periodo = this.periodos.find(p => p.id === id);
        if (!periodo)
            throw new common_1.NotFoundException('Periodo no encontrado');
        return periodo;
    }
    create(dto) {
        const periodo = {
            id: this.idCounter++,
            nombre: dto.nombre,
            activo: true,
        };
        this.periodos.push(periodo);
        return periodo;
    }
    update(id, dto) {
        const periodo = this.findOne(id);
        periodo.nombre = dto.nombre ?? periodo.nombre;
        return periodo;
    }
    deactivate(id) {
        const periodo = this.findOne(id);
        periodo.activo = false;
        return periodo;
    }
};
exports.PeriodosService = PeriodosService;
exports.PeriodosService = PeriodosService = __decorate([
    (0, common_1.Injectable)()
], PeriodosService);
//# sourceMappingURL=periodos.service.js.map