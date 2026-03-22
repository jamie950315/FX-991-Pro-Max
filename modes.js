/**
 * Casio fx-991EX CLASSWIZ - Mode Handlers
 * Implements all 12 calculator modes with full UI/UX
 */

// ========== BASE MODE HANDLER ==========
class ModeHandler {
    constructor(app) {
        this.app = app;
        this.engine = app.engine;
    }
    enter() {}
    handleKey(key) { return false; }
    getOptnMenu() { return null; }
    exit() {}
}

// ========== COMPLEX MODE (Mode 2) ==========
class ComplexMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.displayFormat = 'rect'; // 'rect' or 'polar'
        this.lastResult = null; // last complex result {re, im}
    }
    enter() {
        this.app.clearAll();
        this.displayFormat = this.engine.complexFormat === 'r∠θ' ? 'polar' : 'rect';
    }
    handleKey(key) {
        if (key === 'equals') {
            this.calculate();
            return true;
        }
        // ENG = imaginary unit i
        if (key === 'eng') {
            this.app.inputChar('𝒊');
            return true;
        }
        return false;
    }
    handleShiftKey(key) {
        // SHIFT+ENG = ∠ (angle for polar form input)
        if (key === 'eng') {
            this.app.inputChar('∠');
            return true;
        }
        // SHIFT+2 = Conjugate
        if (key === '2') {
            this.app.inputFunc('Conjg(');
            return true;
        }
        return false;
    }
    // OPTN menu: 1:Argument 2:Conjugate 3:Real Part 4:Imaginary Part | 1:▶r∠θ 2:▶a+bi
    getOptnMenu() {
        return [
            { id: 1, name: 'Argument' },
            { id: 2, name: 'Conjugate' },
            { id: 3, name: 'Real Part' },
            { id: 4, name: 'Imaginary Part' },
            { id: 1, name: '▶r∠θ' },
            { id: 2, name: '▶a+bi' }
        ];
    }
    handleOptn(index) {
        switch (index) {
            case 0: this.app.inputFunc('Arg('); break;
            case 1: this.app.inputFunc('Conjg('); break;
            case 2: this.app.inputFunc('ReP('); break;
            case 3: this.app.inputFunc('ImP('); break;
            case 4: this.app.inputChar('▶r∠θ'); break;
            case 5: this.app.inputChar('▶a+bi'); break;
        }
    }

    // === Main calculation entry ===
    calculate() {
        const expr = this.app.input;
        try {
            const result = this.evaluateComplexExpr(expr);
            if (!result) throw new Error('Syntax ERROR');

            // Render input
            const isMath = this.engine.inputOutput.startsWith('MathI');
            if (isMath && typeof katex !== 'undefined') {
                this.app.renderKatex(this.app.displayInputEl, this.app.exprToLatex(expr));
            } else {
                this.app.displayInputEl.textContent = expr;
            }

            // Format and render result
            const resultStr = this.displayFormat === 'polar'
                ? this.formatPolarExact(result)
                : this.formatRectExact(result);

            if (isMath && typeof katex !== 'undefined') {
                this.app.renderKatex(this.app.displayResultEl, this.complexResultToLatex(resultStr));
            } else {
                this.app.displayResultEl.textContent = resultStr;
            }

            this.lastResult = result;
            this.engine.ans = result.re;
            this.engine.variables.x = result.re;
            this.engine.variables.y = result.im;
            this.app.showingResult = true;
            this.app.justEvaluated = true;
        } catch (e) {
            this.app.error = e.message || 'Math ERROR';
            this.app.displayResultEl.textContent = this.app.error;
            this.app.displayResultEl.classList.add('error');
            this.app.showingResult = true;
        }
    }

    // === Complex expression evaluator (tokenizer + recursive descent parser) ===
    evaluateComplexExpr(expr) {
        let s = expr.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/𝒊/g, 'i');

        // Handle ▶r∠θ / ▶a+bi conversion suffix
        if (s.endsWith('▶r∠θ')) { s = s.slice(0, -4); this.displayFormat = 'polar'; }
        else if (s.endsWith('▶a+bi')) { s = s.slice(0, -5); this.displayFormat = 'rect'; }

        const tokens = this.cTokenize(s);
        this.cPos = 0;
        this.cTokens = tokens;
        const result = this.cParseExpr();
        return result;
    }

    // Tokenizer for complex expressions
    cTokenize(s) {
        const tokens = [];
        let i = 0;
        while (i < s.length) {
            if (/\s/.test(s[i])) { i++; continue; }

            // Numbers
            if (/[\d.]/.test(s[i])) {
                let num = '';
                while (i < s.length && /[\d.]/.test(s[i])) { num += s[i]; i++; }
                tokens.push({ type: 'num', value: parseFloat(num) });
                continue;
            }

            // Functions (longest match first)
            const funcs = [
                ['sinh(', 'sinh'], ['cosh(', 'cosh'], ['tanh(', 'tanh'],
                ['sin⁻¹(', 'asin'], ['cos⁻¹(', 'acos'], ['tan⁻¹(', 'atan'],
                ['sin(', 'sin'], ['cos(', 'cos'], ['tan(', 'tan'],
                ['Conjg(', 'conjg'], ['Arg(', 'arg'], ['ReP(', 'rep'], ['ImP(', 'imp'],
                ['Abs(', 'abs'], ['ln(', 'ln'], ['log(', 'log'],
                ['³√(', 'cbrt'], ['√(', 'sqrt'], ['10^(', 'pow10'], ['e^(', 'powe'],
            ];
            let matched = false;
            for (const [pat, name] of funcs) {
                if (s.startsWith(pat, i)) {
                    tokens.push({ type: 'func', value: name });
                    tokens.push({ type: '(' });
                    i += pat.length;
                    matched = true;
                    break;
                }
            }
            if (matched) continue;

            // Special tokens
            if (s[i] === 'i' && (i + 1 >= s.length || !/[a-zA-Z]/.test(s[i + 1]))) {
                tokens.push({ type: 'i' }); i++; continue;
            }
            if (s[i] === '∠') { tokens.push({ type: '∠' }); i++; continue; }
            if (s[i] === 'π') { tokens.push({ type: 'num', value: Math.PI }); i++; continue; }
            if (s[i] === '²') { tokens.push({ type: 'pow', value: 2 }); i++; continue; }
            if (s[i] === '³') { tokens.push({ type: 'pow', value: 3 }); i++; continue; }
            if (s.startsWith('Ans', i)) { tokens.push({ type: 'num', value: this.engine.ans }); i += 3; continue; }
            if ('+-*/'.includes(s[i])) { tokens.push({ type: 'op', value: s[i] }); i++; continue; }
            if (s[i] === '(') { tokens.push({ type: '(' }); i++; continue; }
            if (s[i] === ')') { tokens.push({ type: ')' }); i++; continue; }
            if (s[i] === ',') { tokens.push({ type: ',' }); i++; continue; }

            // Variables
            if (/[A-Fxy]/.test(s[i])) {
                tokens.push({ type: 'num', value: this.engine.variables[s[i]] || 0 });
                i++; continue;
            }

            i++; // skip unknown
        }
        return tokens;
    }

    // Parser helpers
    cPeek() { return this.cPos < this.cTokens.length ? this.cTokens[this.cPos] : null; }
    cNext() { return this.cTokens[this.cPos++]; }
    cExpect(type) {
        const t = this.cPeek();
        if (t && t.type === type) { this.cPos++; return t; }
        return null;
    }

    // expr → term (('+' | '-') term)*
    cParseExpr() {
        let result = this.cParseTerm();
        while (this.cPeek() && this.cPeek().type === 'op' && '+-'.includes(this.cPeek().value)) {
            const op = this.cNext().value;
            const right = this.cParseTerm();
            result = op === '+' ? this.engine.complexAdd(result, right) : this.engine.complexSub(result, right);
        }
        return result;
    }

    // term → angleExpr (('*' | '/') angleExpr | implicit_mul)*
    cParseTerm() {
        let result = this.cParseAngle();
        while (this.cPeek()) {
            const t = this.cPeek();
            if (t.type === 'op' && (t.value === '*' || t.value === '/')) {
                this.cPos++;
                const right = this.cParseAngle();
                result = t.value === '*' ? this.engine.complexMul(result, right) : this.engine.complexDiv(result, right);
            } else if (t.type === '(' || t.type === 'func' || t.type === 'num' || t.type === 'i') {
                // Implicit multiplication: 3i, 2(3+i), (a)(b)
                // But NOT after an operator token was just consumed
                const right = this.cParseAngle();
                result = this.engine.complexMul(result, right);
            } else {
                break;
            }
        }
        return result;
    }

    // angleExpr → unary ('∠' unary)?
    cParseAngle() {
        let result = this.cParseUnary();
        if (this.cPeek() && this.cPeek().type === '∠') {
            this.cPos++;
            const theta = this.cParseUnary(); // angle value
            const r = Math.sqrt(result.re * result.re + result.im * result.im);
            const thetaRad = this.engine.toRadians(theta.re);
            result = { re: r * Math.cos(thetaRad), im: r * Math.sin(thetaRad) };
        }
        return result;
    }

    // unary → '-' unary | '+' unary | postfix
    cParseUnary() {
        if (this.cPeek() && this.cPeek().type === 'op' && this.cPeek().value === '-') {
            this.cPos++;
            const v = this.cParseUnary();
            return { re: -v.re, im: -v.im };
        }
        if (this.cPeek() && this.cPeek().type === 'op' && this.cPeek().value === '+') {
            this.cPos++;
            return this.cParseUnary();
        }
        return this.cParsePostfix();
    }

    // postfix → primary ('²' | '³')*
    cParsePostfix() {
        let result = this.cParsePrimary();
        while (this.cPeek() && this.cPeek().type === 'pow') {
            const n = this.cNext().value;
            result = this.engine.complexPow(result, n);
        }
        return result;
    }

    // primary → number 'i'? | 'i' | '(' expr ')' | func '(' expr ')'
    cParsePrimary() {
        const t = this.cPeek();
        if (!t) throw new Error('Syntax ERROR');

        if (t.type === 'num') {
            this.cPos++;
            // Check for trailing 'i' (e.g., 3i)
            if (this.cPeek() && this.cPeek().type === 'i') {
                this.cPos++;
                return { re: 0, im: t.value };
            }
            return { re: t.value, im: 0 };
        }

        if (t.type === 'i') {
            this.cPos++;
            return { re: 0, im: 1 };
        }

        if (t.type === '(') {
            this.cPos++;
            const result = this.cParseExpr();
            this.cExpect(')');
            return result;
        }

        if (t.type === 'func') {
            const fname = t.value;
            this.cPos++;
            this.cExpect('(');
            const arg = this.cParseExpr();
            this.cExpect(')');
            return this.cEvalFunc(fname, arg);
        }

        throw new Error('Syntax ERROR');
    }

    // Evaluate function on complex argument
    cEvalFunc(name, z) {
        switch (name) {
            case 'arg': return { re: this.engine.complexArg(z), im: 0 };
            case 'conjg': return this.engine.complexConjugate(z);
            case 'rep': return { re: z.re, im: 0 };
            case 'imp': return { re: z.im, im: 0 };
            case 'abs': return { re: this.engine.complexAbs(z), im: 0 };
            case 'sqrt': return this.engine.complexSqrt(z);
            case 'cbrt': {
                const r = this.engine.complexAbs(z);
                const arg = Math.atan2(z.im, z.re);
                return { re: Math.cbrt(r) * Math.cos(arg / 3), im: Math.cbrt(r) * Math.sin(arg / 3) };
            }
            case 'sin': return { re: Math.sin(this.engine.toRadians(z.re)), im: 0 };
            case 'cos': return { re: Math.cos(this.engine.toRadians(z.re)), im: 0 };
            case 'tan': return { re: Math.tan(this.engine.toRadians(z.re)), im: 0 };
            case 'asin': return { re: this.engine.fromRadians(Math.asin(z.re)), im: 0 };
            case 'acos': return { re: this.engine.fromRadians(Math.acos(z.re)), im: 0 };
            case 'atan': return { re: this.engine.fromRadians(Math.atan(z.re)), im: 0 };
            case 'sinh': return { re: Math.sinh(z.re), im: 0 };
            case 'cosh': return { re: Math.cosh(z.re), im: 0 };
            case 'tanh': return { re: Math.tanh(z.re), im: 0 };
            case 'ln': return { re: Math.log(z.re), im: 0 };
            case 'log': return { re: Math.log10(z.re), im: 0 };
            case 'pow10': return { re: Math.pow(10, z.re), im: 0 };
            case 'powe': return { re: Math.exp(z.re), im: 0 };
            default: throw new Error('Syntax ERROR');
        }
    }

    // === Exact-form result formatting ===

    // Format a+bi with exact forms (√ for irrational parts)
    formatRectExact(c) {
        const re = parseFloat(c.re.toPrecision(10));
        const im = parseFloat(c.im.toPrecision(10));
        const reStr = this.tryExactReal(re);
        const absIm = Math.abs(im);
        const absImStr = this.tryExactReal(absIm);

        if (Math.abs(im) < 1e-12) return reStr;
        if (Math.abs(re) < 1e-12) {
            if (absIm === 1) return (im < 0 ? '-' : '') + '𝒊';
            return (im < 0 ? '-' : '') + absImStr + '𝒊';
        }
        const sign = im > 0 ? '+' : '-';
        const imPart = absIm === 1 ? '' : absImStr;
        return reStr + sign + imPart + '𝒊';
    }

    // Format r∠θ with exact √ for magnitude
    formatPolarExact(c) {
        const r = this.engine.complexAbs(c);
        const theta = this.engine.complexArg(c);
        const rStr = this.tryExactReal(parseFloat(r.toPrecision(10)));
        const thetaStr = this.engine.formatResult(parseFloat(theta.toPrecision(10)));
        return rStr + '∠' + thetaStr;
    }

    // Try √ form, then decimal for a real number
    tryExactReal(val) {
        if (Number.isInteger(val)) return val.toString();
        const sqrtRep = this.app.trySquareRoot(val);
        if (sqrtRep) return sqrtRep;
        return this.engine.formatResult(val);
    }

    // Convert complex result string to KaTeX
    complexResultToLatex(str) {
        let latex = str;
        // √ patterns: a√b
        latex = latex.replace(/(-?)(\d+)√(\d+)/g, (m, sign, a, b) => `${sign}${a}\\sqrt{${b}}`);
        latex = latex.replace(/(-?)√(\d+)/g, (m, sign, b) => `${sign}\\sqrt{${b}}`);
        // ∠ → \angle
        latex = latex.replace(/∠/g, '\\angle ');
        // 𝒊 → i (italic via KaTeX math mode)
        latex = latex.replace(/𝒊/g, 'i');
        // × → \times
        latex = latex.replace(/×/g, '{\\times}');
        return latex;
    }
}

// ========== BASE-N MODE (Mode 3) ==========
class BaseNMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.currentBase = 10; // DEC
        this.baseName = 'Dec';
        this.input = '';
        this.result = null;
    }
    enter() {
        this.app.clearAll();
        this.currentBase = 10;
        this.baseName = 'Dec';
        this.input = '';
        this.updateBaseIndicator();
    }
    updateBaseIndicator() {
        this.app.displayInputEl.textContent = `[${this.baseName}]`;
    }
    handleKey(key) {
        // Base switching via specific keys
        if (key === 'square') { this.switchBase(10, 'Dec'); return true; }
        if (key === 'power') { this.switchBase(16, 'Hex'); return true; }
        if (key === 'log') { this.switchBase(2, 'Bin'); return true; }
        if (key === 'ln') { this.switchBase(8, 'Oct'); return true; }

        // Hex digits A-F via function keys
        if (this.currentBase === 16) {
            if (key === 'negate') { this.appendInput('A'); return true; }
            if (key === 'dms') { this.appendInput('B'); return true; }
            if (key === 'reciprocal') { this.appendInput('C'); return true; }
            if (key === 'sin') { this.appendInput('D'); return true; }
            if (key === 'cos') { this.appendInput('E'); return true; }
            if (key === 'tan') { this.appendInput('F'); return true; }
        }

        // Number keys - validate for current base
        if (/^[0-9]$/.test(key)) {
            const digit = parseInt(key);
            if (this.currentBase === 2 && digit > 1) return true;
            if (this.currentBase === 8 && digit > 7) return true;
            this.appendInput(key);
            return true;
        }

        // Operators
        if (key === 'add') { this.appendInput('+'); return true; }
        if (key === 'subtract') { this.appendInput('-'); return true; }
        if (key === 'multiply') { this.appendInput('×'); return true; }
        if (key === 'divide') { this.appendInput('÷'); return true; }
        if (key === 'lparen') { this.appendInput('('); return true; }
        if (key === 'rparen') { this.appendInput(')'); return true; }

        if (key === 'equals') {
            this.calculate();
            return true;
        }
        if (key === 'ac') {
            this.input = '';
            this.result = null;
            this.app.displayResultEl.textContent = '0';
            this.updateBaseIndicator();
            return true;
        }
        if (key === 'del') {
            if (this.app.showingResult) {
                this.input = '';
                this.result = null;
                this.app.showingResult = false;
                this.app.displayResultEl.textContent = '0';
                this.updateBaseIndicator();
            } else if (this.input.length > 0) {
                this.input = this.input.slice(0, -1);
                this.app.displayResultEl.textContent = this.input || '0';
            }
            return true;
        }
        if (key === 'ans') {
            this.appendInput('Ans');
            return true;
        }
        return false;
    }
    appendInput(ch) {
        if (this.app.showingResult) {
            if ('+-×÷'.includes(ch)) {
                this.input = 'Ans' + ch;
            } else {
                this.input = ch;
            }
            this.app.showingResult = false;
        } else {
            this.input += ch;
        }
        this.app.displayResultEl.textContent = this.input;
        this.updateBaseIndicator();
    }
    switchBase(base, name) {
        if (this.result !== null) {
            this.currentBase = base;
            this.baseName = name;
            this.displayResult(this.result);
        } else if (this.input && this.app.showingResult) {
            this.currentBase = base;
            this.baseName = name;
            this.displayResult(this.result || 0);
        } else {
            // Convert current input
            if (this.input) {
                try {
                    const val = this.parseInput(this.input);
                    this.currentBase = base;
                    this.baseName = name;
                    this.input = this.engine.toBase(val, base);
                    this.app.displayResultEl.textContent = this.input;
                } catch (e) {
                    this.currentBase = base;
                    this.baseName = name;
                }
            } else {
                this.currentBase = base;
                this.baseName = name;
            }
        }
        this.updateBaseIndicator();
    }
    parseInput(expr) {
        let clean = expr.replace(/Ans/g, String(Math.trunc(this.engine.ans)));
        clean = clean.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');

        // Handle logical operators
        for (const opName of ['xnor', 'xor', 'and', 'or']) {
            const idx = clean.toLowerCase().indexOf(opName);
            if (idx > 0) {
                const left = this.parseBaseNValue(clean.substring(0, idx).trim());
                const right = this.parseBaseNValue(clean.substring(idx + opName.length).trim());
                switch (opName) {
                    case 'and': return this.engine.logicAnd(left, right);
                    case 'or': return this.engine.logicOr(left, right);
                    case 'xor': return this.engine.logicXor(left, right);
                    case 'xnor': return this.engine.logicXnor(left, right);
                }
            }
        }
        // Handle Not() and Neg()
        const notMatch = clean.match(/^Not\((.+)\)$/i);
        if (notMatch) return this.engine.logicNot(this.parseBaseNValue(notMatch[1].trim()));
        const negMatch = clean.match(/^Neg\((.+)\)$/i);
        if (negMatch) return this.engine.logicNeg(this.parseBaseNValue(negMatch[1].trim()));

        return this.parseBaseNValue(clean);
    }
    parseBaseNValue(expr) {
        expr = expr.replace(/Ans/g, String(Math.trunc(this.engine.ans)));
        expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        // Parse in current base
        if (/^[0-9A-Fa-f]+$/.test(expr)) {
            return this.engine.fromBase(expr, this.currentBase);
        }
        // Evaluate expression
        const tokens = expr.match(/([0-9A-Fa-f]+|[+\-*/()])/g);
        if (!tokens) throw new Error('Syntax ERROR');
        let decExpr = '';
        for (const token of tokens) {
            if (/^[0-9A-Fa-f]+$/.test(token)) {
                decExpr += this.engine.fromBase(token, this.currentBase).toString();
            } else {
                decExpr += token;
            }
        }
        const result = this.engine.evaluate(decExpr, { silent: true });
        if (result.error) throw new Error(result.error);
        return Math.trunc(result.value);
    }
    calculate() {
        try {
            const val = this.parseInput(this.input);
            this.result = val;
            this.engine.ans = val;
            this.app.displayInputEl.textContent = `[${this.baseName}] ${this.input}`;
            this.displayResult(val);
            this.app.showingResult = true;
            this.app.justEvaluated = true;
        } catch (e) {
            this.app.displayResultEl.textContent = e.message || 'Math ERROR';
            this.app.displayResultEl.classList.add('error');
        }
    }
    displayResult(val) {
        this.app.displayResultEl.classList.remove('error');
        switch (this.currentBase) {
            case 2: this.app.displayResultEl.textContent = this.engine.formatBinary(val); break;
            case 8: this.app.displayResultEl.textContent = this.engine.formatOctal(val); break;
            case 16: this.app.displayResultEl.textContent = this.engine.formatHex(val); break;
            default: this.app.displayResultEl.textContent = val.toString(); break;
        }
        this.updateBaseIndicator();
    }
    handleOptn(index) {
        const ops = ['and', 'or', 'xor', 'xnor', 'Not(', 'Neg('];
        if (index < ops.length) {
            const op = ops[index];
            if (op.endsWith('(')) {
                this.appendInput(op);
            } else {
                this.appendInput(op);
            }
        }
    }
    getOptnMenu() {
        return [
            { id: 1, name: 'and' },
            { id: 2, name: 'or' },
            { id: 3, name: 'xor' },
            { id: 4, name: 'xnor' },
            { id: 5, name: 'Not(' },
            { id: 6, name: 'Neg(' }
        ];
    }
}

