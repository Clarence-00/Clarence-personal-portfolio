import Image, { type StaticImageData } from "next/image"
import { Layers, Sparkles, Wrench } from "lucide-react"
import { Card, IconBadge, Slide } from "./slide"

import gimbalV2Assembly from "@/public/images/Technical/gimbal-v2-assembly.png"
import gimbalV2YawExploded from "@/public/images/Technical/gimbal-v2-yaw-exploded.png"

import exhaustChassisRear from "@/public/images/Technical/exhaust-chassis-rear.png"
import exhaustEngineAssembly from "@/public/images/Technical/exhaust-engine-assembly.png"
import exhaustphoto3 from "@/public/images/Technical/exhaust-photo3.png"

import phoneStandPhoto from "@/public/images/Technical/phone-stand.jpg"
import qrCodePhoto from "@/public/images/Technical/qr-code.jpg"
import fsaeTeamPhoto from "@/public/images/Technical/fsae-car.jpg"

import scan2cadScanViews from "@/public/images/Technical/scan2cad-scan-views.webp"
import scan2cadPlaneCheck from "@/public/images/Technical/scan2cad-plane-check.webp"
import scan2cadCenterline from "@/public/images/Technical/scan2cad-centerline.webp"
import scan2cadFlangeOutline from "@/public/images/Technical/scan2cad-flange-outline.webp"
import scan2cadSplineFit from "@/public/images/Technical/scan2cad-spline-fit.webp"
import scan2cadDeviationMap from "@/public/images/Technical/scan2cad-deviation-map.webp"

const teams = [
  { id: "hprc", name: "High Power Rocketry Club", detail: "Experimental GNC Hardware / Rocket Mechanisms and Avionics" },
  { id: "fsae", name: "Formula SAE", detail: "Drivetrain subteam & Exhaust Lead" },
]

const hprcProjects = [
  {
    title: "Gimbal v2 Assembly",
    description:
      "CAD model of the experimental GNC gimbal, version 2: the flight computer sits on a two-axis pivot driven by two stepper motors on side brackets through color-coded linkage arms, and the whole gimbal now rides on a stepper-driven yaw turntable.",
    image: gimbalV2Assembly,
    alt: "CAD render of the Gimbal v2 assembly: a flight computer board between two stepper motors on teal brackets, linked by red, green and blue arms, mounted on an orange plate above a blue yaw platter and black base.",
  },
  {
    title: "Exploded Yaw Stage",
    description:
      "Exploded view of the yaw turntable under the gimbal, showing how it goes together: the top platter, a large ring gear driven by a small pinion on a stepper motor, the motor's mounting bracket, the bearing, and the base housing.",
    image: gimbalV2YawExploded,
    alt: "Exploded CAD view of the gimbal's yaw stage: a blue platter, an orange ring gear with a red pinion, a green motor bracket, a stepper motor, a bearing ring, and a black base.",
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
      "Full-vehicle CAD showing the exhaust header looping off the engine and running back to the muffler, which mounts on brackets at the rear of the tube-frame chassis, with clearance checked against the frame and surrounding components.",
    image: exhaustChassisRear,
    alt: "Rear three-quarter CAD view of the Formula SAE exhaust: the header loops over the engine and runs back to the muffler on its brackets inside the tube-frame chassis.",
  },
  {
    title: "Exhaust & Engine Assembly",
    description:
      "The exhaust shown with the engine and its mounts, without the frame: the curved header pipe, the muffler on its two support brackets, and the exhaust sensor on the header with its wiring routed away from the pipe.",
    image: exhaustEngineAssembly,
    alt: "CAD view of the exhaust header, muffler and support brackets attached to the engine and its mounts, shown without the chassis, with the sensor lead rising from the header.",
  },
  {
    title: "3D Scan of the Exhaust Header",
    description:
      "3D scan of the existing exhaust header and flange, used as a reference to capture the real geometry for redesigning and fitting new exhaust components.",
    image: exhaustphoto3,
  },
]

// ---------- AI Integration: Scan-to-CAD exhaust header ----------
type FigureImage = { src: StaticImageData; alt: string; cover?: boolean }

