import 'dotenv/config';

import { Orchestrator } from './core/Orchestrator';
import { createContext, destroyContext } from './core/SeedContext';
import { EventProviderSeed } from './units/EventProviderSeed';
import { IncomingEventCleanerSeed } from './units/IncomingEventCleanerSeed';
import { MicroManagerTriggeredApisSeed } from './units/MicroManagerTriggeredApisSeed';
import { RobotAccountSeed } from './units/RobotAccountSeed';
import { RobotAccountStatusSeed } from './units/RobotAccountStatusSeed';
import { ScriptExecutionSeed } from './units/ScriptExecutionSeed';
import { ScriptReferenceSeed } from './units/ScriptReferenceSeed';
import { ScriptVersionSeed } from './units/ScriptVersionSeed';
import { TaskScheduleSeed } from './units/TaskScheduleSeed';

async function main() {
  const args = process.argv.slice(2);
  const scopeArg = args.find((a) => a.startsWith('--scope='));
  const clean = args.includes('--clean');
  const dryRun = args.includes('--dry-run');
  const scope = scopeArg ? scopeArg.split('=')[1] : ``;
  const ctx = await createContext(scope);
  try {
    const status = new RobotAccountStatusSeed();
    const robot = new RobotAccountSeed({ refs: {} });
    const provider = new EventProviderSeed();

    const seeds = [status, robot, provider];
    const orchestrator = new Orchestrator(seeds, ctx);

    if (clean) {
      // Clean in reverse order
      const scriptRef = new ScriptReferenceSeed();
      const scriptRefRefs = { scriptReferenceIds: [] as bigint[] };
      const scriptVersion = new ScriptVersionSeed(scriptRefRefs);
      const scriptVersionRefs = { scriptVersionIds: [] as bigint[] };
      const taskSchedule = new TaskScheduleSeed();
      const taskScheduleRefs = { scheduleIds: [] as bigint[] };
      const scriptExecution = new ScriptExecutionSeed(
        scriptRefRefs,
        scriptVersionRefs,
        taskScheduleRefs,
      );
      const scriptSeeds = [
        scriptExecution,
        scriptVersion,
        scriptRef,
        taskSchedule,
      ];
      const cleanOnly = new Orchestrator(
        [
          new IncomingEventCleanerSeed(),
          ...scriptSeeds,
          ...seeds,
          new MicroManagerTriggeredApisSeed(),
        ],
        ctx,
      );
      await cleanOnly.clean();
      return;
    }

    // Run base seeds first
    await orchestrator.run(dryRun);

    if (scope === 'micro-manager-triggered') {
      const microManagerSeed = new MicroManagerTriggeredApisSeed();
      const refs = await microManagerSeed.seed(ctx);
      ctx.registry.set(microManagerSeed.name, refs);
      console.log(
        JSON.stringify(
          { micro_manager_triggered_apis: refs },
          (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
          2,
        ),
      );
      return;
    }

    // Then run script execution seeds
    const scriptRef = new ScriptReferenceSeed();
    const scriptRefRefs = await scriptRef.seed(ctx);

    const scriptVersion = new ScriptVersionSeed(scriptRefRefs);
    const scriptVersionRefs = await scriptVersion.seed(ctx);

    const taskSchedule = new TaskScheduleSeed();
    const taskScheduleRefs = await taskSchedule.seed(ctx);

    const scriptExecution = new ScriptExecutionSeed(
      scriptRefRefs,
      scriptVersionRefs,
      taskScheduleRefs,
    );
    await scriptExecution.seed(ctx);

    const snapshot = {
      script_reference: scriptRefRefs,
      script_version: scriptVersionRefs,
      task_schedule: taskScheduleRefs,
    };

    console.log(
      JSON.stringify(
        snapshot,
        (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
        2,
      ),
    );
  } finally {
    await destroyContext();
  }
}

main();
