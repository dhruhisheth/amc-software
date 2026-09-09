import type { Metadata, Viewport } from "next";
import SessionProvider from "@/components/SessionProvider";
import NavBar from "@/components/NavBar";
import AlertBanner from "@/components/AlertBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMC Tracker",
  description: "AMC service contract tracker",
  appleWebApp: { capable: true, title: "AMC", statusBarStyle: "black-translucent" },
};

// Matches the warehouse app's viewport and theme colour, so the two sit together properly when
// both are installed on a phone home screen.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <div className="app-shell">
            <NavBar />
            <AlertBanner />
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
