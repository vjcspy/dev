import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';
import type { RobotAccountStatusRefs } from './RobotAccountStatusSeed';

export type RobotAccountRefs = { robotId: number; username: string };

export class RobotAccountSeed extends AbstractSeed<RobotAccountRefs> {
  constructor(private readonly status: { refs?: RobotAccountStatusRefs } = {}) {
    super('robot_account');
  }

  async seed(ctx: SeedContext): Promise<RobotAccountRefs> {
    const username = `robot-${ctx.scope}`;
    const password =
      'PBKDF2WithHmacSHA512:1024:18:NDdUxqBLUpif/OQI9KWTm0B4VkyRamu8:eus+wi62zGmjEh/QJiJF2Sfe';
    const r = await ctx.tinybots.robot_account.upsert({
      where: { id: 1 },
      update: {
        username: 'username-1',
        password,
        role: 'robot',
        account_status_id: 1,
      },
      create: {
        id: 1,
        username: 'username-1',
        password,
        role: 'robot',
        account_status_id: 1,
      },
    });
    return { robotId: r.id, username };
  }

  async clean(ctx: SeedContext, refs?: RobotAccountRefs): Promise<void> {
    await ctx.tinybots.robot_account.deleteMany({});
  }
}
