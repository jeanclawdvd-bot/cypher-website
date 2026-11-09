import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import optimizedAssets from "./optimized-assets.json";
import deploymentMedia from './deployment-media.json';
import { createMediaHandler } from './deployment-media';
import { handleStoreApi } from "../src/lib/store-backend/http";
import { localizeOriginalImages, serveLocalOriginalMedia } from "../src/lib/originals-media";

const assetAliases: Record<string, string> = optimizedAssets;
const serveDeploymentMedia = createMediaHandler(deploymentMedia);

function compactAssetPath(pathname: string) {
  if (assetAliases[pathname]) return assetAliases[pathname];
  try {
    return assetAliases[decodeURIComponent(pathname)];
  } catch {
    return undefined;
  }
}

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const mediaResponse = await serveDeploymentMedia(request, env);
    if (mediaResponse) return mediaResponse;
    if (new URL(request.url).pathname === '/api/market/media') return serveLocalOriginalMedia(request, env.STORE_MODE);
    // The account preview has a dedicated local database and explicit runtime
    // gate. Production remains disabled until its identity/data adapters exist.
    if (new URL(request.url).pathname.startsWith('/api/store/v1')) {
      const response = await handleStoreApi(request, env);
      if (response) return response;
    }
    // Preserve existing page/CSS URLs while serving compact deployment images.
    if (request.method === "GET" || request.method === "HEAD") {
      const url = new URL(request.url);
      const compactPath = compactAssetPath(url.pathname);
      if (compactPath) {
        const media = await serveDeploymentMedia(request, env, compactPath);
        if (media) return media;
        url.pathname = compactPath;
        return env.ASSETS.fetch(new Request(url, request));
      }

      // Vinext resolves next/image sources through ASSETS directly, bypassing
      // this handler. Remap the local source before passing it to Vinext.
      if (/^\/(?:_next|_vinext)\/image\/?$/.test(url.pathname)) {
        const source = url.searchParams.get("url");
        if (source?.startsWith("/") && !source.startsWith("//") && !source.includes("\\")) {
          const sourceUrl = new URL(source, url);
          const compactSource = compactAssetPath(sourceUrl.pathname);
          const media = await serveDeploymentMedia(request, env, compactSource ?? sourceUrl.pathname);
          if (media) return media;
          if (compactSource) {
            sourceUrl.pathname = compactSource;
            url.searchParams.set("url", sourceUrl.pathname + sourceUrl.search);
            request = new Request(url, request);
          }
        }
      }
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response = await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    return localizeOriginalImages(response, request, env.STORE_MODE);
  },
};

export default worker;
