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
        this.inputA = '';
        this.inputB = '';
        this.phase = 'input'; // 'input' or 'result'
        this.displayFormat = 'rect'; // 'rect' or 'polar'
    }
    enter() {
        this.app.clearAll();
        this.phase = 'input';
    }
    handleKey(key) {
        if (key === 'equals') {
            this.calculate();
            return true;
        }
        // i input via ENG button (SHIFT+ENG on real calculator)
        if (key === 'eng') {
            this.app.inputChar('𝒊');
            return true;
        }
        return false;
    }
    handleShiftKey(key) {
        // SHIFT+ENG = imaginary unit i
        if (key === 'eng') {
            this.app.inputChar('𝒊');
            return true;
        }
        // SHIFT+2 = Conjugate
        if (key === '2') {
            this.app.inputFunc('Conjg(');
            return true;
        }
        return false;
    }
    calculate() {
        const expr = this.app.input;
        try {
            const result = this.evaluateComplex(expr);
            if (!result) { this.app.error = 'Syntax ERROR'; return; }
            this.app.displayInputEl.textContent = expr;
            if (this.displayFormat === 'polar') {
                this.app.displayResultEl.textContent = this.engine.formatComplexPolar(result);
            } else {
                this.app.displayResultEl.textContent = this.engine.formatComplex(result);
            }
            this.engine.ans = result.re;
            this.engine.variables.x = result.re;
            this.engine.variables.y = result.im;
            this.app.showingResult = true;
            this.app.justEvaluated = true;
        } catch (e) {
            this.app.error = e.message || 'Math ERROR';
            this.app.displayResultEl.textContent = this.app.error;
            this.app.displayResultEl.classList.add('error');
        }
    }
    evaluateComplex(expr) {
        // Replace display chars
        let clean = expr.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/𝒊/g, 'i');
        // Split by operators while handling complex numbers
        // Simple approach: evaluate the real expression, treating i as sqrt(-1)
        // For now, use a simplified parser
        const c = this.engine.parseComplex(clean);
        if (c) return c;
        // Try evaluating as regular expression
        const result = this.engine.evaluate(expr.replace(/𝒊/g, ''));
        if (!result.error) return { re: result.value, im: 0 };
        return null;
    }
    getOptnMenu() {
        return [
            { id: 1, name: 'r∠θ' },
            { id: 2, name: 'a+bi' },
            { id: 3, name: 'Conjugate' },
            { id: 4, name: 'Argument' },
            { id: 5, name: 'Real Part' },
            { id: 6, name: 'Imaginary Part' }
        ];
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
        this.phase = 'calc'; // 'calc', 'define-select', 'define-rows', 'define-cols', 'editor', 'result'
        this.editingMatrix = null;
        this.editRow = 0;
        this.editCol = 0;
        this.editBuffer = '';
        this.input = '';
    }
    enter() {
        this.app.clearAll();
        this.phase = 'calc';
    }
    handleKey(key) {
        if (this.phase === 'define-select') return this.handleDefineSelect(key);
        if (this.phase === 'define-rows') return this.handleDefineRows(key);
        if (this.phase === 'define-cols') return this.handleDefineCols(key);
        if (this.phase === 'editor') return this.handleEditor(key);
        if (this.phase === 'result') return this.handleResult(key);
        return false;
    }
    handleDefineSelect(key) {
        const map = { 'negate': 'A', 'dms': 'B', 'reciprocal': 'C', 'sin': 'D' };
        if (map[key]) {
            this.editingMatrix = map[key];
            this.phase = 'define-rows';
            this.app.displayInputEl.textContent = `Mat${this.editingMatrix} Rows?`;
            this.app.displayResultEl.textContent = '(1-4)';
            return true;
        }
        if (key === 'ac') { this.phase = 'calc'; this.app.closeMenu(); return true; }
        return true;
    }
    handleDefineRows(key) {
        if (/^[1-4]$/.test(key)) {
            this.pendingRows = parseInt(key);
            this.phase = 'define-cols';
            this.app.displayInputEl.textContent = `Mat${this.editingMatrix} ${this.pendingRows}×? Cols?`;
            this.app.displayResultEl.textContent = '(1-4)';
            return true;
        }
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        return true;
    }
    handleDefineCols(key) {
        if (/^[1-4]$/.test(key)) {
            const cols = parseInt(key);
            this.matrices[this.editingMatrix] = this.engine.matrixCreate(this.pendingRows, cols);
            this.editRow = 0;
            this.editCol = 0;
            this.editBuffer = '';
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
        if (/^[0-9]$/.test(key) || key === 'dot' || key === 'negate') {
            if (key === 'dot') this.editBuffer += '.';
            else if (key === 'negate') {
                if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
                else this.editBuffer = '-' + this.editBuffer;
            }
            else this.editBuffer += key;
            this.renderEditor();
            return true;
        }
        if (key === 'equals') {
            const val = this.editBuffer === '' ? 0 : parseFloat(this.editBuffer);
            if (isNaN(val)) { this.editBuffer = ''; this.renderEditor(); return true; }
            m.data[this.editRow][this.editCol] = val;
            this.editBuffer = '';
            // Move to next cell
            this.editCol++;
            if (this.editCol >= m.cols) { this.editCol = 0; this.editRow++; }
            if (this.editRow >= m.rows) { this.editRow = m.rows - 1; this.editCol = m.cols - 1; }
            this.renderEditor();
            return true;
        }
        if (key === 'up') { if (this.editRow > 0) { this.editRow--; this.editBuffer = ''; } this.renderEditor(); return true; }
        if (key === 'down') { if (this.editRow < m.rows - 1) { this.editRow++; this.editBuffer = ''; } this.renderEditor(); return true; }
        if (key === 'left') { if (this.editCol > 0) { this.editCol--; this.editBuffer = ''; } this.renderEditor(); return true; }
        if (key === 'right') { if (this.editCol < m.cols - 1) { this.editCol++; this.editBuffer = ''; } this.renderEditor(); return true; }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderEditor(); return true; }
        if (key === 'ac') {
            this.phase = 'calc';
            this.app.clearAll();
            return true;
        }
        return true;
    }
    handleResult(key) {
        if (key === 'ac') {
            this.phase = 'calc';
            this.app.clearAll();
            return true;
        }
        return false;
    }
    renderEditor() {
        const m = this.matrices[this.editingMatrix];
        if (!m) return;
        this.app.displayInputEl.textContent = `Mat${this.editingMatrix}=`;
        let html = '<div style="font-size:9px;line-height:1.2;font-family:monospace;">';
        html += '<table style="border-collapse:collapse;width:100%;">';
        for (let i = 0; i < m.rows; i++) {
            html += '<tr>';
            for (let j = 0; j < m.cols; j++) {
                const isCurrent = i === this.editRow && j === this.editCol;
                const val = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                    this.engine.formatResult(m.data[i][j]);
                const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
                html += `<td style="padding:0 2px;text-align:right;${bg}">${val}</td>`;
            }
            html += '</tr>';
        }
        html += '</table></div>';
        this.app.displayResultEl.innerHTML = html;
    }
    showMatAns() {
        if (!this.matAns) return;
        this.app.displayInputEl.textContent = 'MatAns=';
        const formatted = this.engine.matrixFormat(this.matAns);
        let html = '<div style="font-size:9px;line-height:1.2;font-family:monospace;">';
        html += '<table style="border-collapse:collapse;width:100%;">';
        for (const row of formatted) {
            html += '<tr>';
            for (const val of row) {
                html += `<td style="padding:0 2px;text-align:right;">${val}</td>`;
            }
            html += '</tr>';
        }
        html += '</table></div>';
        this.app.displayResultEl.innerHTML = html;
        this.phase = 'result';
    }
    getOptnMenu() {
        return [
            { id: 1, name: 'Define Matrix' },
            { id: 2, name: 'Edit Matrix' },
            { id: 3, name: 'MatAns' },
            { id: 4, name: 'Determinant' },
            { id: 5, name: 'Transpose' },
            { id: 6, name: 'Identity' },
            { id: 7, name: 'Abs' }
        ];
    }
    handleOptn(index) {
        switch (index) {
            case 0: // Define Matrix
                this.phase = 'define-select';
                this.app.displayInputEl.textContent = 'Define Matrix';
                this.app.displayResultEl.textContent = '(-):A  ...:B  x²:C  sin:D';
                break;
            case 1: // Edit Matrix
                this.phase = 'define-select';
                this.app.displayInputEl.textContent = 'Edit Matrix';
                this.app.displayResultEl.textContent = '(-):A  ...:B  x²:C  sin:D';
                break;
            case 2: // MatAns
                this.app.inputChar('MatAns');
                break;
            case 3: // Determinant
                this.app.inputFunc('Det(');
                break;
            case 4: // Transpose
                this.app.inputFunc('Trn(');
                break;
            case 5: // Identity
                this.app.inputFunc('Identity(');
                break;
            case 6: // Abs
                this.app.inputFunc('Abs(');
                break;
        }
    }
}

