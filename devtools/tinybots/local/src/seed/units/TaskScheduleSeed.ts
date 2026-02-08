import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';

export type TaskScheduleRefs = {
  scheduleIds: bigint[];
};

export class TaskScheduleSeed extends AbstractSeed<TaskScheduleRefs> {
  constructor() {
    super('task_schedule');
  }

  async seed(ctx: SeedContext): Promise<TaskScheduleRefs> {
    const count = 100;
    const ids: bigint[] = [];
    const now = new Date();

    ctx.log(`📝 Seeding ${count} task_schedule records...`);

    for (let i = 1; i <= count; i++) {
      const scheduleId = BigInt(1000000 + i); // Use high IDs to avoid conflicts

      const existing = await ctx.tinybots.task_schedule.findUnique({
        where: { id: scheduleId },
      });

      if (existing) {
        ids.push(existing.id);
        continue;
      }

      const schedule = await ctx.tinybots.task_schedule.create({
        data: {
          id: scheduleId,
          duration: 60,
          recurrence_type: 'CRON',
          minute: '0',
          hour: '9',
          day_of_month: '*',
          month: '*',
          day_of_week: '*',
          start_at: new Date(now.getTime() + i * 3600000),
          created_at: now,
        },
      });
      ids.push(schedule.id);
    }

    ctx.log(`✅ Seeded ${count} task_schedule records`);
    return { scheduleIds: ids };
  }

  async clean(ctx: SeedContext): Promise<void> {
    await ctx.tinybots.task_schedule.deleteMany({
      where: { id: { gte: BigInt(1000000), lte: BigInt(1000100) } },
    });
    ctx.log(`🗑️ Cleaned task_schedule seed data`);
  }
}