// ========== MATRIX MODE (Mode 4) ==========
class MatrixMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.matrices = { A: null, B: null, C: null, D: null };
        this.matAns = null;
        this.phase = 'calc'; // 'calc','define-select','define-rows','define-cols','editor','result'
        this.defineMode = 'define'; // 'define' or 'edit'
        this.editingMatrix = null;
        this.editRow = 0;
        this.editCol = 0;
        this.editBuffer = '';
        this.pendingRows = 0;
    }
    enter() {
        this.app.clearAll();
        this.phase = 'calc';
    }

    // === Key handling ===
    handleKey(key) {
        // Auto-reset phase when app has been cleared externally
        if (this.phase === 'result' && !this.app.showingResult) {
            this.phase = 'calc';
        }
        if (this.phase === 'define-select') return this.handleDefineSelect(key);
        if (this.phase === 'define-rows') return this.handleDefineRows(key);
        if (this.phase === 'define-cols') return this.handleDefineCols(key);
        if (this.phase === 'editor') return this.handleEditor(key);
        if (this.phase === 'result') return this.handleResult(key);
        // Calc phase: intercept = to evaluate matrix expressions
        if (key === 'equals') {
            this.calculate();
            return true;
        }
        return false;
    }
    handleDefineSelect(key) {
        const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
        if (map[key]) {
            this.editingMatrix = map[key];
            if (this.defineMode === 'edit') {
                if (!this.matrices[this.editingMatrix]) {
                    this.app.displayResultEl.textContent = 'Not Defined';
                    setTimeout(() => { this.phase = 'calc'; this.app.clearAll(); }, 1000);
                    return true;
                }
                this.editRow = 0; this.editCol = 0; this.editBuffer = '';
                this.phase = 'editor';
                this.renderEditor();
                return true;
            }
            this.phase = 'define-rows';
            this.renderDimensionPrompt('rows');
            return true;
        }
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        return true;
    }
    handleDefineRows(key) {
        if (/^[1-4]$/.test(key)) {
            this.pendingRows = parseInt(key);
            this.phase = 'define-cols';
            this.renderDimensionPrompt('cols');
            return true;
        }
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        return true;
    }
    handleDefineCols(key) {
        if (/^[1-4]$/.test(key)) {
            const cols = parseInt(key);
            this.matrices[this.editingMatrix] = this.engine.matrixCreate(this.pendingRows, cols);
            this.editRow = 0; this.editCol = 0; this.editBuffer = '';
            this.phase = 'editor';
            this.renderEditor();
            return true;
        }
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        return true;
    }
    handleEditor(key) {
        const m = this.matrices[this.editingMatrix];
        if (!m) return true;
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderEditor(); return true;
        }
        if (key === 'negate' || key === 'subtract') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderEditor(); return true;
        }
        if (key === 'equals') {
            // Commit value, move to next cell
            const val = this.editBuffer === '' ? m.data[this.editRow][this.editCol] : parseFloat(this.editBuffer);
            if (!isNaN(val)) m.data[this.editRow][this.editCol] = val;
            this.editBuffer = '';
            this.editCol++;
            if (this.editCol >= m.cols) { this.editCol = 0; this.editRow++; }
            if (this.editRow >= m.rows) {
                // Last cell done — exit editor
                this.phase = 'calc'; this.app.clearAll(); return true;
            }
            this.renderEditor(); return true;
        }
        if (key === 'up') { if (this.editRow > 0) { this.commitCell(m); this.editRow--; } this.renderEditor(); return true; }
        if (key === 'down') { if (this.editRow < m.rows - 1) { this.commitCell(m); this.editRow++; } this.renderEditor(); return true; }
        if (key === 'left') { if (this.editCol > 0) { this.commitCell(m); this.editCol--; } this.renderEditor(); return true; }
        if (key === 'right') { if (this.editCol < m.cols - 1) { this.commitCell(m); this.editCol++; } this.renderEditor(); return true; }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderEditor(); return true; }
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        return true;
    }
    commitCell(m) {
        if (this.editBuffer !== '') {
            const val = parseFloat(this.editBuffer);
            if (!isNaN(val)) m.data[this.editRow][this.editCol] = val;
            this.editBuffer = '';
        }
    }
    handleResult(key) {
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        // Operator after result: start new expr with MatAns
        const opKeys = { 'add': '+', 'subtract': '−', 'multiply': '×', 'divide': '÷' };
        if (opKeys[key] && this.matAns) {
            this.phase = 'calc';
            this.app.showingResult = false;
            this.app.justEvaluated = false;
            this.app.input = 'MatAns';
            this.app.displayInput = 'MatAns';
            this.app.cursorPos = 6;
            this.app.inputChar(opKeys[key]);
            return true;
        }
        // Any other key: exit result, return to calc, let app handle
        this.phase = 'calc';
        this.app.showingResult = false;
        this.app.justEvaluated = false;
        return false;
    }

    // === Display rendering ===
    renderDimensionPrompt(type) {
        const name = `Mat${this.editingMatrix}`;
        if (type === 'rows') {
            this.app.displayInputEl.innerHTML = `<div style="font-size:11px;font-family:monospace;font-weight:700;">${name}<br>Number of Rows?</div>`;
            this.app.displayResultEl.innerHTML = `<div style="font-size:12px;font-family:monospace;text-align:left;padding-top:4px;">Select 1~4</div>`;
        } else {
            this.app.displayInputEl.innerHTML = `<div style="font-size:11px;font-family:monospace;font-weight:700;">${name}<br>Number of<br>&nbsp;&nbsp;&nbsp;&nbsp;Columns?</div>`;
            this.app.displayResultEl.innerHTML = `<div style="font-size:12px;font-family:monospace;text-align:left;padding-top:4px;">Select 1~4</div>`;
        }
    }
    renderDefineSelectMenu() {
        const title = this.defineMode === 'edit' ? 'Edit Matrix' : 'Define Matrix';
        this.app.displayInputEl.innerHTML = `<div style="font-size:11px;font-family:monospace;font-weight:700;">${title}</div>`;
        this.app.displayResultEl.innerHTML =
            '<div style="font-size:10px;font-family:monospace;line-height:1.6;">' +
            '1:MatA&nbsp;&nbsp;2:MatB<br>3:MatC&nbsp;&nbsp;4:MatD</div>';
    }
    renderEditor() {
        const m = this.matrices[this.editingMatrix];
        if (!m) return;
        this.app.displayInputEl.textContent = `Mat${this.editingMatrix}=`;
        const fs = m.rows > 2 || m.cols > 3 ? '8px' : '10px';
        let html = `<div style="font-size:${fs};line-height:1.3;font-family:monospace;display:flex;flex-direction:column;">`;
        // Matrix with brackets
        html += '<div style="display:flex;align-items:stretch;">';
        html += '<div style="font-size:1.4em;line-height:1;display:flex;align-items:center;padding-right:1px;">[</div>';
        html += '<div>';
        for (let i = 0; i < m.rows; i++) {
            html += '<div style="display:flex;white-space:nowrap;">';
            for (let j = 0; j < m.cols; j++) {
                const isCurrent = i === this.editRow && j === this.editCol;
                const val = this.engine.formatResult(m.data[i][j]);
                const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
                html += `<span style="display:inline-block;min-width:20px;text-align:right;padding:0 2px;${bg}">${val}</span>`;
            }
            html += '</div>';
        }
        html += '</div>';
        html += '<div style="font-size:1.4em;line-height:1;display:flex;align-items:center;padding-left:1px;">]</div>';
        html += '</div>';
        // Edit buffer shown bottom-right
        if (this.editBuffer !== '') {
            html += `<div style="text-align:right;font-size:12px;font-weight:700;padding-top:1px;">${this.editBuffer}</div>`;
        }
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
        this.app.displayResultEl.style.textAlign = 'left';
    }
    showMatAns() {
        if (!this.matAns) return;
        this.app.displayInputEl.textContent = 'MatAns=';
        const m = this.matAns;
        // Use KaTeX bmatrix if available
        if (typeof katex !== 'undefined') {
            let latex = '\\begin{bmatrix}';
            for (let i = 0; i < m.rows; i++) {
                latex += m.data[i].map(v => this.engine.formatResult(parseFloat(v.toPrecision(10)))).join(' & ');
                if (i < m.rows - 1) latex += ' \\\\ ';
            }
            latex += '\\end{bmatrix}';
            this.app.renderKatex(this.app.displayResultEl, latex);
        } else {
            const fs = m.rows > 2 || m.cols > 3 ? '8px' : '10px';
            let html = `<div style="font-size:${fs};line-height:1.3;font-family:monospace;">`;
            for (let i = 0; i < m.rows; i++) {
                html += '[' + m.data[i].map(v => this.engine.formatResult(v)).join('  ') + ']<br>';
            }
            html += '</div>';
            this.app.displayResultEl.innerHTML = html;
        }
        this.phase = 'result';
    }

    // === OPTN menu ===
    getOptnMenu() {
        return [
            { id: 1, name: 'Define Matrix' },
            { id: 2, name: 'Edit Matrix' },
            { id: 3, name: 'MatA' },
            { id: 4, name: 'MatB' },
            { id: 5, name: 'MatC' },
            { id: 6, name: 'MatD' },
            { id: 7, name: 'MatAns' },
            { id: 8, name: 'Determinant' },
            { id: 9, name: 'Transposition' },
            { id: 0, name: 'Identity' },
        ];
    }
    handleOptn(index) {
        switch (index) {
            case 0: // Define Matrix
                this.defineMode = 'define';
                this.phase = 'define-select';
                this.renderDefineSelectMenu();
                break;
            case 1: // Edit Matrix
                this.defineMode = 'edit';
                this.phase = 'define-select';
                this.renderDefineSelectMenu();
                break;
            case 2: this.app.inputChar('MatA'); break;
            case 3: this.app.inputChar('MatB'); break;
            case 4: this.app.inputChar('MatC'); break;
            case 5: this.app.inputChar('MatD'); break;
            case 6: this.app.inputChar('MatAns'); break;
            case 7: this.app.inputFunc('Det('); break;
            case 8: this.app.inputFunc('Trn('); break;
            case 9: this.app.inputFunc('Identity('); break;
        }
    }

    // === Matrix expression evaluator ===
    calculate() {
        const expr = this.app.input;
        if (!expr) return;
        try {
            let s = expr.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
            this.mTokens = this.mTokenize(s);
            this.mPos = 0;
            const result = this.mParseExpr();

            // Render input
            const isMath = this.engine.inputOutput.startsWith('MathI');
            if (isMath && typeof katex !== 'undefined') {
                this.app.renderKatex(this.app.displayInputEl, this.app.exprToLatex(expr));
            } else {
                this.app.displayInputEl.textContent = expr;
            }

            // Display result
            if (result.type === 'matrix') {
                this.matAns = result.value;
                this.showMatAns();
            } else {
                this.engine.ans = result.value;
                const resultStr = this.engine.formatResult(result.value);
                this.app.renderResultDisplay(this.app.displayResultEl, resultStr, isMath);
                this.phase = 'result';
            }
            this.app.showingResult = true;
            this.app.justEvaluated = true;
        } catch (e) {
            this.app.error = e.message || 'Math ERROR';
            this.app.displayResultEl.textContent = this.app.error;
            this.app.displayResultEl.classList.add('error');
            this.app.showingResult = true;
        }
    }

    // Tokenizer
    mTokenize(s) {
        const tokens = [];
        let i = 0;
        while (i < s.length) {
            if (/\s/.test(s[i])) { i++; continue; }
            // Multi-char keywords (longest first)
            const keywords = [
                ['MatAns', { type: 'matans' }],
                ['MatA', { type: 'matrix', name: 'A' }],
                ['MatB', { type: 'matrix', name: 'B' }],
                ['MatC', { type: 'matrix', name: 'C' }],
                ['MatD', { type: 'matrix', name: 'D' }],
                ['Identity(', { type: 'func', value: 'identity', paren: true }],
                ['Det(', { type: 'func', value: 'det', paren: true }],
                ['Trn(', { type: 'func', value: 'trn', paren: true }],
                ['Abs(', { type: 'func', value: 'abs', paren: true }],
                ['Ans', { type: 'num', value: this.engine.ans }],
            ];
            let matched = false;
            for (const [kw, tok] of keywords) {
                if (s.startsWith(kw, i)) {
                    tokens.push({ ...tok });
                    if (tok.paren) tokens.push({ type: '(' });
                    i += kw.length;
                    matched = true;
                    break;
                }
            }
            if (matched) continue;
            // Numbers
            if (/[\d.]/.test(s[i])) {
                let num = '';
                while (i < s.length && /[\d.]/.test(s[i])) { num += s[i]; i++; }
                tokens.push({ type: 'num', value: parseFloat(num) });
                continue;
            }
            // Postfix operators
            if (s.startsWith('⁻¹', i)) { tokens.push({ type: 'inv' }); i += 2; continue; }
            if (s[i] === '²') { tokens.push({ type: 'pow', value: 2 }); i++; continue; }
            if (s[i] === '³') { tokens.push({ type: 'pow', value: 3 }); i++; continue; }
            // Operators and parens
            if ('+-*/'.includes(s[i])) { tokens.push({ type: 'op', value: s[i] }); i++; continue; }
            if (s[i] === '(') { tokens.push({ type: '(' }); i++; continue; }
            if (s[i] === ')') { tokens.push({ type: ')' }); i++; continue; }
            if (s[i] === 'π') { tokens.push({ type: 'num', value: Math.PI }); i++; continue; }
            // Variables
            if (/[A-Fxy]/.test(s[i])) { tokens.push({ type: 'num', value: this.engine.variables[s[i]] || 0 }); i++; continue; }
            i++; // skip unknown
        }
        return tokens;
    }

    // Parser helpers
    mPeek() { return this.mPos < this.mTokens.length ? this.mTokens[this.mPos] : null; }
    mNext() { return this.mTokens[this.mPos++]; }

    // expr → term (('+' | '-') term)*
    mParseExpr() {
        let result = this.mParseTerm();
        while (this.mPeek() && this.mPeek().type === 'op' && '+-'.includes(this.mPeek().value)) {
            const op = this.mNext().value;
            const right = this.mParseTerm();
            if (result.type === 'matrix' && right.type === 'matrix') {
                result = { type: 'matrix', value: op === '+' ? this.engine.matrixAdd(result.value, right.value) : this.engine.matrixSub(result.value, right.value) };
            } else if (result.type === 'scalar' && right.type === 'scalar') {
                result = { type: 'scalar', value: op === '+' ? result.value + right.value : result.value - right.value };
            } else { throw new Error('Dimension ERROR'); }
        }
        return result;
    }

    // term → unary (('*' | '/') unary | implicit_mul)*
    mParseTerm() {
        let result = this.mParseUnary();
        while (this.mPeek()) {
            const t = this.mPeek();
            if (t.type === 'op' && (t.value === '*' || t.value === '/')) {
                this.mPos++;
                const right = this.mParseUnary();
                result = this.mMul(result, right, t.value);
            } else if (t.type === '(' || t.type === 'func' || t.type === 'matrix' || t.type === 'matans' || t.type === 'num') {
                // Implicit multiplication
                const right = this.mParseUnary();
                result = this.mMul(result, right, '*');
            } else { break; }
        }
        return result;
    }
    mMul(a, b, op) {
        if (op === '/') {
            if (a.type === 'scalar' && b.type === 'scalar') return { type: 'scalar', value: a.value / b.value };
            throw new Error('Math ERROR');
        }
        if (a.type === 'matrix' && b.type === 'matrix') return { type: 'matrix', value: this.engine.matrixMul(a.value, b.value) };
        if (a.type === 'scalar' && b.type === 'matrix') return { type: 'matrix', value: this.engine.matrixScalarMul(a.value, b.value) };
        if (a.type === 'matrix' && b.type === 'scalar') return { type: 'matrix', value: this.engine.matrixScalarMul(b.value, a.value) };
        return { type: 'scalar', value: a.value * b.value };
    }

    // unary → '-' unary | '+' unary | postfix
    mParseUnary() {
        if (this.mPeek() && this.mPeek().type === 'op' && this.mPeek().value === '-') {
            this.mPos++;
            const v = this.mParseUnary();
            if (v.type === 'matrix') return { type: 'matrix', value: this.engine.matrixScalarMul(-1, v.value) };
            return { type: 'scalar', value: -v.value };
        }
        if (this.mPeek() && this.mPeek().type === 'op' && this.mPeek().value === '+') { this.mPos++; return this.mParseUnary(); }
        return this.mParsePostfix();
    }

    // postfix → primary ('²' | '³' | '⁻¹')*
    mParsePostfix() {
        let result = this.mParsePrimary();
        while (this.mPeek()) {
            if (this.mPeek().type === 'pow') {
                const n = this.mNext().value;
                if (result.type === 'matrix') {
                    result = { type: 'matrix', value: n === 2 ? this.engine.matrixSquare(result.value) : this.engine.matrixCube(result.value) };
                } else { result = { type: 'scalar', value: Math.pow(result.value, n) }; }
            } else if (this.mPeek().type === 'inv') {
                this.mPos++;
                if (result.type === 'matrix') { result = { type: 'matrix', value: this.engine.matrixInverse(result.value) }; }
                else { result = { type: 'scalar', value: 1 / result.value }; }
            } else { break; }
        }
        return result;
    }

    // primary → num | matrix | matans | '(' expr ')' | func '(' expr ')'
    mParsePrimary() {
        const t = this.mPeek();
        if (!t) throw new Error('Syntax ERROR');

        if (t.type === 'num') { this.mPos++; return { type: 'scalar', value: t.value }; }

        if (t.type === 'matrix') {
            this.mPos++;
            const m = this.matrices[t.name];
            if (!m) throw new Error('Not Defined');
            return { type: 'matrix', value: m };
        }

        if (t.type === 'matans') {
            this.mPos++;
            if (!this.matAns) throw new Error('Not Defined');
            return { type: 'matrix', value: this.matAns };
        }

        if (t.type === '(') {
            this.mPos++;
            const result = this.mParseExpr();
            if (this.mPeek() && this.mPeek().type === ')') this.mPos++;
            return result;
        }

        if (t.type === 'func') {
            const fname = t.value;
            this.mPos++;
            if (this.mPeek() && this.mPeek().type === '(') this.mPos++;
            const arg = this.mParseExpr();
            if (this.mPeek() && this.mPeek().type === ')') this.mPos++;
            switch (fname) {
                case 'det':
                    if (arg.type !== 'matrix') throw new Error('Dimension ERROR');
                    return { type: 'scalar', value: this.engine.matrixDet(arg.value) };
                case 'trn':
                    if (arg.type !== 'matrix') throw new Error('Dimension ERROR');
                    return { type: 'matrix', value: this.engine.matrixTranspose(arg.value) };
                case 'identity':
                    if (arg.type !== 'scalar') throw new Error('Syntax ERROR');
                    return { type: 'matrix', value: this.engine.matrixIdentity(Math.round(arg.value)) };
                case 'abs':
                    if (arg.type === 'matrix') return { type: 'matrix', value: this.engine.matrixAbs(arg.value) };
                    return { type: 'scalar', value: Math.abs(arg.value) };
                default: throw new Error('Syntax ERROR');
            }
        }

        throw new Error('Syntax ERROR');
    }
}

