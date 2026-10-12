import { cn } from "@/lib/utils"
import { PagePager } from "@/components/page-pager"

type SlideProps = {
  id: string
  index: number
  eyebrow: string
  title?: string
  description?: string
  className?: string
  children: React.ReactNode
}

export function Slide({
  id,
  index,
  eyebrow,
  title,
  description,
  className,
  children,
}: SlideProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "relative flex min-h-dvh flex-col px-6 pb-12 pt-36 md:px-16 md:pb-14 md:pt-32",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        {title ? (
          <header className="mb-8 max-w-2xl md:mb-10">
            <SlideEyebrow index={index} label={eyebrow} />
            <h1
              id={`${id}-title`}
              className="mt-4 text-balance font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl"
            >
              {title}
            </h1>
            {description ? (
              <p className="mt-4 text-pretty leading-relaxed text-grey">
                {description}
              </p>
            ) : null}
          </header>
        ) : null}
        {children}
        <PagePager index={index} />
      </div>
    </section>
  )
}

export function SlideEyebrow({ label }: { index?: number; label: string }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.2em] text-grey">
      {label}
    </p>
  )
}

export function Card({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-6 shadow-[0_1px_0_0_oklch(0.22_0.005_260/0.04)] md:p-7",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function IconBadge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode
  tone?: "blue" | "ink"
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        tone === "blue" ? "bg-blue/35 text-ink" : "bg-ink text-beige-cream",
      )}
    >
      {children}
    </span>
  )
}
