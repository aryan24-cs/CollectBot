import { contextBridge, ipcRenderer } from "electron"

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface NotificationPayload {
  title: string
  body: string
  silent?: boolean
}

export interface OpenFileResult {
  filePath: string
  fileName: string
  fileData: ArrayBuffer
}

export interface CollectBotDesktopBridge {
  readonly isDesktop: true
  readonly platform: string
  getAppVersion: () => Promise<string>
  reloadApp: () => Promise<void>
  openExternal: (url: string) => Promise<boolean>
  startGoogleAuth: () => Promise<boolean>
  clearSession: () => Promise<boolean>
  showNotification: (options: NotificationPayload) => Promise<boolean>
  saveFileDialog: (defaultName: string, filters?: FileFilter[]) => Promise<string | null>
  saveFileContent: (filePath: string, buffer: ArrayBuffer) => Promise<boolean>
  openFileDialog: (filters?: FileFilter[]) => Promise<OpenFileResult | null>
  getUpdateStatus: () => Promise<{
    currentVersion: string
    channel: "stable" | "beta"
    status: string
    updateInfo?: { version: string; releaseDate?: string }
    error?: string
  }>
}

const bridge: CollectBotDesktopBridge = {
  isDesktop: true,
  platform: process.platform,
  getAppVersion: async () => {
    return ipcRenderer.invoke("desktop:get-version")
  },
  reloadApp: async () => {
    return ipcRenderer.invoke("desktop:reload")
  },
  openExternal: async (url: string) => {
    return ipcRenderer.invoke("desktop:open-external", url)
  },
  startGoogleAuth: async () => {
    return ipcRenderer.invoke("desktop:start-google-auth")
  },
  clearSession: async () => {
    return ipcRenderer.invoke("desktop:logout")
  },
  showNotification: async (options: NotificationPayload) => {
    return ipcRenderer.invoke("desktop:notify", options)
  },
  saveFileDialog: async (defaultName: string, filters?: FileFilter[]) => {
    return ipcRenderer.invoke("desktop:save-file-dialog", { defaultName, filters })
  },
  saveFileContent: async (filePath: string, buffer: ArrayBuffer) => {
    return ipcRenderer.invoke("desktop:save-file-content", { filePath, buffer })
  },
  openFileDialog: async (filters?: FileFilter[]) => {
    return ipcRenderer.invoke("desktop:open-file-dialog", { filters })
  },
  getUpdateStatus: async () => {
    return ipcRenderer.invoke("desktop:get-update-status")
  },
}

// Expose restricted, strictly typed API to the renderer process
contextBridge.exposeInMainWorld("collectbotAPI", bridge)
