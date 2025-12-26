/*
 * @Description:
 * @Author: Devin
 * @Date: 2025-12-25 11:52:43
 */
import { t } from "elysia";
import {
  AVAILABLE_MODELS,
  type GeoCopyType,
  mockProducts,
} from "@geo/shared-types";
import { log } from "../logger";
import { getProviderConfig } from "../llm/providerConfig";
import { generatePrompt, pickRandomGeoCopyType } from "../llm/prompt";
import {
  requestChatCompletion,
  requestChatCompletionStream,
} from "../llm/request";

export function registerApiRoutes(app: any) {
  return app
    .get("/api/products", () => mockProducts)
    .get(
      "/api/products/:id",
      ({ params: { id }, set }: { params: { id: string }; set: any }) => {
        const product = mockProducts.find((p) => p.id === id);
        if (!product) {
          set.status = 404;
          return { error: "Product not found" };
        }
        return product;
      }
    )
    .get("/api/models", () => AVAILABLE_MODELS)
    .post(
      "/api/generate",
      async ({
        body,
        set,
      }: {
        body: {
          productId: string;
          copyType?: GeoCopyType;
          model: string;
          customPrompt?: string;
          stream?: boolean;
        };
        set: any;
      }) => {
        const { productId, model, customPrompt, stream = false } = body;
        const copyType = body.copyType ?? pickRandomGeoCopyType();

        const product = mockProducts.find((p) => p.id === productId);
        if (!product) {
          set.status = 404;
          return { error: "Product not found" };
        }

        const selectedModel = AVAILABLE_MODELS.find((m) => m.id === model);
        if (!selectedModel) {
          set.status = 404;
          return { error: "Model not found" };
        }

        const config = getProviderConfig(selectedModel.provider);
        if (!config.apiKey) {
          set.status = 400;
          return { error: `${selectedModel.provider} API Key not configured` };
        }

        const prompt = customPrompt || generatePrompt(product, copyType);
        const startedAt = performance.now();

        try {
          // 流式响应
          if (stream) {
            const streamResponse = await requestChatCompletionStream(
              config,
              model,
              prompt
            );

            // 解析 OpenAI SSE 格式，提取 content
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            let buffer = "";

            const parseStream = new TransformStream({
              transform(chunk, controller) {
                buffer += decoder.decode(chunk, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") return;
                    try {
                      const json = JSON.parse(data);
                      const content = json.choices?.[0]?.delta?.content;
                      if (content) {
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({ content })}\n\n`
                          )
                        );
                      }
                    } catch {
                      // 解析失败，跳过
                    }
                  }
                }
              },
              flush(controller) {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              },
            });

            // 返回原生 Response 对象，Elysia 会正确处理
            return new Response(streamResponse.pipeThrough(parseStream), {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          }

          // 非流式响应
          const content = await requestChatCompletion(config, model, prompt);
          const durationMs = Math.round(performance.now() - startedAt);
          log("info", "LLM generation ok", {
            productId,
            copyType,
            model,
            provider: selectedModel.provider,
            durationMs,
          });
          return { content: content ?? "" };
        } catch (error: any) {
          const durationMs = Math.round(performance.now() - startedAt);
          log("error", "LLM generation failed", {
            productId,
            copyType,
            model,
            provider: selectedModel.provider,
            durationMs,
            error: error?.message ?? String(error),
          });
          set.status = 500;
          return { error: error?.message ?? "Unknown error" };
        }
      },
      {
        body: t.Object({
          productId: t.String(),
          copyType: t.Optional(
            t.Union([
              t.Literal("definition"),
              t.Literal("problem"),
              t.Literal("comparison"),
              t.Literal("mechanism"),
              t.Literal("boundary"),
            ])
          ),
          model: t.String(),
          customPrompt: t.Optional(t.String()),
          stream: t.Optional(t.Boolean()),
        }),
      }
    );
}
