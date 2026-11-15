// Everything the "Ask about me" chat knows about.
//
// To add a new section to the chat:
//   1. Make sure the section on the page has an id, e.g. <section id="my-project" className="scroll-mt-32">
//   2. Add an entry to the `sections` array below with that id as `anchor`.
//   3. List words a visitor might type in `keywords` (single words or short phrases).
// Matching runs entirely in the visitor's browser: no API, no key, no cost.

export type SiteSection = {
  /** Unique id for this entry (used internally). */
  id: string
  /** Page route, e.g. "/technical". Must match a page in lib/profile.ts. */
  page: string
  /** The element id on that page to scroll to. Leave out to jump to the top of the page. */
  anchor?: string
  /** Button label shown in the chat. */
  title: string
  /** One-line description shown under the button. */
  summary: string
  /** Words and short phrases a visitor might type. */
  keywords: string[]
}

export const sections: SiteSection[] = [
  // ---------- Introduction (/) ----------
  {
    id: "about",
    page: "/",
    title: "About Clarence",
    summary:
      "Varsity track athlete pursuing a B.S. in Mechanical Engineering at WPI (Class of 2029), interested in AI, CAD, and manufacturing.",
    keywords: [
      "about", "bio", "introduction", "intro", "background", "yourself", "himself",
      "student", "school", "college", "university", "wpi", "worcester", "polytechnic",
      "bachelor", "bs", "degree", "class of 2029", "2029", "graduate", "graduation",
      "year", "study", "major", "education", "mechanical engineering", "engineer",
      "ai", "artificial intelligence", "manufacturing", "machining", "machine shop",
      "cad", "solidworks", "onshape", "coding", "software", "web", "portfolio", "website",
    ],
  },
  {
    id: "resume",
    page: "/",
    anchor: "resume",
    title: "Resume",
    summary: "View or download Clarence's resume as a PDF.",
    keywords: [
      "resume", "cv", "curriculum vitae", "pdf", "download", "qualifications",
      "skills", "credentials", "hire", "hiring",
    ],
  },

  // ---------- Technical (/technical) ----------
  {
    id: "technical",
    page: "/technical",
    title: "Projects & Engineering",
    summary: "Overview of engineering team involvement and technical projects.",
    keywords: [
      "technical", "projects", "project", "engineering", "build", "built", "design",
      "team", "teams", "club", "clubs", "hands on",
    ],
  },
  {
    id: "hprc",
    page: "/technical",
    anchor: "hprc",
    title: "High Power Rocketry Club",
    summary:
      "Experimental GNC hardware: a two-axis gimbal for the flight computer, driven by stepper motors and fitted into the rocket airframe.",
    keywords: [
      "rocket", "rockets", "rocketry", "high power rocketry", "hprc", "gnc",
      "guidance", "navigation", "control", "gimbal", "gimball", "avionics",
      "flight computer", "stepper", "stepper motor", "motors", "linkage", "airframe",
      "airbrakes", "exploded view", "electronics", "launch", "aerospace", "mechanism",
      "hardware",
    ],
  },
  {
    id: "gimbal-viewer",
    page: "/technical",
    anchor: "gimbal-viewer",
    title: "Interactive Gimbal v2 Model",
    summary:
      "A 3D model you can orbit, zoom, and explode, with sliders to move the motors and tilt the board.",
    keywords: [
      "gimbal", "gimball", "gimbal v2", "interactive", "3d model", "model", "viewer",
      "orbit", "rotate", "explode", "exploded", "animation", "demo",
    ],
  },
  {
    id: "hprc-ai",
    page: "/technical",
    anchor: "hprc-ai",
    title: "High Power Rocketry Club AI Integration",
    summary:
      "A sample servo-driven turntable designed with Claude in SolidWorks, a test case for the airbrakes and gimbal.",
    keywords: [
      "ai", "artificial intelligence", "claude", "llm", "rocketry", "rocket", "hprc",
      "turntable", "servo", "servo horn", "platter", "solidworks", "cad", "airbrakes",
      "ai design", "ai integration",
    ],
  },
  {
    id: "fsae",
    page: "/technical",
    anchor: "fsae",
    title: "Formula SAE",
    summary:
      "Drivetrain subteam and Exhaust Lead: exhaust routing, header, muffler, sensor mount, and a 3D scan of the header.",
    keywords: [
      "formula", "formula sae", "fsae", "sae", "race", "racing", "race car", "car",
      "vehicle", "automotive", "drivetrain", "exhaust", "exhaust lead", "muffler",
      "header", "engine", "chassis", "routing", "sensor", "o2 sensor", "3d scan",
      "scan", "scanning", "flange", "fabrication", "motorsport", "team photo",
    ],
  },
  {
    id: "fsae-ai",
    page: "/technical",
    anchor: "fsae-ai",
    title: "Formula SAE AI Integration",
    summary:
      "Using AI alongside SolidWorks to place the O2 sensor port and plan the exhaust assembly.",
    keywords: [
      "ai", "artificial intelligence", "llm", "formula", "fsae", "exhaust", "o2",
      "o2 sensor", "sensor port", "weld bung", "bung", "pipe routing", "muffler",
      "solidworks", "cad", "ai design", "ai integration",
    ],
  },
  {
    id: "3d-printing",
    page: "/technical",
    anchor: "3d-printing",
    title: "3D Printing Workflows",
    summary:
      "A custom phone stand and a two-color 3D printed QR code that links to this site.",
    keywords: [
      "3d", "3d printing", "3d print", "printing", "printer", "print", "printed",
      "additive", "additive manufacturing", "slicing", "slicer", "filament",
      "prototype", "prototyping", "phone stand", "stand", "qr", "qr code",
    ],
  },

  // ---------- Experience (/experience) ----------
  {
    id: "experience",
    page: "/experience",
    title: "Work Experience & Leadership",
    summary: "Jobs, coaching, and volunteer roles.",
    keywords: [
      "experience", "work", "job", "jobs", "employment", "employer", "career",
      "history", "leadership", "worked", "position", "positions", "role", "roles",
    ],
  },
  {
    id: "woodland",
    page: "/experience",
    anchor: "woodland",
    title: "Woodland Golf Club: Head Swim & Dive Coach",
    summary:
      "Coached 20+ divers to 1st place in the diving division, and received the Price Meropol McMahon Award.",
    keywords: [
      "woodland", "golf", "golf club", "coach", "coaching", "head coach", "swim",
      "swimming", "dive", "diving", "divers", "athletes", "training", "leadership",
      "manage", "mentor", "award", "awards", "scholarship", "honor", "1st place",
      "first place", "champion", "championship", "win", "won",
    ],
  },
  {
    id: "jcc",
    page: "/experience",
    anchor: "jcc",
    title: "JCC Greater Boston: Lifeguard & Swim Instructor",
    summary:
      "Kept the pool safe, supervised swimmers of all ages, and taught swim lessons.",
    keywords: [
      "jcc", "boston", "greater boston", "lifeguard", "lifeguarding", "safety",
      "pool", "swim", "swimming", "instructor", "lessons", "teach", "teaching",
      "kids", "children", "first aid", "cpr",
    ],
  },
  {
    id: "dunkin",
    page: "/experience",
    anchor: "dunkin",
    title: "Dunkin' Donuts: Crew Member",
    summary:
      "Fast, friendly customer service and order management in a high-paced team.",
    keywords: [
      "dunkin", "dunkin donuts", "donuts", "coffee", "crew", "crew member",
      "customer service", "customers", "restaurant", "food", "retail", "cashier",
      "service",
    ],
  },
  {
    id: "jfcs",
    page: "/experience",
    anchor: "jfcs",
    title: "JFCS: Community Travel Volunteer",
    summary:
      "Supported community initiatives, travel logistics, and volunteer coordination.",
    keywords: [
      "jfcs", "jewish family", "children's service", "volunteer", "volunteering",
      "community", "community service", "travel", "logistics", "nonprofit",
      "charity", "helping",
    ],
  },

  // ---------- Interests (/interests) ----------
  {
    id: "interests",
    page: "/interests",
    title: "Interests & Activities",
    summary: "Track and field, springboard diving, basketball, and guitar.",
    keywords: [
      "interests", "hobbies", "hobby", "free time", "fun", "activities",
      "athletics", "athlete", "sports", "sport", "track", "track and field",
      "varsity", "running", "springboard", "diving", "basketball", "guitar",
      "music", "instrument",
    ],
  },

  // ---------- Contact (/contact) ----------
  {
    id: "contact",
    page: "/contact",
    title: "Contact & Connect",
    summary: "LinkedIn, Handshake, email, phone, and a message form.",
    keywords: [
      "contact", "connect", "reach", "reach out", "email", "mail", "phone",
      "call", "text", "message", "linkedin", "handshake", "network", "networking",
      "get in touch", "talk",
    ],
  },
]

