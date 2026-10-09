import Link from "next/link"
import { ArrowRight, ArrowUpRight, Briefcase, Cog, Mail, Trophy } from "lucide-react"
import { LinkedInIcon } from "@/components/linkedin-icon"
import { pages, profile } from "@/lib/profile"
import { Card, SlideEyebrow } from "./slide"

const background = [
  { label: "School", value: profile.school },
  { label: "Field", value: "Mechanical Engineering" },
  { label: "Passions", value: "Building, design, and athletics" },
  {
    label: "Strengths",
    value: "CAD modeling, hands-on fabrication, and leadership",
  },
]

const pageIcons = {
  "/experience": Briefcase,
  "/technical": Cog,
  "/interests": Trophy,
  "/contact": Mail,
} as const

const destinations = pages.slice(1)

export function IntroSlide() {
  return (
    <section
      aria-labelledby="intro-title"
      className="relative flex min-h-dvh flex-col overflow-hidden px-6 pb-14 pt-36 md:px-16 md:pt-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-32 size-[28rem] rounded-full bg-blue/40 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <div>
            <SlideEyebrow index={1} label="Introduction & About Me" />
            <h1
              id="intro-title"
              className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink md:text-7xl"
            >
              {profile.firstName}
              <br />
              {profile.lastName}
            </h1>
            <p className="mt-5 inline-flex items-center rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-beige-cream">
              {profile.headline}
            </p>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-grey">
              {profile.bio}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/experience"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-beige-cream transition-colors hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
              >
                Explore my work
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 bg-card px-6 text-sm font-medium text-ink transition-colors hover:bg-blue/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
              >
                <LinkedInIcon className="size-4" />
                LinkedIn
              </a>
            </div>
          </div>

          <Card className="relative">
            <h2 className="font-display text-xl font-semibold text-ink">
              Background
            </h2>
            <dl className="mt-5 flex flex-col divide-y divide-border">
              {background.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0"
                >
                  <dt className="text-xs font-medium uppercase tracking-[0.15em] text-grey">
                    {item.label}
                  </dt>
                  <dd className="text-pretty leading-relaxed text-ink">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <nav aria-labelledby="explore-title" className="mt-14 md:mt-16">
          <h2
            id="explore-title"
            className="text-xs font-medium uppercase tracking-[0.2em] text-grey"
          >
            Explore the site
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {destinations.map((page, i) => {
              const Icon = pageIcons[page.href]
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-ink hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        aria-hidden="true"
                        className="flex size-10 items-center justify-center rounded-xl bg-blue/35 text-ink transition-colors group-hover:bg-blue"
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="font-display text-sm text-grey transition-colors group-hover:text-beige-cream/60">
                        {String(i + 2).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-beige-cream">
                        {page.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-grey transition-colors group-hover:text-beige-cream/70">
                        {page.summary}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors group-hover:text-beige-cream">
                      Visit page
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </section>
  )
}
