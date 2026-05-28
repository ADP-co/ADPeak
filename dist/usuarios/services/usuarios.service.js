"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuariosService = void 0;
const common_1 = require("@nestjs/common");
let UsuariosService = class UsuariosService {
    usuarios = [];
    idCounter = 1;
    findAll() {
        return this.usuarios;
    }
    findOne(id) {
        const usuario = this.usuarios.find(p => p.id === id);
        if (!usuario)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return usuario;
    }
    create(dto) {
        const usuario = {
            id: this.idCounter++,
            nombre: dto.nombre,
            activo: true,
        };
        this.usuarios.push(usuario);
        return usuario;
    }
    update(id, dto) {
        const usuario = this.findOne(id);
        usuario.nombre = dto.nombre ?? usuario.nombre;
        return usuario;
    }
    deactivate(id) {
        const usuario = this.findOne(id);
        usuario.activo = false;
        return usuario;
    }
};
exports.UsuariosService = UsuariosService;
exports.UsuariosService = UsuariosService = __decorate([
    (0, common_1.Injectable)()
], UsuariosService);
//# sourceMappingURL=usuarios.service.js.map