/** Questions shown as buttons when the chat is empty. */
export const suggestedQuestions = [
  "What did he build for Formula SAE?",
  "Is he on a rocketry team?",
  "Has he coached anyone?",
  "Where's his resume?",
  "How can I contact him?",
]

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "with", "by",
  "is", "are", "was", "were", "be", "been", "am", "do", "does", "did", "done",
  "has", "have", "had", "can", "could", "would", "should", "will", "may", "might",
  "i", "me", "my", "you", "your", "he", "him", "his", "she", "her", "they", "them",
  "their", "we", "us", "our", "it", "its", "this", "that", "these", "those", "there",
  "what", "which", "who", "whom", "where", "when", "why", "how", "any", "anyone",
  "anything", "some", "someone", "something", "ever", "much", "many", "more", "very",
  "tell", "show", "see", "know", "find", "get", "like", "please", "want", "need",
  "clarence", "de", "medeiros", "hi", "hello", "hey", "so", "if", "just", "also",
  "out", "up", "into", "from", "as", "not", "no", "yes", "lot", "lots",
])

// A visitor's word on the left also counts as the words on the right.
const SYNONYMS: Record<string, string[]> = {
  coach: ["coach", "instructor", "teach", "mentor"],
  coached: ["coach", "instructor", "teach"],
  teach: ["teach", "instructor", "coach"],
  taught: ["teach", "instructor", "coach"],
  rocket: ["rocketry"],
  rocketry: ["rocket"],
  car: ["fsae", "vehicle"],
  cars: ["fsae", "vehicle"],
  racecar: ["race", "car", "fsae"],
  automobile: ["car", "vehicle"],
  cv: ["resume"],
  "résumé": ["resume"],
  email: ["contact"],
  reach: ["contact"],
  hire: ["resume", "contact"],
  job: ["experience", "work"],
  jobs: ["experience", "work"],
  employed: ["experience", "work"],
  employment: ["experience", "work"],
  worked: ["work", "experience"],
  hobbies: ["interests"],
  hobby: ["interests"],
  sports: ["athletics"],
  sport: ["athletics"],
  play: ["sports", "guitar", "basketball"],
  plays: ["sports", "guitar", "basketball"],
  swimmer: ["swim"],
  lifeguarded: ["lifeguard"],
  printed: ["print", "3d"],
  cad: ["design"],
  school: ["education"],
  college: ["school", "education"],
  university: ["school", "education"],
  welder: ["weld"],
  donut: ["dunkin"],
  doughnut: ["dunkin"],
  volunteered: ["volunteer"],
}

