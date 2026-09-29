// PROTOTYPE: runs synchronously from <head> before the ~7 MB of deferred Angular bundles execute.
// Applies cached theme / height classes and picks the static shell variant so the first paint
// already looks like the final popup. Also removes the shell once the real route renders.
/* eslint-disable */
(function () {
  performance.mark("bw:preboot-start");
  const html = document.documentElement;
  const ls = window.localStorage;

  // 1. Theme: cached user selection (written by InitService); "system"/missing -> prefers-color-scheme.
  let theme = ls.getItem("bw-theme");
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  html.classList.add("theme_" + theme);

  // 2. Height class: cached result of PopupSizeService.setHeight for this uilocation.
  const heightClass = ls.getItem("bw-height-class:" + location.search);
  if (heightClass) {
    html.classList.add(heightClass);
  }

  // 3. Shell variant: last rendered route family (vault | promo | anon).
  const kind = ls.getItem("bw-shell-kind") || "anon";
  html.setAttribute("data-bw-shell", kind);

  // 4. Hand-off: remove the shell the moment Angular renders a real route element.
  const REAL = "app-root input, app-root button[bitbutton], app-root bit-item, app-root h1, app-root h2";
  const detectKind = (): string => {
    if (document.querySelector("app-root app-vault-search, app-root popup-tab-navigation")) return "vault";
    if (document.querySelector("app-root autofill-default-password-manager-prompt, app-root app-intro-carousel")) return "promo";
    return "anon";
  };
  document.addEventListener("DOMContentLoaded", () => {
    performance.mark("bw:dcl");
    const shell = document.getElementById("bw-shell");
    const obs = new MutationObserver(() => {
      if (!document.querySelector(REAL)) return;
      performance.mark("bw:first-route-rendered");
      obs.disconnect();
      if (shell) shell.remove();
      performance.mark("bw:shell-removed");
      try { ls.setItem("bw-shell-kind", detectKind()); } catch {}
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });
})();
