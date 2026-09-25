import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { Nav } from "@/components/Nav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { RegisterSW } from "@/components/RegisterSW";
import { SyncBootstrap } from "@/components/SyncBootstrap";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Homestock",
  description: "Know what you have at home, and cook from it",
  appleWebApp: { capable: true, title: "Homestock", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-page text-ink transition-colors">
        {/* Set the theme class before first paint, or the page flashes light. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.theme;var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()",
          }}
        />
        <ThemeProvider>
          <AuthProvider>
            <RegisterSW />
            <SyncBootstrap />
            <div className="sticky top-0 z-40">
              <OfflineBanner />
              <Nav />
            </div>
            {/* Bottom padding clears the mobile tab bar. */}
            <main className="flex flex-1 flex-col pb-16 sm:pb-0">{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
