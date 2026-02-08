import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';

export type RobotAccountStatusRefs = { statusId: number };

export class RobotAccountStatusSeed extends AbstractSeed<RobotAccountStatusRefs> {
  constructor() {
    super('robot_account_status');
  }
  async seed(ctx: SeedContext): Promise<RobotAccountStatusRefs> {
    await ctx.tinybots.robot_account_status.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, status: 'active' },
    });
    return { statusId: 1 };
  }
  async clean(ctx: SeedContext): Promise<void> {
    await ctx.tinybots.robot_account_status.deleteMany({});
  }
}
