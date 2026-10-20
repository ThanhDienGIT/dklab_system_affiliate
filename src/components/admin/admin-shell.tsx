"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart3, BookOpen, ChevronDown, ExternalLink, FileSpreadsheet, LayoutDashboard, LogOut, Menu, PackagePlus, PanelLeftClose,
  PanelLeftOpen, Search, Settings, ShoppingBag, Sparkles, Tags, Upload, User, Users, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard, stats: BarChart3, products: ShoppingBag, add: PackagePlus, taxonomy: Tags, blog: BookOpen,
  shopee: FileSpreadsheet, import: Upload, users: Users, ai: Sparkles, settings: Settings,
} as const;
export type AdminIcon = keyof typeof ICONS;
export interface AdminNavGroup { label: string; items: { href: string; label: string; icon: AdminIcon }[] }
interface ShellUser { fullName: string; email: string; avatarUrl: string | null; role: string }

const COLLAPSE_KEY = "admin.sidebar.collapsed";

/** Muc dang mo = muc co href dai nhat khop dau duong dan (/admin/san-pham/moi -> "Thêm sản phẩm", /admin/san-pham/12 -> "Sản phẩm") */
function activeHref(path: string, groups: AdminNavGroup[]) {
  let best = "";
  for (const g of groups) for (const i of g.items) {
    const hit = i.href === "/admin" ? path === "/admin" : path === i.href || path.startsWith(`${i.href}/`);
    if (hit && i.href.length > best.length) best = i.href;
  }
  return best;
}

