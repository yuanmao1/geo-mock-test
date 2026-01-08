import { t } from "elysia";
import { geoMonitorService } from "../services/geoMonitorService";

export const registerPipelineRoutes = (app: any) =>
  app
    .get(
      "/pipelines/category",
      async ({
        query,
      }: {
        query: { page?: string; page_size?: string };
      }) => {
        const page = query?.page ? Number(query.page) : 1;
        const pageSize = query?.page_size ? Number(query.page_size) : 20;
        return geoMonitorService.listRuns(page, pageSize);
      }
    )
    .post(
      "/pipelines/category",
      async ({ body, set }: { body: { category?: string }; set: any }) => {
        const category = body?.category?.trim();
        if (!category) {
          set.status = 400;
          return { error: "category is required" };
        }
        const runId = await geoMonitorService.startPipeline(category);
        return { run_id: runId };
      },
      {
        body: t.Object({
          category: t.String(),
        }),
      }
    )
    .get(
      "/pipelines/category/:runId",
      async ({ params, set }: { params: { runId: string }; set: any }) => {
        const run = await geoMonitorService.getRun(params.runId);
        if (!run) {
          set.status = 404;
          return { error: "Run not found" };
        }
        return run;
      }
    )
    .get(
      "/pipelines/category/aggregate/:category",
      async ({ params, set }: { params: { category: string }; set: any }) => {
        const category = decodeURIComponent(params.category);
        if (!category) {
          set.status = 400;
          return { error: "category is required" };
        }
        return geoMonitorService.getCategoryAggregation(category);
      }
    )
    .post(
      "/pipelines/category/webhook",
      async ({ body, set }: { body: any; set: any }) => {
        await geoMonitorService.handleWebhook(body);
        set.status = 200;
        return { ok: true };
      }
    );
