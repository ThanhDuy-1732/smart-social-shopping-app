"use client";
import { useEffect, useState } from "react";
export function PushControls({ publicKey }: { publicKey: string | null }) {
  const [supported, setSupported] = useState(false),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false);
  useEffect(() => {
    setSupported(
      "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        window.isSecureContext,
    );
  }, []);
  async function change(enable: boolean) {
    setPending(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (enable) {
        if ((await Notification.requestPermission()) !== "granted") {
          setMessage(
            "Bạn chưa cho phép thông báo. Có thể đổi trong cài đặt trình duyệt.",
          );
          return;
        }
        const bytes = Uint8Array.from(
          atob(publicKey!.replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0),
        );
        subscription ??= await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        });
        const response = await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
        if (!response.ok) throw new Error((await response.json()).error);
        setMessage("Đã bật thông báo cho phiên đăng nhập này.");
      } else {
        if (subscription) {
          const response = await fetch("/api/push", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          if (!response.ok) throw new Error((await response.json()).error);
          await subscription.unsubscribe();
        }
        setMessage("Đã tắt thông báo trên trình duyệt này.");
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Chưa thay đổi được thông báo.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel section">
      <h2>Thông báo trên thiết bị</h2>
      <p>
        Chỉ hiển thị thông báo chung, không chứa nội dung chat hoặc địa chỉ.
        Đăng xuất sẽ hủy liên kết với phiên này.
      </p>
      {!publicKey ? (
        <p>
          Thông báo đẩy chưa được cấu hình. Bạn vẫn nhận cập nhật trong mục
          Thông báo.
        </p>
      ) : supported ? (
        <div className="row">
          <button disabled={pending} onClick={() => void change(true)}>
            Bật thông báo
          </button>
          <button
            className="secondary"
            disabled={pending}
            onClick={() => void change(false)}
          >
            Tắt thông báo
          </button>
        </div>
      ) : (
        <p>
          Trình duyệt hiện tại chưa hỗ trợ; trên iOS cần cài ứng dụng vào màn
          hình chính.
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
