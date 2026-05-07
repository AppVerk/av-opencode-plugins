# Design: Integracja MCP `sequential-thinking` w pakiet `code-review`

**Data:** 2026-05-07
**Autor:** AI Agent
**Status:** Zaakceptowany

---

## Cel

Wzbogacić workflow code-review o narzędzie `sequential_thinking_sequentialthinking` (MCP sequential-thinking), które umożliwia wielokrokowe, refleksyjne rozumowanie. Integracja ma na celu:
1. Lepsze planowanie analizy na starcie (`/review`).
2. Głębszą analizę złożonych problemów przez agentów.
3. Redukcję false positives dzięki weryfikacji hipotez.

---

## Zakres

Zmiany dotyczą wyłącznie pakietu `packages/code-review`:
- Komenda `commands/review.md`
- Agent `agents/security-auditor.md`
- Agent `agents/code-quality-auditor.md`
- Agent `agents/cross-verifier.md`
- Agent `agents/challenger.md`

---

## Architektura

### Główne komponenty

| Komponent | Rola |
|-----------|------|
| **Strategic Pre-Analysis** | Nowy krok w `/review` przed uruchomieniem agentów. Używa `sequential-thinking` do zaplanowania priorytetów i zakresu. |
| **Agent Initialization (Step 0)** | Każdy główny agent (security, quality) używa `sequential-thinking` na starcie do zrozumienia kontekstu projektu. |
| **Deep Analysis Protocol** | Wbudowany w agentów protokół wyzwalania `sequential-thinking` dla znalezisk `CRITICAL`/`HIGH`. |
| **Graceful Degradation** | Mechanizm fallback — jeśli narzędzie nie jest dostępne, workflow kontynuuje bez zmian. |

---

## Szczegółowy przepływ

### 1. Strategic Pre-Analysis w `/review`

**Lokalizacja:** Komenda `commands/review.md`, krok między "Stack Detection" a "Launch Agents".

**Działanie:**
1. Po zakończeniu stack detection i documentation detection, agent wykonujący `/review` wywołuje `sequential_thinking_sequentialthinking`.
2. Prompt do narzędzia:
   - Zidentyfikuj, co jest w `$ARGUMENTS` (PR, cały kod, konkretny plik).
   - Na podstawie wykrytego stacku, określ najbardziej ryzykowne obszary.
   - Zaproponuj priorytetyzację agentów i kolejność analizy.
3. Wynik (`strategic_context`) jest wstrzykiwany do promptów agentów w kroku "Launch Agents".

**Fallback:** Jeśli `sequential-thinking` jest niedostępny, `strategic_context` pozostaje pusty, a agenty uruchamiają się z domyślnymi promptami.

---

### 2. Agent Initialization — Step 0

#### `security-auditor`

**Lokalizacja:** Na początku promptu agenta, przed "Step 1: Secret Scanning".

**Działanie:**
Agent wywołuje `sequential_thinking_sequentialthinking` z promptem:
- Zmapuj powierzchnię ataku: entry points, API endpoints, auth flows.
- Zidentyfikuj krytyczne zasoby: bazy danych, pliki konfiguracyjne, secrets.
- Ustal priorytety skanowania (które kroki są najważniejsze dla tego projektu?).

Wynik wpływa na kolejność i nacisk w kolejnych krokach (Step 1-5).

#### `code-quality-auditor`

**Lokalizacja:** Na początku promptu agenta, przed "Step 1: Standards Discovery".

**Działanie:**
Agent wywołuje `sequential_thinking_sequentialthinking` z promptem:
- Zrozum strukturę projektu i granice modułów.
- Zidentyfikuj architekturę (Clean Architecture, DDD, Layered, inna).
- Zaplanuj kolejność audytu: najpierw core domain, potem infrastructure.

Wynik wpływa na kolejność i nacisk w kolejnych krokach (Step 1-6).

---

### 3. Deep Analysis Protocol (On-Demand)

**Lokalizacja:** Wbudowana sekcja w promptach `security-auditor` i `code-quality-auditor`.

**Wyzwalacz:** Agent identyfikuje znalezisko o poziomie `CRITICAL` lub `HIGH`.

**Protokół:**
Przed zgłoszeniem znaleziska, agent MUSI (lub POWINIEN, jeśli narzędzie dostępne) wywołać `sequential_thinking_sequentialthinking` z promptem:
1. Zweryfikuj, czy problem jest prawdziwy (czy to nie false positive?).
2. Przeanalizuj pełny przepływ danych / zależności.
3. Oszacuj rzeczywisty wpływ (impact).
4. Rozważ alternatywne scenariusze ataku lub rozwiązania.

**Wynik:**
- Jeśli po analizie problem zostaje potwierdzony — zgłoś ze zaktualizowanym opisem i `**Verified by deep analysis**`.
- Jeśli uznany za false positive — oznacz jako `[false-positive]` i pomiń.

**Fallback:** Jeśli `sequential-thinking` nie jest dostępne, agent zgłasza znalezisko standardowo bez weryfikacji.

---

### 4. Cross-Verifier i Challenger (Opcjonalne pogłębienie)

#### `cross-verifier`

