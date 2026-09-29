import { firstValueFrom } from "rxjs";

import { FakeStateProvider, mockAccountServiceWith } from "@bitwarden/common/spec";
import { UserId } from "@bitwarden/common/types/guid";

import { TotpUsageService } from "./totp-usage.service";

describe("TotpUsageService", () => {
  const userId = "user-id" as UserId;
  let stateProvider: FakeStateProvider;
  let service: TotpUsageService;

  beforeEach(() => {
    stateProvider = new FakeStateProvider(mockAccountServiceWith(userId));
    service = new TotpUsageService(stateProvider);
  });

  it("returns an empty map when nothing has been recorded", async () => {
    expect(await firstValueFrom(service.lastUsedDates$(userId))).toEqual({});
  });

  it("records the last used date per cipher", async () => {
    await service.recordUsage(userId, "a", new Date(1000));
    await service.recordUsage(userId, "b", new Date(2000));
    await service.recordUsage(userId, "a", new Date(3000));

    expect(await firstValueFrom(service.lastUsedDates$(userId))).toEqual({ a: 3000, b: 2000 });
  });

  it("sorts most recently used first and keeps original order for unused ciphers", () => {
    const ciphers = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

    const sorted = service.sortByRecency(ciphers, { c: 2000, b: 1000 }, (c) => c.id);

    expect(sorted.map((c) => c.id)).toEqual(["c", "b", "a", "d"]);
  });
});
