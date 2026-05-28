"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicadoresService = void 0;
const common_1 = require("@nestjs/common");
let IndicadoresService = class IndicadoresService {
    indicadores = [];
    idCounter = 1;
    findAll() {
        return this.indicadores;
    }
    findOne(id) {
        const indicador = this.indicadores.find(p => p.id === id);
        if (!indicador)
            throw new common_1.NotFoundException('Indicador no encontrado');
        return indicador;
    }
    create(dto) {
        const indicador = {
            id: this.idCounter++,
            nombre: dto.nombre,
            activo: true,
        };
        this.indicadores.push(indicador);
        return indicador;
    }
    update(id, dto) {
        const indicador = this.findOne(id);
        indicador.nombre = dto.nombre ?? indicador.nombre;
        return indicador;
    }
    deactivate(id) {
        const indicador = this.findOne(id);
        indicador.activo = false;
        return indicador;
    }
};
exports.IndicadoresService = IndicadoresService;
exports.IndicadoresService = IndicadoresService = __decorate([
    (0, common_1.Injectable)()
], IndicadoresService);
//# sourceMappingURL=indicadores.service.js.map