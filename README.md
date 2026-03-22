# Casio fx-991EX CLASSWIZ Emulator

A 1:1 web-based replica of the Casio fx-991EX CLASSWIZ scientific calculator, built with vanilla HTML/CSS/JavaScript.

## Features

### All 12 Calculator Modes
| # | Mode | Description |
|---|------|-------------|
| 1 | Calculate | General computation with Natural Textbook Display |
| 2 | Complex | Complex arithmetic (a+bi, r∠θ), Arg, Conjugate, polar conversion |
| 3 | Base-N | Binary/Octal/Decimal/Hex with logic operations |
| 4 | Matrix | Matrix operations up to 4×4 (add, mul, det, inv, transpose, identity) |
| 5 | Vector | 2D/3D vector operations (dot, cross, angle, unit vector) |
| 6 | Statistics | 8 regression types, 13 stat values with scrolling, frequency tables |
| 7 | Distribution | Normal/Binomial/Poisson PD/CD/Inverse with List and Variable modes |
| 8 | Spreadsheet | 45×5 grid with formulas, cell references, Fill Formula/Value, Copy & Paste |
| 9 | Table | Function table with inline x editing, +/- shortcuts, f(x) and f(x),g(x) |
| A | Equation/Func | Simultaneous (2-4 unknowns), Polynomial (degree 2-4), No/Infinite Solution |
| B | Inequality | Polynomial inequality solving (degree 2-4) with solution range display |
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

### Complex Mode
- Full complex expression evaluator with tokenizer + recursive descent parser
- Operations: `(3-2i)(5+6i) = 27+8i`, `Arg(1+2i) = 63.43°`
- Polar form: `2∠330 = √3-i`, `2+5i▶r∠θ = √29∠68.2°`
- OPTN: Argument, Conjugate, Real Part, Imaginary Part, ▶r∠θ, ▶a+bi

### Matrix Mode
- Full matrix expression evaluator: `MatA+MatB`, `Det(MatA)`, `MatA⁻¹×MatB`
- Operations: add, subtract, multiply, scalar mul, inverse, transpose, determinant, identity
- Define/Edit with bracket display, KaTeX bmatrix result rendering
- OPTN: Define/Edit Matrix, MatA-D, MatAns, Determinant, Transposition, Identity

### Vector Mode
- Full vector expression evaluator: `VctA-VctB`, `VctA×VctB` (cross), `VctA•VctB` (dot)
- Operations: add, subtract, cross product, dot product, angle, unit vector, scalar mul
- OPTN: Define/Edit Vector, VctA-D, VctAns, Dot Product, Angle, Unit Vector

### Statistics Mode
- 13 one-variable stats (x̄, Σx, Σx², σ²x, σx, S²x, sx, n, min, Q₁, Med, Q₃, max) with scrolling
- 23 two-variable stats for paired data
- 8 regression types with a, b, c, r coefficients
- Statistics Calc expression mode (evaluate Q₃-Q₁, etc.)
- Frequency table support (Setup > Statistics > Frequency On/Off)

### Distribution Mode
- 7 distribution types: Normal PD/CD, Inverse Normal, Binomial PD/CD, Poisson PD/CD
- List mode: enter x values, compute probability table
- Variable mode: enter parameters directly (with fraction input support)

### Spreadsheet Mode
- 45×5 grid (A-E columns) with cell navigation
- Formula support: `=B1×29.5735`, `=A1×C1`, `=Sum(D1:D6)`, `=Mean(B1:B6)`
- Fill Formula with relative reference adjustment
- Fill Value, Edit Cell, Free Space, Copy & Paste, Cut & Paste
- Grab command for cell reference insertion, $ for absolute references

### Table Mode
- Function table generation for f(x) and optionally g(x)
- Customizable range (Start, End, Step)
- Inline x value editing (type new value directly in table)
- +/- shortcuts (add row with x ± step)
- Setup: f(x) only or f(x),g(x) dual function mode

### Equation/Func Mode
- Simultaneous equations (2-4 unknowns) with KaTeX fraction solutions
- Polynomial equations (degree 2-4) with real and complex root display
- No Solution / Infinite Solution detection for inconsistent systems
- Solution polishing for clean integer/fraction results

### Inequality Mode
- Polynomial inequality solving (degree 2-4)
- 4 inequality types: >0, <0, ≥0, ≤0
- Solution range display with pattern header (x<a, b<x<c)

### SOLVE (Newton's Method)
- Solve equations for any variable
- Multi-variable support with initial value input
- L−R verification display
- Solution polishing (snaps to clean integers/fractions)
- Arrow keys exit result screen to resume editing

### Additional Features
- 47 built-in scientific constants
- Unit conversion (9 categories)
- Auto-complete brackets on `=` press
- Right arrow auto-closes unclosed function brackets
- Blinking cursor with arrow key navigation
- Expression history with KaTeX rendering
- SHIFT/ALPHA modifier key system
- Memory: Ans, variables A-F/M/x/y, independent memory M+/M-
- Engineering notation cycling with symbols (k, M, G, T, m, μ, n, p, f)

## Architecture

```
index.html      – Calculator layout with image overlay buttons + KaTeX CDN
style.css       – LCD display styling, KaTeX overrides for Natural Textbook Display
engine.js       – Math engine: tokenizer, recursive descent parser
modes.js        – Mode handlers with dedicated expression evaluators
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

### Mode Expression Evaluators
Complex, Matrix, and Vector modes each have dedicated tokenizer + recursive-descent parsers:
- **ComplexMode**: `cTokenize()` + `cParseExpr/Term/Angle/Unary/Postfix/Primary` — type: `{re, im}`
- **MatrixMode**: `mTokenize()` + `mParseExpr/Term/Unary/Postfix/Primary` — type: `{type:'matrix'|'scalar', value}`
- **VectorMode**: `vTokenize()` + `vParseExpr/Dot/Term/Unary/Postfix/Primary` — type: `{type:'vector'|'scalar', value}`

## Development

```bash
npx serve -l 3456
```

### Debug Test Bench
Access via `?debug=1` query param. Tap CASIO logo to step through 50 tests covering all modes and features. Test number shown as `#N` badge in LCD indicator area.
