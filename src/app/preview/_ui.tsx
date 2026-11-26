import Link from "next/link";

export type Dir = "a" | "b" | "c" | "d";
export type View = "feed" | "search";

const titles: Record<Dir, string> = {
  a: "A · Tạp chí",
  b: "B · Không gian",
  c: "C · Nhãn & phiếu",
  d: "D · Kết hợp B + C",
};

export function Shot({
  tone,
  ratio = "16/9",
  label,
  className = "",
}: {
  tone: number;
  ratio?: "16/9" | "4/3" | "1/1" | "4/5" | "3/2";
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`pv-shot tone-${tone} ${className}`}
      data-ratio={ratio}
      role="presentation"
    >
      {label && <span className="pv-shot-label">{label}</span>}
    </div>
  );
}

export function PreviewBar({ dir, view }: { dir: Dir; view: View }) {
  return (
    <div className="pv-bar" role="navigation" aria-label="Xem trước giao diện">
      <span className="pv-bar-label">Bản xem trước</span>
      {(["a", "b", "c", "d"] as const).map((item) => (
        <Link
          key={item}
          href={`/preview/${item}?view=${view}`}
          aria-current={item === dir ? "page" : undefined}
          title={titles[item]}
        >
          {item.toUpperCase()}
        </Link>
      ))}
      <span className="pv-bar-sep" aria-hidden="true" />
      <Link
        href={`/preview/${dir}?view=feed`}
        aria-current={view === "feed" ? "page" : undefined}
      >
        Bảng tin
      </Link>
      <Link
        href={`/preview/${dir}?view=search`}
        aria-current={view === "search" ? "page" : undefined}
      >
        Tìm món
      </Link>
      <Link className="pv-bar-hub" href="/preview">
        Đổi bản
      </Link>
    </div>
  );
}

export function Icon({
  name,
  size = 18,
}: {
  name: "heart" | "bookmark" | "comment" | "search" | "arrow" | "share";
  size?: number;
}) {
  const paths: Record<string, string> = {
    heart:
      "M12 20s-7-4.4-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8C19 15.6 12 20 12 20z",
    bookmark: "M6 3.5h12v17l-6-4.2-6 4.2z",
    comment: "M4 5h16v11H9l-5 4z",
    search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
    arrow: "M4 12h15M13 6l6 6-6 6",
    share: "M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v6h14v-6",
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
