import { Injectable, NgModule } from "@angular/core";
import { ActivatedRouteSnapshot, RouteReuseStrategy, RouterModule, Routes } from "@angular/router";

import { AuthenticationTimeoutComponent } from "@bitwarden/angular/auth/components/authentication-timeout.component";
import { AuthRoute } from "@bitwarden/angular/auth/constants";
import { EnvironmentSelectorComponent } from "@bitwarden/angular/auth/environment-selector/environment-selector.component";
import {
  activeAuthGuard,
  authGuard,
  hasPasswordGuard,
  lockGuard,
  redirectGuard,
  redirectToVaultIfUnlockedGuard,
  tdeDecryptionRequiredGuard,
  unauthGuardFn,
} from "@bitwarden/angular/auth/guards";
import { LoginViaWebAuthnComponent } from "@bitwarden/angular/auth/login-via-webauthn/login-via-webauthn.component";
import { ChangePasswordComponent } from "@bitwarden/angular/auth/password-management/change-password";
import { SetInitialPasswordComponent } from "@bitwarden/angular/auth/password-management/set-initial-password/set-initial-password.component";
import { canAccessFeature } from "@bitwarden/angular/platform/guard/feature-flag.guard";
import {
  DevicesIcon,
  ExpiredIcon,
  EmailCodeSentIcon,
  UserLockIcon,
  VaultIcon,
  LockIcon,
  DomainIcon,
} from "@bitwarden/assets/svg";
import {
  LoginComponent,
  LoginDecryptionOptionsComponent,
  LoginSecondaryContentComponent,
  LoginViaAuthRequestComponent,
  NewDeviceVerificationComponent,
  PasswordHintComponent,
  RegistrationFinishComponent,
  RegistrationStartComponent,
  RegistrationStartSecondaryComponent,
  RegistrationStartSecondaryComponentData,
  SsoComponent,
  TwoFactorAuthComponent,
  TwoFactorAuthGuard,
} from "@bitwarden/auth/angular";
import { canAccessAutoConfirmSettings } from "@bitwarden/auto-confirm/angular";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { AnonLayoutWrapperComponent, AnonLayoutWrapperData } from "@bitwarden/components";
import {
  LockComponent,
  ConfirmKeyConnectorDomainComponent,
  RemovePasswordComponent,
} from "@bitwarden/key-management-ui";
import { vaultScopeGuard } from "@bitwarden/vault";

import { AccountSwitcherComponent } from "../auth/popup/account-switching/account-switcher.component";
import { AuthExtensionRoute } from "../auth/popup/constants/auth-extension-route.constant";
import { fido2AuthGuard } from "../auth/popup/guards/fido2-auth.guard";
import { platformPopoutGuard } from "../auth/popup/guards/platform-popout.guard";
import { autofillToolsDevFlagGuard } from "../autofill/popup/autofill-tools/autofill-tools.guard";
import { DefaultPasswordManagerPromptGuard } from "../autofill/popup/default-password-manager/default-password-manager-prompt.guard";
import BrowserPopupUtils from "../platform/browser/browser-popup-utils";
import { popupRouterCacheGuard } from "../platform/popup/view-cache/popup-router-cache.service";
import { RouteCacheOptions } from "../platform/services/popup-view-cache-background.service";
import { filePickerPopoutGuard } from "../tools/popup/guards/file-picker-popout.guard";
import { importUpgradeRedirectGuard } from "../tools/popup/guards/import-upgrade-redirect.guard";
import { importUpgradeRequiredGuard } from "../tools/popup/guards/import-upgrade-required.guard";
import { VaultComponent } from "../vault/popup/components/vault/vault.component";
import {
  atRiskPasswordAuthGuard,
  canAccessAtRiskPasswords,
  hasAtRiskPasswords,
} from "../vault/popup/guards/at-risk-passwords.guard";
import { clearVaultStateGuard } from "../vault/popup/guards/clear-vault-state.guard";
import { IntroCarouselGuard } from "../vault/popup/guards/intro-carousel.guard";

