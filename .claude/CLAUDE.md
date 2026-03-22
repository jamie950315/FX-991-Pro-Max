# Casio fx-991EX CLASSWIZ Emulator

## Project Overview
A 1:1 web replica of the Casio fx-991EX CLASSWIZ scientific calculator using vanilla HTML/CSS/JS. Uses the actual calculator photo as UI background with transparent overlay buttons.

## Architecture
- **engine.js** – Math engine with tokenizer, recursive descent parser, all computation functions (complex, matrix, vector, statistics, distribution, equation solving, etc.)
- **modes.js** – Mode handler classes for all 12 calculator modes with dedicated expression evaluators (Complex, Base-N, Matrix, Vector, Statistics, Distribution, Spreadsheet, Table, Equation/Func, Inequality, Ratio)
- **app.js** – UI controller handling button clicks, keyboard input, KaTeX display rendering, menu system, SOLVE, CALC modes, debug test bench
- **index.html** – Layout with image overlay approach (calc.png background + transparent hit-area buttons + KaTeX CDN)
- **style.css** – LCD display styling with KaTeX overrides for Natural Textbook Display

## Key Design Decisions
- Image-overlay UI: actual calculator photo as background, CSS-positioned transparent buttons on top
- **KaTeX-powered display rendering** for MathI/MathO mode: `exprToLatex()` converts input expressions to LaTeX, `resultToLatex()` converts results, `renderKatex()` renders via KaTeX library
- Text-based expression input (not template-based) with KaTeX rendering of fractions, radicals, superscripts, π, scientific notation
- Character-by-character LaTeX conversion with bracket stack for proper `√{}`, `^{}` nesting
- `/` (fraction key) always renders as `\frac{}{}` (even without preceding digits); `÷` renders as `\div`
- Fraction handler in `exprToLatex()` scans for `\pi` in numerator and `π` in denominator (not just digits)
- Cursor embedded inside KaTeX via `\htmlClass{katex-cursor}{\rule{...}}` with CSS blink animation
- Legacy `formatMathDisplay()` kept as fallback when KaTeX CDN unavailable
- Right arrow `→` auto-closes unclosed function brackets (replaces old auto-close-on-operator)
- Auto-complete unclosed brackets on `=` press
- **Mode-specific expression evaluators**: Complex, Matrix, and Vector modes each have dedicated tokenizer + recursive-descent parsers (similar to engine but type-aware: complex `{re,im}`, matrix `{rows,cols,data}`, vector `[x,y,z]`)
- Statistics/Table settings (`statFrequency`, `tableUseGx`) persisted on engine object across mode changes
- Durand-Kerner numerical solver as fallback for quartic equations
- SOLVE uses damped Newton's method with `Number.isFinite()` guards and fallback starting points (±1, ±0.5, ±2, ±5, ±10) when initial guess fails; `polishSolveResult()` snaps to clean integers/fractions; L-R rounded to 0 when < 1e-10
- **ON button performs full reset**: mode → Calculate, angle → DEG, I/O → MathI/MathO, clears variables, memory, history, mode handler, solve state, menu

## Dev Server
```bash
npx serve -l 3456
```
Configured in `.claude/launch.json`.

## Debug Test Bench
Access via `?debug=1` query param. Tap CASIO logo to step through 100 tests covering all modes:
- #1-15: Calculate (fractions, radicals, trig, powers, S⇔D)
- #16-21: Complex (arithmetic, Arg, polar, ▶r∠θ)
- #22-27: Matrix (add, Det, inverse, transpose, scalar mul, Identity)
- #28-32: Vector (subtract, cross, dot, Angle, UnitV)
- #33-36: Statistics (1-variable, 13 stats with scrolling)
- #37-39: Distribution (Binomial CD, Inverse Normal, Normal PD)
- #40-42: Table (function table, scrolling, range editor)
- #43-47: Equation (simultaneous, polynomial cubic/quadratic, complex roots)
- #48-49: Inequality (cubic <0, quadratic >0)
- #50: SOLVE (Newton's method)
- #51-65: Calculate extended (tan, log, ln, Abs, nested √, parens, π fractions)
- #66-72: Complex extended (division, Conjg, ReP, ImP, Abs, i²)
- #73-77: Matrix extended (multiply, Det(B), A+A, B⁻¹, Trn(B))
- #78-82: Vector extended (add, scalar mul, negate, UnitV(B), B×A)
- #83-86: Statistics extended (2-variable stats with scrolling)
- #87-89: Distribution extended (NormalCD, PoissonPD, BinomialPD)
- #90-92: Table extended (x²-4 table with scrolling)
- #93-96: Equation extended (3-var simultaneous, double root)
- #97-98: Inequality extended (cubic >0, quadratic <0)
- #99-100: SOLVE extended (linear, x²-9)

## Testing
```bash
node -c engine.js && node -c modes.js && node -c app.js  # Syntax check
```

## Important Notes
- `complexFormat` property in engine constructor conflicts with method name → renamed to `formatComplex()`
- The `toFraction()` threshold is `1e-9` for error and rejects fractions with den>100 unless error < 1e-12
- `trySquareRoot()` skips integers and values > 1e6 to avoid spurious radical matches
- Engineering symbols (k, M, etc.) are parsed in tokenizer and displayed via `applyEngSymbol()`
- KaTeX loaded from CDN (v0.16.11); CSS link without SRI (hash rejected by some browsers); JS with SRI; trust restricted to `\htmlClass` command only
- CSS fallback `border-bottom-style: solid` on `.frac-line` ensures fraction bars render even if KaTeX CDN CSS fails
- Matrix/vector results auto-scale to 16px via `.lcd-out:has(.delimsizing.mult)` CSS rule to fit LCD
- Mode renderer tables use `font-size:12px` for proper LCD fill (increased from 8px)
- Non-MathI modes bypass KaTeX and use plain text rendering
- `autoCloseFunctionParens` only closes function parens (√, sin, Det, etc.), not user-typed `(`
- Simultaneous equations detect No Solution / Infinite Solution via Gaussian elimination pivot check
- Matrix/Vector modes persist defined data within mode handler instance (not across mode re-entry via menu)
