import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Import API diagnostics for debugging (only in development)
if (import.meta.env.DEV) {
  import("./utils/api-diagnostics").then(() => {
    console.log(
      "🔧 API diagnostics loaded. Use window.apiDiagnostics to debug API issues.",
    );
  });
}

// Simple fatal error overlay to surface issues causing blank screen
function showFatalErrorOverlay(error: unknown) {
  try {
    const container = document.getElementById("root");
    const message =
      (error as any)?.message || (typeof error === "string" ? error : "Error");
    const stack = (error as any)?.stack || "";

    if (container) {
      container.innerHTML = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding:16px; color:#111;">
          <div style="max-width:720px;margin:32px auto;border:1px solid #fee2e2;background:#fff1f2;border-radius:12px;padding:16px;">
            <div style="display:flex;align-items:center;color:#b91c1c;margin-bottom:8px;font-weight:600;">
              <span style="margin-right:8px">⚠️</span>
              <span>Application error</span>
            </div>
            <div style="color:#7f1d1d;font-size:14px;white-space:pre-wrap;word-break:break-word;">
              ${String(message)}
            </div>
            ${stack ? `<pre style="margin-top:8px;font-size:12px;color:#7f1d1d;white-space:pre-wrap;overflow:auto;">${stack}</pre>` : ""}
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
              <button onclick="location.reload()" style="background:#C70000;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;">Reload</button>
              <button onclick="console.clear()" style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;cursor:pointer;">Clear Console</button>
            </div>
          </div>
        </div>`;
    }
  } catch {
    // no-op
  }
}

// Global error hooks
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error || e.message);
  showFatalErrorOverlay(e.error || e.message);
});

window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
  console.error("Unhandled rejection:", e.reason);
  showFatalErrorOverlay(e.reason);
});

// Get the root element
const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found");
}

// Create root only once and store it
let root: ReturnType<typeof createRoot> | null = null;

import {
  ensurePushPermissionNonBlocking,
  getFcmToken,
  listenForegroundNotifications,
  subscribeTokenToGeneralTopic,
} from "./lib/messaging";

function initializeApp() {
  try {
    if (!root) {
      root = createRoot(container);
    }
    root.render(<App />);
  } catch (e) {
    console.error("Fatal render error:", e);
    showFatalErrorOverlay(e);
    return;
  }

  if ("serviceWorker" in navigator) {
    setTimeout(async () => {
      try {
        await ensurePushPermissionNonBlocking();
        const token = await getFcmToken();
        if (token) {
          subscribeTokenToGeneralTopic(token);
          listenForegroundNotifications();
        }
      } catch (e) {
        console.warn("Push setup failed (non-fatal):", (e as any)?.message || e);
      }
    }, 1500);
  }
}

// Initialize the app
initializeApp();

// Hot Module Replacement (HMR) support for development
if (import.meta.hot) {
  import.meta.hot.accept("./App", () => {
    // Re-render the app when App.tsx changes, but don't create a new root
    if (root) {
      try {
        root.render(<App />);
      } catch (e) {
        console.error("HMR render error:", e);
        showFatalErrorOverlay(e);
      }
    }
  });
}
