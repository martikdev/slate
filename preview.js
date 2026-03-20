(function () {
    function getUser() { return localStorage.getItem('slate_user') || '__guest__' }
    function ukey(k)   { return k + '_' + getUser() }

    const refreshBtn   = document.getElementById('previewRefresh')
    const previewPane  = document.getElementById('preview-pane')
    const frameWrap    = document.getElementById('preview-frame-wrap')
    const previewFrame = document.getElementById('preview-frame')
    const previewPh    = document.getElementById('preview-placeholder')
    const resizer      = document.getElementById('preview-resizer')
    const editorPane   = document.getElementById('editor-pane')
    const split        = document.getElementById('editor-preview-split')
    const urlInput     = document.getElementById('previewUrlInput')
    const urlGo        = document.getElementById('previewUrlGo')

    let previewOpen    = false
    let manuallyClosed = false
    let currentLang    = 'plaintext'
    let debounceTimer  = null
    let lastHtmlFileName = null
    let targetFileName = null

    function getOpenFiles() {
        try { return JSON.parse(localStorage.getItem(ukey('slate_open_files')) || '[]') } catch { return [] }
    }

    function getTree() {
        try { return JSON.parse(localStorage.getItem(ukey('slate_tree')) || '[]') } catch { return [] }
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
        const of = getOpenFiles().find(f => f.name === name)
        if (of) return of.content || ''
        const r = findContent(getTree(), name)
        return r !== null ? r : ''
    }

    function getHtmlContent(fileName) {
        const name = fileName || lastHtmlFileName
        if (name) {
            const content = resolveAsset(name)
            if (content !== '') return { name, content }
        }
        const openFiles = getOpenFiles()
        const f = openFiles.find(f => f.name.endsWith('.html'))
        if (f) { lastHtmlFileName = f.name; return { name: f.name, content: f.content || '' } }
        return null
    }

    function buildPreview(html) {
        html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
            const css = resolveAsset(href.split('/').pop())
            return css ? '<style>' + css + '</style>' : match
        })
        html = html.replace(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi, (match, src) => {
            const js = resolveAsset(src.split('/').pop())
            return js ? '<script>' + js + '<\/script>' : match
        })
        return html
    }

    function setUrlBar(name) {
        if (urlInput) urlInput.value = name || ''
    }

    function renderFromFile(fileName) {
        if (!previewOpen) return
        const result = getHtmlContent(fileName)
        if (!result) return
        lastHtmlFileName = result.name
        targetFileName = result.name
        setUrlBar(result.name)
        frameWrap.style.display = 'flex'
        previewFrame.style.width  = '100%'
        previewFrame.style.height = '100%'
        previewPh.style.display   = 'none'
        const built = buildPreview(result.content)
        const blob  = new Blob([built], { type: 'text/html' })
        const url   = URL.createObjectURL(blob)
        const prev  = previewFrame.src
        previewFrame.src = url
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
    }

    function renderPreview() {
        if (currentLang === 'html' && window.__slateCurrentFileName) {
            lastHtmlFileName = window.__slateCurrentFileName
        }
        renderFromFile(targetFileName || lastHtmlFileName)
    }

    function openPreview() {
        manuallyClosed = false
        previewOpen    = true
        previewPane.style.display = 'flex'
        resizer.style.display     = 'block'
        renderPreview()
    }

    function closePreview(manual) {
        if (manual) manuallyClosed = true
        previewOpen = false
        previewPane.style.display = 'none'
        resizer.style.display     = 'none'
        editorPane.style.flex  = ''
        editorPane.style.width = ''
        previewPane.style.width = '42%'
        previewPane.style.flex  = ''
        if (window.monacoEditor) window.monacoEditor.layout()
    }

    window.openPreview       = openPreview
    window.closePreview      = closePreview
    function openInNewTab() {
        const result = getHtmlContent(targetFileName)
        if (!result) return
        const html = buildPreview(result.content)
        const blob = new Blob([html], { type: 'text/html' })
        const url  = URL.createObjectURL(blob)
        window.open(url, '_blank')
    }

    window.openPreviewNewTab = openInNewTab

    const newTabBtn = document.getElementById('previewNewTab')
    if (newTabBtn) newTabBtn.onclick = openInNewTab

    function navigateUrl() {
        const val = urlInput ? urlInput.value.trim().replace(/^\//, '') : ''
        if (!val) return
        targetFileName = val
        renderFromFile(val)
    }

    if (urlGo)   urlGo.onclick = navigateUrl
    if (urlInput) urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') navigateUrl() })
    if (refreshBtn) refreshBtn.onclick = () => renderPreview()

    document.addEventListener('keydown', e => {
        if (e.altKey && e.key === 'p') { e.preventDefault(); previewOpen ? closePreview() : openPreview() }
    })

    const closeBtn = document.getElementById('previewClose')
    if (closeBtn) closeBtn.onclick = () => closePreview(true)

    window.updatePreviewLang = function (lang) {
        currentLang = lang
        if (lang === 'html') {
            targetFileName = null
            if (!previewOpen && !manuallyClosed) openPreview()
            else if (previewOpen) renderPreview()
        }
    }

    window.triggerPreviewUpdate = function () {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            if (previewOpen) renderFromFile(targetFileName || lastHtmlFileName)
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
        const splitRect   = split.getBoundingClientRect()
        const minW        = 220
        const newEditorW  = Math.max(minW, Math.min(splitRect.width - resizer.offsetWidth - minW, e.clientX - splitRect.left))
        editorPane.style.flex   = 'none'
        editorPane.style.width  = newEditorW + 'px'
        previewPane.style.flex  = 'none'
        previewPane.style.width = (splitRect.width - resizer.offsetWidth - newEditorW) + 'px'
        if (window.monacoEditor) window.monacoEditor.layout()
    })

    resizer.addEventListener('pointerup', e => {
        resizer.releasePointerCapture(e.pointerId)
        resizer.classList.remove('dragging')
        document.body.style.cursor    = ''
        document.body.style.userSelect = ''
        if (window.monacoEditor) window.monacoEditor.layout()
    })
})()