/** Very light stemming so "coaching", "coached" and "coaches" all become "coach". */
export function stem(word: string): string {
  let w = word
  if (w.length <= 3) return w
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y"
  if (w.endsWith("ing") && w.length > 5) {
    w = w.slice(0, -3)
    // "swimming" -> "swimm" -> "swim"
    if (w.length > 2 && w[w.length - 1] === w[w.length - 2]) w = w.slice(0, -1)
    return w
  }
  if (w.endsWith("ed") && w.length > 4) {
    w = w.slice(0, -2)
    if (w.length > 2 && w[w.length - 1] === w[w.length - 2]) w = w.slice(0, -1)
    return w
  }
  if (/(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2)
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1)
  return w
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9é]+/)
    .filter(Boolean)
}

type Indexed = {
  section: SiteSection
  keywordTokens: Set<string>
  phrases: string[][]
  titleTokens: Set<string>
}

const index: Indexed[] = sections.map((section) => {
  const keywordTokens = new Set<string>()
  const phrases: string[][] = []
  for (const kw of section.keywords) {
    const toks = tokenize(kw).map(stem)
    toks.forEach((t) => keywordTokens.add(t))
    if (toks.length > 1) phrases.push(toks)
  }
  const titleTokens = new Set(
    tokenize(section.title)
      .filter((t) => !STOPWORDS.has(t))
      .map(stem),
  )
  return { section, keywordTokens, phrases, titleTokens }
})

/**
 * Returns up to 3 sections that best match a visitor's question,
 * best match first. Returns an empty array when nothing fits.
 */
export function matchSections(query: string, limit = 3): SiteSection[] {
  const raw = tokenize(query.slice(0, 200)).filter((t) => !STOPWORDS.has(t))
  if (raw.length === 0) return []

  const direct = raw.map(stem)
  const directSet = new Set(direct)
  // Each query word plus its synonyms.
  const expanded = raw.map((word) => {
    const extra = SYNONYMS[word] ?? SYNONYMS[stem(word)] ?? []
    return extra.map(stem)
  })

  const scored = index.map(({ section, keywordTokens, phrases, titleTokens }) => {
    let score = 0
    direct.forEach((tok, i) => {
      if (keywordTokens.has(tok)) score += 2
      else if (expanded[i].some((s) => keywordTokens.has(s))) score += 1.5
      if (titleTokens.has(tok)) score += 0.5
    })
    // Bonus when a whole multi-word phrase like "race car" appears.
    for (const phrase of phrases) {
      if (phrase.every((t) => directSet.has(t))) score += 1
    }
    return { section, score }
  })

  const ranked = scored
    .filter((s) => s.score >= 1.5)
    .sort((a, b) => b.score - a.score)
  if (ranked.length === 0) return []

  // Drop weak matches that are far behind the best one.
  const best = ranked[0].score
  return ranked
    .filter((s) => s.score >= best * 0.5)
    .slice(0, limit)
    .map((s) => s.section)
}
