# standards-discovery Skill Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `standards-discovery` skill from av-marketplace to av-opencode-plugins as a globally-available skill loaded via `load_appverk_skill`.

**Architecture:** Port the skill markdown to `packages/code-review/src/skills/`, wire it into the build pipeline (`copy-assets.mjs`), register it in `skill-registry`, and inject a pre-analysis step into all code-review agent/command prompts.

**Tech Stack:** TypeScript (plugin framework), Markdown (prompts/skill), Node.js (build scripts), Vitest (testing)

---

## File Structure

| File | Responsibility |
|---|---|
| `packages/code-review/src/skills/standards-discovery/SKILL.md` | The skill content — discovery workflow, output format, fallback logic |
| `packages/code-review/scripts/copy-assets.mjs` | Copies `src/skills/` → `dist/skills/` at build time |
| `packages/skill-registry/src/index.ts` | Adds `code-review/dist/skills` to scanned skill directories |
| `packages/code-review/src/agents/{5}.md` | Agent prompts — load skill before analysis |
| `packages/code-review/src/commands/{4}.md` | Command templates — load skill before analysis |
| `packages/code-review/tests/build-output.test.ts` | Verifies `dist/skills/standards-discovery/SKILL.md` exists after build |
| `README.md` | Lists `standards-discovery` in available skills |
| `AGENTS.md` | Updates skill count and description |
| `docs/plugins/code-review.md` | Documents new skill in plugin architecture |
| `package.json` (7 files) | Version bump |

---

### Task 1: Create the Skill Markdown

**Files:**
- Create: `packages/code-review/src/skills/standards-discovery/SKILL.md`

- [ ] **Step 1: Create directory**

```bash
mkdir -p packages/code-review/src/skills/standards-discovery
```

- [ ] **Step 2: Write SKILL.md**

