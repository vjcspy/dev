import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';
import type { ScriptReferenceRefs } from './ScriptReferenceSeed';

export type ScriptVersionRefs = {
  scriptVersionIds: bigint[];
};

export class ScriptVersionSeed extends AbstractSeed<ScriptVersionRefs> {
  constructor(private refs: ScriptReferenceRefs) {
    super('script_version');
  }

  async seed(ctx: SeedContext): Promise<ScriptVersionRefs> {
    const ids: bigint[] = [];

    ctx.log(`📝 Seeding script_version records...`);

    // Create 1 version per reference
    for (const refId of this.refs.scriptReferenceIds) {
      const existing = await ctx.tinybots.script_version.findFirst({
        where: {
          script_reference_id: refId,
        },
      });

      if (existing) {
        ids.push(existing.id);
        continue;
      }

      const version = await ctx.tinybots.script_version.create({
        data: {
          script_reference_id: refId,
          script_name: `Seed Script ${refId}`,
          duration: 60,
          created_at: new Date(),
        },
      });
      ids.push(version.id);
    }

    ctx.log(`✅ Seeded ${ids.length} script_version records`);
    return { scriptVersionIds: ids };
  }

  async clean(ctx: SeedContext): Promise<void> {
    await ctx.tinybots.script_version.deleteMany({
      where: {
        script_reference_id: {
          in: this.refs.scriptReferenceIds.map((id) => id),
        },
      },
    });
    ctx.log(`🗑️ Cleaned script_version seed data`);
  }
}
