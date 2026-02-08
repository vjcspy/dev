import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';

export type MicroManagerTriggeredApisRefs = {
  robotId: number;
  userId: number;
  scriptReferenceId: bigint;
  scriptVersionId: bigint;
  scriptStepIds: bigint[];
  triggeringEventId: bigint;
  triggerName: string;
};

export class MicroManagerTriggeredApisSeed extends AbstractSeed<MicroManagerTriggeredApisRefs> {
  constructor() {
    super('micro_manager_triggered_apis');
  }

  async seed(ctx: SeedContext): Promise<MicroManagerTriggeredApisRefs> {
    const robotId = 1;
    const userId = 1;

    const scriptReferenceId = BigInt(9001);
    const scriptVersionId = BigInt(9001);
    const scriptStepIds = [BigInt(9101), BigInt(9102)];

    const eventSchemaName = 'seed.micro-manager.trigger';
    const triggerName = eventSchemaName;

    const eventTypeId = BigInt(9201);
    const eventTriggerSettingId = BigInt(9301);
    const eventSubscriptionId = BigInt(9401);
    const incomingEventId = BigInt(9501);
    const outgoingEventId = BigInt(9601);
    const triggeringEventId = BigInt(9701);

    const now = new Date();

    await ctx.tinybots.user_account.upsert({
      where: { id: userId },
      update: { email: 'seed-user@tinybots.local' },
      create: {
        id: userId,
        email: 'seed-user@tinybots.local',
        password:
          'PBKDF2WithHmacSHA512:1024:18:NDdUxqBLUpif/OQI9KWTm0B4VkyRamu8:eus+wi62zGmjEh/QJiJF2Sfe',
        eula_accepted_at: now,
      },
    });

    const existingUserRobotRole = await ctx.tinybots.user_robot_role.findUnique(
      { where: { id: 1 } },
    );
    if (!existingUserRobotRole) {
      await ctx.tinybots.user_robot_role.create({
        data: { id: 1, role: 'owner' },
      });
    }

    const existingClientRelationRole =
      await ctx.tinybots.client_relation_role.findUnique({ where: { id: 4 } });
    if (!existingClientRelationRole) {
      await ctx.tinybots.client_relation_role.create({
        data: { id: 4, name: 'owner' },
      });
    }

    const existingUserRobot = await ctx.tinybots.user_robot.findFirst({
      where: { user_id: userId, robot_id: robotId },
    });
    if (!existingUserRobot) {
      await ctx.tinybots.user_robot.create({
        data: {
          user_id: userId,
          robot_id: robotId,
          role_id: 1,
          client_relation_role_id: 4,
          created_at: now,
        },
      });
    }

    const existingScriptReference =
      await ctx.tinybots.script_reference.findUnique({
        where: { id: scriptReferenceId },
      });
    if (!existingScriptReference) {
      await ctx.tinybots.script_reference.create({
        data: {
          id: scriptReferenceId,
          robot_id: robotId,
          created_at: now,
        },
      });
    }

    const existingCategory = await ctx.tinybots.script_category.findFirst({
      orderBy: { id: 'asc' },
    });
    const scriptCategoryId = existingCategory?.id ?? 1;
    if (!existingCategory) {
      await ctx.tinybots.script_category.create({
        data: { id: scriptCategoryId, name: 'seed' },
      });
    }

    const existingScriptVersion = await ctx.tinybots.script_version.findUnique({
      where: { id: scriptVersionId },
    });
    if (!existingScriptVersion) {
      await ctx.tinybots.script_version.create({
        data: {
          id: scriptVersionId,
          script_reference_id: scriptReferenceId,
          script_name: 'Seed Triggered Script',
          duration: 10,
          script_category_id: scriptCategoryId,
          created_at: now,
        },
      });
    }

    const stepType = await ctx.tinybots.step_type.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!stepType) {
      throw new Error(
        'No step_type rows found; typ-e migrations likely not applied',
      );
    }

    for (let i = 0; i < scriptStepIds.length; i++) {
      const id = scriptStepIds[i];
      const existing = await ctx.tinybots.script_step.findUnique({
        where: { id },
      });
      if (existing) continue;
      await ctx.tinybots.script_step.create({
        data: {
          id,
          step_type_id: stepType.id,
          script_version_id: scriptVersionId,
          first: i === 0,
          created_at: now,
        },
      });
    }

    const existingEventSchema = await ctx.tinybots.event_schema.findUnique({
      where: { id: eventTypeId },
    });
    if (!existingEventSchema) {
      await ctx.tinybots.event_schema.create({
        data: {
          id: eventTypeId,
          name: eventSchemaName,
          description: 'seed event schema for micro-manager triggered apis',
          level: 1,
          is_active: true,
          has_trigger: true,
          created_at: now,
          updated_at: now,
        },
      });
    }