const scanToCadTags = ["3D Scanning", "SolidWorks", "Python", "Claude + MCP", "FSAE"]

const scanToCadSteps = [
  "I set the scope: only the pipe and flange, leaving out the heat shield, with all units in mm. My caliper measurements set the scale and checked the results.",
  "Claude analyzed the 1.7-million-triangle scan with Python. It traced the pipe's true centerline by slicing it every 2 mm and found that the whole bend lies in one plane (within 0.7 mm).",
  "It traced the flange outline and bolt holes from the scan. The bore came out at 37.3 mm, confirming my 37.4 mm measurement. It also found that the bolt holes are unevenly spaced, which I flagged to check against the engine.",
  "Claude then built the part directly in SolidWorks with a real feature tree: a spline sweep along the scanned centerline, a 0.75 mm shell, revolves for the outlet collar, and an extruded flange with bolt holes.",
]

const scanToCadRows: { images: FigureImage[]; caption: string }[] = [
  {
    images: [
      {
        src: exhaustphoto3,
        cover: true,
        alt: "Grey 3D scan render of the FSAE exhaust header: a looping pipe with the 3-bolt flange at one end, shown on a dark background.",
      },
      {
        src: scan2cadScanViews,
        alt: "Three orthographic views (top, front and side) of the scanned header's point cloud in black, with a second surface along part of the bend highlighted in red.",
      },
    ],
    caption: "The 3D scan of the header, shown as a render and as the raw point cloud.",
  },
  {
    images: [
      {
        src: scan2cadCenterline,
        alt: "Front-plane plot of the scanned pipe in grey with the extracted centerline drawn in red along the full bend, beside a plot of the flange's engine face.",
      },
      {
        src: scan2cadFlangeOutline,
        alt: "Flange cross-section in black on a millimeter grid, with its traced outline, central bore and three bolt holes outlined in red.",
      },
    ],
    caption: "Extracting the centerline and flange geometry from the scan.",
  },
  {
    images: [
      {
        src: scan2cadPlaneCheck,
        alt: "The scan projected into the plane of the bend, colored by distance from that plane, next to an edge-on view showing the pipe stays flat in one plane.",
      },
      {
        src: scan2cadSplineFit,
        alt: "Spline fits used to build the model: red control points along the pipe centerline with the outlet collar profile in green, and a red spline traced around the flange outline.",
      },
    ],
    caption: "Checking that the bend is planar, then fitting the splines that drive the SolidWorks sweep and flange.",
  },
]

function ScanToCadFigure({ images, caption }: { images: FigureImage[]; caption: string }) {
  return (
    <figure>
      <div className={`grid items-center gap-6 ${images.length > 1 ? "md:grid-cols-2" : ""}`}>
        {images.map((img) =>
          images.length > 1 ? (
            // Pairs share a 4:3 frame (like the other project images) so they line up side by side
            <div key={img.src.src} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className={img.cover ? "object-cover" : "object-contain p-3"}
              />
            </div>
          ) : (
            <div key={img.src.src} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <Image src={img.src} alt={img.alt} className="h-auto w-full" />
            </div>
          ),
        )}
      </div>
      <figcaption className="mt-3 text-sm text-grey">{caption}</figcaption>
    </figure>
  )
}

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
      "I designed a QR code that links to this portfolio site in SolidWorks and 3D printed it in two colors, with black code on a white base so it scans reliably. I made a framed version and a slimmer card version, so I can carry one around and let people pull up my work on their phone.",
    image: qrCodePhoto,
  },
]

