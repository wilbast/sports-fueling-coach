import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sports & Fueling Coach",
    short_name: "Fueling Coach",
    description: "Persönlicher Coach für Training, Ernährung und Fueling.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#f7f5ef",
    theme_color: "#3f7f5f",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      },
      {
        src: "/icons/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
