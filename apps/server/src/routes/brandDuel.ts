import { t } from "elysia";
import { brandDuelService } from "../services/brandDuelService";

export const registerBrandDuelRoutes = (app: any) =>
  app
    .get(
      "/pipelines/brand-duel",
      async ({
        query,
      }: {
        query: { page?: string; page_size?: string };
      }) => {
        const page = query?.page ? Number(query.page) : 1;
        const pageSize = query?.page_size ? Number(query.page_size) : 20;
        return brandDuelService.listRuns(page, pageSize);
      }
    )
    .post(
      "/pipelines/brand-duel",
      async ({
        body,
        set,
      }: {
        body: { brandA?: string; brandB?: string; category?: string };
        set: any;
      }) => {
        const brandA = body?.brandA?.trim();
        const brandB = body?.brandB?.trim();
        const category = body?.category?.trim();

        if (!brandA || !brandB || !category) {
          set.status = 400;
          return { error: "brandA, brandB, category are required" };
        }

        const runId = await brandDuelService.startPipeline(brandA, brandB, category);
        return { run_id: runId };
      },
      {
        body: t.Object({
          brandA: t.String(),
          brandB: t.String(),
          category: t.String(),
        }),
      }
    )
    .get(
      "/pipelines/brand-duel/:runId",
      async ({ params, set }: { params: { runId: string }; set: any }) => {
        const run = await brandDuelService.getRun(params.runId);
        if (!run) {
          set.status = 404;
          return { error: "Run not found" };
        }
        return run;
      }
    )
    .post(
      "/pipelines/brand-duel/webhook",
      async ({ body, set }: { body: any; set: any }) => {
        await brandDuelService.handleWebhook(body);
        set.status = 200;
        return { ok: true };
      }
    );
