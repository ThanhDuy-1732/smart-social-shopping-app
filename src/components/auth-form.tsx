"use client";
import { announceAuthChange } from "./auth-change";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "./auth-client";
type Mode = "login" | "register" | "forgot" | "reset" | "two-factor";
const copy = {
  login: [
    "Chào bạn quay lại",
    "Đăng nhập để tiếp tục khám phá và chia sẻ.",
    "Đăng nhập",
  ],
  register: [
    "Cùng chia sẻ điều hay",
    "Tạo tài khoản để lưu những món bạn thích và mở gian hàng.",
    "Tạo tài khoản",
  ],
  forgot: [
    "Lấy lại mật khẩu",
    "Nhập email đã dùng để đăng ký tài khoản.",
    "Gửi liên kết đặt lại",
  ],
  reset: [
    "Đặt mật khẩu mới",
    "Chọn mật khẩu mới có ít nhất 12 ký tự.",
    "Lưu mật khẩu mới",
  ],
  "two-factor": [
    "Xác thực hai bước",
    "Nhập mã 6 chữ số trong ứng dụng xác thực của bạn.",
    "Xác nhận",
  ],
};
export function AuthForm({ mode }: { mode: Mode }) {
  const [backup, setBackup] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setFailed(false);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    try {
      if (mode === "login") {
        const result = await authClient.signIn.email({ email, password });
        if (result.error)
          throw new Error(
            result.error.code === "EMAIL_NOT_VERIFIED"
              ? "Vui lòng mở email xác minh tài khoản. Bạn có thể đăng nhập lại để nhận liên kết mới."
              : "Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.",
          );
        if (!("twoFactorRedirect" in (result.data ?? {}))) {
          announceAuthChange();
          window.location.assign("/settings");
        }
      } else if (mode === "register") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: String(data.get("name")),
        });
        if (result.error)
          throw new Error(
            result.error.status === 429
              ? "Bạn đã thử nhiều lần. Vui lòng chờ một lát rồi thử lại."
              : "Chưa tạo được tài khoản. Kiểm tra thông tin hoặc thử đăng nhập nếu đã đăng ký.",
          );
        setMessage("Vui lòng mở email xác minh trước khi đăng nhập.");
      } else if (mode === "forgot") {
        await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        });
        setMessage(
          "Nếu email có tài khoản, liên kết đặt lại mật khẩu sẽ được gửi.",
        );
      } else if (mode === "reset") {
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token)
          throw new Error(
            "Liên kết chưa hợp lệ. Vui lòng yêu cầu liên kết đặt lại mới.",
          );
        const result = await authClient.resetPassword({
          newPassword: password,
          token,
        });
        if (result.error)
          throw new Error(
            "Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu liên kết mới.",
          );
        setMessage("Đã đổi mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.");
      } else {
        const result = backup
          ? await authClient.twoFactor.verifyBackupCode({
              code: String(data.get("code")),
            })
          : await authClient.twoFactor.verifyTotp({
              code: String(data.get("code")),
            });
        if (result.error)
          throw new Error("Mã chưa đúng hoặc đã hết hạn. Vui lòng thử mã mới.");
        window.location.assign("/settings");
      }
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Chưa thể kết nối. Vui lòng thử lại.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="panel narrow">
      <h1>{copy[mode][0]}</h1>
      <p className="muted">{copy[mode][1]}</p>
      <form className="form" onSubmit={submit}>
        {mode === "register" && (
          <label>
            Tên hiển thị
            <input
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
            />
          </label>
        )}
        {["login", "register", "forgot"].includes(mode) && (
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
        )}
        {["login", "register", "reset"].includes(mode) && (
          <label>
            Mật khẩu
            <input
              type="password"
              name="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              required
            />
          </label>
        )}
        {mode === "two-factor" && (
          <>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={backup}
                onChange={(event) => setBackup(event.target.checked)}
              />
              Dùng mã dự phòng
            </label>
            <label>
              {backup ? "Mã dự phòng" : "Mã xác thực"}
              <input
                name="code"
                inputMode={backup ? "text" : "numeric"}
                autoComplete="one-time-code"
                pattern={backup ? undefined : "[0-9]{6}"}
                maxLength={backup ? 128 : 6}
                required
              />
            </label>
          </>
        )}
        <button disabled={pending}>
          {pending ? "Đang xử lý…" : copy[mode][2]}
        </button>
      </form>
      {message && (
        <p
          className={`notice ${failed ? "error" : "success"}`}
          role={failed ? "alert" : "status"}
        >
          {message}
        </p>
      )}
      <p className="form-links">
        <Link href={mode === "login" ? "/register" : "/login"}>
          {mode === "login" ? "Tạo tài khoản" : "Về đăng nhập"}
        </Link>
        {mode === "login" && (
          <Link href="/forgot-password">Quên mật khẩu?</Link>
        )}
      </p>
    </div>
  );
}
