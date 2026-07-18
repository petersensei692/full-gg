import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WatchlistCalendarProvider } from "@/context/WatchlistCalendarContext";
import { AssetsProvider } from "@/context/AssetsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { THEME_STORAGE_KEY, DEFAULT_THEME } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JOURNAL APP",
  description: "Professional Trader",
};

const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d=${JSON.stringify(DEFAULT_THEME)};var t=localStorage.getItem(k);if(t!=="dark"&&t!=="light")t=d;var r=document.documentElement;r.dataset.theme=t;r.classList.remove("dark","light");r.classList.add(t);}catch(e){var r=document.documentElement;r.dataset.theme=${JSON.stringify(DEFAULT_THEME)};r.classList.add(${JSON.stringify(DEFAULT_THEME)});}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)] text-sm sm:text-sm md:text-[0.9375rem] lg:text-base`}
      >
        <ThemeProvider>
          <AssetsProvider>
            <WatchlistCalendarProvider>{children}</WatchlistCalendarProvider>
          </AssetsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
