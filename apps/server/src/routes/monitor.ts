import { t } from "elysia";
import { gptInteractionApi, type TaskCreateRequest } from "../lib/gptInteraction";

const defaultMessage = "请简要总结当前页面内容。";

const parseBoolean = (value: unknown) =>
  value === true || value === "true" || value === "1";

export const registerMonitorRoutes = (app: any) =>
  app
    .post(
      "/monitor/tasks",
      async ({ body, set }: { body: Partial<TaskCreateRequest>; set: any }) => {
        const payload: TaskCreateRequest = {
          message: body?.message?.trim() || defaultMessage,
          enable_search: body?.enable_search,
          user_id: body?.user_id,
          caller_user: body?.caller_user,
          metadata: body?.metadata,
        };

        const response = await gptInteractionApi.createTask(payload);
        set.status = response.status || 502;
        return response.data;
      },
      {
        body: t.Object({
          message: t.Optional(t.String()),
          enable_search: t.Optional(t.Boolean()),
          user_id: t.Optional(t.String()),
          caller_user: t.Optional(t.String()),
          metadata: t.Optional(t.Record(t.String(), t.Unknown())),
        }),
      }
    )
    .get(
      "/monitor/tasks/:taskId",
      async ({
        params,
        query,
        set,
      }: {
        params: { taskId: string };
        query: { include_screenshot?: string | boolean };
        set: any;
      }) => {
        const include_screenshot = parseBoolean(query?.include_screenshot ?? true);
        const response = await gptInteractionApi.getTask(params.taskId, {
          include_screenshot,
        });
        set.status = response.status || 502;
        return response.data;
      }
    );
