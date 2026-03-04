window.editorReady = new Promise(resolve => {
    require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' } })
    require(['vs/editor/editor.main'], function () {
        const savedTheme = localStorage.getItem('slate_theme') || 'dark'
        const monacoTheme = savedTheme === 'light' ? 'vs' : 'vs-dark'

        window.monacoEditor = monaco.editor.create(document.getElementById('editor-container'), {
            value: '',
            language: 'plaintext',
            theme: monacoTheme,
            automaticLayout: true,
            fontSize: 15,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            readOnly: true,
            renderWhitespace: 'selection',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            bracketPairColorization: { enabled: true },
            padding: { top: 12 },
        })

        window.setEditorTheme = (theme) => {
            monaco.editor.setTheme(theme === 'light' ? 'vs' : 'vs-dark')
        }

        window.getEditorLanguage = (filename) => {
            const ext = filename.split('.').pop().toLowerCase()
            const map = {
                js: 'javascript', jsx: 'javascript',
                ts: 'typescript', tsx: 'typescript',
                html: 'html', htm: 'html',
                css: 'css', scss: 'scss', less: 'less',
                json: 'json', jsonc: 'json',
                md: 'markdown', markdown: 'markdown',
                py: 'python',
                xml: 'xml', svg: 'xml',
                sql: 'sql',
                sh: 'shell', bash: 'shell',
                yaml: 'yaml', yml: 'yaml',
                php: 'php',
                c: 'c', cpp: 'cpp', h: 'c',
                cs: 'csharp',
                java: 'java',
                go: 'go',
                rs: 'rust',
                txt: 'plaintext',
            }
            return map[ext] || 'plaintext'
        }

        resolve(window.monacoEditor)
    })
})