```markdown
---
name: standards-discovery
description: Discovers and parses project coding standards, style guides, and architecture documentation. Searches for CONTRIBUTING, CODING_STANDARDS, STYLE_GUIDE, CONVENTIONS, ARCHITECTURE files and extracts rules for code review.
activation: Load before reviewing code or applying fixes in any project
---

# Standards Discovery - Project Documentation Scanner

Discovers and parses project-specific coding standards, style guides, and architecture documentation to ensure code reviews align with project conventions.

---

## Purpose

Before reviewing code, understand what standards the project follows:

- Naming conventions
- Architecture patterns
- Testing requirements
- Import rules
- Code organization

**Project-specific rules always override generic best practices.**

---

## Discovery Workflow

### Step 1: Search for Standards Files

**ALWAYS run these searches first:**

```bash
# Primary standards files
find . -type f \( \
  -iname "CONTRIBUTING*" -o \
  -iname "CODING*STANDARD*" -o \
  -iname "STYLE*GUIDE*" -o \
  -iname "CODE*STYLE*" -o \
  -iname "CONVENTIONS*" -o \
  -iname "ARCHITECTURE*" -o \
  -iname "GUIDELINES*" -o \
  -iname "DEVELOPMENT*" -o \
  -iname "STANDARDS*" \
\) -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./.venv/*" -not -path "./vendor/*" 2>/dev/null

# Check docs directory
find ./docs -type f -name "*.md" 2>/dev/null

# Check .github directory
find ./.github -type f -name "*.md" 2>/dev/null
```

### Step 2: Check Common Locations

| Location | Priority | What to look for |
|----------|----------|------------------|
| `CONTRIBUTING.md` | HIGH | Code style, PR process, testing requirements |
| `docs/ARCHITECTURE.md` | HIGH | Layer structure, patterns used |
| `docs/CODING_STANDARDS.md` | HIGH | Naming, formatting, imports |
| `.github/CONTRIBUTING.md` | MEDIUM | Contribution guidelines |
| `README.md` | LOW | Development section |
| `docs/` | MEDIUM | Any .md files with style/standards |

### Step 3: Parse README for Standards Section

```bash
# Look for development/contributing sections in README
grep -n -i -A 20 "## Development\|## Contributing\|## Code Style\|## Standards\|## Guidelines" README.md 2>/dev/null
```

---

## Standards Extraction

### Naming Conventions

Look for patterns like:

```bash
# Search for naming convention mentions
grep -rni "naming convention\|camelCase\|snake_case\|PascalCase\|kebab-case\|UPPER_CASE" --include="*.md" . 2>/dev/null
```

**Common patterns to identify:**

- Classes: `PascalCase` / `UpperCamelCase`
- Functions/methods: `snake_case` / `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Variables: `snake_case` / `camelCase`
- Files: `snake_case` / `kebab-case`

### Architecture Patterns

```bash
# Search for architecture mentions
grep -rni "clean architecture\|hexagonal\|DDD\|domain.driven\|layered\|SOLID\|microservice" --include="*.md" . 2>/dev/null

# Check for layer structure documentation
grep -rni "domain layer\|application layer\|infrastructure\|presentation layer\|use.case" --include="*.md" . 2>/dev/null
```

**Common architectures to identify:**

- Clean Architecture (layers: domain, application, infrastructure, presentation)
- Hexagonal Architecture (ports & adapters)
- DDD (aggregates, entities, value objects, repositories)
- Layered Architecture (presentation, business, data)

### Testing Requirements

```bash
# Search for testing standards
grep -rni "test coverage\|unit test\|integration test\|pytest\|jest\|testing" --include="*.md" . 2>/dev/null

# Look for coverage requirements
grep -rni "coverage.*%\|minimum.*coverage\|100%\|80%\|90%" --include="*.md" . 2>/dev/null
```

**Common requirements to identify:**

- Minimum coverage percentage
- Required test types (unit, integration, e2e)
- Testing framework preferences
- Mocking guidelines

### Import Rules

```bash
# Search for import guidelines
grep -rni "import\|absolute import\|relative import\|circular\|dependency" --include="*.md" . 2>/dev/null
```

**Common rules to identify:**

- Absolute vs relative imports
- Import ordering (stdlib, third-party, local)
- Circular dependency policy
- Dependency direction rules

---

## Output Format

Generate a structured summary of discovered standards:

```json
{
  "standards_found": true,
  "confidence": "HIGH|MEDIUM|LOW",
  "sources": [
    {
      "file": "CONTRIBUTING.md",
      "sections_found": ["Code Style", "Testing"]
    },
    {
      "file": "docs/ARCHITECTURE.md",
      "sections_found": ["Layer Structure", "DDD Patterns"]
    }
  ],
  "rules": {
    "naming": {
      "classes": "PascalCase",
      "functions": "snake_case",
      "constants": "UPPER_SNAKE_CASE",
      "variables": "snake_case",
      "files": "snake_case.py"
    },
    "architecture": {
      "pattern": "Clean Architecture",
      "layers": ["domain", "application", "infrastructure", "api"],
      "dependency_direction": "outer -> inner",
      "ddd_patterns": ["aggregates", "repositories", "value_objects"]
    },
    "testing": {
      "required": true,
      "min_coverage": "80%",
      "frameworks": ["pytest"],
      "types": ["unit", "integration"]
    },
    "imports": {
      "style": "absolute",
      "circular_allowed": false,
      "ordering": ["stdlib", "third_party", "local"]
    },
    "documentation": {
      "docstrings_required": true,
      "style": "Google"
    }
  },
  "explicit_rules": [
    "All public functions must have docstrings",
    "No business logic in infrastructure layer",
    "Use dataclasses for value objects"
  ],
  "warnings": [
    "No explicit naming convention found - using Python PEP 8 defaults"
  ]
}
```

---

## Fallback: No Standards Found

If no explicit standards documentation exists:

1. **Report as INFO:**

   ```json
   {
     "standards_found": false,
     "confidence": "LOW",
     "sources": [],
     "fallback": "Using industry best practices",
     "applied_defaults": {
       "python": "PEP 8, PEP 257",
       "typescript": "ESLint recommended, Prettier",
       "architecture": "General SOLID principles"
     }
   }
   ```

2. **Check implicit standards from config files:**

   ```bash
   # Ruff/flake8 config indicates Python style
   # Read pyproject.toml with Read tool and look for [tool.ruff] section

   # ESLint config indicates JS/TS style
   # Read .eslintrc.json with Read tool
   ```

3. **Note in report:**
   > "No explicit coding standards documentation found. Review will use industry best practices. Consider creating CONTRIBUTING.md or docs/CODING_STANDARDS.md."

---

## Integration with Code Review

After discovering standards, pass them to subsequent skills:

1. **To `linter-integration`:**
   - Which linter configs exist
   - Custom rules mentioned in docs

2. **To `architecture-analysis`:**
   - Architecture pattern (Clean/Hexagonal/DDD)
   - Layer structure
   - Dependency rules

3. **To AI review:**
   - Naming conventions
   - Documentation requirements
   - Testing requirements

---

## Common Documentation Patterns

### Python Projects

```bash
# Check for Python-specific docs
ls -la docs/*.md 2>/dev/null
# Read docs/development.md with Read tool
```

Common files:

- `CONTRIBUTING.md`
- `docs/development.md`
- `docs/architecture.md`
- `pyproject.toml` [tool.ruff] section

### TypeScript Projects

```bash
# Check for TS-specific docs
ls -la docs/*.md 2>/dev/null
# Read CONTRIBUTING.md with Read tool
```

Common files:

- `CONTRIBUTING.md`
- `docs/DEVELOPMENT.md`
- `.eslintrc.*` (implicit style rules)
- `tsconfig.json` (implicit strictness level)

---

## Red Flags - STOP if you

- Skip searching for standards files
- Assume no standards exist without searching
- Override explicit project rules with generic best practices
- Miss architecture documentation that defines layer boundaries

**When these occur:** Go back and complete the full discovery process.

---

## Final Checklist

Before completing standards discovery, verify:

- [ ] Searched for standard documentation files (CONTRIBUTING, STYLE_GUIDE, etc.)
- [ ] Checked docs/ and .github/ directories
- [ ] Parsed README for development sections
- [ ] Extracted naming conventions (if documented)
- [ ] Identified architecture pattern (if documented)
- [ ] Found testing requirements (if documented)
- [ ] Noted import rules (if documented)
- [ ] Generated structured output with sources
- [ ] Flagged missing standards as INFO (not violations)
```

- [ ] **Step 3: Commit**

```bash
git add packages/code-review/src/skills/standards-discovery/SKILL.md
git commit -m "feat(code-review): add standards-discovery skill markdown"
```

---

### Task 2: Wire Skill into Build Pipeline

**Files:**
- Modify: `packages/code-review/scripts/copy-assets.mjs`

- [ ] **Step 1: Modify copy-assets.mjs**

Replace the entire file content with:

```javascript
import { fileURLToPath } from "node:url"
import path from "node:path"
import { copyAssets } from "../../../scripts/copy-assets.mjs"

const root = path.dirname(fileURLToPath(import.meta.url))

copyAssets(
  [
    { from: "src/commands", to: "dist/commands", type: "dir" },
    { from: "src/agents", to: "dist/agents", type: "dir" },
    { from: "src/skills", to: "dist/skills", type: "dir" },
  ],
  path.resolve(root, "..")
)
```

- [ ] **Step 2: Commit**

```bash
git add packages/code-review/scripts/copy-assets.mjs
git commit -m "build(code-review): copy skills to dist during build"
```

---

### Task 3: Register Skill Directory in skill-registry

**Files:**
- Modify: `packages/skill-registry/src/index.ts`

- [ ] **Step 1: Modify skillDirectories array**

Change lines 11-14 from:
```typescript
const skillDirectories = [
  path.resolve(moduleDirectory, "../../python-developer/dist/skills"),
  path.resolve(moduleDirectory, "../../frontend-developer/dist/skills"),
]
```

To:
```typescript
const skillDirectories = [
  path.resolve(moduleDirectory, "../../python-developer/dist/skills"),
  path.resolve(moduleDirectory, "../../frontend-developer/dist/skills"),
  path.resolve(moduleDirectory, "../../code-review/dist/skills"),
]
```

- [ ] **Step 2: Commit**

```bash
git add packages/skill-registry/src/index.ts
git commit -m "feat(skill-registry): register code-review skills directory"
```

---

### Task 4: Add Pre-Analysis Step to Agent Prompts

**Files:**
- Modify: `packages/code-review/src/agents/security-auditor.md`
- Modify: `packages/code-review/src/agents/code-quality-auditor.md`
- Modify: `packages/code-review/src/agents/documentation-auditor.md`
- Modify: `packages/code-review/src/agents/fix-auto.md`
- Modify: `packages/code-review/src/agents/feedback-analyzer.md`

For **each** of the 5 files above, perform the same modification:

- [ ] **Step 1: Add Pre-Analysis section after frontmatter**

Insert the following block immediately after the `---` closing frontmatter delimiter (before the first `# Heading`):

```markdown
## Pre-Analysis Step: Discover Project Standards

Before analyzing code, ensure project-specific standards are loaded:
1. Use the `load_appverk_skill` tool with name "standards-discovery"
2. Follow the discovery workflow to locate CONTRIBUTING.md, CODING_STANDARDS.md, ARCHITECTURE.md, docs/*.md, and similar files
3. Apply discovered standards as additional review criteria throughout your analysis

If no explicit standards are found, proceed with industry best practices and note the absence in your report.
```

- [ ] **Step 2: Commit all agents**

```bash
git add packages/code-review/src/agents/security-auditor.md \
  packages/code-review/src/agents/code-quality-auditor.md \
  packages/code-review/src/agents/documentation-auditor.md \
  packages/code-review/src/agents/fix-auto.md \
  packages/code-review/src/agents/feedback-analyzer.md
git commit -m "feat(code-review): add standards-discovery pre-analysis to agents"
```

---

### Task 5: Add Pre-Analysis Step to Command Prompts

**Files:**
- Modify: `packages/code-review/src/commands/review.md`
- Modify: `packages/code-review/src/commands/fix.md`
- Modify: `packages/code-review/src/commands/fix-report.md`
- Modify: `packages/code-review/src/commands/analyze-feedback.md`

For **each** of the 4 files above, perform the same modification:

- [ ] **Step 1: Add Pre-Analysis section after frontmatter**

Insert the following block immediately after the `---` closing frontmatter delimiter (before the first `# Heading`):

```markdown
## Pre-Analysis Step: Discover Project Standards

Before analyzing code, ensure project-specific standards are loaded:
1. Use the `load_appverk_skill` tool with name "standards-discovery"
2. Follow the discovery workflow to locate CONTRIBUTING.md, CODING_STANDARDS.md, ARCHITECTURE.md, docs/*.md, and similar files
3. Apply discovered standards as additional review criteria throughout your analysis

If no explicit standards are found, proceed with industry best practices and note the absence in your report.
```

- [ ] **Step 2: Commit all commands**

```bash
git add packages/code-review/src/commands/review.md \
  packages/code-review/src/commands/fix.md \
  packages/code-review/src/commands/fix-report.md \
  packages/code-review/src/commands/analyze-feedback.md
git commit -m "feat(code-review): add standards-discovery pre-analysis to commands"
```

---

### Task 6: Update Tests

**Files:**
- Modify: `packages/code-review/tests/build-output.test.ts`

- [ ] **Step 1: Add skill file to EXPECTED_FILES**

Add `"skills/standards-discovery/SKILL.md"` to the `EXPECTED_FILES` array (after the last existing entry):

```typescript
const EXPECTED_FILES = [
  "commands/review.md",
  "agents/security-auditor.md",
  "agents/code-quality-auditor.md",
  "agents/documentation-auditor.md",
  "agents/cross-verifier.md",
  "agents/challenger.md",
  "commands/fix.md",
  "commands/fix-report.md",
  "agents/fix-auto.md",
  "commands/analyze-feedback.md",
  "agents/feedback-analyzer.md",
  "agents/skill-secret-scanner.md",
  "agents/skill-sast-analyzer.md",
  "agents/skill-dependency-scanner.md",
  "agents/skill-architecture-analyzer.md",
  "agents/skill-linter-integrator.md",
  "skills/standards-discovery/SKILL.md",
]
```

- [ ] **Step 2: Commit**

```bash
git add packages/code-review/tests/build-output.test.ts
git commit -m "test(code-review): verify standards-discovery skill in build output"
```

---

### Task 7: Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/plugins/code-review.md`

- [ ] **Step 1: Update README.md**

In the "Global Skill Registry" section, add `standards-discovery` to the list of available skills (after `celery-patterns` in the Python list):

Find:
```
- `python-coding-standards`, `python-tdd-workflow`, `fastapi-patterns`, `sqlalchemy-patterns`, `pydantic-patterns`, `async-python-patterns`, `uv-package-manager`, `django-web-patterns`, `django-orm-patterns`, `celery-patterns`
```

Replace with:
```
- `python-coding-standards`, `python-tdd-workflow`, `fastapi-patterns`, `sqlalchemy-patterns`, `pydantic-patterns`, `async-python-patterns`, `uv-package-manager`, `django-web-patterns`, `django-orm-patterns`, `celery-patterns`
- `standards-discovery` (code review)
```

- [ ] **Step 2: Update AGENTS.md**

Update the badge count from `package-5` to `package-5` (no change to package count, but add note about skills).

In the skills section (if exists), or add a note about `standards-discovery` being available. If no skills section exists, skip — the README already covers it.

- [ ] **Step 3: Update docs/plugins/code-review.md**

Add a "Skills" section to the plugin guide (if not present) listing `standards-discovery`:

```markdown
## Skills

### standards-discovery

Automatically discovers project coding standards before analysis. Loaded by all `/review`, `/fix`, and `/analyze-feedback` workflows via `load_appverk_skill("standards-discovery")`.
```

- [ ] **Step 4: Commit**

```bash
git add README.md AGENTS.md docs/plugins/code-review.md
git commit -m "docs: document standards-discovery skill availability"
```

---

### Task 8: Bump Versions

**Files:**
- Modify: `package.json` (root)
- Modify: `packages/code-review/package.json`
- Modify: `packages/skill-registry/package.json`
- Modify: `packages/commit/package.json`
- Modify: `packages/python-developer/package.json`
- Modify: `packages/frontend-developer/package.json`
- Modify: `packages/skill-utils/package.json`

- [ ] **Step 1: Bump all versions from 0.2.12 to 0.2.13**

For each `package.json`, change `"version": "0.2.12"` to `"version": "0.2.13"`.

Files to edit:
1. `/Users/mef1st0/Projects/AppVerk/av-opencode-plugins/package.json` — line 3
2. `/Users/mef1st0/Projects/AppVerk/av-opencode-plugins/packages/code-review/package.json` — line 3
3. `/Users/mef1st0/Projects/AppVerk/av-opencode-plugins/packages/skill-registry/package.json` — line 3
4. `/Users/mef1st0/Projects/AppVerk/av-opencode-plugins/packages/commit/package.json` — line 3
5. `/Users/mef1st0/Projects/AppVerk/av-opencode-plugins/packages/python-developer/package.json` — line 3
6. `/Users/mef1st0/Projects/AppVerk/av-opencode-plugins/packages/frontend-developer/package.json` — line 3
7. `/Users/mef1st0/Projects/AppVerk/av-opencode-plugins/packages/skill-utils/package.json` — line 3

- [ ] **Step 2: Commit**

```bash
git add package.json packages/*/package.json
git commit -m "chore(release): bump version to 0.2.13"
```

---

### Task 9: Build and Verify

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```
Expected: No errors.

