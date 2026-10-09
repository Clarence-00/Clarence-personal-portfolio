import { Box, Hammer, Layers, LineChart, Wrench } from "lucide-react"
import { Card, IconBadge, Slide } from "./slide"

const skills = [
  {
    icon: Layers,
    title: "3D Printing Workflows",
    description: "Taking designs from model to printed part.",
  },
  {
    icon: LineChart,
    title: "Simulations",
    description: "Using simulation to evaluate designs before they're built.",
  },
  {
    icon: Hammer,
    title: "Hands-on Fabrication",
    description: "Building and assembling parts in the shop.",
  },
]

const teams = [
  { name: "Formula SAE", detail: "Drivetrain subteam" },
  { name: "High Power Rocketry Club", detail: "Rocket mechanisms / avionics team" },
]

export function TechnicalSlide() {
  return (
    <Slide
      id="technical"
      index={3}
      eyebrow="Technical & Engineering"
      title="Design, model, build"
      description="The tools and workflows I use to turn ideas into working hardware."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-5">
        <Card className="flex flex-col justify-between gap-6 md:col-span-2">
          <div className="flex items-start gap-4">
            <IconBadge tone="ink">
              <Box className="size-5" />
            </IconBadge>
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">
                CAD Modeling
              </h3>
              <p className="mt-2 max-w-md text-pretty leading-relaxed text-grey">
                My core design skill — modeling parts and assemblies digitally
                before they move on to printing, simulation, and fabrication.
              </p>
            </div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3" aria-label="Design workflow">
            {["Model", "Simulate", "Fabricate"].map((step, i) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-xl bg-beige px-4 py-3"
              >
                <span className="font-display text-sm text-blue-strong">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-medium text-ink">{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        {skills.slice(0, 2).map((skill) => (
          <SkillCard key={skill.title} {...skill} />
        ))}

        <SkillCard {...skills[2]} />

        <Card className="md:col-span-2 lg:col-span-3">
          <div className="flex items-start gap-4">
            <IconBadge>
              <Wrench className="size-5" />
            </IconBadge>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold text-ink">
                Engineering Team Involvement
              </h3>
              <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-3">
                {teams.map((team) => (
                  <li
                    key={team.name}
                    className="flex-1 rounded-xl border border-border bg-beige/60 px-4 py-3"
                  >
                    <p className="font-medium text-ink">{team.name}</p>
                    <p className="text-sm text-grey">{team.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Slide>
  )
}

function SkillCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <IconBadge>
          <Icon className="size-5" />
        </IconBadge>
        <h3 className="text-balance font-display text-lg font-semibold leading-snug text-ink">
          {title}
        </h3>
      </div>
      <p className="text-pretty text-sm leading-relaxed text-grey">
        {description}
      </p>
    </Card>
  )
}
