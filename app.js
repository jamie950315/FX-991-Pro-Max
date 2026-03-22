/**
 * Casio fx-991EX CLASSWIZ - Application Controller
 * Handles UI interactions, display management, and key bindings
 */

class CasioFX991EX {
    constructor() {
        this.engine = new CalcEngine();
        this.input = '';
        this.displayInput = '';
        this.cursorPos = 0;
        this.shiftActive = false;
        this.alphaActive = false;
        this.powered = true;
        this.error = null;
        this.justEvaluated = false;
        this.showingResult = false;
        this.menuOpen = false;
        this.menuPage = 0;
        this.menuType = null; // 'main', 'setup', 'recall', etc.
        this.menuItems = [];
        this.menuSelection = 0;
        this.stoMode = false; // STO variable assignment mode
        this.lastExpression = '';
        this.modeHandler = null; // Active mode handler instance
        this.resultDisplayMode = 'exact'; // 'exact' (frac/√/π) or 'decimal'
        this.solvePhase = null; // SOLVE mode state
        this.calcPhase = null; // CALC variable substitution state

        // Display elements
        this.displayInputEl = document.getElementById('display-input');
        this.displayResultEl = document.getElementById('display-result');

        // Indicators
        this.indShift = document.getElementById('ind-shift');
        this.indAlpha = document.getElementById('ind-alpha');
        this.indM = document.getElementById('ind-m');
        this.indAngle = document.getElementById('ind-angle');
        this.indFix = document.getElementById('ind-fix');
        this.indSci = document.getElementById('ind-sci');
        this.indMath = document.getElementById('ind-math');
        this.indSto = document.getElementById('ind-sto');


        this.init();
    }

    init() {
        this.bindButtons();
        this.bindKeyboard();
        this.updateDisplay();
        this.updateIndicators();
    }

