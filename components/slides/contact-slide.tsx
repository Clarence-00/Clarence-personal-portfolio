import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Mail, Phone, Handshake } from "lucide-react"
import { LinkedInIcon } from "@/components/linkedin-icon"
import { profile } from "@/lib/profile"
import { Card, IconBadge, Slide } from "./slide"
import { ContactForm } from "./contact-form"

export function ContactSlide() {
  return (
    <Slide
      id="contact"
      index={5}
      eyebrow="Contact & Connect"
      title="Let's connect"
      description="I’m always open to hearing from you, don’t hesitate to reach out!"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr] lg:gap-5">
        <div className="flex flex-col gap-4">
          <a
            href={profile.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
          >
            <Card className="flex items-center gap-4 border-ink bg-ink text-beige-cream transition-colors group-hover:bg-ink/90">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue text-ink"
              >
                <LinkedInIcon className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-display text-lg font-semibold">LinkedIn</p>
                <p className="text-sm text-beige-cream/70">
                  Professional profile
                </p>
              </div>
              <ArrowUpRight
                aria-hidden="true"
                className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Card>
          </a>

          <a
            href={profile.handshakeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
          >
            <Card className="flex items-center gap-4 border-ink bg-ink text-beige-cream transition-colors group-hover:bg-ink/90">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue text-ink"
              >
                <Handshake className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-display text-lg font-semibold">Handshake</p>
                <p className="text-sm text-beige-cream/70">
                  Student profile
                </p>
              </div>
              <ArrowUpRight
                aria-hidden="true"
                className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Card>
          </a>

          <Card className="flex flex-col gap-4">
            <h3 className="font-display text-lg font-semibold text-ink">Contact info</h3>
            <a href={`mailto:${profile.email}`} className="flex items-center gap-3 text-ink hover:underline">
              <Mail aria-hidden="true" className="size-4" /> {profile.email}
            </a>
            <a href="tel:+18573127517" className="flex items-center gap-3 text-ink hover:underline">
              <Phone aria-hidden="true" className="size-4" /> {profile.phone}
            </a>
          </Card>

          <Card className="flex flex-1 flex-col justify-between gap-6">
            <div>
              <p className="font-display text-lg font-semibold text-ink">
                {profile.name}
              </p>
              <p className="mt-1 text-sm text-grey">
                {profile.headline} · {profile.school}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2 text-sm font-medium text-ink underline-offset-4 hover:underline"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to start
            </Link>
          </Card>
        </div>

        <Card>
          <h3 className="font-display text-xl font-semibold text-ink">
            Send a message
          </h3>
          <ContactForm email={profile.email} linkedinUrl={profile.linkedinUrl} />
        </Card>
      </div>
    </Slide>
  )
}