// ========== VECTOR MODE (Mode 5) ==========
class VectorMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.vectors = { A: null, B: null, C: null, D: null };
        this.vctAns = null;
        this.phase = 'calc';
        this.editingVector = null;
        this.editIndex = 0;
        this.editBuffer = '';
    }
    enter() {
        this.app.clearAll();
        this.phase = 'calc';
    }
    handleKey(key) {
        if (this.phase === 'define-select') return this.handleDefineSelect(key);
        if (this.phase === 'define-dim') return this.handleDefineDim(key);
        if (this.phase === 'editor') return this.handleEditor(key);
        if (this.phase === 'result') {
            if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
            return false;
        }
        return false;
    }
    handleDefineSelect(key) {
        const map = { 'negate': 'A', 'dms': 'B', 'reciprocal': 'C', 'sin': 'D' };
        if (map[key]) {
            this.editingVector = map[key];
            this.phase = 'define-dim';
            this.app.displayInputEl.textContent = `Vct${this.editingVector} Dimension?`;
            this.app.displayResultEl.textContent = '2 or 3';
            return true;
        }
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        return true;
    }
    handleDefineDim(key) {
        if (key === '2' || key === '3') {
            const dim = parseInt(key);
            this.vectors[this.editingVector] = new Array(dim).fill(0);
            this.editIndex = 0;
            this.editBuffer = '';
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
        if (/^[0-9]$/.test(key) || key === 'dot' || key === 'negate') {
            if (key === 'dot') this.editBuffer += '.';
            else if (key === 'negate') {
                if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
                else this.editBuffer = '-' + this.editBuffer;
            }
            else this.editBuffer += key;
            this.renderEditor();
            return true;
        }
        if (key === 'equals') {
            const val = this.editBuffer === '' ? 0 : parseFloat(this.editBuffer);
            if (!isNaN(val)) v[this.editIndex] = val;
            this.editBuffer = '';
            if (this.editIndex < v.length - 1) this.editIndex++;
            this.renderEditor();
            return true;
        }
        if (key === 'up') { if (this.editIndex > 0) { this.editIndex--; this.editBuffer = ''; } this.renderEditor(); return true; }
        if (key === 'down') { if (this.editIndex < v.length - 1) { this.editIndex++; this.editBuffer = ''; } this.renderEditor(); return true; }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderEditor(); return true; }
        if (key === 'ac') { this.phase = 'calc'; this.app.clearAll(); return true; }
        return true;
    }
    renderEditor() {
        const v = this.vectors[this.editingVector];
        if (!v) return;
        this.app.displayInputEl.textContent = `Vct${this.editingVector}=`;
        let html = '<div style="font-size:11px;font-family:monospace;">';
        html += '[ ';
        for (let i = 0; i < v.length; i++) {
            const isCurrent = i === this.editIndex;
            const val = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                this.engine.formatResult(v[i]);
            if (isCurrent) html += `<span style="background:#1a1a1a;color:#c5d4b5;padding:0 2px;">${val}</span>`;
            else html += val;
            if (i < v.length - 1) html += ', ';
        }
        html += ' ]</div>';
        this.app.displayResultEl.innerHTML = html;
    }
    showVctAns() {
        if (!this.vctAns) return;
        this.app.displayInputEl.textContent = 'VctAns=';
        const formatted = this.vctAns.map(v => this.engine.formatResult(v));
        this.app.displayResultEl.textContent = '[ ' + formatted.join(', ') + ' ]';
        this.phase = 'result';
    }
    getOptnMenu() {
        return [
            { id: 1, name: 'Define Vector' },
            { id: 2, name: 'Edit Vector' },
            { id: 3, name: 'VctAns' },
            { id: 4, name: 'Dot Product' },
            { id: 5, name: 'Cross Product' },
            { id: 6, name: 'Angle' },
            { id: 7, name: 'Unit Vector' },
            { id: 8, name: 'Abs' }
        ];
    }
    handleOptn(index) {
        switch (index) {
            case 0: // Define Vector
                this.phase = 'define-select';
                this.app.displayInputEl.textContent = 'Define Vector';
                this.app.displayResultEl.textContent = '(-):A  ...:B  x²:C  sin:D';
                break;
            case 1: // Edit Vector
                this.phase = 'define-select';
                this.app.displayInputEl.textContent = 'Edit Vector';
                this.app.displayResultEl.textContent = '(-):A  ...:B  x²:C  sin:D';
                break;
            case 2: this.app.inputChar('VctAns'); break;
            case 3: this.app.inputFunc('DotP('); break;
            case 4: this.app.inputChar('×'); break;
            case 5: this.app.inputFunc('Angle('); break;
            case 6: this.app.inputFunc('UnitV('); break;
            case 7: this.app.inputFunc('Abs('); break;
        }
    }
}

