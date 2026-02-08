import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';

export class IncomingEventCleanerSeed extends AbstractSeed<void> {
  constructor() {
    super('incoming_event');
  }
  async seed(): Promise<void> {}
  async clean(ctx: SeedContext): Promise<void> {
    await ctx.tinybots.incoming_event.deleteMany({});
  }
}
