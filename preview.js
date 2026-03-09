(function () {
    const toggleBtn     = document.getElementById('previewToggle')
    const refreshBtn    = document.getElementById('previewRefresh')
    const previewPane   = document.getElementById('preview-pane')
    const frameWrap     = document.getElementById('preview-frame-wrap')
    const previewFrame  = document.getElementById('preview-frame')
    const previewPh     = document.getElementById('preview-placeholder')
    const resizer       = document.getElementById('preview-resizer')
    const editorPane    = document.getElementById('editor-pane')
    const split         = document.getElementById('editor-preview-split')
    const consolePanel  = document.getElementById('preview-console')
    const consoleOutput = document.getElementById('preview-console-output')
    const consoleClear  = document.getElementById('previewConsoleClear')
    const consoleToggle = document.getElementById('previewConsoleToggle')

    let previewOpen    = false
    let consoleOpen    = false
    let manuallyClosed = false
    let currentLang    = 'plaintext'
    let debounceTimer  = null

    const CONSOLE_INJECT = `<script>(function(){
    function fmt(a){if(a===null)return'null';if(a===undefined)return'undefined';if(typeof a==='object'){try{return JSON.stringify(a,null,2)}catch(e){return String(a)}}return String(a)}
    function send(level,args){try{window.parent.__slateConsole&&window.parent.__slateConsole(level,args.map(fmt).join(' '))}catch(e){}}
    ['log','info','warn','error'].forEach(function(m){var o=console[m].bind(console);console[m]=function(){o.apply(console,arguments);send(m,[].slice.call(arguments))}})
    window.addEventListener('error',function(e){send('error',[e.message+(e.filename?' ('+e.filename+':'+e.lineno+')':'')])})
    window.addEventListener('unhandledrejection',function(e){send('error',['Unhandled Promise: '+(e.reason&&e.reason.message?e.reason.message:String(e.reason))])})
    })()\x3c/script>`

    window.__slateConsole = function(level, text) { addConsoleLine(level, text) }

    function addConsoleLine(level, text) {
        const empty = consoleOutput.querySelector('.console-empty')
        if (empty) empty.remove()

        const icons = { log: 'codicon-chevron-right', info: 'codicon-info', warn: 'codicon-warning', error: 'codicon-error' }
        const line = document.createElement('div')
        line.className = 'console-line ' + level

        const icon = document.createElement('i')
        icon.className = 'codicon ' + (icons[level] || 'codicon-chevron-right') + ' console-line-icon'

        const txt = document.createElement('span')
        txt.className = 'console-line-text'
        txt.textContent = text

        line.appendChild(icon)
        line.appendChild(txt)
        consoleOutput.appendChild(line)
        consoleOutput.scrollTop = consoleOutput.scrollHeight

        if ((level === 'error' || level === 'warn') && !consoleOpen) toggleConsole(true)
    }

    function clearConsole() {
        consoleOutput.innerHTML = '<div class="console-empty">No output yet</div>'
    }

    function toggleConsole(forceOpen) {
        consoleOpen = forceOpen !== undefined ? forceOpen : !consoleOpen
        consolePanel.style.display = consoleOpen ? 'flex' : 'none'
        consoleToggle.classList.toggle('active', consoleOpen)
    }

    consoleToggle.onclick = () => toggleConsole()
    consoleClear.onclick  = () => clearConsole()
    clearConsole()

    let lastHtmlFileName = null

    function getHtmlContent() {
        const openFiles = getOpenFiles()
        if (lastHtmlFileName) {
            const f = openFiles.find(f => f.name === lastHtmlFileName)
            if (f) return f.content || ''
        }
        const f = openFiles.find(f => f.name.endsWith('.html'))
        if (f) { lastHtmlFileName = f.name; return f.content || '' }
        return null
    }

    function renderFromHtml() {
        if (!previewOpen) return
        const html = getHtmlContent()
        if (html === null) return
        frameWrap.style.display = 'flex'
        previewFrame.style.width  = '100%'
        previewFrame.style.height = '100%'
        previewPh.style.display   = 'none'
        clearConsole()
        const built = buildPreview(html, true)
        const blob  = new Blob([built], { type: 'text/html' })
        const url   = URL.createObjectURL(blob)
        const prev  = previewFrame.src
        previewFrame.src = url
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
    }

    function getOpenFiles() {
        try { return JSON.parse(localStorage.getItem('slate_open_files') || '[]') } catch { return [] }
    }

    function getTree() {
        try { return JSON.parse(localStorage.getItem('slate_tree') || '[]') } catch { return [] }
    }

    function findContent(nodes, name) {
        for (const n of nodes) {
            if (n.type === 'file' && n.name === name) return n.content || ''
            if (n.type === 'folder') {
                const r = findContent(n.children || [], name)
                if (r !== null) return r
            }
        }
        return null
    }

    function resolveAsset(name) {
        const openFiles = getOpenFiles()
        const of = openFiles.find(f => f.name === name)
        if (of) return of.content || ''
        const tree = getTree()
        const r = findContent(tree, name)
        return r !== null ? r : ''
    }

    function buildPreview(html, inject) {
        html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
            const name = href.split('/').pop()
            const css = resolveAsset(name)
            return css ? `<style>/* ${name} */\n${css}</style>` : match
        })
        html = html.replace(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi, (match, src) => {
            const name = src.split('/').pop()
            const js = resolveAsset(name)
            return js ? `<script>/* ${name} */\n${js}<\/script>` : match
        })
        if (inject) {
            html = html.replace(/<head([^>]*)>/i, '<head$1>' + CONSOLE_INJECT)
            if (!/<head/i.test(html)) html = CONSOLE_INJECT + html
        }
        return html
    }

    function renderPreview() {
        if (!previewOpen) return
        if (currentLang === 'html' && window.__slateCurrentFileName) {
            lastHtmlFileName = window.__slateCurrentFileName
        }
        renderFromHtml()
    }

    function openPreview() {
        manuallyClosed = false
        previewOpen    = true
        previewPane.style.display = 'flex'
        resizer.style.display     = 'block'
        toggleBtn.classList.add('active')
        renderPreview()
    }

    function closePreview(manual = false) {
        if (manual) manuallyClosed = true
        previewOpen = false
        previewPane.style.display = 'none'
        resizer.style.display     = 'none'
        toggleBtn.classList.remove('active')
        editorPane.style.flex  = ''
        editorPane.style.width = ''
        previewPane.style.width = '42%'
        previewPane.style.flex  = ''
        if (window.monacoEditor) window.monacoEditor.layout()
    }

    window.openPreview      = openPreview
    window.closePreview     = closePreview
    window.openPreviewNewTab = () => newTabBtn.onclick()

    toggleBtn.onclick = () => previewOpen ? closePreview(true) : openPreview()

    document.addEventListener('keydown', e => {
        if (e.altKey && e.key === 'p') { e.preventDefault(); previewOpen ? closePreview() : openPreview() }
    })

    refreshBtn.onclick = () => renderPreview()

    const newTabBtn = document.getElementById('previewNewTab')
    let popoutWin   = null

    newTabBtn.onclick = () => {
        const ed = window.monacoEditor
        if (!ed || currentLang !== 'html') return
        popoutWin = window.open('', 'slate-preview')
        pushToPopout(ed.getValue())
    }

    function pushToPopout(rawHtml) {
        if (!popoutWin || popoutWin.closed) { popoutWin = null; return }
        const html = buildPreview(rawHtml, false)
        popoutWin.document.open()
        popoutWin.document.write(html)
        popoutWin.document.close()
    }

    window.updatePreviewLang = function (lang) {
        currentLang = lang
        if (lang === 'html') {
            if (!previewOpen && !manuallyClosed) openPreview()
            else if (previewOpen) renderPreview()
        } else {
        }
    }

    window.triggerPreviewUpdate = function () {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            if (previewOpen) renderFromHtml()
            const ed = window.monacoEditor
            if (ed && popoutWin && !popoutWin.closed) {
                const html = getHtmlContent()
                if (html !== null) pushToPopout(html)
            }
        }, 400)
    }

    resizer.addEventListener('pointerdown', e => {
        e.preventDefault()
        resizer.setPointerCapture(e.pointerId)
        resizer.classList.add('dragging')
        document.body.style.cursor    = 'col-resize'
        document.body.style.userSelect = 'none'
    })

    resizer.addEventListener('pointermove', e => {
        if (!resizer.hasPointerCapture(e.pointerId)) return
        const splitRect  = split.getBoundingClientRect()
        const resizerW   = resizer.offsetWidth
        const minW       = 220
        const newEditorW = Math.max(minW, Math.min(splitRect.width - resizerW - minW, e.clientX - splitRect.left))
        const newPreviewW = splitRect.width - resizerW - newEditorW
        editorPane.style.flex   = 'none'
        editorPane.style.width  = newEditorW + 'px'
        previewPane.style.flex  = 'none'
        previewPane.style.width = newPreviewW + 'px'
        if (window.monacoEditor) window.monacoEditor.layout()
    })

    resizer.addEventListener('pointerup', e => {
        resizer.releasePointerCapture(e.pointerId)
        resizer.classList.remove('dragging')
        document.body.style.cursor    = ''
        document.body.style.userSelect = ''
        if (window.monacoEditor) window.monacoEditor.layout()
    })

    const closeBtn = document.getElementById('previewClose')
    if (closeBtn) closeBtn.onclick = () => closePreview(true)
})()
