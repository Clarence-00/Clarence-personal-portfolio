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
import qrCodePhoto from "@/public/images/Technical/qr-code.jpg"
import fsaeTeamPhoto from "@/public/images/Technical/fsae-car.jpg"

const teams = [
  { id: "hprc", name: "High Power Rocketry Club", detail: "Experimental GNC Hardware / Rocket Mechanisms and Avionics" },
  { id: "fsae", name: "Formula SAE", detail: "Drivetrain subteam & Exhaust Lead" },
]

const hprcProjects = [
  {
    title: "Gimbal Mechanism Design",
    description:
      "CAD model of the experimental GNC gimbal: the flight computer sits in a housing on a two-axis pivot, driven by two stepper motors on side brackets through color-coded linkage arms, all on a mounting plate.",
    image: gimballphoto,
  },
  {
    title: "Exploded Assembly View",
    description:
      "Exploded view of the gimbal showing how it goes together: the stepper motors, side brackets, linkage arms, electronics housing, flight computer board, and the fasteners that hold it all in place.",
    image: gimballphoto1,
  },
  {
    title: "Integration into the Rocket Airframe",
    description:
      "The gimbal assembly positioned above its mounting plate and a section of the rocket airframe, checking fit and alignment before integrating the hardware into the vehicle.",
    image: gimballphoto2,
  },
]

const fsaeProjects = [
  {
    title: "WPI Formula SAE Team",
    description:
      "Our Formula SAE team at WPI's Society of Automotive Engineers shop, where we design, fabricate, and assemble the car. I'm on the drivetrain subteam as Exhaust Lead.",
    image: fsaeTeamPhoto,
  },
  {
    title: "Exhaust Routing in the Chassis",
    description:
      "Full-vehicle CAD showing the exhaust header looping off the engine and running back to the muffler through the tube-frame chassis, with clearance checked against the frame and surrounding components.",
    image: exhaustphoto,
  },
  {
    title: "Header, Muffler & Sensor Assembly",
    description:
      "The complete exhaust assembly on its own: the curved header pipe, muffler, and an exhaust sensor mounted on the header with its wiring routed away from the pipe.",
    image: exhaustphoto1,
  },
  {
    title: "Sensor Mounting Detail",
    description:
      "Close-up of the threaded sensor port on the header pipe, positioned and angled so the sensor reads the exhaust flow while staying accessible for installation and service.",
    image: exhaustphoto2,
  },
  {
    title: "3D Scan of the Exhaust Header",
    description:
      "3D scan of the existing exhaust header and flange, used as a reference to capture the real geometry for redesigning and fitting new exhaust components.",
    image: exhaustphoto3,
  },
]

const printingProjects = [
  {
    title: "Custom Phone Stand",
    description:
      "I designed this phone stand myself in CAD, sizing the cradle and lip around my phone in its case and shaping the curved back support to hold it at a comfortable viewing angle. I then sliced the model, tuned the print settings, and 3D printed it, testing the fit and stability before calling it finished.",
    image: phoneStandPhoto,
  },
  {
    title: "3D Printed QR Code",
    description:
      "I 3D printed a QR code that links to this portfolio site, with the code raised off a framed base so it scans reliably. It's a small, durable card I can carry around and hand to people so they can pull up my work on their phone.",
    image: qrCodePhoto,
  },
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
                  Things I've designed and 3D printed
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