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
- Post-processing pass converts `π/n` patterns to `\frac{\pi}{n}`
- Cursor embedded inside KaTeX via `\htmlClass{katex-cursor}{\rule{...}}` with CSS blink animation
- Legacy `formatMathDisplay()` kept as fallback when KaTeX CDN unavailable
- Right arrow `→` auto-closes unclosed function brackets (replaces old auto-close-on-operator)
- Auto-complete unclosed brackets on `=` press
- **Mode-specific expression evaluators**: Complex, Matrix, and Vector modes each have dedicated tokenizer + recursive-descent parsers (similar to engine but type-aware: complex `{re,im}`, matrix `{rows,cols,data}`, vector `[x,y,z]`)
- Statistics/Table settings (`statFrequency`, `tableUseGx`) persisted on engine object across mode changes
- Durand-Kerner numerical solver as fallback for quartic equations
- SOLVE `polishSolveResult()` snaps Newton solutions to clean integers/fractions; L-R rounded to 0 when < 1e-10

## Dev Server
```bash
npx serve -l 3456
```
Configured in `.claude/launch.json`.

## Debug Test Bench
Access via `?debug=1` query param. Tap CASIO logo to step through 50 tests covering all modes:
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

## Testing
```bash
node -c engine.js && node -c modes.js && node -c app.js  # Syntax check
```

## Important Notes
- `complexFormat` property in engine constructor conflicts with method name → renamed to `formatComplex()`
- The `toFraction()` threshold is `1e-9` for error and rejects fractions with den>100 unless error < 1e-12
- `trySquareRoot()` skips integers and values > 1e6 to avoid spurious radical matches
- Engineering symbols (k, M, etc.) are parsed in tokenizer and displayed via `applyEngSymbol()`
- KaTeX loaded from CDN (v0.16.11) with SRI integrity checks; trust restricted to `\htmlClass` command only
- Non-MathI modes bypass KaTeX and use plain text rendering
- `autoCloseFunctionParens` only closes function parens (√, sin, Det, etc.), not user-typed `(`
- Simultaneous equations detect No Solution / Infinite Solution via Gaussian elimination pivot check
- Matrix/Vector modes persist defined data within mode handler instance (not across mode re-entry via menu)
