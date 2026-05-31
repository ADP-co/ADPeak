"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCrudService = void 0;
const common_1 = require("@nestjs/common");
class InMemoryCrudService {
    resourceName;
    items;
    idCounter;
    constructor(resourceName) {
        this.resourceName = resourceName;
        this.items = [];
        this.idCounter = 1;
    }
    findAll() {
        return this.items;
    }
    findOne(id) {
        const item = this.items.find((record) => record.id === id);
        if (!item) {
            throw new common_1.NotFoundException(`${this.resourceName} no encontrado`);
        }
        return item;
    }
    create(dto) {
        const item = {
            id: this.idCounter++,
            ...dto,
            activo: true,
        };
        this.items.push(item);
        return item;
    }
    update(id, dto) {
        const item = this.findOne(id);
        Object.entries(dto).forEach(([key, value]) => {
            if (value !== undefined) {
                Object.assign(item, { [key]: value });
            }
        });
        return item;
    }
    deactivate(id) {
        const item = this.findOne(id);
        item.activo = false;
        return item;
    }
}
exports.InMemoryCrudService = InMemoryCrudService;
//# sourceMappingURL=in-memory-crud.service.js.map