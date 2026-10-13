/**
 * Common technology names offered as suggestions in the sponsor Technology
 * Stack input. Also used to normalize spelling — typing "nodejs" or "Node JS"
 * is saved as "Node.js" — so tags stay consistent across sponsors.
 *
 * Add to this list freely; order doesn't matter.
 */
export const TECH_SUGGESTIONS: string[] = [
  // Languages
  "JavaScript", "TypeScript", "Python", "Java", "Kotlin", "Swift",
  "Objective-C", "C", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Scala",
  "Dart", "R", "SQL", "Bash", "Elixir", "Clojure", "Perl",
  // Frontend
  "React", "Next.js", "Angular", "Vue.js", "Nuxt", "Svelte", "Redux",
  "HTML", "CSS", "Sass", "Tailwind CSS", "Webpack", "Vite",
  // Mobile
  "iOS", "Android", "React Native", "Flutter", "SwiftUI", "Jetpack Compose",
  // Backend
  "Node.js", "Express", "NestJS", "Django", "Flask", "FastAPI",
  "Spring", "Spring Boot", ".NET", "ASP.NET", "Ruby on Rails", "Laravel",
  "GraphQL", "REST", "gRPC", "Microservices",
  // Data & databases
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra",
  "DynamoDB", "Snowflake", "BigQuery", "Databricks", "Apache Spark",
  "Apache Kafka", "RabbitMQ", "Airflow", "dbt", "Pandas", "ClickHouse",
  // Cloud & DevOps
  "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Terraform",
  "Helm", "Jenkins", "GitHub Actions", "GitLab CI", "CI/CD", "Linux",
  "Serverless", "Datadog", "Prometheus", "Grafana", "Vercel", "Cloudflare",
  // AI & ML
  "AI", "Machine Learning", "Deep Learning", "LLM", "Claude", "OpenAI",
  "Codex", "LangChain", "LangGraph", "LangFuse", "PyTorch", "TensorFlow",
  "Hugging Face", "Computer Vision", "NLP", "RAG", "Vector Databases",
  // Other
  "Git", "Figma", "Unity", "Blockchain", "Cybersecurity", "Embedded",
  "IoT", "Full Stack", "Frontend", "Backend", "Mobile", "DevOps",
  "Data Engineering", "Data Science", "QA Automation", "Selenium",
  "Playwright", "Cypress", "Jest",
];
