import { AbstractSeed } from '../core/AbstractSeed';
import type { SeedContext } from '../core/SeedContext';
import type { ScriptReferenceRefs } from './ScriptReferenceSeed';
import type { ScriptVersionRefs } from './ScriptVersionSeed';
import type { TaskScheduleRefs } from './TaskScheduleSeed';

export type ScriptExecutionRefs = {
  totalSeeded: number;
};

export class ScriptExecutionSeed extends AbstractSeed<ScriptExecutionRefs> {
  private readonly TARGET_COUNT = 1_000_000;
  private readonly BATCH_SIZE = 10_000;

  constructor(
    private scriptRefs: ScriptReferenceRefs,
    private versionRefs: ScriptVersionRefs,
    private scheduleRefs: TaskScheduleRefs,
  ) {
    super('script_execution');
  }

  async seed(ctx: SeedContext): Promise<ScriptExecutionRefs> {
    const totalBatches = Math.ceil(this.TARGET_COUNT / this.BATCH_SIZE);
    const baseTime = new Date('2024-01-01T00:00:00Z').getTime();

    ctx.log(
      `🚀 Starting seed of ${this.TARGET_COUNT.toLocaleString()} script_execution records...`,
    );
    ctx.log(
      `📦 Processing ${totalBatches} batches of ${this.BATCH_SIZE} records each`,
    );

    let totalSeeded = 0;

    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchData = [];
      const batchStart = batchNum * this.BATCH_SIZE;
      const batchEnd = Math.min(
        batchStart + this.BATCH_SIZE,
        this.TARGET_COUNT,
      );
      const currentBatchSize = batchEnd - batchStart;

      for (let i = 0; i < currentBatchSize; i++) {
        const globalIndex = batchStart + i;

        // Random selection from available IDs
        const scriptRefId =
          this.scriptRefs.scriptReferenceIds[
            globalIndex % this.scriptRefs.scriptReferenceIds.length
          ];
        const scriptVersionId =
          this.versionRefs.scriptVersionIds[
            globalIndex % this.versionRefs.scriptVersionIds.length
          ];
        const scheduleId =
          this.scheduleRefs.scheduleIds[
            globalIndex % this.scheduleRefs.scheduleIds.length
          ];

        // Generate timestamp (spread across 1 year)
        // 31536000000 ms in a year / 1000000 records = ~31536 ms between records
        const plannedTime = new Date(baseTime + globalIndex * 31536);
        const createdTime = new Date(plannedTime.getTime() + 1000); // created 1s after planned

        batchData.push({
          script_reference_id: scriptRefId,
          script_version_id: scriptVersionId,
          schedule_id: scheduleId,
          planned: plannedTime,
          created_at: createdTime,
        });
      }

      // Insert batch using Prisma createMany
      await ctx.tinybots.script_execution.createMany({
        data: batchData,
        skipDuplicates: true,
      });

      totalSeeded += currentBatchSize;

      // Progress logging every 10 batches
      if ((batchNum + 1) % 10 === 0 || batchNum === totalBatches - 1) {
        const progress = ((totalSeeded / this.TARGET_COUNT) * 100).toFixed(1);
        const elapsed = Date.now() - baseTime;
        ctx.log(
          `📊 Progress: ${totalSeeded.toLocaleString()} / ${this.TARGET_COUNT.toLocaleString()} (${progress}%)`,
        );
      }
    }

    ctx.log(
      `✅ Successfully seeded ${totalSeeded.toLocaleString()} script_execution records`,
    );

    // Verify count
    const actualCount = await ctx.tinybots.script_execution.count();
    ctx.log(
      `📈 Verification: Total records in script_execution = ${actualCount.toLocaleString()}`,
    );

    return { totalSeeded };
  }

  async clean(ctx: SeedContext): Promise<void> {
    ctx.log(`🧹 Cleaning script_execution seed data...`);

    const deleteResult = await ctx.tinybots.script_execution.deleteMany({
      where: {
        schedule_id: { in: this.scheduleRefs.scheduleIds },
      },
    });

    ctx.log(
      `🗑️ Deleted ${deleteResult.count.toLocaleString()} script_execution records`,
    );
  }
}
