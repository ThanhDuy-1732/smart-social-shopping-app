'use client';
import { useState } from 'react';
import { authClient } from './auth-client';
export function AccountSettings({ twoFactorEnabled }: { twoFactorEnabled: boolean }) {
  const [secret, setSecret] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function enable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage('');
    try {
      const result = await authClient.twoFactor.enable({ password: String(new FormData(event.currentTarget).get('password')) });
      if (result.error || !result.data || result.data.method !== 'totp') throw new Error('Chưa bật được xác thực hai bước. Kiểm tra mật khẩu và thử lại.');
      setSecret(new URL(result.data.totpURI).searchParams.get('secret') ?? '');
      setCodes(result.data.backupCodes);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Chưa thể kết nối.'); }
    finally { setPending(false); }
  }
  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage('');
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: String(new FormData(event.currentTarget).get('code')) });
      if (result.error) throw new Error('Mã chưa đúng. Kiểm tra ứng dụng xác thực và thử lại.');
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Chưa thể kết nối.'); }
    finally { setPending(false); }
  }
  return <div className="panel"><h2>Bảo vệ tài khoản</h2>{twoFactorEnabled ? <p className="notice success">Đã bật xác thực hai bước.</p> : secret ? <>
    <p>Thêm khóa này vào ứng dụng xác thực của bạn:</p><p className="notice break"><code>{secret}</code></p>
    <p>Lưu mã dự phòng ở nơi an toàn trước khi xác nhận. Mỗi mã chỉ dùng một lần.</p><pre className="notice break">{codes.join('\n')}</pre>
    <form className="form" onSubmit={verify}><label>Mã từ ứng dụng xác thực<input name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></label><button disabled={pending}>Xác nhận bật xác thực</button></form>
  </> : <><p className="muted">Thêm một lớp bảo vệ. Tài khoản vận hành cần bật tính năng này trước khi được cấp quyền.</p><form className="form" onSubmit={enable}><label>Mật khẩu hiện tại<input type="password" name="password" autoComplete="current-password" maxLength={128} required /></label><button disabled={pending}>Thiết lập xác thực hai bước</button></form></>}
  {message && <p role="alert" className="notice error">{message}</p>}
  <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '24px 0' }}/><button className="secondary" onClick={async () => { const result = await authClient.signOut(); if (result.error) { setMessage('Chưa đăng xuất được. Vui lòng thử lại.'); return; } window.location.assign('/login'); }}>Đăng xuất</button>
  </div>;
}
