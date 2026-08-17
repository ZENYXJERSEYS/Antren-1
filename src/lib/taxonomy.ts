/**
 * Antren taxonomy — single source of truth shared by the frontend and the
 * Categories are the primary opportunity types; DOMAINS are
 * the interest sub-fields students pick on their profile.
 */

export type Category = {
  slug: string;
  label: string;
  emoji: string;
  /** Sub-fields shown when choosing interests on a profile. */
  subfields: string[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "volunteering",
    label: "Volunteering",
    emoji: "🤝",
    subfields: [
      "Community Service",
      "Environment",
      "Teaching & Mentoring",
      "Health Outreach",
      "Disaster Relief",
      "Animal Welfare",
      "Refugee Support",
      "Food Security",
      "Education Equity",
    ],
  },
  {
    slug: "internships",
    label: "Internships",
    emoji: "💼",
    subfields: [
      "Software Engineering",
      "Data Science",
      "Research",
      "Finance",
      "Marketing",
      "Design",
      "Product",
      "Government",
      "Nonprofit",
      "Business Operations",
      "Startup",
    ],
  },
  {
    slug: "competitions",
    label: "Competitions",
    emoji: "🏆",
    subfields: [
      "Hackathons",
      "Science Fairs",
      "Math Olympiads",
      "Debate",
      "Robotics",
      "Writing",
      "Business Case",
      "Design",
      "Music",
      "Chess",
      "Coding",
    ],
  },
  {
    slug: "jobs",
    label: "Jobs",
    emoji: "🧭",
    subfields: ["Part-Time", "Remote", "On-Campus", "Seasonal", "Entry-Level"],
  },
  {
    slug: "summer-programs",
    label: "Summer Programs",
    emoji: "☀️",
    subfields: [
      "Pre-College",
      "STEM Camps",
      "Arts Intensives",
      "Language Immersion",
      "Research Apprenticeships",
      "Leadership Academies",
    ],
  },
  {
    slug: "scholarships",
    label: "Scholarships",
    emoji: "🎓",
    subfields: [
      "Merit",
      "Need-Based",
      "STEM",
      "Arts",
      "First-Generation",
      "International",
      "Local",
    ],
  },
  {
    slug: "fellowships",
    label: "Fellowships",
    emoji: "✨",
    subfields: [
      "Research",
      "Public Policy",
      "Social Innovation",
      "Journalism",
      "Entrepreneurship",
      "Global",
    ],
  },
  {
    slug: "events-conferences",
    label: "Student Events & Conferences",
    emoji: "🎤",
    subfields: [
      "Tech Conferences",
      "Academic Symposia",
      "Career Fairs",
      "Model UN",
      "Leadership Summits",
      "Cultural Festivals",
    ],
  },
  {
    slug: "research-programs",
    label: "Research Programs",
    emoji: "🔬",
    subfields: [
      "Lab Research",
      "Field Research",
      "Literature Review",
      "Data Analysis",
      "Mentored Research",
      "Clinical Trials",
    ],
  },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);

/**
 * Interest domains (the big taxonomy from the spec). Students pick these on
 * their profile; opportunities carry a subset as `subFields`.
 */
