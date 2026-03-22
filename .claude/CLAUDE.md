# Casio fx-991EX CLASSWIZ Emulator

## Project Overview
A 1:1 web replica of the Casio fx-991EX CLASSWIZ scientific calculator using vanilla HTML/CSS/JS. Uses the actual calculator photo as UI background with transparent overlay buttons.

## Architecture
- **engine.js** – Math engine with tokenizer, recursive descent parser, all computation functions (complex, matrix, vector, statistics, distribution, equation solving, etc.)
- **modes.js** – Mode handler classes for all 12 calculator modes (Complex, Base-N, Matrix, Vector, Statistics, Distribution, Spreadsheet, Table, Equation/Func, Inequality, Ratio)
- **app.js** – UI controller handling button clicks, keyboard input, display rendering, menu system, SOLVE, CALC modes
- **index.html** – Layout with image overlay approach (calc.png background + transparent hit-area buttons)
- **style.css** – LCD display styling with KaTeX overrides for Natural Textbook Display

## Key Design Decisions
- Image-overlay UI: actual calculator photo as background, CSS-positioned transparent buttons on top
- **KaTeX-powered display rendering** for MathI/MathO mode: `exprToLatex()` converts input expressions to LaTeX, `resultToLatex()` converts results, `renderKatex()` renders via KaTeX library
- Text-based expression input (not template-based) with KaTeX rendering of fractions, radicals, superscripts, π, scientific notation
- Character-by-character LaTeX conversion with bracket stack for proper `√{}`, `^{}` nesting
- `/` (fraction key) renders as `\frac{}{}` via digit look-back/ahead; `÷` renders as `\div`
- Post-processing pass converts `π/n` patterns to `\frac{\pi}{n}` (π is not caught by digit look-back)
- Cursor embedded inside KaTeX via `\htmlClass{katex-cursor}{\rule{...}}` with CSS blink animation
- Legacy `formatMathDisplay()` kept as fallback when KaTeX CDN unavailable
- Auto-close function parentheses before binary operators (√(24)+... not √(24+...))
- Auto-complete unclosed brackets on = press
- Durand-Kerner numerical solver as fallback for quartic equations
- Fraction detection threshold tightened to avoid showing ugly fractions for irrational numbers

## Dev Server
```bash
npx serve -l 3456
```
Configured in `.claude/launch.json`.

## Testing
```bash
node -c engine.js && node -c modes.js && node -c app.js  # Syntax check
```
Engine tests can be run via Node.js vm sandbox (see test scripts in conversation history).

## Important Notes
- `complexFormat` property in engine constructor conflicts with method name → renamed to `formatComplex()`
- The `toFraction()` threshold is `1e-9` for error and rejects fractions with den>100 unless error < 1e-12
- `trySquareRoot()` skips integers and values > 1e6 to avoid spurious radical matches
- Engineering symbols (k, M, etc.) are parsed in tokenizer and displayed via `applyEngSymbol()`
- KaTeX loaded from CDN (v0.16.11) with SRI integrity checks; trust restricted to `\htmlClass` command only (for cursor rendering)
- Non-MathI modes (Complex, Base-N, Matrix, etc.) bypass KaTeX and use plain text rendering
- `exprToLatex()` uses a bracket stack to correctly close `\sqrt{}` and `^{}` for partial expressions while typing
