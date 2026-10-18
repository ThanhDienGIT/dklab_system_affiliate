import Link from "next/link";
import { FacebookIcon, InstagramIcon, TiktokIcon } from "./social-icons";
import { getContainer } from "@/server/container";
import { NewsletterForm } from "./newsletter-form";

export async function Footer() {
  const c = getContainer();
  const [settings, menu] = await Promise.all([c.catalog.settings(), c.catalog.menu()]);
  const s = settings.social;
  return (
    <footer className="mt-24 bg-ink text-ivory">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.2fr_1fr] lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-md md:col-span-2 lg:col-span-1">
          <p className="font-display text-3xl tracking-[0.18em]">{settings.brand.name.toUpperCase()}</p>
          <p className="mt-3 text-sm text-ivory/70">{settings.brand.tagline}</p>
          <p className="eyebrow mb-3 mt-8 !text-gold-soft">Đăng ký Éleonore Circle</p>
          <NewsletterForm tone="dark" />
        </div>
        <FooterCol title="Phong cách" links={menu.map((m) => ({ href: m.href, label: m.name }))} />
        <FooterCol title="Hỗ trợ" links={[
          { href: "/chinh-sach/gioi-thieu", label: "Về Éleonore" }, { href: "/chinh-sach/mua-hang", label: "Cách mua hàng" },
          { href: "/chinh-sach/doi-tra", label: "Đổi trả & bảo hành" }, { href: "/chinh-sach/lien-he", label: "Liên hệ" },
        ]} />
        <FooterCol title="Chính sách" links={[
          { href: "/chinh-sach/affiliate", label: "Tiết lộ affiliate" }, { href: "/chinh-sach/bao-mat", label: "Bảo mật dữ liệu cá nhân" },
          { href: "/chinh-sach/dieu-khoan", label: "Điều khoản sử dụng" },
        ]} />
      </div>
      <div className="border-t border-ivory/15">
        <div className="container-x flex flex-col gap-4 py-6 pb-24 text-xs md:pb-6 md:pr-24 text-ivory/65 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl leading-relaxed">{settings.disclosure}</p>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} {settings.brand.name}</span>
            {s.instagram && <a href={s.instagram} aria-label="Instagram" target="_blank" rel="noopener noreferrer"><InstagramIcon /></a>}
            {s.tiktok && <a href={s.tiktok} aria-label="TikTok" target="_blank" rel="noopener noreferrer"><TiktokIcon /></a>}
            {s.facebook && <a href={s.facebook} aria-label="Facebook" target="_blank" rel="noopener noreferrer"><FacebookIcon /></a>}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="eyebrow mb-4 !text-gold-soft">{title}</p>
      <ul className="space-y-2.5 text-sm text-ivory/80">
        {links.map((l) => <li key={l.href}><Link href={l.href} className="link-u">{l.label}</Link></li>)}
      </ul>
    </div>
  );
}
