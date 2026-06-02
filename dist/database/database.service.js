"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_sqlite_1 = require("node:sqlite");
const schema_1 = require("./schema");
let DatabaseService = class DatabaseService {
    db;
    onModuleInit() {
        this.connect();
        this.migrate();
    }
    get connection() {
        if (!this.db) {
            this.connect();
            this.migrate();
        }
        if (!this.db) {
            throw new Error('No se pudo inicializar la conexion de base de datos');
        }
        return this.db;
    }
    query(sql, params = []) {
        const statement = this.connection.prepare(sql);
        return (Array.isArray(params) ? statement.all(...params) : statement.all(params));
    }
    get(sql, params = []) {
        const statement = this.connection.prepare(sql);
        return (Array.isArray(params) ? statement.get(...params) : statement.get(params));
    }
    run(sql, params = []) {
        const statement = this.connection.prepare(sql);
        return Array.isArray(params)
            ? statement.run(...params)
            : statement.run(params);
    }
    exec(sql) {
        this.connection.exec(sql);
    }
    connect() {
        if (this.db) {
            return;
        }
        const configuredPath = process.env.ADPEAK_DB_PATH ?? 'data/adpeak.sqlite';
        const dbPath = configuredPath === ':memory:'
            ? ':memory:'
            : (0, node_path_1.resolve)(process.cwd(), configuredPath);
        if (dbPath !== ':memory:') {
            (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(dbPath), { recursive: true });
        }
        this.db = new node_sqlite_1.DatabaseSync(dbPath);
        this.db.exec('PRAGMA foreign_keys = ON;');
    }
    migrate() {
        this.connection.exec(schema_1.SIGI_POA_SCHEMA_SQL);
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map