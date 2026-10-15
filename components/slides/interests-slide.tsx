import { Guitar, Trophy } from "lucide-react"
import { Card, IconBadge, Slide } from "./slide"

const athletics = ["Track and Field", "Springboard Diving", "Basketball"]

export function InterestsSlide() {
  return (
    <Slide
      id="interests"
      index={4}
      eyebrow="Interests & Activities"
      title="Interests"
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <Card className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <IconBadge tone="ink">
              <Trophy className="size-5" />
            </IconBadge>
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">
                Athletics
              </h3>
            </div>
          </div>
          <ul className="flex flex-col gap-3">
            {athletics.map((sport) => (
              <li
                key={sport}
                className="flex items-center justify-between rounded-xl bg-beige px-5 py-4"
              >
                <span className="font-medium text-ink">{sport}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex items-start gap-4">
          <IconBadge>
            <Guitar className="size-5" />
          </IconBadge>
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">
              Guitar
            </h3>
            <p className="mt-1 text-pretty leading-relaxed text-grey">
              Playing the guitar is how I unwind and stay creative.
            </p>
          </div>
        </Card>
      </div>
    </Slide>
  )
}