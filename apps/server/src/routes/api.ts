import {registerBrandDuelRoutes} from './brandDuel';
import {registerCatalogRoutes} from './catalog';
import {registerMonitorRoutes} from './monitor';
import {registerPipelineRoutes} from './pipelines';

export function registerApiRoutes(
    app: any, apiPrefix = '/public/ecommerce/api') {
  return app.group(apiPrefix, (app: any) => {
    registerCatalogRoutes(app);
    registerPipelineRoutes(app);
    registerBrandDuelRoutes(app);
    registerMonitorRoutes(app);
    return app;
  });
}