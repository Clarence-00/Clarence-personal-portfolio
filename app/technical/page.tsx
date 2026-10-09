import type { Metadata } from "next"
import { TechnicalSlide } from "@/components/slides/technical-slide"

export const metadata: Metadata = {
  title: "Technical & Engineering Experience — Clarence de Medeiros",
  description:
    "CAD modeling, 3D printing, and engineering team involvement including Formula SAE and High Power Rocketry.",
}

export default function TechnicalPage() {
  return (
    <main className="bg-background text-foreground">
      <TechnicalSlide />
    </main>
  )
}
