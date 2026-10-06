import assert from "node:assert/strict";
import { endpoints } from "./verify.js";

export function resourceEndpoints(value: unknown) {
  assert(value && typeof value === "object" && "resources" in value && Array.isArray(value.resources),
    "Aspire describe must return an object with a resources array");
  const resources: unknown[] = value.resources;
  const url = (displayName: string) => {
    const resource = resources.find(item => item && typeof item === "object"
      && "displayName" in item && item.displayName === displayName);
    assert(resource && typeof resource === "object" && "urls" in resource && Array.isArray(resource.urls),
      `Missing resource/URLs for ${displayName}`);
    const endpoint: unknown = resource.urls.find(item => item && typeof item === "object"
      && "url" in item && typeof item.url === "string" && item.url.startsWith("http://"));
    assert(endpoint && typeof endpoint === "object" && "url" in endpoint && typeof endpoint.url === "string",
      `Missing HTTP endpoint for ${displayName}`);
    return new URL(endpoint.url).origin;
  };
  return endpoints({ admin: url("boardadmin"), frontend: url("bingoboard") });
}
