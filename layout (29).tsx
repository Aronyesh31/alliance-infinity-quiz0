import type { Metadata, Viewport } from "next";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ALLIANCE × INFINITY CLUB", template: "%s · ALLIANCE × INFINITY CLUB" },
  description: "The live quiz for the Alliance × Infinity Club challenge. Join with your game PIN.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#050919",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