// ========== VECTOR MODE (Mode 5) ==========
class VectorMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.vectors = { A: null, B: null, C: null, D: null };
        this.vctAns = null;
        this.phase = 'calc';
        this.defineMode = 'define';
        this.editingVector = null;
        this.editIndex = 0;
        this.editBuffer = '';
    }
    enter() {
        this.app.clearAll();
        this.phase = 'calc';
    }

    // === Key handling ===
    handleKey(key) {
        if (this.phase === 'result' && !this.app.showingResult) this.phase = 'calc';
        if (this.phase === 'define-select') return this.handleDefineSelect(key);
        if (this.phase === 'define-dim') return this.handleDefineDim(key);
        if (this.phase === 'editor') return this.handleEditor(key);
        if (this.phase === 'result') return this.handleResult(key);
        if (key === 'equals') { this.calculate(); return true; }
        return false;
    }
    handleDefineSelect(key) {
        const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
        if (map[key]) {
            this.editingVector = map[key];
            if (this.defineMode === 'edit') {
                if (!this.vectors[this.editingVector]) {
                    this.app.displayResultEl.textContent = 'Not Defined';
                    setTimeout(() => { this.phase = 'calc'; this.app.clearAll(); }, 1000);
                    return true;
                }
                this.editIndex = 0; this.editBuffer = '';
                this.phase = 'editor';
                this.renderEditor();
                return true;
            }
            this.phase = 'define-dim';
            this.app.displayInputEl.innerHTML = `<div style="font-size:11px;font-family:monospace;font-weight:700;">Vct${this.editingVector}<br>Dimension?</div>`;
            this.app.displayResultEl.innerHTML = '<div style="font-size:12px;font-family:monospace;padding-top:4px;">Select 2~3</div>';
            return true;
        }
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        return true;
    }
    handleDefineDim(key) {
        if (key === '2' || key === '3') {
            const dim = parseInt(key);
            this.vectors[this.editingVector] = new Array(dim).fill(0);
            this.editIndex = 0; this.editBuffer = '';
            this.phase = 'editor';
            this.renderEditor();
            return true;
        }
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        return true;
    }
    handleEditor(key) {
        const v = this.vectors[this.editingVector];
        if (!v) return true;
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderEditor(); return true;
        }
        if (key === 'negate' || key === 'subtract') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderEditor(); return true;
        }
        if (key === 'equals') {
            const val = this.editBuffer === '' ? v[this.editIndex] : parseFloat(this.editBuffer);
            if (!isNaN(val)) v[this.editIndex] = val;
            this.editBuffer = '';
            if (this.editIndex < v.length - 1) {
                this.editIndex++;
                this.renderEditor();
            } else {
                this.phase = 'calc'; this.app.clearAll();
            }
            return true;
        }
        if (key === 'up') { if (this.editIndex > 0) { this.commitVctCell(v); this.editIndex--; } this.renderEditor(); return true; }
        if (key === 'down') { if (this.editIndex < v.length - 1) { this.commitVctCell(v); this.editIndex++; } this.renderEditor(); return true; }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderEditor(); return true; }
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        return true;
    }
    commitVctCell(v) {
        if (this.editBuffer !== '') {
            const val = parseFloat(this.editBuffer);
            if (!isNaN(val)) v[this.editIndex] = val;
            this.editBuffer = '';
        }
    }
    handleResult(key) {
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        const opKeys = { 'add': '+', 'subtract': '−', 'multiply': '×', 'divide': '÷' };
        if (opKeys[key] && this.vctAns) {
            this.phase = 'calc';
            this.app.showingResult = false;
            this.app.justEvaluated = false;
            this.app.input = 'VctAns';
            this.app.displayInput = 'VctAns';
            this.app.cursorPos = 6;
            this.app.inputChar(opKeys[key]);
            return true;
        }
        this.phase = 'calc';
        this.app.showingResult = false;
        this.app.justEvaluated = false;
        return false;
    }

    // === Display ===
    renderDefineSelectMenu() {
        const title = this.defineMode === 'edit' ? 'Edit Vector' : 'Define Vector';
        this.app.displayInputEl.innerHTML = `<div style="font-size:11px;font-family:monospace;font-weight:700;">${title}</div>`;
        this.app.displayResultEl.innerHTML =
            '<div style="font-size:10px;font-family:monospace;line-height:1.6;">1:VctA&nbsp;&nbsp;2:VctB<br>3:VctC&nbsp;&nbsp;4:VctD</div>';
    }
    renderEditor() {
        const v = this.vectors[this.editingVector];
        if (!v) return;
        this.app.displayInputEl.textContent = `Vct${this.editingVector}=`;
        // Vertical column vector with brackets (matching real Casio)
        let html = '<div style="font-size:10px;line-height:1.3;font-family:monospace;display:flex;flex-direction:column;">';
        html += '<div style="display:flex;align-items:stretch;">';
        html += '<div style="font-size:1.4em;line-height:1;display:flex;align-items:center;padding-right:1px;">[</div>';
        html += '<div>';
        for (let i = 0; i < v.length; i++) {
            const isCurrent = i === this.editIndex;
            const val = this.engine.formatResult(v[i]);
            const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            html += `<div style="text-align:right;padding:0 3px;min-width:30px;${bg}">${val}</div>`;
        }
        html += '</div>';
        html += '<div style="font-size:1.4em;line-height:1;display:flex;align-items:center;padding-left:1px;">]</div>';
        html += '</div>';
        if (this.editBuffer !== '') {
            html += `<div style="text-align:right;font-size:12px;font-weight:700;padding-top:1px;">${this.editBuffer}</div>`;
        }
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
        this.app.displayResultEl.style.textAlign = 'left';
    }
    showVctAns() {
        if (!this.vctAns) return;
        this.app.displayInputEl.textContent = 'VctAns=';
        const v = this.vctAns;
        if (typeof katex !== 'undefined') {
            let latex = '\\begin{bmatrix}';
            latex += v.map(x => this.engine.formatResult(parseFloat(x.toPrecision(10)))).join(' \\\\ ');
            latex += '\\end{bmatrix}';
            this.app.renderKatex(this.app.displayResultEl, latex);
        } else {
            this.app.displayResultEl.textContent = '[ ' + v.map(x => this.engine.formatResult(x)).join(', ') + ' ]';
        }
        this.phase = 'result';
    }

    // === OPTN menu ===
    getOptnMenu() {
        return [
            { id: 1, name: 'Define Vector' },
            { id: 2, name: 'Edit Vector' },
            { id: 3, name: 'VctA' },
            { id: 4, name: 'VctB' },
            { id: 5, name: 'VctC' },
            { id: 6, name: 'VctD' },
            { id: 7, name: 'VctAns' },
            { id: 8, name: 'Dot Product' },
            { id: 9, name: 'Angle' },
            { id: 0, name: 'Unit Vector' },
        ];
    }
    handleOptn(index) {
        switch (index) {
            case 0: // Define Vector
                this.defineMode = 'define';
                this.phase = 'define-select';
                this.renderDefineSelectMenu();
                break;
            case 1: // Edit Vector
                this.defineMode = 'edit';
                this.phase = 'define-select';
                this.renderDefineSelectMenu();
                break;
            case 2: this.app.inputChar('VctA'); break;
            case 3: this.app.inputChar('VctB'); break;
            case 4: this.app.inputChar('VctC'); break;
            case 5: this.app.inputChar('VctD'); break;
            case 6: this.app.inputChar('VctAns'); break;
            case 7: this.app.inputChar('•'); break;     // Dot product operator
            case 8: this.app.inputFunc('Angle('); break;
            case 9: this.app.inputFunc('UnitV('); break;
        }
    }

    // === Vector expression evaluator ===
    calculate() {
        const expr = this.app.input;
        if (!expr) return;
        try {
            let s = expr.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
            this.vTokens = this.vTokenize(s);
            this.vPos = 0;
            const result = this.vParseExpr();

            const isMath = this.engine.inputOutput.startsWith('MathI');
            if (isMath && typeof katex !== 'undefined') {
                this.app.renderKatex(this.app.displayInputEl, this.app.exprToLatex(expr));
            } else {
                this.app.displayInputEl.textContent = expr;
            }

            if (result.type === 'vector') {
                this.vctAns = result.value;
                this.showVctAns();
            } else {
                this.engine.ans = result.value;
                const resultStr = this.engine.formatResult(result.value);
                this.app.renderResultDisplay(this.app.displayResultEl, resultStr, isMath);
                this.phase = 'result';
            }
            this.app.showingResult = true;
            this.app.justEvaluated = true;
        } catch (e) {
            this.app.error = e.message || 'Math ERROR';
            this.app.displayResultEl.textContent = this.app.error;
            this.app.displayResultEl.classList.add('error');
            this.app.showingResult = true;
        }
    }

    // Tokenizer
    vTokenize(s) {
        const tokens = [];
        let i = 0;
        while (i < s.length) {
            if (/\s/.test(s[i])) { i++; continue; }
            const keywords = [
                ['VctAns', { type: 'vctans' }],
                ['VctA', { type: 'vector', name: 'A' }],
                ['VctB', { type: 'vector', name: 'B' }],
                ['VctC', { type: 'vector', name: 'C' }],
                ['VctD', { type: 'vector', name: 'D' }],
                ['Angle(', { type: 'func', value: 'angle', paren: true }],
                ['UnitV(', { type: 'func', value: 'unitv', paren: true }],
                ['Abs(', { type: 'func', value: 'abs', paren: true }],
                ['Ans', { type: 'num', value: this.engine.ans }],
            ];
            let matched = false;
            for (const [kw, tok] of keywords) {
                if (s.startsWith(kw, i)) {
                    tokens.push({ ...tok });
                    if (tok.paren) tokens.push({ type: '(' });
                    i += kw.length; matched = true; break;
                }
            }
            if (matched) continue;
            if (/[\d.]/.test(s[i])) {
                let num = '';
                while (i < s.length && /[\d.]/.test(s[i])) { num += s[i]; i++; }
                tokens.push({ type: 'num', value: parseFloat(num) }); continue;
            }
            if (s[i] === '•') { tokens.push({ type: 'dot' }); i++; continue; }
            if (s[i] === '²') { tokens.push({ type: 'pow', value: 2 }); i++; continue; }
            if (s[i] === 'π') { tokens.push({ type: 'num', value: Math.PI }); i++; continue; }
            if ('+-*/'.includes(s[i])) { tokens.push({ type: 'op', value: s[i] }); i++; continue; }
            if (s[i] === '(') { tokens.push({ type: '(' }); i++; continue; }
            if (s[i] === ')') { tokens.push({ type: ')' }); i++; continue; }
            if (s[i] === ',') { tokens.push({ type: ',' }); i++; continue; }
            if (/[A-Fxy]/.test(s[i])) { tokens.push({ type: 'num', value: this.engine.variables[s[i]] || 0 }); i++; continue; }
            i++;
        }
        return tokens;
    }

    // Parser helpers
    vPeek() { return this.vPos < this.vTokens.length ? this.vTokens[this.vPos] : null; }
    vNext() { return this.vTokens[this.vPos++]; }

    // expr → dotExpr (('+' | '-') dotExpr)*
    vParseExpr() {
        let result = this.vParseDot();
        while (this.vPeek() && this.vPeek().type === 'op' && '+-'.includes(this.vPeek().value)) {
            const op = this.vNext().value;
            const right = this.vParseDot();
            if (result.type === 'vector' && right.type === 'vector') {
                result = { type: 'vector', value: op === '+' ? this.engine.vectorAdd(result.value, right.value) : this.engine.vectorSub(result.value, right.value) };
            } else if (result.type === 'scalar' && right.type === 'scalar') {
                result = { type: 'scalar', value: op === '+' ? result.value + right.value : result.value - right.value };
            } else { throw new Error('Dimension ERROR'); }
        }
        return result;
    }

    // dotExpr → term ('•' term)?  (dot product returns scalar)
    vParseDot() {
        let result = this.vParseTerm();
        while (this.vPeek() && this.vPeek().type === 'dot') {
            this.vPos++;
            const right = this.vParseTerm();
            if (result.type === 'vector' && right.type === 'vector') {
                result = { type: 'scalar', value: this.engine.vectorDot(result.value, right.value) };
            } else { throw new Error('Dimension ERROR'); }
        }
        return result;
    }

    // term → unary (('*' | '/') unary | implicit_mul)*
    // * between vectors = cross product
    vParseTerm() {
        let result = this.vParseUnary();
        while (this.vPeek()) {
            const t = this.vPeek();
            if (t.type === 'op' && (t.value === '*' || t.value === '/')) {
                this.vPos++;
                const right = this.vParseUnary();
                if (t.value === '/') {
                    if (result.type === 'scalar' && right.type === 'scalar') { result = { type: 'scalar', value: result.value / right.value }; }
                    else throw new Error('Math ERROR');
                } else {
                    // * = cross product for vector×vector, scalar mul otherwise
                    if (result.type === 'vector' && right.type === 'vector') {
                        result = { type: 'vector', value: this.engine.vectorCross(result.value, right.value) };
                    } else if (result.type === 'scalar' && right.type === 'vector') {
                        result = { type: 'vector', value: this.engine.vectorScalarMul(result.value, right.value) };
                    } else if (result.type === 'vector' && right.type === 'scalar') {
                        result = { type: 'vector', value: this.engine.vectorScalarMul(right.value, result.value) };
                    } else {
                        result = { type: 'scalar', value: result.value * right.value };
                    }
                }
            } else if (t.type === '(' || t.type === 'func' || t.type === 'vector' || t.type === 'vctans' || t.type === 'num') {
                const right = this.vParseUnary();
                // Implicit mul: scalar×vector or scalar×scalar
                if (result.type === 'scalar' && right.type === 'vector') {
                    result = { type: 'vector', value: this.engine.vectorScalarMul(result.value, right.value) };
                } else if (result.type === 'scalar' && right.type === 'scalar') {
                    result = { type: 'scalar', value: result.value * right.value };
                } else { throw new Error('Dimension ERROR'); }
            } else { break; }
        }
        return result;
    }

    vParseUnary() {
        if (this.vPeek() && this.vPeek().type === 'op' && this.vPeek().value === '-') {
            this.vPos++;
            const v = this.vParseUnary();
            if (v.type === 'vector') return { type: 'vector', value: this.engine.vectorScalarMul(-1, v.value) };
            return { type: 'scalar', value: -v.value };
        }
        if (this.vPeek() && this.vPeek().type === 'op' && this.vPeek().value === '+') { this.vPos++; return this.vParseUnary(); }
        return this.vParsePostfix();
    }

    vParsePostfix() {
        let result = this.vParsePrimary();
        while (this.vPeek() && this.vPeek().type === 'pow') {
            const n = this.vNext().value;
            if (result.type === 'scalar') result = { type: 'scalar', value: Math.pow(result.value, n) };
            else throw new Error('Math ERROR');
        }
        return result;
    }

    vParsePrimary() {
        const t = this.vPeek();
        if (!t) throw new Error('Syntax ERROR');
        if (t.type === 'num') { this.vPos++; return { type: 'scalar', value: t.value }; }
        if (t.type === 'vector') {
            this.vPos++;
            const v = this.vectors[t.name];
            if (!v) throw new Error('Not Defined');
            return { type: 'vector', value: v };
        }
        if (t.type === 'vctans') {
            this.vPos++;
            if (!this.vctAns) throw new Error('Not Defined');
            return { type: 'vector', value: this.vctAns };
        }
        if (t.type === '(') {
            this.vPos++;
            const result = this.vParseExpr();
            if (this.vPeek() && this.vPeek().type === ')') this.vPos++;
            return result;
        }
        if (t.type === 'func') {
            const fname = t.value;
            this.vPos++;
            if (this.vPeek() && this.vPeek().type === '(') this.vPos++;
            const arg1 = this.vParseExpr();
            let arg2 = null;
            if (this.vPeek() && this.vPeek().type === ',') {
                this.vPos++;
                arg2 = this.vParseExpr();
            }
            if (this.vPeek() && this.vPeek().type === ')') this.vPos++;
            switch (fname) {
                case 'angle':
                    if (!arg2 || arg1.type !== 'vector' || arg2.type !== 'vector') throw new Error('Syntax ERROR');
                    return { type: 'scalar', value: this.engine.vectorAngle(arg1.value, arg2.value) };
                case 'unitv':
                    if (arg1.type !== 'vector') throw new Error('Dimension ERROR');
                    return { type: 'vector', value: this.engine.vectorUnit(arg1.value) };
                case 'abs':
                    if (arg1.type === 'vector') return { type: 'scalar', value: this.engine.vectorMagnitude(arg1.value) };
                    return { type: 'scalar', value: Math.abs(arg1.value) };
                default: throw new Error('Syntax ERROR');
            }
        }
        throw new Error('Syntax ERROR');
    }
}

