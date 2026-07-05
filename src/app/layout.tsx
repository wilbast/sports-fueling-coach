import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sports & Fueling Coach",
  description: "Persönlicher Coach für Training, Ernährung und Fueling.",
  manifest: "/manifest.webmanifest",
  applicationName: "Sports & Fueling Coach",
  appleWebApp: {
    capable: true,
    title: "Fueling Coach",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/icons/app-icon.svg",
    apple: "/icons/app-icon.svg"
  }
};

export const viewport = {
  themeColor: "#3f7f5f"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
