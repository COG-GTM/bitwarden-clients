// PROTOTYPE: popup-only replacement for libs/state/src/state-migrations/migrate.ts.
// The popup never runs migrations (the background does); it only waits for `stateVersion`
// to reach CURRENT_VERSION. Swapping this module in (see webpack.base.js) keeps the ~80
// migrator classes and the MigrationBuilder chain out of popup/main.js.
import { LogService } from "@bitwarden/logging";
import { AbstractStorageService } from "@bitwarden/storage-core";

export const MIN_VERSION = 3;
export const CURRENT_VERSION = 86;
export type MinVersion = typeof MIN_VERSION;

export function createMigrationBuilder(): never {
  throw new Error("createMigrationBuilder is not available in the popup (wait-only build)");
}

export async function currentVersion(
  storageService: AbstractStorageService,
  logService: LogService,
) {
  let state = await storageService.get<number>("stateVersion");
  if (state == null) {
    state = (await storageService.get<{ stateVersion: number }>("global"))?.stateVersion;
  }
  if (state == null) {
    logService.info("No state version found, assuming empty state.");
    return -1;
  }
  logService.info(`State version: ${state}`);
  return state;
}

export async function waitForMigrations(
  storageService: AbstractStorageService,
  logService: LogService,
) {
  performance.mark("perf:migrations-wait-start");
  const isReady = async () => (await currentVersion(storageService, logService)) >= CURRENT_VERSION;

  const wait = async (time: number) => {
    const nextTime = time * 2;
    if (nextTime > 8192) {
      return;
    }
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        if (!(await isReady())) {
          logService.info(`Waiting for migrations to finish, waiting for ${nextTime}ms`);
          await wait(nextTime);
        }
        resolve();
      }, time);
    });
  };

  if (!(await isReady())) {
    logService.info("Waiting for migrations to finish, waiting for 4ms");
    await wait(4);
  }
  performance.mark("perf:migrations-wait-end");
}
