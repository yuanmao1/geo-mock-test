import type { Elysia } from "elysia";
import { join } from "path";

const BASE_PATH = "/public/ecommerce";

export function registerStaticRoutes(app: any) {
  return app.get("*", async ({ path, set }: { path: string; set: any }) => {
    if (path.startsWith("/api")) {
      set.status = 404;
      return { error: "Not Found" };
    }

    // Handle base path - strip /public/ecommerce prefix
    let cleanPath = path;
    if (path.startsWith(BASE_PATH)) {
      cleanPath = path.slice(BASE_PATH.length) || "/";
    }

    // Remove leading slash for file path
    cleanPath = cleanPath.startsWith("/") ? cleanPath.slice(1) : cleanPath;
    const filePath = cleanPath === "" ? "index.html" : cleanPath;

    const file = Bun.file(join("public", filePath));
    if (await file.exists()) return file;

    // SPA fallback - return index.html for client-side routing
    const index = Bun.file(join("public", "index.html"));
    if (await index.exists()) return index;

    set.status = 404;
    return { error: "Not Found" };
  });
}
