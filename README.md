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

### Natural Textbook Display
- Stacked fraction rendering (numerator/denominator with horizontal bar)
- Radical display with vinculum (√ with overline extending over radicand)
- Superscript exponents
- Mixed number display (whole + fraction)

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

### Unit Conversion (SHIFT+8 CONV)
9 categories: Length, Area, Volume, Mass, Velocity, Pressure, Energy, Power, Temperature

### Engineering Features
- Engineering notation cycling (ENG key)
- Engineering symbols (k, M, G, T, m, μ, n, p, f)
- Digit separator display

### Additional Features
- 47 built-in scientific constants
- Auto-complete brackets on `=` press
- Blinking cursor with arrow key navigation
- SHIFT/ALPHA modifier key system
- Expression history navigation
- Memory: Ans, variables A-F/M/x/y, independent memory M+/M-
- Trigonometric, hyperbolic, logarithmic functions
- Permutations/Combinations, integration, derivatives, summation

## Architecture

```
index.html      – Calculator layout with image overlay buttons
style.css       – LCD display styling, Natural Textbook Display CSS
engine.js       – Math engine: tokenizer, recursive descent parser
modes.js        – Mode handlers for all 12 calculator modes
app.js          – UI controller: key handling, display, menus, SOLVE
calc.png        – Calculator body image (UI background)
ClassWizFontSet/– Official Casio ClassWiz LCD fonts
```

## Development

```bash
npx serve -l 3456
```
