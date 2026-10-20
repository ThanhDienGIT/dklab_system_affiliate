import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/ui/providers";
import { AnnouncementBar } from "@/components/layout/announcement";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ContactWidget } from "@/components/layout/contact-widget";
import { SiteChrome } from "@/components/layout/site-chrome";
import { NewsletterPopup } from "@/components/layout/newsletter-popup";
import { Experience } from "@/components/ui/experience";
import { getContainer } from "@/server/container";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";

const base = () => process.env.APP_URL ?? "http://localhost:3000";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#faf7f2" };

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(base()),
    title: { default: "Éleonore - Thời trang theo phong cách", template: "%s | Éleonore" },
    description: "Khám phá Y2K, Gloomy Coquette, Rococo, Baroque, Maximalism, Morute. Gợi ý sản phẩm theo phong cách và ngân sách, mua qua Shopee.",
    openGraph: { type: "website", siteName: "Éleonore", locale: "vi_VN", images: ["/brand/og.jpg"] },
    twitter: { card: "summary_large_image" },
    icons: { icon: "/brand/avatar.webp" },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [settings, user] = await Promise.all([getContainer().catalog.settings(), currentUser()]);
  const session = user ? { id: user.id, role: user.role, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl } : null;
  return (
    <html lang="vi" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers user={session}>
          <Experience>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory" style={{ zIndex: "var(--z-toast)" }}>Bỏ qua tới nội dung</a>
          <SiteChrome>
            <AnnouncementBar text={settings.announcement.text} href={settings.announcement.href} />
            <Header />
          </SiteChrome>
          <main id="main">{children}</main>
          <SiteChrome>
            <Footer />
            <ContactWidget contact={settings.contact} />
          </SiteChrome>
          <NewsletterPopup enabled={settings.popup.enabled} delaySec={settings.popup.delaySec} title={settings.popup.title} body={settings.popup.body} loggedIn={Boolean(user)} />
          </Experience>
        </Providers>
      </body>
    </html>
  );
}