// ========== STATISTICS MODE (Mode 6) ==========
class StatisticsMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.calcType = null;
        this.calcTypeIndex = 0;
        this.data = [];
        this.phase = 'select-type';
        this.editorRow = 0;
        this.editorCol = 0;
        this.editBuffer = '';
        this.showFreq = this.engine.statFrequency || false;
        this.isPaired = false;
        this.statResult = null;
        this.regResult = null;
        this.resultScrollPos = 0;
        this.statLines = [];
        this.statVars = {};
    }
    enter() {
        this.app.clearAll();
        this.phase = 'select-type';
        this.showSelectType();
    }
    showSelectType() {
        this.app.menuOpen = true;
        this.app.menuType = 'stat-type';
        this.app.menuSelection = 0;
        this.app.menuItems = [
            { id: 1, name: '1-Variable' },
            { id: 2, name: 'y=a+bx' },
            { id: 3, name: 'y=a+bx+cx\u00b2' },
            { id: 4, name: 'y=a+b\u00b7ln(x)' },
            { id: 5, name: 'y=a\u00b7e^(bx)' },
            { id: 6, name: 'y=a\u00b7b^x' },
            { id: 7, name: 'y=a\u00b7x^b' },
            { id: 8, name: 'y=a+b/x' }
        ];
        this.app.renderMenu();
    }
    selectType(index) {
        if (this.data.length > 0) {
            this.pendingTypeIndex = index;
            this.phase = 'confirm-clear';
            this.app.displayInputEl.textContent = 'Clear memory?';
            this.app.displayResultEl.innerHTML =
                '<div style="font-size:10px;font-family:monospace;text-align:center;padding:8px 0;">[=] :Yes<br>[AC] :Cancel</div>';
            this.app.menuOpen = false;
            return;
        }
        this.doSelectType(index);
    }
    doSelectType(index) {
        this.calcTypeIndex = index;
        const types = ['1-Variable', 'y=a+bx', 'y=a+bx+cx\u00b2', 'y=a+b\u00b7ln(x)',
                       'y=a\u00b7e^(bx)', 'y=a\u00b7b^x', 'y=a\u00b7x^b', 'y=a+b/x'];
        this.calcType = types[index];
        this.isPaired = index > 0;
        this.data = [];
        this.editorRow = 0;
        this.editorCol = 0;
        this.editBuffer = '';
        this.phase = 'editor';
        this.app.menuOpen = false;
        this.renderEditor();
    }
    handleKey(key) {
        if (this.phase === 'confirm-clear') {
            if (key === 'equals') { this.doSelectType(this.pendingTypeIndex); return true; }
            if (key === 'ac') { this.phase = 'editor'; this.renderEditor(); return true; }
            return true;
        }
        if (this.phase === 'editor') return this.handleEditorKey(key);
        if (this.phase === 'stat-result') return this.handleStatResultKey(key);
        if (this.phase === 'stat-calc') return this.handleStatCalcKey(key);
        return false;
    }
    handleEditorKey(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderEditor(); return true;
        }
        if (key === 'negate' || key === 'subtract') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderEditor(); return true;
        }
        if (key === 'equals') {
            const val = this.editBuffer === '' ? 0 : parseFloat(this.editBuffer);
            if (isNaN(val)) { this.editBuffer = ''; return true; }
            while (this.data.length <= this.editorRow) this.data.push({ x: 0, y: 0, freq: 1 });
            if (this.editorCol === 0) this.data[this.editorRow].x = val;
            else if (this.editorCol === 1 && this.isPaired) this.data[this.editorRow].y = val;
            else this.data[this.editorRow].freq = Math.max(1, Math.round(val));
            this.editBuffer = '';
            const maxCol = this.isPaired ? (this.showFreq ? 2 : 1) : (this.showFreq ? 1 : 0);
            this.editorCol++;
            if (this.editorCol > maxCol) { this.editorCol = 0; this.editorRow++; }
            this.renderEditor(); return true;
        }
        if (key === 'up') { if (this.editorRow > 0) { this.editorRow--; this.editBuffer = ''; } this.renderEditor(); return true; }
        if (key === 'down') { this.editorRow++; this.editBuffer = ''; this.renderEditor(); return true; }
        if (key === 'left') { if (this.editorCol > 0) { this.editorCol--; this.editBuffer = ''; } this.renderEditor(); return true; }
        if (key === 'right') {
            const maxCol = this.isPaired ? (this.showFreq ? 2 : 1) : (this.showFreq ? 1 : 0);
            if (this.editorCol < maxCol) { this.editorCol++; this.editBuffer = ''; }
            this.renderEditor(); return true;
        }
        if (key === 'del') {
            if (this.editBuffer.length > 0) { this.editBuffer = this.editBuffer.slice(0, -1); }
            else if (this.data.length > this.editorRow) {
                this.data.splice(this.editorRow, 1);
                if (this.editorRow >= this.data.length && this.editorRow > 0) this.editorRow--;
            }
            this.renderEditor(); return true;
        }
        if (key === 'ac') {
            this.phase = 'stat-calc';
            this.calculateStats();
            this.app.clearAll();
            this.app.displayResultEl.innerHTML =
                '<div style="font-size:12px;font-family:monospace;text-align:right;padding-top:8px;">Statistics<br>' +
                (this.isPaired ? '2-Variable' : '1-Variable') + '</div>';
            return true;
        }
        return true;
    }
    renderEditor() {
        const cols = ['x'];
        if (this.isPaired) cols.push('y');
        if (this.showFreq) cols.push('Freq');
        this.app.displayInputEl.textContent = '';
        let html = '<div style="font-size:8px;font-family:monospace;line-height:1.3;">';
        html += '<table style="border-collapse:collapse;width:100%;">';
        html += '<tr><td style="padding:0 1px;border-bottom:1px solid #1a1a1a;"></td>';
        for (const col of cols) {
            html += '<td style="padding:0 2px;text-align:center;font-weight:bold;border-bottom:1px solid #1a1a1a;">' + col + '</td>';
        }
        html += '</tr>';
        const startRow = Math.max(0, this.editorRow - 1);
        const endRow = Math.min(Math.max(this.data.length, this.editorRow + 1) + 1, startRow + 4);
        for (let i = startRow; i < endRow; i++) {
            const row = this.data[i] || { x: 0, y: 0, freq: 1 };
            html += '<tr>';
            html += '<td style="padding:0 1px;font-weight:bold;border-right:1px solid #999;">' + (i + 1) + '</td>';
            for (let c = 0; c < cols.length; c++) {
                const isCurrent = i === this.editorRow && c === this.editorCol;
                let val = c === 0 ? row.x : (c === 1 && this.isPaired ? row.y : row.freq);
                const display = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                    (i < this.data.length ? this.engine.formatResult(val) : '');
                const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
                html += '<td style="padding:0 2px;text-align:right;min-width:25px;' + bg + '">' + display + '</td>';
            }
            html += '</tr>';
        }
        html += '</table></div>';
        if (this.editBuffer !== '') {
            html += '<div style="font-size:11px;font-family:monospace;text-align:right;font-weight:700;">' + this.editBuffer + '</div>';
        }
        this.app.displayResultEl.innerHTML = html;
        this.app.displayResultEl.style.textAlign = 'left';
    }
    calculateStats() {
        if (this.data.length === 0) return;
        const xData = this.data.map(d => d.x);
        const freqs = this.showFreq ? this.data.map(d => d.freq) : null;
        if (!this.isPaired) {
            this.statResult = this.engine.statCalc(xData, freqs);
        } else {
            const yData = this.data.map(d => d.y);
            this.statResult = this.engine.statCalcPaired(xData, yData, freqs);
            try {
                switch (this.calcTypeIndex) {
                    case 1: this.regResult = this.engine.linearRegression(xData, yData, freqs); break;
                    case 2: this.regResult = this.engine.quadraticRegression(xData, yData, freqs); break;
                    case 3: this.regResult = this.engine.logarithmicRegression(xData, yData, freqs); break;
                    case 4: this.regResult = this.engine.eExponentialRegression(xData, yData, freqs); break;
                    case 5: this.regResult = this.engine.abExponentialRegression(xData, yData, freqs); break;
                    case 6: this.regResult = this.engine.powerRegression(xData, yData, freqs); break;
                    case 7: this.regResult = this.engine.inverseRegression(xData, yData, freqs); break;
                }
            } catch (e) { this.regResult = null; }
        }
        this.buildStatVarMap();
    }
    buildStatVarMap() {
        const s = this.statResult;
        if (!s) return;
        this.statVars = {};
        if (!this.isPaired) {
            this.statLines = [
                { label: 'x\u0304', value: s.mean },
                { label: '\u03a3x', value: s.sumX },
                { label: '\u03a3x\u00b2', value: s.sumX2 },
                { label: '\u03c3\u00b2x', value: s.popVariance },
                { label: '\u03c3x', value: s.popStdDev },
                { label: 'S\u00b2x', value: s.sampVariance },
                { label: 'sx', value: s.sampStdDev },
                { label: 'n', value: s.n },
                { label: 'min(x)', value: s.min },
                { label: 'Q\u2081', value: s.q1 },
                { label: 'Med', value: s.median },
                { label: 'Q\u2083', value: s.q3 },
                { label: 'max(x)', value: s.max },
            ];
        } else {
            this.statLines = [
                { label: 'x\u0304', value: s.meanX },
                { label: '\u03a3x', value: s.sumX },
                { label: '\u03a3x\u00b2', value: s.sumX2 },
                { label: '\u03c3\u00b2x', value: s.popVarX },
                { label: '\u03c3x', value: s.popStdDevX },
                { label: 'S\u00b2x', value: s.sampVarX },
                { label: 'sx', value: s.sampStdDevX },
                { label: 'n', value: s.n },
                { label: 'y\u0304', value: s.meanY },
                { label: '\u03a3y', value: s.sumY },
                { label: '\u03a3y\u00b2', value: s.sumY2 },
                { label: '\u03c3\u00b2y', value: s.popVarY },
                { label: '\u03c3y', value: s.popStdDevY },
                { label: 'S\u00b2y', value: s.sampVarY },
                { label: 'sy', value: s.sampStdDevY },
                { label: '\u03a3xy', value: s.sumXY },
                { label: '\u03a3x\u00b3', value: s.sumX3 },
                { label: '\u03a3x\u00b2y', value: s.sumX2Y },
                { label: '\u03a3x\u2074', value: s.sumX4 },
                { label: 'min(x)', value: s.minX },
                { label: 'max(x)', value: s.maxX },
                { label: 'min(y)', value: s.minY },
                { label: 'max(y)', value: s.maxY },
            ];
        }
        for (const line of this.statLines) {
            this.statVars[line.label] = line.value;
        }
    }
    showStatResults() {
        this.calculateStats();
        if (!this.statResult) return;
        this.resultScrollPos = 0;
        this.phase = 'stat-result';
        this.renderStatResult();
    }
    renderStatResult() {
        const lines = this.statLines;
        if (!lines || lines.length === 0) return;
        const start = this.resultScrollPos;
        const end = Math.min(lines.length, start + 6);
        this.app.displayInputEl.textContent = '';
        let html = '<div style="font-size:8px;font-family:monospace;line-height:1.3;text-align:left;">';
        for (let i = start; i < end; i++) {
            const { label, value } = lines[i];
            html += '<div>' + label + '<span style="float:right;">=' + this.engine.formatResult(value) + '</span></div>';
        }
        if (end < lines.length) html += '<div style="text-align:right;font-size:7px;">\u25bc</div>';
        if (start > 0) html += '<div style="text-align:right;font-size:7px;">\u25b2</div>';
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
    }
    handleStatResultKey(key) {
        if (key === 'down') {
            if (this.resultScrollPos + 6 < this.statLines.length) { this.resultScrollPos += 6; this.renderStatResult(); }
            return true;
        }
        if (key === 'up') {
            if (this.resultScrollPos > 0) { this.resultScrollPos -= 6; this.renderStatResult(); }
            return true;
        }
        if (key === 'ac') { this.phase = 'editor'; this.renderEditor(); return true; }
        return true;
    }
    showRegressionResults() {
        this.calculateStats();
        if (!this.regResult) {
            this.app.displayResultEl.textContent = 'Math ERROR';
            this.phase = 'stat-result';
            return;
        }
        this.phase = 'stat-result';
        const r = this.regResult;
        this.app.displayInputEl.textContent = '';
        let html = '<div style="font-size:9px;font-family:monospace;line-height:1.4;text-align:left;">';
        html += '<div>' + this.calcType + '</div>';
        html += '<div style="text-align:right;">a=' + this.engine.formatResult(r.a) + '</div>';
        html += '<div style="text-align:right;">b=' + this.engine.formatResult(r.b) + '</div>';
        if (r.c !== undefined) html += '<div style="text-align:right;">c=' + this.engine.formatResult(r.c) + '</div>';
        if (r.r !== undefined) html += '<div style="text-align:right;">r=' + this.engine.formatResult(r.r) + '</div>';
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
    }
    handleStatCalcKey(key) {
        if (key === 'ac') { this.phase = 'editor'; this.renderEditor(); return true; }
        if (key === 'equals') { this.evaluateStatExpr(); return true; }
        return false;
    }
    evaluateStatExpr() {
        const expr = this.app.input;
        if (!expr) return;
        try {
            let evalExpr = expr;
            if (this.statVars) {
                const keys = Object.keys(this.statVars).sort((a, b) => b.length - a.length);
                for (const key of keys) {
                    const val = this.statVars[key];
                    if (val !== undefined) evalExpr = evalExpr.split(key).join('(' + val + ')');
                }
            }
            const result = this.engine.evaluate(evalExpr);
            if (result.error) throw new Error(result.error);
            const isMath = this.engine.inputOutput.startsWith('MathI');
            if (isMath && typeof katex !== 'undefined') {
                this.app.renderKatex(this.app.displayInputEl, this.app.exprToLatex(expr));
            } else {
                this.app.displayInputEl.textContent = expr;
            }
            this.app.renderResultDisplay(this.app.displayResultEl, this.engine.formatResult(result.value), isMath);
            this.engine.ans = result.value;
            this.app.showingResult = true;
            this.app.justEvaluated = true;
        } catch (e) {
            this.app.displayResultEl.textContent = e.message || 'Math ERROR';
            this.app.displayResultEl.classList.add('error');
            this.app.showingResult = true;
        }
    }
    getOptnMenu() {
        if (this.phase === 'stat-calc') {
            const items = [
                { id: 1, name: 'Summation' },
                { id: 2, name: 'Variable' },
                { id: 3, name: 'Min/Max' },
            ];
            if (!this.isPaired) items.push({ id: 4, name: 'Norm Dist' });
            else items.push({ id: 4, name: 'Regression' });
            return items;
        }
        const items = [
            { id: 1, name: 'Select Type' },
            { id: 2, name: 'Editor' },
        ];
        if (!this.isPaired) {
            items.push({ id: 3, name: '1-Variable Calc' });
            items.push({ id: 4, name: 'Statistics Calc' });
        } else {
            items.push({ id: 3, name: '2-Variable Calc' });
            items.push({ id: 4, name: 'Regression Calc' });
        }
        return items;
    }
    handleOptn(index) {
        if (this.phase === 'stat-calc') {
            this.handleStatCalcOptn(index);
            return;
        }
        switch (index) {
            case 0: this.showSelectType(); break;
            case 1: this.phase = 'editor'; this.renderEditor(); break;
            case 2:
                if (this.isPaired) this.showStatResults();
                else this.showStatResults();
                break;
            case 3:
                if (this.isPaired) { this.showRegressionResults(); }
                else {
                    this.phase = 'stat-calc';
                    this.calculateStats();
                    this.app.clearAll();
                    this.app.displayResultEl.innerHTML =
                        '<div style="font-size:12px;font-family:monospace;text-align:right;padding-top:8px;">Statistics<br>1-Variable</div>';
                }
                break;
        }
    }
    handleStatCalcOptn(index) {
        const oneVarSum = [{ id: 1, name: 'n', insert: 'n' },{ id: 2, name: '\u03a3x', insert: '\u03a3x' },{ id: 3, name: '\u03a3x\u00b2', insert: '\u03a3x\u00b2' }];
        const oneVarVar = [{ id: 1, name: 'x\u0304', insert: 'x\u0304' },{ id: 2, name: '\u03c3\u00b2x', insert: '\u03c3\u00b2x' },{ id: 3, name: '\u03c3x', insert: '\u03c3x' },{ id: 4, name: 'S\u00b2x', insert: 'S\u00b2x' },{ id: 5, name: 'sx', insert: 'sx' }];
        const oneVarMinMax = [{ id: 1, name: 'min(x)', insert: 'min(x)' },{ id: 2, name: 'Q\u2081', insert: 'Q\u2081' },{ id: 3, name: 'Med', insert: 'Med' },{ id: 4, name: 'Q\u2083', insert: 'Q\u2083' },{ id: 5, name: 'max(x)', insert: 'max(x)' }];
        const subMenus = [oneVarSum, oneVarVar, oneVarMinMax];
        if (index < subMenus.length) {
            this.app.menuOpen = true;
            this.app.menuType = 'stat-var-submenu';
            this.app.menuSelection = 0;
            this.app.menuItems = subMenus[index];
            this.app.renderMenu();
            this.pendingStatSubMenu = subMenus[index];
        }
    }
    handleStatVarSelection(index) {
        if (this.pendingStatSubMenu && index < this.pendingStatSubMenu.length) {
            this.app.inputChar(this.pendingStatSubMenu[index].insert);
        }
    }
}

