/**
 * Casio fx-991EX Calculation Engine
 * Handles expression parsing, evaluation, and all mathematical functions
 */

class CalcEngine {
    constructor() {
        // Angle unit: 'DEG', 'RAD', 'GRAD'
        this.angleUnit = 'DEG';
        // Input/Output format
        this.inputOutput = 'MathI/MathO';
        // Number format
        this.numberFormat = { type: 'Norm', value: 1 };
        // Fraction result format: 'd/c' (improper) or 'ab/c' (mixed)
        this.fractionResult = 'd/c';
        // Memory
        this.ans = 0;
        this.variables = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0, x: 0, y: 0 };
        // Calculation history
        this.history = [];
        this.historyIndex = -1;
        // Current mode
        this.mode = 'Calculate';
        // Engineering symbol display
        this.engineerSymbol = false;
        // Digit separator
        this.digitSeparator = false;
        // Decimal mark
        this.decimalMark = '.';
        // Complex format
        this.complexFormat = 'a+bi';
        // Statistics/Table settings (persisted across mode changes)
        this.statFrequency = false;
        this.tableUseGx = false;
        // Last raw result for toggling
        this.lastRawResult = null;
        this.lastDisplayFormat = null;
    }

    // === Angle conversion helpers ===
    toRadians(value) {
        switch (this.angleUnit) {
            case 'DEG': return value * Math.PI / 180;
            case 'RAD': return value;
            case 'GRAD': return value * Math.PI / 200;
            default: return value;
        }
    }

    fromRadians(value) {
        switch (this.angleUnit) {
            case 'DEG': return value * 180 / Math.PI;
            case 'RAD': return value;
            case 'GRAD': return value * 200 / Math.PI;
            default: return value;
        }
    }

    // === Tokenizer ===
    tokenize(expr) {
        const tokens = [];
        let i = 0;
        const str = expr.replace(/\s+/g, '');

        while (i < str.length) {
            const ch = str[i];

            // Numbers (including decimals)
            if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < str.length && /[0-9]/.test(str[i + 1]))) {
                let num = '';
                while (i < str.length && (/[0-9]/.test(str[i]) || str[i] === '.')) {
                    num += str[i];
                    i++;
                }
                // Check for ×10^
                if (str.substring(i, i + 4) === '×10^') {
                    i += 4;
                    let exp = '';
                    if (str[i] === '-' || str[i] === '+') {
                        exp += str[i];
                        i++;
                    }
                    while (i < str.length && /[0-9]/.test(str[i])) {
                        exp += str[i];
                        i++;
                    }
                    tokens.push({ type: 'number', value: parseFloat(num + 'e' + exp) });
                } else {
                    let numVal = parseFloat(num);
                    // Check for engineering symbol suffix: k, M, G, T, m, μ, n, p, f
                    const engMap = { 'k': 1e3, 'M': 1e6, 'G': 1e9, 'T': 1e12,
                                     'm': 1e-3, 'μ': 1e-6, 'n': 1e-9, 'p': 1e-12, 'f': 1e-15 };
                    if (i < str.length && engMap[str[i]] !== undefined) {
                        // Make sure it's not a variable like 'x' or function name
                        const nextChar = i + 1 < str.length ? str[i + 1] : '';
                        if (!/[a-zA-Z(]/.test(nextChar)) {
                            numVal *= engMap[str[i]];
                            i++;
                        }
                    }
                    tokens.push({ type: 'number', value: numVal });
                }
                continue;
            }

            // Operators
            if ('+-'.includes(ch)) {
                tokens.push({ type: 'op', value: ch });
                i++;
                continue;
            }
            if (ch === '×' || ch === '*') {
                tokens.push({ type: 'op', value: '×' });
                i++;
                continue;
            }
            if (ch === '÷' || ch === '/') {
                tokens.push({ type: 'op', value: '÷' });
                i++;
                continue;
            }

            // Power
            if (ch === '^') {
                tokens.push({ type: 'op', value: '^' });
                i++;
                continue;
            }

            // Parentheses
            if (ch === '(' || ch === ')') {
                tokens.push({ type: 'paren', value: ch });
                i++;
                continue;
            }

            // Functions - check multi-character first
            const remaining = str.substring(i);

            // Inverse trig
            if (remaining.startsWith('sin⁻¹(') || remaining.startsWith('asin(')) {
                const fname = remaining.startsWith('sin⁻¹(') ? 'sin⁻¹(' : 'asin(';
                tokens.push({ type: 'func', value: 'asin' });
                tokens.push({ type: 'paren', value: '(' });
                i += fname.length;
                continue;
            }
            if (remaining.startsWith('cos⁻¹(') || remaining.startsWith('acos(')) {
                const fname = remaining.startsWith('cos⁻¹(') ? 'cos⁻¹(' : 'acos(';
                tokens.push({ type: 'func', value: 'acos' });
                tokens.push({ type: 'paren', value: '(' });
                i += fname.length;
                continue;
            }
            if (remaining.startsWith('tan⁻¹(') || remaining.startsWith('atan(')) {
                const fname = remaining.startsWith('tan⁻¹(') ? 'tan⁻¹(' : 'atan(';
                tokens.push({ type: 'func', value: 'atan' });
                tokens.push({ type: 'paren', value: '(' });
                i += fname.length;
                continue;
            }

            // Hyperbolic
            if (remaining.startsWith('sinh(')) { tokens.push({ type: 'func', value: 'sinh' }); tokens.push({ type: 'paren', value: '(' }); i += 5; continue; }
            if (remaining.startsWith('cosh(')) { tokens.push({ type: 'func', value: 'cosh' }); tokens.push({ type: 'paren', value: '(' }); i += 5; continue; }
            if (remaining.startsWith('tanh(')) { tokens.push({ type: 'func', value: 'tanh' }); tokens.push({ type: 'paren', value: '(' }); i += 5; continue; }
            if (remaining.startsWith('sinh⁻¹(') || remaining.startsWith('asinh(')) {
                tokens.push({ type: 'func', value: 'asinh' }); tokens.push({ type: 'paren', value: '(' });
                i += remaining.startsWith('sinh⁻¹(') ? 7 : 6; continue;
            }
            if (remaining.startsWith('cosh⁻¹(') || remaining.startsWith('acosh(')) {
                tokens.push({ type: 'func', value: 'acosh' }); tokens.push({ type: 'paren', value: '(' });
                i += remaining.startsWith('cosh⁻¹(') ? 7 : 6; continue;
            }
            if (remaining.startsWith('tanh⁻¹(') || remaining.startsWith('atanh(')) {
                tokens.push({ type: 'func', value: 'atanh' }); tokens.push({ type: 'paren', value: '(' });
                i += remaining.startsWith('tanh⁻¹(') ? 7 : 6; continue;
            }

            // Trig
            if (remaining.startsWith('sin(')) { tokens.push({ type: 'func', value: 'sin' }); tokens.push({ type: 'paren', value: '(' }); i += 4; continue; }
            if (remaining.startsWith('cos(')) { tokens.push({ type: 'func', value: 'cos' }); tokens.push({ type: 'paren', value: '(' }); i += 4; continue; }
            if (remaining.startsWith('tan(')) { tokens.push({ type: 'func', value: 'tan' }); tokens.push({ type: 'paren', value: '(' }); i += 4; continue; }

            // Logarithms
            if (remaining.startsWith('log(')) {
                tokens.push({ type: 'func', value: 'log10' });
                tokens.push({ type: 'paren', value: '(' });
                i += 4;
                continue;
            }
            if (remaining.startsWith('ln(')) {
                tokens.push({ type: 'func', value: 'ln' });
                tokens.push({ type: 'paren', value: '(' });
                i += 3;
                continue;
            }
            if (remaining.startsWith('10^(')) {
                tokens.push({ type: 'func', value: 'pow10' });
                tokens.push({ type: 'paren', value: '(' });
                i += 4;
                continue;
            }
            if (remaining.startsWith('e^(')) {
                tokens.push({ type: 'func', value: 'exp' });
                tokens.push({ type: 'paren', value: '(' });
                i += 3;
                continue;
            }

            // Square root
            if (remaining.startsWith('√(')) {
                tokens.push({ type: 'func', value: 'sqrt' });
                tokens.push({ type: 'paren', value: '(' });
                i += 2;
                continue;
            }
            if (remaining.startsWith('³√(')) {
                tokens.push({ type: 'func', value: 'cbrt' });
                tokens.push({ type: 'paren', value: '(' });
                i += 3;
                continue;
            }

            // Abs
            if (remaining.startsWith('Abs(')) {
                tokens.push({ type: 'func', value: 'abs' });
                tokens.push({ type: 'paren', value: '(' });
                i += 4;
                continue;
            }

            // Pol, Rec
            if (remaining.startsWith('Pol(')) {
                tokens.push({ type: 'func', value: 'pol' });
                tokens.push({ type: 'paren', value: '(' });
                i += 4;
                continue;
            }
            if (remaining.startsWith('Rec(')) {
                tokens.push({ type: 'func', value: 'rec' });
                tokens.push({ type: 'paren', value: '(' });
                i += 4;
                continue;
            }

            // Postfix operators
            if (ch === '²') { tokens.push({ type: 'postfix', value: '²' }); i++; continue; }
            if (ch === '³') { tokens.push({ type: 'postfix', value: '³' }); i++; continue; }
            if (remaining.startsWith('⁻¹')) { tokens.push({ type: 'postfix', value: '⁻¹' }); i += 2; continue; }
            if (ch === '!') { tokens.push({ type: 'postfix', value: '!' }); i++; continue; }
            if (ch === '%') { tokens.push({ type: 'postfix', value: '%' }); i++; continue; }

            // Constants
            if (ch === 'π') { tokens.push({ type: 'number', value: Math.PI }); i++; continue; }
            if (ch === 'e' && (i + 1 >= str.length || !/[a-z]/i.test(str[i + 1]))) {
                tokens.push({ type: 'number', value: Math.E });
                i++;
                continue;
            }

            // Variables
            if (remaining.startsWith('Ans')) {
                tokens.push({ type: 'number', value: this.ans });
                i += 3;
                continue;
            }
            if (/^[A-Fxy]$/.test(ch) && (i + 1 >= str.length || !/[a-z]/i.test(str[i + 1]))) {
                tokens.push({ type: 'number', value: this.variables[ch] || 0 });
                i++;
                continue;
            }
            if (ch === 'M' && (i + 1 >= str.length || !/[a-z]/i.test(str[i + 1]))) {
                tokens.push({ type: 'number', value: this.variables.M || 0 });
                i++;
                continue;
            }

            // Comma (function argument separator)
            if (ch === ',') {
                tokens.push({ type: 'comma', value: ',' });
                i++;
                continue;
            }

            // nPr, nCr
            if (remaining.startsWith('nPr')) {
                tokens.push({ type: 'op', value: 'nPr' });
                i += 3;
                continue;
            }
            if (remaining.startsWith('nCr')) {
                tokens.push({ type: 'op', value: 'nCr' });
                i += 3;
                continue;
            }

            // Negation marker (internal)
            if (ch === '⁻') {
                tokens.push({ type: 'unary', value: 'neg' });
                i++;
                continue;
            }

            // Unknown character — error
            throw new Error('Syntax ERROR');
        }

        return tokens;
    }

    // === Recursive Descent Parser ===
    parse(tokens) {
        let pos = 0;

        const peek = () => tokens[pos];
        const consume = () => tokens[pos++];

        const parseExpr = () => parseAddSub();

        const parseAddSub = () => {
            let left = parseMulDiv();
            while (pos < tokens.length) {
                const t = peek();
                if (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
                    consume();
                    const right = parseMulDiv();
                    left = t.value === '+' ? left + right : left - right;
                } else {
                    break;
                }
            }
            return left;
        };

        const parseMulDiv = () => {
            let left = parsePermComb();
            while (pos < tokens.length) {
                const t = peek();
                if (t && t.type === 'op' && (t.value === '×' || t.value === '÷')) {
                    consume();
                    const right = parsePermComb();
                    if (t.value === '÷' && right === 0) throw new Error('Math ERROR');
                    left = t.value === '×' ? left * right : left / right;
                } else {
                    break;
                }
            }
            return left;
        };

        const parsePermComb = () => {
            let left = parsePower();
            while (pos < tokens.length) {
                const t = peek();
                if (t && t.type === 'op' && (t.value === 'nPr' || t.value === 'nCr')) {
                    consume();
                    const right = parsePower();
                    if (t.value === 'nPr') {
                        left = this.permutation(left, right);
                    } else {
                        left = this.combination(left, right);
                    }
                } else {
                    break;
                }
            }
            return left;
        };

        const parsePower = () => {
            let base = parseUnary();
            while (pos < tokens.length) {
                const t = peek();
                if (t && t.type === 'op' && t.value === '^') {
                    consume();
                    const exp = parseUnary();
                    base = Math.pow(base, exp);
                } else {
                    break;
                }
            }
            return base;
        };

        const parseUnary = () => {
            const t = peek();
            // Unary minus
            if (t && t.type === 'op' && t.value === '-') {
                // Check if this is truly unary (at start or after operator/open paren)
                if (pos === 0 || (tokens[pos - 1] && (tokens[pos - 1].type === 'op' || (tokens[pos - 1].type === 'paren' && tokens[pos - 1].value === '(')))) {
                    consume();
                    return -parsePostfix();
                }
            }
            if (t && t.type === 'unary' && t.value === 'neg') {
                consume();
                return -parsePostfix();
            }
            return parsePostfix();
        };

        const parsePostfix = () => {
            let val = parsePrimary();
            while (pos < tokens.length) {
                const t = peek();
                if (t && t.type === 'postfix') {
                    consume();
                    switch (t.value) {
                        case '²': val = val * val; break;
                        case '³': val = val * val * val; break;
                        case '⁻¹':
                            if (val === 0) throw new Error('Math ERROR');
                            val = 1 / val;
                            break;
                        case '!': val = this.factorial(val); break;
                        case '%': val = val / 100; break;
                        default: break;
                    }
                } else {
                    break;
                }
            }
            return val;
        };

        const parsePrimary = () => {
            const t = peek();
            if (!t) throw new Error('Syntax ERROR');

            // Number
            if (t.type === 'number') {
                consume();
                // Check for implicit multiplication
                if (pos < tokens.length) {
                    const next = peek();
                    if (next && (next.type === 'func' || (next.type === 'paren' && next.value === '(') || next.type === 'number')) {
                        // Implicit multiplication (e.g., 2sin(30), 2(3), 2π)
                        const right = parsePostfix();
                        return t.value * right;
                    }
                }
                return t.value;
            }

            // Parenthesized expression
            if (t.type === 'paren' && t.value === '(') {
                consume();
                const val = parseExpr();
                if (pos < tokens.length && peek() && peek().type === 'paren' && peek().value === ')') {
                    consume();
                } else {
                    throw new Error('Syntax ERROR');
                }
                return val;
            }

            // Functions
            if (t.type === 'func') {
                consume();
                // Expect opening paren (already consumed by tokenizer)
                if (pos < tokens.length && peek().type === 'paren' && peek().value === '(') {
                    consume();
                }

                // For functions with multiple args (log base, Pol, Rec)
                if (t.value === 'log10') {
                    // Check if there's a comma (log(base, value))
                    const args = parseFuncArgs();
                    if (args.length === 2) {
                        return Math.log(args[1]) / Math.log(args[0]);
                    }
                    return Math.log10(args[0]);
                }
                if (t.value === 'pol') {
                    const args = parseFuncArgs();
                    if (args.length === 2) {
                        const r = Math.sqrt(args[0] * args[0] + args[1] * args[1]);
                        const theta = this.fromRadians(Math.atan2(args[1], args[0]));
                        this.variables.x = r;
                        this.variables.y = theta;
                        return r; // Returns r, θ stored in x, y
                    }
                    throw new Error('Syntax ERROR');
                }
                if (t.value === 'rec') {
                    const args = parseFuncArgs();
                    if (args.length === 2) {
                        const x = args[0] * Math.cos(this.toRadians(args[1]));
                        const y = args[0] * Math.sin(this.toRadians(args[1]));
                        this.variables.x = x;
                        this.variables.y = y;
                        return x;
                    }
                    throw new Error('Syntax ERROR');
                }

                const arg = parseExpr();
                if (pos < tokens.length && peek() && peek().type === 'paren' && peek().value === ')') {
                    consume();
                } else {
                    throw new Error('Syntax ERROR');
                }

                switch (t.value) {
                    case 'sin': return this.calcSin(arg);
                    case 'cos': return this.calcCos(arg);
                    case 'tan': return this.calcTan(arg);
                    case 'asin': return this.calcAsin(arg);
                    case 'acos': return this.calcAcos(arg);
                    case 'atan': return this.calcAtan(arg);
                    case 'sinh': return Math.sinh(arg);
                    case 'cosh': return Math.cosh(arg);
                    case 'tanh': return Math.tanh(arg);
                    case 'asinh': return Math.asinh(arg);
                    case 'acosh': return Math.acosh(arg);
                    case 'atanh': return Math.atanh(arg);
                    case 'ln': return arg <= 0 ? (() => { throw new Error('Math ERROR'); })() : Math.log(arg);
                    case 'sqrt': return arg < 0 ? (() => { throw new Error('Math ERROR'); })() : Math.sqrt(arg);
                    case 'cbrt': return Math.cbrt(arg);
                    case 'abs': return Math.abs(arg);
                    case 'pow10': return Math.pow(10, arg);
                    case 'exp': return Math.exp(arg);
                    default: return arg;
                }
            }

            // Unary minus at start
            if (t.type === 'op' && t.value === '-') {
                consume();
                return -parsePrimary();
            }

            throw new Error('Syntax ERROR');
        };

        const parseFuncArgs = () => {
            const args = [];
            args.push(parseExpr());
            while (pos < tokens.length && peek().type === 'comma') {
                consume(); // eat comma
                args.push(parseExpr());
            }
            // Require closing paren
            if (pos < tokens.length && peek() && peek().type === 'paren' && peek().value === ')') {
                consume();
            } else {
                throw new Error('Syntax ERROR');
            }
            return args;
        };

        const result = parseExpr();

        // Verify all tokens consumed
        if (pos < tokens.length) {
            throw new Error('Syntax ERROR');
        }

        if (!isFinite(result) && !isNaN(result)) {
            throw new Error('Math ERROR');
        }
        if (isNaN(result)) {
            throw new Error('Math ERROR');
        }

        return result;
    }

    // === Trig functions with angle unit ===
    calcSin(x) {
        const rad = this.toRadians(x);
        // Handle exact values
        const deg = this.angleUnit === 'DEG' ? x : (this.angleUnit === 'RAD' ? x * 180 / Math.PI : x * 180 / 200);
        const normDeg = ((deg % 360) + 360) % 360;
        if (normDeg === 0 || normDeg === 180) return 0;
        if (normDeg === 90) return 1;
        if (normDeg === 270) return -1;
        return Math.sin(rad);
    }

    calcCos(x) {
        const rad = this.toRadians(x);
        const deg = this.angleUnit === 'DEG' ? x : (this.angleUnit === 'RAD' ? x * 180 / Math.PI : x * 180 / 200);
        const normDeg = ((deg % 360) + 360) % 360;
        if (normDeg === 0) return 1;
        if (normDeg === 90 || normDeg === 270) return 0;
        if (normDeg === 180) return -1;
        return Math.cos(rad);
    }

    calcTan(x) {
        const cos = this.calcCos(x);
        if (cos === 0) throw new Error('Math ERROR');
        const sin = this.calcSin(x);
        if (sin === 0) return 0;
        return sin / cos;
    }

    calcAsin(x) {
        if (x < -1 || x > 1) throw new Error('Math ERROR');
        return this.fromRadians(Math.asin(x));
    }

    calcAcos(x) {
        if (x < -1 || x > 1) throw new Error('Math ERROR');
        return this.fromRadians(Math.acos(x));
    }

    calcAtan(x) {
        return this.fromRadians(Math.atan(x));
    }

    // === Factorial ===
    factorial(n) {
        if (n < 0 || !Number.isInteger(n)) throw new Error('Math ERROR');
        if (n > 69) throw new Error('Math ERROR'); // Overflow
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    // === Permutation & Combination ===
    permutation(n, r) {
        if (n < 0 || r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) {
            throw new Error('Math ERROR');
        }
        let result = 1;
        for (let i = n; i > n - r; i--) {
            result *= i;
        }
        return result;
    }

    combination(n, r) {
        if (n < 0 || r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) {
            throw new Error('Math ERROR');
        }
        if (r > n - r) r = n - r;
        let result = 1;
        for (let i = 0; i < r; i++) {
            result = result * (n - i) / (i + 1);
        }
        return Math.round(result);
    }

    // === Main evaluate function ===
    evaluate(expression, options) {
        if (!expression || expression.trim() === '') {
            return { value: 0, display: '0', error: null };
        }
        const silent = options && options.silent;

        try {
            // Pre-process expression
            let expr = this.preprocessExpression(expression);

            // Tokenize and parse
            const tokens = this.tokenize(expr);
            const result = this.parse(tokens);

            if (!silent) {
                // Store in Ans
                this.ans = result;
                this.lastRawResult = result;

                // Add to history
                this.history.push({ expression, result });
                if (this.history.length > 50) this.history.shift();
                this.historyIndex = this.history.length;
            }

            // Format result
            const display = this.formatResult(result);

            return { value: result, display, error: null };
        } catch (e) {
            return { value: null, display: null, error: e.message || 'Syntax ERROR' };
        }
    }

    // === Pre-process expression ===
    preprocessExpression(expr) {
        // Replace display characters with parseable ones
        let result = expr;

        // Handle negative sign (−) vs minus
        result = result.replace(/−/g, '-');

        // Handle implicit multiplication before parentheses
        // e.g., "2(3)" -> "2×(3)", ")(" -> ")×("
        result = result.replace(/(\d)\(/g, '$1×(');
        result = result.replace(/\)\(/g, ')×(');
        result = result.replace(/(\d)(sin|cos|tan|log|ln|√|Abs|Pol|Rec)/g, '$1×$2');
        result = result.replace(/\)(sin|cos|tan|log|ln|√|Abs|Pol|Rec)/g, ')×$1');
        result = result.replace(/(\d)π/g, '$1×π');
        result = result.replace(/(\d)e(?![a-z^])/g, '$1×e');
        result = result.replace(/π(\d)/g, 'π×$1');
        result = result.replace(/πs/g, 'π×s');
        result = result.replace(/π\(/g, 'π×(');

        // Handle closing parens followed by numbers
        result = result.replace(/\)(\d)/g, ')×$1');

        return result;
    }

    // === Format result for display ===
    formatResult(value) {
        if (value === null || value === undefined) return '0';
        if (!isFinite(value)) return 'Math ERROR';
        if (isNaN(value)) return 'Math ERROR';

        let result;
        // Apply number format
        switch (this.numberFormat.type) {
            case 'Fix':
                result = this.formatFixed(value, this.numberFormat.value);
                break;
            case 'Sci':
                result = this.formatSci(value, this.numberFormat.value);
                break;
            case 'Norm':
            default:
                result = this.formatNorm(value, this.numberFormat.value);
                break;
        }

        // Apply engineering symbol display if enabled
        if (this.engineerSymbol && !result.includes('×10^')) {
            result = this.applyEngSymbol(value, result);
        }

        // Apply digit separator if enabled
        if (this.digitSeparator && !result.includes('×10^')) {
            result = this.addDigitSeparator(result);
        }

        return result;
    }

    // Apply engineering symbol suffixes (k, M, G, T, m, μ, n, p, f)
    applyEngSymbol(value, str) {
        if (value === 0) return str;
        const absVal = Math.abs(value);
        const symbols = [
            { suffix: 'T', factor: 1e12 },
            { suffix: 'G', factor: 1e9 },
            { suffix: 'M', factor: 1e6 },
            { suffix: 'k', factor: 1e3 },
            { suffix: '', factor: 1 },
            { suffix: 'm', factor: 1e-3 },
            { suffix: 'μ', factor: 1e-6 },
            { suffix: 'n', factor: 1e-9 },
            { suffix: 'p', factor: 1e-12 },
            { suffix: 'f', factor: 1e-15 },
        ];
        for (const s of symbols) {
            if (absVal >= s.factor || s.factor === 1) {
                if (s.suffix === '') return str; // No symbol needed for 1-999
                const scaled = value / s.factor;
                return parseFloat(scaled.toPrecision(10)).toString() + s.suffix;
            }
        }
        return str;
    }

    formatFixed(value, digits) {
        let result = value.toFixed(digits);
        if (this.digitSeparator) {
            result = this.addDigitSeparator(result);
        }
        return result;
    }

    formatSci(value, digits) {
        if (value === 0) return '0';
        const d = digits === 0 ? 10 : digits;
        return value.toExponential(d - 1).replace('e+', '×10^').replace('e-', '×10^-');
    }

    formatNorm(value, normType) {
        if (value === 0) return '0';

        const absVal = Math.abs(value);

        // Determine if exponential notation is needed
        let useExponential = false;
        if (normType === 1) {
            useExponential = (absVal < 0.01 && absVal !== 0) || absVal >= 1e10;
        } else {
            useExponential = (absVal < 1e-9 && absVal !== 0) || absVal >= 1e10;
        }

        if (useExponential) {
            // Use exponential notation
            let exp = Math.floor(Math.log10(absVal));
            let mantissa = value / Math.pow(10, exp);

            // Round mantissa to 10 significant digits
            mantissa = parseFloat(mantissa.toPrecision(10));

            if (mantissa === 10) {
                mantissa = 1;
                exp++;
            }

            let mantissaStr = this.removeTrailingZeros(mantissa.toString());
            return mantissaStr + '×10^' + exp;
        }

        // Normal display - up to 10 significant digits
        let result;
        if (Number.isInteger(value) && Math.abs(value) < 1e10) {
            result = value.toString();
        } else {
            result = parseFloat(value.toPrecision(10)).toString();
        }

        if (this.digitSeparator) {
            result = this.addDigitSeparator(result);
        }

        return result;
    }

    removeTrailingZeros(str) {
        if (str.includes('.')) {
            return str.replace(/\.?0+$/, '');
        }
        return str;
    }

    addDigitSeparator(str) {
        const parts = str.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    // === Fraction helpers ===
    toFraction(decimal, maxDenom = 10000) {
        if (Number.isInteger(decimal)) return { num: decimal, den: 1, whole: 0 };

        const sign = decimal < 0 ? -1 : 1;
        decimal = Math.abs(decimal);
        const whole = Math.floor(decimal);
        let frac = decimal - whole;

        if (frac < 1e-10) return { num: whole * sign, den: 1, whole: 0 };

        // Stern-Brocot tree / continued fraction approach
        let bestNum = 0, bestDen = 1;
        let minError = frac;

        for (let den = 1; den <= maxDenom; den++) {
            const num = Math.round(frac * den);
            const error = Math.abs(frac - num / den);
            if (error < minError) {
                minError = error;
                bestNum = num;
                bestDen = den;
                if (error < 1e-10) break;
            }
        }

        // Reject if error too large, or if denominator is large with non-negligible error
        // This prevents showing ugly fractions like -1359/9029 for irrational numbers
        if (minError > 1e-9) return null;
        if (bestDen > 100 && minError > 1e-12) return null;

        const totalNum = (whole * bestDen + bestNum) * sign;

        if (this.fractionResult === 'ab/c' && Math.abs(totalNum) > bestDen) {
            const w = Math.floor(Math.abs(totalNum) / bestDen) * sign;
            const n = Math.abs(totalNum) - Math.abs(w) * bestDen;
            return { num: n, den: bestDen, whole: w };
        }

        return { num: totalNum, den: bestDen, whole: 0 };
    }

    // === GCD ===
    gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) {
            [a, b] = [b, a % b];
        }
        return a;
    }

    // === Prime factorization ===
    primeFactorize(n) {
        if (n <= 1 || !Number.isInteger(n) || n > 9999999999) return null;
        const factors = [];
        let d = 2;
        let temp = n;
        while (d * d <= temp) {
            while (temp % d === 0) {
                factors.push(d);
                temp = temp / d;
            }
            d++;
        }
        if (temp > 1) factors.push(temp);
        return factors;
    }

    // === DMS (Degree-Minute-Second) ===
    toDMS(decimal) {
        const sign = decimal < 0 ? -1 : 1;
        decimal = Math.abs(decimal);
        const degrees = Math.floor(decimal);
        const minutesDecimal = (decimal - degrees) * 60;
        const minutes = Math.floor(minutesDecimal);
        const seconds = (minutesDecimal - minutes) * 60;
        return { degrees: degrees * sign, minutes, seconds: Math.round(seconds * 100) / 100 };
    }

    fromDMS(degrees, minutes, seconds) {
        const sign = degrees < 0 ? -1 : 1;
        return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
    }

    // === Random functions ===
    random() {
        return Math.floor(Math.random() * 1000) / 1000;
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // === Numerical integration (Simpson's rule) ===
    integrate(fExpr, a, b, tol = 1e-5) {
        const f = (x) => {
            const saved = this.variables.x;
            this.variables.x = x;
            const result = this.evaluate(fExpr, { silent: true });
            this.variables.x = saved;
            if (result.error) throw new Error(result.error);
            return result.value;
        };

        let n = 100;
        const h = (b - a) / n;
        let sum = f(a) + f(b);
        for (let i = 1; i < n; i++) {
            sum += (i % 2 === 0 ? 2 : 4) * f(a + i * h);
        }
        return sum * h / 3;
    }

    // === Numerical derivative (central difference) ===
    derivative(fExpr, a, tol = 1e-10) {
        const h = 1e-5;
        const f = (x) => {
            const saved = this.variables.x;
            this.variables.x = x;
            const result = this.evaluate(fExpr, { silent: true });
            this.variables.x = saved;
            if (result.error) throw new Error(result.error);
            return result.value;
        };
        return (f(a + h) - f(a - h)) / (2 * h);
    }

    // === Summation ===
    summation(fExpr, a, b) {
        if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error('Math ERROR');
        let sum = 0;
        for (let x = a; x <= b; x++) {
            const saved = this.variables.x;
            this.variables.x = x;
            const result = this.evaluate(fExpr, { silent: true });
            this.variables.x = saved;
            if (result.error) throw new Error(result.error);
            sum += result.value;
        }
        return sum;
    }

    // === Reset ===
    reset() {
        this.ans = 0;
        this.variables = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0, x: 0, y: 0 };
        this.history = [];
        this.historyIndex = -1;
        this.angleUnit = 'DEG';
        this.numberFormat = { type: 'Norm', value: 1 };
        this.fractionResult = 'd/c';
        this.inputOutput = 'MathI/MathO';
        this.mode = 'Calculate';
        this.engineerSymbol = false;
        this.digitSeparator = false;
        this.complexFormat = 'a+bi';
        this.statFrequency = false;
        this.tableUseGx = false;
    }

    clearMemory() {
        this.ans = 0;
        this.variables = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0, x: 0, y: 0 };
    }

    // ========== COMPLEX NUMBER OPERATIONS ==========
    complexAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
    complexSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
    complexMul(a, b) {
        return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
    }
    complexDiv(a, b) {
        const denom = b.re * b.re + b.im * b.im;
        if (denom === 0) throw new Error('Math ERROR');
        return { re: (a.re * b.re + a.im * b.im) / denom, im: (a.im * b.re - a.re * b.im) / denom };
    }
    complexAbs(a) { return Math.sqrt(a.re * a.re + a.im * a.im); }
    complexArg(a) { return this.fromRadians(Math.atan2(a.im, a.re)); }
    complexConjugate(a) { return { re: a.re, im: -a.im }; }
    complexPow(a, n) {
        if (n === 0) return { re: 1, im: 0 };
        let result = { re: 1, im: 0 };
        for (let i = 0; i < Math.abs(n); i++) result = this.complexMul(result, a);
        if (n < 0) return this.complexDiv({ re: 1, im: 0 }, result);
        return result;
    }
    complexSqrt(a) {
        const r = this.complexAbs(a);
        const arg = Math.atan2(a.im, a.re);
        return { re: Math.sqrt(r) * Math.cos(arg / 2), im: Math.sqrt(r) * Math.sin(arg / 2) };
    }
    formatComplex(c) {
        const re = parseFloat(c.re.toPrecision(10));
        const im = parseFloat(c.im.toPrecision(10));
        if (Math.abs(im) < 1e-12) return this.formatResult(re);
        if (Math.abs(re) < 1e-12) {
            if (im === 1) return 'i';
            if (im === -1) return '-i';
            return this.formatResult(im) + 'i';
        }
        const sign = im > 0 ? '+' : '-';
        const absIm = Math.abs(im);
        const imStr = absIm === 1 ? '' : this.formatResult(absIm);
        return this.formatResult(re) + sign + imStr + 'i';
    }
    formatComplexPolar(c) {
        const r = this.complexAbs(c);
        const theta = this.complexArg(c);
        return this.formatResult(parseFloat(r.toPrecision(10))) + '∠' +
               this.formatResult(parseFloat(theta.toPrecision(10)));
    }
    parseComplex(expr) {
        let cleaned = expr.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
        // Simple complex parser: extract real and imaginary parts
        cleaned = cleaned.replace(/\s/g, '');
        // Handle pure imaginary
        if (cleaned === 'i') return { re: 0, im: 1 };
        if (cleaned === '-i') return { re: 0, im: -1 };
        // Try to evaluate as expression with i
        const hasI = cleaned.includes('i');
        if (!hasI) {
            const val = this.evaluate(expr);
            return val.error ? null : { re: val.value, im: 0 };
        }
        // Parse a+bi form
        const match = cleaned.match(/^([^i]*?)([+-]?)(\d*\.?\d*)i$/);
        if (match) {
            const rePart = match[1] ? parseFloat(match[1]) || 0 : 0;
            const sign = match[2] === '-' ? -1 : 1;
            const imPart = match[3] ? parseFloat(match[3]) : 1;
            return { re: rePart, im: sign * imPart };
        }
        return null;
    }

    // ========== BASE-N OPERATIONS ==========
    toBase(value, base) {
        if (!Number.isInteger(value)) value = Math.trunc(value);
        if (base === 10) return value.toString();
        if (value >= 0) return value.toString(base).toUpperCase();
        // Two's complement for negative
        const bits = base === 2 ? 32 : (base === 8 ? 11 : 8);
        const max = Math.pow(2, base === 2 ? 32 : (base === 8 ? 33 : 32));
        return ((value % max) + max).toString(base).toUpperCase();
    }
    fromBase(str, base) {
        str = str.toUpperCase().replace(/\s/g, '');
        const val = parseInt(str, base);
        if (isNaN(val)) throw new Error('Syntax ERROR');
        // Handle two's complement for negative
        if (base === 2 && str.length === 32 && str[0] === '1') return val - 4294967296;
        if (base === 16 && val > 0x7FFFFFFF) return val - 0x100000000;
        if (base === 8 && val > 0o17777777777) return val - 0o40000000000;
        return val;
    }
    formatBinary(val) {
        if (val < 0) val = (val + 4294967296) >>> 0;
        const bin = val.toString(2).padStart(32, '0');
        return bin.replace(/(.{4})/g, '$1 ').trim();
    }
    formatOctal(val) {
        if (val < 0) val = ((val % 0o40000000000) + 0o40000000000);
        return val.toString(8);
    }
    formatHex(val) {
        if (val < 0) val = (val + 0x100000000) >>> 0;
        return val.toString(16).toUpperCase().padStart(8, '0');
    }
    logicAnd(a, b) { return (a & b) | 0; }
    logicOr(a, b) { return (a | b) | 0; }
    logicXor(a, b) { return (a ^ b) | 0; }
    logicXnor(a, b) { return ~(a ^ b) | 0; }
    logicNot(a) { return ~a | 0; }
    logicNeg(a) { return (-a) | 0; }

    // ========== MATRIX OPERATIONS ==========
    matrixCreate(rows, cols) {
        const m = [];
        for (let i = 0; i < rows; i++) {
            m.push(new Array(cols).fill(0));
        }
        return { rows, cols, data: m };
    }
    matrixAdd(a, b) {
        if (a.rows !== b.rows || a.cols !== b.cols) throw new Error('Dimension ERROR');
        const r = this.matrixCreate(a.rows, a.cols);
        for (let i = 0; i < a.rows; i++)
            for (let j = 0; j < a.cols; j++)
                r.data[i][j] = a.data[i][j] + b.data[i][j];
        return r;
    }
    matrixSub(a, b) {
        if (a.rows !== b.rows || a.cols !== b.cols) throw new Error('Dimension ERROR');
        const r = this.matrixCreate(a.rows, a.cols);
        for (let i = 0; i < a.rows; i++)
            for (let j = 0; j < a.cols; j++)
                r.data[i][j] = a.data[i][j] - b.data[i][j];
        return r;
    }
    matrixMul(a, b) {
        if (a.cols !== b.rows) throw new Error('Dimension ERROR');
        const r = this.matrixCreate(a.rows, b.cols);
        for (let i = 0; i < a.rows; i++)
            for (let j = 0; j < b.cols; j++)
                for (let k = 0; k < a.cols; k++)
                    r.data[i][j] += a.data[i][k] * b.data[k][j];
        return r;
    }
    matrixScalarMul(k, m) {
        const r = this.matrixCreate(m.rows, m.cols);
        for (let i = 0; i < m.rows; i++)
            for (let j = 0; j < m.cols; j++)
                r.data[i][j] = k * m.data[i][j];
        return r;
    }
    matrixDet(m) {
        if (m.rows !== m.cols) throw new Error('Dimension ERROR');
        const n = m.rows;
        if (n === 1) return m.data[0][0];
        if (n === 2) return m.data[0][0] * m.data[1][1] - m.data[0][1] * m.data[1][0];
        // LU decomposition for larger matrices
        const a = m.data.map(row => [...row]);
        let det = 1;
        for (let col = 0; col < n; col++) {
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(a[row][col]) > Math.abs(a[maxRow][col])) maxRow = row;
            }
            if (maxRow !== col) { [a[col], a[maxRow]] = [a[maxRow], a[col]]; det *= -1; }
            if (Math.abs(a[col][col]) < 1e-15) return 0;
            det *= a[col][col];
            for (let row = col + 1; row < n; row++) {
                const factor = a[row][col] / a[col][col];
                for (let j = col; j < n; j++) a[row][j] -= factor * a[col][j];
            }
        }
        return det;
    }
    matrixTranspose(m) {
        const r = this.matrixCreate(m.cols, m.rows);
        for (let i = 0; i < m.rows; i++)
            for (let j = 0; j < m.cols; j++)
                r.data[j][i] = m.data[i][j];
        return r;
    }
    matrixInverse(m) {
        if (m.rows !== m.cols) throw new Error('Dimension ERROR');
        const n = m.rows;
        const det = this.matrixDet(m);
        if (Math.abs(det) < 1e-15) throw new Error('Math ERROR');
        // Augmented matrix [A|I]
        const aug = [];
        for (let i = 0; i < n; i++) {
            aug.push([...m.data[i]]);
            for (let j = 0; j < n; j++) aug[i].push(i === j ? 1 : 0);
        }
        // Gaussian elimination
        for (let col = 0; col < n; col++) {
            let maxRow = col;
            for (let row = col + 1; row < n; row++)
                if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
            const pivot = aug[col][col];
            for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
            for (let row = 0; row < n; row++) {
                if (row === col) continue;
                const factor = aug[row][col];
                for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
            }
        }
        const r = this.matrixCreate(n, n);
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                r.data[i][j] = aug[i][n + j];
        return r;
    }
    matrixIdentity(n) {
        const r = this.matrixCreate(n, n);
        for (let i = 0; i < n; i++) r.data[i][i] = 1;
        return r;
    }
    matrixAbs(m) {
        const r = this.matrixCreate(m.rows, m.cols);
        for (let i = 0; i < m.rows; i++)
            for (let j = 0; j < m.cols; j++)
                r.data[i][j] = Math.abs(m.data[i][j]);
        return r;
    }
    matrixSquare(m) { return this.matrixMul(m, m); }
    matrixCube(m) { return this.matrixMul(this.matrixMul(m, m), m); }
    matrixFormat(m) {
        return m.data.map(row => row.map(v => this.formatResult(v)));
    }

    // ========== VECTOR OPERATIONS ==========
    vectorAdd(a, b) {
        if (a.length !== b.length) throw new Error('Dimension ERROR');
        return a.map((v, i) => v + b[i]);
    }
    vectorSub(a, b) {
        if (a.length !== b.length) throw new Error('Dimension ERROR');
        return a.map((v, i) => v - b[i]);
    }
    vectorScalarMul(k, v) { return v.map(x => k * x); }
    vectorDot(a, b) {
        if (a.length !== b.length) throw new Error('Dimension ERROR');
        return a.reduce((sum, v, i) => sum + v * b[i], 0);
    }
    vectorCross(a, b) {
        if (a.length !== 3 || b.length !== 3) throw new Error('Dimension ERROR');
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }
    vectorMagnitude(v) { return Math.sqrt(v.reduce((s, x) => s + x * x, 0)); }
    vectorAngle(a, b) {
        const dot = this.vectorDot(a, b);
        const magA = this.vectorMagnitude(a);
        const magB = this.vectorMagnitude(b);
        if (magA === 0 || magB === 0) throw new Error('Math ERROR');
        return this.fromRadians(Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB)))));
    }
    vectorUnit(v) {
        const mag = this.vectorMagnitude(v);
        if (mag === 0) throw new Error('Math ERROR');
        return v.map(x => x / mag);
    }

    // ========== STATISTICS ==========
    statCalc(data, freqs) {
        const n = freqs ? freqs.reduce((s, f) => s + f, 0) : data.length;
        let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
        const expandedData = [];
        for (let i = 0; i < data.length; i++) {
            const f = freqs ? freqs[i] : 1;
            const x = data[i];
            sumX += x * f;
            sumX2 += x * x * f;
            sumX3 += x * x * x * f;
            sumX4 += x * x * x * x * f;
            for (let j = 0; j < f; j++) expandedData.push(x);
        }
        expandedData.sort((a, b) => a - b);
        const mean = sumX / n;
        const popVar = sumX2 / n - mean * mean;
        const sampVar = n > 1 ? (sumX2 - sumX * sumX / n) / (n - 1) : 0;
        const getPercentile = (p) => {
            const idx = (expandedData.length - 1) * p;
            const lo = Math.floor(idx);
            const hi = Math.ceil(idx);
            return expandedData[lo] + (expandedData[hi] - expandedData[lo]) * (idx - lo);
        };
        return {
            n, sumX, sumX2, sumX3, sumX4, mean,
            popVariance: popVar, popStdDev: Math.sqrt(Math.abs(popVar)),
            sampVariance: sampVar, sampStdDev: Math.sqrt(Math.abs(sampVar)),
            min: expandedData[0], max: expandedData[expandedData.length - 1],
            median: getPercentile(0.5), q1: getPercentile(0.25), q3: getPercentile(0.75)
        };
    }
    statCalcPaired(xData, yData, freqs) {
        const n = freqs ? freqs.reduce((s, f) => s + f, 0) : xData.length;
        let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
        let sumX3 = 0, sumX4 = 0, sumX2Y = 0;
        for (let i = 0; i < xData.length; i++) {
            const f = freqs ? freqs[i] : 1;
            const x = xData[i], y = yData[i];
            sumX += x * f; sumY += y * f;
            sumX2 += x * x * f; sumY2 += y * y * f;
            sumXY += x * y * f;
            sumX3 += x * x * x * f; sumX4 += x * x * x * x * f;
            sumX2Y += x * x * y * f;
        }
        const meanX = sumX / n, meanY = sumY / n;
        return {
            n, sumX, sumY, sumX2, sumY2, sumXY, sumX3, sumX4, sumX2Y,
            meanX, meanY,
            popVarX: sumX2 / n - meanX * meanX,
            popVarY: sumY2 / n - meanY * meanY,
            popStdDevX: Math.sqrt(Math.abs(sumX2 / n - meanX * meanX)),
            popStdDevY: Math.sqrt(Math.abs(sumY2 / n - meanY * meanY)),
            sampVarX: n > 1 ? (sumX2 - sumX * sumX / n) / (n - 1) : 0,
            sampVarY: n > 1 ? (sumY2 - sumY * sumY / n) / (n - 1) : 0,
            sampStdDevX: Math.sqrt(Math.abs(n > 1 ? (sumX2 - sumX * sumX / n) / (n - 1) : 0)),
            sampStdDevY: Math.sqrt(Math.abs(n > 1 ? (sumY2 - sumY * sumY / n) / (n - 1) : 0)),
            minX: Math.min(...xData), maxX: Math.max(...xData),
            minY: Math.min(...yData), maxY: Math.max(...yData)
        };
    }
    linearRegression(xData, yData, freqs) {
        const s = this.statCalcPaired(xData, yData, freqs);
        const sxx = s.sumX2 - s.sumX * s.sumX / s.n;
        const sxy = s.sumXY - s.sumX * s.sumY / s.n;
        const syy = s.sumY2 - s.sumY * s.sumY / s.n;
        if (Math.abs(sxx) < 1e-15) throw new Error('Math ERROR');
        const b = sxy / sxx;
        const a = s.meanY - b * s.meanX;
        const r = Math.abs(syy) < 1e-15 ? 0 : sxy / Math.sqrt(sxx * syy);
        return { a, b, r };
    }
    quadraticRegression(xData, yData, freqs) {
        const s = this.statCalcPaired(xData, yData, freqs);
        const n = s.n;
        // Solve system: [n, Σx, Σx²; Σx, Σx², Σx³; Σx², Σx³, Σx⁴] × [a; b; c] = [Σy; Σxy; Σx²y]
        const coeffs = this.solveSimultaneous([
            [n, s.sumX, s.sumX2, s.sumY],
            [s.sumX, s.sumX2, s.sumX3, s.sumXY],
            [s.sumX2, s.sumX3, s.sumX4, s.sumX2Y]
        ], 3);
        return { a: coeffs[0], b: coeffs[1], c: coeffs[2] };
    }
    logarithmicRegression(xData, yData, freqs) {
        if (xData.some(x => x <= 0)) throw new Error('Math ERROR');
        const lnX = xData.map(x => Math.log(x));
        return this.linearRegression(lnX, yData, freqs);
    }
    eExponentialRegression(xData, yData, freqs) {
        if (yData.some(y => y <= 0)) throw new Error('Math ERROR');
        const lnY = yData.map(y => Math.log(y));
        const reg = this.linearRegression(xData, lnY, freqs);
        return { a: Math.exp(reg.a), b: reg.b, r: reg.r };
    }
    abExponentialRegression(xData, yData, freqs) {
        if (yData.some(y => y <= 0)) throw new Error('Math ERROR');
        const lnY = yData.map(y => Math.log(y));
        const reg = this.linearRegression(xData, lnY, freqs);
        return { a: Math.exp(reg.a), b: Math.exp(reg.b), r: reg.r };
    }
    powerRegression(xData, yData, freqs) {
        if (xData.some(x => x <= 0) || yData.some(y => y <= 0)) throw new Error('Math ERROR');
        const lnX = xData.map(x => Math.log(x));
        const lnY = yData.map(y => Math.log(y));
        const reg = this.linearRegression(lnX, lnY, freqs);
        return { a: Math.exp(reg.a), b: reg.b, r: reg.r };
    }
    inverseRegression(xData, yData, freqs) {
        const invX = xData.map(x => 1 / x);
        return this.linearRegression(invX, yData, freqs);
    }

    // ========== DISTRIBUTION CALCULATIONS ==========
    // Standard normal PDF
    stdNormPDF(x) { return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI); }
    // Standard normal CDF (Abramowitz & Stegun approximation)
    stdNormCDF(x) {
        if (x < -8) return 0;
        if (x > 8) return 1;
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989422804014327;
        const p = d * Math.exp(-x * x / 2) * t *
            (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return x > 0 ? 1 - p : p;
    }
    normalPDF(x, sigma, mu) {
        if (sigma <= 0) throw new Error('Math ERROR');
        const z = (x - mu) / sigma;
        return this.stdNormPDF(z) / sigma;
    }
    normalCDF(lower, upper, sigma, mu) {
        if (sigma <= 0) throw new Error('Math ERROR');
        return this.stdNormCDF((upper - mu) / sigma) - this.stdNormCDF((lower - mu) / sigma);
    }
    inverseNormal(area, sigma, mu) {
        if (sigma <= 0 || area <= 0 || area >= 1) throw new Error('Math ERROR');
        // Newton-Raphson on stdNormCDF
        let x = 0;
        for (let i = 0; i < 100; i++) {
            const cdf = this.stdNormCDF(x);
            const pdf = this.stdNormPDF(x);
            if (Math.abs(pdf) < 1e-15) break;
            x -= (cdf - area) / pdf;
            if (Math.abs(cdf - area) < 1e-12) break;
        }
        return x * sigma + mu;
    }
    binomialCoeff(n, k) {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        if (k > n - k) k = n - k;
        let r = 1;
        for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
        return Math.round(r);
    }
    binomialPDF(x, n, p) {
        if (!Number.isInteger(n) || n < 0 || p < 0 || p > 1) throw new Error('Math ERROR');
        if (x < 0 || x > n || !Number.isInteger(x)) return 0;
        return this.binomialCoeff(n, x) * Math.pow(p, x) * Math.pow(1 - p, n - x);
    }
    binomialCDF(x, n, p) {
        let sum = 0;
        for (let k = 0; k <= Math.floor(x); k++) sum += this.binomialPDF(k, n, p);
        return sum;
    }
    poissonPDF(x, lambda) {
        if (lambda <= 0) throw new Error('Math ERROR');
        if (x < 0 || !Number.isInteger(x)) return 0;
        return Math.exp(-lambda + x * Math.log(lambda) - this.lnFactorial(x));
    }
    poissonCDF(x, lambda) {
        let sum = 0;
        for (let k = 0; k <= Math.floor(x); k++) sum += this.poissonPDF(k, lambda);
        return sum;
    }
    lnFactorial(n) {
        if (n <= 1) return 0;
        let sum = 0;
        for (let i = 2; i <= n; i++) sum += Math.log(i);
        return sum;
    }
    // ▶t standardization
    standardize(x, mean, stdDev) {
        if (stdDev === 0) throw new Error('Math ERROR');
        return (x - mean) / stdDev;
    }

    // ========== EQUATION SOLVING ==========
    solveSimultaneous(augmented, numVars) {
        // Gaussian elimination with partial pivoting
        const n = numVars;
        const a = augmented.map(row => [...row]);
        for (let col = 0; col < n; col++) {
            let maxRow = col;
            for (let row = col + 1; row < n; row++)
                if (Math.abs(a[row][col]) > Math.abs(a[maxRow][col])) maxRow = row;
            [a[col], a[maxRow]] = [a[maxRow], a[col]];
            if (Math.abs(a[col][col]) < 1e-15) throw new Error('Math ERROR');
            for (let row = col + 1; row < n; row++) {
                const factor = a[row][col] / a[col][col];
                for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
            }
        }
        // Back substitution
        const solution = new Array(n);
        for (let i = n - 1; i >= 0; i--) {
            solution[i] = a[i][n];
            for (let j = i + 1; j < n; j++) solution[i] -= a[i][j] * solution[j];
            solution[i] /= a[i][i];
        }
        return solution;
    }
    solveQuadratic(a, b, c) {
        if (a === 0) {
            if (b === 0) throw new Error('Math ERROR');
            return [{ re: -c / b, im: 0 }];
        }
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
            const sqrtD = Math.sqrt(disc);
            return [
                { re: (-b + sqrtD) / (2 * a), im: 0 },
                { re: (-b - sqrtD) / (2 * a), im: 0 }
            ];
        }
        const sqrtD = Math.sqrt(-disc);
        return [
            { re: -b / (2 * a), im: sqrtD / (2 * a) },
            { re: -b / (2 * a), im: -sqrtD / (2 * a) }
        ];
    }
    solveCubic(a, b, c, d) {
        if (a === 0) return this.solveQuadratic(b, c, d);
        // Normalize
        const p = (3 * a * c - b * b) / (3 * a * a);
        const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
        const disc = q * q / 4 + p * p * p / 27;
        const roots = [];
        if (Math.abs(disc) < 1e-12) {
            if (Math.abs(q) < 1e-12) {
                roots.push({ re: -b / (3 * a), im: 0 });
            } else {
                const u = Math.cbrt(-q / 2);
                roots.push({ re: 2 * u - b / (3 * a), im: 0 });
                roots.push({ re: -u - b / (3 * a), im: 0 });
            }
        } else if (disc > 0) {
            const sqrtDisc = Math.sqrt(disc);
            const u = Math.cbrt(-q / 2 + sqrtDisc);
            const v = Math.cbrt(-q / 2 - sqrtDisc);
            roots.push({ re: u + v - b / (3 * a), im: 0 });
            const rePart = -(u + v) / 2 - b / (3 * a);
            const imPart = Math.sqrt(3) * (u - v) / 2;
            roots.push({ re: rePart, im: imPart });
            roots.push({ re: rePart, im: -imPart });
        } else {
            const r = Math.sqrt(-p * p * p / 27);
            const theta = Math.acos(-q / (2 * r));
            const cbrtR = Math.cbrt(r);
            for (let k = 0; k < 3; k++) {
                roots.push({ re: 2 * cbrtR * Math.cos((theta + 2 * Math.PI * k) / 3) - b / (3 * a), im: 0 });
            }
        }
        return roots;
    }
    solveQuartic(a, b, c, d, e) {
        if (a === 0) return this.solveCubic(b, c, d, e);
        const offset = -b / (4 * a);
        const p = (8 * a * c - 3 * b * b) / (8 * a * a);
        const q = (b * b * b - 4 * a * b * c + 8 * a * a * d) / (8 * a * a * a);
        const r = (-3 * b * b * b * b + 256 * a * a * a * e - 64 * a * a * b * e + 16 * a * b * b * c) /
                  (256 * a * a * a * a);
        // Biquadratic special case: q ≈ 0 → t⁴ + pt² + r = 0
        if (Math.abs(q) < 1e-12) {
            const disc = p * p - 4 * r;
            const roots = [];
            if (disc >= -1e-12) {
                const sqrtDisc = Math.sqrt(Math.max(0, disc));
                const u1 = (-p + sqrtDisc) / 2;
                const u2 = (-p - sqrtDisc) / 2;
                for (const u of [u1, u2]) {
                    if (u >= -1e-12) {
                        const su = Math.sqrt(Math.max(0, u));
                        roots.push({ re: offset + su, im: 0 });
                        roots.push({ re: offset - su, im: 0 });
                    } else {
                        roots.push({ re: offset, im: Math.sqrt(-u) });
                        roots.push({ re: offset, im: -Math.sqrt(-u) });
                    }
                }
            }
            return roots;
        }
        // General case: Ferrari's method
        const cubicRoots = this.solveCubic(1, p / 2, (p * p - 4 * r) / 16, -q * q / 64);
        let y = cubicRoots[0].re;
        for (const root of cubicRoots) {
            if (root.im === 0 && root.re > y) y = root.re;
        }
        const sqrtTerm = Math.sqrt(Math.max(0, 2 * y - p));
        const roots = [];
        if (sqrtTerm > 1e-12) {
            const d1 = -(2 * y - p) - 2 * q / sqrtTerm;
            const d2 = -(2 * y - p) + 2 * q / sqrtTerm;
            if (d1 >= -1e-12) {
                const sd1 = Math.sqrt(Math.max(0, d1));
                roots.push({ re: offset + (sqrtTerm + sd1) / 2, im: 0 });
                roots.push({ re: offset + (sqrtTerm - sd1) / 2, im: 0 });
            } else {
                roots.push({ re: offset + sqrtTerm / 2, im: Math.sqrt(-d1) / 2 });
                roots.push({ re: offset + sqrtTerm / 2, im: -Math.sqrt(-d1) / 2 });
            }
            if (d2 >= -1e-12) {
                const sd2 = Math.sqrt(Math.max(0, d2));
                roots.push({ re: offset + (-sqrtTerm + sd2) / 2, im: 0 });
                roots.push({ re: offset + (-sqrtTerm - sd2) / 2, im: 0 });
            } else {
                roots.push({ re: offset - sqrtTerm / 2, im: Math.sqrt(-d2) / 2 });
                roots.push({ re: offset - sqrtTerm / 2, im: -Math.sqrt(-d2) / 2 });
            }
        } else {
            const disc2 = y * y - r;
            if (disc2 >= 0) {
                const s = Math.sqrt(disc2);
                const r1 = this.solveQuadratic(1, 0, y + s);
                const r2 = this.solveQuadratic(1, 0, y - s);
                r1.forEach(root => roots.push({ re: root.re + offset, im: root.im }));
                r2.forEach(root => roots.push({ re: root.re + offset, im: root.im }));
            }
        }
        return roots;
    }
    // Durand-Kerner method for finding all polynomial roots numerically
    solvePolynomialNumerical(coeffs) {
        const n = coeffs.length - 1;
        if (n <= 0) return [];
        // Normalize
        const a = coeffs.map(c => c / coeffs[0]);
        // Initial guesses: spread on unit circle
        const roots = [];
        for (let i = 0; i < n; i++) {
            const angle = (2 * Math.PI * i) / n + 0.4;
            const r = 1 + Math.abs(a[n]);
            roots.push({ re: r * Math.cos(angle), im: r * Math.sin(angle) });
        }
        // Iterate
        for (let iter = 0; iter < 100; iter++) {
            let maxChange = 0;
            for (let i = 0; i < n; i++) {
                // Evaluate polynomial at roots[i]
                let pRe = 1, pIm = 0;
                let zRe = roots[i].re, zIm = roots[i].im;
                // p(z) = z^n + a[1]*z^(n-1) + ... + a[n]
                let valRe = 0, valIm = 0;
                let powRe = 1, powIm = 0;
                for (let j = n; j >= 0; j--) {
                    valRe += a[j] * powRe;
                    valIm += a[j] * powIm;
                    if (j > 0) {
                        const newPowRe = powRe * zRe - powIm * zIm;
                        const newPowIm = powRe * zIm + powIm * zRe;
                        powRe = newPowRe; powIm = newPowIm;
                    }
                }
                // Product of (z_i - z_j) for j != i
                let prodRe = 1, prodIm = 0;
                for (let j = 0; j < n; j++) {
                    if (i === j) continue;
                    const dRe = roots[i].re - roots[j].re;
                    const dIm = roots[i].im - roots[j].im;
                    const newProdRe = prodRe * dRe - prodIm * dIm;
                    const newProdIm = prodRe * dIm + prodIm * dRe;
                    prodRe = newProdRe; prodIm = newProdIm;
                }
                // delta = p(z_i) / prod
                const denom = prodRe * prodRe + prodIm * prodIm;
                if (denom < 1e-30) continue;
                const deltaRe = (valRe * prodRe + valIm * prodIm) / denom;
                const deltaIm = (valIm * prodRe - valRe * prodIm) / denom;
                roots[i].re -= deltaRe;
                roots[i].im -= deltaIm;
                maxChange = Math.max(maxChange, Math.abs(deltaRe) + Math.abs(deltaIm));
            }
            if (maxChange < 1e-14) break;
        }
        // Clean up: roots with very small imaginary part are real
        return roots.map(r => ({
            re: Math.abs(r.im) < 1e-8 ? r.re : r.re,
            im: Math.abs(r.im) < 1e-8 ? 0 : r.im
        }));
    }
    // Polish quartic/cubic roots using Newton's method
    polishPolynomialRoots(coeffs, roots) {
        const n = coeffs.length - 1;
        const evalPoly = (x) => {
            let v = 0;
            for (let i = 0; i <= n; i++) v += coeffs[i] * Math.pow(x, n - i);
            return v;
        };
        const evalDeriv = (x) => {
            let v = 0;
            for (let i = 0; i < n; i++) v += coeffs[i] * (n - i) * Math.pow(x, n - i - 1);
            return v;
        };
        return roots.map(root => {
            if (Math.abs(root.im) > 1e-8) return root;
            let x = root.re;
            for (let iter = 0; iter < 20; iter++) {
                const fx = evalPoly(x);
                const dfx = evalDeriv(x);
                if (Math.abs(dfx) < 1e-15) break;
                const dx = fx / dfx;
                x -= dx;
                if (Math.abs(dx) < 1e-14) break;
            }
            return { re: x, im: 0 };
        });
    }
    // Quadratic local min/max
    quadraticMinMax(a, b, c) {
        if (a === 0) return null;
        const xVertex = -b / (2 * a);
        const yVertex = a * xVertex * xVertex + b * xVertex + c;
        return { x: xVertex, y: yVertex, isMin: a > 0 };
    }

    // ========== INEQUALITY SOLVING ==========
    solveQuadraticInequality(a, b, c, type) {
        // type: '>0', '<0', '>=0', '<=0'
        const roots = this.solveQuadratic(a, b, c);
        const realRoots = roots.filter(r => Math.abs(r.im) < 1e-12).map(r => r.re).sort((a, b) => a - b);
        if (realRoots.length === 0) {
            // No real roots: quadratic is always positive or always negative
            const testVal = a; // sign of a determines sign of quadratic at infinity
            if (type === '>0' || type === '>=0') return testVal > 0 ? 'AllReal' : 'NoSolution';
            return testVal < 0 ? 'AllReal' : 'NoSolution';
        }
        if (realRoots.length === 1) {
            const x0 = realRoots[0];
            if (type === '>=0' || type === '<=0') return 'AllReal';
            if (type === '>0') return a > 0 ? `x≠${this.formatResult(x0)}` : 'NoSolution';
            return a < 0 ? `x≠${this.formatResult(x0)}` : 'NoSolution';
        }
        const x1 = realRoots[0], x2 = realRoots[1];
        const strict = type === '>0' || type === '<0';
        const lt = strict ? '<' : '≤';
        const gt = strict ? '>' : '≥';
        if (type === '>0' || type === '>=0') {
            if (a > 0) return { ranges: [[null, x1, lt], [x2, null, gt]], roots: realRoots };
            return { ranges: [[x1, x2]], roots: realRoots };
        }
        if (a < 0) return { ranges: [[null, x1, lt], [x2, null, gt]], roots: realRoots };
        return { ranges: [[x1, x2]], roots: realRoots };
    }

    // ========== RATIO SOLVING ==========
    solveRatio(values, type) {
        // type 1: A:B = X:D → X = A*D/B
        // type 2: A:B = C:X → X = B*C/A
        if (type === 1) {
            if (values.B === 0) throw new Error('Math ERROR');
            return values.A * values.D / values.B;
        }
        if (values.A === 0) throw new Error('Math ERROR');
        return values.B * values.C / values.A;
    }

    // ========== TABLE GENERATION ==========
    generateTable(fExpr, gExpr, start, end, step) {
        if (step === 0 || (end - start) / step < 0) throw new Error('Math ERROR');
        const rows = [];
        const maxRows = gExpr ? 30 : 45;
        // Check if range would exceed max rows
        const expectedRows = Math.floor((end - start) / step) + 1;
        if (expectedRows > maxRows) throw new Error('Range ERROR');
        let count = 0;
        for (let x = start; x <= end + 1e-12 && count < maxRows; x += step, count++) {
            const savedX = this.variables.x;
            this.variables.x = parseFloat(x.toPrecision(10));
            const fResult = this.evaluate(fExpr, { silent: true });
            let gResult = null;
            if (gExpr) gResult = this.evaluate(gExpr, { silent: true });
            this.variables.x = savedX;
            rows.push({
                x: parseFloat(x.toPrecision(10)),
                fx: fResult.error ? 'ERROR' : fResult.value,
                gx: gResult ? (gResult.error ? 'ERROR' : gResult.value) : null
            });
        }
        return rows;
    }
}
