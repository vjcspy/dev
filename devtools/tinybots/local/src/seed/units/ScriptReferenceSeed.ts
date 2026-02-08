import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';

export type ScriptReferenceRefs = {
  scriptReferenceIds: bigint[];
};

export class ScriptReferenceSeed extends AbstractSeed<ScriptReferenceRefs> {
  constructor() {
    super('script_reference');
  }

  async seed(ctx: SeedContext): Promise<ScriptReferenceRefs> {
    const count = 10;
    const ids: bigint[] = [];

    ctx.log(`📝 Seeding ${count} script_reference records...`);

    for (let i = 1; i <= count; i++) {
      const existing = await ctx.tinybots.script_reference.findUnique({
        where: { id: BigInt(i) },
      });

      if (existing) {
        ids.push(existing.id);
        continue;
      }

      const ref = await ctx.tinybots.script_reference.create({
        data: {
          id: BigInt(i),
          robot_id: 1, // Assumes RobotAccountSeed created robot_id=1
          created_at: new Date(),
        },
      });
      ids.push(ref.id);
    }

    ctx.log(`✅ Seeded ${count} script_reference records`);
    return { scriptReferenceIds: ids };
  }

  async clean(ctx: SeedContext): Promise<void> {
    await ctx.tinybots.script_reference.deleteMany({
      where: { id: { gte: BigInt(1), lte: BigInt(10) } },
    });
    ctx.log(`🗑️ Cleaned script_reference seed data`);
  }
}
