import Image from "next/image"
import woodlandImage from "@/public/images/Experience/woodland-team.jpg"
import woodlandAwardImage from "@/public/images/Experience/woodland-award.jpg"
import { Trophy, Utensils, Waves, HeartHandshake } from "lucide-react"
import { Card, IconBadge, Slide } from "./slide"

const roles = [
  {
    id: "woodland",
    icon: Trophy,
    organization: "Woodland Golf Club",
    role: "Head Swim & Dive Coach",
    description: "Led swim and dive training programs, managed team schedules, and coached athletes to improve technique and competitive performance.",
    items: [
      {
        description: "As Head Diving Coach at Woodland Golf Club, I built and ran daily training plans for more than 20 divers, created personalized dive sheets for each athlete, and coached them on technique and competition readiness. Under my leadership, the Woodland diving team took 1st place in the diving division.",
        image: woodlandImage,
        alt: "Woodland Golf Club swim and dive team at the pool",
      },
      {
        description: "I was honored to receive the Price Meropol McMahon Award from the Woodland Golf Club Scholarship Foundation. The award was presented to me at the foundation's ceremony at the club in recognition of my commitment and contributions to the Woodland community.",
        image: woodlandAwardImage,
        alt: "Clarence receiving the Price Meropol McMahon Award at the Woodland Golf Club Scholarship Foundation ceremony",
      },
    ],
  },
  {
    id: "jcc",
    icon: Waves,
    organization: "JCC Greater Boston",
    role: "Lifeguard & Swim Instructor",
    description: "Ensured pool safety, supervised swimmers of all age groups, and taught structured swim lessons to build water confidence and skills.",
    items: [
      {
        description: "Ensured pool safety, supervised swimmers of all age groups, and taught structured swim lessons to build water confidence and skills.",
        image: null,
        alt: "JCC Greater Boston lifeguard and instruction experience",
      },
    ],
  },
  {
    id: "dunkin",
    icon: Utensils,
    organization: "Dunkin' Donuts",
    role: "Crew member",
    description: "Delivered fast, friendly customer service, managed orders efficiently in a high-paced team environment, and maintained store operations.",
    items: [
      {
        description: "Delivered fast, friendly customer service, managed orders efficiently in a high-paced team environment, and maintained store operations.",
        image: null,
        alt: "Dunkin' Donuts crew member experience",
      },
    ],
  },
  {
    id: "jfcs",
    icon: HeartHandshake,
    organization: "Jewish Family & Children’s Service",
    role: "Community travel volunteer",
    description: "Supported community initiatives and assisted with travel logistics and volunteer coordination to help individuals in need.",
    items: [
      {
        description: "Supported community initiatives and assisted with travel logistics and volunteer coordination to help individuals in need.",
        image: null,
        alt: "JFCS community travel volunteer experience",
      },
    ],
  },
]

export function ExperienceSlide() {
  return (
    <Slide
      id="experience"
      index={2}
      eyebrow="Experience & Job History"
      title="Work Experience & leadership"
    >
      {/* Top Cards (4 main roles only) */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {roles.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="group rounded-2xl transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong"
          >
            <Card className="flex h-full flex-col gap-4 transition-colors group-hover:border-ink">
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
          </a>
        ))}
      </div>

      {/* Detailed Lower Sections */}
      <div className="mt-16 flex flex-col gap-20">
        {roles.map((item) => (
          <section key={item.id} id={item.id} className="scroll-mt-32">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                {item.organization}
              </h2>
              <p className="mt-1 text-sm font-medium text-blue-strong">
                {item.role}
              </p>
            </div>

            {/* Stacked entries for each role */}
            <div className="mt-8 flex flex-col gap-10">
              {item.items.map((subItem, index) => (
                <div
                  key={index}
                  className="grid items-center gap-8 md:grid-cols-2"
                >
                  <p className="text-grey leading-relaxed">
                    {subItem.description}
                  </p>
                  {subItem.image ? (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border shadow-sm">
                      <Image
                        src={subItem.image}
                        alt={subItem.alt || item.organization}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-ink/25 bg-beige-cream text-sm text-grey">
                      Image placeholder
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Slide>
  )
}