/** Khung quan tri kieu TailAdmin: sidebar trai (thu gon duoc / drawer tren mobile) + header dinh tren + vung noi dung */
export function AdminShell({ groups, user, brand, children }: { groups: AdminNavGroup[]; user: ShellUser; brand: string; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false); // drawer mobile
  const [collapsed, setCollapsed] = useState(false); // desktop
  const searchRef = useRef<HTMLInputElement>(null);
  const current = activeHref(path, groups);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"); } catch { /* storage bi chan */ }
  }, []);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try { localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1"); } catch { /* storage bi chan */ }
      return !v;
    });
  };
  const mini = collapsed && !open; // thu gon chi ap dung desktop; drawer mobile luon day du

  return (
    <div className="min-h-dvh lg:flex">
      {open && <div aria-hidden className="fixed inset-0 bg-ink/40 lg:hidden" style={{ zIndex: "var(--z-drawer-overlay)" }} onClick={() => setOpen(false)} />}

      <aside id="admin-sidebar" aria-label="Menu quản trị"
        className={cn(
          "fixed inset-y-0 left-0 flex w-[280px] flex-col border-r border-line bg-paper transition-[transform,visibility] duration-300 ease-[var(--ease-lux)]",
          "lg:visible lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 lg:transition-[width]",
          // dong tren mobile: an khoi cay truy cap / Tab (khong de focus vao menu nam ngoai man hinh)
          open ? "visible translate-x-0" : "invisible -translate-x-full",
          mini && "lg:w-[84px]",
        )}
        style={{ zIndex: "var(--z-drawer)" }}>
        <div className={cn("flex h-16 shrink-0 items-center justify-between border-b border-line px-6", mini && "lg:justify-center lg:px-0")}>
          <Link href="/admin" className="min-w-0" aria-label={`${brand} - trang quản trị`}>
            <span className={cn("font-display block truncate text-2xl leading-none tracking-[0.18em]", mini && "lg:hidden")}>{brand.toUpperCase()}</span>
            <span className={cn("mt-1 block text-[9px] uppercase tracking-[0.36em] text-gold-deep", mini && "lg:hidden")}>Quản trị</span>
            <span className={cn("font-display hidden text-2xl", mini && "lg:block")} aria-hidden>{brand.slice(0, 1).toUpperCase()}</span>
          </Link>
          <button type="button" aria-label="Đóng menu" className="grid h-10 w-10 place-items-center lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>

        <nav className="no-scrollbar flex-1 overflow-y-auto px-4 py-5">
          {groups.map((g) => (
            <div key={g.label} className="mb-5">
              <p className={cn("mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted", mini && "lg:px-0 lg:text-center")}>
                <span className={cn(mini && "lg:hidden")}>{g.label}</span>
                <span className={cn("hidden", mini && "lg:inline")} aria-hidden>···</span>
              </p>
              <ul className="space-y-1">
                {g.items.map((i) => {
                  const Icon = ICONS[i.icon];
                  const on = i.href === current;
                  return (
                    <li key={i.href}>
                      <Link href={i.href} aria-current={on ? "page" : undefined} title={mini ? i.label : undefined}
                        className={cn(
                          "group relative flex min-h-11 items-center gap-3 px-3 text-sm font-medium transition-colors",
                          on ? "bg-gold/10 text-gold-deep" : "text-ink-soft hover:bg-sand hover:text-ink",
                          mini && "lg:justify-center lg:px-0",
                        )}>
                        {on && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] bg-gold-deep" />}
                        <Icon size={19} strokeWidth={1.6} className={cn("shrink-0", on ? "text-gold-deep" : "text-muted group-hover:text-ink")} />
                        <span className={cn("truncate", mini && "lg:sr-only")}>{i.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-line p-4", mini && "lg:px-2")}>
          <Link href="/" target="_blank" title={mini ? "Xem website" : undefined}
            className={cn("flex min-h-11 items-center gap-3 px-3 text-sm text-ink-soft hover:bg-sand hover:text-ink", mini && "lg:justify-center lg:px-0")}>
            <ExternalLink size={18} strokeWidth={1.6} className="shrink-0 text-muted" /><span className={cn(mini && "lg:sr-only")}>Xem website</span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-paper/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-paper/85 md:gap-4 md:px-6"
          style={{ zIndex: "var(--z-sticky)" }}>
          <button type="button" aria-label="Mở menu" aria-controls="admin-sidebar" aria-expanded={open}
            className="grid h-11 w-11 shrink-0 place-items-center border border-line hover:border-ink lg:hidden" onClick={() => setOpen(true)}><Menu size={19} /></button>
          <button type="button" aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"} aria-controls="admin-sidebar"
            className="hidden h-11 w-11 shrink-0 place-items-center border border-line hover:border-ink lg:grid" onClick={toggleCollapsed}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <form action="/admin/san-pham" role="search" className="relative hidden max-w-md flex-1 sm:block">
            <Search size={17} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input ref={searchRef} name="q" type="search" placeholder="Tìm sản phẩm…" aria-label="Tìm sản phẩm"
              className="field !min-h-11 !pl-10 !pr-16 text-sm" />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 border border-line bg-sand px-1.5 py-0.5 font-sans text-[11px] text-muted md:block">⌘ K</kbd>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/admin/san-pham" aria-label="Tìm sản phẩm" className="grid h-11 w-11 place-items-center border border-line hover:border-ink sm:hidden"><Search size={18} /></Link>
            <UserMenu user={user} />
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1536px] flex-1 p-4 md:p-6 2xl:p-8">{children}</div>
      </div>
    </div>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST", body: {} }).catch(() => {});
    router.push("/");
    router.refresh();
  };
  const role = user.role === "admin" ? "Quản trị viên" : "Biên tập viên";
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-11 items-center gap-3 pl-1 pr-2 hover:text-gold-deep">
        {user.avatarUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-gold-soft" />
          : <span className="font-display grid h-10 w-10 place-items-center rounded-full bg-ink text-base text-ivory">{user.fullName.slice(0, 1).toUpperCase()}</span>}
        <span className="hidden text-left md:block">
          <span className="block max-w-[160px] truncate text-sm font-semibold leading-tight">{user.fullName}</span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-gold-deep">{role}</span>
        </span>
        <ChevronDown size={16} className={cn("hidden transition-transform md:block", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[52px] w-64 border border-line bg-paper p-2 shadow-xl animate-fade-up" style={{ zIndex: "var(--z-mega)" }}>
          <div className="border-b border-line px-3 pb-3 pt-1">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link role="menuitem" href="/tai-khoan" className="mt-1 flex min-h-11 items-center gap-2 px-3 text-sm hover:bg-sand"><User size={16} /> Tài khoản của tôi</Link>
          <Link role="menuitem" href="/" target="_blank" className="flex min-h-11 items-center gap-2 px-3 text-sm hover:bg-sand"><ExternalLink size={16} /> Xem website</Link>
          <button role="menuitem" type="button" onClick={logout} className="flex min-h-11 w-full items-center gap-2 border-t border-line px-3 text-left text-sm hover:bg-sand"><LogOut size={16} /> Đăng xuất</button>
        </div>
      )}
    </div>
  );
}
