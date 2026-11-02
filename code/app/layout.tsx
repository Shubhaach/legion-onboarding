import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { FlowProvider } from "@/components/flow";
import { DemoPanel } from "@/components/DemoPanel";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Legion Health · Get started",
  description: "Prototype: AI-native patient onboarding for Texas. Synthetic data only.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body>
        <FlowProvider>
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>{children}</div>
          <DemoPanel />
        </FlowProvider>
      </body>
    </html>
  );
}
