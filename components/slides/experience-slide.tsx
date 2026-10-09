import { Cog, Rocket, Timer, Users } from "lucide-react"
import { Card, IconBadge, Slide } from "./slide"

const roles = [
  {
    icon: Cog,
    organization: "Formula SAE",
    role: "Drivetrain Subteam — Member",
    description:
      "Part of the Drivetrain subteam, contributing to the design and build of the team's competition vehicle.",
  },
  {
    icon: Rocket,
    organization: "High Power Rocketry Club",
    role: "Rocket Mechanisms / Avionics Team — Member",
    description:
      "Working on the rocket mechanisms and avionics side of the club's high power rocketry projects.",
  },
  {
    icon: Timer,
    organization: "Worcester Polytechnic Institute",
    role: "Varsity Track and Field — Athlete",
    description:
      "Competing at the varsity level while balancing a mechanical engineering course load.",
  },
]

export function ExperienceSlide() {
  return (
    <Slide
      id="experience"
      index={2}
      eyebrow="Experience & Job History"
      title="Where I've been building"
      description="My background spans engineering teams and varsity athletics, with leadership running through all of it."
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {roles.map((item) => (
          <Card key={item.organization + item.role} className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <IconBadge>
                <item.icon className="size-5" />
              </IconBadge>
              <div>
                <h3 className="font-display text-xl font-semibold text-ink">
                  {item.organization}
                </h3>
                <p className="mt-1 text-sm font-medium text-blue-strong">
                  {item.role}
                </p>
              </div>
            </div>
            <p className="text-pretty leading-relaxed text-grey">
              {item.description}
            </p>
          </Card>
        ))}

        <Card className="flex flex-col gap-4 border-ink bg-ink text-beige-cream">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue text-ink"
            >
              <Users className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-xl font-semibold">Leadership</h3>
              <p className="mt-1 text-sm font-medium text-blue">
                Across teams & athletics
              </p>
            </div>
          </div>
          <p className="text-pretty leading-relaxed text-beige-cream/75">
            Experienced in leadership — bringing the same drive to engineering
            teams that I bring to competition on the track.
          </p>
        </Card>
      </div>
    </Slide>
  )
}
