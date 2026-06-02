import { NotFoundException } from '@nestjs/common';

export type CrudEntity<T extends object = Record<string, unknown>> = T & {
  id: number;
  activo: boolean;
};

export abstract class InMemoryCrudService<
  TCreate extends object,
  TUpdate extends object,
> {
  private readonly items: Array<CrudEntity<TCreate>>;
  private idCounter: number;

  protected constructor(private readonly resourceName: string) {
    this.items = [];
    this.idCounter = 1;
  }

  findAll(): Array<CrudEntity<TCreate>> {
    return this.items;
  }

  findOne(id: number): CrudEntity<TCreate> {
    const item = this.items.find((record) => record.id === id);

    if (!item) {
      throw new NotFoundException(`${this.resourceName} no encontrado`);
    }

    return item;
  }

  create(dto: TCreate): CrudEntity<TCreate> {
    const item = {
      id: this.idCounter++,
      ...dto,
      activo: true,
    } as CrudEntity<TCreate>;

    this.items.push(item);
    return item;
  }

  update(id: number, dto: TUpdate): CrudEntity<TCreate> {
    const item = this.findOne(id);
    Object.entries(dto as Record<string, unknown>).forEach(([key, value]) => {
      if (value !== undefined) {
        (item as Record<string, unknown>)[key] = value;
      }
    });
    return item;
  }

  deactivate(id: number): CrudEntity<TCreate> {
    const item = this.findOne(id);
    item.activo = false;
    return item;
  }
}