- [ ] **Step 2: Run tests**

```bash
npm run test
```
Expected: All tests pass.

- [ ] **Step 3: Run full check**

```bash
npm run check
```
Expected: typecheck + test + build all pass.

- [ ] **Step 4: Verify dist output**

```bash
ls packages/code-review/dist/skills/standards-discovery/SKILL.md
```
Expected: File exists.

- [ ] **Step 5: Commit any generated dist changes**

```bash
git add packages/code-review/dist/
git commit -m "chore(build): regenerate code-review dist with standards-discovery skill"
```

---

## Self-Review

### Spec Coverage

| Spec Requirement | Implementing Task |
|---|---|
| Skill markdown created | Task 1 |
| Asset copy wired | Task 2 |
| Skill registry registration | Task 3 |
| Pre-analysis in agents | Task 4 |
| Pre-analysis in commands | Task 5 |
| Build output test | Task 6 |
| Documentation updates | Task 7 |
| Version bump | Task 8 |
| Build verification | Task 9 |

### Placeholder Scan

No TBD, TODO, "implement later", or vague steps found. All code blocks contain complete content.

### Type Consistency

- File paths are consistent throughout
- `standards-discovery` is the canonical skill name in all locations
- `load_appverk_skill("standards-discovery")` is used uniformly

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-29-standards-discovery.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session batch-by-batch with checkpoints

Which approach do you prefer?
