export type ActorRole = 'admin' | 'plantel' | 'responsable';
export type RequestActor = {
    userId: number;
    role: ActorRole;
    plantelId?: number;
    responsableId?: number;
};
type RawHeaders = Record<string, string | string[] | undefined>;
export declare function actorFromHeaders(headers: RawHeaders): RequestActor;
export declare function requireRole(actor: RequestActor, allowed: ActorRole[]): void;
export {};
