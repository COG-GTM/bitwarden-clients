import { ApplicationRef, enableProdMode, provideZonelessChangeDetection } from "@angular/core";
import { platformBrowser } from "@angular/platform-browser";

import { PopupSizeService } from "../platform/popup/layout/popup-size.service";
import { BrowserPlatformUtilsService } from "../platform/services/platform-utils/browser-platform-utils.service";

import { AppModule } from "./app.module";

import "./scss";

// We put these first to minimize the delay in window changing.
PopupSizeService.initBodyWidthFromLocalStorage();
// Should be removed once we deprecate support for Safari 16.0 and older. See Jira ticket [PM-1861]
if (BrowserPlatformUtilsService.shouldApplySafariHeightFix(window)) {
  document.documentElement.classList.add("safari_height_fix");
}

if (process.env.ENV === "production") {
  enableProdMode();
}

// PROTOTYPE instrumentation: count change-detection passes and time spent in them.
const w = window as any;
w.__bwCd = 0;
w.__bwCdMs = 0;
const origTick = (ApplicationRef.prototype as any)._tick;
(ApplicationRef.prototype as any)._tick = function (...args: unknown[]) {
  const t0 = performance.now();
  w.__bwCd++;
  try {
    return origTick.apply(this, args);
  } finally {
    w.__bwCdMs += performance.now() - t0;
    if (w.__bwCd === 1) {
      performance.mark("bw:first-tick-done");
    }
  }
};

function init() {
  performance.mark("bw:bootstrap-start");
  void platformBrowser()
    .bootstrapModule(AppModule, {
      applicationProviders: [provideZonelessChangeDetection()],
    })
    .then(() => performance.mark("bw:bootstrap-done"));
}

init();
