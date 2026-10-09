import type { Metadata } from "next"
import { InterestsSlide } from "@/components/slides/interests-slide"

export const metadata: Metadata = {
  title: "Interests & Activities — Clarence de Medeiros",
  description:
    "Track and field, springboard diving, basketball, and playing the guitar.",
}

export default function InterestsPage() {
  return (
    <main className="bg-background text-foreground">
      <InterestsSlide />
    </main>
  )
}
