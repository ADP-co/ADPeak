import { OnModuleInit } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
type SqlValue = string | number | bigint | null | Buffer;
type SqlParams = Record<string, SqlValue> | SqlValue[];
export declare class DatabaseService implements OnModuleInit {
    private db?;
    onModuleInit(): void;
    get connection(): DatabaseSync;
    query<T extends object>(sql: string, params?: SqlParams): T[];
    get<T extends object>(sql: string, params?: SqlParams): T | undefined;
    run(sql: string, params?: SqlParams): import("node:sqlite").StatementResultingChanges;
    exec(sql: string): void;
    private connect;
    private migrate;
}
export {};
