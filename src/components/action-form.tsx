"use client";
import { useActionState } from "react";
export type ActionState = { error?: string; success?: string };
export function ActionForm({
  action,
  children,
  submitLabel,
  disabled = false,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="form">
      <fieldset
        disabled={pending}
        style={{
          border: 0,
          padding: 0,
          margin: 0,
          display: "grid",
          gap: 16,
          minWidth: 0,
        }}
      >
        {children}
        <button disabled={pending || disabled}>
          {pending ? "Đang xử lý…" : submitLabel}
        </button>
      </fieldset>
      {state.error && (
        <p role="alert" className="notice error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="notice success">
          {state.success}
        </p>
      )}
    </form>
  );
}
