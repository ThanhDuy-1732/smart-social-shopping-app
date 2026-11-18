"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & { prompt: () => Promise<void> };
export function PwaControls() {
  const [install, setInstall] = useState<InstallEvent | null>(null),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    let active = true;
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", prompt);
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        if (!active) return;
        if (registration.waiting) setWaiting(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (
              active &&
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setWaiting(worker);
          });
        });
      })
      .catch(() => {
        if (active)
          setError("Chưa bật được chế độ PWA. Bạn vẫn có thể dùng website.");
      });
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  return (
    <div className="row">
      {install && (
        <button
          className="secondary"
          onClick={async () => {
            await install.prompt();
            setInstall(null);
          }}
        >
          Cài ứng dụng
        </button>
      )}
      {waiting && (
        <button
          className="secondary"
          onClick={() => {
            if (location.pathname.startsWith("/checkout")) {
              setError(
                "Hoàn tất hoặc rời trang thanh toán trước khi cập nhật.",
              );
              return;
            }
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => location.reload(),
              { once: true },
            );
            waiting.postMessage("APPLY_UPDATE");
          }}
        >
          Cập nhật ứng dụng
        </button>
      )}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