// ========== DISTRIBUTION MODE (Mode 7) ==========
class DistributionMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.distType = null;
        this.distTypeIndex = 0;
        this.phase = 'select-type'; // 'select-type','list-or-var','input','list-editor','list-params','list-result','result'
        this.variables = {};
        this.varNames = [];
        this.varIndex = 0;
        this.editBuffer = '';
        this.useList = false;
        this.listData = []; // [{x, p}]
        this.listRow = 0;
        this.listParamIndex = 0;
        this.listParams = {};
        this.listParamNames = [];
    }
    enter() {
        this.app.clearAll();
        this.phase = 'select-type';
        this.showSelectType();
    }
    showSelectType() {
        this.app.menuOpen = true;
        this.app.menuType = 'dist-type';
        this.app.menuSelection = 0;
        this.app.menuItems = [
            { id: 1, name: 'Normal PD' },
            { id: 2, name: 'Normal CD' },
            { id: 3, name: 'Inverse Normal' },
            { id: 4, name: 'Binomial PD' },
            { id: 5, name: 'Binomial CD' },
            { id: 6, name: 'Poisson PD' },
            { id: 7, name: 'Poisson CD' }
        ];
        this.app.renderMenu();
    }
    selectType(index) {
        const types = ['normalPD', 'normalCD', 'inverseNormal', 'binomialPD', 'binomialCD', 'poissonPD', 'poissonCD'];
        this.distType = types[index];
        this.distTypeIndex = index;
        this.app.menuOpen = false;
        this.setupVariables();
        // Inverse Normal has no List mode
        if (this.distType === 'inverseNormal') {
            this.useList = false;
            this.phase = 'input';
            this.varIndex = 0;
            this.editBuffer = '';
            this.renderInput();
        } else {
            // Show List/Variable choice
            this.phase = 'list-or-var';
            this.app.menuOpen = true;
            this.app.menuType = 'dist-listvar';
            this.app.menuSelection = 0;
            this.app.menuItems = [
                { id: 1, name: 'List' },
                { id: 2, name: 'Variable' }
            ];
            this.app.renderMenu();
        }
    }
    handleListVarChoice(index) {
        this.app.menuOpen = false;
        if (index === 0) {
            // List mode
            this.useList = true;
            this.listData = [];
            this.listRow = 0;
            this.editBuffer = '';
            this.phase = 'list-editor';
            this.renderListEditor();
        } else {
            // Variable mode
            this.useList = false;
            this.phase = 'input';
            this.varIndex = 0;
            this.editBuffer = '';
            this.renderInput();
        }
    }
    setupVariables() {
        switch (this.distType) {
            case 'normalPD':
                this.varNames = ['x', '\u03c3', '\u03bc'];
                this.variables = { x: 0, '\u03c3': 1, '\u03bc': 0 };
                this.listParamNames = ['\u03c3', '\u03bc'];
                break;
            case 'normalCD':
                this.varNames = ['Lower', 'Upper', '\u03c3', '\u03bc'];
                this.variables = { Lower: 0, Upper: 0, '\u03c3': 1, '\u03bc': 0 };
                this.listParamNames = ['\u03c3', '\u03bc'];
                break;
            case 'inverseNormal':
                this.varNames = ['Area', '\u03c3', '\u03bc'];
                this.variables = { Area: 0, '\u03c3': 1, '\u03bc': 0 };
                break;
            case 'binomialPD': case 'binomialCD':
                this.varNames = ['x', 'N', 'p'];
                this.variables = { x: 0, N: 1, p: 0.5 };
                this.listParamNames = ['N', 'p'];
                break;
            case 'poissonPD': case 'poissonCD':
                this.varNames = ['x', '\u03bb'];
                this.variables = { x: 0, '\u03bb': 1 };
                this.listParamNames = ['\u03bb'];
                break;
        }
        this.listParams = {};
        for (const name of (this.listParamNames || [])) {
            this.listParams[name] = this.variables[name];
        }
    }
    handleKey(key) {
        if (this.phase === 'input') return this.handleInput(key);
        if (this.phase === 'list-editor') return this.handleListEditor(key);
        if (this.phase === 'list-params') return this.handleListParams(key);
        if (this.phase === 'list-result') return this.handleListResult(key);
        if (this.phase === 'result') {
            if (key === 'ac') { this.phase = 'input'; this.renderInput(); return true; }
            return true;
        }
        return false;
    }

    // === Variable Input Mode ===
    handleInput(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderInput(); return true;
        }
        if (key === 'negate' || key === 'subtract') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderInput(); return true;
        }
        if (key === 'fraction') {
            this.editBuffer += '/';
            this.renderInput(); return true;
        }
        if (key === 'equals') {
            if (this.editBuffer !== '') {
                let val;
                if (this.editBuffer.includes('/')) {
                    const parts = this.editBuffer.split('/');
                    val = parseFloat(parts[0]) / parseFloat(parts[1]);
                } else {
                    val = parseFloat(this.editBuffer);
                }
                if (!isNaN(val)) this.variables[this.varNames[this.varIndex]] = val;
                this.editBuffer = '';
            }
            if (this.varIndex < this.varNames.length - 1) {
                this.varIndex++;
                this.renderInput();
            } else {
                this.calculate();
            }
            return true;
        }
        if (key === 'up') { if (this.varIndex > 0) { this.varIndex--; this.editBuffer = ''; } this.renderInput(); return true; }
        if (key === 'down') { if (this.varIndex < this.varNames.length - 1) { this.varIndex++; this.editBuffer = ''; } this.renderInput(); return true; }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderInput(); return true; }
        if (key === 'ac') { this.enter(); return true; }
        return true;
    }
    renderInput() {
        const typeName = this.getDistTypeName();
        this.app.displayInputEl.textContent = typeName;
        let html = '<div style="font-size:9px;font-family:monospace;line-height:1.5;text-align:left;">';
        for (let i = 0; i < this.varNames.length; i++) {
            const name = this.varNames[i];
            const isCurrent = i === this.varIndex;
            const val = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                this.engine.formatResult(this.variables[name]);
            const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            html += '<div style="' + bg + 'padding:0 2px;">&nbsp;' + name + '<span style="float:right;">:' + val + '</span></div>';
        }
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
    }

    // === List Editor Mode ===
    handleListEditor(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderListEditor(); return true;
        }
        if (key === 'negate' || key === 'subtract') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderListEditor(); return true;
        }
        if (key === 'equals') {
            const val = this.editBuffer === '' ? 0 : parseFloat(this.editBuffer);
            if (!isNaN(val)) {
                while (this.listData.length <= this.listRow) this.listData.push({ x: 0, p: null });
                this.listData[this.listRow].x = val;
            }
            this.editBuffer = '';
            this.listRow++;
            // Check if we should move to params (if user presses = on empty row after data)
            if (this.editBuffer === '' && val === 0 && this.listData.length > 1 && this.listRow >= this.listData.length) {
                // Move to parameter input
                this.phase = 'list-params';
                this.listParamIndex = 0;
                this.editBuffer = '';
                this.renderListParams();
                return true;
            }
            this.renderListEditor();
            return true;
        }
        if (key === 'up') { if (this.listRow > 0) { this.listRow--; this.editBuffer = ''; } this.renderListEditor(); return true; }
        if (key === 'down') { this.listRow++; this.editBuffer = ''; this.renderListEditor(); return true; }
        if (key === 'del') {
            if (this.editBuffer.length > 0) this.editBuffer = this.editBuffer.slice(0, -1);
            else if (this.listData.length > this.listRow) {
                this.listData.splice(this.listRow, 1);
                if (this.listRow >= this.listData.length && this.listRow > 0) this.listRow--;
            }
            this.renderListEditor(); return true;
        }
        if (key === 'ac') {
            // If we have data, move to params; otherwise go back
            if (this.listData.length > 0) {
                this.phase = 'list-params';
                this.listParamIndex = 0;
                this.editBuffer = '';
                this.renderListParams();
            } else {
                this.enter();
            }
            return true;
        }
        return true;
    }
    renderListEditor() {
        const typeName = this.getDistTypeName();
        this.app.displayInputEl.textContent = '';
        let html = '<div style="font-size:8px;font-family:monospace;line-height:1.3;display:flex;">';
        // Table
        html += '<div style="flex:1;">';
        html += '<table style="border-collapse:collapse;width:100%;">';
        html += '<tr><td style="border-bottom:1px solid #1a1a1a;"></td>';
        html += '<td style="text-align:center;font-weight:bold;border-bottom:1px solid #1a1a1a;">x</td>';
        html += '<td style="text-align:center;font-weight:bold;border-bottom:1px solid #1a1a1a;">P</td></tr>';
        const startRow = Math.max(0, this.listRow - 1);
        const endRow = Math.min(Math.max(this.listData.length, this.listRow + 1) + 1, startRow + 4);
        for (let i = startRow; i < endRow; i++) {
            const row = this.listData[i] || { x: 0, p: null };
            const isCurrent = i === this.listRow;
            const xVal = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                (i < this.listData.length ? this.engine.formatResult(row.x) : '');
            const pVal = row.p !== null && row.p !== undefined ? this.engine.formatResult(row.p) : '';
            const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            html += '<tr>';
            html += '<td style="padding:0 1px;font-weight:bold;border-right:1px solid #999;">' + (i + 1) + '</td>';
            html += '<td style="padding:0 2px;text-align:right;' + bg + '">' + xVal + '</td>';
            html += '<td style="padding:0 2px;text-align:right;">' + pVal + '</td>';
            html += '</tr>';
        }
        html += '</table></div>';
        // Type name on right
        html += '<div style="font-size:9px;font-weight:bold;padding:2px;writing-mode:horizontal-tb;text-align:right;">' + typeName + '</div>';
        html += '</div>';
        if (this.editBuffer !== '') {
            html += '<div style="font-size:11px;font-family:monospace;text-align:right;font-weight:700;">' + this.editBuffer + '</div>';
        }
        this.app.displayResultEl.innerHTML = html;
        this.app.displayResultEl.style.textAlign = 'left';
    }

    // === List Parameters ===
    handleListParams(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderListParams(); return true;
        }
        if (key === 'negate' || key === 'subtract') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderListParams(); return true;
        }
        if (key === 'fraction') {
            this.editBuffer += '/';
            this.renderListParams(); return true;
        }
        if (key === 'equals') {
            if (this.editBuffer !== '') {
                let val;
                if (this.editBuffer.includes('/')) {
                    const parts = this.editBuffer.split('/');
                    val = parseFloat(parts[0]) / parseFloat(parts[1]);
                } else {
                    val = parseFloat(this.editBuffer);
                }
                if (!isNaN(val)) this.listParams[this.listParamNames[this.listParamIndex]] = val;
                this.editBuffer = '';
            }
            if (this.listParamIndex < this.listParamNames.length - 1) {
                this.listParamIndex++;
                this.renderListParams();
            } else {
                this.calculateList();
            }
            return true;
        }
        if (key === 'up') { if (this.listParamIndex > 0) { this.listParamIndex--; this.editBuffer = ''; } this.renderListParams(); return true; }
        if (key === 'down') { if (this.listParamIndex < this.listParamNames.length - 1) { this.listParamIndex++; this.editBuffer = ''; } this.renderListParams(); return true; }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderListParams(); return true; }
        if (key === 'ac') { this.phase = 'list-editor'; this.renderListEditor(); return true; }
        return true;
    }
    renderListParams() {
        const typeName = this.getDistTypeName();
        this.app.displayInputEl.textContent = typeName;
        let html = '<div style="font-size:10px;font-family:monospace;line-height:1.6;text-align:left;">';
        for (let i = 0; i < this.listParamNames.length; i++) {
            const name = this.listParamNames[i];
            const isCurrent = i === this.listParamIndex;
            const val = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                this.engine.formatResult(this.listParams[name]);
            const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            html += '<div style="' + bg + 'padding:0 2px;">' + name + '<span style="float:right;">:' + val + '</span></div>';
        }
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
    }

    // === List Result ===
    handleListResult(key) {
        if (key === 'ac') { this.phase = 'list-editor'; this.listRow = 0; this.renderListEditor(); return true; }
        if (key === 'up') { if (this.listRow > 0) { this.listRow--; this.renderListResult(); } return true; }
        if (key === 'down') { if (this.listRow < this.listData.length - 1) { this.listRow++; this.renderListResult(); } return true; }
        return true;
    }
    renderListResult() {
        this.renderListEditor(); // Reuses the editor display which now includes P values
    }

    // === Calculations ===
    calculate() {
        try {
            let result;
            const v = this.variables;
            switch (this.distType) {
                case 'normalPD': result = this.engine.normalPDF(v.x, v['\u03c3'], v['\u03bc']); break;
                case 'normalCD': result = this.engine.normalCDF(v.Lower, v.Upper, v['\u03c3'], v['\u03bc']); break;
                case 'inverseNormal': result = this.engine.inverseNormal(v.Area, v['\u03c3'], v['\u03bc']); break;
                case 'binomialPD': result = this.engine.binomialPDF(Math.round(v.x), Math.round(v.N), v.p); break;
                case 'binomialCD': result = this.engine.binomialCDF(Math.round(v.x), Math.round(v.N), v.p); break;
                case 'poissonPD': result = this.engine.poissonPDF(Math.round(v.x), v['\u03bb']); break;
                case 'poissonCD': result = this.engine.poissonCDF(Math.round(v.x), v['\u03bb']); break;
            }
            const label = this.distType === 'inverseNormal' ? 'xInv=' : 'P=';
            this.app.displayInputEl.textContent = label;
            this.app.displayResultEl.textContent = this.engine.formatResult(result);
            this.engine.ans = result;
            this.phase = 'result';
        } catch (e) {
            this.app.displayResultEl.textContent = e.message || 'Math ERROR';
            this.app.displayResultEl.classList.add('error');
            this.phase = 'result';
        }
    }
    calculateList() {
        try {
            for (const row of this.listData) {
                const x = Math.round(row.x);
                const params = this.listParams;
                switch (this.distType) {
                    case 'normalPD': row.p = this.engine.normalPDF(row.x, params['\u03c3'], params['\u03bc']); break;
                    case 'normalCD': row.p = this.engine.normalCDF(0, row.x, params['\u03c3'], params['\u03bc']); break;
                    case 'binomialPD': row.p = this.engine.binomialPDF(x, Math.round(params.N), params.p); break;
                    case 'binomialCD': row.p = this.engine.binomialCDF(x, Math.round(params.N), params.p); break;
                    case 'poissonPD': row.p = this.engine.poissonPDF(x, params['\u03bb']); break;
                    case 'poissonCD': row.p = this.engine.poissonCDF(x, params['\u03bb']); break;
                }
            }
            this.phase = 'list-result';
            this.listRow = 0;
            this.renderListResult();
        } catch (e) {
            this.app.displayResultEl.textContent = e.message || 'Math ERROR';
            this.app.displayResultEl.classList.add('error');
        }
    }
    getDistTypeName() {
        const names = {
            normalPD: 'Normal PD', normalCD: 'Normal CD', inverseNormal: 'Inverse Normal',
            binomialPD: 'Binomial PD', binomialCD: 'Binomial CD',
            poissonPD: 'Poisson PD', poissonCD: 'Poisson CD'
        };
        return names[this.distType] || '';
    }
    getOptnMenu() {
        const items = [{ id: 1, name: 'Select Type' }];
        if (this.useList && this.phase !== 'select-type') {
            items.push({ id: 2, name: 'Editor' });
        }
        return items;
    }
    handleOptn(index) {
        if (index === 0) { this.showSelectType(); }
        else if (index === 1 && this.useList) {
            this.phase = 'list-editor';
            this.listRow = 0;
            this.renderListEditor();
        }
    }
}

