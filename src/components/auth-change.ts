export function announceAuthChange() {
  localStorage.setItem("minhdung-auth-change", crypto.randomUUID());
  window.dispatchEvent(new Event("minhdung-auth-change"));
}
