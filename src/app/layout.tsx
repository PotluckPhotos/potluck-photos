import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import Blobs from "@/components/Blobs";
import TopBar from "@/components/TopBar";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Potluck Photos",
  description: "A shared photo album you turn into a printed book.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${dmSans.variable}`}>
      <body>
        <Blobs />
        <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
          <TopBar />
          {children}
        </div>
      </body>
    </html>
  );
}