// ========== SPREADSHEET MODE (Mode 8) ==========
class SpreadsheetMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.rows = 45;
        this.cols = 5; // A-E
        this.cells = {}; // key: 'A1', value: {formula, value, display}
        this.cursorRow = 1;
        this.cursorCol = 0;
        this.editBuffer = '';
        this.isEditing = false;
        this.autoCalc = true;
        this.scrollTop = 1;
        this.clipboard = null; // {formula, value} for copy/paste
        this.pasteMode = false;
        this.fillPhase = null; // 'fill-formula','fill-value','grab'
        this.fillFormula = '';
        this.fillValue = '';
        this.fillRange = '';
    }
    enter() {
        this.app.clearAll();
        this.cells = {};
        this.cursorRow = 1;
        this.cursorCol = 0;
        this.editBuffer = '';
        this.isEditing = false;
        this.scrollTop = 1;
        this.renderSheet();
    }
    cellKey(row, col) { return String.fromCharCode(65 + col) + row; }
    getCellValue(key) {
        const cell = this.cells[key];
        if (!cell) return 0;
        return cell.value || 0;
    }
    setCellContent(key, content) {
        if (!this.cells[key]) this.cells[key] = { formula: null, value: 0, display: '' };
        const cell = this.cells[key];
        if (typeof content === 'string' && content.startsWith('=')) {
            cell.formula = content.substring(1);
            cell.display = content;
        } else {
            cell.formula = null;
            cell.value = parseFloat(content) || 0;
            cell.display = content.toString();
        }
        if (this.autoCalc) this.recalculate();
    }
    recalculate() {
        for (const [key, cell] of Object.entries(this.cells)) {
            if (cell.formula) {
                try { cell.value = this.evaluateFormula(cell.formula); }
                catch (e) { cell.value = NaN; }
            }
        }
    }
    evaluateFormula(formula) {
        let expr = formula.replace(/\u00d7/g, '*').replace(/\u00f7/g, '/').replace(/\u2212/g, '-');
        // Handle Sum, Min, Max, Mean with cell ranges
        expr = expr.replace(/(Sum|Min|Max|Mean)\(([A-E]\d+):([A-E]\d+)\)/gi, (match, func, s, e) => {
            const values = this.getCellRange(s, e);
            switch (func.toLowerCase()) {
                case 'sum': return values.reduce((a, b) => a + b, 0);
                case 'min': return Math.min(...values);
                case 'max': return Math.max(...values);
                case 'mean': return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            }
            return 0;
        });
        // Replace cell references with values
        expr = expr.replace(/\$?([A-E])\$?(\d{1,2})/g, (match, col, row) => {
            return this.getCellValue(col + row).toString();
        });
        // Handle conversion arrows (like kg>lb)
        expr = expr.replace(/\u25b6/g, '>');
        const result = this.engine.evaluate(expr);
        if (result.error) throw new Error(result.error);
        return result.value;
    }
    getCellRange(start, end) {
        const startCol = start.charCodeAt(0) - 65;
        const startRow = parseInt(start.substring(1));
        const endCol = end.charCodeAt(0) - 65;
        const endRow = parseInt(end.substring(1));
        const values = [];
        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                values.push(this.getCellValue(String.fromCharCode(65 + c) + r));
            }
        }
        return values;
    }
    // Adjust cell references in formula relative to position offset
    adjustFormulaRefs(formula, rowOffset, colOffset) {
        return formula.replace(/\$?([A-E])\$?(\d{1,2})/g, (match, col, row) => {
            const isAbsCol = match.startsWith('$');
            const isAbsRow = match.includes('$' + row);
            let newCol = isAbsCol ? col : String.fromCharCode(col.charCodeAt(0) + colOffset);
            let newRow = isAbsRow ? parseInt(row) : parseInt(row) + rowOffset;
            if (newCol < 'A' || newCol > 'E' || newRow < 1 || newRow > 45) return 'ERR';
            return (isAbsCol ? '$' : '') + newCol + (isAbsRow ? '$' : '') + newRow;
        });
    }

    // === Key handling ===
    handleKey(key) {
        if (this.fillPhase) return this.handleFillKey(key);
        if (this.pasteMode) return this.handlePasteKey(key);
        if (this.isEditing) return this.handleEditKey(key);
        return this.handleNavKey(key);
    }
    handleAlphaKey(key) {
        // In spreadsheet, ALPHA keys insert cell column letters and = sign
        if (key === 'calc') {
            // ALPHA+CALC = = (formula start)
            this.isEditing = true;
            this.editBuffer += '=';
            this.renderSheet(); return true;
        }
        // Map keys to column letters
        const colMap = { 'negate': 'A', 'dms': 'B', 'reciprocal': 'C', 'sin': 'D', 'cos': 'E' };
        if (colMap[key]) {
            if (!this.isEditing) { this.isEditing = true; this.editBuffer = ''; }
            this.editBuffer += colMap[key];
            this.renderSheet(); return true;
        }
        // ALPHA+integral = : (colon for ranges)
        if (key === 'integral') {
            if (this.isEditing) { this.editBuffer += ':'; this.renderSheet(); }
            return true;
        }
        return false;
    }
    handleNavKey(key) {
        if (key === 'up') { if (this.cursorRow > 1) this.cursorRow--; this.adjustScroll(); this.renderSheet(); return true; }
        if (key === 'down') { if (this.cursorRow < this.rows) this.cursorRow++; this.adjustScroll(); this.renderSheet(); return true; }
        if (key === 'left') { if (this.cursorCol > 0) this.cursorCol--; this.renderSheet(); return true; }
        if (key === 'right') { if (this.cursorCol < this.cols - 1) this.cursorCol++; this.renderSheet(); return true; }
        if (/^[0-9]$/.test(key) || key === 'dot' || key === 'negate') {
            this.isEditing = true;
            this.editBuffer = key === 'dot' ? '.' : (key === 'negate' ? '-' : key);
            this.renderSheet(); return true;
        }
        if (key === 'del') {
            const ck = this.cellKey(this.cursorRow, this.cursorCol);
            delete this.cells[ck];
            if (this.autoCalc) this.recalculate();
            this.renderSheet(); return true;
        }
        if (key === 'ac') {
            this.app.engine.mode = 'Calculate';
            this.app.modeHandler = null;
            this.app.clearAll(); return true;
        }
        return true;
    }
    handleEditKey(key) {
        if (/^[0-9]$/.test(key)) { this.editBuffer += key; this.renderSheet(); return true; }
        if (key === 'dot') { this.editBuffer += '.'; this.renderSheet(); return true; }
        if (key === 'negate' || key === 'subtract') {
            if (this.editBuffer === '' || this.editBuffer === '=') { this.editBuffer += '-'; }
            else if (this.editBuffer.endsWith('-')) { this.editBuffer = this.editBuffer.slice(0, -1); }
            else { this.editBuffer += '-'; }
            this.renderSheet(); return true;
        }
        if (key === 'add') { this.editBuffer += '+'; this.renderSheet(); return true; }
        if (key === 'multiply') { this.editBuffer += '\u00d7'; this.renderSheet(); return true; }
        if (key === 'divide') { this.editBuffer += '\u00f7'; this.renderSheet(); return true; }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderSheet(); return true; }
        if (key === 'lparen') { this.editBuffer += '('; this.renderSheet(); return true; }
        if (key === 'rparen') { this.editBuffer += ')'; this.renderSheet(); return true; }
        if (key === 'equals') {
            const ck = this.cellKey(this.cursorRow, this.cursorCol);
            this.setCellContent(ck, this.editBuffer);
            this.editBuffer = '';
            this.isEditing = false;
            if (this.cursorRow < this.rows) this.cursorRow++;
            this.adjustScroll();
            this.renderSheet(); return true;
        }
        if (key === 'ac') {
            this.editBuffer = '';
            this.isEditing = false;
            this.renderSheet(); return true;
        }
        return true;
    }

    // === Fill/Paste operations ===
    handleFillKey(key) {
        if (this.fillPhase === 'fill-formula-input') {
            if (/^[0-9]$/.test(key)) { this.fillFormula += key; this.renderFill(); return true; }
            if (key === 'dot') { this.fillFormula += '.'; this.renderFill(); return true; }
            if (key === 'add') { this.fillFormula += '+'; this.renderFill(); return true; }
            if (key === 'subtract') { this.fillFormula += '-'; this.renderFill(); return true; }
            if (key === 'multiply') { this.fillFormula += '\u00d7'; this.renderFill(); return true; }
            if (key === 'divide') { this.fillFormula += '\u00f7'; this.renderFill(); return true; }
            if (key === 'del') { this.fillFormula = this.fillFormula.slice(0, -1); this.renderFill(); return true; }
            if (key === 'equals') { this.fillPhase = 'fill-formula-range'; this.fillRange = this.cellKey(this.cursorRow, this.cursorCol) + ':' + this.cellKey(this.cursorRow, this.cursorCol); this.renderFill(); return true; }
            if (key === 'ac') { this.fillPhase = null; this.renderSheet(); return true; }
            return true;
        }
        if (this.fillPhase === 'fill-formula-range' || this.fillPhase === 'fill-value-range') {
            if (/^[0-9]$/.test(key)) { this.fillRange += key; this.renderFill(); return true; }
            if (key === 'del') { this.fillRange = this.fillRange.slice(0, -1); this.renderFill(); return true; }
            if (key === 'equals') { this.executeFill(); return true; }
            if (key === 'ac') { this.fillPhase = null; this.renderSheet(); return true; }
            return true;
        }
        if (this.fillPhase === 'fill-value-input') {
            if (/^[0-9]$/.test(key) || key === 'dot') { this.fillValue += key === 'dot' ? '.' : key; this.renderFill(); return true; }
            if (key === 'negate') {
                if (this.fillValue.startsWith('-')) this.fillValue = this.fillValue.slice(1);
                else this.fillValue = '-' + this.fillValue;
                this.renderFill(); return true;
            }
            if (key === 'del') { this.fillValue = this.fillValue.slice(0, -1); this.renderFill(); return true; }
            if (key === 'equals') { this.fillPhase = 'fill-value-range'; this.fillRange = this.cellKey(this.cursorRow, this.cursorCol) + ':' + this.cellKey(this.cursorRow, this.cursorCol); this.renderFill(); return true; }
            if (key === 'ac') { this.fillPhase = null; this.renderSheet(); return true; }
            return true;
        }
        if (this.fillPhase === 'grab') {
            // Navigate and press = to grab cell reference
            if (key === 'up') { if (this.cursorRow > 1) this.cursorRow--; this.adjustScroll(); this.renderSheet(); this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Set:[=]</div>'; return true; }
            if (key === 'down') { if (this.cursorRow < this.rows) this.cursorRow++; this.adjustScroll(); this.renderSheet(); this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Set:[=]</div>'; return true; }
            if (key === 'left') { if (this.cursorCol > 0) this.cursorCol--; this.renderSheet(); this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Set:[=]</div>'; return true; }
            if (key === 'right') { if (this.cursorCol < this.cols - 1) this.cursorCol++; this.renderSheet(); this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Set:[=]</div>'; return true; }
            if (key === 'equals') {
                // Insert cell reference into edit buffer
                this.editBuffer += this.cellKey(this.cursorRow, this.cursorCol);
                this.fillPhase = null;
                this.renderSheet();
                return true;
            }
            if (key === 'ac') { this.fillPhase = null; this.renderSheet(); return true; }
            return true;
        }
        return true;
    }
    handlePasteKey(key) {
        if (key === 'down') {
            if (this.cursorRow < this.rows) this.cursorRow++;
            this.adjustScroll(); this.renderSheet();
            this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Paste:[=]</div>';
            return true;
        }
        if (key === 'up') {
            if (this.cursorRow > 1) this.cursorRow--;
            this.adjustScroll(); this.renderSheet();
            this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Paste:[=]</div>';
            return true;
        }
        if (key === 'left') { if (this.cursorCol > 0) this.cursorCol--; this.renderSheet(); this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Paste:[=]</div>'; return true; }
        if (key === 'right') { if (this.cursorCol < this.cols - 1) this.cursorCol++; this.renderSheet(); this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Paste:[=]</div>'; return true; }
        if (key === 'equals') {
            // Paste clipboard to current cell
            if (this.clipboard) {
                const ck = this.cellKey(this.cursorRow, this.cursorCol);
                if (this.clipboard.formula) {
                    // Adjust relative references
                    const adjusted = this.adjustFormulaRefs(this.clipboard.formula, this.cursorRow - this.clipboard.srcRow, this.cursorCol - this.clipboard.srcCol);
                    this.setCellContent(ck, '=' + adjusted);
                } else {
                    this.setCellContent(ck, this.clipboard.value.toString());
                }
                this.renderSheet();
                this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Paste:[=]</div>';
            }
            return true;
        }
        if (key === 'ac') { this.pasteMode = false; this.renderSheet(); return true; }
        return true;
    }
    renderFill() {
        if (this.fillPhase === 'fill-formula-input') {
            this.app.displayInputEl.textContent = '';
            this.app.displayResultEl.innerHTML =
                '<div style="font-size:9px;font-family:monospace;line-height:1.6;text-align:left;">' +
                '<div style="font-weight:bold;">Fill Formula</div>' +
                '<div>Form&nbsp;&nbsp;=' + this.fillFormula + '</div></div>';
        } else if (this.fillPhase === 'fill-formula-range') {
            this.app.displayInputEl.textContent = '';
            this.app.displayResultEl.innerHTML =
                '<div style="font-size:9px;font-family:monospace;line-height:1.6;text-align:left;">' +
                '<div style="font-weight:bold;">Fill Formula</div>' +
                '<div>Form&nbsp;&nbsp;=' + this.fillFormula + '</div>' +
                '<div>Range :' + this.fillRange + '</div></div>';
        } else if (this.fillPhase === 'fill-value-input') {
            this.app.displayInputEl.textContent = '';
            this.app.displayResultEl.innerHTML =
                '<div style="font-size:9px;font-family:monospace;line-height:1.6;text-align:left;">' +
                '<div style="font-weight:bold;">Fill Value</div>' +
                '<div>Value :' + this.fillValue + '</div></div>';
        } else if (this.fillPhase === 'fill-value-range') {
            this.app.displayInputEl.textContent = '';
            this.app.displayResultEl.innerHTML =
                '<div style="font-size:9px;font-family:monospace;line-height:1.6;text-align:left;">' +
                '<div style="font-weight:bold;">Fill Value</div>' +
                '<div>Value :' + this.fillValue + '</div>' +
                '<div>Range :' + this.fillRange + '</div></div>';
        }
    }
    executeFill() {
        // Parse range like "A2:A6"
        const parts = this.fillRange.split(':');
        if (parts.length !== 2) { this.fillPhase = null; this.renderSheet(); return; }
        const startCol = parts[0].charCodeAt(0) - 65;
        const startRow = parseInt(parts[0].substring(1));
        const endCol = parts[1].charCodeAt(0) - 65;
        const endRow = parseInt(parts[1].substring(1));
        if (this.fillPhase === 'fill-formula-range') {
            // Fill formula with relative reference adjustment
            const baseRow = startRow;
            const baseCol = startCol;
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    const key = this.cellKey(r, c);
                    const adjusted = this.adjustFormulaRefs(this.fillFormula, r - baseRow, c - baseCol);
                    this.setCellContent(key, '=' + adjusted);
                }
            }
        } else if (this.fillPhase === 'fill-value-range') {
            const val = parseFloat(this.fillValue) || 0;
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    this.setCellContent(this.cellKey(r, c), val.toString());
                }
            }
        }
        this.fillPhase = null;
        this.recalculate();
        this.renderSheet();
    }

    // === Display ===
    adjustScroll() {
        if (this.cursorRow < this.scrollTop) this.scrollTop = this.cursorRow;
        if (this.cursorRow >= this.scrollTop + 4) this.scrollTop = this.cursorRow - 3;
    }
    renderSheet() {
        const visibleRows = 4;
        const colLetters = ['A', 'B', 'C', 'D', 'E'];
        const ck = this.cellKey(this.cursorRow, this.cursorCol);
        const currentCell = this.cells[ck];
        let editText = '';
        if (this.isEditing) { editText = this.editBuffer; }
        else if (currentCell) {
            editText = currentCell.formula ? '=' + currentCell.formula : this.engine.formatResult(currentCell.value);
        }
        this.app.displayInputEl.textContent = '';
        let html = '<div style="font-size:7px;font-family:monospace;line-height:1.15;">';
        html += '<table style="border-collapse:collapse;width:100%;">';
        html += '<tr><td style="width:8%;border-bottom:1px solid #999;"></td>';
        for (let c = 0; c < this.cols; c++) {
            html += '<td style="text-align:center;font-weight:bold;padding:0 1px;border-bottom:1px solid #999;">' + colLetters[c] + '</td>';
        }
        html += '</tr>';
        for (let r = this.scrollTop; r < this.scrollTop + visibleRows && r <= this.rows; r++) {
            html += '<tr><td style="font-weight:bold;padding:0 1px;border-right:1px solid #999;">' + r + '</td>';
            for (let c = 0; c < this.cols; c++) {
                const key = this.cellKey(r, c);
                const cell = this.cells[key];
                const isCursor = r === this.cursorRow && c === this.cursorCol;
                let val = cell ? (isNaN(cell.value) ? 'ERR' : this.engine.formatResult(cell.value)) : '';
                if (isCursor && this.isEditing) val = '';
                const bg = isCursor ? 'background:#1a1a1a;color:#c5d4b5;' : '';
                html += '<td style="text-align:right;padding:0 1px;max-width:30px;overflow:hidden;white-space:nowrap;' + bg + '">' + val + '</td>';
            }
            html += '</tr>';
        }
        html += '</table>';
        html += '<div style="border-top:1px solid rgba(0,0,0,0.2);font-size:8px;padding:1px 2px;min-height:10px;">' + editText + '</div>';
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
        this.app.displayResultEl.style.textAlign = 'left';
    }

    // === OPTN Menu ===
    getOptnMenu() {
        // Page 1
        if (this.isEditing) {
            return [
                { id: 1, name: '$' },
                { id: 2, name: 'Grab' },
            ];
        }
        return [
            { id: 1, name: 'Fill Formula' },
            { id: 2, name: 'Fill Value' },
            { id: 3, name: 'Edit Cell' },
            { id: 4, name: 'Free Space' },
            { id: 5, name: 'Sum' },
            { id: 6, name: 'Mean' },
            { id: 7, name: 'Min' },
            { id: 8, name: 'Max' },
            { id: 1, name: 'Cut & Paste' },
            { id: 2, name: 'Copy & Paste' },
            { id: 3, name: 'Delete All' },
            { id: 4, name: 'Recalculate' },
        ];
    }
    handleOptn(index) {
        if (this.isEditing) {
            // $ or Grab while editing
            if (index === 0) { this.editBuffer += '$'; this.renderSheet(); }
            else if (index === 1) {
                // Grab mode
                this.fillPhase = 'grab';
                this.renderSheet();
                this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Set:[=]</div>';
            }
            return;
        }
        switch (index) {
            case 0: // Fill Formula
                this.fillPhase = 'fill-formula-input';
                this.fillFormula = '';
                this.renderFill();
                break;
            case 1: // Fill Value
                this.fillPhase = 'fill-value-input';
                this.fillValue = '';
                this.renderFill();
                break;
            case 2: // Edit Cell
                const ck2 = this.cellKey(this.cursorRow, this.cursorCol);
                const cell2 = this.cells[ck2];
                if (cell2) {
                    this.isEditing = true;
                    this.editBuffer = cell2.formula ? '=' + cell2.formula : this.engine.formatResult(cell2.value);
                } else {
                    this.isEditing = true;
                    this.editBuffer = '';
                }
                this.renderSheet();
                break;
            case 3: // Free Space
                const used = Object.keys(this.cells).length;
                const bytes = 1700 - used * 14;
                this.app.displayInputEl.textContent = '';
                this.app.displayResultEl.innerHTML = '<div style="font-size:14px;font-family:monospace;text-align:center;padding:10px 0;font-weight:bold;">' + Math.max(0, bytes) + ' Bytes Free</div>';
                break;
            case 4: // Sum
                this.isEditing = true;
                this.editBuffer = '=Sum(';
                this.renderSheet(); break;
            case 5: // Mean
                this.isEditing = true;
                this.editBuffer = '=Mean(';
                this.renderSheet(); break;
            case 6: // Min
                this.isEditing = true;
                this.editBuffer = '=Min(';
                this.renderSheet(); break;
            case 7: // Max
                this.isEditing = true;
                this.editBuffer = '=Max(';
                this.renderSheet(); break;
            case 8: // Cut & Paste
                const ck8 = this.cellKey(this.cursorRow, this.cursorCol);
                const cell8 = this.cells[ck8];
                if (cell8) {
                    this.clipboard = { formula: cell8.formula, value: cell8.value, srcRow: this.cursorRow, srcCol: this.cursorCol };
                    delete this.cells[ck8];
                    this.recalculate();
                }
                this.pasteMode = true;
                this.renderSheet();
                this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Paste:[=]</div>';
                break;
            case 9: // Copy & Paste
                const ck9 = this.cellKey(this.cursorRow, this.cursorCol);
                const cell9 = this.cells[ck9];
                if (cell9) {
                    this.clipboard = { formula: cell9.formula, value: cell9.value, srcRow: this.cursorRow, srcCol: this.cursorCol };
                }
                this.pasteMode = true;
                this.renderSheet();
                this.app.displayResultEl.innerHTML += '<div style="font-size:9px;font-family:monospace;border-top:1px solid #999;padding:2px;">Paste:[=]</div>';
                break;
            case 10: // Delete All
                this.cells = {};
                this.renderSheet();
                break;
            case 11: // Recalculate
                this.recalculate();
                this.renderSheet();
                break;
        }
    }
}

// ========== TABLE MODE (Mode 9) ==========
class TableMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.fExpr = '';
        this.gExpr = '';
        this.useGx = this.engine.tableUseGx || false;
        this.start = -1;
        this.end = 1;
        this.step = 1;
        this.phase = 'input-f'; // 'input-f','input-g','range','table'
        this.tableData = [];
        this.tableRow = 0;
        this.scrollTop = 0;
        this.editBuffer = '';
        this.rangeField = 0;
        this.tableEditBuffer = '';
        this.tableEditing = false;
    }
    enter() {
        this.app.clearAll();
        this.fExpr = '';
        this.gExpr = '';
        this.phase = 'input-f';
        this.editBuffer = '';
        this.renderInputScreen();
    }
    renderInputScreen() {
        if (this.phase === 'input-f') {
            const isMath = this.engine.inputOutput.startsWith('MathI');
            if (isMath && typeof katex !== 'undefined') {
                this.app.renderKatex(this.app.displayInputEl, 'f(x)=' + this.app.exprToLatex(this.editBuffer));
            } else {
                this.app.displayInputEl.textContent = 'f(x)=' + this.editBuffer;
            }
            this.app.displayResultEl.textContent = '';
        } else if (this.phase === 'input-g') {
            this.app.displayInputEl.textContent = 'f(x)=' + this.fExpr;
            const isMath = this.engine.inputOutput.startsWith('MathI');
            if (isMath && typeof katex !== 'undefined') {
                this.app.renderKatex(this.app.displayResultEl, 'g(x)=' + this.app.exprToLatex(this.editBuffer));
            } else {
                this.app.displayResultEl.textContent = 'g(x)=' + this.editBuffer;
            }
        }
    }
    renderRange() {
        this.app.displayInputEl.textContent = '';
        const vals = [this.start, this.end, this.step];
        const labels = ['Start', 'End', 'Step'];
        let html = '<div style="font-size:10px;font-family:monospace;line-height:1.5;text-align:left;">';
        html += '<div style="font-weight:bold;">Table Range</div>';
        for (let i = 0; i < 3; i++) {
            const isCurrent = i === this.rangeField;
            const val = isCurrent && this.editBuffer !== '' ? this.editBuffer : vals[i];
            const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            html += '<div style="' + bg + 'padding:0 2px;">&nbsp;' + labels[i] + '<span style="float:right;">:' + val + '</span></div>';
        }
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
    }
    renderTable() {
        if (!this.tableData.length) return;
        const hasG = this.useGx && this.gExpr;
        this.app.displayInputEl.textContent = '';
        let html = '<div style="font-size:7px;font-family:monospace;line-height:1.15;">';
        html += '<table style="border-collapse:collapse;width:100%;">';
        html += '<tr><td style="font-weight:bold;padding:0 1px;border-bottom:1px solid #999;"></td>';
        html += '<td style="font-weight:bold;text-align:center;padding:0 1px;border-bottom:1px solid #999;">x</td>';
        html += '<td style="font-weight:bold;text-align:center;padding:0 1px;border-bottom:1px solid #999;">f(x)</td>';
        if (hasG) html += '<td style="font-weight:bold;text-align:center;padding:0 1px;border-bottom:1px solid #999;">g(x)</td>';
        html += '</tr>';
        const visibleRows = 4;
        const startIdx = Math.max(0, Math.min(this.scrollTop, this.tableData.length - visibleRows));
        for (let i = startIdx; i < startIdx + visibleRows && i < this.tableData.length; i++) {
            const row = this.tableData[i];
            const isCurrent = i === this.tableRow;
            html += '<tr>';
            html += '<td style="padding:0 1px;font-weight:bold;border-right:1px solid #999;">' + (i + 1) + '</td>';
            const xBg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            const xVal = isCurrent && this.tableEditing ? this.tableEditBuffer : this.engine.formatResult(row.x);
            html += '<td style="text-align:right;padding:0 1px;' + xBg + '">' + xVal + '</td>';
            html += '<td style="text-align:right;padding:0 1px;">' + (row.fx === 'ERROR' ? 'ERR' : this.engine.formatResult(row.fx)) + '</td>';
            if (hasG) html += '<td style="text-align:right;padding:0 1px;">' + (row.gx === 'ERROR' ? 'ERR' : this.engine.formatResult(row.gx)) + '</td>';
            html += '</tr>';
        }
        html += '</table>';
        // Show current x value at bottom-right
        if (this.tableEditing) {
            html += '<div style="font-size:10px;font-family:monospace;text-align:right;font-weight:700;border-top:1px solid #999;padding:1px 2px;">' + this.tableEditBuffer + '</div>';
        } else {
            const curRow = this.tableData[this.tableRow];
            if (curRow) html += '<div style="font-size:10px;font-family:monospace;text-align:right;font-weight:700;border-top:1px solid #999;padding:1px 2px;">' + this.engine.formatResult(curRow.x) + '</div>';
        }
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
        this.app.displayResultEl.style.textAlign = 'left';
    }
    handleKey(key) {
        if (this.phase === 'input-f' || this.phase === 'input-g') return this.handleInputKey(key);
        if (this.phase === 'range') return this.handleRangeKey(key);
        if (this.phase === 'table') return this.handleTableKey(key);
        return false;
    }
    handleInputKey(key) {
        if (/^[0-9]$/.test(key)) { this.editBuffer += key; this.renderInputScreen(); return true; }
        if (key === 'dot') { this.editBuffer += '.'; this.renderInputScreen(); return true; }
        if (key === 'add') { this.editBuffer += '+'; this.renderInputScreen(); return true; }
        if (key === 'subtract') { this.editBuffer += '-'; this.renderInputScreen(); return true; }
        if (key === 'multiply') { this.editBuffer += '\u00d7'; this.renderInputScreen(); return true; }
        if (key === 'divide') { this.editBuffer += '\u00f7'; this.renderInputScreen(); return true; }
        if (key === 'varx') { this.editBuffer += 'x'; this.renderInputScreen(); return true; }
        if (key === 'square') { this.editBuffer += '\u00b2'; this.renderInputScreen(); return true; }
        if (key === 'power') { this.editBuffer += '^('; this.renderInputScreen(); return true; }
        if (key === 'lparen') { this.editBuffer += '('; this.renderInputScreen(); return true; }
        if (key === 'rparen') { this.editBuffer += ')'; this.renderInputScreen(); return true; }
        if (key === 'negate') { this.editBuffer += '(-)'; this.renderInputScreen(); return true; }
        if (key === 'sin') { this.editBuffer += 'sin('; this.renderInputScreen(); return true; }
        if (key === 'cos') { this.editBuffer += 'cos('; this.renderInputScreen(); return true; }
        if (key === 'tan') { this.editBuffer += 'tan('; this.renderInputScreen(); return true; }
        if (key === 'sqrt') { this.editBuffer += '\u221a('; this.renderInputScreen(); return true; }
        if (key === 'log') { this.editBuffer += 'log('; this.renderInputScreen(); return true; }
        if (key === 'ln') { this.editBuffer += 'ln('; this.renderInputScreen(); return true; }
        if (key === 'fraction') { this.editBuffer += '/'; this.renderInputScreen(); return true; }
        if (key === 'reciprocal') { this.editBuffer += '\u207b\u00b9'; this.renderInputScreen(); return true; }
        if (key === 'exp') { this.editBuffer += '\u00d710^'; this.renderInputScreen(); return true; }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderInputScreen(); return true; }
        if (key === 'equals') {
            if (this.phase === 'input-f') {
                this.fExpr = this.editBuffer;
                this.editBuffer = '';
                if (this.useGx) { this.phase = 'input-g'; this.renderInputScreen(); }
                else { this.phase = 'range'; this.rangeField = 0; this.editBuffer = ''; this.renderRange(); }
            } else {
                this.gExpr = this.editBuffer;
                this.editBuffer = '';
                this.phase = 'range';
                this.rangeField = 0;
                this.renderRange();
            }
            return true;
        }
        if (key === 'ac') { this.editBuffer = ''; this.renderInputScreen(); return true; }
        return true;
    }
    handleRangeKey(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderRange(); return true;
        }
        if (key === 'negate' || key === 'subtract') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderRange(); return true;
        }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderRange(); return true; }
        if (key === 'equals') {
            if (this.editBuffer !== '') {
                const val = parseFloat(this.editBuffer);
                if (!isNaN(val)) {
                    if (this.rangeField === 0) this.start = val;
                    else if (this.rangeField === 1) this.end = val;
                    else this.step = val;
                }
                this.editBuffer = '';
            }
            if (this.rangeField < 2) { this.rangeField++; this.renderRange(); }
            else { this.generateTable(); }
            return true;
        }
        if (key === 'up') { if (this.rangeField > 0) { this.rangeField--; this.editBuffer = ''; } this.renderRange(); return true; }
        if (key === 'down') { if (this.rangeField < 2) { this.rangeField++; this.editBuffer = ''; } this.renderRange(); return true; }
        if (key === 'ac') { this.phase = 'input-f'; this.editBuffer = ''; this.renderInputScreen(); return true; }
        return true;
    }
    handleTableKey(key) {
        // Inline x value editing
        if (this.tableEditing) {
            if (/^[0-9]$/.test(key) || key === 'dot') {
                this.tableEditBuffer += key === 'dot' ? '.' : key;
                this.renderTable(); return true;
            }
            if (key === 'negate' || key === 'subtract') {
                if (this.tableEditBuffer.startsWith('-')) this.tableEditBuffer = this.tableEditBuffer.slice(1);
                else this.tableEditBuffer = '-' + this.tableEditBuffer;
                this.renderTable(); return true;
            }
            if (key === 'del') { this.tableEditBuffer = this.tableEditBuffer.slice(0, -1); this.renderTable(); return true; }
            if (key === 'equals') {
                const val = parseFloat(this.tableEditBuffer);
                if (!isNaN(val)) {
                    // Replace current row x and recalculate f(x), g(x)
                    this.recalcRow(this.tableRow, val);
                }
                this.tableEditing = false;
                this.tableEditBuffer = '';
                this.renderTable(); return true;
            }
            if (key === 'ac') { this.tableEditing = false; this.tableEditBuffer = ''; this.renderTable(); return true; }
            return true;
        }
        // Navigation and shortcuts
        if (key === 'up') {
            if (this.tableRow > 0) { this.tableRow--; if (this.tableRow < this.scrollTop) this.scrollTop = this.tableRow; }
            this.renderTable(); return true;
        }
        if (key === 'down') {
            if (this.tableRow < this.tableData.length - 1) { this.tableRow++; if (this.tableRow >= this.scrollTop + 4) this.scrollTop = this.tableRow - 3; }
            this.renderTable(); return true;
        }
        // + adds row with x = current + step
        if (key === 'add') {
            const curX = this.tableData[this.tableRow] ? this.tableData[this.tableRow].x : this.start;
            const newX = curX + this.step;
            this.insertRowAfter(this.tableRow, newX);
            this.tableRow++;
            if (this.tableRow >= this.scrollTop + 4) this.scrollTop = this.tableRow - 3;
            this.renderTable(); return true;
        }
        // - adds row with x = current - step
        if (key === 'subtract') {
            const curX = this.tableData[this.tableRow] ? this.tableData[this.tableRow].x : this.start;
            const newX = curX - this.step;
            this.insertRowAfter(this.tableRow, newX);
            this.tableRow++;
            if (this.tableRow >= this.scrollTop + 4) this.scrollTop = this.tableRow - 3;
            this.renderTable(); return true;
        }
        // Number key starts inline editing
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.tableEditing = true;
            this.tableEditBuffer = key === 'dot' ? '.' : key;
            this.renderTable(); return true;
        }
        if (key === 'negate') {
            this.tableEditing = true;
            this.tableEditBuffer = '-';
            this.renderTable(); return true;
        }
        // AC goes to Table Range editor (not function input)
        if (key === 'ac') {
            this.phase = 'range';
            this.rangeField = 0;
            this.editBuffer = '';
            this.renderRange(); return true;
        }
        return true;
    }
    recalcRow(idx, newX) {
        if (idx < 0 || idx >= this.tableData.length) return;
        const row = this.tableData[idx];
        row.x = newX;
        const savedX = this.engine.variables.x;
        this.engine.variables.x = parseFloat(newX.toPrecision(10));
        const fResult = this.engine.evaluate(this.fExpr, { silent: true });
        row.fx = fResult.error ? 'ERROR' : fResult.value;
        if (this.useGx && this.gExpr) {
            const gResult = this.engine.evaluate(this.gExpr, { silent: true });
            row.gx = gResult.error ? 'ERROR' : gResult.value;
        }
        this.engine.variables.x = savedX;
    }
    insertRowAfter(idx, newX) {
        const savedX = this.engine.variables.x;
        this.engine.variables.x = parseFloat(newX.toPrecision(10));
        const fResult = this.engine.evaluate(this.fExpr, { silent: true });
        let gx = null;
        if (this.useGx && this.gExpr) {
            const gResult = this.engine.evaluate(this.gExpr, { silent: true });
            gx = gResult.error ? 'ERROR' : gResult.value;
        }
        this.engine.variables.x = savedX;
        this.tableData.splice(idx + 1, 0, { x: newX, fx: fResult.error ? 'ERROR' : fResult.value, gx });
    }
    generateTable() {
        try {
            this.tableData = this.engine.generateTable(this.fExpr, this.useGx ? this.gExpr : null, this.start, this.end, this.step);
            this.tableRow = 0;
            this.scrollTop = 0;
            this.phase = 'table';
            this.renderTable();
        } catch (e) {
            this.app.displayResultEl.textContent = e.message || 'Math ERROR';
            this.app.displayResultEl.classList.add('error');
        }
    }
    getOptnMenu() { return null; }
}

