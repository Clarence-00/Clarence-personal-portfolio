import type { Metadata } from "next"
import { ExperienceSlide } from "@/components/slides/experience-slide"

export const metadata: Metadata = {
  title: "Experience & Job History — Clarence de Medeiros",
  description: "Professional background and leadership roles of Clarence de Medeiros.",
}

export default function ExperiencePage() {
  return (
    <main className="bg-background text-foreground">
      <ExperienceSlide />
    </main>
  )
}
