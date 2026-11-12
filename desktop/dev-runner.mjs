import http from "node:http"
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const targetUrl = process.env.DESKTOP_DEV_URL || "http://localhost:3000"

function checkServerReady(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr)
      const req = http.get(
        {
          hostname: parsed.hostname,
          port: parsed.port || 80,
          path: parsed.pathname || "/",
        },
        (res) => {
          resolve(true)
        }
      )
      req.on("error", () => {
        resolve(false)
      })
      req.setTimeout(1500, () => {
        req.destroy()
        resolve(false)
      })
    } catch {
      resolve(false)
    }
  })
}

async function waitForServer(timeoutMs = 30000) {
  const startTime = Date.now()
  console.log(`[CollectBot Desktop] Checking Next.js dev server readiness at ${targetUrl}...`)

  while (Date.now() - startTime < timeoutMs) {
    const ready = await checkServerReady(targetUrl)
    if (ready) {
      console.log(`[CollectBot Desktop] Dev server is active and reachable at ${targetUrl}.`)
      return true
    }
    await new Promise((r) => setTimeout(r, 1000))
  }

  console.warn(`[CollectBot Desktop] Dev server not responding yet at ${targetUrl}. Launching Electron (will show offline screen until server is up)...`)
  return false
}

async function start() {
  await waitForServer(5000)

  const electronCmd = process.platform === "win32" ? "electron.cmd" : "electron"
  const electronBin = path.resolve(__dirname, `../node_modules/.bin/${electronCmd}`)

  console.log("[CollectBot Desktop] Launching Electron window...")
  const child = spawn(electronBin, [path.resolve(__dirname, "dist/main.js")], {
    stdio: "inherit",
    env: {
      ...process.env,
      COLLECTBOT_DESKTOP_ENV: "development",
    },
  })

  child.on("exit", (code) => {
    process.exit(code ?? 0)
  })
}

start().catch((err) => {
  console.error("[CollectBot Desktop] Dev runner error:", err)
  process.exit(1)
})

