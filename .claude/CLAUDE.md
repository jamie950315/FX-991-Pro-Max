# Casio fx-991EX CLASSWIZ Emulator

## Project Overview
A 1:1 web replica of the Casio fx-991EX CLASSWIZ scientific calculator using vanilla HTML/CSS/JS. Uses the actual calculator photo as UI background with transparent overlay buttons.

## Architecture
- **engine.js** – Math engine with tokenizer, recursive descent parser, all computation functions (complex, matrix, vector, statistics, distribution, equation solving, etc.)
- **modes.js** – Mode handler classes for all 12 calculator modes (Complex, Base-N, Matrix, Vector, Statistics, Distribution, Spreadsheet, Table, Equation/Func, Inequality, Ratio)
- **app.js** – UI controller handling button clicks, keyboard input, display rendering, menu system, SOLVE, CALC modes
- **index.html** – Layout with image overlay approach (calc.png background + transparent hit-area buttons)
- **style.css** – LCD display styling with Natural Textbook Display (fractions, radicals, superscripts)

## Key Design Decisions
- Image-overlay UI: actual calculator photo as background, CSS-positioned transparent buttons on top
- Text-based expression input (not template-based) with visual rendering via formatMathDisplay()
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
