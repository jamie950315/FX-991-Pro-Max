# Casio fx-991EX CLASSWIZ Emulator

A 1:1 web-based replica of the Casio fx-991EX CLASSWIZ scientific calculator, built with vanilla HTML/CSS/JavaScript.

## Features

### All 12 Calculator Modes
| # | Mode | Description |
|---|------|-------------|
| 1 | Calculate | General computation with Natural Textbook Display |
| 2 | Complex | Complex number arithmetic (a+bi, r∠θ) |
| 3 | Base-N | Binary/Octal/Decimal/Hex with logic operations |
| 4 | Matrix | Matrix operations up to 4×4 (det, inv, transpose) |
| 5 | Vector | 2D/3D vector operations (dot, cross, angle, unit) |
| 6 | Statistics | 8 regression types, data editor, statistical values |
| 7 | Distribution | Normal/Binomial/Poisson PD/CD/Inverse |
| 8 | Spreadsheet | 45×5 grid with formulas, cell references, Sum/Mean/Min/Max |
| 9 | Table | Function table generation for f(x) and g(x) |
| A | Equation/Func | Simultaneous (2-4 unknowns), Polynomial (degree 2-4) |
| B | Inequality | Polynomial inequality solving (degree 2-4) |
| C | Ratio | Proportion solving (A:B=X:D or A:B=C:X) |

### Natural Textbook Display (KaTeX-powered)
- **KaTeX math rendering** for instant, accurate, publication-quality display
- Stacked fraction rendering with proper horizontal bar (input and output)
- Radical display with vinculum (√ with overline extending over radicand)
- Superscript exponents, scientific notation (×10ⁿ)
- Mixed number display (whole + fraction)
- Pi fractions rendered naturally (π/4, 3π/4)
- Blinking cursor embedded inside KaTeX expressions
- Fraction key always renders stacked fraction template (even without preceding digits)

### Exact Form Results (MathI/MathO)
- Simplified radical form: `√24 → 2√6`, `√24+√150 → 7√6`
- Fraction results: `7/8+3/11 → 101/88`
- Pi form: `3π/4+2π → 11π/4`
- S⇔D toggle between exact and decimal forms
- SHIFT+S⇔D toggle between improper and mixed fractions

### SOLVE (Newton's Method)
- Solve equations for any variable
- Multi-variable support with initial value input
- L−R verification display
- Solution polishing (snaps to clean integers/fractions)
- Arrow keys exit result screen to resume editing

### Unit Conversion (SHIFT+8 CONV)
9 categories: Length, Area, Volume, Mass, Velocity, Pressure, Energy, Power, Temperature

### Engineering Features
- Engineering notation cycling (ENG key)
- Engineering symbols (k, M, G, T, m, μ, n, p, f)
- Digit separator display

### Additional Features
- 47 built-in scientific constants
- Auto-complete brackets on `=` press
- Right arrow auto-closes unclosed function brackets (exit sin(), √(), etc.)
- Blinking cursor with arrow key navigation
- Expression history with KaTeX rendering (up/down arrows)
- SHIFT/ALPHA modifier key system
- Expression history navigation
- Memory: Ans, variables A-F/M/x/y, independent memory M+/M-
- Trigonometric, hyperbolic, logarithmic functions
- Permutations/Combinations, integration, derivatives, summation

## Architecture

```
index.html      – Calculator layout with image overlay buttons + KaTeX CDN
style.css       – LCD display styling, KaTeX overrides for Natural Textbook Display
engine.js       – Math engine: tokenizer, recursive descent parser
modes.js        – Mode handlers for all 12 calculator modes
app.js          – UI controller: key handling, KaTeX display, menus, SOLVE
calc.png        – Calculator body image (UI background)
ClassWizFontSet/– Official Casio ClassWiz LCD fonts
```

### KaTeX Display System
The emulator uses [KaTeX](https://katex.org/) for real-time math rendering in MathI/MathO mode:
- `exprToLatex()` — Converts input expressions to LaTeX with bracket-stack tracking
- `resultToLatex()` — Converts exact-form results (√, π, fractions) to LaTeX
- `renderResultDisplay()` — Unified helper for result rendering with KaTeX/fallback
- Cursor rendered inside KaTeX via `\htmlClass` with CSS blink animation
- SRI integrity checks on CDN assets; trust restricted to `\htmlClass` only

## Development

```bash
npx serve -l 3456
```