export const DOMAINS: { slug: string; label: string; fields: string[] }[] = [
  {
    slug: "cs",
    label: "Computer Science",
    fields: [
      "AI",
      "Machine Learning",
      "Web Dev",
      "Mobile Dev",
      "Game Dev",
      "Cybersecurity",
      "Cloud Computing",
      "Data Science",
      "DevOps",
      "Blockchain",
      "AR/VR",
      "IoT",
      "Computer Vision",
      "NLP",
      "Quantum Computing",
    ],
  },
  {
    slug: "engineering",
    label: "Engineering",
    fields: [
      "Mechanical",
      "Electrical",
      "Civil",
      "Aerospace",
      "Chemical",
      "Biomedical",
      "Materials Science",
      "Industrial",
      "Environmental",
      "Software",
      "Nuclear",
      "Robotics",
      "Automotive",
      "Structural",
    ],
  },
  {
    slug: "math",
    label: "Math",
    fields: [
      "Calculus",
      "Linear Algebra",
      "Statistics",
      "Discrete Math",
      "Number Theory",
      "Topology",
      "Geometry",
      "Combinatorics",
      "Game Theory",
      "Cryptography",
      "Probability",
      "Differential Equations",
      "Mathematical Modeling",
      "Logic",
    ],
  },
  {
    slug: "physics",
    label: "Physics",
    fields: [
      "Quantum Physics",
      "Astrophysics",
      "Particle Physics",
      "Theoretical",
      "Condensed Matter",
      "Optics",
      "Plasma",
      "Cosmology",
      "Nuclear",
      "Fluid Dynamics",
      "Mechanics",
      "Thermodynamics",
      "Electromagnetism",
      "Relativity",
    ],
  },
  {
    slug: "biology",
    label: "Biology",
    fields: [
      "Genetics",
      "Microbiology",
      "Ecology",
      "Neuroscience",
      "Bioinformatics",
      "Marine Biology",
      "Zoology",
      "Botany",
      "Cell Biology",
      "Molecular Biology",
      "Evolutionary Biology",
      "Immunology",
      "Physiology",
      "Biochemistry",
    ],
  },
  {
    slug: "chemistry",
    label: "Chemistry",
    fields: [
      "Organic",
      "Inorganic",
      "Physical",
      "Analytical",
      "Polymer",
      "Nuclear",
      "Computational",
      "Materials",
      "Spectroscopy",
      "Electrochemistry",
      "Quantum",
      "Green",
    ],
  },
  {
    slug: "health",
    label: "Health & Medicine",
    fields: [
      "Pre-Med",
      "Public Health",
      "Mental Health",
      "Nutrition",
      "Sports Medicine",
      "Epidemiology",
      "Healthcare Policy",
      "Global Health",
      "Medical Devices",
      "Healthcare AI",
      "Nursing",
      "Dentistry",
      "Pharmacy",
      "Surgery",
    ],
  },
  {
    slug: "business",
    label: "Business",
    fields: [
      "Marketing",
      "Finance",
      "Entrepreneurship",
      "Management",
      "Operations",
      "Strategy",
      "Consulting",
      "Investment Banking",
      "Venture Capital",
      "Real Estate",
      "Supply Chain",
      "Sales",
      "Accounting",
      "Economics",
    ],
  },
  {
    slug: "startups",
    label: "Startups",
    fields: [
      "Founding",
      "MVP",
      "Product-Market Fit",
      "Fundraising",
      "Pitching",
      "Hackathons",
      "Accelerators",
      "Incubators",
      "EdTech",
      "FinTech",
      "HealthTech",
      "ClimateTech",
      "Consumer",
      "B2B SaaS",
    ],
  },
  {
    slug: "design",
    label: "Design",
    fields: [
      "UX/UI",
      "Graphic Design",
      "Product Design",
      "Industrial",
      "Web Design",
      "Game Design",
      "Illustration",
      "Typography",
      "Motion",
      "Brand",
      "Architecture",
      "Interior",
      "Fashion",
    ],
  },
  {
    slug: "writing",
    label: "Writing",
    fields: [
      "Journalism",
      "Creative Writing",
      "Poetry",
      "Fiction",
      "Non-Fiction",
      "Screenwriting",
      "Copywriting",
      "Technical Writing",
      "Blogging",
      "Essays",
      "Sci-Fi/Fantasy",
      "Memoir",
      "Editorial",
    ],
  },
  {
    slug: "music",
    label: "Music",
    fields: [
      "Composition",
      "Performance",
      "Production",
      "Music Theory",
      "Vocals",
      "Instrumental",
      "Electronic",
      "Classical",
      "Jazz",
      "Rock/Pop",
      "Hip-Hop",
      "DJing",
      "Songwriting",
    ],
  },
  {
    slug: "art",
    label: "Art",
    fields: [
      "Drawing",
      "Painting",
      "Sculpture",
      "Photography",
      "Digital Art",
      "Animation",
      "Printmaking",
      "Ceramics",
      "Mixed Media",
      "Street Art",
      "Concept Art",
      "Performance Art",
      "Art History",
    ],
  },
  {
    slug: "research",
    label: "Research",
    fields: [
      "Lab Research",
      "Field Research",
      "Literature Review",
      "Data Analysis",
      "Survey Design",
      "Qualitative",
      "Quantitative",
      "Clinical Trials",
      "Independent Study",
      "Mentored Research",
    ],
  },
  {
    slug: "social-impact",
    label: "Social Impact",
    fields: [
      "Climate",
      "Environment",
      "Education Equity",
      "Mental Health Advocacy",
      "Human Rights",
      "Refugees",
      "Disability Advocacy",
      "Food Security",
      "Housing",
      "LGBTQ+ Rights",
      "Racial Justice",
      "Voting Rights",
      "Animal Welfare",
      "Sustainable Development",
    ],
  },
];

