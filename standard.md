# Standards

## Naming conventions
- `kebab-case` - for all folders/files.
- `PascalCase` - for classes and types.
- `snake_case` - for database tables and columns.
- `camelCase` - for functions, zod schemas and etc.

---

## SOLID Principles in an Express.js Codebase

- Single Responsibility Principle (SRP)
    - A function should do one thing and do it well.
- Open/Closed Principle (OCP)
    - Code should be open for extension but closed for modification.
        - In functional programming, we can achieve this by using higher-order functions instead of modifying existing functions.
- Liskov Substitution Principle (LSP)
    - Functions should be replaceable without breaking the system.
- Interface Segregation Principle (ISP)
    - Functions should only expose what they need.

## linting and formatting 
- Always run `npm run biome` (not necessarily after every change, but always before pushing to GitHub).
    - This ensures you catch errors early before GitHub Actions run.