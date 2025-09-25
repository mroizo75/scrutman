"use client";

import Script from "next/script";

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const weglotApiKey = process.env.NEXT_PUBLIC_WEGLOT_API_KEY;

  return (
    <div className="min-h-screen bg-background">
      {/* Weglot Translation Script for Athlete Dashboard */}
      {weglotApiKey && (
        <>
          <Script
            src="https://cdn.weglot.com/weglot.min.js"
            strategy="beforeInteractive"
          />
          <Script
            id="weglot-athlete-init"
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
    </div>
  );
}
