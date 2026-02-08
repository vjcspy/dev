import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';
import type { EventProviderRefs } from './EventProviderSeed';
import type { EventSchemaRefs } from './EventSchemaSeed';
import type { RobotAccountRefs } from './RobotAccountSeed';

export type IncomingEventRefs = { incomingEventId: bigint };

export class IncomingEventSeed extends AbstractSeed<IncomingEventRefs> {
  constructor(
    private readonly robot: RobotAccountRefs,
    private readonly provider: EventProviderRefs,
    private readonly schema: EventSchemaRefs,
  ) {
    super('incoming_event');
  }
  async seed(ctx: SeedContext): Promise<IncomingEventRefs> {
    const e = await ctx.tinybots.incoming_event.create({
      data: {
        event_type_id: this.schema.eventTypeId,
        level: 1,
        robot_id: this.robot.robotId,
        provider_id: this.provider.providerId,
        reference_id: `ref-${ctx.scope}`,
      },
    });
    return { incomingEventId: e.id };
  }
  async clean(ctx: SeedContext): Promise<void> {}
}
