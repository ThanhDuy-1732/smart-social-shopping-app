import { pageActor } from "@/server/page-access";
import { listUsers } from "@/modules/users/service";
import { changeRole, changeSuspension } from "./actions";
export default async function Users() {
  const actor = await pageActor("users.manage");
  const users = await listUsers(actor);
  return (
    <>
      <h1>Người dùng</h1>
      <p className="muted">
        Tối đa 100 tài khoản mới nhất. Cấp quyền vận hành sau khi người dùng đã
        xác minh email và bật xác thực hai bước.
      </p>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Bảo mật</th>
              <th>Quyền</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.name}
                  <br />
                  <small>{user.email}</small>
                </td>
                <td>
                  {user.emailVerified ? "Đã xác minh email" : "Chưa xác minh"}
                  <br />
                  {user.twoFactorEnabled
                    ? "Đã bật hai bước"
                    : "Chưa bật hai bước"}
                </td>
                <td>
                  {user.roles.join(", ") || "Người dùng"}
                  {user.id !== actor.userId && (
                    <form action={changeRole} className="form">
                      <input type="hidden" name="userId" value={user.id} />
                      <label>
                        Quyền vận hành
                        <select name="role">
                          <option value="moderator">Kiểm duyệt</option>
                          <option value="support">Hỗ trợ</option>
                          <option value="finance">Tài chính</option>
                          <option value="admin">Quản trị</option>
                        </select>
                      </label>
                      <div className="row">
                        <button
                          name="enabled"
                          value="true"
                          disabled={
                            !user.emailVerified || !user.twoFactorEnabled
                          }
                        >
                          Cấp quyền
                        </button>
                        <button
                          className="secondary"
                          name="enabled"
                          value="false"
                        >
                          Thu hồi
                        </button>
                      </div>
                    </form>
                  )}
                </td>
                <td>
                  {user.suspended ? "Tạm khóa" : "Hoạt động"}
                  {user.id !== actor.userId && (
                    <form action={changeSuspension}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        name="suspended"
                        value={String(!user.suspended)}
                        className="secondary"
                      >
                        {user.suspended ? "Mở khóa" : "Tạm khóa"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
