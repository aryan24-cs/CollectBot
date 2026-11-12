import { Menu, MenuItemConstructorOptions, app, BrowserWindow, shell, dialog } from "electron"
import {
  checkForUpdatesManually,
  getUpdateChannel,
  setUpdateChannel,
  UpdateChannel,
} from "./updater"

export function createAppMenu(mainWindow: BrowserWindow, isDev: boolean): Menu {
  const currentChannel = getUpdateChannel()

  const template: MenuItemConstructorOptions[] = [
    {
      label: "&File",
      submenu: [
        {
          label: "E&xit",
          accelerator: "Alt+F4",
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: "&Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "&View",
      submenu: [
        {
          label: "&Reload",
          accelerator: "Ctrl+R",
          click: () => {
            mainWindow.webContents.reload()
          },
        },
        ...(isDev
          ? [
              {
                label: "Force Reload",
                accelerator: "Ctrl+Shift+R",
                click: () => {
                  mainWindow.webContents.reloadIgnoringCache()
                },
              },
              {
                label: "Toggle Developer Tools",
                accelerator: "Ctrl+Shift+I",
                click: () => {
                  mainWindow.webContents.toggleDevTools()
                },
              },
              { type: "separator" as const },
            ]
          : []),
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "&History",
      submenu: [
        {
          label: "&Back",
          accelerator: "Alt+Left",
          click: () => {
            if (mainWindow.webContents.canGoBack()) {
              mainWindow.webContents.goBack()
            }
          },
        },
        {
          label: "&Forward",
          accelerator: "Alt+Right",
          click: () => {
            if (mainWindow.webContents.canGoForward()) {
              mainWindow.webContents.goForward()
            }
          },
        },
      ],
    },
    {
      label: "&Help",
      submenu: [
        {
          label: "Check for &Updates...",
          click: () => {
            checkForUpdatesManually(mainWindow)
          },
        },
        {
          label: "Update &Channel",
          submenu: [
            {
              label: "Stable",
              type: "radio",
              checked: currentChannel === "stable",
              click: () => {
                if (currentChannel !== "stable") {
                  dialog
                    .showMessageBox(mainWindow, {
                      type: "question",
                      title: "Switch to Stable Channel",
                      message: "Switch to Stable Release Channel?",
                      detail:
                        "You will receive only officially validated production releases.",
                      buttons: ["Switch to Stable", "Cancel"],
                      defaultId: 0,
                      cancelId: 1,
                    })
                    .then((res) => {
                      if (res.response === 0) {
                        setUpdateChannel("stable")
                        createAppMenu(mainWindow, isDev)
                        checkForUpdatesManually(mainWindow)
                      } else {
                        createAppMenu(mainWindow, isDev)
                      }
                    })
                }
              },
            },
            {
              label: "Beta (Prerelease)",
              type: "radio",
              checked: currentChannel === "beta",
              click: () => {
                if (currentChannel !== "beta") {
                  dialog
                    .showMessageBox(mainWindow, {
                      type: "warning",
                      title: "Switch to Beta Channel",
                      message: "Switch to Beta Release Channel?",
                      detail:
                        "You will receive prerelease updates with early features. Beta builds may contain bugs. Do you wish to continue?",
                      buttons: ["Switch to Beta", "Cancel"],
                      defaultId: 0,
                      cancelId: 1,
                    })
                    .then((res) => {
                      if (res.response === 0) {
                        setUpdateChannel("beta")
                        createAppMenu(mainWindow, isDev)
                        checkForUpdatesManually(mainWindow)
                      } else {
                        createAppMenu(mainWindow, isDev)
                      }
                    })
                }
              },
            },
          ],
        },
        { type: "separator" },
        {
          label: "CollectBot &Website",
          click: () => {
            shell.openExternal("https://collectbot.in")
          },
        },
        {
          label: "Contact &Support",
          click: () => {
            shell.openExternal("mailto:support@collectbot.in")
          },
        },
        { type: "separator" },
        {
          label: "&About CollectBot",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About CollectBot",
              message: "CollectBot Desktop",
              detail: `Version: ${app.getVersion()}\nChannel: ${getUpdateChannel().toUpperCase()}\nOne Business OS — Finance • Sales • Marketing\nCopyright © 2026 CollectBot Technologies`,
              buttons: ["OK"],
            })
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  return menu
}
