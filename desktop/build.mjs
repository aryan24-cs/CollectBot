import * as esbuild from "esbuild"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.COLLECTBOT_DESKTOP_ENV === "development"

console.log(`[CollectBot Desktop] Building desktop layer (Mode: ${isDev ? "Development" : "Production"})...`)

try {
  await esbuild.build({
    entryPoints: [
      path.resolve(__dirname, "src/main.ts"),
      path.resolve(__dirname, "src/preload.ts"),
    ],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outdir: path.resolve(__dirname, "dist"),
    external: ["electron"],
    sourcemap: isDev ? "inline" : false,
    minify: !isDev,
    logLevel: "info",
  })

  console.log("[CollectBot Desktop] Build completed successfully: desktop/dist/")
} catch (err) {
  console.error("[CollectBot Desktop] Build failed:", err)
  process.exit(1)
}

