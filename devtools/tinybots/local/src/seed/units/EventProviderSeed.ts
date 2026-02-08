import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';

export type EventProviderRefs = { providerId: number; name: string };

export class EventProviderSeed extends AbstractSeed<EventProviderRefs[]> {
  constructor() {
    super('event_provider');
  }

  async seed(ctx: SeedContext): Promise<EventProviderRefs[]> {
    const providerNames = [
      'seed-provider',
      'azi-3-status-jobs',
      'seed-provider-1',
      'seed-provider-2',
      'seed-provider-3',
    ];
    const refs: EventProviderRefs[] = [];
    for (const name of providerNames) {
      const p = await ctx.tinybots.event_provider.upsert({
        where: { name },
        update: {},
        create: { name, description: 'seed provider' },
      });
      refs.push({ providerId: p.id, name });
    }

    return refs;
  }

  async clean(ctx: SeedContext, refs?: EventProviderRefs[]): Promise<void> {
    await ctx.tinybots.event_provider.deleteMany({});
  }
}
