"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { pages, profile } from "@/lib/profile"

export function SiteNav() {
  const pathname = usePathname()

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 pt-4 md:px-8 md:pt-6">
      <div className="pointer-events-auto mx-auto flex max-w-6xl flex-col gap-2 rounded-3xl border border-border bg-beige-cream/85 p-2 backdrop-blur-md md:flex-row md:items-center md:justify-between md:rounded-full md:pl-5">
        <Link
          href="/"
          className="px-3 pt-1 font-display text-base font-semibold text-ink md:px-0 md:pt-0"
        >
          {profile.name}
        </Link>
        <nav aria-label="Pages" className="-mx-1 overflow-x-auto px-1">
          <ul className="flex items-center gap-1">
            {pages.map((page) => {
              const active = pathname === page.href
              return (
                <li key={page.href} className="shrink-0">
                  <Link
                    href={page.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-full px-3.5 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-ink text-beige-cream"
                        : "text-grey hover:bg-blue/30 hover:text-ink",
                    )}
                  >
                    {page.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
