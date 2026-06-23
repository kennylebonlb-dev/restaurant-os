import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/layout/app-shell";
import { defaultPlatformBrand, getPlatformBrand } from "@/server/platform-settings";
import "./globals.css";

const LIGHT_BRAND_PATHS = new Set(["/admin/login", "/login"]);
const lightPlatformBrand = {
  ...defaultPlatformBrand,
  logoUrl: "/toquetop-logo.svg",
  footerLogoUrl: "/toquetop-logo.svg",
  marketingLogoUrl: "/toquetop-logo.svg",
  marketingFooterLogoUrl: "/toquetop-logo.svg",
  loginVisualUrl: "",
  adminLoginVisualUrl: "/admin-login-visual"
};

const clientErrorBootstrap = `
(function () {
  var reloadKey = "toquetop:chunk-reload:v1";

  function send(payload) {
    try {
      var body = JSON.stringify(Object.assign({
        url: window.location.href,
        userAgent: navigator.userAgent
      }, payload));
      if (navigator.sendBeacon) {
        var sent = navigator.sendBeacon("/api/client-errors", new Blob([body], { type: "application/json" }));
        if (sent) return;
      }
      fetch("/api/client-errors", {
        body: body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST"
      }).catch(function () {});
    } catch (error) {}
  }

  function textFrom(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return String(value.message || value.name || value);
  }

  function isChunkProblem(message, assetUrl) {
    var haystack = (message + " " + (assetUrl || "")).toLowerCase();
    return haystack.indexOf("chunkloaderror") >= 0 ||
      haystack.indexOf("loading chunk") >= 0 ||
      haystack.indexOf("failed to fetch dynamically imported module") >= 0 ||
      haystack.indexOf("error loading dynamically imported module") >= 0 ||
      haystack.indexOf("importing a module script failed") >= 0 ||
      haystack.indexOf("failed to load module script") >= 0 ||
      haystack.indexOf("/_next/static/chunks/") >= 0;
  }

  function reloadOnceIfChunkProblem(message, assetUrl) {
    if (!isChunkProblem(message, assetUrl)) return;
    try {
      if (window.sessionStorage.getItem(reloadKey)) return;
      window.sessionStorage.setItem(reloadKey, "1");
      window.setTimeout(function () {
        window.location.reload();
      }, 150);
    } catch (error) {}
  }

  window.addEventListener("error", function (event) {
    var target = event.target || event.srcElement;
    var assetUrl = target && target !== window ? (target.src || target.href || "") : "";
    var message = event.message || (assetUrl ? "Resource failed to load" : "Unknown window error");
    send({
      assetUrl: assetUrl || undefined,
      column: event.colno || undefined,
      line: event.lineno || undefined,
      message: message,
      name: event.error && event.error.name,
      source: assetUrl ? "resource-error" : "pre-react-error",
      stack: event.error && event.error.stack
    });
    reloadOnceIfChunkProblem(message, assetUrl);
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    var message = textFrom(event.reason);
    send({
      message: message,
      name: event.reason && event.reason.name,
      source: "pre-react-unhandledrejection",
      stack: event.reason && event.reason.stack
    });
    reloadOnceIfChunkProblem(message, "");
  });
})();
`;

async function getRequestContext() {
  const requestHeaders = await headers();

  return {
    initialHost: requestHeaders.get("host") ?? "",
    pathname: requestHeaders.get("x-toquetop-pathname") ?? ""
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "ToqueTop | Sites et réservations pour restaurants",
    description: "Créez votre site restaurant, gérez les réservations, le plan de salle et les disponibilités en temps réel.",
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico"
    }
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { initialHost, pathname } = await getRequestContext();
  const brand = LIGHT_BRAND_PATHS.has(pathname)
    ? lightPlatformBrand
    : await getPlatformBrand().catch(() => defaultPlatformBrand);

  return (
    <html lang="fr">
      <Script id="toquetop-client-error-bootstrap" strategy="beforeInteractive">
        {clientErrorBootstrap}
      </Script>
      <body>
        <Providers>
          <AppShell brand={brand} initialHost={initialHost}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