// ========== EQUATION MODE (Mode 10) ==========
class EquationMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.phase = 'select-type'; // 'select-type', 'select-unknowns', 'input', 'solutions'
        this.eqType = null; // 'simul' or 'poly'
        this.numUnknowns = 2;
        this.coefficients = [];
        this.editIndex = 0;
        this.editBuffer = '';
        this.solutions = [];
        this.solutionIndex = 0;
        this.localMinMax = null;
    }
    enter() {
        this.app.clearAll();
        this.phase = 'select-type';
        this.showTypeSelect();
    }
    showTypeSelect() {
        this.app.menuOpen = true;
        this.app.menuType = 'eq-type';
        this.app.menuSelection = 0;
        this.app.menuItems = [
            { id: 1, name: 'Simul Equation' },
            { id: 2, name: 'Polynomial' }
        ];
        this.app.renderMenu();
    }
    selectType(index) {
        this.eqType = index === 0 ? 'simul' : 'poly';
        this.app.menuOpen = false;
        this.phase = 'select-unknowns';
        this.showUnknownsSelect();
    }
    showUnknownsSelect() {
        this.app.menuOpen = true;
        this.app.menuType = 'eq-unknowns';
        this.app.menuSelection = 0;
        if (this.eqType === 'simul') {
            this.app.menuItems = [
                { id: 2, name: '2 Unknowns' },
                { id: 3, name: '3 Unknowns' },
                { id: 4, name: '4 Unknowns' }
            ];
        } else {
            this.app.menuItems = [
                { id: 2, name: 'Degree 2' },
                { id: 3, name: 'Degree 3' },
                { id: 4, name: 'Degree 4' }
            ];
        }
        this.app.renderMenu();
    }
    selectUnknowns(index) {
        this.numUnknowns = index + 2;
        this.app.menuOpen = false;
        this.setupCoefficients();
        this.phase = 'input';
        this.editIndex = 0;
        this.editBuffer = '';
        this.renderCoeffEditor();
    }
    setupCoefficients() {
        if (this.eqType === 'simul') {
            // n equations, n+1 coefficients each (including constant)
            this.coefficients = [];
            for (let i = 0; i < this.numUnknowns; i++) {
                this.coefficients.push(new Array(this.numUnknowns + 1).fill(0));
            }
        } else {
            // Polynomial: degree+1 coefficients
            this.coefficients = new Array(this.numUnknowns + 1).fill(0);
        }
    }
    handleKey(key) {
        if (this.phase === 'input') return this.handleInputKey(key);
        if (this.phase === 'solutions') return this.handleSolutionKey(key);
        return false;
    }
    handleInputKey(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderCoeffEditor();
            return true;
        }
        if (key === 'negate') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderCoeffEditor();
            return true;
        }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderCoeffEditor(); return true; }
        if (key === 'equals') {
            const val = this.editBuffer === '' ? 0 : parseFloat(this.editBuffer);
            if (!isNaN(val)) this.setCoeff(this.editIndex, val);
            this.editBuffer = '';
            const total = this.getTotalCoeffs();
            if (this.editIndex < total - 1) {
                this.editIndex++;
                this.renderCoeffEditor();
            } else {
                this.solve();
            }
            return true;
        }
        if (key === 'up') { if (this.editIndex > 0) { this.editIndex--; this.editBuffer = ''; } this.renderCoeffEditor(); return true; }
        if (key === 'down') { const total = this.getTotalCoeffs(); if (this.editIndex < total - 1) { this.editIndex++; this.editBuffer = ''; } this.renderCoeffEditor(); return true; }
        if (key === 'ac') {
            // Reset all coefficients to 0
            this.setupCoefficients();
            this.editIndex = 0;
            this.editBuffer = '';
            this.renderCoeffEditor();
            return true;
        }
        return true;
    }
    handleSolutionKey(key) {
        if (key === 'equals' || key === 'down') {
            if (this.solutionIndex < this.solutions.length - 1) {
                this.solutionIndex++;
                this.renderSolution();
            } else if (this.localMinMax) {
                this.renderMinMax();
            } else {
                this.phase = 'input';
                this.renderCoeffEditor();
            }
            return true;
        }
        if (key === 'up') {
            if (this.solutionIndex > 0) { this.solutionIndex--; this.renderSolution(); }
            return true;
        }
        if (key === 'ac') {
            this.phase = 'input';
            this.renderCoeffEditor();
            return true;
        }
        return true;
    }
    getTotalCoeffs() {
        if (this.eqType === 'simul') return this.numUnknowns * (this.numUnknowns + 1);
        return this.numUnknowns + 1;
    }
    getCoeff(index) {
        if (this.eqType === 'simul') {
            const row = Math.floor(index / (this.numUnknowns + 1));
            const col = index % (this.numUnknowns + 1);
            return this.coefficients[row][col];
        }
        return this.coefficients[index];
    }
    setCoeff(index, val) {
        if (this.eqType === 'simul') {
            const row = Math.floor(index / (this.numUnknowns + 1));
            const col = index % (this.numUnknowns + 1);
            this.coefficients[row][col] = val;
        } else {
            this.coefficients[index] = val;
        }
    }
    renderCoeffEditor() {
        const n = this.numUnknowns;
        if (this.eqType === 'simul') {
            // Simultaneous equation: show template with curly brace
            const vars = ['x', 'y', 'z', 'w'].slice(0, n);
            let header = '';
            for (let i = 0; i < n; i++) header += (i > 0 ? '+' : '') + `_${vars[i]}`;
            header += '=_';
            this.app.displayInputEl.textContent = '';

            let html = '<div style="font-size:8px;font-family:monospace;line-height:1.25;text-align:left;">';
            // Show rows as equations with curly brace
            html += '<div style="display:flex;">';
            html += `<div style="font-size:${n * 8}px;line-height:1;margin-right:2px;">{</div>`;
            html += '<div style="flex:1;">';
            for (let row = 0; row < n; row++) {
                html += '<div>';
                for (let col = 0; col <= n; col++) {
                    const idx = row * (n + 1) + col;
                    const isCurrent = idx === this.editIndex;
                    const val = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                        this.engine.formatResult(this.getCoeff(idx));
                    const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;padding:0 1px;' : 'padding:0 1px;';
                    if (col < n) {
                        html += `<span style="${bg}">${val}</span>${vars[col]}`;
                        if (col < n - 1) html += '+';
                    } else {
                        html += `=<span style="${bg}">${val}</span>`;
                    }
                }
                html += '</div>';
            }
            html += '</div></div></div>';
            this.app.displayResultEl.innerHTML = html;
        } else {
            // Polynomial: show ax^n + bx^(n-1) + ... header
            let header = '';
            const labels = ['a', 'b', 'c', 'd', 'e'];
            for (let i = 0; i <= n; i++) {
                if (i > 0) header += '+';
                const exp = n - i;
                header += labels[i];
                if (exp > 1) header += `x^${exp}`;
                else if (exp === 1) header += 'x';
            }
            this.app.displayInputEl.textContent = header;

            let html = '<div style="font-size:9px;font-family:monospace;line-height:1.3;text-align:left;">';
            for (let i = 0; i <= n; i++) {
                const isCurrent = i === this.editIndex;
                const val = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                    this.engine.formatResult(this.coefficients[i]);
                const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
                const exp = n - i;
                let label = labels[i];
                html += `<div style="${bg}padding:0 2px;">${label}=${val}</div>`;
            }
            html += '</div>';
            this.app.displayResultEl.innerHTML = html;
        }
    }
    solve() {
        try {
            if (this.eqType === 'simul') {
                this.solutions = this.engine.solveSimultaneous(this.coefficients, this.numUnknowns);
                this.localMinMax = null;
            } else {
                const c = this.coefficients;
                let roots;
                switch (this.numUnknowns) {
                    case 2: roots = this.engine.solveQuadratic(c[0], c[1], c[2]); break;
                    case 3: roots = this.engine.solveCubic(c[0], c[1], c[2], c[3]); break;
                    case 4: roots = this.engine.solveQuartic(c[0], c[1], c[2], c[3], c[4]); break;
                }
                // Polish roots for numerical accuracy
                if (roots && this.engine.polishPolynomialRoots) {
                    roots = this.engine.polishPolynomialRoots(c, roots);
                }
                // Verify all roots by substitution; fall back to numerical solver if inaccurate
                const verifyRoot = (r) => {
                    if (isNaN(r.re) || isNaN(r.im)) return false;
                    // Evaluate polynomial at complex root
                    let valRe = 0, valIm = 0;
                    let powRe = 1, powIm = 0;
                    for (let i = this.numUnknowns; i >= 0; i--) {
                        valRe += c[i] * powRe;
                        valIm += c[i] * powIm;
                        if (i > 0) {
                            const nRe = powRe * r.re - powIm * r.im;
                            const nIm = powRe * r.im + powIm * r.re;
                            powRe = nRe; powIm = nIm;
                        }
                    }
                    return Math.sqrt(valRe * valRe + valIm * valIm) < 0.1;
                };
                if (!roots || roots.length === 0 || !roots.every(r => verifyRoot(r))) {
                    roots = this.engine.solvePolynomialNumerical(c);
                }
                this.solutions = roots;
                // Local min/max for quadratic
                if (this.numUnknowns === 2) {
                    this.localMinMax = this.engine.quadraticMinMax(c[0], c[1], c[2]);
                } else {
                    this.localMinMax = null;
                }
            }
            this.solutionIndex = 0;
            this.phase = 'solutions';
            this.renderSolution();
        } catch (e) {
            if (this.eqType === 'simul') {
                // Detect No Solution vs Infinite Solution
                const n = this.numUnknowns;
                const a = this.coefficients.map(row => [...row]);
                let noSol = false;
                for (let col = 0; col < n; col++) {
                    let maxRow = col;
                    for (let row = col + 1; row < n; row++) {
                        if (Math.abs(a[row][col]) > Math.abs(a[maxRow][col])) maxRow = row;
                    }
                    [a[col], a[maxRow]] = [a[maxRow], a[col]];
                    if (Math.abs(a[col][col]) < 1e-15) {
                        noSol = Math.abs(a[col][n]) > 1e-12;
                        break;
                    }
                    for (let row = col + 1; row < n; row++) {
                        const factor = a[row][col] / a[col][col];
                        for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
                    }
                }
                this.app.displayInputEl.textContent = '';
                this.app.displayResultEl.textContent = noSol ? 'No Solution' : 'Infinite Solution';
                this.solutions = [];
                this.phase = 'solutions';
                return;
            }
            this.app.displayResultEl.textContent = e.message || 'Math ERROR';
            this.app.displayResultEl.classList.add('error');
        }
    }
    renderSolution() {
        if (!this.solutions || this.solutions.length === 0) return;
        const sol = this.solutions[this.solutionIndex];
        const n = this.numUnknowns;
        const isMath = this.engine.inputOutput.startsWith('MathI');
        const useKatex = isMath && typeof katex !== 'undefined';
        if (this.eqType === 'simul') {
            const varNames = ['x', 'y', 'z', 'w'];
            const varName = varNames[this.solutionIndex];
            this.app.displayInputEl.textContent = varName + '=';
            // Try fraction form for simultaneous solutions
            let resultStr = this.engine.formatResult(sol);
            const frac = this.engine.toFraction(sol);
            if (frac && frac.den !== 1 && frac.den <= 9999) {
                const totalNum = frac.whole * frac.den + frac.num;
                resultStr = totalNum + '/' + frac.den;
            }
            if (useKatex) {
                this.app.renderKatex(this.app.displayResultEl, this.app.resultToLatex(resultStr));
            } else {
                this.app.displayResultEl.textContent = resultStr;
            }
            this.engine.ans = sol;
        } else {
            // Polynomial header: ax³+bx²+cx+d=0
            const coeffLabels = ['a', 'b', 'c', 'd', 'e'];
            let header = '';
            for (let i = 0; i <= n; i++) {
                if (i > 0) header += '+';
                const exp = n - i;
                header += coeffLabels[i];
                if (exp > 1) header += 'x' + (exp === 2 ? '²' : (exp === 3 ? '³' : (exp === 4 ? '⁴' : '')));
                else if (exp === 1) header += 'x';
            }
            header += '=0';

            const labelStr = (this.solutions.length > 1 ? 'x' + (this.solutionIndex + 1) : 'x') + '=';
            // Header on first line, label on second line
            this.app.displayInputEl.innerHTML =
                '<div style="font-size:8px;font-family:monospace;">' + header + '</div>' +
                '<div style="font-size:12px;font-weight:700;">' + labelStr + '</div>';
            if (Math.abs(sol.im) < 1e-12) {
                const valStr = this.engine.formatResult(sol.re);
                if (useKatex) {
                    this.app.renderKatex(this.app.displayResultEl, this.app.resultToLatex(valStr));
                } else {
                    this.app.displayResultEl.textContent = valStr;
                }
                this.engine.ans = sol.re;
            } else {
                // Complex root: try to show exact form like -1+√2i
                const cStr = this.engine.formatComplex(sol);
                if (useKatex) {
                    let latex = cStr.replace(/√(\d+)/g, '\\sqrt{$1}');
                    this.app.renderKatex(this.app.displayResultEl, latex);
                } else {
                    this.app.displayResultEl.textContent = cStr;
                }
                this.engine.ans = sol.re;
            }
        }
    }
    renderMinMax() {
        if (!this.localMinMax) return;
        const mm = this.localMinMax;
        this.app.displayInputEl.textContent = mm.isMin ? 'Local Min' : 'Local Max';
        this.app.displayResultEl.innerHTML =
            `<div style="font-size:10px;font-family:monospace;">` +
            `(x=) ${this.engine.formatResult(mm.x)}<br>` +
            `(y=) ${this.engine.formatResult(mm.y)}</div>`;
    }
    getOptnMenu() {
        return [
            { id: 1, name: 'Simul Equation' },
            { id: 2, name: 'Polynomial' }
        ];
    }
    handleOptn(index) {
        this.eqType = index === 0 ? 'simul' : 'poly';
        this.phase = 'select-unknowns';
        this.showUnknownsSelect();
    }
}