// ========== STATISTICS MODE (Mode 6) ==========
class StatisticsMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.calcType = null; // '1-var', 'y=a+bx', etc.
        this.calcTypeIndex = 0;
        this.data = []; // [{x, y, freq}]
        this.phase = 'select-type'; // 'select-type', 'editor', 'stat-calc'
        this.editorRow = 0;
        this.editorCol = 0; // 0=x, 1=y, 2=freq
        this.editBuffer = '';
        this.showFreq = false;
        this.isPaired = false;
        this.statResult = null;
        this.regResult = null;
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
            { id: 3, name: 'y=a+bx+cx²' },
            { id: 4, name: 'y=a+b·ln(x)' },
            { id: 5, name: 'y=a·e^(bx)' },
            { id: 6, name: 'y=a·b^x' },
            { id: 7, name: 'y=a·x^b' },
            { id: 8, name: 'y=a+b/x' }
        ];
        this.app.renderMenu();
    }
    selectType(index) {
        // Show clear memory confirmation if data exists
        if (this.data.length > 0) {
            this.pendingTypeIndex = index;
            this.phase = 'confirm-clear';
            this.app.displayInputEl.textContent = 'Clear memory?';
            this.app.displayResultEl.innerHTML =
                '<div style="font-size:10px;font-family:monospace;text-align:center;padding:8px 0;">' +
                '[=] :Yes<br>[AC] :Cancel</div>';
            this.app.menuOpen = false;
            return;
        }
        this.doSelectType(index);
    }
    doSelectType(index) {
        this.calcTypeIndex = index;
        const types = ['1-var', 'y=a+bx', 'y=a+bx+cx²', 'y=a+b·ln(x)',
                       'y=a·e^(bx)', 'y=a·b^x', 'y=a·x^b', 'y=a+b/x'];
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
            if (key === 'equals') {
                this.doSelectType(this.pendingTypeIndex);
                return true;
            }
            if (key === 'ac') {
                this.phase = 'editor';
                this.renderEditor();
                return true;
            }
            return true;
        }
        if (this.phase === 'editor') return this.handleEditorKey(key);
        if (this.phase === 'stat-calc') return this.handleStatCalcKey(key);
        return false;
    }
    handleEditorKey(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderEditor();
            return true;
        }
        if (key === 'negate') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderEditor();
            return true;
        }
        if (key === 'equals') {
            const val = this.editBuffer === '' ? 0 : parseFloat(this.editBuffer);
            if (isNaN(val)) { this.editBuffer = ''; return true; }
            // Ensure row exists
            while (this.data.length <= this.editorRow) {
                this.data.push({ x: 0, y: 0, freq: 1 });
            }
            if (this.editorCol === 0) this.data[this.editorRow].x = val;
            else if (this.editorCol === 1 && this.isPaired) this.data[this.editorRow].y = val;
            else this.data[this.editorRow].freq = Math.max(1, Math.round(val));
            this.editBuffer = '';
            // Move to next cell
            const maxCol = this.isPaired ? (this.showFreq ? 2 : 1) : (this.showFreq ? 1 : 0);
            this.editorCol++;
            if (this.editorCol > maxCol) {
                this.editorCol = 0;
                this.editorRow++;
            }
            this.renderEditor();
            return true;
        }
        if (key === 'up') { if (this.editorRow > 0) { this.editorRow--; this.editBuffer = ''; } this.renderEditor(); return true; }
        if (key === 'down') { this.editorRow++; this.editBuffer = ''; this.renderEditor(); return true; }
        if (key === 'left') { if (this.editorCol > 0) { this.editorCol--; this.editBuffer = ''; } this.renderEditor(); return true; }
        if (key === 'right') {
            const maxCol = this.isPaired ? (this.showFreq ? 2 : 1) : (this.showFreq ? 1 : 0);
            if (this.editorCol < maxCol) { this.editorCol++; this.editBuffer = ''; }
            this.renderEditor();
            return true;
        }
        if (key === 'del') {
            if (this.editBuffer.length > 0) {
                this.editBuffer = this.editBuffer.slice(0, -1);
            } else if (this.data.length > this.editorRow) {
                this.data.splice(this.editorRow, 1);
                if (this.editorRow >= this.data.length && this.editorRow > 0) this.editorRow--;
            }
            this.renderEditor();
            return true;
        }
        if (key === 'ac') {
            this.phase = 'stat-calc';
            this.calculateStats();
            this.renderStatCalc();
            return true;
        }
        return true;
    }
    handleStatCalcKey(key) {
        if (key === 'ac') {
            this.phase = 'editor';
            this.renderEditor();
            return true;
        }
        return false;
    }
    renderEditor() {
        const cols = [];
        cols.push('x');
        if (this.isPaired) cols.push('y');
        if (this.showFreq) cols.push('Freq');

        this.app.displayInputEl.textContent = this.calcType;
        let html = '<div style="font-size:8px;font-family:monospace;line-height:1.3;">';
        html += '<table style="border-collapse:collapse;width:100%;">';
        // Header
        html += '<tr>';
        html += '<td style="padding:0 1px;font-weight:bold;"></td>';
        for (const col of cols) {
            html += `<td style="padding:0 2px;text-align:center;font-weight:bold;">${col}</td>`;
        }
        html += '</tr>';
        // Data rows (show 3 at a time)
        const startRow = Math.max(0, this.editorRow - 1);
        const endRow = Math.min(Math.max(this.data.length, this.editorRow + 1) + 1, startRow + 4);
        for (let i = startRow; i < endRow; i++) {
            const row = this.data[i] || { x: 0, y: 0, freq: 1 };
            html += '<tr>';
            html += `<td style="padding:0 1px;font-weight:bold;">${i + 1}</td>`;
            for (let c = 0; c < cols.length; c++) {
                const isCurrent = i === this.editorRow && c === this.editorCol;
                let val;
                if (c === 0) val = row.x;
                else if (c === 1 && this.isPaired) val = row.y;
                else val = row.freq;
                const display = isCurrent && this.editBuffer !== '' ? this.editBuffer : this.engine.formatResult(val);
                const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
                html += `<td style="padding:0 2px;text-align:right;${bg}">${display}</td>`;
            }
            html += '</tr>';
        }
        html += '</table></div>';
        this.app.displayResultEl.innerHTML = html;
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
            // Calculate regression
            switch (this.calcTypeIndex) {
                case 1: this.regResult = this.engine.linearRegression(xData, yData, freqs); break;
                case 2: this.regResult = this.engine.quadraticRegression(xData, yData, freqs); break;
                case 3: this.regResult = this.engine.logarithmicRegression(xData, yData, freqs); break;
                case 4: this.regResult = this.engine.eExponentialRegression(xData, yData, freqs); break;
                case 5: this.regResult = this.engine.abExponentialRegression(xData, yData, freqs); break;
                case 6: this.regResult = this.engine.powerRegression(xData, yData, freqs); break;
                case 7: this.regResult = this.engine.inverseRegression(xData, yData, freqs); break;
            }
        }
    }
    renderStatCalc() {
        if (!this.statResult) return;
        const s = this.statResult;
        this.app.displayInputEl.textContent = this.calcType;
        let lines = [];
        if (!this.isPaired) {
            lines.push(`n=${s.n}`);
            lines.push(`Σx=${this.engine.formatResult(s.sumX)}`);
            lines.push(`Σx²=${this.engine.formatResult(s.sumX2)}`);
            lines.push(`x̄=${this.engine.formatResult(s.mean)}`);
            lines.push(`σx=${this.engine.formatResult(s.popStdDev)}`);
            lines.push(`sx=${this.engine.formatResult(s.sampStdDev)}`);
        } else {
            lines.push(`n=${s.n}`);
            lines.push(`Σx=${this.engine.formatResult(s.sumX)}`);
            lines.push(`Σy=${this.engine.formatResult(s.sumY)}`);
            lines.push(`Σx²=${this.engine.formatResult(s.sumX2)}`);
            lines.push(`Σxy=${this.engine.formatResult(s.sumXY)}`);
            if (this.regResult) {
                lines.push(`a=${this.engine.formatResult(this.regResult.a)}`);
                lines.push(`b=${this.engine.formatResult(this.regResult.b)}`);
                if (this.regResult.c !== undefined)
                    lines.push(`c=${this.engine.formatResult(this.regResult.c)}`);
                if (this.regResult.r !== undefined)
                    lines.push(`r=${this.engine.formatResult(this.regResult.r)}`);
            }
        }
        let html = '<div style="font-size:9px;font-family:monospace;line-height:1.3;text-align:left;">';
        html += lines.slice(0, 5).join('<br>');
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
    }
    getOptnMenu() {
        if (this.phase === 'stat-calc') {
            const items = [
                { id: 1, name: 'Summation' },
                { id: 2, name: 'Variable' },
                { id: 3, name: 'Min/Max' }
            ];
            if (this.isPaired) items.push({ id: 4, name: 'Regression' });
            return items;
        }
        return [
            { id: 1, name: 'Select Type' },
            { id: 2, name: 'Editor' },
            { id: 3, name: 'Data' }
        ];
    }
}

