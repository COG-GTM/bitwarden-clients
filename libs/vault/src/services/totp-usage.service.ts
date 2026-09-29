import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";

import { UserId } from "@bitwarden/common/types/guid";
import { StateProvider, UserKeyDefinition, VAULT_SETTINGS_DISK } from "@bitwarden/state";

/** Map of cipher id to the epoch millis its verification code was last used on this device. */
export type TotpLastUsedDates = Record<string, number>;

const TOTP_LAST_USED_KEY = new UserKeyDefinition<TotpLastUsedDates>(
  VAULT_SETTINGS_DISK,
  "totpLastUsedDates",
  {
    deserializer: (value) => value ?? {},
    clearOn: [],
  },
);

/**
 * Tracks, per device, when each cipher's verification code (TOTP) was last copied so that
 * verification codes can be ordered by recency.
 */
@Injectable({ providedIn: "root" })
export class TotpUsageService {
  constructor(private stateProvider: StateProvider) {}

  lastUsedDates$(userId: UserId): Observable<TotpLastUsedDates> {
    return this.stateProvider
      .getUser(userId, TOTP_LAST_USED_KEY)
      .state$.pipe(map((dates) => dates ?? {}));
  }

  async recordUsage(userId: UserId, cipherId: string, date: Date = new Date()): Promise<void> {
    await this.stateProvider
      .getUser(userId, TOTP_LAST_USED_KEY)
      .update((dates) => ({ ...(dates ?? {}), [cipherId]: date.getTime() }));
  }

  /**
   * Returns a copy of `ciphers` ordered by most recently used verification code first.
   * Ciphers without a recorded usage keep their original relative order after the used ones.
   */
  sortByRecency<T>(ciphers: T[], dates: TotpLastUsedDates, getId: (cipher: T) => string): T[] {
    const lastUsed = (cipher: T) => dates[getId(cipher)] ?? 0;
    return ciphers
      .map((cipher, index) => ({ cipher, index }))
      .sort((a, b) => lastUsed(b.cipher) - lastUsed(a.cipher) || a.index - b.index)
      .map(({ cipher }) => cipher);
  }
}
