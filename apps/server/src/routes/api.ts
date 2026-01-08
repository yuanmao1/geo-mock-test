import { registerCatalogRoutes } from "./catalog";
import { registerPipelineRoutes } from "./pipelines";
import { registerBrandDuelRoutes } from "./brandDuel";
import { registerMonitorRoutes } from "./monitor";

export function registerApiRoutes(app: any, apiPrefix = "/api") {
  return app.group(apiPrefix, (app: any) => {
    registerCatalogRoutes(app);
    registerPipelineRoutes(app);
    registerBrandDuelRoutes(app);
    registerMonitorRoutes(app);
    return app;
  });
}