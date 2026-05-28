"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlantelesService = void 0;
const common_1 = require("@nestjs/common");
let PlantelesService = class PlantelesService {
    planteles = [];
    idCounter = 1;
    findAll() {
        return this.planteles;
    }
    findOne(id) {
        const plantel = this.planteles.find(p => p.id === id);
        if (!plantel)
            throw new common_1.NotFoundException('Plantel no encontrado');
        return plantel;
    }
    create(dto) {
        const plantel = {
            id: this.idCounter++,
            nombre: dto.nombre,
            activo: true,
        };
        this.planteles.push(plantel);
        return plantel;
    }
    update(id, dto) {
        const plantel = this.findOne(id);
        plantel.nombre = dto.nombre ?? plantel.nombre;
        return plantel;
    }
    deactivate(id) {
        const plantel = this.findOne(id);
        plantel.activo = false;
        return plantel;
    }
};
exports.PlantelesService = PlantelesService;
exports.PlantelesService = PlantelesService = __decorate([
    (0, common_1.Injectable)()
], PlantelesService);
//# sourceMappingURL=planteles.service.js.map