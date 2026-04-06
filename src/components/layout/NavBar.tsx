"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationBell from "./NotificationBell";

interface Props {
  username?: string;
  avatarUrl?: string | null;
}

export default function NavBar({ username, avatarUrl }: Props) {
  const pathname = usePathname();

  const links = [
    { href: "/feed", label: "Home", icon: "🏠" },
    { href: "/search", label: "Search", icon: "🔍" },
    { href: "/discover", label: "Discover", icon: "🧭" },
    { href: `/${username}`, label: "Profile", icon: "👤" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <>
      {/* Desktop: top bar */}
      <header className="hidden sm:block sticky top-0 z-20 bg-black/70 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-8 py-3.5 flex items-center gap-8">
          <Link href="/feed" className="font-display text-2xl shrink-0">
            Euterpy
          </Link>

          <nav className="flex-1 flex items-center gap-1">
            {links.slice(0, 3).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  pathname === link.href || (link.href !== "/feed" && pathname.startsWith(link.href))
                    ? "text-accent font-medium"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Notifications + Settings + Profile */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link
              href="/settings"
              className={`text-sm transition-colors ${pathname === "/settings" ? "text-accent" : "text-muted hover:text-foreground"}`}
            >
              Settings
            </Link>
            <Link
              href={`/${username}`}
              className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-sm text-muted shrink-0 hover:border-accent transition-colors overflow-hidden"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-medium">{username?.[0]?.toUpperCase() || "?"}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile: bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-background/90 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around py-2 px-4 pb-[env(safe-area-inset-bottom,8px)]">
          {links.slice(0, 3).map((link) => {
            const isActive = pathname === link.href || (link.href !== "/feed" && link.href.length > 1 && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  isActive ? "text-accent" : "text-muted"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span className="text-[10px]">{link.label}</span>
              </Link>
            );
          })}
          <Link
            href="/notifications"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              pathname === "/notifications" ? "text-accent" : "text-muted"
            }`}
          >
            <span className="text-lg">🔔</span>
            <span className="text-[10px]">Alerts</span>
          </Link>
          <Link
            href={`/${username}`}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              pathname === `/${username}` ? "text-accent" : "text-muted"
            }`}
          >
            <span className="text-lg">👤</span>
            <span className="text-[10px]">Profile</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
