import Image from "next/image"
import { Layers, Wrench } from "lucide-react"
import { Card, IconBadge, Slide } from "./slide"

import gimballphoto from "@/public/images/Technical/gimball-photo.png"
import gimballphoto1 from "@/public/images/Technical/gimball-photo1.png"
import gimballphoto2 from "@/public/images/Technical/gimball-photo2.png"

import exhaustphoto from "@/public/images/Technical/exhaust-photo.png"
import exhaustphoto1 from "@/public/images/Technical/exhaust-photo1.png"
import exhaustphoto2 from "@/public/images/Technical/exhaust-photo2.png"
import exhaustphoto3 from "@/public/images/Technical/exhaust-photo3.png"

import phoneStandPhoto from "@/public/images/Technical/phone-stand.jpg"

const teams = [
  { id: "hprc", name: "High Power Rocketry Club", detail: "Experimental GNC Hardware / Rocket Mechanisms and Avionics" },
  { id: "fsae", name: "Formula SAE", detail: "Drivetrain subteam & Exhaust Lead" },
]

const hprcProjects = [
  {
    title: "Gimbal Mechanism Integration",
    description: "Design and assembly of the experimental GNC hardware gimbal system.",
    image: gimballphoto,
  },
  {
    title: "Sensor Setup & Calibration",
    description: "Configuring and testing electronic telemetry components.",
    image: gimballphoto1,
  },
  {
    title: "Hardware Assembly & Testing",
    description: "Rigorous bench testing and integration before field deployment.",
    image: gimballphoto2,
  },
  {
    title: "Placeholder Item 4",
    description: "Text placeholder 4: work done, progress, updates.",
    image: null,
  },
  {
    title: "Placeholder Item 5",
    description: "Text placeholder 5: work done, progress, updates.",
    image: null,
  },
]

const fsaeProjects = [
  {
    title: "Exhaust Routing & Design",
    description: "Designing custom exhaust components for optimal vehicle performance.",
    image: exhaustphoto,
  },
  {
    title: "Fabrication & Welding",
    description: "Precision manufacturing and assembly of exhaust tubing.",
    image: exhaustphoto1,
  },
  {
    title: "Mounting & Brackets",
    description: "Engineering secure structural brackets to handle high vibration.",
    image: exhaustphoto2,
  },
  {
    title: "System Testing & Validation",
    description: "Final fitment checks and performance tuning.",
    image: exhaustphoto3,
  },
  {
    title: "Placeholder Item 5",
    description: "Text placeholder 5: work done, progress, updates.",
    image: null,
  },
]

const printingProjects = [
  {
    title: "Custom Phone Stand",
    description:
      "I designed this phone stand myself in CAD, sizing the cradle and lip around my phone in its case and shaping the curved back support to hold it at a comfortable viewing angle. I then sliced the model, tuned the print settings, and 3D printed it, testing the fit and stability before calling it finished.",
    image: phoneStandPhoto,
  },
  ...Array.from({ length: 3 }).map((_, i) => ({
    title: `3D Printing Workflow ${i + 2}`,
    description: `Text placeholder ${i + 2}: work done, progress, updates.`,
    image: null,
  })),
]

export function TechnicalSlide() {
  return (
    <Slide
      id="technical"
      index={3}
      eyebrow="Technical experience"
      title="Projects & Engineering"
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {/* Left Card: Engineering Team Involvement */}
        <Card>
          <div className="flex items-start gap-4">
            <IconBadge>
              <Wrench className="size-5" />
            </IconBadge>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold text-ink">
                Engineering Team Involvement
              </h3>
              <ul className="mt-3 flex flex-col gap-3">
                {teams.map((team) => (
                  <li key={team.id}>
                    <a
                      href={`#${team.id}`}
                      className="block h-full rounded-xl border border-border bg-beige/60 p-4 transition-colors hover:border-ink hover:bg-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
                    >
                      <p className="font-medium text-ink">{team.name}</p>
                      <p className="mt-1 text-sm text-grey">{team.detail}</p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {/* Right Card: Interactive 3D Printing Workflows Button */}
        <a
          href="#3d-printing"
          className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
        >
          <Card className="flex h-full flex-col justify-between transition-colors hover:border-ink hover:bg-beige/60">
            <div className="flex items-start gap-4">
              <IconBadge>
                <Layers className="size-5" />
              </IconBadge>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-ink">
                  3D Printing Workflows
                </h3>
                <p className="mt-1 text-sm text-grey">
                  Slicing, calibration, and structural functional parts
                </p>
              </div>
            </div>
          </Card>
        </a>
      </div>

      <div className="mt-16 flex flex-col gap-20">
        {/* High Power Rocketry Club Section with Gimbal Photos */}
        <section id="hprc" className="scroll-mt-32">
          <h2 className="font-display text-3xl font-semibold text-ink">High Power Rocketry Club</h2>
          <div className="mt-8 flex flex-col gap-10">
            {hprcProjects.map((project, i) => (
              <div key={i} className="grid items-center gap-6 md:grid-cols-2">
                {project.image ? (
                  <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl border border-border shadow-sm ${i % 2 ? "md:order-2" : ""}`}>
                    <Image src={project.image} alt={project.title} fill className="object-cover" />
                  </div>
                ) : (
                  <div className={`flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-ink/25 bg-beige-cream text-sm text-grey ${i % 2 ? "md:order-2" : ""}`}>
                    Image placeholder {i + 1}
                  </div>
                )}
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">{project.title}</h3>
                  <p className="mt-2 text-grey">{project.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Formula SAE Section with Exhaust Photos */}
        <section id="fsae" className="scroll-mt-32">
          <h2 className="font-display text-3xl font-semibold text-ink">Formula SAE</h2>
          <div className="mt-8 flex flex-col gap-10">
            {fsaeProjects.map((project, i) => (
              <div key={i} className="grid items-center gap-6 md:grid-cols-2">
                {project.image ? (
                  <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl border border-border shadow-sm ${i % 2 ? "md:order-2" : ""}`}>
                    <Image src={project.image} alt={project.title} fill className="object-cover" />
                  </div>
                ) : (
                  <div className={`flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-ink/25 bg-beige-cream text-sm text-grey ${i % 2 ? "md:order-2" : ""}`}>
                    Image placeholder {i + 1}
                  </div>
                )}
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">{project.title}</h3>
                  <p className="mt-2 text-grey">{project.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3D Printing Workflows Section */}
        <section id="3d-printing" className="scroll-mt-32">
          <h2 className="font-display text-3xl font-semibold text-ink">3D Printing Workflows</h2>
          <div className="mt-8 flex flex-col gap-10">
            {printingProjects.map((project, i) => (
              <div key={i} className="grid items-center gap-6 md:grid-cols-2">
                {project.image ? (
                  <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl border border-border shadow-sm ${i % 2 ? "md:order-2" : ""}`}>
                    <Image src={project.image} alt={project.title} fill className="object-cover" />
                  </div>
                ) : (
                  <div className={`flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-ink/25 bg-beige-cream text-sm text-grey ${i % 2 ? "md:order-2" : ""}`}>
                    Image placeholder {i + 1}
                  </div>
                )}
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">{project.title}</h3>
                  <p className="mt-2 text-grey">{project.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Slide>
  )
}