import { RouteElevation } from "./app-routing.animations";
import {
  ExtensionAnonLayoutWrapperComponent,
  ExtensionAnonLayoutWrapperData,
} from "./components/extension-anon-layout-wrapper/extension-anon-layout-wrapper.component";
import { debounceNavigationGuard } from "./services/debounce-navigation.service";
import { TabsV2Component } from "./tabs-v2.component";

/**
 * Data properties acceptable for use in extension route objects
 */
export interface RouteDataProperties extends RouteCacheOptions {
  elevation: RouteElevation;

  /**
   * A boolean to indicate that the URL should not be saved in memory in the BrowserRouterService.
   */
  doNotSaveUrl?: boolean;
}

const unauthRouteOverrides = {
  homepage: () => {
    return BrowserPopupUtils.inPopout(window) ? "/tabs/vault" : "/tabs/current";
  },
};

const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    children: [], // Children lets us have an empty component.
    canActivate: [
      popupRouterCacheGuard,
      redirectGuard({ loggedIn: "/tabs/current", loggedOut: "/login", locked: "/lock" }),
    ],
  },
  {
    path: "home",
    redirectTo: "login",
    pathMatch: "full",
  },
  {
    path: "vault",
    redirectTo: "/tabs/vault",
    pathMatch: "full",
  },
  {
    path: "fido2",
    loadComponent: () =>
      import("../autofill/popup/fido2/fido2.component").then((m) => m.Fido2Component),
    canActivate: [fido2AuthGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "",
    component: ExtensionAnonLayoutWrapperComponent,
    children: [
      {
        path: AuthRoute.AuthenticationTimeout,
        canActivate: [unauthGuardFn(unauthRouteOverrides)],
        children: [
          {
            path: "",
            component: AuthenticationTimeoutComponent,
          },
        ],
        data: {
          pageTitle: {
            key: "authenticationTimeout",
          },
          pageIcon: ExpiredIcon,
          elevation: 1,
        } satisfies RouteDataProperties & AnonLayoutWrapperData,
      },
    ],
  },
  {
    path: AuthRoute.NewDeviceVerification,
    component: ExtensionAnonLayoutWrapperComponent,
    canActivate: [unauthGuardFn(), activeAuthGuard()],
    children: [{ path: "", component: NewDeviceVerificationComponent }],
    data: {
      pageIcon: EmailCodeSentIcon,
      pageTitle: {
        key: "verifyYourIdentity",
      },
      pageSubtitle: {
        key: "weDontRecognizeThisDevice",
      },
      showBackButton: true,
      elevation: 1,
    } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
  },
  {
    path: "remove-password",
    component: ExtensionAnonLayoutWrapperComponent,
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
    children: [
      {
        path: "",
        component: RemovePasswordComponent,
        data: {
          pageTitle: {
            key: "verifyYourOrganization",
          },
          showBackButton: false,
          pageIcon: LockIcon,
        } satisfies ExtensionAnonLayoutWrapperData,
      },
    ],
  },
  {
    path: "view-cipher",
    loadComponent: () =>
      import("../vault/popup/components/vault/view/view.component").then((m) => m.ViewComponent),
    canActivate: [authGuard],
    data: {
      // Above "trash"
      elevation: 3,
    } satisfies RouteDataProperties,
  },
  {
    path: "cipher-password-history",
    loadComponent: () =>
      import("../vault/popup/components/vault/vault-password-history/vault-password-history.component").then(
        (m) => m.PasswordHistoryComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 4 } satisfies RouteDataProperties,
  },
  {
    path: "new-item",
    loadComponent: () =>
      import("../vault/popup/components/vault/new-item-page/new-item-page.component").then(
        (m) => m.NewItemPageComponent,
      ),
    canActivate: [
      authGuard,
      canAccessFeature(FeatureFlag.PM32009NewItemTypes, true, undefined, false),
    ],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "add-cipher",
    loadComponent: () =>
      import("../vault/popup/components/vault/add-edit/add-edit.component").then(
        (m) => m.AddEditComponent,
      ),
    canActivate: [authGuard, debounceNavigationGuard()],
    data: { elevation: 1, resetRouterCacheOnTabChange: true } satisfies RouteDataProperties,
    runGuardsAndResolvers: "always",
  },
  {
    path: "edit-cipher",
    loadComponent: () =>
      import("../vault/popup/components/vault/add-edit/add-edit.component").then(
        (m) => m.AddEditComponent,
      ),
    canActivate: [authGuard, debounceNavigationGuard()],
    data: {
      // Above "trash"
      elevation: 3,
      resetRouterCacheOnTabChange: true,
    } satisfies RouteDataProperties,
    runGuardsAndResolvers: "always",
  },
  {
    path: "attachments",
    loadComponent: () =>
      import("../vault/popup/components/vault/attachments/attachments.component").then(
        (m) => m.AttachmentsComponent,
      ),
    canActivate: [authGuard, filePickerPopoutGuard()],
    data: { elevation: 4 } satisfies RouteDataProperties,
  },
  {
    path: "generator",
    loadComponent: () =>
      import("../tools/popup/generator/credential-generator.component").then(
        (m) => m.CredentialGeneratorComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 0 } satisfies RouteDataProperties,
  },
  {
    path: "generator-history",
    loadComponent: () =>
      import("../tools/popup/generator/credential-generator-history.component").then(
        (m) => m.CredentialGeneratorHistoryComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "import",
    loadComponent: () =>
      import("../tools/popup/settings/import/import-browser-v2.component").then(
        (m) => m.ImportBrowserV2Component,
      ),
    canActivate: [authGuard, importUpgradeRedirectGuard, filePickerPopoutGuard()],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "import-source-select",
    // Lazy load vendor icon set
    loadComponent: () =>
      import("../tools/popup/settings/import/import-source-select-browser.component").then(
        (m) => m.ImportSourceSelectBrowserComponent,
      ),
    canActivate: [authGuard, importUpgradeRequiredGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "export",
    loadComponent: () =>
      import("../tools/popup/settings/export/export-browser-v2.component").then(
        (m) => m.ExportBrowserV2Component,
      ),
    canActivate: [authGuard],
    data: { elevation: 2 } satisfies RouteDataProperties,
  },
  {
    path: "autofill",
    loadComponent: () =>
      import("../autofill/popup/settings/autofill.component").then((m) => m.AutofillComponent),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: AuthExtensionRoute.AccountSecurity,
    loadComponent: () =>
      import("../auth/popup/settings/account-security.component").then(
        (m) => m.AccountSecurityComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: AuthExtensionRoute.SettingsPassword,
    loadComponent: () =>
      import("../auth/popup/settings/change-password-page.component").then(
        (m) => m.ChangePasswordPageComponent,
      ),
    canActivate: [
      // TODO: PM-32419 - remove feature flag check
      canAccessFeature(FeatureFlag.PM32413_MultiClientPasswordManagement),
      authGuard,
      hasPasswordGuard([`/${AuthExtensionRoute.AccountSecurity}`]),
    ],
    data: { elevation: 2 } satisfies RouteDataProperties,
  },
  {
    path: AuthExtensionRoute.DeviceManagement,
    loadComponent: () =>
      import("../auth/popup/settings/extension-device-management.component").then(
        (m) => m.ExtensionDeviceManagementComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 2 } satisfies RouteDataProperties,
  },
  {
    path: "notifications",
    loadComponent: () =>
      import("../autofill/popup/settings/notifications.component").then(
        (m) => m.NotificationsSettingsComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "vault-settings",
    loadComponent: () =>
      import("../vault/popup/settings/vault-settings.component").then(
        (m) => m.VaultSettingsComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "folders",
    loadComponent: () =>
      import("../vault/popup/settings/folders.component").then((m) => m.FoldersComponent),
    canActivate: [authGuard],
    data: { elevation: 2 } satisfies RouteDataProperties,
  },
  {
    path: "blocked-domains",
    loadComponent: () =>
      import("../autofill/popup/settings/blocked-domains.component").then(
        (m) => m.BlockedDomainsComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 2 } satisfies RouteDataProperties,
  },
  {
    path: "excluded-domains",
    loadComponent: () =>
      import("../autofill/popup/settings/excluded-domains.component").then(
        (m) => m.ExcludedDomainsComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 2 } satisfies RouteDataProperties,
  },
  {
    path: "premium",
    loadComponent: () =>
      import("../billing/popup/settings/premium-v2.component").then((m) => m.PremiumV2Component),
    canActivate: [authGuard],
    data: { elevation: 3 } satisfies RouteDataProperties,
  },
  {
    path: "appearance",
    loadComponent: () =>
      import("../vault/popup/settings/appearance.component").then((m) => m.AppearanceComponent),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "admin",
    loadComponent: () =>
      import("../vault/popup/settings/admin-settings.component").then(
        (m) => m.AdminSettingsComponent,
      ),
    canActivate: [authGuard, canAccessAutoConfirmSettings],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "clone-cipher",
    loadComponent: () =>
      import("../vault/popup/components/vault/add-edit/add-edit.component").then(
        (m) => m.AddEditComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "add-send",
    loadComponent: () =>
      import("../tools/popup/send-v2/add-edit/send-add-edit.component").then(
        (m) => m.SendAddEditComponent,
      ),
    canActivate: [authGuard, filePickerPopoutGuard()],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "edit-send",
    loadComponent: () =>
      import("../tools/popup/send-v2/add-edit/send-add-edit.component").then(
        (m) => m.SendAddEditComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "send-created",
    loadComponent: () =>
      import("../tools/popup/send-v2/send-created/send-created.component").then(
        (m) => m.SendCreatedComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "share-item",
    loadComponent: () =>
      import("../tools/popup/share/share-item.component").then((m) => m.ShareItemComponent),
    canActivate: [authGuard, canAccessFeature(FeatureFlag.PM34203TemporaryItemSharing)],
    // Above "view-cipher"
    data: { elevation: 4 } satisfies RouteDataProperties,
  },
  {
    // Hosts the complementary Triage + Webmapper authoring tools; the `view`
    // query param selects which is shown first.
    path: "autofill-triage",
    loadComponent: () =>
      import("../autofill/popup/autofill-tools/autofill-tools.component").then(
        (m) => m.AutofillToolsComponent,
      ),
    canActivate: [authGuard, autofillToolsDevFlagGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "",
    component: ExtensionAnonLayoutWrapperComponent,
    children: [
      {
        path: AuthRoute.SignUp,
        canActivate: [unauthGuardFn()],
        data: {
          elevation: 1,
          pageTitle: {
            key: "createAccount",
          },
          showBackButton: true,
          hidePageIcon: true,
          contentVerticalPadding: "compact",
          footerVerticalPadding: "compact",
          heroTextAlignment: "left",
          hideFooter: true,
        } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
        children: [
          {
            path: "",
            component: RegistrationStartComponent,
          },
          {
            path: "",
            component: RegistrationStartSecondaryComponent,
            outlet: "secondary",
            data: {
              loginRoute: `/${AuthRoute.Login}`,
            } satisfies RegistrationStartSecondaryComponentData,
          },
        ],
      },
      {
        path: AuthRoute.FinishSignUp,
        canActivate: [unauthGuardFn()],
        data: {
          pageIcon: LockIcon,
          elevation: 1,
          showBackButton: true,
        } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
        children: [
          {
            path: "",
            component: RegistrationFinishComponent,
          },
        ],
      },
      {
        path: AuthRoute.SetInitialPassword,
        canActivate: [authGuard],
        component: SetInitialPasswordComponent,
        data: {
          elevation: 1,
        } satisfies RouteDataProperties,
      },
      {
        path: AuthRoute.Login,
        canActivate: [
          unauthGuardFn(unauthRouteOverrides),
          DefaultPasswordManagerPromptGuard,
          IntroCarouselGuard,
        ],
        data: {
          pageTitle: {
            key: "loginPageEmailEntryScreenTitle",
          },
          elevation: 1,
          showAcctSwitcher: true,
          hidePageIcon: true,
          contentVerticalPadding: "compact",
          footerVerticalPadding: "compact",
          heroTextAlignment: "left",
          secondaryContentLocation: "footer",
        } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
        children: [
          { path: "", component: LoginComponent },
          { path: "", component: LoginSecondaryContentComponent, outlet: "secondary" },
          {
            path: "",
            component: EnvironmentSelectorComponent,
            outlet: "environment-selector",
          },
        ],
      },
      {
        path: AuthRoute.LoginWithPasskey,
        canActivate: [unauthGuardFn(unauthRouteOverrides), platformPopoutGuard(["linux"])],
        data: {
          pageTitle: {
            key: "logInWithPasskey",
          },
          elevation: 1,
          showBackButton: true,
          hidePageIcon: true,
          contentVerticalPadding: "compact",
          footerVerticalPadding: "compact",
          heroTextAlignment: "left",
          secondaryContentLocation: "footer",
        } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
        children: [
          { path: "", component: LoginViaWebAuthnComponent },
          {
            path: "",
            component: EnvironmentSelectorComponent,
            outlet: "environment-selector",
          },
        ],
      },
      {
        path: AuthRoute.Sso,
        canActivate: [unauthGuardFn(unauthRouteOverrides)],
        data: {
          pageIcon: VaultIcon,
          pageTitle: {
            key: "enterpriseSingleSignOn",
          },
          pageSubtitle: {
            key: "singleSignOnEnterOrgIdentifierText",
          },
          elevation: 1,
        } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
        children: [
          { path: "", component: SsoComponent },
          {
            path: "",
            component: EnvironmentSelectorComponent,
            outlet: "environment-selector",
          },
        ],
      },
      {
        path: AuthRoute.LoginWithDevice,
        canActivate: [redirectToVaultIfUnlockedGuard()],
        data: {
          pageIcon: DevicesIcon,
          pageTitle: {
            key: "logInRequestSent",
          },
          pageSubtitle: {
            key: "aNotificationWasSentToYourDevice",
          },
          showBackButton: true,
          elevation: 1,
        } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
        children: [
          { path: "", component: LoginViaAuthRequestComponent },
          {
            path: "",
            component: EnvironmentSelectorComponent,
            outlet: "environment-selector",
          },
        ],
      },
      {
        path: AuthRoute.PasswordHint,
        canActivate: [unauthGuardFn(unauthRouteOverrides)],
        data: {
          pageTitle: {
            key: "requestPasswordHint",
          },
          pageSubtitle: {
            key: "enterYourAccountEmailAddressAndYourPasswordHintWillBeSentToYou",
          },
          pageIcon: UserLockIcon,
          showBackButton: true,
          elevation: 1,
        } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
        children: [
          { path: "", component: PasswordHintComponent },
          {
            path: "",
            component: EnvironmentSelectorComponent,
            outlet: "environment-selector",
          },
        ],
      },
      {
        path: AuthRoute.AdminApprovalRequested,
        canActivate: [redirectToVaultIfUnlockedGuard()],
        data: {
          pageIcon: DevicesIcon,
          pageTitle: {
            key: "adminApprovalRequested",
          },
          pageSubtitle: {
            key: "adminApprovalRequestSentToAdmins",
          },
          showLogo: false,
          showBackButton: true,
          elevation: 1,
        } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
        children: [{ path: "", component: LoginViaAuthRequestComponent }],
      },
      {
        path: AuthRoute.LoginInitiated,
        canActivate: [tdeDecryptionRequiredGuard()],
        data: {
          pageIcon: DevicesIcon,
          showAcctSwitcher: true,
        } satisfies ExtensionAnonLayoutWrapperData,
        children: [{ path: "", component: LoginDecryptionOptionsComponent }],
      },
      {
        path: "lock",
        canActivate: [lockGuard()],
        data: {
          pageIcon: LockIcon,
          pageTitle: {
            key: "yourVaultIsLockedV2",
          },
          showReadonlyHostname: true,
          showAcctSwitcher: true,
          contentVerticalPadding: "compact",
          footerVerticalPadding: "compact",
          elevation: 1,
          /**
           * This ensures that in a passkey flow the `/fido2?<queryParams>` URL does not get
           * overwritten in the `BrowserRouterService` by the `/lock` route. This way, after
           * unlocking, the user can be redirected back to the `/fido2?<queryParams>` URL.
           *
           * Also, this prevents a routing loop when using biometrics to unlock the vault in MV2 (Firefox),
           * locking up the browser (https://bitwarden.atlassian.net/browse/PM-16116). This involves the
           * `popup-router-cache.service` pushing the `lock` route to the history.
           */
          doNotSaveUrl: true,
        } satisfies ExtensionAnonLayoutWrapperData & RouteDataProperties,
        children: [
          {
            path: "",
            component: LockComponent,
          },
        ],
      },
      {
        path: AuthRoute.TwoFactor,
        canActivate: [unauthGuardFn(unauthRouteOverrides), TwoFactorAuthGuard],
        children: [
          {
            path: "",
            component: TwoFactorAuthComponent,
          },
        ],
        data: {
          elevation: 1,
          pageTitle: {
            key: "verifyYourIdentity",
          },
          showBackButton: true,
          // `TwoFactorAuthComponent` manually sets its icon based on the 2fa type
          pageIcon: null,
        } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
      },
      {
        path: AuthRoute.ChangePassword,
        data: {
          elevation: 1,
          hideFooter: true,
          pageIcon: LockIcon,
        } satisfies RouteDataProperties & ExtensionAnonLayoutWrapperData,
        children: [
          {
            path: "",
            component: ChangePasswordComponent,
          },
        ],
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: "assign-collections",
    loadComponent: () =>
      import("../vault/popup/components/vault/assign-collections/assign-collections.component").then(
        (m) => m.AssignCollections,
      ),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "about",
    loadComponent: () =>
      import("../tools/popup/settings/about-page/about-page-v2.component").then(
        (m) => m.AboutPageV2Component,
      ),
    canActivate: [authGuard],
    data: { elevation: 1 } satisfies RouteDataProperties,
  },
  {
    path: "more-from-bitwarden",
    loadComponent: () =>
      import("../vault/popup/settings/more-from-bitwarden-page.component").then(
        (m) => m.MoreFromBitwardenPageComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 2 } satisfies RouteDataProperties,
  },
  {
    path: "download-bitwarden",
    loadComponent: () =>
      import("../vault/popup/settings/download-bitwarden.component").then(
        (m) => m.DownloadBitwardenComponent,
      ),
    canActivate: [authGuard],
    data: { elevation: 2 } satisfies RouteDataProperties,
  },
  {
    path: "default-password-manager-prompt",
    loadComponent: () =>
      import("../autofill/popup/default-password-manager/default-password-manager-prompt.component").then(
        (m) => m.DefaultPasswordManagerPromptComponent,
      ),
    canActivate: [],
    data: { elevation: 0, doNotSaveUrl: true } satisfies RouteDataProperties,
  },
  {
    path: "intro-carousel",
    component: ExtensionAnonLayoutWrapperComponent,
    canActivate: [],
    data: { elevation: 0, doNotSaveUrl: true } satisfies RouteDataProperties,
    children: [
      {
        path: "",
        loadComponent: () =>
          import("../vault/popup/components/vault/intro-carousel/intro-carousel.component").then(
            (m) => m.IntroCarouselComponent,
          ),
        data: {
          pageIcon: null,
          hideFooter: true,
        } satisfies ExtensionAnonLayoutWrapperData,
      },
    ],
  },
  {
    path: "confirm-key-connector-domain",
    component: ExtensionAnonLayoutWrapperComponent,
    canActivate: [],
    data: { elevation: 1 } satisfies RouteDataProperties,
    children: [
      {
        path: "",
        component: ConfirmKeyConnectorDomainComponent,
        data: {
          pageTitle: {
            key: "verifyYourOrganization",
          },
          showBackButton: true,
          pageIcon: DomainIcon,
        } satisfies ExtensionAnonLayoutWrapperData,
      },
    ],
  },
  {
    path: "tabs",
    component: TabsV2Component,
    data: { elevation: 0 } satisfies RouteDataProperties,
    children: [
      {
        path: "",
        redirectTo: "/tabs/vault",
        pathMatch: "full",
      },
      {
        path: "current",
        redirectTo: "/tabs/vault",
      },
      {
        path: "vault",
        component: VaultComponent,
        canActivate: [authGuard],
        canDeactivate: [clearVaultStateGuard],
        data: { elevation: 0 } satisfies RouteDataProperties,
      },
      {
        /**
         * The vault scoped by `:vaultId`, the segment web and desktop use. Same component and elevation
         * as the unscoped route: a switch is the same page narrowed, not a push or a pop.
         */
        path: "vault/:vaultId",
        component: VaultComponent,
        canActivate: [authGuard, vaultScopeGuard],
        canDeactivate: [clearVaultStateGuard],
        data: { elevation: 0 } satisfies RouteDataProperties,
      },
      {
        path: "generator",
        loadComponent: () =>
          import("../tools/popup/generator/credential-generator.component").then(
            (m) => m.CredentialGeneratorComponent,
          ),
        canActivate: [authGuard],
        data: { elevation: 0 } satisfies RouteDataProperties,
      },
      {
        path: "settings",
        loadComponent: () =>
          import("../tools/popup/settings/settings-v2.component").then(
            (m) => m.SettingsV2Component,
          ),
        canActivate: [authGuard],
        data: { elevation: 0 } satisfies RouteDataProperties,
      },
      {
        path: "send",
        loadComponent: () =>
          import("../tools/popup/send-v2/send-v2.component").then((m) => m.SendV2Component),
        canActivate: [authGuard],
        data: { elevation: 0 } satisfies RouteDataProperties,
      },
    ],
  },
  {
    path: "at-risk-passwords",
    loadComponent: () =>
      import("../vault/popup/components/at-risk-passwords/at-risk-passwords.component").then(
        (m) => m.AtRiskPasswordsComponent,
      ),
    canActivate: [atRiskPasswordAuthGuard, canAccessAtRiskPasswords, hasAtRiskPasswords],
  },
  {
    path: AuthExtensionRoute.AccountSwitcher,
    component: AccountSwitcherComponent,
    data: { elevation: 4, doNotSaveUrl: true } satisfies RouteDataProperties,
  },
  {
    path: "trash",
    loadComponent: () =>
      import("../vault/popup/settings/trash.component").then((m) => m.TrashComponent),
    canActivate: [authGuard],
    data: { elevation: 2 } satisfies RouteDataProperties,
  },
  {
    path: "archive",
    loadComponent: () =>
      import("../vault/popup/settings/archive.component").then((m) => m.ArchiveComponent),
    canActivate: [authGuard],
    data: { elevation: 2 } satisfies RouteDataProperties,
  },
  {
    path: "security",
    component: AnonLayoutWrapperComponent,
    children: [
      {
        path: "phishing-warning",
        children: [
          {
            path: "",
            loadComponent: () =>
              import("../dirt/phishing-detection/popup/phishing-warning.component").then(
                (m) => m.PhishingWarningComponent,
              ),
          },
          {
            path: "",
            loadComponent: () =>
              import("../dirt/phishing-detection/popup/protected-by-component").then(
                (m) => m.ProtectedByComponent,
              ),
            outlet: "secondary",
          },
        ],
        data: {
          pageIcon: null,
          hideBackgroundIllustration: true,
          showReadonlyHostname: true,
        } satisfies AnonLayoutWrapperData,
      },
    ],
  },
];

@Injectable()
export class NoRouteReuseStrategy implements RouteReuseStrategy {
  shouldDetach(route: ActivatedRouteSnapshot) {
    return false;
  }

  // eslint-disable-next-line
  store(route: ActivatedRouteSnapshot, handle: {}) {
    /* Nothing */
  }

  shouldAttach(route: ActivatedRouteSnapshot) {
    return false;
  }

  retrieve(route: ActivatedRouteSnapshot): any {
    return null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot) {
    return false;
  }
}

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      onSameUrlNavigation: "reload",
      /*enableTracing: true,*/
    }),
  ],
  exports: [RouterModule],
  providers: [{ provide: RouteReuseStrategy, useClass: NoRouteReuseStrategy }],
})
export class AppRoutingModule {}
