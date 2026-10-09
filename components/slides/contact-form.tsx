"use client"

import { useState } from "react"
import { Send } from "lucide-react"

const fieldClass =
  "w-full rounded-xl border border-input bg-beige-cream px-4 py-3 text-ink placeholder:text-grey/70 outline-none transition-colors focus:border-blue-strong focus:ring-2 focus:ring-blue/50"

export function ContactForm({
  email,
  linkedinUrl,
}: {
  email: string
  linkedinUrl: string
}) {
  const [status, setStatus] = useState<"idle" | "opened">("idle")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get("name") ?? "").trim()
    const from = String(data.get("email") ?? "").trim()
    const message = String(data.get("message") ?? "").trim()

    const subject = `Message from ${name}`
    const body = `${message}\n\n— ${name} (${from})`

    if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    } else {
      window.open(linkedinUrl, "_blank", "noopener,noreferrer")
    }
    setStatus("opened")
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="contact-name" className="text-sm font-medium text-ink">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            placeholder="Your name"
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="contact-email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            placeholder="you@example.com"
            className={fieldClass}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="contact-message" className="text-sm font-medium text-ink">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={2000}
          placeholder="What would you like to talk about?"
          className={`${fieldClass} resize-none`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-grey" aria-live="polite">
          {status === "opened"
            ? email
              ? "Your email app should open with the message ready to send."
              : "Opening LinkedIn so you can send your message there."
            : email
              ? "Opens your email app with the message pre-filled."
              : "Messages are sent via LinkedIn for now."}
        </p>
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-beige-cream transition-colors hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
        >
          Send message
          <Send aria-hidden="true" className="size-4" />
        </button>
      </div>
    </form>
  )
}
