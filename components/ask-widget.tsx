"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, MessageCircle, SendHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  matchSections,
  sections,
  suggestedQuestions,
  type SiteSection,
} from "@/lib/sections"

const MAX_LENGTH = 200

type Message =
  | { id: number; from: "visitor"; text: string }
  | { id: number; from: "bot"; text: string; results: SiteSection[] }

/** "/technical/" -> "/technical", but "/" stays "/". */
function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1)
  return path
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Scroll to a section and flash a highlight on it. Returns false if it isn't on the page. */
function scrollToSection(section: SiteSection): boolean {
  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth"
  if (!section.anchor) {
    window.scrollTo({ top: 0, behavior })
    return true
  }
  const el = document.getElementById(section.anchor)
  if (!el) return false
  el.scrollIntoView({ behavior, block: "start" })
  // Restart the animation even if the same section is clicked twice.
  el.classList.remove("ask-highlight")
  void el.offsetWidth
  el.classList.add("ask-highlight")
  window.setTimeout(() => el.classList.remove("ask-highlight"), 2400)
  return true
}

// A few page-level entries make a good "try asking about…" list.
const fallbackTopics = ["fsae", "hprc", "woodland", "resume", "contact"]
  .map((id) => sections.find((s) => s.id === id))
  .filter((s): s is SiteSection => Boolean(s))

export function AskWidget() {
  const router = useRouter()
  const pathname = normalizePath(usePathname() ?? "/")

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState<SiteSection | null>(null)

  const nextId = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Keep the newest message in view.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [messages])

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // After a cross-page jump, wait for the new page to render, then scroll.
  useEffect(() => {
    if (!pending || normalizePath(pending.page) !== pathname) return
    let tries = 0
    let timer: number
    const attempt = () => {
      if (scrollToSection(pending) || tries++ > 30) {
        setPending(null)
        return
      }
      timer = window.setTimeout(attempt, 100)
    }
    timer = window.setTimeout(attempt, 50)
    return () => window.clearTimeout(timer)
  }, [pending, pathname])

  function ask(question: string) {
    const text = question.trim().slice(0, MAX_LENGTH)
    if (!text) return
    const results = matchSections(text)
    const reply =
      results.length > 0
        ? results.length === 1
          ? "Here's where you can find that:"
          : "Here are the best places to look:"
        : "Sorry, I couldn't find that on this site. Try asking about one of these:"
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, from: "visitor", text },
      {
        id: nextId.current++,
        from: "bot",
        text: reply,
        results: results.length > 0 ? results : fallbackTopics,
      },
    ])
    setInput("")
  }

  function go(section: SiteSection) {
    // On phones the panel covers the page, so get it out of the way.
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false)

    if (normalizePath(section.page) === pathname) {
      scrollToSection(section)
    } else {
      setPending(section)
      router.push(section.page)
    }
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Ask about me"
          className="fixed inset-x-3 bottom-20 z-50 flex max-h-[min(34rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-border bg-ink px-4 py-3 text-beige-cream">
            <div>
              <p className="font-display text-base font-semibold">Ask about me</p>
              <p className="text-xs text-beige-cream/70">
                I'll point you to the right part of the site.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                buttonRef.current?.focus()
              }}
              aria-label="Close chat"
              className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-beige-cream/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div
            ref={logRef}
            aria-live="polite"
            className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
          >
            {messages.length === 0 ? (
              <div>
                <p className="text-sm text-grey">
                  Hi! Ask a question about Clarence, or try one of these:
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {suggestedQuestions.map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => ask(q)}
                        className="rounded-full border border-border bg-beige px-3 py-1.5 text-left text-sm text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              messages.map((m) =>
                m.from === "visitor" ? (
                  <p
                    key={m.id}
                    className="max-w-[85%] self-end break-words rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-sm text-beige-cream"
                  >
                    {m.text}
                  </p>
                ) : (
                  <div key={m.id} className="max-w-[92%] self-start">
                    <p className="rounded-2xl rounded-bl-sm bg-beige px-3.5 py-2 text-sm text-ink">
                      {m.text}
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {m.results.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => go(s)}
                            className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-ink hover:bg-beige/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
                          >
                            <span className="flex-1">
                              <span className="block text-sm font-medium text-ink">
                                {s.title}
                              </span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-grey">
                                {s.summary}
                              </span>
                            </span>
                            <ArrowRight
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-grey transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <label htmlFor="ask-input" className="sr-only">
              Your question
            </label>
            <input
              id="ask-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={MAX_LENGTH}
              autoComplete="off"
              placeholder="e.g. What did he do on Formula SAE?"
              // 16px text stops iPhones from zooming in on focus.
              className="h-10 min-w-0 flex-1 rounded-full border border-border bg-beige-cream px-4 text-base text-ink placeholder:text-grey focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-strong sm:text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send question"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-beige-cream transition-colors hover:bg-ink/85 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
            >
              <SendHorizontal className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close Ask about me chat" : "Open Ask about me chat"}
        className="fixed right-4 bottom-4 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-beige-cream shadow-lg transition-colors hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong sm:right-6 sm:bottom-6"
      >
        {open ? (
          <X className="size-4" aria-hidden="true" />
        ) : (
          <MessageCircle className="size-4" aria-hidden="true" />
        )}
        <span>{open ? "Close" : "Ask about me"}</span>
      </button>
    </>
  )
}
