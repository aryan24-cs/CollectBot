# COLLECTBOT DESKTOP — NATIVE WINDOWS FEATURES (PHASE 3)

**Document Version:** 1.0.0  
**Date:** November 11, 2026  
**Status:** **IMPLEMENTED & VERIFIED**  
**Target:** Windows x64 Native Shell  

---

## 1. NATIVE FILE OPERATIONS & DOWNLOAD MANAGEMENT

CollectBot Desktop integrates with Windows native file dialogs while preserving existing browser upload and download flows:

### 1.1 Native File Dialogs (Preload Bridge)
The desktop bridge exposes safe, restricted file handlers:
- `saveFileDialog(defaultName, filters)`: Opens the native Windows **Save File Dialog** (`dialog.showSaveDialog`), sanitizes the default filename, and returns the chosen absolute path.
- `saveFileContent(filePath, buffer)`: Writes file buffers to disk with strict **path traversal defenses** (rejects paths containing `..`).
- `openFileDialog(filters)`: Opens the native Windows **Open File Dialog** (`dialog.showOpenDialog`) for expense receipts and logo uploads, enforcing a maximum file size of **10 MB**.

### 1.2 Automated Download Interception (`will-download`)
When the user clicks "Download PDF" or generates an accounting export (CSV / Tally XML):
```typescript
persistentSession.on("will-download", (_event, item) => {
  const filename = path.basename(item.getFilename() || "export.csv")
  const defaultSavePath = path.join(app.getPath("downloads"), filename)
  item.setSavePath(defaultSavePath)

  item.once("done", (_event, state) => {
    if (state === "completed" && Notification.isSupported()) {
      new Notification({
        title: "Download Complete",
        body: `File saved to Downloads: ${filename}`,
        icon: path.join(__dirname, "../assets/icon.ico"),
      }).show()
    }
  })
})
```
- Directs files automatically to the Windows user's standard `%USERPROFILE%\Downloads` folder.
- Fires a native Windows desktop toast notification upon completion.

---

## 2. NATIVE DESKTOP NOTIFICATIONS

CollectBot uses the native Windows 10/11 Notification Center to notify users of critical business activities:

### Supported Business Events
1. **Invoice Payment Received:** Notifies business owners and finance officers when Razorpay payment reconciles.
2. **New Sales Lead Assigned:** Notifies sales representatives when a new prospect is assigned.
3. **Task & Follow-up Reminders:** Alerts employees of upcoming deal deadlines and scheduled calls.
4. **Expense Approval Requests:** Alerts approvers when an employee submits an expense receipt.

### Security & Privacy Protections
1. **HTML Stripping:** All notification strings pass through a regex cleaner (`/<[^>]*>?/gm`) to prevent raw HTML or script tags.
2. **Length Caps:** Titles are capped at 100 characters; bodies are capped at 250 characters.
3. **Data Redaction:** Sensitive details (such as client bank account numbers, PAN numbers, and full credit card details) are never rendered in Windows lock-screen notification banners.
4. **Click-to-Focus:** Clicking a notification automatically restores the window from the taskbar and brings it to the foreground.

---

## 3. APPLICATION MENU & SHORTCUTS

The native Windows menu bar provides standard desktop keyboard accelerators:

| Menu | Item | Shortcut | Action |
| :--- | :--- | :--- | :--- |
| **File** | Exit | `Alt+F4` | Terminates application cleanly. |
| **Edit** | Undo / Redo / Cut / Copy / Paste | Standard OS | Native clipboard and text field operations. |
| **View** | Reload | `Ctrl+R` | Reloads current page view. |
| **View** | Zoom In / Out / Reset | `Ctrl++`, `Ctrl+-`, `Ctrl+0` | Adjusts UI scaling. |
| **View** | Fullscreen | `F11` | Toggles distraction-free fullscreen mode. |
| **History** | Back / Forward | `Alt+Left` / `Alt+Right` | Safe browser history navigation. |
| **Help** | CollectBot Website | None | Opens `https://collectbot.in` in system browser. |
| **Help** | About CollectBot | None | Displays native dialog with version and copyright info. |

---

## 4. SINGLE-INSTANCE LOCKING & MULTI-WINDOW DEFENSE

To prevent memory bloat and duplicate conflicting background sessions, CollectBot enforces a single-instance lock:
```typescript
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}
```
If a user launches a second shortcut or clicks a desktop link while CollectBot is already running, the secondary instance immediately yields execution, and the primary instance is restored and focused.

