import Link from "next/link";
import { Heart } from "lucide-react";
import { getContainer } from "@/server/container";
import { currentUser } from "@/server/session";
import { DesktopNav } from "./desktop-nav";
import { MobileMenu } from "./mobile-menu";
import { SearchButton } from "./search-overlay";
import { UserMenu } from "./user-menu";
import { FavCount } from "./fav-count";

export async function Header() {
  const c = getContainer();
  const [menu, settings, user] = await Promise.all([c.catalog.menu(), c.catalog.settings(), currentUser()]);
  const session = user ? { id: user.id, role: user.role, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl } : null;
  return (
    <header className="sticky top-0 border-b border-line bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/85" style={{ zIndex: "var(--z-sticky)" }}>
      <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 lg:h-[72px]">
        <div className="flex items-center gap-1">
          <MobileMenu menu={menu} user={session} brand={settings.brand.name} />
          <div className="hidden lg:block"><SearchButton variant="bar" /></div>
          <div className="lg:hidden"><SearchButton variant="icon" /></div>
        </div>
        <Link href="/" aria-label={`${settings.brand.name} - trang chủ`} className="text-center">
          <span className="font-display block text-[28px] leading-tight tracking-[0.18em] sm:text-[34px]">{settings.brand.name.toUpperCase()}</span>
          <span className="mt-1 hidden text-[9px] uppercase tracking-[0.4em] text-muted sm:block">{settings.brand.tagline}</span>
        </Link>
        <div className="flex items-center justify-end gap-0.5">
          <Link href="/yeu-thich" aria-label="Sản phẩm yêu thích" className="relative grid h-11 w-11 place-items-center transition hover:text-gold-deep">
            <Heart size={21} strokeWidth={1.5} />
            <FavCount />
          </Link>
          <UserMenu user={session} />
        </div>
      </div>
      <div className="hidden border-t border-line/70 lg:block">
        <DesktopNav menu={menu} />
      </div>
    </header>
  );
}
