import {
  connectAll,
  dashboard,
  disconnectAll,
  tinybots,
} from '../../config/db';

export type Registry = Map<string, unknown>;

export interface SeedContext {
  tinybots: typeof tinybots;
  dashboard: typeof dashboard;
  scope: string;
  registry: Registry;
  log: (msg: unknown) => void;
}

export async function createContext(scope: string): Promise<SeedContext> {
  await connectAll();
  const registry: Registry = new Map();
  const log = (msg: unknown) => {
    console.log(
      typeof msg === 'string'
        ? msg
        : JSON.stringify(
            msg,
            (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
            2,
          ),
    );
  };
  return { tinybots, dashboard, scope, registry, log };
}

export async function destroyContext(): Promise<void> {
  await disconnectAll();
}