**Działanie:** Przed generowaniem korelacji, wywołaj `sequential_thinking_sequentialthinking` aby:
- Przeanalizować, czy naruszenia architektury mogą prowadzić do luk bezpieczeństwa.
- Zidentyfikować ukryte zależności między znaleziskami security i quality.

#### `challenger`

**Działanie:** Przed konstrukcją argumentów przeciwko znaleziskom, wywołaj `sequential_thinking_sequentialthinking` aby:
- Zbudować silne kontrargumenty.
- Weryfikować logikę i spójność własnych zarzutów.

---

## Dane i przepływ informacji

```
/review
  ├── Step: Stack Detection
  ├── Step: Documentation Detection
  ├── Step: STRATEGIC PRE-ANALYSIS (sequential-thinking)
  │      └── strategic_context ───────┐
  │                                   ▼
  ├── Step: Launch Agents (parallel)
         ├── security-auditor
         │    ├── Step 0: Init (sequential-thinking)
         │    ├── Step 1: Secret Scanning
         │    ├── Step 2: SAST
         │    ├── Step 3: Dependency Scan
         │    ├── Step 4: AI Threat Modeling
         │    └── Deep Analysis Protocol (CRITICAL/HIGH findings)
         ├── code-quality-auditor
         │    ├── Step 0: Init (sequential-thinking)
         │    ├── Step 1: Standards Discovery
         │    ├── Step 2: Linter Integration
         │    ├── Step 3: Architecture Analysis
         │    └── Deep Analysis Protocol (CRITICAL/HIGH findings)
         └── documentation-auditor (conditional)

  ├── Step: Performance Analysis
  ├── Step: Architecture Review
  ├── Step: Collect Agent Results
  ├── Step: Cross-Verifier (opcjonalnie sequential-thinking)
  ├── Step: Challenger (opcjonalnie sequential-thinking)
  ├── Step: Merge Results
  └── Step: Final Report
```

---

## Obsługa błędów

### Graceful Degradation
W każdym miejscu użycia `sequential-thinking`, prompt agenta zawiera:

> "Jeśli narzędzie `sequential_thinking_sequentialthinking` nie jest dostępne, kontynuuj standardowy workflow bez głębokiej analizy. Nie generuj błędu."

### Brak zmian w API
- Nie dodajemy nowych komend.
- Nie zmieniamy sygnatur istniejących agentów.
- Wszystkie zmiany to modyfikacje promptów markdown (`*.md`).

---

## Testowanie

### Testy jednostkowe
Brak — zmiany dotyczą wyłącznie promptów markdown. Testowanie odbywa się przez:
1. `npm run build` — sprawdzenie czy copy-assets kopiuje nowe wersje plików.
2. `npm run test` — istniejące testy pluginu (`plugin.test.ts`) weryfikują rejestrację agentów/komend.

### Testy integracyjne
Ręczne wywołanie `/review` w repozytorium testowym z i bez dostępnego `sequential-thinking`.

---

## Ograniczenia (MVP)

1. **Brak konfiguracji** — użycie `sequential-thinking` jest wbudowane w prompt, nie da się go wyłączyć bez modyfikacji promptu.
2. **Token intensity** — każde wywołanie `sequential-thinking` zużywa dodatkowe tokeny. W przypadku bardzo dużych projektów może to być zauważalne.
3. **Jedno narzędzie** — zakładamy, że `sequential_thinking_sequentialthinking` jest jedynym dostępnym narzędziem tego typu. W przyszłości można rozważyć abstrakcję.

---

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `packages/code-review/src/commands/review.md` | Dodanie kroku Strategic Pre-Analysis między Step 1.5 a Step 2. |
| `packages/code-review/src/agents/security-auditor.md` | Dodanie Step 0 (Initialization) i sekcji Deep Analysis Protocol. |
| `packages/code-review/src/agents/code-quality-auditor.md` | Dodanie Step 0 (Initialization) i sekcji Deep Analysis Protocol. |
| `packages/code-review/src/agents/cross-verifier.md` | Dodanie opcjonalnego użycia sequential-thinking przed analizą korelacji. |
| `packages/code-review/src/agents/challenger.md` | Dodanie opcjonalnego użycia sequential-thinking przed konstrukcją kontrargumentów. |
| `packages/code-review/scripts/copy-assets.mjs` | Brak zmian — kopiuje wszystkie `*.md`. |

---

## Decyzje projektowe

| Decyzja | Uzasadnienie |
|---------|--------------|
| Użycie `sequential-thinking` w istniejących agentach, nie nowy agent | Minimalizacja złożoności, brak potrzeby rejestracji nowego agenta w `src/index.ts`. |
| Wstrzyknięcie strategic_context do promptów agentów | Prosty sposób przekazania wyniku pre-analizy bez zmiany API OpenCode. |
| On-demand (CRITICAL/HIGH) zamiast dla każdego znaleziska | Oszczędność tokenów — tylko złożone problemy wymagają głębokiej analizy. |
| Graceful degradation w każdym miejscu | Plugin musi działać również w środowiskach bez MCP sequential-thinking. |

---

## Następne kroki

Po zaakceptowaniu tego design doc, należy wywołać skill `writing-plans` w celu utworzenia szczegółowego planu implementacji.
