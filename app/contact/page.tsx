import type { Metadata } from "next"
import { ContactSlide } from "@/components/slides/contact-slide"

export const metadata: Metadata = {
  title: "Contact & Connect — Clarence de Medeiros",
  description: "Connect with Clarence de Medeiros on LinkedIn or send a message.",
}

export default function ContactPage() {
  return (
    <main className="bg-background text-foreground">
      <ContactSlide />
    </main>
  )
}