// ========== INEQUALITY MODE (Mode 11) ==========
class InequalityMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.degree = 2;
        this.ineqType = '>0'; // '>0', '<0', '>=0', '<=0'
        this.coefficients = [];
        this.editIndex = 0;
        this.editBuffer = '';
        this.phase = 'select-degree';
        this.solutions = null;
    }
    enter() {
        this.app.clearAll();
        this.phase = 'select-degree';
        this.showDegreeSelect();
    }
    showDegreeSelect() {
        this.app.menuOpen = true;
        this.app.menuType = 'ineq-degree';
        this.app.menuSelection = 0;
        this.app.menuItems = [
            { id: 2, name: '2nd Degree' },
            { id: 3, name: '3rd Degree' },
            { id: 4, name: '4th Degree' }
        ];
        this.app.renderMenu();
    }
    selectDegree(index) {
        this.degree = index + 2;
        this.app.menuOpen = false;
        this.phase = 'select-ineq';
        this.showIneqTypeSelect();
    }
    showIneqTypeSelect() {
        this.app.menuOpen = true;
        this.app.menuType = 'ineq-type';
        this.app.menuSelection = 0;
        const d = this.degree;
        const polyStr = d === 2 ? 'ax²+bx+c' : (d === 3 ? 'ax³+bx²+cx+d' : 'ax⁴+bx³+cx²+dx+e');
        this.app.menuItems = [
            { id: 1, name: polyStr + '>0' },
            { id: 2, name: polyStr + '<0' },
            { id: 3, name: polyStr + '≥0' },
            { id: 4, name: polyStr + '≤0' }
        ];
        this.app.renderMenu();
    }
    selectIneqType(index) {
        const types = ['>0', '<0', '>=0', '<=0'];
        this.ineqType = types[index];
        this.app.menuOpen = false;
        this.coefficients = new Array(this.degree + 1).fill(0);
        this.editIndex = 0;
        this.editBuffer = '';
        this.phase = 'input';
        this.renderCoeffEditor();
    }
    handleKey(key) {
        if (this.phase === 'input') return this.handleInputKey(key);
        if (this.phase === 'solutions') {
            if (key === 'ac' || key === 'equals') {
                this.phase = 'input';
                this.renderCoeffEditor();
                return true;
            }
            return true;
        }
        return false;
    }
    handleInputKey(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderCoeffEditor();
            return true;
        }
        if (key === 'negate') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderCoeffEditor();
            return true;
        }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderCoeffEditor(); return true; }
        if (key === 'equals') {
            const val = this.editBuffer === '' ? 0 : parseFloat(this.editBuffer);
            if (!isNaN(val)) this.coefficients[this.editIndex] = val;
            this.editBuffer = '';
            if (this.editIndex < this.degree) {
                this.editIndex++;
                this.renderCoeffEditor();
            } else {
                this.solve();
            }
            return true;
        }
        if (key === 'up') { if (this.editIndex > 0) { this.editIndex--; this.editBuffer = ''; } this.renderCoeffEditor(); return true; }
        if (key === 'down') { if (this.editIndex < this.degree) { this.editIndex++; this.editBuffer = ''; } this.renderCoeffEditor(); return true; }
        if (key === 'ac') {
            this.coefficients = new Array(this.degree + 1).fill(0);
            this.editIndex = 0;
            this.editBuffer = '';
            this.renderCoeffEditor();
            return true;
        }
        return true;
    }
    renderCoeffEditor() {
        const n = this.degree;
        // Header: ax³+bx²+cx+d<0 with proper exponents
        const polyStr = n === 2 ? 'ax²+bx+c' : (n === 3 ? 'ax³+bx²+cx+d' : 'ax⁴+bx³+cx²+dx+e');
        const ineqSym = this.ineqType.replace('0', '').replace('>=', '≥').replace('<=', '≤');
        this.app.displayInputEl.textContent = polyStr + ineqSym + '0';

        // Show coefficients in template format like equation mode
        const expLabels = [];
        for (let i = 0; i <= n; i++) {
            const exp = n - i;
            expLabels.push(exp > 1 ? 'x' + (exp === 2 ? '²' : (exp === 3 ? '³' : '⁴')) + '+' :
                          (exp === 1 ? 'x' : ''));
        }
        let html = '<div style="font-size:8px;font-family:monospace;line-height:1.25;text-align:left;">';
        html += '<div style="white-space:nowrap;">';
        for (let i = 0; i <= n; i++) {
            const isCurrent = i === this.editIndex;
            const val = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                this.engine.formatResult(this.coefficients[i]);
            const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;padding:0 1px;' : 'padding:0 1px;';
            html += `<span style="${bg}">${val}</span>${expLabels[i]}`;
        }
        html += '</div>';
        html += `<div style="text-align:left;padding-top:1px;">${ineqSym} 0</div>`;
        html += '</div>';
        // Show edit value at bottom-right
        if (this.editBuffer !== '') {
            html += `<div style="font-size:11px;font-family:monospace;text-align:right;font-weight:700;">${this.editBuffer}</div>`;
        }
        this.app.displayResultEl.innerHTML = html;
    }
    solve() {
        try {
            const c = this.coefficients;
            let roots;
            switch (this.degree) {
                case 2: roots = this.engine.solveQuadratic(c[0], c[1], c[2]); break;
                case 3: roots = this.engine.solveCubic(c[0], c[1], c[2], c[3]); break;
                case 4: roots = this.engine.solveQuartic(c[0], c[1], c[2], c[3], c[4]); break;
            }
            // Display solution ranges
            const realRoots = roots.filter(r => Math.abs(r.im) < 1e-12)
                .map(r => parseFloat(r.re.toPrecision(10)))
                .sort((a, b) => a - b);
            // Remove duplicates
            const uniqueRoots = [...new Set(realRoots.map(r => r.toPrecision(10)))].map(Number);

            this.phase = 'solutions';
            if (uniqueRoots.length === 0) {
                // Test at x=0
                let testVal = c[c.length - 1]; // constant term
                const satisfies = this.ineqType.includes('>') ? testVal > 0 :
                    this.ineqType.includes('<') ? testVal < 0 : false;
                this.app.displayInputEl.textContent = '';
                this.app.displayResultEl.textContent = satisfies ? 'All Real Numbers' : 'No Solution';
            } else {
                this.displayInequalitySolution(uniqueRoots);
            }
        } catch (e) {
            this.app.displayResultEl.textContent = e.message || 'Math ERROR';
            this.app.displayResultEl.classList.add('error');
        }
    }
    displayInequalitySolution(roots) {
        const c = this.coefficients;
        // Test intervals between roots
        const intervals = [];
        const testPoints = [];
        testPoints.push(roots[0] - 1); // before first root
        for (let i = 0; i < roots.length - 1; i++) {
            testPoints.push((roots[i] + roots[i + 1]) / 2);
        }
        testPoints.push(roots[roots.length - 1] + 1); // after last root

        const isStrict = this.ineqType === '>0' || this.ineqType === '<0';
        const isGreater = this.ineqType.includes('>');

        for (let i = 0; i < testPoints.length; i++) {
            const x = testPoints[i];
            let val = 0;
            for (let j = 0; j <= this.degree; j++) {
                val += c[j] * Math.pow(x, this.degree - j);
            }
            const satisfies = isGreater ? val > 0 : val < 0;
            if (satisfies || (!isStrict && Math.abs(val) < 1e-10)) {
                if (i === 0) intervals.push([null, roots[0]]);
                else if (i === testPoints.length - 1) intervals.push([roots[roots.length - 1], null]);
                else intervals.push([roots[i - 1], roots[i]]);
            }
        }

        const lt = isStrict ? '<' : '≤';
        const gt = isStrict ? '>' : '≥';
        // Build header pattern (x<a, b<x<c) and value string (x<-3, -2<x<1)
        let pattern = '', solution = '';
        const varLetters = ['a', 'b', 'c', 'd', 'e'];
        let varIdx = 0;
        for (let i = 0; i < intervals.length; i++) {
            if (i > 0) { pattern += ', '; solution += ', '; }
            const [lo, hi] = intervals[i];
            if (lo === null) {
                pattern += 'x' + lt + varLetters[varIdx++];
                solution += 'x' + lt + this.engine.formatResult(hi);
            } else if (hi === null) {
                pattern += 'x' + gt + varLetters[varIdx++];
                solution += 'x' + gt + this.engine.formatResult(lo);
            } else {
                pattern += varLetters[varIdx++] + lt + 'x' + lt + varLetters[varIdx++];
                solution += this.engine.formatResult(lo) + lt + 'x' + lt + this.engine.formatResult(hi);
            }
        }

        this.app.displayInputEl.textContent = pattern || '';
        this.app.displayResultEl.textContent = solution || 'No Solution';
    }
    getOptnMenu() {
        return [{ id: 1, name: 'Polynomial' }];
    }
}

// ========== RATIO MODE (Mode 12) ==========
class RatioMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.ratioType = 1; // 1: A:B=X:D, 2: A:B=C:X
        this.values = { A: 0, B: 0, C: 0, D: 0 };
        this.phase = 'select-type';
        this.editIndex = 0;
        this.editBuffer = '';
        this.fieldNames = [];
    }
    enter() {
        this.app.clearAll();
        this.phase = 'select-type';
        this.showTypeSelect();
    }
    showTypeSelect() {
        this.app.menuOpen = true;
        this.app.menuType = 'ratio-type';
        this.app.menuSelection = 0;
        this.app.menuItems = [
            { id: 1, name: 'A:B=X:D' },
            { id: 2, name: 'A:B=C:X' }
        ];
        this.app.renderMenu();
    }
    selectType(index) {
        this.ratioType = index + 1;
        this.app.menuOpen = false;
        this.values = { A: 0, B: 0, C: 0, D: 0 };
        if (this.ratioType === 1) {
            this.fieldNames = ['A', 'B', 'D'];
        } else {
            this.fieldNames = ['A', 'B', 'C'];
        }
        this.editIndex = 0;
        this.editBuffer = '';
        this.phase = 'input';
        this.renderInput();
    }
    handleKey(key) {
        if (this.phase === 'input') return this.handleInputKey(key);
        if (this.phase === 'result') {
            if (key === 'ac' || key === 'equals') {
                this.phase = 'input';
                this.renderInput();
                return true;
            }
            return true;
        }
        return false;
    }
    handleInputKey(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderInput();
            return true;
        }
        if (key === 'negate') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderInput();
            return true;
        }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderInput(); return true; }
        if (key === 'equals') {
            if (this.editBuffer !== '') {
                const val = parseFloat(this.editBuffer);
                if (!isNaN(val)) this.values[this.fieldNames[this.editIndex]] = val;
                this.editBuffer = '';
            }
            if (this.editIndex < this.fieldNames.length - 1) {
                this.editIndex++;
                this.renderInput();
            } else {
                this.solve();
            }
            return true;
        }
        if (key === 'up') { if (this.editIndex > 0) { this.editIndex--; this.editBuffer = ''; } this.renderInput(); return true; }
        if (key === 'down') { if (this.editIndex < this.fieldNames.length - 1) { this.editIndex++; this.editBuffer = ''; } this.renderInput(); return true; }
        if (key === 'ac') {
            this.values = { A: 0, B: 0, C: 0, D: 0 };
            this.editIndex = 0;
            this.editBuffer = '';
            this.renderInput();
            return true;
        }
        return true;
    }
    renderInput() {
        const typeStr = this.ratioType === 1 ? 'A:B=X:D' : 'A:B=C:X';
        this.app.displayInputEl.textContent = typeStr;
        let html = '<div style="font-size:10px;font-family:monospace;line-height:1.4;text-align:left;">';
        // Show the ratio equation with fields
        for (let i = 0; i < this.fieldNames.length; i++) {
            const name = this.fieldNames[i];
            const isCurrent = i === this.editIndex;
            const val = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                this.engine.formatResult(this.values[name]);
            const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            html += `<div style="${bg}padding:0 2px;">${name}=${val}</div>`;
        }
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
    }
    solve() {
        try {
            const result = this.engine.solveRatio(this.values, this.ratioType);
            this.app.displayInputEl.textContent = this.ratioType === 1 ? 'A:B=X:D' : 'A:B=C:X';
            this.app.displayResultEl.textContent = `(X=) ${this.engine.formatResult(result)}`;
            this.engine.ans = result;
            this.phase = 'result';
        } catch (e) {
            this.app.displayResultEl.textContent = e.message || 'Math ERROR';
            this.app.displayResultEl.classList.add('error');
        }
    }
    getOptnMenu() {
        return [{ id: 1, name: 'Select Type' }];
    }
}

// ========== MODE REGISTRY ==========
const ModeRegistry = {
    'Calculate': null,
    'Complex': ComplexMode,
    'Base-N': BaseNMode,
    'Matrix': MatrixMode,
    'Vector': VectorMode,
    'Statistics': StatisticsMode,
    'Distribution': DistributionMode,
    'Spreadsheet': SpreadsheetMode,
    'Table': TableMode,
    'Equation/Func': EquationMode,
    'Inequality': InequalityMode,
    'Ratio': RatioMode
};
