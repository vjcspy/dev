import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';

export type EventSchemaRefs = { eventTypeId: bigint; name: string };

export class EventSchemaSeed extends AbstractSeed<EventSchemaRefs> {
  constructor(
    private readonly level = 1,
    private readonly hasTrigger = false,
  ) {
    super('event_schema');
  }
  async seed(ctx: SeedContext): Promise<EventSchemaRefs> {
    const name = `seed.event.${ctx.scope}`;
    const s = await ctx.tinybots.event_schema.upsert({
      where: { name },
      update: { level: this.level },
      create: {
        name,
        description: 'seed event schema',
        level: this.level,
        is_active: true,
        has_trigger: this.hasTrigger,
      },
    });
    return { eventTypeId: s.id, name };
  }
  async clean(ctx: SeedContext, refs?: EventSchemaRefs): Promise<void> {
    await ctx.tinybots.event_schema.deleteMany({});
  }
}
