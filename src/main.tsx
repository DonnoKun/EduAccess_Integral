import { createRoot } from "react-dom/client";
import { warmSpeechVoices } from "./lib/speech";
if (typeof window !== "undefined" && "speechSynthesis" in window) { warmSpeechVoices(); window.speechSynthesis.addEventListener?.("voiceschanged", () => warmSpeechVoices()); }
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n"; // Initialize i18n

createRoot(document.getElementById("root")!).render(<App />);

// Installed app: fetch new versions on open, every 30 min and on refocus, then reload so it never stays outdated.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    const update = registerSW({
      immediate: true,
      onNeedRefresh: () => update(true),
      onRegisteredSW: (_url, reg) => {
        if (!reg) return;
        const check = () => reg.update().catch(() => undefined);
        setInterval(check, 30 * 60 * 1000);
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
      },
    });
  }).catch(() => undefined);
}
