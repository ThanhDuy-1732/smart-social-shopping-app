"use client";
import { useEffect, useRef, useState } from "react";
export function PrivateSession({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null),
    [valid, setValid] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let generation = 0,
      alive = true;
    const hide = () => {
      generation++;
      if (container.current) container.current.hidden = true;
    };
    const invalidate = () => {
      hide();
      setValid(false);
    };
    async function verify() {
      hide();
      const current = generation;
      try {
        const response = await fetch("/api/session/identity", {
            cache: "no-store",
          }),
          actor = await response.json();
        if (!alive || current !== generation) return;
        if (!response.ok) {
          invalidate();
          window.location.replace("/login");
          return;
        }
        if (actor.userId !== userId) {
          invalidate();
          window.location.reload();
          return;
        }
        setError(false);
        setValid(true);
        if (container.current) container.current.hidden = false;
      } catch {
        if (alive && current === generation) {
          invalidate();
          setError(true);
        }
      }
    }
    const visible = () => {
      if (document.visibilityState === "visible") void verify();
      else hide();
    };
    const authChanged = () => {
      invalidate();
      void verify();
    };
    const changed = (event: StorageEvent) => {
      if (event.key === "minhdung-auth-change") authChanged();
    };
    window.addEventListener("pagehide", invalidate);
    window.addEventListener("pageshow", verify);
    window.addEventListener("focus", verify);
    window.addEventListener("storage", changed);
    window.addEventListener("minhdung-auth-change", authChanged);
    document.addEventListener("visibilitychange", visible);
    void verify();
    return () => {
      alive = false;
      generation++;
      window.removeEventListener("pagehide", invalidate);
      window.removeEventListener("pageshow", verify);
      window.removeEventListener("focus", verify);
      window.removeEventListener("storage", changed);
      window.removeEventListener("minhdung-auth-change", authChanged);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [userId]);
  return (
    <>
      {!valid && (
        <p role="status">
          {error
            ? "Cần kết nối để xác minh phiên đăng nhập. Hãy tải lại khi có mạng."
            : "Đang xác minh phiên đăng nhập…"}
        </p>
      )}
      <div ref={container} hidden={!valid}>
        {valid ? children : null}
      </div>
    </>
  );
}
