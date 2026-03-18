import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";

export const viewport: Viewport = {
  themeColor: "#20C997",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "STEMania Teacher Portal",
  description: "Teacher resources and tools for STEMania educators",
  applicationName: "STEMania Teacher",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/icon-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "STEMania Teacher",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col font-body antialiased">
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
