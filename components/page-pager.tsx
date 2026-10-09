import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { pages } from "@/lib/profile"

export function PagePager({ index }: { index: number }) {
  const prev = pages[index - 2]
  const next = pages[index]

  return (
    <nav
      aria-label="Page navigation"
      className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="group inline-flex items-center gap-3 rounded-full text-sm text-grey transition-colors hover:text-ink"
        >
          <ArrowLeft
            aria-hidden="true"
            className="size-4 transition-transform group-hover:-translate-x-0.5"
          />
          <span>
            <span className="sr-only">Previous page: </span>
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group inline-flex h-11 items-center gap-2 self-start rounded-full bg-ink px-5 text-sm font-medium text-beige-cream transition-colors hover:bg-ink/85 sm:self-auto"
        >
          <span>
            <span className="sr-only">Next page: </span>
            {next.title}
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </nav>
  )
}
