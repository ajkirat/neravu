import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Neravu · PG management",
    short_name: "Neravu",
    description: "Beds, tenants, rent and dues in one place.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#0e6b64",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
