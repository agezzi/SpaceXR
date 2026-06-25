import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpaceXR",
  description: "Visualize furniture in your space with WebXR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
