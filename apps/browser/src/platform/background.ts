import { ConsoleLogService } from "@bitwarden/common/platform/services/console-log.service";

import MainBackground from "../background/main.background";

(self as any).__bwPerf = { swStart: Date.now(), swStartPerf: performance.now() };
console.log(`perf: background script start t=${Date.now()}`);
const logService = new ConsoleLogService(false);
const bitwardenMain = ((self as any).bitwardenMain = new MainBackground());
bitwardenMain.bootstrap().catch((error) => logService.error(error));
