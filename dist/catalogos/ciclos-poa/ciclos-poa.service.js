"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CiclosPoaService = void 0;
const common_1 = require("@nestjs/common");
let CiclosPoaService = class CiclosPoaService {
    ciclos = [];
    idCounter = 1;
    findAll() {
        return this.ciclos;
    }
    findOne(id) {
        const ciclo = this.ciclos.find(p => p.id === id);
        if (!ciclo)
            throw new common_1.NotFoundException('Ciclo POA no encontrado');
        return ciclo;
    }
    create(dto) {
        const ciclo = {
            id: this.idCounter++,
            nombre: dto.nombre,
            activo: true,
        };
        this.ciclos.push(ciclo);
        return ciclo;
    }
    update(id, dto) {
        const ciclo = this.findOne(id);
        ciclo.nombre = dto.nombre ?? ciclo.nombre;
        return ciclo;
    }
    deactivate(id) {
        const ciclo = this.findOne(id);
        ciclo.activo = false;
        return ciclo;
    }
};
exports.CiclosPoaService = CiclosPoaService;
exports.CiclosPoaService = CiclosPoaService = __decorate([
    (0, common_1.Injectable)()
], CiclosPoaService);
//# sourceMappingURL=ciclos-poa.service.js.map