export const DOMAIN_MAP: Record<string, { slug: string; label: string; fields: string[] }> =
  Object.fromEntries(DOMAINS.map((d) => [d.slug, d]));

export const GRADES = [
  { value: "9", label: "9th Grade" },
  { value: "10", label: "10th Grade" },
  { value: "11", label: "11th Grade" },
  { value: "12", label: "12th Grade" },
  { value: "college", label: "College" },
  { value: "other", label: "Other" },
];

export const GRADE_LABEL: Record<string, string> = Object.fromEntries(
  GRADES.map((g) => [g.value, g.label]),
);

/** Grade slugs an opportunity is open to. */
export const ALL_GRADES = ["9", "10", "11", "12", "college"];

export const COUNTRIES = [
  "Global",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Switzerland",
  "Singapore",
  "India",
  "Japan",
  "South Korea",
  "China",
  "Brazil",
  "Mexico",
  "Nigeria",
  "Kenya",
  "South Africa",
  "Egypt",
  "United Arab Emirates",
  "Saudi Arabia",
  "Israel",
  "Turkey",
  "Spain",
  "Italy",
  "Portugal",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "Ireland",
  "Belgium",
  "Austria",
  "Greece",
  "New Zealand",
  "Indonesia",
  "Malaysia",
  "Thailand",
  "Vietnam",
  "Philippines",
  "Pakistan",
  "Bangladesh",
  "Argentina",
  "Chile",
  "Colombia",
  "Peru",
  "Ghana",
  "Ethiopia",
  "Morocco",
  "Ukraine",
  "Czechia",
  "Romania",
  "Hungary",
] as const;

export type ThemeName = "light" | "dark" | "espresso" | "custom";

export const THEMES: { value: ThemeName; label: string; description: string }[] = [
  { value: "light", label: "Light", description: "Cream surfaces, espresso ink" },
  { value: "dark", label: "Dark", description: "Deep neutral night mode" },
  { value: "espresso", label: "Espresso-Fresh", description: "Cocoa depth, emerald actions" },
  { value: "custom", label: "Custom Accent", description: "Your color, your contrast" },
];

/**
 * Curated accent swatches for the custom-accent theme. Each comes with a
 * foreground that is guaranteed to pass WCAG AA against it on light and dark
 * surfaces respectively.
 */
export const ACCENTS: {
  name: string;
  color: string; // primary action color
  lightOn: string; // readable foreground when used as a filled button (light mode)
  darkOn: string; // readable foreground when used as a filled button (dark mode)
}[] = [
  { name: "Emerald", color: "#10B981", lightOn: "#03281b", darkOn: "#02261a" },
  { name: "Forest", color: "#2F855A", lightOn: "#f0fdf4", darkOn: "#04180e" },
  { name: "Sapphire", color: "#2B6CB0", lightOn: "#f0f9ff", darkOn: "#04141f" },
  { name: "Violet", color: "#7C5CD6", lightOn: "#faf5ff", darkOn: "#120a24" },
  { name: "Rose", color: "#D6456B", lightOn: "#fff5f7", darkOn: "#22060f" },
  { name: "Amber", color: "#D97706", lightOn: "#1c1000", darkOn: "#1f1200" },
  { name: "Terracotta", color: "#C2623E", lightOn: "#fff7f0", darkOn: "#200b04" },
  { name: "Slate", color: "#475569", lightOn: "#f8fafc", darkOn: "#060a12" },
];

export const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  github: "GitHub",
  twitter: "X / Twitter",
  email: "Gmail handle",
};

export const PIPELINE_STAGES = [
  { value: "saved", label: "Saved", emoji: "🔖" },
  { value: "researching", label: "Researching", emoji: "🔍" },
  { value: "drafted", label: "Application Drafted", emoji: "📝" },
  { value: "submitted", label: "Submitted", emoji: "📨" },
  { value: "interview", label: "Interview", emoji: "🎙️" },
  { value: "accepted", label: "Accepted", emoji: "🎉" },
] as const;

export const REJECTED_STAGE = { value: "rejected", label: "Rejected", emoji: "💔" } as const;

export const OPPORTUNITY_SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "deadline", label: "Deadline" },
  { value: "newest", label: "Newest" },
  { value: "relevance", label: "Most Relevant" },
] as const;