    // === Button bindings ===
    bindButtons() {
        document.querySelectorAll('[data-key]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                btn.classList.add('pressed');
            });
            btn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                btn.classList.remove('pressed');
                this.handleKey(btn.dataset.key);
            });
            btn.addEventListener('mouseleave', () => {
                btn.classList.remove('pressed');
            });

            // Touch events
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('pressed');
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('pressed');
                this.handleKey(btn.dataset.key);
            });
        });
    }

    // === Keyboard bindings ===
    bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (!this.powered) {
                if (e.key === 'Enter') {
                    this.powerOn();
                }
                return;
            }

            let key = null;
            switch (e.key) {
                case '0': case '1': case '2': case '3': case '4':
                case '5': case '6': case '7': case '8': case '9':
                    key = e.key;
                    break;
                case '.': key = 'dot'; break;
                case '+': key = 'add'; break;
                case '-': key = 'subtract'; break;
                case '*': key = 'multiply'; break;
                case '/': key = 'divide'; break;
                case '(': key = 'lparen'; break;
                case ')': key = 'rparen'; break;
                case '^': key = 'power'; break;
                case 'Enter': case '=': key = 'equals'; break;
                case 'Backspace': key = 'del'; break;
                case 'Delete': case 'Escape': key = 'ac'; break;
                case 'ArrowUp': key = 'up'; e.preventDefault(); break;
                case 'ArrowDown': key = 'down'; e.preventDefault(); break;
                case 'ArrowLeft': key = 'left'; e.preventDefault(); break;
                case 'ArrowRight': key = 'right'; e.preventDefault(); break;
                case 's': if (!e.ctrlKey) key = 'sin'; break;
                case 'c': if (!e.ctrlKey) key = 'cos'; break;
                case 't': if (!e.ctrlKey) key = 'tan'; break;
                case 'l': key = 'ln'; break;
                case 'p': key = 'exp'; break;
                case 'r': key = 'sqrt'; break;
                case '!': key = 'reciprocal'; break;
                case '%':
                    this.shiftActive = true;
                    key = 'ans';
                    break;
            }
            if (key) {
                e.preventDefault();
                this.handleKey(key);
            }
        });
    }

    // === Main key handler ===
    handleKey(key) {
        if (!this.powered && key !== 'on') return;

        // Clear error state on any key press
        if (this.error && key !== 'ac') {
            this.error = null;
            this.input = '';
            this.displayInput = '';
            this.showingResult = false;
            this.justEvaluated = false;
        }

        // If in SOLVE mode
        if (this.solvePhase) {
            this.handleSolveKey(key);
            return;
        }

        // If in CALC mode
        if (this.calcPhase) {
            this.handleCalcKey(key);
            return;
        }

        // If in STO mode, handle variable assignment
        if (this.stoMode) {
            this.handleStoKey(key);
            return;
        }

        // If in menu, handle menu navigation
        if (this.menuOpen) {
            this.handleMenuKey(key);
            return;
        }

        // SHIFT + key combinations
        if (this.shiftActive) {
            // Let mode handler intercept SHIFT keys first
            if (this.modeHandler && this.modeHandler.handleShiftKey) {
                this.shiftActive = false;
                this.updateIndicators();
                if (this.modeHandler.handleShiftKey(key)) return;
            }
            this.handleShiftKey(key);
            return;
        }

        // ALPHA + key combinations
        if (this.alphaActive) {
            // Let mode handler intercept ALPHA keys first
            if (this.modeHandler && this.modeHandler.handleAlphaKey) {
                this.alphaActive = false;
                this.updateIndicators();
                if (this.modeHandler.handleAlphaKey(key)) return;
            }
            this.handleAlphaKey(key);
            return;
        }

        // Delegate to active mode handler
        if (this.modeHandler && this.modeHandler.handleKey(key)) {
            return;
        }

        // Normal key handling
        switch (key) {
            // Modifiers
            case 'shift':
                this.shiftActive = !this.shiftActive;
                this.updateIndicators();
                return;
            case 'alpha':
                this.alphaActive = !this.alphaActive;
                this.updateIndicators();
                return;

            // Power
            case 'on':
                this.powerOn();
                return;

            // Navigation
            case 'up': this.handleUp(); return;
            case 'down': this.handleDown(); return;
            case 'left': this.handleLeft(); return;
            case 'right': this.handleRight(); return;
            case 'center': return;

            // Menu
            case 'menu':
                this.openMainMenu();
                return;

            // Clear
            case 'ac':
                this.clearAll();
                return;
            case 'del':
                this.deleteChar();
                return;

            // Numbers
            case '0': case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8': case '9':
                this.inputChar(key);
                return;
            case 'dot':
                this.inputChar('.');
                return;

            // Basic operators
            case 'add': this.inputChar('+'); return;
            case 'subtract': this.inputChar('−'); return;
            case 'multiply': this.inputChar('×'); return;
            case 'divide': this.inputChar('÷'); return;

            // Parentheses
            case 'lparen': this.inputChar('('); return;
            case 'rparen': this.inputChar(')'); return;

            // Functions
            case 'sin': this.inputFunc('sin('); return;
            case 'cos': this.inputFunc('cos('); return;
            case 'tan': this.inputFunc('tan('); return;
            case 'ln': this.inputFunc('ln('); return;
            case 'log': this.inputFunc('log('); return;
            case 'sqrt': this.inputFunc('√('); return;
            case 'square': this.inputChar('²'); return;
            case 'power': this.inputChar('^('); return;
            case 'reciprocal': this.inputChar('⁻¹'); return;
            case 'negate': this.inputFunc('(-)'); return;
            case 'fraction': this.inputFraction(); return;
            case 'integral': this.inputFunc('∫('); return;
            case 'exp': this.inputChar('×10^'); return;
            case 'dms': this.inputDMS(); return;

            // Special keys
            case 'ans': this.inputChar('Ans'); return;
            case 'equals': this.calculate(); return;
            case 'sd': this.toggleSD(); return;
            case 'mplus': this.memoryPlus(); return;
            case 'sto': this.enterStoMode(); return;
            case 'eng': this.engineeringNotation(); return;
            case 'optn': this.openOptionsMenu(); return;
            case 'calc': this.openCalcMode(); return;
            case 'varx': this.inputChar('x'); return;
        }
    }

    // === SHIFT key combinations ===
    handleShiftKey(key) {
        this.shiftActive = false;
        this.updateIndicators();

        switch (key) {
            case 'on': this.powerOff(); return;
            case 'sin': this.inputFunc('sin⁻¹('); return;
            case 'cos': this.inputFunc('cos⁻¹('); return;
            case 'tan': this.inputFunc('tan⁻¹('); return;
            case 'ln': this.inputFunc('e^('); return;
            case 'log': this.inputFunc('10^('); return;
            case 'sqrt': this.inputFunc('³√('); return;
            case 'square': this.inputChar('³'); return;
            case 'power': this.inputFunc('ˣ√('); return;
            case 'reciprocal': this.inputChar('!'); return;
            case 'negate': this.inputFunc('log('); return;
            case 'dms': this.primeFactorize(); return;
            case 'fraction': this.inputMixedFraction(); return;
            case 'lparen': this.inputFunc('Abs('); return;
            case 'rparen': this.inputChar(','); return;
            case 'mplus': this.memoryMinus(); return;
            case 'sto': this.showRecall(); return;
            case 'eng': this.engineeringLeft(); return;
            case 'sd': this.toggleFractionType(); return;
            case 'equals': this.calculateApprox(); return;
            case 'ans': this.inputChar('%'); return;
            case 'exp': this.inputChar('π'); return;
            case 'dot': this.inputRandom(); return;
            case '0': this.inputRound(); return;
            case 'multiply': this.inputFunc('nPr'); return;
            case 'divide': this.inputFunc('nCr'); return;
            case 'add': this.inputFunc('Pol('); return;
            case 'subtract': this.inputFunc('Rec('); return;
            case 'del': this.toggleInsert(); return;
            case '7': this.openConstMenu(); return;
            case '8': this.openConvMenu(); return;
            case '9': this.openResetMenu(); return;
            case 'calc': this.openSolve(); return;
            case 'integral': this.inputFunc('d/dx('); return;
            case 'varx': this.inputFunc('Σ('); return;
            case 'optn': this.showQR(); return;
            case 'menu': this.openSetupMenu(); return;
            default:
                // If shift + unhandled, just cancel shift
                this.handleKey(key);
                return;
        }
    }

    // === ALPHA key combinations ===
    handleAlphaKey(key) {
        this.alphaActive = false;
        this.updateIndicators();

        const varMap = {
            'negate': 'A',
            'dms': 'B',
            'reciprocal': 'C',
            'sin': 'D',
            'cos': 'E',
            'tan': 'F',
            'rparen': 'x',
            'sd': 'y',
            'mplus': 'M',
        };

        if (varMap[key]) {
            this.inputChar(varMap[key]);
            return;
        }

        switch (key) {
            case 'calc': this.inputChar('='); return;
            case 'integral': this.inputChar(':'); return;
            case 'exp': this.inputChar('e'); return;
            case 'dot': this.inputRandomInt(); return;
            case 'del':
                // UNDO - simplified version
                if (this.lastExpression) {
                    this.input = this.lastExpression;
                    this.displayInput = this.lastExpression;
                    this.updateDisplay();
                }
                return;
            default:
                this.handleKey(key);
                return;
        }
    }

    // === Input methods ===
    inputChar(ch) {
        if (this.justEvaluated && /[0-9.]/.test(ch)) {
            this.input = '';
            this.displayInput = '';
            this.cursorPos = 0;
            this.justEvaluated = false;
            this.showingResult = false;
        } else if (this.justEvaluated) {
            if (ch === '+' || ch === '−' || ch === '×' || ch === '÷' || ch === '^(') {
                this.input = 'Ans';
                this.displayInput = 'Ans';
                this.cursorPos = 3;
            } else {
                this.input = '';
                this.displayInput = '';
                this.cursorPos = 0;
            }
            this.justEvaluated = false;
            this.showingResult = false;
        }

        // Note: Auto-close function parens on binary operators is disabled.
        // Real Casio uses → key to exit function templates.
        // Use → key (autoCloseOneBracket) or = key (autoCloseBrackets) instead.

        this.lastExpression = this.input;
        // Insert at cursor position
        this.input = this.input.substring(0, this.cursorPos) + ch + this.input.substring(this.cursorPos);
        this.displayInput = this.displayInput.substring(0, this.cursorPos) + ch + this.displayInput.substring(this.cursorPos);
        this.cursorPos += ch.length;
        this.updateDisplay();
    }

    // Auto-close unclosed function parentheses at cursor position
    // e.g., √(24| + operator → √(24)| + operator
    autoCloseFunctionParens() {
        const beforeCursor = this.input.substring(0, this.cursorPos);

        // Find positions of all unclosed '('
        let stack = []; // stack of indices
        for (let i = 0; i < beforeCursor.length; i++) {
            if (beforeCursor[i] === '(') stack.push(i);
            else if (beforeCursor[i] === ')') { if (stack.length) stack.pop(); }
        }
        if (stack.length === 0) return;

        const lastChar = beforeCursor.trim().slice(-1);
        if (!/[0-9)πe𝒊]/.test(lastChar)) return;

        // Only close function parens (preceded by function name), not user-typed parens
        const funcPrefixes = ['sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'sinh⁻¹', 'cosh⁻¹', 'tanh⁻¹',
            'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'ln', 'log',
            '√', '³√', 'ˣ√', '10^', 'e^', '^', 'Abs', 'Pol', 'Rec',
            'd/dx', '∫', 'Σ', 'RanInt', 'Rnd', 'Arg', 'Conjg', 'ReP', 'ImP',
            'Det', 'Trn', 'Identity', 'Angle', 'UnitV'];

        // Count closeable function parens from innermost outward
        let closeCount = 0;
        for (let j = stack.length - 1; j >= 0; j--) {
            const pos = stack[j];
            let isFunc = false;
            for (const prefix of funcPrefixes) {
                if (beforeCursor.substring(0, pos).endsWith(prefix)) {
                    isFunc = true; break;
                }
            }
            if (isFunc) closeCount++;
            else break; // Stop at first user-typed paren
        }

        if (closeCount > 0) {
            const close = ')'.repeat(closeCount);
            this.input = beforeCursor + close + this.input.substring(this.cursorPos);
            this.displayInput = this.displayInput.substring(0, this.cursorPos) + close + this.displayInput.substring(this.cursorPos);
            this.cursorPos += close.length;
        }
    }

    inputFunc(func) {
        if (this.justEvaluated) {
            if (func.match(/^[+\-×÷]/)) {
                this.input = 'Ans';
                this.displayInput = 'Ans';
                this.cursorPos = 3;
            } else {
                this.input = '';
                this.displayInput = '';
                this.cursorPos = 0;
            }
            this.justEvaluated = false;
            this.showingResult = false;
        }

        this.lastExpression = this.input;
        this.input = this.input.substring(0, this.cursorPos) + func + this.input.substring(this.cursorPos);
        this.displayInput = this.displayInput.substring(0, this.cursorPos) + func + this.displayInput.substring(this.cursorPos);
        this.cursorPos += func.length;
        this.updateDisplay();
    }

    inputFraction() {
        // Fraction key: inserts / which displays as stacked fraction in MathI mode
        this.inputChar('/');
    }

    inputMixedFraction() {
        // SHIFT+fraction: same as fraction for now
        this.inputChar('/');
    }

    inputDMS() {
        this.inputChar('°');
    }

    // === Auto-complete brackets ===
    autoCloseBrackets(expr) {
        let open = 0;
        for (let i = 0; i < expr.length; i++) {
            if (expr[i] === '(') open++;
            else if (expr[i] === ')') open--;
        }
        if (open > 0) {
            const closing = ')'.repeat(open);
            expr += closing;
            this.input += closing;
            this.displayInput += closing;
            this.cursorPos = this.displayInput.length;
        }
        return expr;
    }

    // === Calculation ===
    calculate() {
        if (!this.input && !this.showingResult) return;

        if (this.showingResult) {
            return;
        }

        // Auto-complete unclosed brackets before evaluating
        const expression = this.autoCloseBrackets(this.input);
        const result = this.engine.evaluate(expression);

        if (result.error) {
            this.error = result.error;
            this.displayResultEl.textContent = result.error;
            this.displayResultEl.classList.add('error');
            this.showingResult = true;
            return;
        }

        this.displayResultEl.classList.remove('error');

        // Expression stays in INPUT area (top-left), render with math formatting
        const isMath = this.engine.inputOutput.startsWith('MathI');
        if (isMath && typeof katex !== 'undefined') {
            const inputLatex = this.exprToLatex(this.formatInputDisplay(expression));
            this.renderKatex(this.displayInputEl, inputLatex);
        } else if (isMath) {
            this.displayInputEl.innerHTML = this.formatMathDisplay(this.formatInputDisplay(expression));
        } else {
            this.displayInputEl.textContent = this.formatInputDisplay(expression);
        }

        // Result goes in OUTPUT area (bottom-right)
        // In MathI/MathO mode, try to show exact forms: √, π, fraction
        let resultStr = result.display;
        if (this.engine.inputOutput === 'MathI/MathO') {
            const val = result.value;
            let found = false;

            // 1. Try sqrt form first (for irrational results like √24 → 2√6)
            if (!found) {
                const sqrtRep = this.trySquareRoot(val);
                if (sqrtRep) { resultStr = sqrtRep; found = true; }
            }

            // 2. Try pi form (for π-related results)
            if (!found) {
                const piRep = this.tryPiForm(val);
                if (piRep) { resultStr = piRep; found = true; }
            }

            // 3. Try fraction (for rational results)
            if (!found) {
                const frac = this.engine.toFraction(val);
                if (frac && frac.den !== 1 && frac.den <= 9999) {
                    if (this.engine.fractionResult === 'ab/c' && frac.whole !== 0) {
                        resultStr = `${frac.whole} ${Math.abs(frac.num)}/${frac.den}`;
                    } else {
                        const totalNum = frac.whole * frac.den + frac.num;
                        resultStr = `${totalNum}/${frac.den}`;
                    }
                    found = true;
                }
            }
        }
        // Store result string and mode info in history for later navigation
        this.lastResultStr = resultStr;
        if (this.engine.history.length > 0) {
            const lastEntry = this.engine.history[this.engine.history.length - 1];
            lastEntry.displayStr = resultStr;
            lastEntry.ioMode = this.engine.inputOutput;
        }

        if (isMath && typeof katex !== 'undefined') {
            this.renderKatex(this.displayResultEl, this.resultToLatex(resultStr));
        } else if (isMath) {
            this.displayResultEl.innerHTML = this.formatMathDisplay(resultStr);
        } else {
            this.displayResultEl.textContent = resultStr;
        }
        this.showingResult = true;
        this.justEvaluated = true;
        this.resultDisplayMode = 'exact';

        this.updateIndicators();
    }

    calculateApprox() {
        // SHIFT + = : show decimal approximation
        if (!this.input && !this.showingResult) return;
        const isMath = this.engine.inputOutput.startsWith('MathI');
        const useKatex = isMath && typeof katex !== 'undefined';

        if (this.showingResult) {
            // Convert current result to decimal
            const val = this.engine.ans;
            this.renderResultDisplay(this.displayResultEl, this.engine.formatResult(val), isMath);
            this.resultDisplayMode = 'decimal';
            return;
        }

        const expr = this.autoCloseBrackets(this.input);
        const result = this.engine.evaluate(expr);
        if (result.error) {
            this.error = result.error;
            this.displayResultEl.textContent = result.error;
            this.displayResultEl.classList.add('error');
            return;
        }

        this.displayResultEl.classList.remove('error');
        if (useKatex) {
            this.renderKatex(this.displayInputEl, this.exprToLatex(this.formatInputDisplay(this.input)));
        } else {
            this.displayInputEl.textContent = this.formatInputDisplay(this.input);
        }
        this.renderResultDisplay(this.displayResultEl, result.display, isMath);
        this.showingResult = true;
        this.justEvaluated = true;
    }

    // === Toggle S⇔D ===
    // Toggles between exact form (fraction/√/π) and decimal form
    toggleSD() {
        if (!this.showingResult) return;
        const val = this.engine.ans;
        const isMath = this.engine.inputOutput.startsWith('MathI');

        if (this.resultDisplayMode === 'exact') {
            // Switch to decimal
            this.renderResultDisplay(this.displayResultEl, this.engine.formatResult(val), isMath);
            this.resultDisplayMode = 'decimal';
        } else {
            // Switch back to exact form
            let exactStr = null;

            // Try sqrt
            const sqrtRep = this.trySquareRoot(val);
            if (sqrtRep) exactStr = sqrtRep;

            // Try pi
            if (!exactStr) {
                const piRep = this.tryPiForm(val);
                if (piRep) exactStr = piRep;
            }

            // Try fraction
            if (!exactStr) {
                const frac = this.engine.toFraction(val);
                if (frac && frac.den !== 1 && frac.den <= 9999) {
                    if (this.engine.fractionResult === 'ab/c' && frac.whole !== 0) {
                        exactStr = `${frac.whole} ${Math.abs(frac.num)}/${frac.den}`;
                    } else {
                        const totalNum = frac.whole * frac.den + frac.num;
                        exactStr = `${totalNum}/${frac.den}`;
                    }
                }
            }

            if (exactStr) {
                this.lastResultStr = exactStr;
                this.renderResultDisplay(this.displayResultEl, exactStr, isMath);
                this.resultDisplayMode = 'exact';
            }
        }
    }

    trySquareRoot(val) {
        // Try to express as a√b in SIMPLEST form (smallest radicand b)
        // Skip if value is integer (no need for √ form) or too large
        if (Number.isInteger(val) || Math.abs(val) > 1e6 || Math.abs(val) < 1e-6) return null;
        // Only try for values that could reasonably be expressed as a√b
        let bestA = 0, bestB = 0;
        for (let a = 1; a <= 100; a++) {
            const sq = (val / a) * (val / a);
            const b = Math.round(sq);
            if (b > 1 && b < 10000 && !Number.isInteger(Math.sqrt(b)) &&
                Math.abs(a * Math.sqrt(b) - Math.abs(val)) < 1e-9) {
                if (bestB === 0 || b < bestB) {
                    bestA = a;
                    bestB = b;
                }
            }
        }
        if (bestB > 0) {
            const sign = val < 0 ? '-' : '';
            return bestA === 1 ? `${sign}√${bestB}` : `${sign}${bestA}√${bestB}`;
        }
        return null;
    }

    tryPiForm(val) {
        const ratio = val / Math.PI;
        const frac = this.engine.toFraction(ratio, 1000);
        if (frac && Math.abs(ratio - (frac.whole * frac.den + frac.num) / frac.den) < 1e-9) {
            if (frac.den === 1) {
                const n = frac.whole || frac.num;
                if (n === 1) return 'π';
                if (n === -1) return '-π';
                return `${n}π`;
            }
            const totalNum = frac.whole * frac.den + frac.num;
            if (totalNum === 1) return `π/${frac.den}`;
            if (totalNum === -1) return `-π/${frac.den}`;
            return `${totalNum}π/${frac.den}`;
        }
        return null;
    }

    toggleFractionType() {
        if (!this.showingResult) return;
        // Toggle between improper (d/c) and mixed (ab/c) fraction
        this.engine.fractionResult = this.engine.fractionResult === 'd/c' ? 'ab/c' : 'd/c';
        // Force re-render as exact form with new fraction type
        this.resultDisplayMode = 'decimal'; // Reset so toggleSD switches to exact
        this.toggleSD();
    }

    // === Memory functions ===
    memoryPlus() {
        let val;
        if (this.showingResult) {
            val = this.engine.ans;
        } else if (this.input) {
            const result = this.engine.evaluate(this.input);
            if (result.error) return;
            val = result.value;
            this.displayInputEl.textContent = this.formatInputDisplay(this.input);
            this.displayResultEl.textContent = result.display;
            this.showingResult = true;
            this.justEvaluated = true;
        } else {
            return;
        }
        this.engine.variables.M += val;
        this.updateIndicators();
    }

    memoryMinus() {
        let val;
        if (this.showingResult) {
            val = this.engine.ans;
        } else if (this.input) {
            const result = this.engine.evaluate(this.input);
            if (result.error) return;
            val = result.value;
        } else {
            return;
        }
        this.engine.variables.M -= val;
        this.updateIndicators();
    }

    enterStoMode() {
        this.stoMode = true;
        this.indSto.classList.remove('hidden');
        // Calculate current expression first if needed
        if (this.input && !this.showingResult) {
            this.calculate();
        }
    }

    handleStoKey(key) {
        this.stoMode = false;
        this.indSto.classList.add('hidden');

        const varMap = {
            'negate': 'A', 'dms': 'B', 'reciprocal': 'C',
            'sin': 'D', 'cos': 'E', 'tan': 'F',
            'mplus': 'M', 'rparen': 'x', 'sd': 'y'
        };

        if (varMap[key]) {
            this.engine.variables[varMap[key]] = this.engine.ans;
            this.updateIndicators();
        }
    }

    showRecall() {
        // Show variable values
        this.menuOpen = true;
        this.menuType = 'recall';
        const vars = this.engine.variables;
        this.displayInputEl.textContent = 'Variables:';
        let display = '';
        for (const [k, v] of Object.entries(vars)) {
            display += `${k}=${v}  `;
        }
        this.displayResultEl.textContent = display;
        this.menuItems = Object.keys(vars);
        this.menuSelection = 0;
        this.showRecallScreen();
    }

    showRecallScreen() {
        const vars = this.engine.variables;
        const keys = Object.keys(vars);
        const selected = keys[this.menuSelection];
        let lines = [];
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const prefix = i === this.menuSelection ? '▸' : ' ';
            lines.push(`${prefix}${k}: ${vars[k]}`);
        }
        this.displayInputEl.textContent = 'RECALL';
        this.displayResultEl.textContent = lines.slice(Math.max(0, this.menuSelection - 2), this.menuSelection + 3).join('\n');
        this.displayResultEl.style.fontSize = '11px';
        this.displayResultEl.style.whiteSpace = 'pre';
        this.displayResultEl.style.textAlign = 'left';
    }

    // === Prime factorization ===
    primeFactorize() {
        if (!this.showingResult) return;
        const val = this.engine.ans;
        if (!Number.isInteger(val) || val <= 0) return;
        const factors = this.engine.primeFactorize(val);
        if (factors) {
            // Count factors
            const counts = {};
            factors.forEach(f => { counts[f] = (counts[f] || 0) + 1; });
            const display = Object.entries(counts)
                .map(([base, exp]) => exp > 1 ? `${base}^${exp}` : base)
                .join('×');
            this.displayResultEl.textContent = display;
        }
    }

    // === Engineering notation ===
    // ENG key: converts to engineering notation, each press shifts exponent by -3
    // Real calculator behavior: 2500000000 → 2.5×10^9 → 2500×10^6 → 2500000×10^3 → 2500000000×10^0
    engineeringNotation() {
        if (!this.showingResult) return;
        const val = this.engine.ans;
        if (val === 0) return;

        const current = this.displayResultEl.textContent.replace(/\s/g, '');
        let currentExp;

        if (current.includes('×10^')) {
            currentExp = parseInt(current.split('×10^')[1]);
        } else {
            // First press: find the appropriate engineering exponent
            const absVal = Math.abs(val);
            if (absVal >= 1) {
                currentExp = Math.floor(Math.log10(absVal));
                currentExp = currentExp - (currentExp % 3); // Round down to multiple of 3
                currentExp += 3; // Will be decremented below
            } else {
                currentExp = Math.floor(Math.log10(absVal));
                currentExp = currentExp - ((currentExp % 3) + 3) % 3; // Round down to multiple of 3
                currentExp += 3;
            }
        }

        // Shift: decrease exponent by 3
        const newExp = currentExp - 3;
        let mantissa = val / Math.pow(10, newExp);
        mantissa = parseFloat(mantissa.toPrecision(10));

        const sep = this.engine.digitSeparator;
        let mantissaStr = mantissa.toString();
        if (sep) mantissaStr = this.engine.addDigitSeparator(mantissaStr);

        if (newExp === 0) {
            this.displayResultEl.textContent = mantissaStr;
        } else {
            this.displayResultEl.textContent = `${mantissaStr}×10^${newExp}`;
        }
    }

    // SHIFT+ENG: shift exponent +3 (move decimal left)
    engineeringLeft() {
        if (!this.showingResult) return;
        const val = this.engine.ans;
        if (val === 0) return;

        const current = this.displayResultEl.textContent.replace(/\s/g, '');
        let currentExp = 0;

        if (current.includes('×10^')) {
            currentExp = parseInt(current.split('×10^')[1]);
        }

        const newExp = currentExp + 3;
        let mantissa = val / Math.pow(10, newExp);
        mantissa = parseFloat(mantissa.toPrecision(10));

        const sep = this.engine.digitSeparator;
        let mantissaStr = mantissa.toString();
        if (sep) mantissaStr = this.engine.addDigitSeparator(mantissaStr);

        if (newExp === 0) {
            this.displayResultEl.textContent = mantissaStr;
        } else {
            this.displayResultEl.textContent = `${mantissaStr}×10^${newExp}`;
        }
    }

    // === Random ===
    inputRandom() {
        const val = this.engine.random();
        this.input = val.toString();
        this.displayInput = val.toString();
        this.engine.ans = val;
        this.displayInputEl.textContent = 'Ran#';
        this.displayResultEl.textContent = val.toString();
        this.showingResult = true;
        this.justEvaluated = true;
    }

    inputRandomInt() {
        // Show RanInt( prompt
        this.inputFunc('RanInt(');
    }

    inputRound() {
        this.inputFunc('Rnd(');
    }

    // === Navigation ===
    handleUp() {
        if (this.menuOpen) {
            if (this.menuSelection > 0) {
                this.menuSelection--;
                this.renderMenu();
            }
            return;
        }
        // History navigation - go back
        if (this.engine.history.length > 0) {
            if (this.engine.historyIndex > 0) {
                this.engine.historyIndex--;
            }
            const entry = this.engine.history[this.engine.historyIndex];
            if (entry) {
                this.renderHistoryEntry(entry);
            }
        }
    }

    handleDown() {
        if (this.menuOpen) {
            if (this.menuSelection < this.menuItems.length - 1) {
                this.menuSelection++;
                this.renderMenu();
            }
            return;
        }
        // History navigation - go forward
        if (this.engine.historyIndex < this.engine.history.length - 1) {
            this.engine.historyIndex++;
            const entry = this.engine.history[this.engine.historyIndex];
            if (entry) {
                this.renderHistoryEntry(entry);
            }
        }
    }

    // Render a history entry with KaTeX support
    renderHistoryEntry(entry) {
        // Use stored ioMode from when entry was computed, fall back to current mode
        const entryMode = entry.ioMode || this.engine.inputOutput;
        const isMath = entryMode.startsWith('MathI');
        const useKatex = isMath && typeof katex !== 'undefined';

        // Render expression
        if (useKatex) {
            this.renderKatex(this.displayInputEl, this.exprToLatex(this.formatInputDisplay(entry.expression)));
        } else if (isMath) {
            this.displayInputEl.innerHTML = this.formatMathDisplay(this.escapeHtml(this.formatInputDisplay(entry.expression)));
        } else {
            this.displayInputEl.textContent = this.formatInputDisplay(entry.expression);
        }

        // Render result — use stored exact form if available, else compute fresh
        let resultDisplay = entry.displayStr;
        if (!resultDisplay) {
            // Re-compute exact form for older history entries
            const val = entry.result;
            if (entryMode === 'MathI/MathO') {
                const sqrtRep = this.trySquareRoot(val);
                if (sqrtRep) { resultDisplay = sqrtRep; }
                else {
                    const piRep = this.tryPiForm(val);
                    if (piRep) { resultDisplay = piRep; }
                    else {
                        const frac = this.engine.toFraction(val);
                        if (frac && frac.den !== 1 && frac.den <= 9999) {
                            if (this.engine.fractionResult === 'ab/c' && frac.whole !== 0) {
                                resultDisplay = `${frac.whole} ${Math.abs(frac.num)}/${frac.den}`;
                            } else {
                                const totalNum = frac.whole * frac.den + frac.num;
                                resultDisplay = `${totalNum}/${frac.den}`;
                            }
                        }
                    }
                }
            }
            if (!resultDisplay) resultDisplay = this.engine.formatResult(entry.result);
        }

        if (useKatex) {
            this.renderKatex(this.displayResultEl, this.resultToLatex(resultDisplay));
        } else if (isMath) {
            this.displayResultEl.innerHTML = this.formatMathDisplay(resultDisplay);
        } else {
            this.displayResultEl.textContent = resultDisplay;
        }

        this.input = entry.expression;
        this.displayInput = entry.expression;
        this.cursorPos = entry.expression.length;
        this.showingResult = true;
        this.justEvaluated = true;
    }

    handleLeft() {
        if (this.menuOpen) return;
        if (this.showingResult) {
            // Return to editing mode with cursor at end
            this.showingResult = false;
            this.justEvaluated = false;
            this.cursorPos = this.displayInput.length;
            this.updateDisplay();
            return;
        }
        // Move cursor left
        if (this.cursorPos > 0) {
            // Skip over multi-char tokens
            const multiTokens = ['sin(', 'cos(', 'tan(', 'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
                'ln(', 'log(', '10^(', 'e^(', '√(', '³√(', 'Abs(', 'Pol(', 'Rec(',
                '×10^', 'Ans', 'nPr', 'nCr', 'd/dx(', '∫(', 'Σ(', 'RanInt(',
                'sinh(', 'cosh(', 'tanh(', 'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹(', 'Rnd('];
            let moved = false;
            for (const tok of multiTokens) {
                if (this.displayInput.substring(0, this.cursorPos).endsWith(tok)) {
                    this.cursorPos -= tok.length;
                    moved = true;
                    break;
                }
            }
            if (!moved) this.cursorPos--;
            this.updateDisplay();
        }
    }

    handleRight() {
        if (this.menuOpen) return;
        if (this.showingResult) {
            this.showingResult = false;
            this.justEvaluated = false;
            this.cursorPos = this.displayInput.length;
            this.updateDisplay();
            return;
        }
        // Move cursor right
        if (this.cursorPos < this.displayInput.length) {
            const multiTokens = ['sin(', 'cos(', 'tan(', 'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
                'ln(', 'log(', '10^(', 'e^(', '√(', '³√(', 'Abs(', 'Pol(', 'Rec(',
                '×10^', 'Ans', 'nPr', 'nCr', 'd/dx(', '∫(', 'Σ(', 'RanInt(',
                'sinh(', 'cosh(', 'tanh(', 'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹(', 'Rnd('];
            let moved = false;
            for (const tok of multiTokens) {
                if (this.displayInput.substring(this.cursorPos).startsWith(tok)) {
                    this.cursorPos += tok.length;
                    moved = true;
                    break;
                }
            }
            if (!moved) this.cursorPos++;
            this.updateDisplay();
        } else {
            // Cursor at end — auto-close one unclosed bracket if any exist
            this.autoCloseOneBracket();
        }
    }

    // Auto-close one unclosed function bracket at cursor (for → key at end of expression)
    // Mimics real Casio behavior: pressing → exits the current function scope
    autoCloseOneBracket() {
        const expr = this.input.substring(0, this.cursorPos);
        let openCount = 0;
        for (let i = 0; i < expr.length; i++) {
            if (expr[i] === '(') openCount++;
            else if (expr[i] === ')') openCount--;
        }
        if (openCount > 0) {
            // Insert one closing bracket at cursor
            this.input = this.input.substring(0, this.cursorPos) + ')' + this.input.substring(this.cursorPos);
            this.displayInput = this.displayInput.substring(0, this.cursorPos) + ')' + this.displayInput.substring(this.cursorPos);
            this.cursorPos++;
            this.updateDisplay();
        }
    }

    // === Menu system ===
    openMainMenu() {
        this.menuOpen = true;
        this.menuType = 'main';
        this.menuSelection = 0;
        this.menuItems = [
            { id: '1', name: 'Calculate' },
            { id: '2', name: 'Complex' },
            { id: '3', name: 'Base-N' },
            { id: '4', name: 'Matrix' },
            { id: '5', name: 'Vector' },
            { id: '6', name: 'Statistics' },
            { id: '7', name: 'Distribution' },
            { id: '8', name: 'Spreadsheet' },
            { id: '9', name: 'Table' },
            { id: 'A', name: 'Equation/Func' },
            { id: 'B', name: 'Inequality' },
            { id: 'C', name: 'Ratio' },
        ];
        this.menuPage = 0;
        this.renderMenu();
    }

    openSetupMenu() {
        this.menuOpen = true;
        this.menuType = 'setup';
        this.menuSelection = 0;
        this.menuItems = [
            { id: 1, name: 'Input/Output', value: this.engine.inputOutput },
            { id: 2, name: 'Angle Unit', value: this.engine.angleUnit },
            { id: 3, name: 'Number Format', value: `${this.engine.numberFormat.type} ${this.engine.numberFormat.value}` },
            { id: 4, name: 'Engineer Symbol', value: this.engine.engineerSymbol ? 'On' : 'Off' },
            { id: 5, name: 'Fraction Result', value: this.engine.fractionResult },
            { id: 6, name: 'Complex', value: this.engine.complexFormat },
            { id: 7, name: 'Digit Separator', value: this.engine.digitSeparator ? 'On' : 'Off' },
            { id: 8, name: 'Statistics', value: this.engine.statFrequency ? 'Freq On' : 'Freq Off' },
            { id: 9, name: 'Table', value: this.engine.tableUseGx ? 'f(x),g(x)' : 'f(x)' },
        ];
        this.renderMenu();
    }

    openOptionsMenu() {
        // OPTN menu - context-dependent based on current mode
        this.menuOpen = true;
        this.menuType = 'optn';
        this.menuSelection = 0;

        // Check if current mode handler provides a custom OPTN menu
        if (this.modeHandler) {
            const modeMenu = this.modeHandler.getOptnMenu();
            if (modeMenu) {
                this.menuItems = modeMenu;
                this.renderMenu();
                return;
            }
        }

        // Default OPTN menu for Calculate mode
        this.menuItems = [
            { id: 1, name: 'Hyperbolic Func' },
            { id: 2, name: 'Angle Unit' },
            { id: 3, name: 'Engineer Symbol' },
        ];
        this.renderMenu();
    }

    openConstMenu() {
        // Scientific constants menu (simplified)
        this.menuOpen = true;
        this.menuType = 'const';
        this.menuSelection = 0;
        this.menuItems = [
            { id: 1, name: 'Proton mass', value: '1.67262192×10^-27' },
            { id: 2, name: 'Neutron mass', value: '1.67492750×10^-27' },
            { id: 3, name: 'Electron mass', value: '9.10938370×10^-31' },
            { id: 4, name: 'Speed of light', value: '299792458' },
            { id: 5, name: 'Planck constant', value: '6.62607015×10^-34' },
            { id: 6, name: 'Boltzmann const', value: '1.380649×10^-23' },
            { id: 7, name: 'Avogadro number', value: '6.02214076×10^23' },
            { id: 8, name: 'Gas constant', value: '8.314462618' },
            { id: 9, name: 'Gravity accel', value: '9.80665' },
            { id: 10, name: 'Elementary charge', value: '1.602176634×10^-19' },
        ];
        this.renderMenu();
    }

    openConvMenu() {
        // Metric conversion - category menu (matching real fx-991EX)
        this.menuOpen = true;
        this.menuType = 'conv-cat';
        this.menuSelection = 0;
        this.menuItems = [
            { id: 1, name: 'Length' },
            { id: 2, name: 'Area' },
            { id: 3, name: 'Volume' },
            { id: 4, name: 'Mass' },
            { id: 5, name: 'Velocity' },
            { id: 6, name: 'Pressure' },
            { id: 7, name: 'Energy' },
            { id: 8, name: 'Power' },
            { id: 9, name: 'Temperature' },
        ];
        this.renderMenu();
    }

    // Complete conversion data based on NIST Special Publication 811 (2008)
    getConversionItems(category) {
        const convData = {
            'Length': [
                { id: 1, name: 'in▸cm', from: 'in', to: 'cm', factor: 2.54 },
                { id: 2, name: 'cm▸in', from: 'cm', to: 'in', factor: 1/2.54 },
                { id: 3, name: 'ft▸m', from: 'ft', to: 'm', factor: 0.3048 },
                { id: 4, name: 'm▸ft', from: 'm', to: 'ft', factor: 1/0.3048 },
                { id: 5, name: 'yd▸m', from: 'yd', to: 'm', factor: 0.9144 },
                { id: 6, name: 'm▸yd', from: 'm', to: 'yd', factor: 1/0.9144 },
                { id: 7, name: 'mile▸km', from: 'mile', to: 'km', factor: 1.609344 },
                { id: 8, name: 'km▸mile', from: 'km', to: 'mile', factor: 1/1.609344 },
                { id: 9, name: 'n mile▸m', from: 'n mile', to: 'm', factor: 1852 },
                { id: 'A', name: 'm▸n mile', from: 'm', to: 'n mile', factor: 1/1852 },
                { id: 'B', name: 'pc▸km', from: 'pc', to: 'km', factor: 3.0857e13 },
                { id: 'C', name: 'km▸pc', from: 'km', to: 'pc', factor: 1/3.0857e13 },
            ],
            'Area': [
                { id: 1, name: 'acre▸m²', factor: 4046.8564224 },
                { id: 2, name: 'm²▸acre', factor: 1/4046.8564224 },
            ],
            'Volume': [
                { id: 1, name: 'gal(US)▸L', factor: 3.785411784 },
                { id: 2, name: 'L▸gal(US)', factor: 1/3.785411784 },
                { id: 3, name: 'gal(UK)▸L', factor: 4.54609 },
                { id: 4, name: 'L▸gal(UK)', factor: 1/4.54609 },
            ],
            'Mass': [
                { id: 1, name: 'oz▸g', factor: 28.349523125 },
                { id: 2, name: 'g▸oz', factor: 1/28.349523125 },
                { id: 3, name: 'lb▸kg', factor: 0.45359237 },
                { id: 4, name: 'kg▸lb', factor: 1/0.45359237 },
            ],
            'Velocity': [
                { id: 1, name: 'm/s▸km/h', factor: 3.6 },
                { id: 2, name: 'km/h▸m/s', factor: 1/3.6 },
            ],
            'Pressure': [
                { id: 1, name: 'atm▸Pa', factor: 101325 },
                { id: 2, name: 'Pa▸atm', factor: 1/101325 },
                { id: 3, name: 'mmHg▸Pa', factor: 133.322387415 },
                { id: 4, name: 'Pa▸mmHg', factor: 1/133.322387415 },
            ],
            'Energy': [
                { id: 1, name: 'J▸cal', factor: 1/4.1868, special: null },
                { id: 2, name: 'cal▸J', factor: 4.1868, special: null },
                { id: 3, name: 'J▸eV', factor: 1/1.602176634e-19 },
                { id: 4, name: 'eV▸J', factor: 1.602176634e-19 },
            ],
            'Power': [
                { id: 1, name: 'hp▸kW', factor: 0.745699872 },
                { id: 2, name: 'kW▸hp', factor: 1/0.745699872 },
            ],
            'Temperature': [
                { id: 1, name: '°F▸°C', special: 'FtoC' },
                { id: 2, name: '°C▸°F', special: 'CtoF' },
            ],
        };
        return convData[category] || [];
    }

    applyConversion(item) {
        if (!this.showingResult && !this.input) return;

        // If there's an expression but no result yet, evaluate first
        if (!this.showingResult && this.input) {
            this.calculate();
        }

        const val = this.engine.ans;
        let result;

        if (item.special === 'FtoC') {
            result = (val - 32) * 5 / 9;
        } else if (item.special === 'CtoF') {
            result = val * 9 / 5 + 32;
        } else {
            result = val * item.factor;
        }

        this.engine.ans = result;

        // Display: show conversion in input, result in output
        const convName = item.name || '';
        this.displayInputEl.textContent = this.engine.formatResult(val) + convName;
        this.displayResultEl.textContent = this.engine.formatResult(result);
        this.showingResult = true;
        this.justEvaluated = true;
    }

    openResetMenu() {
        this.menuOpen = true;
        this.menuType = 'reset';
        this.menuSelection = 0;
        this.menuItems = [
            { id: 1, name: 'Setup Data' },
            { id: 2, name: 'Memory' },
            { id: 3, name: 'Initialize All' },
        ];
        this.renderMenu();
    }

    openCalcMode() {
        // CALC mode - variable substitution
        // Evaluate expression with user-specified variable values
        if (!this.input) return;
        this.calcExpression = this.input;
        this.calcVars = this.extractVariables(this.input);
        if (this.calcVars.length === 0) {
            // No variables, just calculate
            this.calculate();
            return;
        }
        this.calcVarIndex = 0;
        this.calcVarValues = {};
        this.calcVars.forEach(v => { this.calcVarValues[v] = this.engine.variables[v] || 0; });
        this.calcPhase = 'input'; // 'input' or 'result'
        this.calcEditBuffer = '';
        this.renderCalcScreen();
    }

    extractVariables(expr) {
        const vars = new Set();
        const varPattern = /(?<![a-zA-Z])([A-Fxy])(?![a-zA-Z(])/g;
        let match;
        while ((match = varPattern.exec(expr)) !== null) {
            vars.add(match[1]);
        }
        // Also check for 'M' standalone
        if (/(?<![a-zA-Z])M(?![a-zA-Z+(])/.test(expr)) vars.add('M');
        return [...vars];
    }

    renderCalcScreen() {
        const isMath = this.engine.inputOutput.startsWith('MathI');
        const useKatex = isMath && typeof katex !== 'undefined';
        // Show expression at top
        if (useKatex) {
            this.renderKatex(this.displayInputEl, this.exprToLatex(this.calcExpression));
        } else if (isMath) {
            this.displayInputEl.innerHTML = this.formatMathDisplay(this.escapeHtml(this.calcExpression));
        } else {
            this.displayInputEl.textContent = this.calcExpression;
        }
        // Show current variable input
        const v = this.calcVars[this.calcVarIndex];
        const val = this.calcEditBuffer !== '' ? this.calcEditBuffer : this.engine.formatResult(this.calcVarValues[v]);
        if (useKatex) {
            const varLatex = v + ' = ' + val;
            this.renderKatex(this.displayResultEl, varLatex + '\\htmlClass{katex-cursor}{\\rule[-0.2em]{1.5px}{1.1em}}');
        } else {
            this.displayResultEl.innerHTML = `<div style="font-size:0.85em;text-align:left;">${v} = ${val}<span class="lcd-cursor"></span></div>`;
        }
    }

    handleCalcKey(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.calcEditBuffer += key === 'dot' ? '.' : key;
            this.renderCalcScreen();
            return true;
        }
        if (key === 'negate' || key === 'subtract') {
            if (this.calcEditBuffer.startsWith('-')) this.calcEditBuffer = this.calcEditBuffer.slice(1);
            else this.calcEditBuffer = '-' + this.calcEditBuffer;
            this.renderCalcScreen();
            return true;
        }
        if (key === 'del') {
            this.calcEditBuffer = this.calcEditBuffer.slice(0, -1);
            this.renderCalcScreen();
            return true;
        }
        if (key === 'equals') {
            // Save current var value
            if (this.calcEditBuffer !== '') {
                const val = parseFloat(this.calcEditBuffer);
                if (!isNaN(val)) {
                    const v = this.calcVars[this.calcVarIndex];
                    this.calcVarValues[v] = val;
                    this.engine.variables[v] = val;
                }
                this.calcEditBuffer = '';
            }
            if (this.calcVarIndex < this.calcVars.length - 1) {
                this.calcVarIndex++;
                this.renderCalcScreen();
            } else {
                // All variables set, evaluate
                const result = this.engine.evaluate(this.calcExpression);
                if (result.error) {
                    this.displayResultEl.textContent = result.error;
                    this.displayResultEl.classList.add('error');
                } else {
                    this.displayResultEl.textContent = result.display;
                }
                this.calcPhase = 'result';
                this.showingResult = true;
                this.justEvaluated = true;
            }
            return true;
        }
        if (key === 'ac') {
            this.calcPhase = null;
            this.updateDisplay();
            return true;
        }
        return true;
    }

    openSolve() {
        // SOLVE mode - Newton's method equation solver
        if (!this.input) return;
        this.solveExpression = this.input;
        // Extract all variables from the expression
        this.solveVars = this.extractVariables(this.input);
        if (this.solveVars.length === 0) {
            // No variables to solve for
            return;
        }
        this.solveVarValues = {};
        this.solveVars.forEach(v => { this.solveVarValues[v] = this.engine.variables[v] || 0; });
        this.solveVarIndex = 0;
        this.solveEditBuffer = '';
        this.solvePhase = 'input'; // 'input' or 'result'
        this.solveTarget = this.solveVars[0]; // Variable to solve for
        this.renderSolveScreen();
    }

    renderSolveScreen() {
        const isMath = this.engine.inputOutput.startsWith('MathI');
        const useKatex = isMath && typeof katex !== 'undefined';
        // Show equation at top
        let exprDisplay = this.solveExpression;
        // If expression doesn't contain '=', treat as f(x)=0
        if (!exprDisplay.includes('=')) exprDisplay += '=0';
        if (useKatex) {
            this.renderKatex(this.displayInputEl, this.exprToLatex(exprDisplay));
        } else if (isMath) {
            this.displayInputEl.innerHTML = this.formatMathDisplay(this.escapeHtml(exprDisplay));
        } else {
            this.displayInputEl.textContent = exprDisplay;
        }

        if (this.solvePhase === 'input') {
            const v = this.solveVars[this.solveVarIndex];
            const val = this.solveEditBuffer !== '' ? this.solveEditBuffer : this.engine.formatResult(this.solveVarValues[v]);
            if (useKatex) {
                const varLatex = v + '=' + val;
                this.renderKatex(this.displayResultEl, varLatex + '\\htmlClass{katex-cursor}{\\rule[-0.2em]{1.5px}{1.1em}}');
            } else {
                this.displayResultEl.innerHTML = `<div style="font-size:0.8em;text-align:left;font-weight:700;">${v} =${val}<span class="lcd-cursor"></span></div>`;
            }
        } else if (this.solvePhase === 'result') {
            // Show solution with L-R verification
            const v = this.solveTarget;
            const sol = this.solveVarValues[v];
            const lr = this.solveLR || 0;
            const solStr = this.engine.formatResult(sol);
            const lrStr = this.engine.formatResult(lr);
            if (useKatex) {
                const latex = v + '=' + this.resultToLatex(solStr) +
                    '\\\\\\text{L−R}=' + this.resultToLatex(lrStr);
                this.renderKatex(this.displayResultEl, latex);
            } else {
                this.displayResultEl.innerHTML =
                    `<div style="font-size:0.75em;text-align:left;font-weight:700;line-height:1.4;">` +
                    `${v}=<span style="float:right;">${solStr}</span><br>` +
                    `L−R=<span style="float:right;">${lrStr}</span></div>`;
            }
        }
    }

    handleSolveKey(key) {
        if (this.solvePhase === 'result') {
            if (key === 'ac') {
                this.solvePhase = null;
                this.clearAll();
                return true;
            }
            if (key === 'left' || key === 'right') {
                // Exit SOLVE result, return to editing the expression
                this.solvePhase = null;
                this.input = this.solveExpression;
                this.displayInput = this.solveExpression;
                this.showingResult = false;
                this.justEvaluated = false;
                this.cursorPos = key === 'left'
                    ? Math.max(0, this.displayInput.length - 1)
                    : this.displayInput.length;
                this.updateDisplay();
                return true;
            }
            return true;
        }
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.solveEditBuffer += key === 'dot' ? '.' : key;
            this.renderSolveScreen();
            return true;
        }
        if (key === 'negate' || key === 'subtract') {
            if (this.solveEditBuffer.startsWith('-')) this.solveEditBuffer = this.solveEditBuffer.slice(1);
            else this.solveEditBuffer = '-' + this.solveEditBuffer;
            this.renderSolveScreen();
            return true;
        }
        if (key === 'del') {
            this.solveEditBuffer = this.solveEditBuffer.slice(0, -1);
            this.renderSolveScreen();
            return true;
        }
        if (key === 'up') {
            if (this.solveVarIndex > 0) {
                this.saveCurrentSolveVar();
                this.solveVarIndex--;
                this.solveEditBuffer = '';
                this.renderSolveScreen();
            }
            return true;
        }
        if (key === 'down') {
            if (this.solveVarIndex < this.solveVars.length - 1) {
                this.saveCurrentSolveVar();
                this.solveVarIndex++;
                this.solveEditBuffer = '';
                this.renderSolveScreen();
            }
            return true;
        }
        if (key === 'equals') {
            this.saveCurrentSolveVar();
            if (this.solveVarIndex < this.solveVars.length - 1) {
                this.solveVarIndex++;
                this.solveEditBuffer = '';
                this.renderSolveScreen();
            } else {
                // Execute SOLVE via Newton's method
                this.executeSolve();
            }
            return true;
        }
        if (key === 'ac') {
            this.solvePhase = null;
            this.clearAll();
            return true;
        }
        return true;
    }

    saveCurrentSolveVar() {
        if (this.solveEditBuffer !== '') {
            const val = parseFloat(this.solveEditBuffer);
            if (!isNaN(val)) {
                const v = this.solveVars[this.solveVarIndex];
                this.solveVarValues[v] = val;
                this.engine.variables[v] = val;
            }
            this.solveEditBuffer = '';
        }
    }

    executeSolve() {
        // Set all non-target variables
        for (const [v, val] of Object.entries(this.solveVarValues)) {
            this.engine.variables[v] = val;
        }

        const target = this.solveTarget;
        let expr = this.solveExpression;
        let lhsExpr, rhsExpr;

        // Split on '=' if present
        if (expr.includes('=')) {
            const parts = expr.split('=');
            lhsExpr = parts[0];
            rhsExpr = parts[1] || '0';
        } else {
            lhsExpr = expr;
            rhsExpr = '0';
        }

        // Newton's method: solve f(x) = LHS - RHS = 0
        let x = this.solveVarValues[target] || 0;
        const h = 1e-8;

        const f = (xVal) => {
            this.engine.variables[target] = xVal;
            const lhs = this.engine.evaluate(lhsExpr);
            const rhs = this.engine.evaluate(rhsExpr);
            if (lhs.error || rhs.error) return NaN;
            return lhs.value - rhs.value;
        };

        // Newton iterations
        for (let i = 0; i < 200; i++) {
            const fx = f(x);
            if (isNaN(fx)) break;
            if (Math.abs(fx) < 1e-14) break;

            const fxh = f(x + h);
            const dfx = (fxh - fx) / h;
            if (Math.abs(dfx) < 1e-20) break;

            const dx = fx / dfx;
            x -= dx;
            if (Math.abs(dx) < 1e-14 * Math.max(1, Math.abs(x))) break;
        }

        // Polish solution: snap to clean integer/fraction if extremely close
        x = this.polishSolveResult(x);

        // Compute L-R for verification with polished solution
        this.engine.variables[target] = x;
        const lhsVal = this.engine.evaluate(lhsExpr);
        const rhsVal = this.engine.evaluate(rhsExpr);
        let lr = (lhsVal.error || rhsVal.error) ? NaN : lhsVal.value - rhsVal.value;

        // Round L-R to 0 if negligibly small (floating point noise)
        if (!isNaN(lr) && Math.abs(lr) < 1e-10) lr = 0;

        this.solveVarValues[target] = x;
        this.engine.variables[target] = x;
        this.engine.ans = x;
        this.solveLR = lr;
        this.solvePhase = 'result';
        this.renderSolveScreen();
    }

    // Snap Newton result to clean integer or simple fraction when extremely close
    polishSolveResult(x) {
        // Snap to integer
        const r = Math.round(x);
        if (Math.abs(x - r) < 1e-9) return r;
        // Snap to simple fraction (denominator ≤ 12)
        for (const d of [2, 3, 4, 5, 6, 8, 10, 12]) {
            const n = Math.round(x * d);
            if (Math.abs(x * d - n) < 1e-8) return n / d;
        }
        return x;
    }

    showQR() {
        this.displayInputEl.textContent = 'QR Code';
        this.displayResultEl.textContent = 'Not supported\nin emulator';
    }

    toggleInsert() {
        // Toggle INS mode
    }

    renderMenu() {
        const items = this.menuItems;
        const sel = this.menuSelection;

        // Main menu uses icon grid layout
        if (this.menuType === 'main') {
            this.renderMainMenuGrid();
            return;
        }

        // All other menus use text list layout
        let title = '';
        switch (this.menuType) {
            case 'setup': title = 'SETUP'; break;
            case 'setup-io': title = 'Input/Output'; break;
            case 'setup-angle': title = 'Angle Unit'; break;
            case 'setup-numformat': title = 'Number Format'; break;
            case 'setup-engsym': title = 'Engineer Symbol?'; break;
            case 'setup-fracresult': title = 'Fraction Result'; break;
            case 'setup-complex': title = 'Complex'; break;
            case 'setup-digsep': title = 'Digit Separator?'; break;
            case 'setup-stat': title = 'Frequency?'; break;
            case 'setup-table': title = 'Table'; break;
            case 'stat-var-submenu': title = 'Stat Variable'; break;
            case 'optn-engsym': title = 'Engineer Symbol'; break;
            case 'optn': title = 'OPTN'; break;
            case 'optn-hyp': title = 'Hyperbolic'; break;
            case 'optn-angle': title = 'Angle Unit'; break;
            case 'const': title = 'CONST'; break;
            case 'conv-cat': title = 'CONV'; break;
            case 'conv': title = this.convCategory || 'CONV'; break;
            case 'reset': title = 'RESET'; break;
            case 'recall': title = 'RECALL'; break;
            default: title = 'MENU';
        }

        this.displayInputEl.textContent = title;

        // Show 4 items at a time for text list menus
        const pageSize = 4;
        const startIdx = Math.floor(sel / pageSize) * pageSize;
        const visibleItems = items.slice(startIdx, startIdx + pageSize);

        let html = '<div class="menu-list">';
        visibleItems.forEach((item, idx) => {
            const globalIdx = startIdx + idx;
            const selected = globalIdx === sel ? ' selected' : '';
            const valueStr = item.value ? ` :${item.value}` : '';
            html += `<div class="menu-list-item${selected}">${item.id || globalIdx + 1}:${item.name}${valueStr}</div>`;
        });
        if (startIdx + pageSize < items.length) {
            html += '<div class="menu-list-item" style="text-align:right;font-size:8px;">▼</div>';
        }
        html += '</div>';

        this.displayResultEl.innerHTML = html;
        this.displayResultEl.style.fontSize = '';
        this.displayResultEl.style.whiteSpace = '';
        this.displayResultEl.style.textAlign = 'left';
    }

    renderMainMenuGrid() {
        const items = this.menuItems;
        const sel = this.menuSelection;
        const selectedItem = items[sel];
        const cols = 4;
        const visibleRows = 2;
        const visibleCount = cols * visibleRows;

        // LCD menu page images as cell backgrounds
        // menu_p1.png = items 1-8, menu_p2.png = items 5-12
        const selRow = Math.floor(sel / cols);
        const totalRows = Math.ceil(items.length / cols);
        let startRow = this.menuPage || 0;
        if (selRow < startRow) startRow = selRow;
        if (selRow >= startRow + visibleRows) startRow = selRow - visibleRows + 1;
        startRow = Math.max(0, Math.min(startRow, totalRows - visibleRows));
        this.menuPage = startRow;

        this.displayInputEl.textContent = '';
        const hasUp = startRow > 0;
        const hasDown = startRow + visibleRows < totalRows;
        const scrollArrow = hasUp ? '▲' : (hasDown ? '▼' : '');
        const menuImg = startRow === 0 ? 'icons/menu_p1.png' : 'icons/menu_p2.png';

        // bg-position: col/(cols-1)*100% row/(rows-1)*100%
        const bgPos = [
            ['0% 0%','33.33% 0%','66.67% 0%','100% 0%'],
            ['0% 100%','33.33% 100%','66.67% 100%','100% 100%']
        ];

        const menuImgInv = startRow === 0 ? 'icons/menu_p1_inv.png' : 'icons/menu_p2_inv.png';

        let html = '<div class="menu-grid" style="flex:1;min-height:0;">';
        for (let r = 0; r < visibleRows; r++) {
            for (let c = 0; c < cols; c++) {
                const itemIdx = (startRow + r) * cols + c;
                if (itemIdx >= items.length) {
                    html += '<div class="menu-cell"></div>';
                    continue;
                }
                const isSelected = itemIdx === sel;
                const imgSrc = isSelected ? menuImgInv : menuImg;
                html += `<div class="menu-cell${isSelected ? ' selected' : ''}" style="overflow:hidden;">`;
                html += `<div style="width:100%;height:100%;background-image:url('${imgSrc}');background-size:400% 200%;background-position:${bgPos[r][c]};background-repeat:no-repeat;image-rendering:pixelated;"></div>`;
                html += '</div>';
            }
        }
        html += '</div>';
        html += `<div class="menu-status">${selectedItem.id}:${selectedItem.name}<span style="float:right;">${scrollArrow}</span></div>`;

        // For main menu, use the full LCD body to display the grid
        this.displayInputEl.style.display = 'none';
        this.displayResultEl.style.flex = '1';
        this.displayResultEl.style.display = 'flex';
        this.displayResultEl.style.flexDirection = 'column';
        this.displayResultEl.style.minHeight = '0';
        this.displayResultEl.innerHTML = html;
        this.displayResultEl.style.fontSize = '';
        this.displayResultEl.style.whiteSpace = '';
        this.displayResultEl.style.textAlign = '';
    }

    handleMenuKey(key) {
        const isGrid = this.menuType === 'main';
        const cols = 4;

        // Handle direct number/letter keys for main menu
        if (isGrid) {
            const keyMap = {'0':9,'1':0,'2':1,'3':2,'4':3,'5':4,'6':5,'7':6,'8':7,'9':8};
            // A, B, C via alpha-mapped keys (not active in menu, so handle directly)
            if (keyMap[key] !== undefined && keyMap[key] < this.menuItems.length) {
                this.selectMenuItem(keyMap[key]);
                return;
            }
        }

        switch (key) {
            case 'up':
                if (isGrid) {
                    if (this.menuSelection >= cols) {
                        this.menuSelection -= cols;
                        this.renderMenu();
                    }
                } else {
                    if (this.menuSelection > 0) {
                        this.menuSelection--;
                        if (this.menuType === 'recall') {
                            this.showRecallScreen();
                        } else {
                            this.renderMenu();
                        }
                    }
                }
                return;
            case 'down':
                if (isGrid) {
                    if (this.menuSelection + cols < this.menuItems.length) {
                        this.menuSelection += cols;
                        this.renderMenu();
                    }
                } else {
                    if (this.menuSelection < this.menuItems.length - 1) {
                        this.menuSelection++;
                        if (this.menuType === 'recall') {
                            this.showRecallScreen();
                        } else {
                            this.renderMenu();
                        }
                    }
                }
                return;
            case 'left':
                if (isGrid) {
                    if (this.menuSelection % cols > 0) {
                        this.menuSelection--;
                        this.renderMenu();
                    }
                } else {
                    this.closeMenu();
                }
                return;
            case 'right':
                if (isGrid) {
                    if (this.menuSelection % cols < cols - 1 && this.menuSelection < this.menuItems.length - 1) {
                        this.menuSelection++;
                        this.renderMenu();
                    }
                }
                return;
            case 'ac':
                this.closeMenu();
                return;
            case 'equals':
            case 'center':
                this.selectMenuItem(this.menuSelection);
                return;
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9':
                const numIdx = parseInt(key) - 1;
                if (numIdx < this.menuItems.length) {
                    this.selectMenuItem(numIdx);
                }
                return;
            default:
                return;
        }
    }

    selectMenuItem(index) {
        const item = this.menuItems[index];
        if (!item) return;

        switch (this.menuType) {
            case 'main':
                this.engine.mode = item.name;
                this.closeMenu();
                this.clearAll();
                // Instantiate mode handler
                if (typeof ModeRegistry !== 'undefined' && ModeRegistry[item.name]) {
                    this.modeHandler = new ModeRegistry[item.name](this);
                    this.modeHandler.enter();
                } else {
                    this.modeHandler = null;
                }
                break;

            case 'setup':
                this.handleSetupSelection(index);
                break;

            case 'setup-io':
                const ioModes = ['MathI/MathO', 'MathI/DecimalO', 'LineI/LineO', 'LineI/DecimalO'];
                if (index < ioModes.length) {
                    this.engine.inputOutput = ioModes[index];
                }
                this.closeMenu();
                this.updateIndicators();
                break;

            case 'setup-angle':
                const angles = ['DEG', 'RAD', 'GRAD'];
                if (index < angles.length) {
                    this.engine.angleUnit = angles[index];
                }
                this.closeMenu();
                this.updateIndicators();
                break;

            case 'setup-numformat':
                if (index === 0) {
                    // Fix - need digit input
                    this.engine.numberFormat = { type: 'Fix', value: 3 };
                } else if (index === 1) {
                    this.engine.numberFormat = { type: 'Sci', value: 5 };
                } else {
                    this.engine.numberFormat = { type: 'Norm', value: 1 };
                }
                this.closeMenu();
                this.updateIndicators();
                break;

            case 'setup-engsym':
                this.engine.engineerSymbol = index === 0;
                this.closeMenu();
                this.updateIndicators();
                break;

            case 'setup-fracresult':
                this.engine.fractionResult = index === 0 ? 'd/c' : 'ab/c';
                this.closeMenu();
                break;

            case 'setup-complex':
                this.engine.complexFormat = index === 0 ? 'a+bi' : 'r∠θ';
                this.closeMenu();
                break;

            case 'setup-stat':
                this.engine.statFrequency = index === 0;
                if (this.modeHandler && this.modeHandler.showFreq !== undefined) {
                    this.modeHandler.showFreq = index === 0;
                }
                this.closeMenu();
                break;

            case 'setup-table':
                this.engine.tableUseGx = index === 1;
                if (this.modeHandler && this.modeHandler.useGx !== undefined) {
                    this.modeHandler.useGx = index === 1;
                }
                this.closeMenu();
                break;

            case 'setup-digsep':
                this.engine.digitSeparator = index === 0;
                this.closeMenu();
                // Re-display current result with separator
                if (this.showingResult) {
                    this.displayResultEl.textContent = this.engine.formatResult(this.engine.ans);
                }
                break;

            case 'optn-engsym':
                // Engineering symbol input: k, M, G, T, m, μ, n, p, f
                const engSymbols = ['k', 'M', 'G', 'T', 'm', 'μ', 'n', 'p', 'f'];
                const engFactors = [1e3, 1e6, 1e9, 1e12, 1e-3, 1e-6, 1e-9, 1e-12, 1e-15];
                this.closeMenu();
                if (index < engSymbols.length) {
                    // Insert as multiplication by the factor
                    this.inputChar(engSymbols[index]);
                }
                break;

            case 'optn-hyp':
                const hypFuncs = ['sinh(', 'cosh(', 'tanh(', 'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹('];
                this.closeMenu();
                if (index < hypFuncs.length) {
                    this.inputFunc(hypFuncs[index]);
                }
                break;

            case 'optn-angle':
                const angleSymbols = ['°', 'r', 'g'];
                this.closeMenu();
                if (index < angleSymbols.length) {
                    this.inputChar(angleSymbols[index]);
                }
                break;

            case 'const':
                this.closeMenu();
                if (item.value) {
                    this.input += item.value;
                    this.displayInput += item.value;
                    this.updateDisplay();
                }
                break;

            case 'conv-cat':
                // Selected a conversion category → show its items
                const catNames = ['Length', 'Area', 'Volume', 'Mass', 'Velocity', 'Pressure', 'Energy', 'Power', 'Temperature'];
                if (index < catNames.length) {
                    this.menuType = 'conv';
                    this.menuSelection = 0;
                    this.convCategory = catNames[index];
                    this.menuItems = this.getConversionItems(catNames[index]);
                    this.renderMenu();
                }
                break;

            case 'conv':
                // Selected a specific conversion
                this.closeMenu();
                this.applyConversion(item);
                break;

            case 'reset':
                if (index === 0) {
                    // Setup Data
                    this.engine.angleUnit = 'DEG';
                    this.engine.numberFormat = { type: 'Norm', value: 1 };
                    this.engine.inputOutput = 'MathI/MathO';
                } else if (index === 1) {
                    // Memory
                    this.engine.clearMemory();
                } else if (index === 2) {
                    // Initialize All
                    this.engine.reset();
                }
                this.closeMenu();
                this.clearAll();
                this.updateIndicators();
                break;

            case 'recall':
                this.closeMenu();
                const varName = Object.keys(this.engine.variables)[index];
                if (varName) {
                    this.inputChar(varName);
                }
                break;

            case 'optn':
                this.handleOptnSelection(index);
                break;

            // Mode-specific menu types
            case 'stat-type':
                this.closeMenu();
                if (this.modeHandler && this.modeHandler instanceof StatisticsMode) {
                    this.modeHandler.selectType(index);
                }
                break;
            case 'stat-var-submenu':
                this.closeMenu();
                if (this.modeHandler && this.modeHandler.handleStatVarSelection) {
                    this.modeHandler.handleStatVarSelection(index);
                }
                break;
            case 'dist-type':
                this.closeMenu();
                if (this.modeHandler && this.modeHandler instanceof DistributionMode) {
                    this.modeHandler.selectType(index);
                }
                break;
            case 'dist-listvar':
                this.closeMenu();
                if (this.modeHandler && this.modeHandler instanceof DistributionMode) {
                    this.modeHandler.handleListVarChoice(index);
                }
                break;
            case 'eq-type':
                this.closeMenu();
                if (this.modeHandler && this.modeHandler instanceof EquationMode) {
                    this.modeHandler.selectType(index);
                }
                break;
            case 'eq-unknowns':
                this.closeMenu();
                if (this.modeHandler && this.modeHandler instanceof EquationMode) {
                    this.modeHandler.selectUnknowns(index);
                }
                break;
            case 'ineq-degree':
                this.closeMenu();
                if (this.modeHandler && this.modeHandler instanceof InequalityMode) {
                    this.modeHandler.selectDegree(index);
                }
                break;
            case 'ineq-type':
                this.closeMenu();
                if (this.modeHandler && this.modeHandler instanceof InequalityMode) {
                    this.modeHandler.selectIneqType(index);
                }
                break;
            case 'ratio-type':
                this.closeMenu();
                if (this.modeHandler && this.modeHandler instanceof RatioMode) {
                    this.modeHandler.selectType(index);
                }
                break;

            default:
                this.closeMenu();
        }
    }

    handleSetupSelection(index) {
        switch (index) {
            case 0: // Input/Output
                this.menuType = 'setup-io';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'MathI/MathO' },
                    { id: 2, name: 'MathI/DecimalO' },
                    { id: 3, name: 'LineI/LineO' },
                    { id: 4, name: 'LineI/DecimalO' },
                ];
                this.renderMenu();
                break;
            case 1: // Angle Unit
                this.menuType = 'setup-angle';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'Degree' },
                    { id: 2, name: 'Radian' },
                    { id: 3, name: 'Gradian' },
                ];
                this.renderMenu();
                break;
            case 2: // Number Format
                this.menuType = 'setup-numformat';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'Fix' },
                    { id: 2, name: 'Sci' },
                    { id: 3, name: 'Norm' },
                ];
                this.renderMenu();
                break;
            case 3: // Engineer Symbol
                this.menuType = 'setup-engsym';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'On' },
                    { id: 2, name: 'Off' },
                ];
                this.renderMenu();
                break;
            case 4: // Fraction Result
                this.menuType = 'setup-fracresult';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'd/c' },
                    { id: 2, name: 'ab/c' },
                ];
                this.renderMenu();
                break;
            case 5: // Complex format
                this.menuType = 'setup-complex';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'a+bi' },
                    { id: 2, name: 'r∠θ' },
                ];
                this.renderMenu();
                break;
            case 6: // Digit Separator
                this.menuType = 'setup-digsep';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'On' },
                    { id: 2, name: 'Off' },
                ];
                this.renderMenu();
                break;
            case 7: // Statistics (Frequency)
                this.menuType = 'setup-stat';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'On' },
                    { id: 2, name: 'Off' },
                ];
                this.renderMenu();
                break;
            case 8: // Table (function count)
                this.menuType = 'setup-table';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'f(x)' },
                    { id: 2, name: 'f(x),g(x)' },
                ];
                this.renderMenu();
                break;
            default:
                this.closeMenu();
        }
    }

    handleOptnSelection(index) {
        // If mode handler has custom OPTN handling, delegate
        if (this.modeHandler && this.modeHandler.handleOptn) {
            this.closeMenu();
            this.modeHandler.handleOptn(index);
            return;
        }

        // Default OPTN submenu handling
        switch (index) {
            case 0: // Hyperbolic Func
                this.menuType = 'optn-hyp';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'sinh' },
                    { id: 2, name: 'cosh' },
                    { id: 3, name: 'tanh' },
                    { id: 4, name: 'sinh⁻¹' },
                    { id: 5, name: 'cosh⁻¹' },
                    { id: 6, name: 'tanh⁻¹' },
                ];
                this.renderMenu();
                break;
            case 1: // Angle Unit
                this.menuType = 'optn-angle';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: '°' },
                    { id: 2, name: 'r' },
                    { id: 3, name: 'g' },
                ];
                this.renderMenu();
                break;
            case 2: // Engineer Symbol
                this.menuType = 'optn-engsym';
                this.menuSelection = 0;
                this.menuItems = [
                    { id: 1, name: 'k (kilo)' },
                    { id: 2, name: 'M (Mega)' },
                    { id: 3, name: 'G (Giga)' },
                    { id: 4, name: 'T (Tera)' },
                    { id: 5, name: 'm (milli)' },
                    { id: 6, name: 'μ (micro)' },
                    { id: 7, name: 'n (nano)' },
                    { id: 8, name: 'p (pico)' },
                    { id: 9, name: 'f (femto)' },
                ];
                this.renderMenu();
                break;
            default:
                this.closeMenu();
        }
    }

    closeMenu() {
        this.menuOpen = false;
        this.menuType = null;
        this.menuItems = [];
        this.menuSelection = 0;
        this.displayInputEl.style.display = '';
        this.displayResultEl.style.flex = '';
        this.displayResultEl.style.display = '';
        this.displayResultEl.style.flexDirection = '';
        this.displayResultEl.style.minHeight = '';
        this.displayResultEl.style.fontSize = '';
        this.displayResultEl.style.whiteSpace = '';
        this.displayResultEl.style.textAlign = '';
        this.updateDisplay();
    }

    // === Display update ===
    // Real calculator: typing → expression in INPUT area (top-left) with blinking cursor, OUTPUT blank
    // After = : expression stays in INPUT, result in OUTPUT (bottom-right), no cursor
    updateDisplay() {
        if (!this.showingResult) {
            this.displayResultEl.classList.remove('error');
            this.displayResultEl.style.fontSize = '';
            this.displayResultEl.style.whiteSpace = '';
            this.displayResultEl.style.textAlign = '';

            const expr = this.displayInput || '';
            const pos = this.cursorPos;

            const isMath = this.engine.inputOutput.startsWith('MathI');
            if (isMath && typeof katex !== 'undefined') {
                // KaTeX rendering with embedded cursor
                const latex = this.exprToLatex(expr, pos);
                this.renderKatex(this.displayInputEl, latex);
            } else {
                // Fallback: plain text with HTML cursor
                const before = expr.substring(0, pos);
                const after = expr.substring(pos);
                const cursor = '<span class="lcd-cursor"></span>';
                this.displayInputEl.innerHTML = this.escapeHtml(before) + cursor + this.escapeHtml(after);
            }

            // OUTPUT area is blank while typing
            this.displayResultEl.textContent = '';
            this.displayResultEl.innerHTML = '';
        }
    }

    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // === KaTeX Rendering Engine ===

    // Render LaTeX string into a DOM element using KaTeX
    renderKatex(element, latex) {
        if (typeof katex === 'undefined') {
            element.textContent = latex;
            return;
        }
        try {
            katex.render(latex || '\\phantom{0}', element, {
                throwOnError: false,
                trust: (ctx) => ctx.command === '\\htmlClass',
                displayMode: false,
                strict: false,
                output: 'html'
            });
        } catch (e) {
            element.textContent = latex;
        }
    }

    // Render a result/decimal string into an element, using KaTeX for math notation when appropriate
    renderResultDisplay(element, str, isMath) {
        const useKatex = isMath && typeof katex !== 'undefined';
        if (useKatex && (str.includes('×10^') || str.includes('√') || str.includes('/') || str.includes('π'))) {
            this.renderKatex(element, this.resultToLatex(str));
        } else if (useKatex) {
            this.renderKatex(element, str);
        } else if (isMath) {
            element.innerHTML = this.formatMathDisplay(str);
        } else {
            element.textContent = str;
        }
    }

    // Convert calculator input expression to LaTeX with optional cursor marker
    exprToLatex(expr, cursorPos) {
        if (!expr && (cursorPos === undefined || cursorPos < 0)) return '';
        const CURSOR = '\u2336'; // APL I-beam as cursor placeholder

        let s = expr || '';
        if (cursorPos !== undefined && cursorPos >= 0) {
            s = s.substring(0, cursorPos) + CURSOR + s.substring(cursorPos);
        }

        let latex = '';
        let i = 0;
        let bracketStack = []; // tracks: 'sqrt','cbrt','xrt','power','func','paren','abs'

        // Multi-char token table: [pattern, latexReplacement, bracketType|null]
        const tokens = [
            ['sinh⁻¹(', '\\operatorname{sinh}^{-1}(', 'func'],
            ['cosh⁻¹(', '\\operatorname{cosh}^{-1}(', 'func'],
            ['tanh⁻¹(', '\\operatorname{tanh}^{-1}(', 'func'],
            ['sin⁻¹(', '\\sin^{-1}(', 'func'],
            ['cos⁻¹(', '\\cos^{-1}(', 'func'],
            ['tan⁻¹(', '\\tan^{-1}(', 'func'],
            ['RanInt(', '\\text{RanInt}(', 'func'],
            ['d/dx(', '\\tfrac{d}{dx}(', 'func'],
            ['sinh(', '\\sinh(', 'func'],
            ['cosh(', '\\cosh(', 'func'],
            ['tanh(', '\\tanh(', 'func'],
            ['sin(', '\\sin(', 'func'],
            ['cos(', '\\cos(', 'func'],
            ['tan(', '\\tan(', 'func'],
            ['log(', '\\log(', 'func'],
            ['Abs(', '\\lvert', 'abs'],
            ['Pol(', '\\text{Pol}(', 'func'],
            ['Rec(', '\\text{Rec}(', 'func'],
            ['Rnd(', '\\text{Rnd}(', 'func'],
            ['ln(', '\\ln(', 'func'],
            ['10^(', '10^{', 'power'],
            ['e^(', 'e^{', 'power'],
            ['³√(', '\\sqrt[3]{', 'sqrt'],
            ['ˣ√(', '\\sqrt[x]{', 'sqrt'],
            ['√(', '\\sqrt{', 'sqrt'],
            ['^(', '^{', 'power'],
            ['∫(', '\\int(', 'func'],
            ['Σ(', '\\sum(', 'func'],
            ['⁻¹', '^{-1}', null],
            ['Conjg(', '\\overline{', 'sqrt'],  // conjugate uses overline, close with }
            ['Arg(', '\\text{Arg}(', 'func'],
            ['ReP(', '\\text{ReP}(', 'func'],
            ['ImP(', '\\text{ImP}(', 'func'],
            ['▶r∠θ', '\\blacktriangleright r\\angle\\theta', null],
            ['▶a+bi', '\\blacktriangleright a+bi', null],
            ['Identity(', '\\text{Identity}(', 'func'],
            ['Det(', '\\text{Det}(', 'func'],
            ['Trn(', '\\text{Trn}(', 'func'],
            ['MatAns', '\\text{MatAns}', null],
            ['MatA', '\\text{MatA}', null],
            ['MatB', '\\text{MatB}', null],
            ['MatC', '\\text{MatC}', null],
            ['MatD', '\\text{MatD}', null],
            ['VctAns', '\\text{VctAns}', null],
            ['VctA', '\\text{VctA}', null],
            ['VctB', '\\text{VctB}', null],
            ['VctC', '\\text{VctC}', null],
            ['VctD', '\\text{VctD}', null],
            ['Angle(', '\\text{Angle}(', 'func'],
            ['UnitV(', '\\text{UnitV}(', 'func'],
            ['Ans', '\\text{Ans}', null],
            ['nPr', '\\text{P}', null],
            ['nCr', '\\text{C}', null],
        ];

        while (i < s.length) {
            const ch = s[i];

            // Cursor marker — pass through
            if (ch === CURSOR) { latex += CURSOR; i++; continue; }

            // Special: ×10^ with exponent (collect following digits)
            if (s.startsWith('×10^', i)) {
                latex += '{\\times}10^{';
                i += 4;
                if (i < s.length && s[i] === '-') { latex += '-'; i++; }
                if (i < s.length && s[i] === CURSOR) { latex += CURSOR; i++; }
                while (i < s.length && /\d/.test(s[i])) { latex += s[i]; i++; }
                if (i < s.length && s[i] === CURSOR) { latex += CURSOR; i++; }
                latex += '}';
                continue;
            }

            // Check multi-char tokens
            let matched = false;
            for (const [pattern, replacement, bracketType] of tokens) {
                if (s.startsWith(pattern, i)) {
                    latex += replacement;
                    if (bracketType) bracketStack.push(bracketType);
                    i += pattern.length;
                    matched = true;
                    break;
                }
            }
            if (matched) continue;

            // Single characters
            switch (ch) {
                case '(':
                    latex += '(';
                    bracketStack.push('paren');
                    i++;
                    break;
                case ')': {
                    const top = bracketStack.pop();
                    if (top === 'sqrt' || top === 'power') {
                        latex += '}';
                    } else if (top === 'abs') {
                        latex += '\\rvert';
                    } else {
                        latex += ')';
                    }
                    i++;
                    break;
                }
                case '×':
                    latex += '{\\times}';
                    i++;
                    break;
                case '÷':
                    latex += '{\\div}';
                    i++;
                    break;
                case '−':
                    latex += '-';
                    i++;
                    break;
                case 'π':
                    latex += '\\pi ';
                    i++;
                    break;
                case '²':
                    latex += '^{2}';
                    i++;
                    break;
                case '³':
                    latex += '^{3}';
                    i++;
                    break;
                case '°':
                    latex += '^{\\circ}';
                    i++;
                    break;
                case '∠':
                    latex += '\\angle ';
                    i++;
                    break;
                case '•':
                    latex += '\\cdot ';
                    i++;
                    break;
                case '𝒊':
                    latex += 'i';
                    i++;
                    break;
                case '/': {
                    // Fraction: / is always from the fraction key in MathI mode
                    // Always render as \frac{}{} — collect digits before (numerator) and after (denominator)
                    let numEnd = latex.length;
                    let numStart = numEnd;
                    while (numStart > 0 && (/\d/.test(latex[numStart - 1]) || latex[numStart - 1] === CURSOR)) {
                        numStart--;
                    }
                    let denStr = '';
                    let j = i + 1;
                    while (j < s.length && (/\d/.test(s[j]) || s[j] === CURSOR)) {
                        denStr += s[j]; j++;
                    }
                    const hasNum = numStart < numEnd;
                    const num = hasNum ? latex.substring(numStart, numEnd) : '';
                    // Always render as fraction — even with empty numerator/denominator
                    const numDisplay = num || '\\phantom{0}';
                    const denDisplay = denStr || '\\phantom{0}';
                    latex = (hasNum ? latex.substring(0, numStart) : latex) +
                        '\\frac{' + numDisplay + '}{' + denDisplay + '}';
                    i = denStr.length > 0 ? j : i + 1;
                    break;
                }
                default:
                    latex += ch;
                    i++;
                    break;
            }
        }

        // Close any unclosed brackets (partial expressions while typing)
        while (bracketStack.length > 0) {
            const top = bracketStack.pop();
            if (top === 'sqrt' || top === 'power') {
                latex += '}';
            } else if (top === 'abs') {
                latex += '\\rvert';
            } else {
                latex += ')';
            }
        }

        // Post-process: convert π/n patterns to fractions (π wasn't caught by digit look-back)
        // Handles: π/4 → \frac{\pi}{4}, 3π/4 → \frac{3\pi}{4}, -π/4 → -\frac{\pi}{4}
        latex = latex.replace(/(-?\d*\\pi\s?)\/(\d+)/g, (m, numPi, den) => {
            return '\\frac{' + numPi.trim() + '}{' + den + '}';
        });

        // Replace cursor marker with KaTeX blinking cursor element
        if (latex.includes(CURSOR)) {
            latex = latex.replace(CURSOR, '\\htmlClass{katex-cursor}{\\rule[-0.2em]{1.5px}{1.1em}}');
        }

        return latex;
    }

    // Convert result string to LaTeX for display
    resultToLatex(str) {
        if (!str) return '';
        if (str.includes('ERROR')) return '\\text{' + str + '}';

        let latex = str;

        // Scientific notation: ×10^n → \times 10^{n}
        latex = latex.replace(/×10\^(-?\d+)/g, '{\\times}10^{$1}');

        // Square root: a√b or √b (result from trySquareRoot)
        if (/√/.test(latex)) {
            latex = latex.replace(/^(-?)(\d+)√(\d+)$/, (m, sign, a, b) => `${sign}${a}\\sqrt{${b}}`);
            latex = latex.replace(/^(-?)√(\d+)$/, (m, sign, b) => `${sign}\\sqrt{${b}}`);
        }

        // Pi fraction: nπ/d → \frac{n\pi}{d}
        if (latex.includes('π') && latex.includes('/')) {
            latex = latex.replace(/^(-?\d*)π\/(\d+)$/, (m, numPi, den) => {
                let num = numPi === '' ? '\\pi' : (numPi === '-' ? '-\\pi' : numPi + '\\pi');
                return '\\frac{' + num + '}{' + den + '}';
            });
        }

        // Mixed number: w n/d → w\frac{n}{d}
        latex = latex.replace(/^(-?\d+)\s+(\d+)\/(\d+)$/, (m, w, n, d) => w + '\\frac{' + n + '}{' + d + '}');

        // Simple fraction: n/d → \frac{n}{d}
        latex = latex.replace(/^(-?\d+)\/(\d+)$/, (m, n, d) => '\\frac{' + n + '}{' + d + '}');

        // Pi without fraction: nπ or π
        if (latex.includes('π')) {
            latex = latex.replace(/(-?\d*)π/g, (m, n) => {
                if (n === '' || n === undefined) return '\\pi';
                if (n === '-') return '-\\pi';
                return n + '\\pi';
            });
        }

        // Remaining × (not followed by 10^)
        latex = latex.replace(/×/g, '{\\times}');

        // Engineering symbol μ
        latex = latex.replace(/μ/g, '\\mu');

        return latex;
    }

    // Legacy fallback: HTML-based math display (used when KaTeX unavailable)
    formatMathDisplay(expr) {
        let html = expr;
        html = html.replace(/√\(([^)]*)\)/g, (m, c) =>
            `<span class="radical"><span class="radical-sign">√</span><span class="radical-body">${c}</span></span>`);
        html = html.replace(/√(\d+)/g, (m, n) =>
            `<span class="radical"><span class="radical-sign">√</span><span class="radical-body">${n}</span></span>`);
        html = html.replace(/(\d+)\s+(\d+)\/(\d+)/g, (m, w, n, d) =>
            `${w}<span class="frac"><span class="frac-num">${n}</span><span class="frac-bar"></span><span class="frac-den">${d}</span></span>`);
        html = html.replace(/(-?\d+)\/(\d+)/g, (m, n, d) =>
            `<span class="frac"><span class="frac-num">${n}</span><span class="frac-bar"></span><span class="frac-den">${d}</span></span>`);
        html = html.replace(/²/g, '<sup>2</sup>');
        html = html.replace(/³/g, '<sup>3</sup>');
        html = html.replace(/\^\((\d+)\)/g, '<sup>$1</sup>');
        return html;
    }

    formatInputDisplay(expr) {
        return expr;
    }

    updateIndicators() {
        // SHIFT
        this.indShift.classList.toggle('hidden', !this.shiftActive);
        document.querySelector('[data-key="shift"]').classList.toggle('active', this.shiftActive);

        // ALPHA
        this.indAlpha.classList.toggle('hidden', !this.alphaActive);
        document.querySelector('[data-key="alpha"]').classList.toggle('active', this.alphaActive);

        // Memory M
        this.indM.classList.toggle('hidden', this.engine.variables.M === 0);

        // Angle unit
        const angleMap = { 'DEG': 'D', 'RAD': 'R', 'GRAD': 'G' };
        this.indAngle.textContent = angleMap[this.engine.angleUnit] || 'D';

        // Number format
        this.indFix.classList.toggle('hidden', this.engine.numberFormat.type !== 'Fix');
        this.indSci.classList.toggle('hidden', this.engine.numberFormat.type !== 'Sci');

        // Math mode indicator
        const isMath = this.engine.inputOutput.startsWith('MathI');
        this.indMath.classList.toggle('hidden', !isMath);

        // STO indicator
        if (this.indSto) {
            this.indSto.classList.toggle('hidden', !this.stoMode);
        }
    }

    // === Clear ===
    clearAll() {
        this.input = '';
        this.displayInput = '';
        this.cursorPos = 0;
        this.error = null;
        this.showingResult = false;
        this.justEvaluated = false;
        this.displayResultEl.classList.remove('error');
        this.updateDisplay();
    }

    deleteChar() {
        if (this.showingResult) {
            this.clearAll();
            return;
        }
        if (this.cursorPos > 0) {
            // Handle multi-char tokens before cursor
            const multiCharSuffixes = ['sin(', 'cos(', 'tan(', 'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
                'ln(', 'log(', '10^(', 'e^(', '√(', '³√(', 'Abs(', 'Pol(', 'Rec(',
                '×10^', 'Ans', 'nPr', 'nCr', 'd/dx(', '∫(', 'Σ(', 'RanInt(',
                'sinh(', 'cosh(', 'tanh(', 'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹(',
                'Rnd('];

            const before = this.input.substring(0, this.cursorPos);
            const after = this.input.substring(this.cursorPos);
            const dBefore = this.displayInput.substring(0, this.cursorPos);
            const dAfter = this.displayInput.substring(this.cursorPos);

            let removed = false;
            for (const suffix of multiCharSuffixes) {
                if (before.endsWith(suffix)) {
                    this.input = before.slice(0, -suffix.length) + after;
                    this.displayInput = dBefore.slice(0, -suffix.length) + dAfter;
                    this.cursorPos -= suffix.length;
                    removed = true;
                    break;
                }
            }

            if (!removed) {
                this.input = before.slice(0, -1) + after;
                this.displayInput = dBefore.slice(0, -1) + dAfter;
                this.cursorPos--;
            }

            this.updateDisplay();
        }
    }

    // === Power ===
    powerOn() {
        this.powered = true;
        document.querySelector('.calculator').classList.remove('off');
        this.clearAll();
        this.updateIndicators();
    }

    powerOff() {
        this.powered = false;
        document.querySelector('.calculator').classList.add('off');
        this.displayInputEl.textContent = '';
        this.displayResultEl.textContent = '';
    }
}