export function TechnicalSlide() {
  return (
    <Slide
      id="technical"
      index={2}
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

        <div className="flex flex-col gap-4 md:gap-5">
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

          {/* AI Integration Card */}
          <Card className="flex flex-1 flex-col">
            <div className="flex items-start gap-4">
              <IconBadge>
                <Sparkles className="size-5" />
              </IconBadge>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-ink">
                  AI Integration
                </h3>
                <p className="mt-1 text-sm text-grey">
                  How I use AI alongside CAD to research, plan, and iterate on my engineering projects faster
                </p>
                <ul className="mt-3 flex flex-col gap-3">
                  <li>
                    {/* Relative URL (same as the "Open the interactive model" link below) so it works under the GitHub Pages base path */}
                    <a
                      href="gimbal-v2-viewer.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full rounded-xl border border-border bg-beige/60 p-4 transition-colors hover:border-ink hover:bg-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
                    >
                      <p className="font-medium text-ink">High Power Rocketry Club AI Integration</p>
                      <p className="mt-1 text-sm text-grey">Opens the interactive 3D Gimbal v2 model in a new tab</p>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#scan-to-cad"
                      className="block h-full rounded-xl border border-border bg-beige/60 p-4 transition-colors hover:border-ink hover:bg-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
                    >
                      <p className="font-medium text-ink">Scan-to-CAD: FSAE Exhaust Header</p>
                      <p className="mt-1 text-sm text-grey">Turning a 3D scan into an editable SolidWorks model with Claude</p>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
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
                    <Image src={project.image} alt={project.alt ?? project.title} fill className="object-cover" />
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

          {/* Interactive Gimbal v2 model (static file in /public; relative URL so it works under a GitHub Pages base path) */}
          <div id="gimbal-viewer" className="mt-12 scroll-mt-32">
            <h3 className="font-display text-xl font-semibold text-ink">Interactive Gimbal v2 Model</h3>
            <p className="mt-2 text-grey">
              Drag to orbit, scroll to zoom, and use the sliders to move the motors, tilt the board, spin the yaw platter, or explode the assembly.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border shadow-sm">
              <iframe
                src="gimbal-v2-viewer.html"
                title="Interactive 3D model of the Gimbal v2 assembly"
                loading="lazy"
                className="h-[640px] w-full bg-[#101317] md:h-[720px]"
              />
            </div>
            <a
              href="gimbal-v2-viewer.html"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-medium text-ink underline underline-offset-4 hover:text-grey"
            >
              Open the interactive model in its own tab
            </a>
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
                    <Image src={project.image} alt={project.alt ?? project.title} fill className="object-cover" />
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

        {/* AI Integration Section */}
        <section id="ai-integration" className="scroll-mt-32">
          <h2 className="font-display text-3xl font-semibold text-ink">AI Integration</h2>

          <article id="scan-to-cad" className="mt-8 flex scroll-mt-32 flex-col gap-10">
            <div className="max-w-3xl">
              <h3 className="font-display text-xl font-semibold text-ink">
                Scan-to-CAD: AI-Assisted Design of an FSAE Exhaust Header
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tools and topics">
                {scanToCadTags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-border bg-beige-cream px-3 py-1 text-sm text-ink"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-grey">
                Our FSAE team&apos;s custom exhaust header has an irregular bend with no constant radius and an uneven
                3-bolt flange, so it couldn&apos;t be drawn accurately with simple lines and arcs. I 3D-scanned the real
                pipe, took caliper measurements (38.9 mm OD, 37.4 mm ID), and used Claude, connected directly to
                SolidWorks on my laptop, to turn the scan into a clean, editable CAD model my team can use in assemblies.
              </p>
            </div>

            <ScanToCadFigure {...scanToCadRows[0]} />

            <div className="max-w-3xl">
              <h4 className="font-display text-lg font-semibold text-ink">How I used AI</h4>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-grey marker:text-ink/40">
                {scanToCadSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>

            <ScanToCadFigure {...scanToCadRows[1]} />
            <ScanToCadFigure {...scanToCadRows[2]} />

            <div>
              <h4 className="font-display text-lg font-semibold text-ink">Result</h4>
              <div className="mt-3">
                <ScanToCadFigure
                  images={[
                    {
                      src: scan2cadDeviationMap,
                      alt: "Deviation map of the scan against the finished model in front and side views, colored from blue (0 mm) to red (3 mm); most of the pipe and flange are blue to green.",
                    },
                  ]}
                  caption="Scan vs. model: median error 0.36 mm, with 95% of the scan within 2 mm."
                />
              </div>
            </div>

            <p className="max-w-3xl font-medium text-ink">
              AI handled the tedious geometry extraction and modeling. I made the design decisions and checked every
              number against real measurements.
            </p>
          </article>
        </section>
      </div>
    </Slide>
  )
}