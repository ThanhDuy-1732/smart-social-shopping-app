import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mình dùng — Social Shopping",
    short_name: "Mình dùng",
    description: "Chia sẻ trải nghiệm và mua sắm cùng cộng đồng",
    lang: "vi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff6f2",
    theme_color: "#af2452",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
