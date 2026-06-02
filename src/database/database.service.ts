import { Injectable, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SIGI_POA_SCHEMA_SQL } from './schema';

type SqlValue = string | number | bigint | null | Buffer;
type SqlParams = Record<string, SqlValue> | SqlValue[];

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db?: DatabaseSync;

  onModuleInit() {
    this.connect();
    this.migrate();
  }

  get connection(): DatabaseSync {
    if (!this.db) {
      this.connect();
      this.migrate();
    }

    if (!this.db) {
      throw new Error('No se pudo inicializar la conexion de base de datos');
    }

    return this.db;
  }

  query<T extends object>(sql: string, params: SqlParams = []): T[] {
    const statement = this.connection.prepare(sql);
    return (
      Array.isArray(params) ? statement.all(...params) : statement.all(params)
    ) as T[];
  }

  get<T extends object>(sql: string, params: SqlParams = []): T | undefined {
    const statement = this.connection.prepare(sql);
    return (
      Array.isArray(params) ? statement.get(...params) : statement.get(params)
    ) as T | undefined;
  }

  run(sql: string, params: SqlParams = []) {
    const statement = this.connection.prepare(sql);
    return Array.isArray(params)
      ? statement.run(...params)
      : statement.run(params);
  }

  exec(sql: string) {
    this.connection.exec(sql);
  }

  private connect() {
    if (this.db) {
      return;
    }

    const configuredPath = process.env.ADPEAK_DB_PATH ?? 'data/adpeak.sqlite';
    const dbPath =
      configuredPath === ':memory:'
        ? ':memory:'
        : resolve(process.cwd(), configuredPath);

    if (dbPath !== ':memory:') {
      mkdirSync(dirname(dbPath), { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  private migrate() {
    this.connection.exec(SIGI_POA_SCHEMA_SQL);
  }
}
