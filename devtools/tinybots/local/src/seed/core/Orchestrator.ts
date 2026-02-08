import { AbstractSeed } from './AbstractSeed';
import type { SeedContext } from './SeedContext';
import { SeedGraph } from './SeedGraph';

export class Orchestrator {
  constructor(
    private readonly seeds: AbstractSeed<any>[],
    private readonly ctx: SeedContext,
  ) {}
  async run(dryRun = false): Promise<Record<string, unknown>> {
    const graph = new SeedGraph();
    this.seeds.forEach((s) => graph.add(s));
    const order = graph.resolveOrder();
    for (const s of order) {
      if (dryRun) {
        this.ctx.log({ action: 'dry-run', seed: s.describe() });
        continue;
      }
      const refs = await s.seed(this.ctx);
      this.ctx.registry.set(s.name, refs);
      this.ctx.log({ action: 'seeded', seed: s.describe(), refs });
    }
    const snapshot: Record<string, unknown> = {};
    this.ctx.registry.forEach((v, k) => {
      snapshot[k] = v;
    });
    return snapshot;
  }
  async clean(): Promise<void> {
    const graph = new SeedGraph();
    this.seeds.forEach((s) => graph.add(s));
    const order = graph.resolveOrder().reverse();
    for (const s of order) {
      const refs = this.ctx.registry.get(s.name);
      await s.clean(this.ctx, refs as any);
      this.ctx.log({ action: 'cleaned', seed: s.describe() });
    }
  }
}
