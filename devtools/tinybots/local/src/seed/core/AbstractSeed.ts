import type { SeedContext } from './SeedContext';

export type UniqueKey = { table: string; scope: string; key: string };

export abstract class AbstractSeed<TRefs> {
  readonly name: string;
  readonly dependencies: AbstractSeed<any>[];
  constructor(name: string, dependencies: AbstractSeed<any>[] = []) {
    this.name = name;
    this.dependencies = dependencies;
  }
  abstract seed(ctx: SeedContext): Promise<TRefs>;
  abstract clean(ctx: SeedContext, refs?: TRefs): Promise<void>;
  getKey(ctx: SeedContext): UniqueKey {
    return {
      table: this.name,
      scope: ctx.scope,
      key: `${this.name}-${ctx.scope}`,
    };
  }
  describe(): string {
    return this.name;
  }
}
