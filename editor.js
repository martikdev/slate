window.editorReady = new Promise(resolve => {
    const base = 'https://unpkg.com/monaco-editor@0.44.0/min/vs'

    window.MonacoEnvironment = {
        getWorkerUrl: (moduleId, label) => {
            const wrap = src => `data:text/javascript;charset=utf-8,${encodeURIComponent(`importScripts('${src}');`)}`
            if (label === 'json') return wrap(`${base}/language/json/json.worker.js`)
            if (label === 'css' || label === 'scss' || label === 'less') return wrap(`${base}/language/css/css.worker.js`)
            if (label === 'typescript' || label === 'javascript') return wrap(`${base}/language/typescript/ts.worker.js`)
            return wrap(`${base}/editor/editor.worker.js`)
        }
    }

    require.config({ paths: { vs: base } })
    require(['vs/editor/editor.main'], () => {

        monaco.editor.defineTheme('slate-dark', {
            base: 'vs-dark', inherit: true, rules: [],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#cccccc',
                'editorCursor.foreground': '#4fc1ff',
                'editor.selectionBackground': '#264f78',
                'editorLineNumber.foreground': '#4a4a4a',
                'editorLineNumber.activeForeground': '#cccccc',
            }
        })

        monaco.editor.defineTheme('slate-light', {
            base: 'vs', inherit: true, rules: [],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#1f1f1f',
                'editorCursor.foreground': '#007acc',
                'editor.selectionBackground': '#add6ff',
            }
        })

        const savedTheme = localStorage.getItem('slate_theme') || 'dark'

        window.monacoEditor = monaco.editor.create(document.getElementById('editor-container'), {
            value: '',
            language: 'plaintext',
            theme: savedTheme === 'light' ? 'slate-light' : 'slate-dark',
            automaticLayout: true,
            fontSize: 14,
            fontFamily: "Consolas, 'Courier New', monospace",
            lineNumbers: 'on',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            readOnly: true,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            bracketPairColorization: { enabled: true },
            padding: { top: 12 },
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            wordBasedSuggestions: 'off',
            parameterHints: { enabled: false },
            acceptSuggestionOnEnter: 'off',
        })

        window.setEditorTheme = theme => monaco.editor.setTheme(theme === 'light' ? 'slate-light' : 'slate-dark')

        window.getEditorLanguage = filename => {
            const ext = filename.split('.').pop().toLowerCase()
            return {
                js: 'javascript', jsx: 'javascript',
                ts: 'typescript', tsx: 'typescript',
                html: 'html', htm: 'html',
                css: 'css', scss: 'scss', less: 'less',
                json: 'json', md: 'markdown',
                py: 'python', xml: 'xml', svg: 'xml',
                sql: 'sql', sh: 'shell', bash: 'shell',
                yaml: 'yaml', yml: 'yaml', php: 'php',
                c: 'c', cpp: 'cpp', h: 'c',
                cs: 'csharp', java: 'java',
                go: 'go', rs: 'rust', txt: 'plaintext',
            }[ext] || 'plaintext'
        }

        const n = '\n', t = '\t'

        const htmlItems = [
            { label: '<a>',          type: 'html',    detail: 'anchor link',        insert: '<a href="">§</a>' },
            { label: '<abbr>',       type: 'html',    detail: 'abbreviation',       insert: '<abbr title="">§</abbr>' },
            { label: '<article>',    type: 'html',    detail: 'article',            insert: '<article>' + n + t + '§' + n + '</article>' },
            { label: '<aside>',      type: 'html',    detail: 'aside',              insert: '<aside>' + n + t + '§' + n + '</aside>' },
            { label: '<audio>',      type: 'html',    detail: 'audio player',       insert: '<audio src="" controls></audio>' },
            { label: '<b>',          type: 'html',    detail: 'bold',               insert: '<b>§</b>' },
            { label: '<blockquote>', type: 'html',    detail: 'block quote',        insert: '<blockquote>' + n + t + '§' + n + '</blockquote>' },
            { label: '<body>',       type: 'html',    detail: 'body',               insert: '<body>' + n + t + '§' + n + '</body>' },
            { label: '<br>',         type: 'html',    detail: 'line break',         insert: '<br>' },
            { label: '<button>',     type: 'html',    detail: 'button',             insert: '<button type="button">§</button>' },
            { label: '<canvas>',     type: 'html',    detail: 'canvas element',     insert: '<canvas id="" width="300" height="150"></canvas>' },
            { label: '<code>',       type: 'html',    detail: 'inline code',        insert: '<code>§</code>' },
            { label: '<details>',    type: 'html',    detail: 'details/summary',    insert: '<details>' + n + t + '<summary>§</summary>' + n + t + n + '</details>' },
            { label: '<dialog>',     type: 'html',    detail: 'dialog box',         insert: '<dialog>' + n + t + '§' + n + '</dialog>' },
            { label: '<div>',        type: 'html',    detail: 'division block',     insert: '<div>§</div>' },
            { label: '<em>',         type: 'html',    detail: 'emphasis/italic',    insert: '<em>§</em>' },
            { label: '<fieldset>',   type: 'html',    detail: 'fieldset group',     insert: '<fieldset>' + n + t + '<legend>§</legend>' + n + t + n + '</fieldset>' },
            { label: '<footer>',     type: 'html',    detail: 'footer section',     insert: '<footer>' + n + t + '§' + n + '</footer>' },
            { label: '<form>',       type: 'html',    detail: 'form element',       insert: '<form action="" method="post">' + n + t + '§' + n + '</form>' },
            { label: '<h1>',         type: 'html',    detail: 'heading level 1',    insert: '<h1>§</h1>' },
            { label: '<h2>',         type: 'html',    detail: 'heading level 2',    insert: '<h2>§</h2>' },
            { label: '<h3>',         type: 'html',    detail: 'heading level 3',    insert: '<h3>§</h3>' },
            { label: '<h4>',         type: 'html',    detail: 'heading level 4',    insert: '<h4>§</h4>' },
            { label: '<h5>',         type: 'html',    detail: 'heading level 5',    insert: '<h5>§</h5>' },
            { label: '<h6>',         type: 'html',    detail: 'heading level 6',    insert: '<h6>§</h6>' },
            { label: '<head>',       type: 'html',    detail: 'document head',      insert: '<head>' + n + t + '§' + n + '</head>' },
            { label: '<header>',     type: 'html',    detail: 'header section',     insert: '<header>' + n + t + '§' + n + '</header>' },
            { label: '<hr>',         type: 'html',    detail: 'horizontal rule',    insert: '<hr>' },
            { label: '<html>',       type: 'html',    detail: 'html root element',  insert: '<html lang="en">' + n + t + '§' + n + '</html>' },
            { label: '<i>',          type: 'html',    detail: 'italic text',        insert: '<i>§</i>' },
            { label: '<iframe>',     type: 'html',    detail: 'inline frame',       insert: '<iframe src="" title="">§</iframe>' },
            { label: '<img>',        type: 'html',    detail: 'image element',      insert: '<img src="" alt="">' },
            { label: '<input>',      type: 'html',    detail: 'input field',        insert: '<input type="text" name="" placeholder="">' },
            { label: '<label>',      type: 'html',    detail: 'form label',         insert: '<label for="">§</label>' },
            { label: '<li>',         type: 'html',    detail: 'list item',          insert: '<li>§</li>' },
            { label: '<link>',       type: 'html',    detail: 'stylesheet link',    insert: '<link rel="stylesheet" href="">' },
            { label: '<main>',       type: 'html',    detail: 'main content area',  insert: '<main>' + n + t + '§' + n + '</main>' },
            { label: '<mark>',       type: 'html',    detail: 'highlighted text',   insert: '<mark>§</mark>' },
            { label: '<meta>',       type: 'html',    detail: 'metadata tag',       insert: '<meta name="" content="">' },
            { label: '<nav>',        type: 'html',    detail: 'navigation links',   insert: '<nav>' + n + t + '§' + n + '</nav>' },
            { label: '<ol>',         type: 'html',    detail: 'ordered list',       insert: '<ol>' + n + t + '<li>§</li>' + n + '</ol>' },
            { label: '<option>',     type: 'html',    detail: 'select option',      insert: '<option value="">§</option>' },
            { label: '<p>',          type: 'html',    detail: 'paragraph',          insert: '<p>§</p>' },
            { label: '<pre>',        type: 'html',    detail: 'preformatted text',  insert: '<pre>§</pre>' },
            { label: '<script>',     type: 'html',    detail: 'script tag',         insert: '<script src=""></script>' },
            { label: '<section>',    type: 'html',    detail: 'page section',       insert: '<section>' + n + t + '§' + n + '</section>' },
            { label: '<select>',     type: 'html',    detail: 'dropdown select',    insert: '<select name="">' + n + t + '<option value="">§</option>' + n + '</select>' },
            { label: '<span>',       type: 'html',    detail: 'inline container',   insert: '<span>§</span>' },
            { label: '<strong>',     type: 'html',    detail: 'strong/bold text',   insert: '<strong>§</strong>' },
            { label: '<style>',      type: 'html',    detail: 'embedded styles',    insert: '<style>' + n + t + '§' + n + '</style>' },
            { label: '<table>',      type: 'html',    detail: 'table element',      insert: '<table>' + n + t + '<thead><tr><th>§</th></tr></thead>' + n + t + '<tbody><tr><td>§</td></tr></tbody>' + n + '</table>' },
            { label: '<td>',         type: 'html',    detail: 'table data cell',    insert: '<td>§</td>' },
            { label: '<textarea>',   type: 'html',    detail: 'multiline input',    insert: '<textarea name="" rows="4">§</textarea>' },
            { label: '<th>',         type: 'html',    detail: 'table header cell',  insert: '<th>§</th>' },
            { label: '<title>',      type: 'html',    detail: 'page title',         insert: '<title>§</title>' },
            { label: '<tr>',         type: 'html',    detail: 'table row',          insert: '<tr>' + n + t + '<td>§</td>' + n + '</tr>' },
            { label: '<ul>',         type: 'html',    detail: 'unordered list',     insert: '<ul>' + n + t + '<li>§</li>' + n + '</ul>' },
            { label: '<video>',      type: 'html',    detail: 'video player',       insert: '<video src="" controls></video>' },
            { label: '<address>',    type: 'html',    detail: 'contact address',    insert: '<address>' + n + t + '§' + n + '</address>' },
            { label: '<area>',       type: 'html',    detail: 'image map area',     insert: '<area shape="" coords="" href="" alt="">' },
            { label: '<base>',       type: 'html',    detail: 'base URL',           insert: '<base href="">' },
            { label: '<bdi>',        type: 'html',    detail: 'bidi isolate',       insert: '<bdi>§</bdi>' },
            { label: '<bdo>',        type: 'html',    detail: 'bidi override',      insert: '<bdo dir="ltr">§</bdo>' },
            { label: '<caption>',    type: 'html',    detail: 'table caption',      insert: '<caption>§</caption>' },
            { label: '<cite>',       type: 'html',    detail: 'citation',           insert: '<cite>§</cite>' },
            { label: '<col>',        type: 'html',    detail: 'table column',       insert: '<col span="1">' },
            { label: '<colgroup>',   type: 'html',    detail: 'column group',       insert: '<colgroup>' + n + t + '<col>' + n + '</colgroup>' },
            { label: '<data>',       type: 'html',    detail: 'data element',       insert: '<data value="">§</data>' },
            { label: '<datalist>',   type: 'html',    detail: 'datalist',           insert: '<datalist id="">' + n + t + '<option value="">' + n + '</datalist>' },
            { label: '<dd>',         type: 'html',    detail: 'description detail', insert: '<dd>§</dd>' },
            { label: '<del>',        type: 'html',    detail: 'deleted text',       insert: '<del>§</del>' },
            { label: '<dfn>',        type: 'html',    detail: 'definition',         insert: '<dfn>§</dfn>' },
            { label: '<dt>',         type: 'html',    detail: 'description term',   insert: '<dt>§</dt>' },
            { label: '<figure>',     type: 'html',    detail: 'figure + caption',   insert: '<figure>' + n + t + '§' + n + t + '<figcaption></figcaption>' + n + '</figure>' },
            { label: '<figcaption>', type: 'html',    detail: 'figure caption',     insert: '<figcaption>§</figcaption>' },
            { label: '<ins>',        type: 'html',    detail: 'inserted text',      insert: '<ins>§</ins>' },
            { label: '<kbd>',        type: 'html',    detail: 'keyboard input',     insert: '<kbd>§</kbd>' },
            { label: '<legend>',     type: 'html',    detail: 'fieldset legend',    insert: '<legend>§</legend>' },
            { label: '<map>',        type: 'html',    detail: 'image map',          insert: '<map name="">' + n + t + '§' + n + '</map>' },
            { label: '<meter>',      type: 'html',    detail: 'scalar gauge',       insert: '<meter min="0" max="100" value="§"></meter>' },
            { label: '<noscript>',   type: 'html',    detail: 'no script fallback', insert: '<noscript>§</noscript>' },
            { label: '<object>',     type: 'html',    detail: 'embedded object',    insert: '<object data="" type="">§</object>' },
            { label: '<output>',     type: 'html',    detail: 'output result',      insert: '<output name="" for="">§</output>' },
            { label: '<param>',      type: 'html',    detail: 'object parameter',   insert: '<param name="" value="">' },
            { label: '<picture>',    type: 'html',    detail: 'responsive image',   insert: '<picture>' + n + t + '<source srcset="" media="">' + n + t + '<img src="" alt="§">' + n + '</picture>' },
            { label: '<progress>',   type: 'html',    detail: 'progress bar',       insert: '<progress value="§" max="100"></progress>' },
            { label: '<q>',          type: 'html',    detail: 'inline quote',       insert: '<q>§</q>' },
            { label: '<rp>',         type: 'html',    detail: 'ruby fallback',      insert: '<rp>§</rp>' },
            { label: '<rt>',         type: 'html',    detail: 'ruby text',          insert: '<rt>§</rt>' },
            { label: '<ruby>',       type: 'html',    detail: 'ruby annotation',    insert: '<ruby>§<rt></rt></ruby>' },
            { label: '<s>',          type: 'html',    detail: 'strikethrough',      insert: '<s>§</s>' },
            { label: '<samp>',       type: 'html',    detail: 'sample output',      insert: '<samp>§</samp>' },
            { label: '<source>',     type: 'html',    detail: 'media source',       insert: '<source src="" type="">' },
            { label: '<sub>',        type: 'html',    detail: 'subscript',          insert: '<sub>§</sub>' },
            { label: '<sup>',        type: 'html',    detail: 'superscript',        insert: '<sup>§</sup>' },
            { label: '<svg>',        type: 'html',    detail: 'SVG container',      insert: '<svg xmlns="http://www.w3.org/2000/svg" width="§" height="" viewBox="">' + n + t + n + '</svg>' },
            { label: '<template>',   type: 'html',    detail: 'html template',      insert: '<template>' + n + t + '§' + n + '</template>' },
            { label: '<tfoot>',      type: 'html',    detail: 'table footer',       insert: '<tfoot>' + n + t + '<tr><td>§</td></tr>' + n + '</tfoot>' },
            { label: '<thead>',      type: 'html',    detail: 'table head',         insert: '<thead>' + n + t + '<tr><th>§</th></tr>' + n + '</thead>' },
            { label: '<time>',       type: 'html',    detail: 'time element',       insert: '<time datetime="">§</time>' },
            { label: '<track>',      type: 'html',    detail: 'media track',        insert: '<track src="" kind="subtitles" srclang="en" label="">' },
            { label: '<u>',          type: 'html',    detail: 'underline',          insert: '<u>§</u>' },
            { label: '<var>',        type: 'html',    detail: 'variable',           insert: '<var>§</var>' },
            { label: '<wbr>',        type: 'html',    detail: 'word break',         insert: '<wbr>' },
        ]

        const pyItems = [
            { label: 'def',     type: 'method',  detail: 'define a function',        insert: 'def name(args):' + n + t },
            { label: 'class',   type: 'class',   detail: 'define a class',           insert: 'class Name:' + n + t + 'def __init__(self):' + n + t + t },
            { label: 'if',      type: 'keyword', detail: 'if condition',             insert: 'if condition:' + n + t },
            { label: 'elif',    type: 'keyword', detail: 'else if condition',        insert: 'elif condition:' + n + t },
            { label: 'else',    type: 'keyword', detail: 'else block',               insert: 'else:' + n + t },
            { label: 'for',     type: 'keyword', detail: 'for loop',                 insert: 'for item in iterable:' + n + t },
            { label: 'while',   type: 'keyword', detail: 'while loop',               insert: 'while condition:' + n + t },
            { label: 'try',     type: 'keyword', detail: 'try/except block',         insert: 'try:' + n + t + n + 'except Exception as e:' + n + t },
            { label: 'with',    type: 'keyword', detail: 'context manager',          insert: 'with expr as var:' + n + t },
            { label: 'import',  type: 'module',  detail: 'import a module',          insert: 'import ' },
            { label: 'from',    type: 'module',  detail: 'import from module',       insert: 'from module import name' },
            { label: 'print',   type: 'fn',      detail: 'print to stdout',          insert: 'print()' },
            { label: 'return',  type: 'keyword', detail: 'return a value',           insert: 'return ' },
            { label: 'lambda',  type: 'fn',      detail: 'anonymous function',       insert: 'lambda args: expr' },
            { label: 'raise',   type: 'keyword', detail: 'raise an exception',       insert: 'raise Exception("message")' },
            { label: 'ifmain',  type: 'snippet', detail: 'if __name__ == "__main__"',insert: 'if __name__ == "__main__":' + n + t },
            { label: 'match',   type: 'keyword', detail: 'match/case (3.10+)',       insert: 'match §:' + n + t + 'case val:' + n + t + t + 'pass' + n + t + 'case _:' + n + t + t + 'pass' },
            { label: 'global',  type: 'keyword', detail: 'global variable',          insert: 'global §' },
            { label: 'yield',   type: 'keyword', detail: 'yield value',              insert: 'yield §' },
            { label: 'gen',     type: 'method',  detail: 'generator function',       insert: 'def §():' + n + t + 'yield ' },
            { label: 'async',   type: 'method',  detail: 'async function',           insert: 'async def §():' + n + t + 'await ' },
            { label: 'open',    type: 'fn',      detail: 'open file',                insert: "with open('§', 'r') as f:" + n + t + 'content = f.read()' },
            { label: 'list',    type: 'snippet', detail: 'list comprehension',       insert: '[§ for item in iterable]' },
            { label: 'dict',    type: 'snippet', detail: 'dict comprehension',       insert: '{k: v for k, v in §.items()}' },
            { label: 'lam',     type: 'fn',      detail: 'lambda shorthand',         insert: 'lambda §: ' },
            { label: 'enum',    type: 'class',   detail: 'Enum class',               insert: 'from enum import Enum' + n + n + 'class §(Enum):' + n + t + 'VALUE = 1' },
            { label: 'dataclass',type: 'class',  detail: 'dataclass',                insert: 'from dataclasses import dataclass' + n + n + '@dataclass' + n + 'class §:' + n + t + 'field: str' },
            { label: 'assert',  type: 'keyword', detail: 'assert statement',         insert: 'assert §, "message"' },
            { label: 'pass',    type: 'keyword', detail: 'pass',                     insert: 'pass' },
            { label: 'break',   type: 'keyword', detail: 'break loop',               insert: 'break' },
            { label: 'continue',type: 'keyword', detail: 'continue loop',            insert: 'continue' },
            { label: 'del',     type: 'keyword', detail: 'delete variable',          insert: 'del §' },
            { label: 'super',   type: 'fn',      detail: 'super()',                  insert: 'super().__init__(§)' },
            { label: 'prop',    type: 'snippet', detail: '@property',                insert: '@property' + n + 'def §(self):' + n + t + 'return self._' },
            { label: 'format',  type: 'fn',      detail: 'f-string',                 insert: 'f"§{}"' },
            { label: 'join',    type: 'fn',      detail: 'str join',                 insert: '"§".join(iterable)' },
            { label: 'split',   type: 'fn',      detail: 'str split',                insert: '§.split("")' },
            { label: 'strip',   type: 'fn',      detail: 'str strip',                insert: '§.strip()' },
            { label: 'len',     type: 'fn',      detail: 'len()',                    insert: 'len(§)' },
            { label: 'range',   type: 'fn',      detail: 'range()',                  insert: 'range(§)' },
            { label: 'zip',     type: 'fn',      detail: 'zip iterables',            insert: 'zip(§)' },
            { label: 'map',     type: 'fn',      detail: 'map function',             insert: 'map(§, iterable)' },
            { label: 'filter',  type: 'fn',      detail: 'filter function',          insert: 'filter(§, iterable)' },
            { label: 'sorted',  type: 'fn',      detail: 'sorted()',                 insert: 'sorted(§)' },
            { label: 'enumerate',type: 'fn',     detail: 'enumerate()',              insert: 'enumerate(§)' },
        ]

        const jsItems = [
            { label: 'cl',      type: 'fn',      detail: 'console.log()',            insert: 'console.log()' },
            { label: 'fn',      type: 'method',  detail: 'named function',           insert: 'function name(args) {' + n + t + n + '}' },
            { label: 'afn',     type: 'method',  detail: 'arrow function',           insert: 'const name = (args) => {' + n + t + n + '}' },
            { label: 'class',   type: 'class',   detail: 'ES6 class',                insert: 'class Name {' + n + t + 'constructor() {' + n + t + t + n + t + '}' + n + '}' },
            { label: 'if',      type: 'keyword', detail: 'if statement',             insert: 'if (condition) {' + n + t + n + '}' },
            { label: 'for',     type: 'keyword', detail: 'for loop',                 insert: 'for (let i = 0; i < n; i++) {' + n + t + n + '}' },
            { label: 'forof',   type: 'keyword', detail: 'for...of loop',            insert: 'for (const item of iterable) {' + n + t + n + '}' },
            { label: 'forEach', type: 'method',  detail: 'array forEach',            insert: 'arr.forEach((item) => {' + n + t + n + '})' },
            { label: 'map',     type: 'method',  detail: 'array map',                insert: 'arr.map((item) => )' },
            { label: 'filter',  type: 'method',  detail: 'array filter',             insert: 'arr.filter((item) => )' },
            { label: 'async',   type: 'method',  detail: 'async function',           insert: 'async function name() {' + n + t + n + '}' },
            { label: 'try',     type: 'keyword', detail: 'try/catch block',          insert: 'try {' + n + t + n + '} catch (e) {' + n + t + n + '}' },
            { label: 'imp',     type: 'module',  detail: 'ES6 import',               insert: "import name from 'module'" },
            { label: 'req',     type: 'module',  detail: 'CommonJS require',         insert: "const name = require('module')" },
            { label: 'qs',      type: 'fn',      detail: 'querySelector',            insert: 'document.querySelector("")' },
            { label: 'qsa',     type: 'fn',      detail: 'querySelectorAll',         insert: 'document.querySelectorAll("")' },
            { label: 'ael',     type: 'event',   detail: 'addEventListener',         insert: 'el.addEventListener("click", (e) => {' + n + t + n + '})' },
            { label: 'promise', type: 'method',  detail: 'new Promise',              insert: 'new Promise((resolve, reject) => {' + n + t + n + '})' },
            { label: 'sw',      type: 'keyword', detail: 'switch statement',         insert: 'switch (§) {' + n + t + 'case val:' + n + t + t + 'break' + n + t + 'default:' + n + t + t + n + '}' },
            { label: 'do',      type: 'keyword', detail: 'do...while loop',          insert: 'do {' + n + t + '§' + n + '} while (condition)' },
            { label: 'iife',    type: 'snippet', detail: 'immediately invoked fn',   insert: '(function() {' + n + t + '§' + n + '})()' },
            { label: 'aiife',   type: 'snippet', detail: 'async IIFE',               insert: '(async function() {' + n + t + '§' + n + '})()' },
            { label: 'throw',   type: 'keyword', detail: 'throw error',              insert: 'throw new Error("§")' },
            { label: 'typeof',  type: 'keyword', detail: 'typeof check',             insert: "typeof §" },
            { label: 'inst',    type: 'keyword', detail: 'instanceof check',         insert: '§ instanceof ' },
            { label: 'null',    type: 'keyword', detail: 'null value',               insert: 'null' },
            { label: 'undef',   type: 'keyword', detail: 'undefined check',          insert: 'undefined' },
            { label: 'str',     type: 'snippet', detail: 'template string',          insert: '`§`' },
            { label: 'obj',     type: 'snippet', detail: 'object literal',           insert: 'const § = {}' },
            { label: 'arr',     type: 'snippet', detail: 'array literal',            insert: 'const § = []' },
            { label: 'spr',     type: 'snippet', detail: 'spread operator',          insert: '...§' },
            { label: 'dest',    type: 'snippet', detail: 'destructure object',       insert: 'const { § } = obj' },
            { label: 'desta',   type: 'snippet', detail: 'destructure array',        insert: 'const [ § ] = arr' },
            { label: 'find',    type: 'method',  detail: 'array find',               insert: '§.find((item) => )' },
            { label: 'reduce',  type: 'method',  detail: 'array reduce',             insert: '§.reduce((acc, item) => acc, initial)' },
            { label: 'some',    type: 'method',  detail: 'array some',               insert: '§.some((item) => )' },
            { label: 'every',   type: 'method',  detail: 'array every',              insert: '§.every((item) => )' },
            { label: 'flat',    type: 'method',  detail: 'array flat',               insert: '§.flat()' },
            { label: 'await',   type: 'keyword', detail: 'await promise',            insert: 'await §' },
            { label: 'json',    type: 'fn',      detail: 'JSON stringify',           insert: 'JSON.stringify(§)' },
            { label: 'parse',   type: 'fn',      detail: 'JSON parse',               insert: 'JSON.parse(§)' },
            { label: 'set',     type: 'snippet', detail: 'new Set',                  insert: 'new Set(§)' },
            { label: 'map',     type: 'snippet', detail: 'new Map',                  insert: 'new Map(§)' },
            { label: 'local',   type: 'fn',      detail: 'localStorage getItem',    insert: 'localStorage.getItem("§")' },
            { label: 'ls',      type: 'fn',      detail: 'localStorage setItem',    insert: 'localStorage.setItem("§", value)' },
            { label: 'timeout', type: 'fn',      detail: 'setTimeout',               insert: 'setTimeout(() => {' + n + t + '§' + n + '}, 1000)' },
            { label: 'interval',type: 'fn',      detail: 'setInterval',              insert: 'setInterval(() => {' + n + t + '§' + n + '}, 1000)' },
            { label: 'fetch',   type: 'fn',      detail: 'fetch request',            insert: 'fetch("§")' + n + t + '.then(res => res.json())' + n + t + '.then(data => console.log(data))' + n + t + '.catch(err => console.error(err))' },
        ]

        const goItems = [
            { label: 'func',    type: 'method',  detail: 'function',              insert: 'func §() {' + n + t + n + '}' },
            { label: 'main',    type: 'method',  detail: 'main function',         insert: 'func main() {' + n + t + '§' + n + '}' },
            { label: 'var',     type: 'keyword', detail: 'variable',              insert: 'var § type' },
            { label: 'const',   type: 'keyword', detail: 'constant',              insert: 'const § = ' },
            { label: 'if',      type: 'keyword', detail: 'if statement',          insert: 'if § {' + n + t + n + '}' },
            { label: 'else',    type: 'keyword', detail: 'else block',            insert: 'else {' + n + t + '§' + n + '}' },
            { label: 'for',     type: 'keyword', detail: 'for loop',              insert: 'for § {' + n + t + n + '}' },
            { label: 'fori',    type: 'keyword', detail: 'for i loop',            insert: 'for i := 0; i < §; i++ {' + n + t + n + '}' },
            { label: 'range',   type: 'keyword', detail: 'for range',             insert: 'for §, v := range collection {' + n + t + n + '}' },
            { label: 'switch',  type: 'keyword', detail: 'switch statement',      insert: 'switch § {' + n + t + 'case val:' + n + t + t + n + t + 'default:' + n + t + t + n + '}' },
            { label: 'struct',  type: 'class',   detail: 'struct',                insert: 'type § struct {' + n + t + n + '}' },
            { label: 'iface',   type: 'class',   detail: 'interface',             insert: 'type § interface {' + n + t + n + '}' },
            { label: 'import',  type: 'module',  detail: 'import',                insert: 'import (' + n + t + '"§"' + n + ')' },
            { label: 'pkg',     type: 'module',  detail: 'package',               insert: 'package §' },
            { label: 'err',     type: 'snippet', detail: 'error check',           insert: 'if err != nil {' + n + t + 'return §err' + n + '}' },
            { label: 'fmt',     type: 'fn',      detail: 'fmt.Println',           insert: 'fmt.Println(§)' },
            { label: 'fmtf',    type: 'fn',      detail: 'fmt.Printf',            insert: 'fmt.Printf("§\n")' },
            { label: 'make',    type: 'fn',      detail: 'make slice/map',        insert: 'make(§)' },
            { label: 'append',  type: 'fn',      detail: 'append to slice',       insert: 'append(§, val)' },
            { label: 'goroutine',type:'snippet', detail: 'goroutine',             insert: 'go func() {' + n + t + '§' + n + '}()' },
            { label: 'chan',     type: 'snippet', detail: 'channel',               insert: 'make(chan §)' },
            { label: 'defer',   type: 'keyword', detail: 'defer call',            insert: 'defer §()' },
            { label: 'return',  type: 'keyword', detail: 'return',                insert: 'return §' },
            { label: 'nil',     type: 'keyword', detail: 'nil',                   insert: 'nil' },
            { label: 'map',     type: 'snippet', detail: 'map type',              insert: 'map[§]value{}' },
            { label: 'slice',   type: 'snippet', detail: 'slice',                 insert: '[]§{}' },
        ]

        const phpItems = [
            { label: 'echo',    type: 'fn',      detail: 'echo output',           insert: 'echo §;' },
            { label: 'fn',      type: 'method',  detail: 'function',              insert: 'function §() {' + n + t + n + '}' },
            { label: 'class',   type: 'class',   detail: 'class',                 insert: 'class § {' + n + t + 'public function __construct() {' + n + t + t + n + t + '}' + n + '}' },
            { label: 'if',      type: 'keyword', detail: 'if statement',          insert: 'if (§) {' + n + t + n + '}' },
            { label: 'else',    type: 'keyword', detail: 'else block',            insert: 'else {' + n + t + '§' + n + '}' },
            { label: 'elseif',  type: 'keyword', detail: 'else if',               insert: 'elseif (§) {' + n + t + n + '}' },
            { label: 'for',     type: 'keyword', detail: 'for loop',              insert: 'for ($i = 0; $i < §; $i++) {' + n + t + n + '}' },
            { label: 'foreach', type: 'keyword', detail: 'foreach loop',          insert: 'foreach (§ as $key => $value) {' + n + t + n + '}' },
            { label: 'while',   type: 'keyword', detail: 'while loop',            insert: 'while (§) {' + n + t + n + '}' },
            { label: 'switch',  type: 'keyword', detail: 'switch',                insert: 'switch (§) {' + n + t + 'case val:' + n + t + t + 'break;' + n + t + 'default:' + n + t + t + n + '}' },
            { label: 'try',     type: 'keyword', detail: 'try/catch',             insert: 'try {' + n + t + '§' + n + '} catch (Exception $e) {' + n + t + n + '}' },
            { label: 'arr',     type: 'snippet', detail: 'array',                 insert: '$§ = [];' },
            { label: 'req',     type: 'module',  detail: 'require_once',          insert: "require_once '§';" },
            { label: 'inc',     type: 'module',  detail: 'include_once',          insert: "include_once '§';" },
            { label: 'var',     type: 'keyword', detail: 'variable',              insert: '$§ = ' },
            { label: 'print',   type: 'fn',      detail: 'print_r',               insert: 'print_r(§);' },
            { label: 'var_dump',type: 'fn',      detail: 'var_dump',              insert: 'var_dump(§);' },
            { label: 'isset',   type: 'fn',      detail: 'isset check',           insert: 'isset(§)' },
            { label: 'empty',   type: 'fn',      detail: 'empty check',           insert: 'empty(§)' },
            { label: 'return',  type: 'keyword', detail: 'return',                insert: 'return §;' },
            { label: 'php',     type: 'snippet', detail: 'PHP open tag',          insert: '<?php' + n + '§' },
        ]

        const javaItems = [
            { label: 'class',   type: 'class',   detail: 'class',                 insert: 'public class § {' + n + t + n + '}' },
            { label: 'main',    type: 'method',  detail: 'main method',           insert: 'public static void main(String[] args) {' + n + t + '§' + n + '}' },
            { label: 'fn',      type: 'method',  detail: 'method',                insert: 'public void §() {' + n + t + n + '}' },
            { label: 'fnr',     type: 'method',  detail: 'method with return',    insert: 'public § name() {' + n + t + 'return ;' + n + '}' },
            { label: 'if',      type: 'keyword', detail: 'if statement',          insert: 'if (§) {' + n + t + n + '}' },
            { label: 'else',    type: 'keyword', detail: 'else block',            insert: 'else {' + n + t + '§' + n + '}' },
            { label: 'for',     type: 'keyword', detail: 'for loop',              insert: 'for (int i = 0; i < §; i++) {' + n + t + n + '}' },
            { label: 'foreach', type: 'keyword', detail: 'enhanced for',          insert: 'for (§ item : collection) {' + n + t + n + '}' },
            { label: 'while',   type: 'keyword', detail: 'while loop',            insert: 'while (§) {' + n + t + n + '}' },
            { label: 'switch',  type: 'keyword', detail: 'switch',                insert: 'switch (§) {' + n + t + 'case val:' + n + t + t + 'break;' + n + t + 'default:' + n + t + t + n + '}' },
            { label: 'try',     type: 'keyword', detail: 'try/catch',             insert: 'try {' + n + t + '§' + n + '} catch (Exception e) {' + n + t + n + '}' },
            { label: 'sout',    type: 'fn',      detail: 'System.out.println',    insert: 'System.out.println(§);' },
            { label: 'syserr',  type: 'fn',      detail: 'System.err.println',    insert: 'System.err.println(§);' },
            { label: 'import',  type: 'module',  detail: 'import',                insert: 'import §;' },
            { label: 'new',     type: 'snippet', detail: 'new object',            insert: 'new §()' },
            { label: 'list',    type: 'snippet', detail: 'ArrayList',             insert: 'List<§> list = new ArrayList<>();' },
            { label: 'map',     type: 'snippet', detail: 'HashMap',               insert: 'Map<§, > map = new HashMap<>();' },
            { label: 'iface',   type: 'class',   detail: 'interface',             insert: 'public interface § {' + n + t + n + '}' },
            { label: 'enum',    type: 'class',   detail: 'enum',                  insert: 'public enum § {' + n + t + n + '}' },
            { label: 'return',  type: 'keyword', detail: 'return',                insert: 'return §;' },
            { label: 'null',    type: 'keyword', detail: 'null',                  insert: 'null' },
            { label: 'override',type: 'snippet', detail: '@Override',             insert: '@Override' + n + 'public void §() {' + n + t + n + '}' },
            { label: 'lambda',  type: 'fn',      detail: 'lambda expression',     insert: '(§) -> ' },
        ]

        const cItems = [
            { label: 'main',    type: 'method',  detail: 'main function',         insert: 'int main() {' + n + t + '§' + n + t + 'return 0;' + n + '}' },
            { label: 'fn',      type: 'method',  detail: 'function',              insert: 'void §() {' + n + t + n + '}' },
            { label: 'if',      type: 'keyword', detail: 'if statement',          insert: 'if (§) {' + n + t + n + '}' },
            { label: 'else',    type: 'keyword', detail: 'else block',            insert: 'else {' + n + t + '§' + n + '}' },
            { label: 'for',     type: 'keyword', detail: 'for loop',              insert: 'for (int i = 0; i < §; i++) {' + n + t + n + '}' },
            { label: 'while',   type: 'keyword', detail: 'while loop',            insert: 'while (§) {' + n + t + n + '}' },
            { label: 'switch',  type: 'keyword', detail: 'switch',                insert: 'switch (§) {' + n + t + 'case val:' + n + t + t + 'break;' + n + t + 'default:' + n + t + t + n + '}' },
            { label: 'struct',  type: 'class',   detail: 'struct',                insert: 'struct § {' + n + t + n + '};' },
            { label: 'printf',  type: 'fn',      detail: 'printf',                insert: 'printf("§\n");' },
            { label: 'scanf',   type: 'fn',      detail: 'scanf',                 insert: 'scanf("§", &var);' },
            { label: 'include', type: 'module',  detail: '#include',              insert: '#include <§>' },
            { label: 'define',  type: 'snippet', detail: '#define',               insert: '#define § value' },
            { label: 'return',  type: 'keyword', detail: 'return',                insert: 'return §;' },
            { label: 'nullptr', type: 'keyword', detail: 'nullptr (C++)',         insert: 'nullptr' },
            { label: 'class',   type: 'class',   detail: 'class (C++)',           insert: 'class § {' + n + 'public:' + n + t + n + '};' },
            { label: 'cout',    type: 'fn',      detail: 'cout (C++)',            insert: 'std::cout << § << std::endl;' },
            { label: 'cin',     type: 'fn',      detail: 'cin (C++)',             insert: 'std::cin >> §;' },
            { label: 'vector',  type: 'snippet', detail: 'vector (C++)',          insert: 'std::vector<§> vec;' },
            { label: 'auto',    type: 'keyword', detail: 'auto type (C++)',       insert: 'auto § = ' },
            { label: 'try',     type: 'keyword', detail: 'try/catch (C++)',       insert: 'try {' + n + t + '§' + n + '} catch (const std::exception& e) {' + n + t + n + '}' },
        ]

        const sqlItems = [
            { label: 'sel',     type: 'keyword', detail: 'SELECT',                insert: 'SELECT § FROM table;' },
            { label: 'select',  type: 'keyword', detail: 'SELECT *',              insert: 'SELECT * FROM §;' },
            { label: 'selw',    type: 'snippet', detail: 'SELECT WHERE',          insert: 'SELECT * FROM § WHERE condition;' },
            { label: 'ins',     type: 'keyword', detail: 'INSERT INTO',           insert: 'INSERT INTO § (col1, col2) VALUES (val1, val2);' },
            { label: 'upd',     type: 'keyword', detail: 'UPDATE',                insert: 'UPDATE § SET col = val WHERE condition;' },
            { label: 'del',     type: 'keyword', detail: 'DELETE',                insert: 'DELETE FROM § WHERE condition;' },
            { label: 'create',  type: 'keyword', detail: 'CREATE TABLE',          insert: 'CREATE TABLE § (' + n + t + 'id INT PRIMARY KEY AUTO_INCREMENT,' + n + t + 'name VARCHAR(255)' + n + ');' },
            { label: 'drop',    type: 'keyword', detail: 'DROP TABLE',            insert: 'DROP TABLE IF EXISTS §;' },
            { label: 'alter',   type: 'keyword', detail: 'ALTER TABLE',           insert: 'ALTER TABLE § ADD COLUMN col VARCHAR(255);' },
            { label: 'join',    type: 'keyword', detail: 'INNER JOIN',            insert: 'INNER JOIN § ON a.id = b.id' },
            { label: 'ljoin',   type: 'keyword', detail: 'LEFT JOIN',             insert: 'LEFT JOIN § ON a.id = b.id' },
            { label: 'rjoin',   type: 'keyword', detail: 'RIGHT JOIN',            insert: 'RIGHT JOIN § ON a.id = b.id' },
            { label: 'where',   type: 'keyword', detail: 'WHERE clause',          insert: 'WHERE §' },
            { label: 'order',   type: 'keyword', detail: 'ORDER BY',              insert: 'ORDER BY § ASC' },
            { label: 'group',   type: 'keyword', detail: 'GROUP BY',              insert: 'GROUP BY §' },
            { label: 'having',  type: 'keyword', detail: 'HAVING',                insert: 'HAVING §' },
            { label: 'limit',   type: 'keyword', detail: 'LIMIT',                 insert: 'LIMIT §' },
            { label: 'index',   type: 'snippet', detail: 'CREATE INDEX',          insert: 'CREATE INDEX § ON table(col);' },
            { label: 'view',    type: 'snippet', detail: 'CREATE VIEW',           insert: 'CREATE VIEW § AS' + n + 'SELECT * FROM table;' },
            { label: 'trx',     type: 'snippet', detail: 'transaction',           insert: 'BEGIN;' + n + '§' + n + 'COMMIT;' },
        ]

        const bashItems = [
            { label: 'shebang', type: 'snippet', detail: 'bash shebang',          insert: '#!/bin/bash' + n + '§' },
            { label: 'if',      type: 'keyword', detail: 'if statement',          insert: 'if [ § ]; then' + n + t + n + 'fi' },
            { label: 'ife',     type: 'keyword', detail: 'if/else',               insert: 'if [ § ]; then' + n + t + n + 'else' + n + t + n + 'fi' },
            { label: 'for',     type: 'keyword', detail: 'for loop',              insert: 'for § in list; do' + n + t + n + 'done' },
            { label: 'fori',    type: 'keyword', detail: 'for i loop',            insert: 'for i in $(seq 1 §); do' + n + t + n + 'done' },
            { label: 'while',   type: 'keyword', detail: 'while loop',            insert: 'while [ § ]; do' + n + t + n + 'done' },
            { label: 'fn',      type: 'method',  detail: 'function',              insert: '§() {' + n + t + n + '}' },
            { label: 'case',    type: 'keyword', detail: 'case statement',        insert: 'case § in' + n + t + 'val)' + n + t + t + ';;' + n + t + '*)' + n + t + t + ';;' + n + 'esac' },
            { label: 'echo',    type: 'fn',      detail: 'echo',                  insert: 'echo "§"' },
            { label: 'read',    type: 'fn',      detail: 'read input',            insert: 'read -p "§" var' },
            { label: 'var',     type: 'snippet', detail: 'variable',              insert: '§=""' },
            { label: 'arr',     type: 'snippet', detail: 'array',                 insert: '§=()' },
            { label: 'export',  type: 'keyword', detail: 'export variable',       insert: 'export §=' },
            { label: 'source',  type: 'keyword', detail: 'source file',           insert: 'source §' },
            { label: 'exit',    type: 'keyword', detail: 'exit code',             insert: 'exit §' },
            { label: 'cmd',     type: 'snippet', detail: 'command substitution',  insert: '$(§)' },
            { label: 'test',    type: 'snippet', detail: 'test condition',        insert: '[ §  ]' },
            { label: 'mkdir',   type: 'fn',      detail: 'mkdir -p',              insert: 'mkdir -p §' },
            { label: 'cp',      type: 'fn',      detail: 'copy file',             insert: 'cp § dest' },
            { label: 'mv',      type: 'fn',      detail: 'move file',             insert: 'mv § dest' },
            { label: 'rm',      type: 'fn',      detail: 'remove',                insert: 'rm -rf §' },
            { label: 'grep',    type: 'fn',      detail: 'grep search',           insert: 'grep -r "§" .' },
            { label: 'find',    type: 'fn',      detail: 'find files',            insert: 'find . -name "§"' },
            { label: 'pipe',    type: 'snippet', detail: 'pipe command',          insert: '§ | ' },
            { label: 'redir',   type: 'snippet', detail: 'redirect output',       insert: '§ > output.txt' },
        ]

        const cssItems = [
            { label: 'display',     type: 'keyword', detail: 'display property',     insert: 'display: §;' },
            { label: 'flex',        type: 'snippet', detail: 'flexbox container',    insert: 'display: flex;' + n + 'align-items: §;' + n + 'justify-content: ;' },
            { label: 'grid',        type: 'snippet', detail: 'grid container',       insert: 'display: grid;' + n + 'grid-template-columns: §;' + n + 'gap: ;' },
            { label: 'position',    type: 'keyword', detail: 'position property',    insert: 'position: §;' },
            { label: 'absolute',    type: 'snippet', detail: 'absolute position',    insert: 'position: absolute;' + n + 'top: §;' + n + 'left: ;' },
            { label: 'relative',    type: 'snippet', detail: 'relative position',    insert: 'position: relative;' },
            { label: 'fixed',       type: 'snippet', detail: 'fixed position',       insert: 'position: fixed;' + n + 'top: §;' + n + 'left: ;' },
            { label: 'sticky',      type: 'snippet', detail: 'sticky position',      insert: 'position: sticky;' + n + 'top: §;' },
            { label: 'margin',      type: 'keyword', detail: 'margin shorthand',     insert: 'margin: §;' },
            { label: 'padding',     type: 'keyword', detail: 'padding shorthand',    insert: 'padding: §;' },
            { label: 'border',      type: 'keyword', detail: 'border shorthand',     insert: 'border: 1px solid §;' },
            { label: 'background',  type: 'keyword', detail: 'background shorthand', insert: 'background: §;' },
            { label: 'color',       type: 'keyword', detail: 'text color',           insert: 'color: §;' },
            { label: 'font',        type: 'snippet', detail: 'font shorthand',       insert: 'font-family: §;' + n + 'font-size: ;' + n + 'font-weight: ;' },
            { label: 'transition',  type: 'keyword', detail: 'transition',           insert: 'transition: § 0.3s ease;' },
            { label: 'animation',   type: 'snippet', detail: 'animation',            insert: 'animation: § 1s ease infinite;' },
            { label: 'keyframes',   type: 'snippet', detail: '@keyframes',           insert: '@keyframes § {' + n + t + 'from {}' + n + t + 'to {}' + n + '}' },
            { label: 'media',       type: 'snippet', detail: '@media query',         insert: '@media (max-width: §px) {' + n + t + n + '}' },
            { label: 'hover',       type: 'snippet', detail: ':hover pseudo',        insert: '&:hover {' + n + t + '§' + n + '}' },
            { label: 'before',      type: 'snippet', detail: '::before pseudo',      insert: '::before {' + n + t + 'content: "§";' + n + t + 'display: block;' + n + '}' },
            { label: 'after',       type: 'snippet', detail: '::after pseudo',       insert: '::after {' + n + t + 'content: "§";' + n + t + 'display: block;' + n + '}' },
            { label: 'root',        type: 'snippet', detail: ':root variables',      insert: ':root {' + n + t + '--§: ;' + n + '}' },
            { label: 'var',         type: 'fn',      detail: 'CSS variable',         insert: 'var(--§)' },
            { label: 'calc',        type: 'fn',      detail: 'calc()',               insert: 'calc(§)' },
            { label: 'rgba',        type: 'fn',      detail: 'rgba color',           insert: 'rgba(§, , , 1)' },
            { label: 'transform',   type: 'keyword', detail: 'transform property',   insert: 'transform: §;' },
            { label: 'translate',   type: 'snippet', detail: 'translate()',          insert: 'transform: translate(§, );' },
            { label: 'scale',       type: 'snippet', detail: 'scale()',              insert: 'transform: scale(§);' },
            { label: 'rotate',      type: 'snippet', detail: 'rotate()',             insert: 'transform: rotate(§deg);' },
            { label: 'overflow',    type: 'keyword', detail: 'overflow property',    insert: 'overflow: §;' },
            { label: 'opacity',     type: 'keyword', detail: 'opacity property',     insert: 'opacity: §;' },
            { label: 'zindex',      type: 'keyword', detail: 'z-index property',     insert: 'z-index: §;' },
            { label: 'cursor',      type: 'keyword', detail: 'cursor property',      insert: 'cursor: §;' },
            { label: 'shadow',      type: 'snippet', detail: 'box-shadow',           insert: 'box-shadow: 0 §px px rgba(0,0,0,0.2);' },
            { label: 'radius',      type: 'snippet', detail: 'border-radius',        insert: 'border-radius: §;' },
            { label: 'width',       type: 'keyword', detail: 'width property',       insert: 'width: §;' },
            { label: 'height',      type: 'keyword', detail: 'height property',      insert: 'height: §;' },
            { label: 'minw',        type: 'snippet', detail: 'min-width',            insert: 'min-width: §;' },
            { label: 'maxw',        type: 'snippet', detail: 'max-width',            insert: 'max-width: §;' },
            { label: 'minh',        type: 'snippet', detail: 'min-height',           insert: 'min-height: §;' },
            { label: 'maxh',        type: 'snippet', detail: 'max-height',           insert: 'max-height: §;' },
            { label: 'gap',         type: 'keyword', detail: 'gap property',         insert: 'gap: §;' },
            { label: 'outline',     type: 'keyword', detail: 'outline property',     insert: 'outline: §;' },
            { label: 'list',        type: 'snippet', detail: 'list-style none',      insert: 'list-style: none;' },
            { label: 'reset',       type: 'snippet', detail: 'box-sizing reset',     insert: '*, *::before, *::after {' + n + t + 'box-sizing: border-box;' + n + t + 'margin: 0;' + n + t + 'padding: 0;' + n + '}' },
            { label: 'center',      type: 'snippet', detail: 'flex center',          insert: 'display: flex;' + n + 'align-items: center;' + n + 'justify-content: center;' },
            { label: 'cover',       type: 'snippet', detail: 'background cover',     insert: 'background-size: cover;' + n + 'background-position: center;' + n + 'background-repeat: no-repeat;' },
            { label: 'truncate',    type: 'snippet', detail: 'text truncate',        insert: 'overflow: hidden;' + n + 'white-space: nowrap;' + n + 'text-overflow: ellipsis;' },
            { label: 'scroll',      type: 'snippet', detail: 'custom scrollbar',     insert: '&::-webkit-scrollbar { width: §px; }' + n + '&::-webkit-scrollbar-thumb { background: ; border-radius: px; }' },
            { label: 'import',      type: 'module',  detail: '@import',              insert: "@import '§';" },
        ]

        const TYPE_META = {
            html:    { icon: 'codicon-symbol-field',    color: '#f0a070', label: 'Field'    },
            file:    { icon: 'codicon-symbol-file',     color: '#cccccc', label: 'File'     },
            method:  { icon: 'codicon-symbol-method',   color: '#b180d7', label: 'Method'   },
            class:   { icon: 'codicon-symbol-class',    color: '#ee9d28', label: 'Class'    },
            keyword: { icon: 'codicon-symbol-keyword',  color: '#569cd6', label: 'Keyword'  },
            module:  { icon: 'codicon-symbol-module',   color: '#4ec9b0', label: 'Module'   },
            fn:      { icon: 'codicon-symbol-function', color: '#dcdcaa', label: 'Function' },
            event:   { icon: 'codicon-symbol-event',    color: '#e2c08d', label: 'Event'    },
            snippet: { icon: 'codicon-symbol-snippet',  color: '#9cdcfe', label: 'Snippet'  },
        }

        const ac = document.getElementById('ac')
        let acList = [], acIdx = 0, acStart = 1

        function acHide() {
            ac.style.display = 'none'
            acList = []; acIdx = 0
        }

        function acShow(items, x, y, startCol) {
            if (!items.length) { acHide(); return }
            acList = items; acIdx = 0; acStart = startCol
            ac.innerHTML = ''
            items.forEach((item, i) => {
                const meta = TYPE_META[item.type] || TYPE_META.snippet
                const row = document.createElement('div')
                row.className = 'ac-row' + (i === 0 ? ' active' : '')

                const iconEl = document.createElement('span')
                iconEl.className = 'ac-icon'
                iconEl.innerHTML = '<i class="codicon ' + meta.icon + '" style="color:' + meta.color + '"></i>'

                const labelEl = document.createElement('span')
                labelEl.className = 'ac-label'
                labelEl.textContent = item.label

                const detailEl = document.createElement('span')
                detailEl.className = 'ac-detail'
                detailEl.textContent = item.detail

                const typeEl = document.createElement('span')
                typeEl.className = 'ac-type'
                typeEl.textContent = meta.label

                row.appendChild(iconEl)
                row.appendChild(labelEl)
                row.appendChild(detailEl)
                row.appendChild(typeEl)
                row.onmousedown = e => { e.preventDefault(); acApply(i) }
                ac.appendChild(row)
            })
            const dropW = 480, dropH = Math.min(items.length * 22 + 2, 300)
            const fx = x + dropW > window.innerWidth ? window.innerWidth - dropW - 4 : x
            const fy = y + dropH > window.innerHeight ? y - dropH - 22 : y
            ac.style.left = fx + 'px'
            ac.style.top = fy + 'px'
            ac.style.display = 'block'
        }

        function acSetActive(i) {
            const rows = ac.querySelectorAll('.ac-row')
            rows.forEach(r => r.classList.remove('active'))
            acIdx = Math.max(0, Math.min(i, acList.length - 1))
            rows[acIdx].classList.add('active')
            rows[acIdx].scrollIntoView({ block: 'nearest' })
        }

        function acApply(i) {
            const item = acList[i]; if (!item) return
            const ed = window.monacoEditor
            const pos = ed.getPosition()
            const hasCursor = item.insert.includes('§')
            const text = item.insert.replace('§', '')
            const cursorOffset = hasCursor ? item.insert.indexOf('§') : -1
            ed.executeEdits('ac', [{ range: new monaco.Range(pos.lineNumber, acStart, pos.lineNumber, pos.column), text }])
            if (hasCursor && cursorOffset !== -1) {
                const inserted = text.substring(0, cursorOffset)
                const lines = inserted.split('\n')
                const newLine = pos.lineNumber + lines.length - 1
                const newCol = lines.length === 1 ? acStart + cursorOffset : lines[lines.length - 1].length + 1
                ed.setPosition({ lineNumber: newLine, column: newCol })
            }
            acHide(); ed.focus()
        }

        const htmlBoilerplate = '<!DOCTYPE html>' + n + '<html lang="en">' + n + '<head>' + n + t + '<meta charset="UTF-8">' + n + t + '<meta name="viewport" content="width=device-width, initial-scale=1.0">' + n + t + '<title>Document</title>' + n + '</head>' + n + '<body>' + n + t + n + '</body>' + n + '</html>'

        window.monacoEditor.onKeyDown(e => {
            if (e.keyCode === 3) {
                const ed = window.monacoEditor
                const model = ed.getModel()
                if (model && model.getLanguageId() === 'html') {
                    const pos = ed.getPosition()
                    const line = model.getLineContent(pos.lineNumber)
                    const before = line.substring(0, pos.column - 1)
                    if (before.trimStart() === '!') {
                        e.preventDefault(); e.stopPropagation()
                        acHide()
                        const startCol = before.indexOf('!') + 1
                        ed.executeEdits('ac', [{ range: new monaco.Range(pos.lineNumber, startCol, pos.lineNumber, pos.column), text: htmlBoilerplate }])
                        ed.focus()
                        return
                    }
                }
            }
            if (!acList.length) return
            if (e.keyCode === 18) { e.preventDefault(); e.stopPropagation(); acSetActive(acIdx - 1) }
            if (e.keyCode === 17) { e.preventDefault(); e.stopPropagation(); acSetActive(acIdx + 1) }
            if (e.keyCode === 3 || e.keyCode === 2) { e.preventDefault(); e.stopPropagation(); acApply(acIdx) }
            if (e.keyCode === 9) acHide()
        })

        document.addEventListener('mousedown', e => { if (!ac.contains(e.target)) acHide() })

        let acTyping = false
        window.monacoEditor.onDidChangeModelContent(() => { acTyping = true })
        window.monacoEditor.onDidChangeCursorPosition(() => {
            if (acTyping) { acTyping = false; return }
            acHide()
        })

        window.monacoEditor.onDidChangeModelContent(() => {
            const ed = window.monacoEditor
            const pos = ed.getPosition(); if (!pos) return
            const model = ed.getModel()
            const lang = model.getLanguageId()
            const line = model.getLineContent(pos.lineNumber)
            const before = line.substring(0, pos.column - 1)
            let matches = [], startCol = pos.column

            if (lang === 'html') {
                const ai = before.lastIndexOf('<')
                const w = model.getWordUntilPosition(pos)
                if (ai !== -1 && !/\s/.test(before.substring(ai + 1))) {
                    const typed = before.substring(ai + 1).toLowerCase()
                    matches = htmlItems.filter(t => t.label.replace(/[<>]/g, '').startsWith(typed))
                    startCol = ai + 1
                } else if (w.word.length >= 1) {
                    matches = htmlItems.filter(t => t.label.replace(/[<>]/g, '').startsWith(w.word.toLowerCase()))
                    startCol = w.startColumn
                } else { acHide(); return }
            } else if (lang === 'python') {
                const w = model.getWordUntilPosition(pos)
                if (!w.word) { acHide(); return }
                matches = pyItems.filter(s => s.label.startsWith(w.word))
                startCol = w.startColumn
            } else if (lang === 'javascript' || lang === 'typescript') {
                const w = model.getWordUntilPosition(pos)
                if (!w.word) { acHide(); return }
                matches = jsItems.filter(s => s.label.startsWith(w.word))
                startCol = w.startColumn
            } else if (lang === 'css' || lang === 'scss' || lang === 'less') {
                const w = model.getWordUntilPosition(pos)
                if (!w.word) { acHide(); return }
                matches = cssItems.filter(s => s.label.startsWith(w.word))
                startCol = w.startColumn
            } else if (lang === 'go') {
                const w = model.getWordUntilPosition(pos)
                if (!w.word) { acHide(); return }
                matches = goItems.filter(s => s.label.startsWith(w.word))
                startCol = w.startColumn
            } else if (lang === 'php') {
                const w = model.getWordUntilPosition(pos)
                if (!w.word) { acHide(); return }
                matches = phpItems.filter(s => s.label.startsWith(w.word))
                startCol = w.startColumn
            } else if (lang === 'java') {
                const w = model.getWordUntilPosition(pos)
                if (!w.word) { acHide(); return }
                matches = javaItems.filter(s => s.label.startsWith(w.word))
                startCol = w.startColumn
            } else if (lang === 'c' || lang === 'cpp' || lang === 'csharp') {
                const w = model.getWordUntilPosition(pos)
                if (!w.word) { acHide(); return }
                matches = cItems.filter(s => s.label.startsWith(w.word))
                startCol = w.startColumn
            } else if (lang === 'sql') {
                const w = model.getWordUntilPosition(pos)
                if (!w.word) { acHide(); return }
                matches = sqlItems.filter(s => s.label.startsWith(w.word))
                startCol = w.startColumn
            } else if (lang === 'shell' || lang === 'bash') {
                const w = model.getWordUntilPosition(pos)
                if (!w.word) { acHide(); return }
                matches = bashItems.filter(s => s.label.startsWith(w.word))
                startCol = w.startColumn
            } else { acHide(); return }

            if (!matches.length) { acHide(); return }

            const coords = ed.getScrolledVisiblePosition(pos)
            const rect = document.getElementById('editor-container').getBoundingClientRect()
            acShow(matches, rect.left + coords.left, rect.top + coords.top + coords.height + 2, startCol)
        })
        const VOID_TAGS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'])
        window.monacoEditor.onKeyDown(e => {
            if (e.keyCode !== 84) return
            const ed = window.monacoEditor
            const model = ed.getModel()
            if (!model || model.getLanguageId() !== 'html') return
            const pos = ed.getPosition()
            const line = model.getLineContent(pos.lineNumber)
            const before = line.substring(0, pos.column - 1)
            const match = before.match(/<([a-zA-Z][a-zA-Z0-9]*)([^>]*)$/)
            if (!match) return
            const tag = match[1].toLowerCase()
            if (VOID_TAGS.has(tag)) return
            setTimeout(() => {
                const newPos = ed.getPosition()
                ed.executeEdits('autoclose', [{
                    range: new monaco.Range(newPos.lineNumber, newPos.column, newPos.lineNumber, newPos.column),
                    text: '</' + tag + '>'
                }])
                ed.setPosition(newPos)
                acHide()
            }, 0)
        })

        resolve(window.monacoEditor)
    })
})
