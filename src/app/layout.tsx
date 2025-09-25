import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScrutMan - Event Management System",
  description: "Professional event management platform for clubs and organizations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const weglotApiKey = process.env.NEXT_PUBLIC_WEGLOT_API_KEY;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Weglot Translation Script */}
        {weglotApiKey && (
          <>
            <Script
              src="https://cdn.weglot.com/weglot.min.js"
              strategy="beforeInteractive"
            />
            <Script
              id="weglot-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  Weglot.initialize({
                    api_key: '${weglotApiKey}',
                    original_language: 'en',
                    destination_languages: 'fr',
                    style: 'button',
                    switcher: {
                      style: 'dropdown',
                      fullname: true,
                      withname: true,
                      is_dropdown: true,
                      with_flags: true
                    }
                  });
                `,
              }}
            />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
