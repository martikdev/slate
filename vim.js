(function () {
    if (!window.editorReady) return

    window.editorReady.then(function (ed) {

        function getUser() { return localStorage.getItem('slate_user') || '__guest__' }
        function ukey(k) { return k + '_' + getUser() }

        var state = {
            enabled: localStorage.getItem('slate_vim_enabled') === 'true',
            mode: 'NORMAL',
            pendingBuf: '',
            register: '"',
            count: '',
            visualAnchor: null,
            awaitingOneShot: null,
            commandLineActive: false,
            commandLineValue: ''
        }

        var registers = { named: {}, unnamed: '' }

        var undoStack = []
        var redoStack = []
        var openGroup = null
        var idleTimer = null

        var marks = {}

        function currentFileName() { return window.__slateCurrentFileName || '' }

        function marksKey() { return ukey('vim_marks_' + currentFileName()) }

        function loadMarks() {
            try { marks = JSON.parse(localStorage.getItem(marksKey()) || '{}') }
            catch (e) { marks = {} }
        }

        function saveMarks() {
            try { localStorage.setItem(marksKey(), JSON.stringify(marks)) }
            catch (e) {}
        }

        loadMarks()

        var prevFileName = currentFileName()
        setInterval(function () {
            var name = currentFileName()
            if (name !== prevFileName) {
                saveMarks()
                prevFileName = name
                loadMarks()
            }
        }, 300)

        function getRegister(name) {
            if (name === '+') {
                return ''
            }
            if (name === '"') return registers.unnamed
            return registers.named[name] || ''
        }

        function setRegister(name, text) {
            if (name === '+') {
                try { navigator.clipboard.writeText(text) } catch (e) {}
            }
            if (name === '"') { registers.unnamed = text; return }
            registers.named[name] = text
            registers.unnamed = text
        }

        function getContent() { return ed.getValue() }

        function getCursor() { return ed.getPosition() }

        function setCursor(line, col) {
            ed.setPosition({ lineNumber: line, column: col })
            ed.revealPositionInCenterIfOutsideViewport({ lineNumber: line, column: col })
        }

        function getLineCount() { return ed.getModel().getLineCount() }

        function getLineContent(n) { return ed.getModel().getLineContent(n) }

        function getLineLength(n) { return getLineContent(n).length }

        function openUndoGroup() {
            if (openGroup) return
            openGroup = {
                before: { content: getContent(), line: getCursor().lineNumber, col: getCursor().column }
            }
        }

        function closeUndoGroup(force) {
            clearTimeout(idleTimer)
            if (!openGroup) return
            openGroup.after = { content: getContent(), line: getCursor().lineNumber, col: getCursor().column }
            if (openGroup.before.content !== openGroup.after.content) {
                undoStack.push(openGroup)
                redoStack = []
            }
            openGroup = null
        }

        function resetIdleTimer() {
            clearTimeout(idleTimer)
            idleTimer = setTimeout(function () {
                if (state.mode === 'INSERT') {
                    closeUndoGroup()
                    openUndoGroup()
                }
            }, 2000)
        }

        function pushAtomicGroup(beforeContent, beforeLine, beforeCol) {
            undoStack.push({
                before: { content: beforeContent, line: beforeLine, col: beforeCol },
                after: { content: getContent(), line: getCursor().lineNumber, col: getCursor().column }
            })
            redoStack = []
        }

        function applyUndo() {
            if (undoStack.length === 0) {
                ed.trigger('keyboard', 'undo', null)
                return
            }
            var group = undoStack.pop()
            redoStack.push(group)
            suppress = true
            ed.setValue(group.before.content)
            suppress = false
            setCursor(group.before.line, group.before.col)
        }

        function applyRedo() {
            if (redoStack.length === 0) {
                ed.trigger('keyboard', 'redo', null)
                return
            }
            var group = redoStack.pop()
            undoStack.push(group)
            suppress = true
            ed.setValue(group.after.content)
            suppress = false
            setCursor(group.after.line, group.after.col)
        }

        var suppress = false
        ed.onDidChangeModelContent(function () {
            if (suppress) return
            if (state.mode === 'INSERT' && openGroup) resetIdleTimer()
        })

        ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, function () {
            if (state.enabled) applyUndo()
            else ed.trigger('keyboard', 'undo', null)
        })

        ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, function () {
            if (state.enabled) applyRedo()
            else ed.trigger('keyboard', 'redo', null)
        })

        var badge = document.createElement('div')
        badge.id = 'vim-badge'
        badge.style.cssText = [
            'position:absolute',
            'z-index:200',
            'pointer-events:none',
            'font-family:Menlo,Consolas,Monaco,monospace',
            'font-size:11px',
            'font-weight:600',
            'letter-spacing:0.06em',
            'padding:3px 8px',
            'border-radius:5px',
            'transition:opacity 0.12s',
            'white-space:nowrap',
            'user-select:none'
        ].join(';')
        var editorPane = document.getElementById('editor-pane')
        if (editorPane) editorPane.appendChild(badge)

        var cmdLineInput = document.createElement('input')
        cmdLineInput.id = 'vim-cmdline'
        cmdLineInput.autocomplete = 'off'
        cmdLineInput.spellcheck = false
        cmdLineInput.style.cssText = [
            'position:absolute',
            'z-index:201',
            'bottom:0',
            'left:0',
            'right:0',
            'background:#13111a',
            'color:#c4b8e0',
            'border:none',
            'border-top:1px solid #2d2840',
            'padding:5px 10px',
            'font-family:Menlo,Consolas,Monaco,monospace',
            'font-size:13px',
            'outline:none',
            'display:none'
        ].join(';')
        if (editorPane) editorPane.appendChild(cmdLineInput)

        var BADGE_COLORS = {
            NORMAL:  { bg: '#a78bfa', fg: '#13111a' },
            INSERT:  { bg: '#4ade80', fg: '#13111a' },
            VISUAL:  { bg: '#fb923c', fg: '#13111a' },
            COMMAND: { bg: '#38bdf8', fg: '#13111a' }
        }

        function updateBadge() {
            if (!state.enabled) { badge.style.opacity = '0'; return }
            badge.style.opacity = '1'
            var colorKey = state.commandLineActive ? 'COMMAND' : state.mode
            var c = BADGE_COLORS[colorKey] || BADGE_COLORS.NORMAL
            badge.style.background = c.bg
            badge.style.color = c.fg
            var label = state.commandLineActive ? ':' + state.commandLineValue : state.mode
            if (state.pendingBuf && !state.commandLineActive) label += ' ' + state.pendingBuf
            badge.textContent = label

            var pos = ed.getScrolledVisiblePosition(getCursor())
            if (pos) {
                var cont = document.getElementById('editor-container')
                var rect = cont ? cont.getBoundingClientRect() : { left: 0, top: 0 }
                var paneRect = editorPane ? editorPane.getBoundingClientRect() : rect
                var bx = (rect.left - paneRect.left) + pos.left
                var by = (rect.top  - paneRect.top)  + pos.top - 26
                if (by < 4) by = (rect.top - paneRect.top) + pos.top + (pos.height || 18) + 4
                badge.style.left = Math.max(4, bx) + 'px'
                badge.style.top  = by + 'px'
            }
        }

        ed.onDidChangeCursorPosition(updateBadge)

        function setCursorStyle(mode) {
            ed.updateOptions({
                cursorStyle: mode === 'INSERT' ? 'line' : 'block'
            })
        }

        function enterMode(m) {
            state.mode = m
            state.pendingBuf = ''
            state.count = ''
            if (m === 'INSERT') {
                ed.updateOptions({ readOnly: false })
                openUndoGroup()
            } else if (m === 'NORMAL') {
                if (openGroup) closeUndoGroup()
                ed.updateOptions({ readOnly: false })
                var pos = getCursor()
                var lineLen = getLineLength(pos.lineNumber)
                if (lineLen > 0 && pos.column > lineLen) setCursor(pos.lineNumber, lineLen)
            } else if (m === 'VISUAL') {
                state.visualAnchor = { line: getCursor().lineNumber, col: getCursor().column }
            }
            setCursorStyle(m)
            updateBadge()
        }

        function updateVisualSelection() {
            if (state.mode !== 'VISUAL' || !state.visualAnchor) return
            var anchor = state.visualAnchor
            var cur = getCursor()
            var startLine = Math.min(anchor.line, cur.lineNumber)
            var endLine   = Math.max(anchor.line, cur.lineNumber)
            var startCol, endCol
            if (anchor.line < cur.lineNumber || (anchor.line === cur.lineNumber && anchor.col <= cur.column)) {
                startCol = anchor.col; endCol = cur.column + 1
            } else {
                startCol = cur.column; endCol = anchor.col + 1
            }
            ed.setSelection(new monaco.Selection(startLine, startCol, endLine, endCol))
        }

        function getVisualRange() {
            var sel = ed.getSelection()
            if (!sel) return null
            return new monaco.Range(sel.startLineNumber, sel.startColumn, sel.endLineNumber, sel.endColumn)
        }

        function resolveMotion(motion, cur) {
            var line = cur.lineNumber, col = cur.column
            var lineLen = getLineLength(line)
            var lineCount = getLineCount()
            var m = motion

            if (m === 'h') return { line: line, col: Math.max(1, col - 1) }
            if (m === 'l') return { line: line, col: Math.min(lineLen || 1, col + 1) }
            if (m === 'j') return { line: Math.min(lineCount, line + 1), col: col }
            if (m === 'k') return { line: Math.max(1, line - 1), col: col }
            if (m === '0') return { line: line, col: 1 }
            if (m === '$') return { line: line, col: Math.max(1, lineLen) }
            if (m === '^') {
                var lc = getLineContent(line)
                var fc = lc.search(/\S/)
                return { line: line, col: fc === -1 ? 1 : fc + 1 }
            }
            if (m === 'G') return { line: lineCount, col: 1 }
            if (m === 'gg') return { line: 1, col: 1 }
            if (m === 'w') return wordForward(line, col, false)
            if (m === 'W') return wordForward(line, col, true)
            if (m === 'b') return wordBack(line, col, false)
            if (m === 'B') return wordBack(line, col, true)
            if (m === 'e') return wordEnd(line, col, false)
            if (m === 'E') return wordEnd(line, col, true)
            if (m === '%') return matchParen(line, col)
            return null
        }

        function wordForward(line, col, WORD) {
            var model = ed.getModel()
            var lineCount = getLineCount()
            var lc = getLineContent(line)
            var re = WORD ? /\S+/g : /\w+|[^\w\s]+/g
            var match, next = null
            re.lastIndex = col
            while ((match = re.exec(lc)) !== null) {
                if (match.index >= col) { next = { line: line, col: match.index + 1 }; break }
            }
            if (!next && line < lineCount) next = { line: line + 1, col: 1 }
            return next || { line: line, col: col }
        }

        function wordBack(line, col, WORD) {
            var lc = getLineContent(line)
            var before = lc.substring(0, col - 1)
            var re = WORD ? /\S+/g : /\w+|[^\w\s]+/g
            var match, last = null
            while ((match = re.exec(before)) !== null) last = match
            if (last) return { line: line, col: last.index + 1 }
            if (line > 1) {
                var prev = getLineContent(line - 1)
                re.lastIndex = 0
                last = null
                while ((match = re.exec(prev)) !== null) last = match
                return { line: line - 1, col: last ? last.index + 1 : 1 }
            }
            return { line: line, col: 1 }
        }

        function wordEnd(line, col, WORD) {
            var lc = getLineContent(line)
            var re = WORD ? /\S+/g : /\w+|[^\w\s]+/g
            var match
            while ((match = re.exec(lc)) !== null) {
                var end = match.index + match[0].length
                if (end > col) return { line: line, col: end }
            }
            var lineCount = getLineCount()
            if (line < lineCount) return { line: line + 1, col: 1 }
            return { line: line, col: col }
        }

        function matchParen(line, col) {
            var opens = '([{', closes = ')]}', model = ed.getModel()
            var lc = getLineContent(line)
            var ch = lc[col - 1]
            var openIdx = opens.indexOf(ch), closeIdx = closes.indexOf(ch)
            if (openIdx === -1 && closeIdx === -1) return { line: line, col: col }
            var forward = openIdx !== -1
            var open = forward ? ch : closes[closeIdx], close = forward ? closes[openIdx] : ch
            var depth = 0, lineCount = getLineCount()
            var r = line, c = col
            while (r >= 1 && r <= lineCount) {
                var content = getLineContent(r)
                var start = (r === line) ? (forward ? c : c - 2) : (forward ? 0 : content.length - 1)
                var end   = forward ? content.length : -1
                var step  = forward ? 1 : -1
                for (var i = start; forward ? i < end : i > end; i += step) {
                    if (content[i] === open)  depth++
                    if (content[i] === close) depth--
                    if (depth === 0) return { line: r, col: i + 1 }
                }
                r += step
            }
            return { line: line, col: col }
        }

        function getTextObjectRange(obj, cur) {
            var line = cur.lineNumber, col = cur.column
            var lc = getLineContent(line)
            var inner = obj[0] === 'i'
            var delim = obj[1]

            if (delim === 'w' || delim === 'W') {
                var re = delim === 'W' ? /\S+/g : /\w+|[^\w\s]+/g
                var match
                while ((match = re.exec(lc)) !== null) {
                    var s = match.index, e = s + match[0].length - 1
                    if (col - 1 >= s && col - 1 <= e) {
                        var startCol = inner ? s + 1 : Math.max(1, s)
                        var endCol   = inner ? e + 1 : e + 2
                        return new monaco.Range(line, startCol, line, Math.min(endCol, lc.length + 1))
                    }
                }
                return null
            }

            var pairs = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' }
            var quoteChars = ['"', "'", '`']

            if (quoteChars.indexOf(delim) !== -1) {
                var first = lc.indexOf(delim), last = lc.lastIndexOf(delim)
                if (first === -1 || first === last) return null
                if (inner) return new monaco.Range(line, first + 2, line, last)
                return new monaco.Range(line, first + 1, line, last + 1)
            }

            var open, close, forward
            if (pairs[delim] && '([{<'.indexOf(delim) !== -1) {
                open = delim; close = pairs[delim]; forward = true
            } else if (pairs[delim]) {
                close = delim; open = pairs[delim]; forward = false
            } else {
                return null
            }

            var depth = 0, startR = null, startC = null
            outer: for (var r = line; r >= 1; r--) {
                var content = getLineContent(r)
                var startI = r === line ? col - 2 : content.length - 1
                for (var i = startI; i >= 0; i--) {
                    if (content[i] === close) depth++
                    if (content[i] === open) {
                        if (depth === 0) { startR = r; startC = i + 1; break outer }
                        depth--
                    }
                }
            }
            if (!startR) return null

            depth = 0
            var endR = null, endC = null
            outer2: for (var r2 = line; r2 <= getLineCount(); r2++) {
                var content2 = getLineContent(r2)
                var startI2 = r2 === line ? col - 1 : 0
                for (var i2 = startI2; i2 < content2.length; i2++) {
                    if (content2[i2] === open) depth++
                    if (content2[i2] === close) {
                        if (depth === 0) { endR = r2; endC = i2 + 1; break outer2 }
                        depth--
                    }
                }
            }
            if (!endR) return null

            if (inner) return new monaco.Range(startR, startC + 1, endR, endC)
            return new monaco.Range(startR, startC, endR, endC + 1)
        }

        var OPERATORS = { d: true, c: true, y: true, '>': true, '<': true }
        var MOTIONS   = { h:true, l:true, j:true, k:true, w:true, W:true, b:true, B:true, e:true, E:true, '0':true, '$':true, '^':true, '%':true, G:true }
        var TEXT_OBJ_PREFIX = { i: true, a: true }
        var TEXT_OBJ_CHARS  = { w:true, W:true, '"':true, "'":true, '`':true, '(':true, ')':true, '[':true, ']':true, '{':true, '}':true, '<':true, '>':true }
        var ONE_SHOT = { f:true, F:true, t:true, T:true, r:true, m:true, "'":true, '`':true }

        function executeCommand(op, arg, count) {
            count = count || 1
            var cur = getCursor()
            var beforeContent = getContent()
            var beforeLine = cur.lineNumber, beforeCol = cur.column

            if (op === 'motion') {
                var dest = null
                for (var i = 0; i < count; i++) {
                    var c2 = getCursor()
                    dest = resolveMotion(arg, c2)
                    if (dest) setCursor(dest.line, dest.col)
                }
                if (state.mode === 'VISUAL') updateVisualSelection()
                return
            }

            if (op === 'gg') { setCursor(1, 1); return }

            if (op === 'i') { enterMode('INSERT'); return }
            if (op === 'I') {
                var lc0 = getLineContent(cur.lineNumber)
                var fc  = lc0.search(/\S/)
                setCursor(cur.lineNumber, fc === -1 ? 1 : fc + 1)
                enterMode('INSERT'); return
            }
            if (op === 'a') {
                var ll = getLineLength(cur.lineNumber)
                if (ll > 0) setCursor(cur.lineNumber, cur.column + 1)
                enterMode('INSERT'); return
            }
            if (op === 'A') {
                setCursor(cur.lineNumber, getLineLength(cur.lineNumber) + 1)
                enterMode('INSERT'); return
            }
            if (op === 'o') {
                var lc1 = getLineContent(cur.lineNumber)
                var indent = (lc1.match(/^\s*/) || [''])[0]
                var insertPos = getLineLength(cur.lineNumber) + 1
                ed.executeEdits('vim', [{ range: new monaco.Range(cur.lineNumber, insertPos, cur.lineNumber, insertPos), text: '\n' + indent }])
                setCursor(cur.lineNumber + 1, indent.length + 1)
                enterMode('INSERT'); return
            }
            if (op === 'O') {
                var lc2 = getLineContent(cur.lineNumber)
                var indent2 = (lc2.match(/^\s*/) || [''])[0]
                ed.executeEdits('vim', [{ range: new monaco.Range(cur.lineNumber, 1, cur.lineNumber, 1), text: indent2 + '\n' }])
                setCursor(cur.lineNumber, indent2.length + 1)
                enterMode('INSERT'); return
            }

            if (op === 'v') { enterMode(state.mode === 'VISUAL' ? 'NORMAL' : 'VISUAL'); return }
            if (op === 'V') {
                enterMode('VISUAL')
                state.visualAnchor = { line: cur.lineNumber, col: 1 }
                setCursor(cur.lineNumber, getLineLength(cur.lineNumber) || 1)
                updateVisualSelection(); return
            }

            if (op === 'u') { applyUndo(); return }
            if (op === 'ctrl-r') { applyRedo(); return }

            if (op === 'x') {
                for (var xi = 0; xi < count; xi++) {
                    var xc = getCursor()
                    var xl = getLineLength(xc.lineNumber)
                    if (xl === 0) continue
                    var xCh = getLineContent(xc.lineNumber)[xc.column - 1] || ''
                    setRegister(state.register, xCh)
                    ed.executeEdits('vim', [{ range: new monaco.Range(xc.lineNumber, xc.column, xc.lineNumber, xc.column + 1), text: '' }])
                }
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === 'X') {
                var xbc = getCursor()
                if (xbc.column > 1) {
                    var xbCh = getLineContent(xbc.lineNumber)[xbc.column - 2] || ''
                    setRegister(state.register, xbCh)
                    ed.executeEdits('vim', [{ range: new monaco.Range(xbc.lineNumber, xbc.column - 1, xbc.lineNumber, xbc.column), text: '' }])
                    pushAtomicGroup(beforeContent, beforeLine, beforeCol)
                }
                return
            }

            if (op === 'p' || op === 'P') {
                var text = getRegister(state.register)
                if (!text) return
                var isLine = text.indexOf('\n') !== -1 && text[text.length - 1] === '\n'
                var pc = getCursor()
                var insertR
                if (isLine) {
                    var targetLine = op === 'p' ? pc.lineNumber : pc.lineNumber - 1
                    var lineEnd = getLineLength(Math.max(1, targetLine)) + 1
                    insertR = new monaco.Range(Math.max(1, targetLine), lineEnd, Math.max(1, targetLine), lineEnd)
                    ed.executeEdits('vim', [{ range: insertR, text: '\n' + text.replace(/\n$/, '') }])
                    setCursor(Math.max(1, targetLine) + 1, 1)
                } else {
                    var ic = op === 'p' ? pc.column + 1 : pc.column
                    insertR = new monaco.Range(pc.lineNumber, ic, pc.lineNumber, ic)
                    ed.executeEdits('vim', [{ range: insertR, text: text }])
                }
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === 'dd') {
                var lineCount = getLineCount()
                for (var di = 0; di < count; di++) {
                    var dc = getCursor()
                    var dlc = dc.lineNumber
                    var lineText = getLineContent(dlc) + '\n'
                    setRegister(state.register, lineText)
                    var delRange
                    if (dlc < getLineCount()) {
                        delRange = new monaco.Range(dlc, 1, dlc + 1, 1)
                    } else {
                        delRange = new monaco.Range(dlc, 1, dlc, getLineLength(dlc) + 1)
                        if (dlc > 1) delRange = new monaco.Range(dlc - 1, getLineLength(dlc - 1) + 1, dlc, getLineLength(dlc) + 1)
                    }
                    ed.executeEdits('vim', [{ range: delRange, text: '' }])
                    var nc = getCursor()
                    setCursor(Math.min(nc.lineNumber, getLineCount()), 1)
                }
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === 'yy') {
                for (var yi = 0; yi < count; yi++) {
                    var yc = getCursor()
                    var yText = ''
                    for (var yl = yc.lineNumber; yl < yc.lineNumber + count; yl++) {
                        yText += getLineContent(Math.min(yl, getLineCount())) + '\n'
                    }
                    setRegister(state.register, yText)
                }
                return
            }

            if (op === 'cc') {
                var ccc = getCursor()
                var cText = getLineContent(ccc.lineNumber)
                var cIndent = (cText.match(/^\s*/) || [''])[0]
                ed.executeEdits('vim', [{ range: new monaco.Range(ccc.lineNumber, 1, ccc.lineNumber, cText.length + 1), text: cIndent }])
                setCursor(ccc.lineNumber, cIndent.length + 1)
                enterMode('INSERT')
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === '>>') {
                for (var shi = 0; shi < count; shi++) {
                    var sc = getCursor()
                    ed.executeEdits('vim', [{ range: new monaco.Range(sc.lineNumber, 1, sc.lineNumber, 1), text: '    ' }])
                }
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }
            if (op === '<<') {
                for (var sui = 0; sui < count; sui++) {
                    var suc = getCursor()
                    var sul = getLineContent(suc.lineNumber)
                    var remove = sul.match(/^(\t|    |   |  | )/)
                    if (remove) ed.executeEdits('vim', [{ range: new monaco.Range(suc.lineNumber, 1, suc.lineNumber, remove[0].length + 1), text: '' }])
                }
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === 'D') {
                var dc2 = getCursor()
                var dText = getLineContent(dc2.lineNumber).substring(dc2.column - 1)
                setRegister(state.register, dText)
                ed.executeEdits('vim', [{ range: new monaco.Range(dc2.lineNumber, dc2.column, dc2.lineNumber, getLineLength(dc2.lineNumber) + 1), text: '' }])
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === 'C') {
                var cc2 = getCursor()
                ed.executeEdits('vim', [{ range: new monaco.Range(cc2.lineNumber, cc2.column, cc2.lineNumber, getLineLength(cc2.lineNumber) + 1), text: '' }])
                enterMode('INSERT')
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === 'J') {
                var jc = getCursor()
                if (jc.lineNumber < getLineCount()) {
                    var jl1 = getLineContent(jc.lineNumber)
                    var jl2 = getLineContent(jc.lineNumber + 1).replace(/^\s+/, '')
                    ed.executeEdits('vim', [{ range: new monaco.Range(jc.lineNumber, 1, jc.lineNumber + 1, getLineLength(jc.lineNumber + 1) + 1), text: jl1 + ' ' + jl2 }])
                    pushAtomicGroup(beforeContent, beforeLine, beforeCol)
                }
                return
            }

            if (op === '~') {
                var tc = getCursor()
                var tch = getLineContent(tc.lineNumber)[tc.column - 1]
                if (tch) {
                    var toggled = tch === tch.toUpperCase() ? tch.toLowerCase() : tch.toUpperCase()
                    ed.executeEdits('vim', [{ range: new monaco.Range(tc.lineNumber, tc.column, tc.lineNumber, tc.column + 1), text: toggled }])
                    if (tc.column < getLineLength(tc.lineNumber)) setCursor(tc.lineNumber, tc.column + 1)
                    pushAtomicGroup(beforeContent, beforeLine, beforeCol)
                }
                return
            }

            if (op === 'dmotion') {
                var dest2 = resolveMotion(arg, cur)
                if (!dest2) return
                var r1 = cur.lineNumber, c1 = cur.column
                var r2 = dest2.line, c2 = dest2.col
                var range
                if (r1 === r2) {
                    var sc2 = Math.min(c1, c2), ec2 = Math.max(c1, c2)
                    if (arg === 'e' || arg === 'E') ec2++
                    range = new monaco.Range(r1, sc2, r1, ec2)
                } else {
                    if (r1 < r2) range = new monaco.Range(r1, c1, r2, c2)
                    else range = new monaco.Range(r2, c2, r1, c1)
                }
                var yanked = ed.getModel().getValueInRange(range)
                setRegister(state.register, yanked)
                ed.executeEdits('vim', [{ range: range, text: '' }])
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === 'cmotion') {
                var dest3 = resolveMotion(arg, cur)
                if (!dest3) return
                var r1b = cur.lineNumber, c1b = cur.column, r2b = dest3.line, c2b = dest3.col
                var sc3 = Math.min(c1b, c2b), ec3 = Math.max(c1b, c2b)
                if (r1b === r2b) {
                    if (arg === 'e' || arg === 'E') ec3++
                    ed.executeEdits('vim', [{ range: new monaco.Range(r1b, sc3, r1b, ec3), text: '' }])
                    setCursor(r1b, sc3)
                } else {
                    var sr = Math.min(r1b, r2b), er = Math.max(r1b, r2b)
                    ed.executeEdits('vim', [{ range: new monaco.Range(sr, 1, er, getLineLength(er) + 1), text: '' }])
                    setCursor(sr, 1)
                }
                enterMode('INSERT')
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === 'ymotion') {
                var dest4 = resolveMotion(arg, cur)
                if (!dest4) return
                var r1c = cur.lineNumber, c1c = cur.column, r2c = dest4.line, c2c = dest4.col
                var range2
                if (r1c === r2c) {
                    var sc4 = Math.min(c1c, c2c), ec4 = Math.max(c1c, c2c)
                    if (arg === 'e' || arg === 'E') ec4++
                    range2 = new monaco.Range(r1c, sc4, r1c, ec4)
                } else {
                    if (r1c < r2c) range2 = new monaco.Range(r1c, c1c, r2c, c2c)
                    else range2 = new monaco.Range(r2c, c2c, r1c, c1c)
                }
                setRegister(state.register, ed.getModel().getValueInRange(range2))
                return
            }

            if (op === 'dtobj' || op === 'ctobj' || op === 'ytobj') {
                var range3 = getTextObjectRange(arg, cur)
                if (!range3) return
                var yanked2 = ed.getModel().getValueInRange(range3)
                setRegister(state.register, yanked2)
                if (op !== 'ytobj') {
                    ed.executeEdits('vim', [{ range: range3, text: '' }])
                    setCursor(range3.startLineNumber, range3.startColumn)
                    pushAtomicGroup(beforeContent, beforeLine, beforeCol)
                }
                if (op === 'ctobj') enterMode('INSERT')
                return
            }

            if (op === 'gttobj' || op === 'gltobj') {
                var range4 = getTextObjectRange(arg, cur)
                if (!range4) return
                var content4 = ed.getModel().getValueInRange(range4)
                var shifted = op === 'gttobj' ? content4.toUpperCase() : content4.toLowerCase()
                ed.executeEdits('vim', [{ range: range4, text: shifted }])
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === '>motion') {
                var dest5 = resolveMotion(arg, cur)
                if (!dest5) return
                var sr2 = Math.min(cur.lineNumber, dest5.line)
                var er2 = Math.max(cur.lineNumber, dest5.line)
                for (var ri = sr2; ri <= er2; ri++) {
                    ed.executeEdits('vim', [{ range: new monaco.Range(ri, 1, ri, 1), text: '    ' }])
                }
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }
            if (op === '<motion') {
                var dest6 = resolveMotion(arg, cur)
                if (!dest6) return
                var sr3 = Math.min(cur.lineNumber, dest6.line)
                var er3 = Math.max(cur.lineNumber, dest6.line)
                for (var ri2 = sr3; ri2 <= er3; ri2++) {
                    var rl2 = getLineContent(ri2)
                    var rem = rl2.match(/^(\t|    |   |  | )/)
                    if (rem) ed.executeEdits('vim', [{ range: new monaco.Range(ri2, 1, ri2, rem[0].length + 1), text: '' }])
                }
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }

            if (op === 'visual-d' || op === 'visual-x') {
                var vr = getVisualRange()
                if (!vr) { enterMode('NORMAL'); return }
                setRegister(state.register, ed.getModel().getValueInRange(vr))
                ed.executeEdits('vim', [{ range: vr, text: '' }])
                enterMode('NORMAL')
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }
            if (op === 'visual-y') {
                var vr2 = getVisualRange()
                if (!vr2) { enterMode('NORMAL'); return }
                setRegister(state.register, ed.getModel().getValueInRange(vr2))
                enterMode('NORMAL'); return
            }
            if (op === 'visual-c') {
                var vr3 = getVisualRange()
                if (!vr3) { enterMode('NORMAL'); return }
                setRegister(state.register, ed.getModel().getValueInRange(vr3))
                ed.executeEdits('vim', [{ range: vr3, text: '' }])
                enterMode('INSERT')
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }
            if (op === 'visual->') {
                var vr4 = getVisualRange()
                if (!vr4) { enterMode('NORMAL'); return }
                for (var ri3 = vr4.startLineNumber; ri3 <= vr4.endLineNumber; ri3++) {
                    ed.executeEdits('vim', [{ range: new monaco.Range(ri3, 1, ri3, 1), text: '    ' }])
                }
                enterMode('NORMAL')
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }
            if (op === 'visual-<') {
                var vr5 = getVisualRange()
                if (!vr5) { enterMode('NORMAL'); return }
                for (var ri4 = vr5.startLineNumber; ri4 <= vr5.endLineNumber; ri4++) {
                    var rl3 = getLineContent(ri4)
                    var rem2 = rl3.match(/^(\t|    |   |  | )/)
                    if (rem2) ed.executeEdits('vim', [{ range: new monaco.Range(ri4, 1, ri4, rem2[0].length + 1), text: '' }])
                }
                enterMode('NORMAL')
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }
            if (op === 'visual-~') {
                var vr6 = getVisualRange()
                if (!vr6) { enterMode('NORMAL'); return }
                var vc6 = ed.getModel().getValueInRange(vr6)
                ed.executeEdits('vim', [{ range: vr6, text: vc6.split('').map(function (c) { return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase() }).join('') }])
                enterMode('NORMAL')
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }
            if (op === 'visual-J') {
                var vr7 = getVisualRange()
                if (!vr7) { enterMode('NORMAL'); return }
                var lines7 = []
                for (var li7 = vr7.startLineNumber; li7 <= vr7.endLineNumber; li7++) lines7.push(getLineContent(li7).replace(/^\s+/, ''))
                ed.executeEdits('vim', [{ range: new monaco.Range(vr7.startLineNumber, 1, vr7.endLineNumber, getLineLength(vr7.endLineNumber) + 1), text: lines7.join(' ') }])
                enterMode('NORMAL')
                pushAtomicGroup(beforeContent, beforeLine, beforeCol); return
            }
        }

        function executeOneShotResult(type, ch) {
            var cur = getCursor()
            var lc = getLineContent(cur.lineNumber)
            var beforeContent = getContent()
            var beforeLine = cur.lineNumber, beforeCol = cur.column

            if (type === 'f') {
                var fi = lc.indexOf(ch, cur.column)
                if (fi !== -1) setCursor(cur.lineNumber, fi + 1)
            } else if (type === 'F') {
                var fi2 = lc.lastIndexOf(ch, cur.column - 2)
                if (fi2 !== -1) setCursor(cur.lineNumber, fi2 + 1)
            } else if (type === 't') {
                var ti = lc.indexOf(ch, cur.column)
                if (ti > 0) setCursor(cur.lineNumber, ti)
            } else if (type === 'T') {
                var ti2 = lc.lastIndexOf(ch, cur.column - 2)
                if (ti2 !== -1) setCursor(cur.lineNumber, ti2 + 2)
            } else if (type === 'r') {
                ed.executeEdits('vim', [{ range: new monaco.Range(cur.lineNumber, cur.column, cur.lineNumber, cur.column + 1), text: ch }])
                pushAtomicGroup(beforeContent, beforeLine, beforeCol)
            } else if (type === 'm') {
                marks[ch] = { line: cur.lineNumber, col: cur.column }
                saveMarks()
            } else if (type === "'" || type === '`') {
                var mark = marks[ch]
                if (mark) setCursor(mark.line, mark.col)
            }

            if (state.mode === 'VISUAL') updateVisualSelection()
        }

        function parseCommandLine(cmd) {
            cmd = cmd.trim()
            if (cmd === 'w') { if (typeof saveCurrentFile === 'function') saveCurrentFile(); return }
            if (cmd === 'q') { location.href = 'home.html'; return }
            if (cmd === 'wq') { if (typeof saveCurrentFile === 'function') saveCurrentFile(); setTimeout(function () { location.href = 'home.html' }, 200); return }
            if (cmd === 'set vim' || cmd === 'set vim!') { toggleVim(); return }
            if (cmd === 'noh' || cmd === 'nohlsearch') { ed.trigger('keyboard', 'cancelSelection', null); return }

            var subMatch = cmd.match(/^(%?)s\/((?:[^\\/]|\\.)*)\/((?:[^\\/]|\\.)*)\/([gi]*)$/)
            if (subMatch) {
                var flags    = subMatch[4] || ''
                var isGlobal = flags.indexOf('g') !== -1
                var isCase   = flags.indexOf('i') !== -1
                var reFlags  = (isGlobal ? 'g' : '') + (isCase ? 'i' : '')
                try {
                    var re = new RegExp(subMatch[2], reFlags || 'g')
                    var oldContent = getContent()
                    var newContent
                    if (subMatch[1] === '%') {
                        newContent = oldContent.replace(re, subMatch[3])
                    } else {
                        var cur = getCursor()
                        var lines = oldContent.split('\n')
                        lines[cur.lineNumber - 1] = lines[cur.lineNumber - 1].replace(re, subMatch[3])
                        newContent = lines.join('\n')
                    }
                    if (newContent !== oldContent) {
                        var bc = getContent(), bl = getCursor().lineNumber, bco = getCursor().column
                        suppress = true; ed.setValue(newContent); suppress = false
                        pushAtomicGroup(bc, bl, bco)
                    }
                } catch (e) {}
                return
            }

            var lineMatch = cmd.match(/^(\d+)$/)
            if (lineMatch) { setCursor(parseInt(lineMatch[1], 10), 1); return }
        }

        function handleNormal(key, e) {
            if (state.awaitingOneShot) {
                var type = state.awaitingOneShot
                state.awaitingOneShot = null
                e.preventDefault()
                executeOneShotResult(type, key)
                updateBadge(); return
            }

            if (key === ':') {
                e.preventDefault()
                state.commandLineActive = true
                state.commandLineValue = ''
                cmdLineInput.style.display = 'block'
                cmdLineInput.value = ':'
                cmdLineInput.focus()
                updateBadge(); return
            }

            if (key === '/') {
                e.preventDefault()
                ed.trigger('keyboard', 'actions.find', null); return
            }

            if (key === 'n') { e.preventDefault(); ed.trigger('keyboard', 'editor.action.nextMatchFindAction', null); return }
            if (key === 'N') { e.preventDefault(); ed.trigger('keyboard', 'editor.action.previousMatchFindAction', null); return }

            if (key === '*') {
                e.preventDefault()
                var cur = getCursor()
                var lc = getLineContent(cur.lineNumber)
                var wMatch = lc.match(/\w+/)
                var re2 = lc.slice(cur.column - 1).match(/^\w+/)
                if (re2) ed.trigger('keyboard', 'actions.findWithSelection', null)
                return
            }

            if (key >= '1' && key <= '9' && !state.pendingBuf) {
                e.preventDefault()
                state.count += key
                updateBadge(); return
            }
            if (key === '0' && state.count) {
                e.preventDefault()
                state.count += '0'
                updateBadge(); return
            }

            if (key === '"') {
                e.preventDefault()
                state.pendingBuf = '"'
                updateBadge(); return
            }
            if (state.pendingBuf === '"') {
                if (/^[a-z"+]$/.test(key)) {
                    e.preventDefault()
                    state.register = key
                    state.pendingBuf = ''
                    updateBadge(); return
                }
            }

            if (ONE_SHOT[key]) {
                e.preventDefault()
                state.awaitingOneShot = key
                state.pendingBuf = key
                updateBadge(); return
            }

            var count = parseInt(state.count || '1', 10)

            if (key === 'g' && state.pendingBuf === '') {
                e.preventDefault(); state.pendingBuf = 'g'; updateBadge(); return
            }
            if (state.pendingBuf === 'g') {
                if (key === 'g') { e.preventDefault(); state.pendingBuf = ''; state.count = ''; executeCommand('gg', null, 1); updateBadge(); return }
                if (key === 't') { e.preventDefault(); state.pendingBuf = 'gt'; updateBadge(); return }
                if (key === 'u') { e.preventDefault(); state.pendingBuf = 'gu'; updateBadge(); return }
                state.pendingBuf = ''; updateBadge(); return
            }
            if (state.pendingBuf === 'gt') {
                if (TEXT_OBJ_CHARS[key]) {
                    e.preventDefault()
                    executeCommand('gttobj', 'i' + key, count)
                    state.pendingBuf = ''; state.count = ''; state.register = '"'; updateBadge()
                } else { state.pendingBuf = ''; updateBadge() }
                return
            }
            if (state.pendingBuf === 'gu') {
                if (TEXT_OBJ_CHARS[key]) {
                    e.preventDefault()
                    executeCommand('gltobj', 'i' + key, count)
                    state.pendingBuf = ''; state.count = ''; state.register = '"'; updateBadge()
                } else { state.pendingBuf = ''; updateBadge() }
                return
            }

            if (OPERATORS[key] && state.pendingBuf === '') {
                e.preventDefault(); state.pendingBuf = key; updateBadge(); return
            }

            if (state.pendingBuf && OPERATORS[state.pendingBuf]) {
                var op2 = state.pendingBuf
                if (key === op2) {
                    e.preventDefault()
                    var linewiseMap = { d: 'dd', c: 'cc', y: 'yy', '>': '>>', '<': '<<' }
                    executeCommand(linewiseMap[op2] || op2 + op2, null, count)
                    state.pendingBuf = ''; state.count = ''; state.register = '"'; updateBadge(); return
                }
                if (TEXT_OBJ_PREFIX[key]) {
                    state.pendingBuf = op2 + key; updateBadge(); return
                }
                if (MOTIONS[key]) {
                    e.preventDefault()
                    executeCommand(op2 + 'motion', key, count)
                    state.pendingBuf = ''; state.count = ''; state.register = '"'; updateBadge(); return
                }
                if (key === 'G') {
                    e.preventDefault()
                    executeCommand(op2 + 'motion', 'G', count)
                    state.pendingBuf = ''; state.count = ''; state.register = '"'; updateBadge(); return
                }
            }

            if (state.pendingBuf.length === 2 && TEXT_OBJ_PREFIX[state.pendingBuf[1]] && OPERATORS[state.pendingBuf[0]]) {
                if (TEXT_OBJ_CHARS[key]) {
                    e.preventDefault()
                    var op3 = state.pendingBuf[0], ia = state.pendingBuf[1]
                    executeCommand(op3 + 'tobj', ia + key, count)
                    state.pendingBuf = ''; state.count = ''; state.register = '"'; updateBadge(); return
                }
                state.pendingBuf = ''; updateBadge()
            }

            e.preventDefault()
            state.pendingBuf = ''; state.count = ''

            if (MOTIONS[key]) { executeCommand('motion', key, count); updateBadge(); return }

            var simpleMap = {
                'i': 'i', 'I': 'I', 'a': 'a', 'A': 'A',
                'o': 'o', 'O': 'O',
                'v': 'v', 'V': 'V',
                'x': 'x', 'X': 'X',
                'p': 'p', 'P': 'P',
                'u': 'u',
                'D': 'D', 'C': 'C',
                'J': 'J', '~': '~',
                'G': 'motion'
            }

            if (key === 'G') { executeCommand('motion', 'G', count); state.register = '"'; updateBadge(); return }

            if (simpleMap[key]) {
                executeCommand(simpleMap[key], null, count)
                state.register = '"'; updateBadge()
            }
        }

        function handleVisual(key, e) {
            if (key === 'Escape') { e.preventDefault(); enterMode('NORMAL'); updateBadge(); return }
            if (MOTIONS[key]) { e.preventDefault(); executeCommand('motion', key, 1); updateBadge(); return }
            if (key === 'G') { e.preventDefault(); executeCommand('motion', 'G', 1); updateBadge(); return }
            if (key === 'd' || key === 'x') { e.preventDefault(); executeCommand('visual-d', null, 1); updateBadge(); return }
            if (key === 'y') { e.preventDefault(); executeCommand('visual-y', null, 1); updateBadge(); return }
            if (key === 'c') { e.preventDefault(); executeCommand('visual-c', null, 1); updateBadge(); return }
            if (key === '>') { e.preventDefault(); executeCommand('visual->', null, 1); updateBadge(); return }
            if (key === '<') { e.preventDefault(); executeCommand('visual-<', null, 1); updateBadge(); return }
            if (key === '~') { e.preventDefault(); executeCommand('visual-~', null, 1); updateBadge(); return }
            if (key === 'J') { e.preventDefault(); executeCommand('visual-J', null, 1); updateBadge(); return }
            if (key === 'u') { e.preventDefault(); applyUndo(); updateBadge(); return }
            if (key === 'p' || key === 'P') { e.preventDefault(); executeCommand(key, null, 1); updateBadge(); return }
        }

        ed.onKeyDown(function (e) {
            if (!state.enabled) return
            if (state.commandLineActive) return

            var acEl = document.getElementById('ac')
            if (acEl && acEl.style.display !== 'none') return

            var key = e.browserEvent ? e.browserEvent.key : e.key || ''
            var ctrl = e.ctrlKey || e.metaKey

            if (state.mode === 'INSERT') {
                if (key === 'Escape') {
                    e.preventDefault()
                    closeUndoGroup()
                    enterMode('NORMAL')
                    updateBadge()
                } else if (ctrl && key === 'r') {
                    e.preventDefault()
                    applyRedo()
                }
                return
            }

            if (state.mode === 'VISUAL') {
                handleVisual(key, e)
                return
            }

            if (state.mode === 'NORMAL') {
                if (ctrl && key === 'r') {
                    e.preventDefault(); applyRedo(); updateBadge(); return
                }
                handleNormal(key, e)
            }
        })

        cmdLineInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                var cmd = cmdLineInput.value.replace(/^:/, '')
                cmdLineInput.style.display = 'none'
                state.commandLineActive = false
                state.commandLineValue = ''
                parseCommandLine(cmd)
                ed.focus()
                updateBadge()
            } else if (e.key === 'Escape') {
                cmdLineInput.style.display = 'none'
                state.commandLineActive = false
                state.commandLineValue = ''
                ed.focus()
                updateBadge()
            } else {
                setTimeout(function () {
                    state.commandLineValue = cmdLineInput.value.replace(/^:/, '')
                    updateBadge()
                }, 0)
            }
        })

        function toggleVim() {
            state.enabled = !state.enabled
            localStorage.setItem('slate_vim_enabled', state.enabled)
            if (state.enabled) {
                enterMode('NORMAL')
            } else {
                state.mode = 'NORMAL'
                state.pendingBuf = ''
                ed.updateOptions({ readOnly: false, cursorStyle: 'line' })
                badge.style.opacity = '0'
            }
            var toggle = document.querySelector('.setting-toggle input[data-setting="vimMode"]')
            if (toggle) toggle.checked = state.enabled
            updateBadge()
        }

        window.vimToggle = toggleVim

        if (state.enabled) enterMode('NORMAL')
        else badge.style.opacity = '0'

        updateBadge()
        setInterval(updateBadge, 500)
    })
})()
