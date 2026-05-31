export type CrudEntity<T extends object = Record<string, unknown>> = T & {
    id: number;
    activo: boolean;
};
export declare abstract class InMemoryCrudService<TCreate extends object, TUpdate extends object> {
    private readonly resourceName;
    private readonly items;
    private idCounter;
    protected constructor(resourceName: string);
    findAll(): Array<CrudEntity<TCreate>>;
    findOne(id: number): CrudEntity<TCreate>;
    create(dto: TCreate): CrudEntity<TCreate>;
    update(id: number, dto: TUpdate): CrudEntity<TCreate>;
    deactivate(id: number): CrudEntity<TCreate>;
}
