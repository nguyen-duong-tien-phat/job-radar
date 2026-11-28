// Skill dictionary: canonical name -> aliases matched in lowercase, accent-free text.
// The canonical name is matched too, except names that are also common English words.
const SKILLS: Record<string, string[]> = {
  JavaScript: ["js", "es6"],
  TypeScript: ["ts"],
  "Node.js": ["nodejs", "node"],
  React: ["reactjs", "react.js"],
  "React Native": [],
  "Next.js": ["nextjs"],
  Vue: ["vuejs", "vue.js"],
  Nuxt: ["nuxtjs"],
  Angular: ["angularjs"],
  Svelte: [],
  HTML: ["html5"],
  CSS: ["css3"],
  Tailwind: ["tailwindcss"],
  Redux: [],
  GraphQL: [],
  "REST API": ["restful", "rest api", "rest apis"],
  gRPC: [],
  NestJS: ["nest.js"],
  Express: ["expressjs", "express.js"],
  Python: [],
  Django: [],
  Flask: [],
  FastAPI: [],
  Java: [],
  Spring: ["spring boot", "springboot"],
  Kotlin: [],
  Swift: [],
  "Objective-C": [],
  Flutter: [],
  Dart: [],
  Go: ["golang"],
  Rust: [],
  "C++": ["cpp"],
  "C#": ["csharp"],
  ".NET": ["dotnet", "asp.net", ".net core"],
  PHP: [],
  Laravel: [],
  Ruby: [],
  Rails: ["ruby on rails"],
  Scala: [],
  Elixir: [],
  SQL: [],
  PostgreSQL: ["postgres"],
  MySQL: [],
  "SQL Server": ["mssql"],
  Oracle: [],
  MongoDB: ["mongo"],
  Redis: [],
  Elasticsearch: ["elastic search"],
  Kafka: [],
  RabbitMQ: [],
  Docker: [],
  Kubernetes: ["k8s"],
  Terraform: [],
  Ansible: [],
  AWS: ["amazon web services"],
  GCP: ["google cloud"],
  Azure: [],
  Linux: [],
  "CI/CD": ["ci/cd", "cicd"],
  Jenkins: [],
  "GitHub Actions": [],
  GitLab: [],
  Git: [],
  Microservices: ["microservice"],
  Spark: ["pyspark", "apache spark"],
  Airflow: [],
  Pandas: [],
  "Machine Learning": ["ml"],
  PyTorch: [],
  TensorFlow: [],
  LLM: ["llms"],
  Selenium: [],
  Playwright: [],
  Cypress: [],
  Jest: [],
  Figma: [],
  Android: [],
  iOS: [],
  Unity: ["unity3d", "unity engine"],
  Solidity: [],
  Blockchain: [],
};

/** Lowercase, strip Vietnamese accents (đ -> d) so aliases match either spelling. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

const NAME_NOT_MATCHED = new Set(["Go", "Express", "Unity"]);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/#]/g, "\\$&");

// A term must not touch letters/digits/+/# on either side ("java" not in "javascript", "c" not in "c++"),
// nor follow a dot ("js" not in "node.js").
const PATTERNS = Object.entries(SKILLS).map(([name, aliases]) => {
  const terms = [...(NAME_NOT_MATCHED.has(name) ? [] : [name]), ...aliases].map((t) => escape(fold(t)));
  return { name, re: new RegExp(`(?<![a-z0-9+#.])(?:${terms.join("|")})(?![a-z0-9+#])`) };
});

export function extractSkills(text: string): string[] {
  const t = fold(text);
  return PATTERNS.filter((p) => p.re.test(t)).map((p) => p.name);
}