// ========== DISTRIBUTION MODE (Mode 7) ==========
class DistributionMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.distType = null;
        this.phase = 'select-type';
        this.variables = {};
        this.varNames = [];
        this.varIndex = 0;
        this.editBuffer = '';
        this.listData = [];
        this.useList = false;
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
        this.app.menuOpen = false;
        this.setupVariables();
        this.phase = 'input';
        this.varIndex = 0;
        this.editBuffer = '';
        this.renderInput();
    }
    setupVariables() {
        switch (this.distType) {
            case 'normalPD':
                this.varNames = ['x', 'σ', 'μ'];
                this.variables = { x: 0, σ: 1, μ: 0 };
                break;
            case 'normalCD':
                this.varNames = ['Lower', 'Upper', 'σ', 'μ'];
                this.variables = { Lower: 0, Upper: 0, σ: 1, μ: 0 };
                break;
            case 'inverseNormal':
                this.varNames = ['Area', 'σ', 'μ'];
                this.variables = { Area: 0, σ: 1, μ: 0 };
                break;
            case 'binomialPD': case 'binomialCD':
                this.varNames = ['x', 'N', 'p'];
                this.variables = { x: 0, N: 1, p: 0.5 };
                break;
            case 'poissonPD': case 'poissonCD':
                this.varNames = ['x', 'λ'];
                this.variables = { x: 0, λ: 1 };
                break;
        }
    }
    handleKey(key) {
        if (this.phase === 'input') return this.handleInput(key);
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
    handleInput(key) {
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
        if (key === 'equals') {
            if (this.editBuffer !== '') {
                const val = parseFloat(this.editBuffer);
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
        const typeName = this.distType.replace(/([A-Z])/g, ' $1').trim();
        this.app.displayInputEl.textContent = typeName;
        let html = '<div style="font-size:9px;font-family:monospace;line-height:1.4;text-align:left;">';
        for (let i = 0; i < this.varNames.length; i++) {
            const name = this.varNames[i];
            const isCurrent = i === this.varIndex;
            const val = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                this.engine.formatResult(this.variables[name]);
            const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            html += `<div style="${bg}padding:0 2px;">${name} :${val}</div>`;
        }
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
    }
    calculate() {
        try {
            let result;
            const v = this.variables;
            switch (this.distType) {
                case 'normalPD': result = this.engine.normalPDF(v.x, v.σ, v.μ); break;
                case 'normalCD': result = this.engine.normalCDF(v.Lower, v.Upper, v.σ, v.μ); break;
                case 'inverseNormal': result = this.engine.inverseNormal(v.Area, v.σ, v.μ); break;
                case 'binomialPD': result = this.engine.binomialPDF(Math.round(v.x), Math.round(v.N), v.p); break;
                case 'binomialCD': result = this.engine.binomialCDF(Math.round(v.x), Math.round(v.N), v.p); break;
                case 'poissonPD': result = this.engine.poissonPDF(Math.round(v.x), v.λ); break;
                case 'poissonCD': result = this.engine.poissonCDF(Math.round(v.x), v.λ); break;
            }
            this.app.displayInputEl.textContent = this.distType.replace(/([A-Z])/g, ' $1').trim();
            const varName = this.distType.includes('inverse') ? 'x=' : 'p=';
            this.app.displayResultEl.textContent = `${varName}  ${this.engine.formatResult(result)}`;
            this.engine.ans = result;
            this.phase = 'result';
        } catch (e) {
            this.app.displayResultEl.textContent = e.message || 'Math ERROR';
            this.app.displayResultEl.classList.add('error');
        }
    }
    getOptnMenu() {
        return [
            { id: 1, name: 'Select Type' }
        ];
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
        this.cursorCol = 0; // 0=A, 1=B, etc.
        this.editBuffer = '';
        this.isEditing = false;
        this.autoCalc = true;
        this.scrollTop = 1;
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
    cellKey(row, col) {
        return String.fromCharCode(65 + col) + row;
    }
    getCellValue(key) {
        const cell = this.cells[key];
        if (!cell) return 0;
        if (cell.formula) return cell.value;
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
        // Evaluate all formulas
        for (const [key, cell] of Object.entries(this.cells)) {
            if (cell.formula) {
                try {
                    cell.value = this.evaluateFormula(cell.formula);
                } catch (e) {
                    cell.value = NaN;
                }
            }
        }
    }
    evaluateFormula(formula) {
        // Replace cell references with values
        let expr = formula.replace(/\$?([A-E])\$?(\d{1,2})/g, (match, col, row) => {
            const key = col + row;
            return this.getCellValue(key).toString();
        });
        // Handle Sum, Min, Max, Mean
        expr = expr.replace(/(Sum|Min|Max|Mean)\(([A-E]\d+):([A-E]\d+)\)/gi, (match, func, start, end) => {
            const values = this.getCellRange(start, end);
            switch (func.toLowerCase()) {
                case 'sum': return values.reduce((a, b) => a + b, 0);
                case 'min': return Math.min(...values);
                case 'max': return Math.max(...values);
                case 'mean': return values.reduce((a, b) => a + b, 0) / values.length;
            }
            return 0;
        });
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
    handleKey(key) {
        if (this.isEditing) return this.handleEditKey(key);
        return this.handleNavKey(key);
    }
    handleNavKey(key) {
        if (key === 'up') { if (this.cursorRow > 1) this.cursorRow--; this.adjustScroll(); this.renderSheet(); return true; }
        if (key === 'down') { if (this.cursorRow < this.rows) this.cursorRow++; this.adjustScroll(); this.renderSheet(); return true; }
        if (key === 'left') { if (this.cursorCol > 0) this.cursorCol--; this.renderSheet(); return true; }
        if (key === 'right') { if (this.cursorCol < this.cols - 1) this.cursorCol++; this.renderSheet(); return true; }
        if (/^[0-9]$/.test(key) || key === 'dot' || key === 'negate') {
            this.isEditing = true;
            this.editBuffer = key === 'dot' ? '.' : (key === 'negate' ? '-' : key);
            this.renderSheet();
            return true;
        }
        if (key === 'del') {
            const ck = this.cellKey(this.cursorRow, this.cursorCol);
            delete this.cells[ck];
            if (this.autoCalc) this.recalculate();
            this.renderSheet();
            return true;
        }
        if (key === 'ac') {
            this.app.engine.mode = 'Calculate';
            this.app.modeHandler = null;
            this.app.clearAll();
            return true;
        }
        return true;
    }
    handleEditKey(key) {
        if (/^[0-9]$/.test(key)) { this.editBuffer += key; this.renderSheet(); return true; }
        if (key === 'dot') { this.editBuffer += '.'; this.renderSheet(); return true; }
        if (key === 'negate') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderSheet();
            return true;
        }
        if (key === 'add') { this.editBuffer += '+'; this.renderSheet(); return true; }
        if (key === 'subtract') { this.editBuffer += '-'; this.renderSheet(); return true; }
        if (key === 'multiply') { this.editBuffer += '×'; this.renderSheet(); return true; }
        if (key === 'divide') { this.editBuffer += '÷'; this.renderSheet(); return true; }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderSheet(); return true; }
        if (key === 'equals') {
            const ck = this.cellKey(this.cursorRow, this.cursorCol);
            this.setCellContent(ck, this.editBuffer);
            this.editBuffer = '';
            this.isEditing = false;
            // Move down
            if (this.cursorRow < this.rows) this.cursorRow++;
            this.adjustScroll();
            this.renderSheet();
            return true;
        }
        if (key === 'ac') {
            this.editBuffer = '';
            this.isEditing = false;
            this.renderSheet();
            return true;
        }
        return true;
    }
    adjustScroll() {
        if (this.cursorRow < this.scrollTop) this.scrollTop = this.cursorRow;
        if (this.cursorRow >= this.scrollTop + 4) this.scrollTop = this.cursorRow - 3;
    }
    renderSheet() {
        const visibleRows = 4;
        const colLetters = ['A', 'B', 'C', 'D', 'E'];
        const ck = this.cellKey(this.cursorRow, this.cursorCol);
        const currentCell = this.cells[ck];

        // Edit box at bottom
        let editText = '';
        if (this.isEditing) {
            editText = this.editBuffer;
        } else if (currentCell) {
            editText = currentCell.formula ? '=' + currentCell.formula : this.engine.formatResult(currentCell.value);
        }

        this.app.displayInputEl.textContent = '';

        let html = '<div style="font-size:7px;font-family:monospace;line-height:1.15;">';
        // Header
        html += '<table style="border-collapse:collapse;width:100%;">';
        html += '<tr><td style="width:8%;"></td>';
        for (let c = 0; c < this.cols; c++) {
            html += `<td style="text-align:center;font-weight:bold;padding:0 1px;">${colLetters[c]}</td>`;
        }
        html += '</tr>';
        // Data rows
        for (let r = this.scrollTop; r < this.scrollTop + visibleRows && r <= this.rows; r++) {
            html += `<tr><td style="font-weight:bold;padding:0 1px;">${r}</td>`;
            for (let c = 0; c < this.cols; c++) {
                const key = this.cellKey(r, c);
                const cell = this.cells[key];
                const isCursor = r === this.cursorRow && c === this.cursorCol;
                let val = cell ? (isNaN(cell.value) ? 'ERR' : this.engine.formatResult(cell.value)) : '';
                if (isCursor && this.isEditing) val = this.editBuffer;
                const bg = isCursor ? 'background:#1a1a1a;color:#c5d4b5;' : '';
                html += `<td style="text-align:right;padding:0 1px;max-width:30px;overflow:hidden;${bg}">${val}</td>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        // Edit box
        html += `<div style="border-top:1px solid rgba(0,0,0,0.1);font-size:8px;padding:1px 2px;">${this.isEditing ? '' : '='}${editText}</div>`;
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
    }
    getOptnMenu() {
        return [
            { id: 1, name: 'Fill Formula' },
            { id: 2, name: 'Fill Value' },
            { id: 3, name: 'Edit Cell' },
            { id: 4, name: 'Free Space' },
            { id: 5, name: 'Sum' },
            { id: 6, name: 'Mean' },
            { id: 7, name: 'Min' },
            { id: 8, name: 'Max' }
        ];
    }
}

// ========== TABLE MODE (Mode 9) ==========
class TableMode extends ModeHandler {
    constructor(app) {
        super(app);
        this.fExpr = '';
        this.gExpr = '';
        this.useGx = false;
        this.start = -1;
        this.end = 1;
        this.step = 1;
        this.phase = 'input-f'; // 'input-f', 'input-g', 'range', 'table'
        this.tableData = [];
        this.tableRow = 0;
        this.scrollTop = 0;
        this.editBuffer = '';
        this.rangeField = 0; // 0=start, 1=end, 2=step
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
            this.app.displayInputEl.textContent = '';
            this.app.displayResultEl.textContent = this.editBuffer ? `f(x)=${this.editBuffer}` : 'f(x)=';
        } else if (this.phase === 'input-g') {
            this.app.displayInputEl.textContent = `f(x)=${this.fExpr}`;
            this.app.displayResultEl.textContent = this.editBuffer ? `g(x)=${this.editBuffer}` : 'g(x)=';
        }
    }
    renderRange() {
        this.app.displayInputEl.textContent = 'Table Range';
        const fields = [
            `Start:${this.rangeField === 0 && this.editBuffer !== '' ? this.editBuffer : this.start}`,
            `End  :${this.rangeField === 1 && this.editBuffer !== '' ? this.editBuffer : this.end}`,
            `Step :${this.rangeField === 2 && this.editBuffer !== '' ? this.editBuffer : this.step}`
        ];
        let html = '<div style="font-size:10px;font-family:monospace;line-height:1.4;">';
        for (let i = 0; i < fields.length; i++) {
            const bg = i === this.rangeField ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            html += `<div style="${bg}padding:0 2px;">${fields[i]}</div>`;
        }
        html += '</div>';
        this.app.displayResultEl.innerHTML = html;
    }
    renderTable() {
        if (!this.tableData.length) return;
        const hasG = this.useGx;
        this.app.displayInputEl.textContent = '';

        let html = '<div style="font-size:7px;font-family:monospace;line-height:1.15;">';
        html += '<table style="border-collapse:collapse;width:100%;">';
        // Header
        html += '<tr>';
        html += '<td style="font-weight:bold;padding:0 1px;"></td>';
        html += '<td style="font-weight:bold;text-align:center;padding:0 1px;">x</td>';
        html += '<td style="font-weight:bold;text-align:center;padding:0 1px;">f(x)</td>';
        if (hasG) html += '<td style="font-weight:bold;text-align:center;padding:0 1px;">g(x)</td>';
        html += '</tr>';
        // Data
        const visibleRows = 4;
        const startIdx = Math.max(0, Math.min(this.scrollTop, this.tableData.length - visibleRows));
        for (let i = startIdx; i < startIdx + visibleRows && i < this.tableData.length; i++) {
            const row = this.tableData[i];
            const isCurrent = i === this.tableRow;
            const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            html += `<tr style="${bg}">`;
            html += `<td style="padding:0 1px;">${i + 1}</td>`;
            html += `<td style="text-align:right;padding:0 1px;">${this.engine.formatResult(row.x)}</td>`;
            html += `<td style="text-align:right;padding:0 1px;">${row.fx === 'ERROR' ? 'ERR' : this.engine.formatResult(row.fx)}</td>`;
            if (hasG) html += `<td style="text-align:right;padding:0 1px;">${row.gx === 'ERROR' ? 'ERR' : this.engine.formatResult(row.gx)}</td>`;
            html += '</tr>';
        }
        html += '</table></div>';
        this.app.displayResultEl.innerHTML = html;
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
        if (key === 'multiply') { this.editBuffer += '×'; this.renderInputScreen(); return true; }
        if (key === 'divide') { this.editBuffer += '÷'; this.renderInputScreen(); return true; }
        if (key === 'varx') { this.editBuffer += 'x'; this.renderInputScreen(); return true; }
        if (key === 'square') { this.editBuffer += '²'; this.renderInputScreen(); return true; }
        if (key === 'power') { this.editBuffer += '^('; this.renderInputScreen(); return true; }
        if (key === 'lparen') { this.editBuffer += '('; this.renderInputScreen(); return true; }
        if (key === 'rparen') { this.editBuffer += ')'; this.renderInputScreen(); return true; }
        if (key === 'sin') { this.editBuffer += 'sin('; this.renderInputScreen(); return true; }
        if (key === 'cos') { this.editBuffer += 'cos('; this.renderInputScreen(); return true; }
        if (key === 'tan') { this.editBuffer += 'tan('; this.renderInputScreen(); return true; }
        if (key === 'sqrt') { this.editBuffer += '√('; this.renderInputScreen(); return true; }
        if (key === 'log') { this.editBuffer += 'log('; this.renderInputScreen(); return true; }
        if (key === 'ln') { this.editBuffer += 'ln('; this.renderInputScreen(); return true; }
        if (key === 'fraction') { this.editBuffer += '/'; this.renderInputScreen(); return true; }
        if (key === 'del') { this.editBuffer = this.editBuffer.slice(0, -1); this.renderInputScreen(); return true; }
        if (key === 'equals') {
            if (this.phase === 'input-f') {
                this.fExpr = this.editBuffer;
                this.editBuffer = '';
                if (this.useGx) {
                    this.phase = 'input-g';
                    this.renderInputScreen();
                } else {
                    this.phase = 'range';
                    this.rangeField = 0;
                    this.editBuffer = '';
                    this.renderRange();
                }
            } else {
                this.gExpr = this.editBuffer;
                this.editBuffer = '';
                this.phase = 'range';
                this.rangeField = 0;
                this.renderRange();
            }
            return true;
        }
        if (key === 'ac') {
            this.enter();
            return true;
        }
        return true;
    }
    handleRangeKey(key) {
        if (/^[0-9]$/.test(key) || key === 'dot') {
            this.editBuffer += key === 'dot' ? '.' : key;
            this.renderRange();
            return true;
        }
        if (key === 'negate') {
            if (this.editBuffer.startsWith('-')) this.editBuffer = this.editBuffer.slice(1);
            else this.editBuffer = '-' + this.editBuffer;
            this.renderRange();
            return true;
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
            if (this.rangeField < 2) {
                this.rangeField++;
                this.renderRange();
            } else {
                this.generateTable();
            }
            return true;
        }
        if (key === 'up') { if (this.rangeField > 0) { this.rangeField--; this.editBuffer = ''; } this.renderRange(); return true; }
        if (key === 'down') { if (this.rangeField < 2) { this.rangeField++; this.editBuffer = ''; } this.renderRange(); return true; }
        if (key === 'ac') { this.enter(); return true; }
        return true;
    }
    handleTableKey(key) {
        if (key === 'up') {
            if (this.tableRow > 0) {
                this.tableRow--;
                if (this.tableRow < this.scrollTop) this.scrollTop = this.tableRow;
            }
            this.renderTable();
            return true;
        }
        if (key === 'down') {
            if (this.tableRow < this.tableData.length - 1) {
                this.tableRow++;
                if (this.tableRow >= this.scrollTop + 4) this.scrollTop = this.tableRow - 3;
            }
            this.renderTable();
            return true;
        }
        if (key === 'ac') { this.enter(); return true; }
        return true;
    }
    generateTable() {
        try {
            this.tableData = this.engine.generateTable(this.fExpr, this.gExpr || null, this.start, this.end, this.step);
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
            this.app.displayResultEl.textContent = e.message || 'Math ERROR';
            this.app.displayResultEl.classList.add('error');
        }
    }
    renderSolution() {
        const sol = this.solutions[this.solutionIndex];
        const n = this.numUnknowns;
        if (this.eqType === 'simul') {
            const varNames = ['x', 'y', 'z', 'w'];
            this.app.displayInputEl.textContent = `${varNames[this.solutionIndex]}=`;
            this.app.displayResultEl.textContent = this.engine.formatResult(sol);
            this.engine.ans = sol;
        } else {
            // Show polynomial header on solution screens (as real calculator does)
            const labels = ['a', 'b', 'c', 'd', 'e'];
            let header = '';
            for (let i = 0; i <= n; i++) {
                if (i > 0) header += '+';
                const exp = n - i;
                header += labels[i];
                if (exp > 1) header += `x^${exp}`;
                else if (exp === 1) header += 'x';
            }
            header += '=0';

            const label = this.solutions.length > 1 ? `x${this.solutionIndex + 1}=` : 'x=';
            this.app.displayInputEl.textContent = header;
            if (Math.abs(sol.im) < 1e-12) {
                this.app.displayResultEl.textContent = `${label}  ${this.engine.formatResult(sol.re)}`;
                this.engine.ans = sol.re;
            } else {
                this.app.displayResultEl.textContent = `${label}  ${this.engine.formatComplex(sol)}`;
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
        this.app.menuItems = [
            { id: 1, name: `ax^${this.degree}+...>0` },
            { id: 2, name: `ax^${this.degree}+...<0` },
            { id: 3, name: `ax^${this.degree}+...≥0` },
            { id: 4, name: `ax^${this.degree}+...≤0` }
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
        // Show polynomial expression
        let title = '';
        for (let i = 0; i <= this.degree; i++) {
            const varNames = ['a', 'b', 'c', 'd', 'e'];
            if (i > 0) title += '+';
            const exp = this.degree - i;
            title += varNames[i] + (exp > 0 ? `x${exp > 1 ? '^' + exp : ''}` : '');
        }
        title += this.ineqType.replace('0', '');
        this.app.displayInputEl.textContent = title;

        let html = '<div style="font-size:10px;font-family:monospace;line-height:1.4;text-align:left;">';
        for (let i = 0; i <= this.degree; i++) {
            const isCurrent = i === this.editIndex;
            const val = isCurrent && this.editBuffer !== '' ? this.editBuffer :
                this.engine.formatResult(this.coefficients[i]);
            const bg = isCurrent ? 'background:#1a1a1a;color:#c5d4b5;' : '';
            const labels = ['a', 'b', 'c', 'd', 'e'];
            html += `<div style="${bg}padding:0 2px;">${labels[i]}=${val}</div>`;
        }
        html += '</div>';
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

        let solution = '';
        const op = isStrict ? (isGreater ? '<x<' : '<x<') : (isGreater ? '≤x≤' : '≤x≤');
        for (let i = 0; i < intervals.length; i++) {
            if (i > 0) solution += ', ';
            const [lo, hi] = intervals[i];
            if (lo === null) solution += `x${isStrict ? '<' : '≤'}${this.engine.formatResult(hi)}`;
            else if (hi === null) solution += `x${isStrict ? '>' : '≥'}${this.engine.formatResult(lo)}`;
            else solution += `${this.engine.formatResult(lo)}${op}${this.engine.formatResult(hi)}`;
        }

        this.app.displayInputEl.textContent = '';
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