// === Initialize ===
document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new CasioFX991EX();

    // === DEBUG TEST BENCH (50 tests) ===
    // Only active with ?debug=1 query param. Tap CASIO logo to advance.
    const debugBtn = document.getElementById('debug-btn');
    const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
    if (debugBtn && debugEnabled) {
        let testIdx = -1;
        const calc = window.calculator;
        const type = str => { for (const ch of str) calc.inputChar(ch); };
        const press = key => calc.handleKey(key);
        const enterMode = n => { press('menu'); press(n.toString()); };
        const showLabel = (n, desc) => {
            const indEl = document.getElementById('indicators');
            if (indEl) {
                let badge = indEl.querySelector('.test-badge');
                if (!badge) { badge = document.createElement('span'); badge.className = 'test-badge'; badge.style.cssText = 'font-size:7px;font-weight:900;color:#1a1a1a;opacity:0.9;margin-left:auto;'; indEl.appendChild(badge); }
                badge.textContent = '#' + n;
            }
        };

        // Helper to set up matrices/vectors once
        let matDefined = false, vctDefined = false;
        const defineMatrices = () => {
            if (matDefined) return;
            enterMode('4');
            const m = calc.modeHandler;
            m.defineMode='define'; m.phase='define-select';
            m.handleDefineSelect('1'); m.handleDefineRows('2'); m.handleDefineCols('2');
            [1,2,-3,4].forEach(v => { m.editBuffer=v.toString(); m.handleEditor('equals'); });
            m.defineMode='define'; m.phase='define-select';
            m.handleDefineSelect('2'); m.handleDefineRows('2'); m.handleDefineCols('2');
            [3,-6,8,2].forEach(v => { m.editBuffer=v.toString(); m.handleEditor('equals'); });
            matDefined = true;
        };
        const defineVectors = () => {
            if (vctDefined) return;
            enterMode('5');
            const v = calc.modeHandler;
            v.defineMode='define'; v.phase='define-select';
            v.handleDefineSelect('1'); v.handleDefineDim('3');
            [2,3,-2].forEach(x => { v.editBuffer=x.toString(); v.handleEditor('equals'); });
            v.defineMode='define'; v.phase='define-select';
            v.handleDefineSelect('2'); v.handleDefineDim('3');
            [3,-4,5].forEach(x => { v.editBuffer=x.toString(); v.handleEditor('equals'); });
            vctDefined = true;
        };
        const enterEq = (eqType, degree) => {
            enterMode('0'); press(eqType); press(degree);
        };
        const enterIneq = () => {
            calc.engine.mode='Inequality'; calc.closeMenu(); calc.clearAll();
            calc.modeHandler = new InequalityMode(calc); calc.modeHandler.enter();
        };

        const tests = [
            // === CALCULATE MODE (1-15) ===
            () => { enterMode('1'); calc.clearAll(); type('7/8+3/11'); press('equals'); },
            () => { enterMode('1'); calc.clearAll(); type('3/4'); press('equals'); press('sd'); }, // S⇔D decimal
            () => { enterMode('1'); calc.clearAll(); type('7/3'); press('equals'); }, // improper fraction
            () => { enterMode('1'); calc.clearAll(); calc.toggleFractionType(); }, // mixed fraction 2⅓
            () => { enterMode('1'); calc.clearAll(); calc.inputFunc('√('); type('24'); press('right'); type('+'); calc.inputFunc('√('); type('150'); press('right'); press('equals'); },
            () => { enterMode('1'); calc.clearAll(); calc.inputFunc('√('); type('2'); press('right'); press('equals'); }, // √2
            () => { enterMode('1'); calc.clearAll(); calc.engine.angleUnit='RAD'; calc.inputFunc('sin('); type('π/4)'); press('equals'); },
            () => { enterMode('1'); calc.clearAll(); calc.engine.angleUnit='RAD'; calc.inputFunc('cos⁻¹('); type('1/2)'); press('equals'); }, // π/3
            () => { enterMode('1'); calc.clearAll(); type('2'); calc.inputChar('^('); type('3)'); type('+'); type('3'); calc.inputChar('×10^'); type('5'); press('equals'); },
            () => { enterMode('1'); calc.clearAll(); calc.engine.angleUnit='DEG'; calc.inputFunc('sin('); type('30)'); type('+'); calc.inputFunc('cos('); type('60)'); press('equals'); }, // 1
            () => { enterMode('1'); calc.clearAll(); calc.inputFunc('ln('); type('e^(1))'); press('equals'); }, // ln(e)=1
            () => { enterMode('1'); calc.clearAll(); type('2'); calc.inputChar('²'); type('+3'); calc.inputChar('²'); press('equals'); }, // 4+9=13
            () => { enterMode('1'); calc.clearAll(); type('5!'); press('equals'); }, // 120... actually ! needs reciprocal key. Use simpler: 10÷3
            () => { enterMode('1'); calc.clearAll(); type('10÷3'); press('equals'); }, // fraction 10/3
            () => { enterMode('1'); calc.clearAll(); type('1/6+1/3'); press('equals'); }, // 1/2

            // === COMPLEX MODE (16-21) ===
            () => { enterMode('2'); calc.clearAll(); type('2+3𝒊+5−7𝒊'); press('equals'); }, // 7-4i
            () => { enterMode('2'); calc.clearAll(); type('(3−2𝒊)(5+6𝒊)'); press('equals'); }, // 27+8i
            () => { enterMode('2'); calc.clearAll(); calc.engine.angleUnit='DEG'; calc.inputFunc('Arg('); type('1+2𝒊)'); press('equals'); }, // 63.43
            () => { enterMode('2'); calc.clearAll(); type('2∠330'); press('equals'); }, // √3-i
            () => { enterMode('2'); calc.clearAll(); type('2+5𝒊▶r∠θ'); press('equals'); }, // polar form
            () => { enterMode('2'); calc.clearAll(); type('(1+𝒊)'); calc.inputChar('²'); press('equals'); }, // 2i

            // === MATRIX MODE (22-27) ===
            () => { defineMatrices(); const m=calc.modeHandler; calc.clearAll(); m.phase='calc'; calc.inputChar('MatA'); type('+'); calc.inputChar('MatB'); press('equals'); },
            () => { const m=calc.modeHandler; calc.clearAll(); m.phase='calc'; calc.inputFunc('Det('); calc.inputChar('MatA'); type(')'); press('equals'); }, // 10
            () => { const m=calc.modeHandler; calc.clearAll(); m.phase='calc'; calc.inputChar('MatA'); calc.inputChar('⁻¹'); press('equals'); },
            () => { const m=calc.modeHandler; calc.clearAll(); m.phase='calc'; calc.inputFunc('Trn('); calc.inputChar('MatA'); type(')'); press('equals'); },
            () => { const m=calc.modeHandler; calc.clearAll(); m.phase='calc'; type('3'); type('×'); calc.inputChar('MatA'); press('equals'); }, // scalar mul
            () => { const m=calc.modeHandler; calc.clearAll(); m.phase='calc'; calc.inputFunc('Identity('); type('3)'); press('equals'); },

            // === VECTOR MODE (28-32) ===
            () => { defineVectors(); const v=calc.modeHandler; calc.clearAll(); v.phase='calc'; calc.inputChar('VctA'); type('−'); calc.inputChar('VctB'); press('equals'); },
            () => { const v=calc.modeHandler; calc.clearAll(); v.phase='calc'; calc.inputChar('VctA'); type('×'); calc.inputChar('VctB'); press('equals'); }, // cross
            () => { const v=calc.modeHandler; calc.clearAll(); v.phase='calc'; calc.inputChar('VctA'); calc.inputChar('•'); calc.inputChar('VctB'); press('equals'); }, // dot=-16
            () => { const v=calc.modeHandler; calc.clearAll(); v.phase='calc'; calc.engine.angleUnit='DEG'; calc.inputFunc('Angle('); calc.inputChar('VctA'); type(','); calc.inputChar('VctB'); type(')'); press('equals'); },
            () => { const v=calc.modeHandler; calc.clearAll(); v.phase='calc'; calc.inputFunc('UnitV('); calc.inputChar('VctA'); type(')'); press('equals'); },

            // === STATISTICS MODE (33-36) ===
            () => { enterMode('6'); press('1'); const s=calc.modeHandler; [70.5,74,67,71,71,72,73.5,72,69,71].forEach(v=>{s.editBuffer=v.toString();s.handleEditorKey('equals');}); s.showStatResults(); },
            () => { const s=calc.modeHandler; s.handleStatResultKey('down'); }, // page 2: sx,n,min,Q1,Med,Q3
            () => { const s=calc.modeHandler; s.handleStatResultKey('down'); }, // page 3: max(x)
            () => { const s=calc.modeHandler; s.handleStatResultKey('up'); }, // back to page 2

            // === DISTRIBUTION MODE (37-39) ===
            () => { enterMode('7'); press('5'); press('2'); const d=calc.modeHandler; if(d.phase==='input'){d.editBuffer='1';d.handleKey('equals');d.editBuffer='6';d.handleKey('equals');d.editBuffer='1/6';d.handleKey('equals');} }, // BinomialCD
            () => { enterMode('7'); press('3'); const d=calc.modeHandler; if(d.phase==='input'){d.editBuffer='0.9';d.handleKey('equals');d.editBuffer='4';d.handleKey('equals');d.editBuffer='70';d.handleKey('equals');} }, // InvNorm
            () => { enterMode('7'); press('1'); press('2'); const d=calc.modeHandler; if(d.phase==='input'){d.editBuffer='1.5';d.handleKey('equals');d.editBuffer='1';d.handleKey('equals');d.editBuffer='0';d.handleKey('equals');} }, // NormalPD

            // === TABLE MODE (40-42) ===
            () => { enterMode('9'); const t=calc.modeHandler; t.editBuffer='x\u00d7(20\u2212x)\u00d7(15\u2212x)'; t.handleKey('equals'); t.editBuffer='1';t.handleKey('equals'); t.editBuffer='7';t.handleKey('equals'); t.editBuffer='1';t.handleKey('equals'); },
            () => { const t=calc.modeHandler; t.handleKey('down');t.handleKey('down');t.handleKey('down');t.handleKey('down');t.handleKey('down'); }, // scroll to row 6
            () => { const t=calc.modeHandler; t.handleKey('ac'); }, // show Table Range

            // === EQUATION MODE (43-47) ===
            () => { enterEq('1','1'); const e=calc.modeHandler; [2,1,5,-4,6,12].forEach(v=>{e.editBuffer=v.toString();e.handleKey('equals');}); }, // 2x+y=5,-4x+6y=12 → x=9/8
            () => { const e=calc.modeHandler; if(e.solutions&&e.solutions.length>1) e.handleKey('down'); }, // y=11/4
            () => { enterEq('2','2'); const e=calc.modeHandler; [1,4,1,-6].forEach(v=>{e.editBuffer=v.toString();e.handleKey('equals');}); }, // cubic roots
            () => { enterEq('2','1'); const e=calc.modeHandler; [1,2,3].forEach(v=>{e.editBuffer=v.toString();e.handleKey('equals');}); }, // complex roots -1±√2i
            () => { const e=calc.modeHandler; if(e.solutions&&e.solutions.length>1) e.handleKey('down'); }, // x2

            // === INEQUALITY MODE (48-49) ===
            () => { enterIneq(); press('2'); press('2'); const q=calc.modeHandler; [1,4,1,-6].forEach(v=>{q.editBuffer=v.toString();q.handleKey('equals');}); }, // x<-3, -2<x<1
            () => { enterIneq(); press('1'); press('1'); const q=calc.modeHandler; [1,-5,6].forEach(v=>{q.editBuffer=v.toString();q.handleKey('equals');}); }, // x²-5x+6>0

            // === SOLVE MODE (50) ===
            () => { enterMode('1'); calc.clearAll(); type('x²−4'); calc.openSolve(); calc.solveEditBuffer='1'; calc.saveCurrentSolveVar(); calc.executeSolve(); },
        ];

        debugBtn.addEventListener('click', () => {
            testIdx++;
            if (testIdx >= tests.length) testIdx = 0;
            const n = testIdx + 1;
            showLabel(n);
            try {
                tests[testIdx]();
            } catch (e) {
                console.error(`Test #${n} error:`, e);
                calc.displayResultEl.textContent = `#${n} Error: ${e.message}`;
            }
        });
    }
});