    const existingEventSubscription =
      await ctx.tinybots.event_subscription.findUnique({
        where: { id: eventSubscriptionId },
      });
    if (!existingEventSubscription) {
      await ctx.tinybots.event_subscription.create({
        data: {
          id: eventSubscriptionId,
          robot_id: robotId,
          subscription_type: 1,
          queue: `seed.micro-manager.${ctx.scope}`,
          created_at: now,
          updated_at: now,
        },
      });
    }

    const provider = await ctx.tinybots.event_provider.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!provider) {
      throw new Error('No event_provider rows found; run base seeds first');
    }

    const existingIncomingEvent = await ctx.tinybots.incoming_event.findUnique({
      where: { id: incomingEventId },
    });
    if (!existingIncomingEvent) {
      await ctx.tinybots.incoming_event.create({
        data: {
          id: incomingEventId,
          event_type_id: eventTypeId,
          level: 1,
          robot_id: robotId,
          provider_id: provider.id,
          reference_id: `seed.micro-manager.${ctx.scope}`,
          created_at: now,
          updated_at: now,
        },
      });
    }

    const existingOutgoingEvent = await ctx.tinybots.outgoing_event.findUnique({
      where: { id: outgoingEventId },
    });
    if (!existingOutgoingEvent) {
      await ctx.tinybots.outgoing_event.create({
        data: {
          id: outgoingEventId,
          source_event_id: incomingEventId,
          subscription_id: eventSubscriptionId,
          status: 'seeded',
          created_at: now,
          updated_at: now,
        },
      });
    }

    const existingEventTriggerSetting =
      await ctx.tinybots.event_trigger_setting.findUnique({
        where: { id: eventTriggerSettingId },
      });
    if (!existingEventTriggerSetting) {
      await ctx.tinybots.event_trigger_setting.create({
        data: {
          id: eventTriggerSettingId,
          robot_id: robotId,
          event_type_id: eventTypeId,
          default_script_reference_id: scriptReferenceId,
          created_at: now,
          updated_at: now,
        },
      });
    }

    const existingEventTrigger = await ctx.tinybots.event_trigger.findUnique({
      where: { id: triggeringEventId },
    });
    if (!existingEventTrigger) {
      await ctx.tinybots.event_trigger.create({
        data: {
          id: triggeringEventId,
          setting_id: eventTriggerSettingId,
          robot_id: robotId,
          status: 'executed',
          script_reference_id: scriptReferenceId,
          outgoing_event_id: outgoingEventId,
          level: 1,
          executed_at: now,
          expected_executed_at: now,
          created_at: now,
          updated_at: now,
        },
      });
    }

    return {
      robotId,
      userId,
      scriptReferenceId,
      scriptVersionId,
      scriptStepIds,
      triggeringEventId,
      triggerName,
    };
  }

  async clean(ctx: SeedContext): Promise<void> {
    await ctx.tinybots.closed_question_execution_data.deleteMany({
      where: {
        script_step_execution: {
          script_execution: { script_reference_id: BigInt(9001) },
        },
      },
    });
    await ctx.tinybots.multiple_choice_execution_data.deleteMany({
      where: {
        script_step_execution: {
          script_execution: { script_reference_id: BigInt(9001) },
        },
      },
    });
    await ctx.tinybots.report_execution_data.deleteMany({
      where: {
        script_step_execution: {
          script_execution: { script_reference_id: BigInt(9001) },
        },
      },
    });
    await ctx.tinybots.script_step_execution.deleteMany({
      where: { script_execution: { script_reference_id: BigInt(9001) } },
    });
    await ctx.tinybots.script_execution.deleteMany({
      where: { script_reference_id: BigInt(9001) },
    });
    await ctx.tinybots.event_trigger.deleteMany({
      where: { id: BigInt(9701) },
    });
    await ctx.tinybots.event_trigger_setting.deleteMany({
      where: { id: BigInt(9301) },
    });
    await ctx.tinybots.outgoing_event.deleteMany({
      where: { id: BigInt(9601) },
    });
    await ctx.tinybots.incoming_event.deleteMany({
      where: { id: BigInt(9501) },
    });
    await ctx.tinybots.event_subscription.deleteMany({
      where: { id: BigInt(9401) },
    });
    await ctx.tinybots.event_schema.deleteMany({ where: { id: BigInt(9201) } });
    await ctx.tinybots.script_step.deleteMany({
      where: { id: { in: [BigInt(9101), BigInt(9102)] } },
    });
    await ctx.tinybots.script_version.deleteMany({
      where: { id: BigInt(9001) },
    });
    await ctx.tinybots.script_reference.deleteMany({
      where: { id: BigInt(9001) },
    });
    await ctx.tinybots.user_robot.deleteMany({
      where: { user_id: 1, robot_id: 1 },
    });
    await ctx.tinybots.user_account.deleteMany({ where: { id: 1 } });
  }

  describe(): string {
    return `${this.name} (robotId=1, scriptReferenceId=9001, triggeringEventId=9701)`;
  }
}
