document.addEventListener("DOMContentLoaded", () => {

    function getUser() { return localStorage.getItem('slate_user') || '__guest__' }
    function ukey(k)   { return k + '_' + getUser() }

    const activityIcons = document.querySelectorAll(".activity-icon[data-view]")
    const panels = document.querySelectorAll(".sidebar-panel")
    const sidebarPanelContainer = document.querySelector(".sidebar")

    let activeView = "explorer"
    const initialPanel = document.querySelector('.sidebar-panel[data-view="explorer"]')
    if (initialPanel) initialPanel.classList.add("panel-visible")

    function setSidebarView(view) {
        activityIcons.forEach(i => i.classList.remove("active"))

        if (view) {
            const icon = document.querySelector('.activity-icon[data-view="' + view + '"]')
            if (icon) icon.classList.add("active")
            sidebarPanelContainer.classList.remove("sidebar-collapsed")

            panels.forEach(p => {
                if (p.dataset.view === view) {
                    p.style.display = "flex"
                    requestAnimationFrame(() => p.classList.add("panel-visible"))
                } else {
                    p.classList.remove("panel-visible")
                    p.style.display = "none"
                }
            })
        } else {
            panels.forEach(p => {
                p.classList.remove("panel-visible")
                p.style.display = "none"
            })
            sidebarPanelContainer.classList.add("sidebar-collapsed")
        }
        activeView = view
    }

    activityIcons.forEach(icon => {
        icon.onclick = () => {
            const view = icon.dataset.view
            if (activeView === view) {
                setSidebarView(null)
            } else {
                setSidebarView(view)
            }
        }
    })

    const savedTheme = localStorage.getItem("slate_theme") || "dark"
    document.body.setAttribute("data-theme", savedTheme)

    const themeToggleBtn = document.getElementById("theme-toggle")
    if (themeToggleBtn) {
        themeToggleBtn.onclick = () => {
            const current = document.body.getAttribute("data-theme")
            const next = current === "light" ? "dark" : "light"
            document.body.setAttribute("data-theme", next)
            localStorage.setItem("slate_theme", next)
            if (window.setEditorTheme) window.setEditorTheme(next)
        }
    }

    const addTaskBtn = document.getElementById("addTaskBtn")
    const modal = document.getElementById("taskModal")
    const cancelBtn = document.getElementById("taskCancelBtn")
    const submitBtn = document.getElementById("taskSubmitBtn")
    const tasksList = document.getElementById("tasksList")
    const titleInput = document.getElementById("taskTitle")
    const descInput = document.getElementById("taskDesc")
    const dateInput = document.getElementById("taskDate")
    const colorInput = document.getElementById("taskColor")

    let editingLi = null

    if (addTaskBtn && modal) {
        addTaskBtn.onclick = () => {
            editingLi = null
            const t = document.getElementById('taskModalTitle')
            if (t) t.textContent = 'New Task'
            const s = document.getElementById('taskSubmitBtn')
            if (s) s.textContent = 'Add Task'
            modal.style.display = "flex"
            setTimeout(() => { if (titleInput) titleInput.focus() }, 50)
        }
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            modal.style.display = "none"
            editingLi = null
            clearForm()
        }
    }

    const cancelFooterBtn = document.getElementById("taskCancelFooterBtn")
    if (cancelFooterBtn) {
        cancelFooterBtn.onclick = () => {
            modal.style.display = "none"
            editingLi = null
            clearForm()
        }
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none"
            editingLi = null
            clearForm()
        }
    })

    if (submitBtn) {
        submitBtn.onclick = () => {
            const title = titleInput.value.trim()
            if (!title) return
            const desc = descInput.value.trim()
            const date = dateInput.value
            const color = colorInput.value || "#22c55e"
            if (editingLi) {
                editingLi.remove()
                editingLi = null
            }
            createTask(title, desc, date, color)
            saveTasks()
            modal.style.display = "none"
            clearForm()
        }
    }

    function clearForm() {
        if (titleInput) titleInput.value = ""
        if (descInput) descInput.value = ""
        if (dateInput) dateInput.value = ""
    }

    function isOverdueDate(date) {
        if (!date) return false
        const today = new Date(); today.setHours(0,0,0,0)
        return new Date(date) < today
    }

    function refreshOverdue() {
        document.querySelectorAll('.task-item').forEach(t => {
            const isDone = t.classList.contains('task-done')
            const overdue = !isDone && isOverdueDate(t.dataset.date)
            t.classList.toggle('task-overdue', overdue)
        })
        updateTaskStats()
        applyTaskFilter()
    }

    function createTask(title, desc, date, color, done = false) {
        if (!tasksList) return
        const li = document.createElement("li")
        const overdue = !done && isOverdueDate(date)
        li.className = "task-item" + (done ? " task-done" : "") + (overdue ? " task-overdue" : "")
        li.dataset.title = title
        li.dataset.desc = desc || ""
        li.dataset.date = date || ""
        li.dataset.color = color || "#22c55e"

        const bar = document.createElement("div")
        bar.className = "task-color"
        bar.style.background = color

        const info = document.createElement("div")
        info.className = "task-info"

        const name = document.createElement("span")
        name.className = "task-title"
        name.textContent = title

        info.appendChild(name)

        if (desc || date) {
            const preview = document.createElement("div")
            preview.className = "task-preview"
            if (desc) {
                const descEl = document.createElement("span")
                descEl.className = "task-desc"
                descEl.textContent = desc
                preview.appendChild(descEl)
            }
            if (date) {
                const dateEl = document.createElement("span")
                dateEl.className = "task-date"
                dateEl.textContent = "Due: " + date
                preview.appendChild(dateEl)
            }
            info.appendChild(preview)
        }

        const actions = document.createElement("div")
        actions.className = "task-actions"

        const doneBtn = document.createElement("button")
        doneBtn.className = "task-btn task-btn-done"
        doneBtn.innerHTML = '<i class="codicon codicon-check"></i>'
        doneBtn.title = "Mark as finished"
        doneBtn.onclick = (e) => {
            e.stopPropagation()
            li.classList.toggle("task-done")
            li.classList.toggle("task-overdue", !li.classList.contains("task-done") && isOverdueDate(li.dataset.date))
            saveTasks()
            applyTaskFilter()
        }

        const editBtn = document.createElement("button")
        editBtn.className = "task-btn task-btn-edit"
        editBtn.innerHTML = '<i class="codicon codicon-edit"></i>'
        editBtn.title = "Edit"
        editBtn.onclick = (e) => {
            e.stopPropagation()
            editingLi = li
            const t = document.getElementById('taskModalTitle')
            if (t) t.textContent = 'Edit Task'
            const s = document.getElementById('taskSubmitBtn')
            if (s) s.textContent = 'Save'
            titleInput.value = title
            if (descInput) descInput.value = desc || ""
            if (dateInput) dateInput.value = date || ""
            if (colorInput) colorInput.value = color || "#22c55e"
            modal.style.display = "flex"
            setTimeout(() => { if (titleInput) titleInput.focus() }, 50)
        }

        const deleteBtn = document.createElement("button")
        deleteBtn.className = "task-btn task-btn-delete"
        deleteBtn.innerHTML = '<i class="codicon codicon-trash"></i>'
        deleteBtn.title = "Delete"
        deleteBtn.onclick = (e) => {
            e.stopPropagation()
            li.remove()
            saveTasks()
        }

        actions.appendChild(doneBtn)
        actions.appendChild(editBtn)
        actions.appendChild(deleteBtn)

        li.appendChild(bar)
        li.appendChild(info)
        li.appendChild(actions)
        tasksList.appendChild(li)
    }

    function saveTasks() {
        if (!tasksList) return
        const data = []
        document.querySelectorAll(".task-item").forEach(t => {
            data.push({
                title: t.dataset.title,
                desc: t.dataset.desc,
                date: t.dataset.date,
                color: t.dataset.color,
                done: t.classList.contains("task-done")
            })
        })
        localStorage.setItem(ukey('slate_tasks'), JSON.stringify(data))
        updateTaskStats()
    }

    function updateTaskStats() {
        const items = document.querySelectorAll(".task-item")
        const today = new Date(); today.setHours(0,0,0,0)
        let total = 0, done = 0, overdue = 0
        items.forEach(t => {
            total++
            const isDone = t.classList.contains("task-done")
            if (isDone) { done++; return }
            if (t.dataset.date) {
                const due = new Date(t.dataset.date)
                if (due < today) overdue++
            }
        })
        const tn = document.getElementById('statTotalNum')
        const dn = document.getElementById('statDoneNum')
        const on = document.getElementById('statOverdueNum')
        if (tn) tn.textContent = total
        if (dn) dn.textContent = done
        if (on) on.textContent = overdue
    }

    let activeTaskFilter = 'all'
    document.querySelectorAll('.tasks-filter-btn').forEach(btn => {
        btn.onclick = () => {
            activeTaskFilter = btn.dataset.filter
            document.querySelectorAll('.tasks-filter-btn').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            applyTaskFilter()
        }
    })

    function applyTaskFilter() {
        const today = new Date(); today.setHours(0,0,0,0)
        document.querySelectorAll('.task-item').forEach(t => {
            const isDone = t.classList.contains('task-done')
            const isOverdue = !isDone && t.dataset.date && new Date(t.dataset.date) < today
            let show = true
            if (activeTaskFilter === 'done')    show = isDone
            if (activeTaskFilter === 'open')    show = !isDone
            if (activeTaskFilter === 'overdue') show = isOverdue
            t.style.display = show ? '' : 'none'
        })
    }

    function loadTasks() {
        if (!tasksList) return
        const data = JSON.parse(localStorage.getItem(ukey('slate_tasks')) || '[]')
        data.forEach(t => createTask(t.title, t.desc, t.date, t.color, t.done))
        refreshOverdue()
    }

    loadTasks()

    const fileTreeEl = document.getElementById("fileTree")
    const newFileBtn = document.getElementById("newFileBtn")
    const newFolderBtn = document.getElementById("newFolderBtn")
    const openFileBtn = document.getElementById("openFileBtn")
    const openFolderBtn = document.getElementById("openFolderBtn")
    const tabBar = document.getElementById("tabBar")
    const editorPlaceholder = document.getElementById("editor-placeholder")

    let openFiles = JSON.parse(localStorage.getItem(ukey('slate_open_files')) || '[]').map(f => ({ ...f, handle: null, unsaved: false }))
    let currentIndex = openFiles.length > 0 ? 0 : null
    let currentDirHandle = null
    let tree = JSON.parse(localStorage.getItem(ukey('slate_tree')) || '[]')
    let draggedPath = null
    let monacoReady = false
    let suppressChange = false

    window.editorReady.then(ed => {
        monacoReady = true
        ed.onDidChangeModelContent(() => {
            if (suppressChange || currentIndex === null) return
            const file = openFiles[currentIndex]
            file.content = ed.getValue()
            markUnsaved(currentIndex)
            persistFiles()
            if (window.triggerPreviewUpdate) window.triggerPreviewUpdate()
            const node = findTreeNodeByName(tree, file.name)
            if (node) { node.content = ed.getValue(); persistTree() }
        })
        if (currentIndex !== null) setCurrentFile(currentIndex)
        else showPlaceholder(true)
    })

    function persistFiles() {
        localStorage.setItem(ukey('slate_open_files'), JSON.stringify(openFiles.map(f => ({ name: f.name, content: f.content }))))
    }

    function persistTree() {
        localStorage.setItem(ukey('slate_tree'), JSON.stringify(tree))
    }

    function findNodeByPath(nodes, path) {
        const parts = path.split("/")
        let current = nodes
        let node = null
        for (const part of parts) {
            node = current.find(n => n.name === part)
            if (!node) return null
            if (node.type === "folder") current = node.children
        }
        return node
    }

    function removeNodeByPath(nodes, path) {
        const parts = path.split("/")
        if (parts.length === 1) {
            const idx = nodes.findIndex(n => n.name === parts[0])
            if (idx !== -1) nodes.splice(idx, 1)
            return
        }
        const parent = findNodeByPath(nodes, parts.slice(0, -1).join("/"))
        if (parent && parent.type === "folder") {
            const idx = parent.children.findIndex(n => n.name === parts[parts.length - 1])
            if (idx !== -1) parent.children.splice(idx, 1)
        }
    }

    function openFileInEditor(name, content) {
        const existing = openFiles.findIndex(f => f.name === name)
        if (existing !== -1) {
            setCurrentFile(existing)
            return
        }
        openFiles.push({ name, content: content || "", handle: null, unsaved: false })
        persistFiles()
        setCurrentFile(openFiles.length - 1)
    }

    function showPlaceholder(show) {
        const container = document.getElementById("editor-container")
        if (editorPlaceholder) editorPlaceholder.style.display = show ? "flex" : "none"
        if (container) container.style.display = show ? "none" : "block"
    }

    function setCurrentFile(index) {
        currentIndex = index
        const file = openFiles[index]
        if (typeof isImageFile === 'function' && isImageFile(file.name)) {
            if (typeof hideImagePreview === 'function') hideImagePreview()
            if (typeof showImagePreview === 'function') showImagePreview(file.name, file.content)
            renderTabs()
            renderFileTree()
            if (window.updatePreviewLang) window.updatePreviewLang('plaintext')
            return
        }
        if (typeof hideImagePreview === 'function') hideImagePreview()
        if (isImageFile && isImageFile(file.name)) {
            hideImagePreview && hideImagePreview()
            showImagePreview(file.name, file.content)
            renderTabs()
            renderFileTree()
            if (window.updatePreviewLang) window.updatePreviewLang('plaintext')
            return
        }
        hideImagePreview && hideImagePreview()
        if (monacoReady && window.monacoEditor) {
            showPlaceholder(false)
            const lang = window.getEditorLanguage(file.name)
            monaco.editor.setModelLanguage(window.monacoEditor.getModel(), lang)
            suppressChange = true
            window.monacoEditor.setValue(file.content || "")
            suppressChange = false
            window.__slateCurrentFileName = file.name
            window.monacoEditor.updateOptions({ readOnly: false })
            window.monacoEditor.focus()
            if (window.updatePreviewLang) window.updatePreviewLang(lang)
        }
        renderTabs()
        renderFileTree()
    }

    function markUnsaved(index) {
        openFiles[index].unsaved = true
        renderTabs()
    }

    let dragSrcIndex = null

    function renderTabs() {
        if (!tabBar) return
        tabBar.innerHTML = ""

        openFiles.forEach((file, index) => {
            const tab = document.createElement("div")
            tab.className = "tab" + (index === currentIndex ? " active" : "")
            tab.draggable = true

            const iconEl = document.createElement("i")
            iconEl.className = "tab-icon"
            applyFileIcon(iconEl, file.name)

            const label = document.createElement("span")
            label.className = "tab-label"
            label.textContent = (file.unsaved ? "● " : "") + file.name

            const inner = document.createElement("span")
            inner.style.cssText = "display:flex;align-items:center;min-width:0;overflow:hidden;"
            inner.appendChild(iconEl)
            inner.appendChild(label)
            inner.onclick = () => setCurrentFile(index)

            const close = document.createElement("span")
            close.className = "tab-close"
            close.innerHTML = '<i class="codicon codicon-close"></i>'
            close.onclick = (e) => {
                e.stopPropagation()
                openFiles.splice(index, 1)
                if (currentIndex >= openFiles.length) currentIndex = openFiles.length - 1
                if (openFiles.length === 0) {
                    currentIndex = null
                    if (window.monacoEditor) {
                        window.monacoEditor.setValue("")
                        window.monacoEditor.updateOptions({ readOnly: true })
                    }
                    showPlaceholder(true)
                    renderTabs()
                    renderFileTree()
                } else {
                    setCurrentFile(currentIndex)
                }
                persistFiles()
            }

            tab.addEventListener('dragstart', e => {
                dragSrcIndex = index
                tab.classList.add('dragging')
                e.dataTransfer.effectAllowed = 'move'
            })
            tab.addEventListener('dragend', () => {
                tab.classList.remove('dragging')
                tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'))
            })
            tab.addEventListener('dragover', e => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'))
                if (dragSrcIndex !== index) tab.classList.add('drag-over')
            })
            tab.addEventListener('drop', e => {
                e.preventDefault()
                tab.classList.remove('drag-over')
                if (dragSrcIndex === null || dragSrcIndex === index) return
                const moved = openFiles.splice(dragSrcIndex, 1)[0]
                const newIndex = dragSrcIndex < index ? index - 1 : index
                openFiles.splice(newIndex, 0, moved)
                currentIndex = newIndex
                dragSrcIndex = null
                persistFiles()
                renderTabs()
            })

            tab.addEventListener('contextmenu', e => {
                if (!file.name.endsWith('.html')) return
                showContextMenu(e, [
                    { icon: 'codicon-open-preview', label: 'Open Preview', action: () => { setCurrentFile(index); setTimeout(() => { if (window.openPreview) window.openPreview() }, 80) } },
                    { icon: 'codicon-link-external', label: 'Open Preview in New Tab', action: () => { setCurrentFile(index); setTimeout(() => { if (window.openPreviewNewTab) window.openPreviewNewTab() }, 80) } },
                ])
            })

            tab.appendChild(inner)
            tab.appendChild(close)
            tabBar.appendChild(tab)
        })
    }

    function updateExplorerSub() {
        const sub = document.getElementById('explorerSub')
        if (!sub) return
        const name = localStorage.getItem(ukey('slate_project_name')) || ''
        let count = 0
        function countFiles(nodes) { for (const n of nodes) { if (n.type === 'file') count++; else countFiles(n.children || []) } }
        countFiles(tree)
        sub.textContent = (name ? name + ' · ' : '') + count + ' file' + (count !== 1 ? 's' : '')
    }

    function renderFileTree() {
        if (!fileTreeEl) return
        fileTreeEl.innerHTML = ""
        updateExplorerSub()
        if (tree.length === 0) {
            const li = document.createElement("li")
            li.className = "muted"
            li.textContent = "No files open"
            fileTreeEl.appendChild(li)
            return
        }
        renderNodes(tree, fileTreeEl, "")

        fileTreeEl.addEventListener("dragover", (e) => {
            e.preventDefault()
            fileTreeEl.classList.add("drag-over-root")
        })

        fileTreeEl.addEventListener("dragleave", (e) => {
            if (!fileTreeEl.contains(e.relatedTarget)) {
                fileTreeEl.classList.remove("drag-over-root")
            }
        })

        fileTreeEl.addEventListener("drop", (e) => {
            e.preventDefault()
            fileTreeEl.classList.remove("drag-over-root")
            if (!draggedPath) return
            const parts = draggedPath.split("/")
            if (parts.length === 1) return
            const draggedNode = findNodeByPath(tree, draggedPath)
            if (!draggedNode) return
            if (tree.find(n => n.name === draggedNode.name)) return
            removeNodeByPath(tree, draggedPath)
            tree.push(draggedNode)
            persistTree()
            renderFileTree()
        })
    }

    function renderNodes(nodes, container, pathPrefix) {
        nodes.forEach(node => {
            const path = pathPrefix ? pathPrefix + "/" + node.name : node.name
            if (node.type === "folder") {
                renderFolderNode(node, container, path)
            } else {
                renderFileNode(node, container, path)
            }
        })
    }

    const contextMenu = document.createElement("div")
    contextMenu.className = "context-menu"
    contextMenu.style.display = "none"
    document.body.appendChild(contextMenu)

    function showContextMenu(e, items) {
        e.preventDefault()
        e.stopPropagation()
        contextMenu.innerHTML = ""
        items.forEach(item => {
            if (item === "divider") {
                const div = document.createElement("div")
                div.className = "context-divider"
                contextMenu.appendChild(div)
                return
            }
            const el = document.createElement("div")
            el.className = "context-item" + (item.danger ? " danger" : "")
            el.innerHTML = '<i class="codicon ' + item.icon + '"></i>' + item.label
            el.onclick = () => { hideContextMenu(); item.action() }
            contextMenu.appendChild(el)
        })
        contextMenu.style.left = "-9999px"
        contextMenu.style.top = "-9999px"
        contextMenu.style.display = "block"
        const w = contextMenu.offsetWidth
        const h = contextMenu.offsetHeight
        contextMenu.style.left = Math.min(e.clientX, window.innerWidth - w - 8) + "px"
        contextMenu.style.top = Math.min(e.clientY, window.innerHeight - h - 8) + "px"
    }

    function hideContextMenu() {
        contextMenu.style.display = "none"
    }

    document.addEventListener("click", hideContextMenu)
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideContextMenu() })

    function fileContextMenu(e, node, path) {
        const isHtml = node.name.endsWith('.html')
        const items = [
            {
                icon: "codicon-go-to-file", label: "Open",
                action: () => openFileInEditor(node.name, node.content)
            },
        ]
        if (isHtml) {
            items.push({
                icon: "codicon-open-preview", label: "Open Preview",
                action: () => {
                    openFileInEditor(node.name, node.content)
                    setTimeout(() => { if (window.openPreview) window.openPreview() }, 80)
                }
            })
        }
        items.push(
            {
                icon: "codicon-edit", label: "Rename",
                action: () => {
                    const newName = prompt("Rename file", node.name)
                    if (!newName || newName === node.name) return
                    const openIdx = openFiles.findIndex(f => f.name === node.name)
                    node.name = newName
                    if (openIdx !== -1) {
                        openFiles[openIdx].name = newName
                        persistFiles()
                        renderTabs()
                    }
                    persistTree()
                    renderFileTree()
                }
            },
            {
                icon: "codicon-copy", label: "Duplicate",
                action: () => {
                    const copy = { ...node, name: node.name.replace(/(\.[^.]+)?$/, "_copy$1") }
                    const parentPath = path.split("/").slice(0, -1).join("/")
                    if (parentPath) {
                        const parent = findNodeByPath(tree, parentPath)
                        if (parent) parent.children.push(copy)
                    } else {
                        tree.push(copy)
                    }
                    persistTree()
                    renderFileTree()
                }
            },
            "divider",
            {
                icon: "codicon-trash", label: "Delete", danger: true,
                action: () => {
                    if (!confirm("Delete " + node.name + "?")) return
                    removeNodeByPath(tree, path)
                    const openIdx = openFiles.findIndex(f => f.name === node.name)
                    if (openIdx !== -1) {
                        openFiles.splice(openIdx, 1)
                        if (openFiles.length === 0) {
                            currentIndex = null
                            if (window.monacoEditor) {
                                window.monacoEditor.setValue("")
                                window.monacoEditor.updateOptions({ readOnly: true })
                            }
                            showPlaceholder(true)
                        } else {
                            if (currentIndex >= openFiles.length) currentIndex = openFiles.length - 1
                            setCurrentFile(currentIndex)
                        }
                        persistFiles()
                        renderTabs()
                    }
                    persistTree()
                    renderFileTree()
                }
            }
        )
        showContextMenu(e, items)
    }

    function folderContextMenu(e, node, path) {
        showContextMenu(e, [
            {
                icon: "codicon-new-file", label: "New File Inside",
                action: () => {
                    const name = prompt("File name")
                    if (!name) return
                    node.children.push({ type: "file", name, content: "" })
                    node.expanded = true
                    openFiles.push({ name, content: "", handle: null, unsaved: true })
                    persistTree()
                    persistFiles()
                    setCurrentFile(openFiles.length - 1)
                }
            },
            {
                icon: "codicon-new-folder", label: "New Folder Inside",
                action: () => {
                    const name = prompt("Folder name")
                    if (!name) return
                    node.children.push({ type: "folder", name, expanded: true, children: [] })
                    node.expanded = true
                    persistTree()
                    renderFileTree()
                }
            },
            "divider",
            {
                icon: "codicon-edit", label: "Rename",
                action: () => {
                    const newName = prompt("Rename folder", node.name)
                    if (!newName || newName === node.name) return
                    node.name = newName
                    persistTree()
                    renderFileTree()
                }
            },
            {
                icon: "codicon-folder", label: node.expanded ? "Collapse" : "Expand",
                action: () => {
                    node.expanded = !node.expanded
                    persistTree()
                    renderFileTree()
                }
            },
            "divider",
            {
                icon: "codicon-trash", label: "Delete", danger: true,
                action: () => {
                    if (!confirm("Delete folder " + node.name + " and all its contents?")) return
                    removeNodeByPath(tree, path)
                    persistTree()
                    renderFileTree()
                }
            }
        ])
    }

    function renderFolderNode(node, container, path) {
        const li = document.createElement("li")
        li.className = "file folder-entry"
        li.dataset.path = path
        li.dataset.type = "folder"

        const icon = document.createElement("i")
        icon.className = "codicon " + (node.expanded ? "codicon-folder-opened" : "codicon-folder")

        const label = document.createElement("span")
        label.textContent = node.name

        li.appendChild(icon)
        li.appendChild(label)

        li.onclick = (e) => {
            e.stopPropagation()
            node.expanded = !node.expanded
            persistTree()
            renderFileTree()
        }

        li.addEventListener("contextmenu", (e) => folderContextMenu(e, node, path))

        li.addEventListener("dragover", (e) => {
            e.preventDefault()
            li.classList.add("drag-over")
        })

        li.addEventListener("dragleave", () => {
            li.classList.remove("drag-over")
        })

        li.addEventListener("drop", (e) => {
            e.preventDefault()
            e.stopPropagation()
            li.classList.remove("drag-over")
            if (!draggedPath || draggedPath === path) return
            const draggedParts = draggedPath.split("/")
            const draggedName = draggedParts[draggedParts.length - 1]
            const draggedNode = findNodeByPath(tree, draggedPath)
            if (!draggedNode) return
            if (node.children.find(n => n.name === draggedName)) return
            removeNodeByPath(tree, draggedPath)
            node.children.push(draggedNode)
            node.expanded = true
            persistTree()
            renderFileTree()
        })

        container.appendChild(li)

        if (node.expanded) {
            const childList = document.createElement("ul")
            childList.className = "file-tree file-tree-nested"
            renderNodes(node.children, childList, path)
            container.appendChild(childList)
        }
    }

    function getFileIcon(name) {
        const ext = name.split('.').pop().toLowerCase()
        const map = {
            js:       { label: 'JS',   bg: '#f7df1e', fg: '#1a1600' },
            mjs:      { label: 'JS',   bg: '#f7df1e', fg: '#1a1600' },
            cjs:      { label: 'JS',   bg: '#f7df1e', fg: '#1a1600' },
            ts:       { label: 'TS',   bg: '#3178c6', fg: '#ffffff' },
            jsx:      { label: 'JSX',  bg: '#61dafb', fg: '#0d1117' },
            tsx:      { label: 'TSX',  bg: '#61dafb', fg: '#0d1117' },
            html:     { label: 'HTM',  bg: '#e34c26', fg: '#ffffff' },
            htm:      { label: 'HTM',  bg: '#e34c26', fg: '#ffffff' },
            css:      { label: 'CSS',  bg: '#264de4', fg: '#ffffff' },
            scss:     { label: 'SCss', bg: '#cd6799', fg: '#ffffff' },
            less:     { label: 'LESS', bg: '#1d365d', fg: '#ffffff' },
            json:     { label: '{ }',  bg: '#cbcb41', fg: '#1a1600' },
            json5:    { label: '{ }',  bg: '#cbcb41', fg: '#1a1600' },
            md:       { label: 'MD',   bg: '#519aba', fg: '#ffffff' },
            mdx:      { label: 'MDX',  bg: '#519aba', fg: '#ffffff' },
            txt:      { label: 'TXT',  bg: '#6b5f8a', fg: '#ffffff' },
            png:      { label: 'PNG',  bg: '#a074c4', fg: '#ffffff' },
            jpg:      { label: 'JPG',  bg: '#a074c4', fg: '#ffffff' },
            jpeg:     { label: 'JPG',  bg: '#a074c4', fg: '#ffffff' },
            gif:      { label: 'GIF',  bg: '#a074c4', fg: '#ffffff' },
            svg:      { label: 'SVG',  bg: '#ffb13b', fg: '#1a0f00' },
            webp:     { label: 'IMG',  bg: '#a074c4', fg: '#ffffff' },
            ico:      { label: 'ICO',  bg: '#a074c4', fg: '#ffffff' },
            py:       { label: 'PY',   bg: '#3572A5', fg: '#ffffff' },
            go:       { label: 'GO',   bg: '#00add8', fg: '#ffffff' },
            java:     { label: 'JV',   bg: '#b07219', fg: '#ffffff' },
            php:      { label: 'PHP',  bg: '#777bb4', fg: '#ffffff' },
            c:        { label: 'C',    bg: '#555a99', fg: '#ffffff' },
            cpp:      { label: 'C++',  bg: '#f34b7d', fg: '#ffffff' },
            cs:       { label: 'C#',   bg: '#178600', fg: '#ffffff' },
            sh:       { label: 'SH',   bg: '#4eaa25', fg: '#ffffff' },
            bash:     { label: 'SH',   bg: '#4eaa25', fg: '#ffffff' },
            sql:      { label: 'SQL',  bg: '#e38c00', fg: '#ffffff' },
            yaml:     { label: 'YML',  bg: '#cc3e44', fg: '#ffffff' },
            yml:      { label: 'YML',  bg: '#cc3e44', fg: '#ffffff' },
            xml:      { label: 'XML',  bg: '#e37933', fg: '#ffffff' },
            toml:     { label: 'TOML', bg: '#9c4221', fg: '#ffffff' },
            env:      { label: 'ENV',  bg: '#cbcb41', fg: '#1a1600' },
            gitignore:{ label: 'GIT',  bg: '#f14e32', fg: '#ffffff' },
            lock:     { label: 'LCK',  bg: '#6b5f8a', fg: '#ffffff' },
        }
        return map[ext] || { label: ext.slice(0,3).toUpperCase() || '?', bg: '#3d3558', fg: '#c4b8e0' }
    }

    function makeFileIconSvg(name) {
        const { label, bg, fg } = getFileIcon(name)
        const fontSize = label.length >= 4 ? '5.5' : label.length === 3 ? '6' : '7'
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14" width="20" height="14" style="flex-shrink:0;display:block;">'
            + '<rect width="20" height="14" rx="3" fill="' + bg + '"/>'
            + '<text x="10" y="10.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="' + fontSize + '" font-weight="700" fill="' + fg + '" letter-spacing="-0.3">' + label + '</text>'
            + '</svg>'
    }

    function applyFileIcon(el, name) {
        el.className = 'file-icon-badge'
        el.innerHTML = makeFileIconSvg(name)
    }

    function renderFileNode(node, container, path) {
        const li = document.createElement("li")
        const isActive = currentIndex !== null && openFiles[currentIndex]?.name === node.name
        li.className = "file" + (isActive ? " active" : "")
        li.dataset.path = path
        li.dataset.type = "file"
        li.draggable = true

        const icon = document.createElement("i")
        applyFileIcon(icon, node.name)
        icon.style.marginRight = "6px"
        icon.style.fontSize = "13px"
        icon.style.opacity = "0.6"

        const label = document.createElement("span")
        label.textContent = node.name

        li.appendChild(icon)
        li.appendChild(label)

        li.onclick = () => openFileInEditor(node.name, node.content)
        li.addEventListener("contextmenu", (e) => fileContextMenu(e, node, path))

        li.addEventListener("dragstart", (e) => {
            draggedPath = path
            li.classList.add("dragging")
            e.dataTransfer.effectAllowed = "move"
        })

        li.addEventListener("dragend", () => {
            li.classList.remove("dragging")
            draggedPath = null
        })

        container.appendChild(li)
    }

    function findTreeNodeByName(nodes, name) {
        for (const node of nodes) {
            if (node.type === "file" && node.name === name) return node
            if (node.type === "folder") {
                const found = findTreeNodeByName(node.children, name)
                if (found) return found
            }
        }
        return null
    }

    if (newFileBtn) {
        newFileBtn.onclick = () => {
            const name = prompt("File name")
            if (!name) return
            tree.push({ type: "file", name, content: "" })
            persistTree()
            openFiles.push({ name, content: "", handle: null, unsaved: true })
            persistFiles()
            setCurrentFile(openFiles.length - 1)
        }
    }

    if (newFolderBtn) {
        newFolderBtn.onclick = async () => {
            const name = prompt("Folder name")
            if (!name) return
            if (currentDirHandle) {
                try {
                    await currentDirHandle.getDirectoryHandle(name, { create: true })
                } catch (e) { console.error(e) }
            }
            tree.push({ type: "folder", name, expanded: true, children: [] })
            persistTree()
            renderFileTree()
        }
    }

    function addRecent(name) {
        const recents = JSON.parse(localStorage.getItem(ukey('slate_recents')) || '[]').filter(r => r.name !== name)
        recents.unshift({ name, time: Date.now() })
        localStorage.setItem(ukey('slate_recents'), JSON.stringify(recents.slice(0, 8)))
        localStorage.setItem(ukey('slate_project_name'), name)
    }

    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.style.display = "none"
    document.body.appendChild(fileInput)

    const folderInput = document.createElement("input")
    folderInput.type = "file"
    folderInput.webkitdirectory = true
    folderInput.style.display = "none"
    document.body.appendChild(folderInput)

    function readFileViaInput(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = e => resolve(e.target.result)
            reader.onerror = reject
            if (/\.(png|jpg|jpeg|gif|webp|bmp|ico)$/i.test(file.name)) {
                reader.readAsDataURL(file)
            } else {
                reader.readAsText(file)
            }
        })
    }

    if (openFileBtn) {
        openFileBtn.onclick = async () => {
            if (window.showOpenFilePicker) {
                try {
                    const [handle] = await window.showOpenFilePicker({ multiple: false })
                    const file = await handle.getFile()
                    const content = await file.text()
                    const existing = openFiles.findIndex(f => f.name === file.name)
                    if (existing !== -1) { setCurrentFile(existing); return }
                    if (!findTreeNodeByName(tree, file.name)) {
                        tree.push({ type: "file", name: file.name, content })
                        persistTree()
                    }
                    openFiles.push({ name: file.name, content, handle, unsaved: false })
                    addRecent(file.name)
                    persistFiles()
                    await ensureWritePermission(handle)
                    setCurrentFile(openFiles.length - 1)
                } catch (e) {
                    if (e.name !== "AbortError") console.error(e)
                }
            } else {
                fileInput.value = ""
                fileInput.onchange = async () => {
                    const file = fileInput.files[0]
                    if (!file) return
                    const content = await readFileViaInput(file)
                    const existing = openFiles.findIndex(f => f.name === file.name)
                    if (existing !== -1) { setCurrentFile(existing); return }
                    if (!findTreeNodeByName(tree, file.name)) {
                        tree.push({ type: "file", name: file.name, content })
                        persistTree()
                    }
                    openFiles.push({ name: file.name, content, handle: null, unsaved: false })
                    addRecent(file.name)
                    persistFiles()
                    setCurrentFile(openFiles.length - 1)
                }
                fileInput.click()
            }
        }
    }

    if (openFolderBtn) {
        openFolderBtn.onclick = async () => {
            if (window.showDirectoryPicker) {
                try {
                    const dirHandle = await window.showDirectoryPicker()
                    currentDirHandle = dirHandle
                    openFiles = []
                    tree = []
                    if (window.monacoEditor) {
                        window.monacoEditor.setValue("")
                        window.monacoEditor.updateOptions({ readOnly: true })
                    }
                    showPlaceholder(true)
                    currentIndex = null
                    const folder = { type: "folder", name: dirHandle.name, expanded: true, children: [] }
                    for await (const entry of dirHandle.values()) {
                        if (entry.kind === "file") {
                            const file = await entry.getFile()
                            const content = await file.text()
                            folder.children.push({ type: "file", name: file.name, content })
                            if (!openFiles.find(f => f.name === file.name)) {
                                openFiles.push({ name: file.name, content, handle: entry, unsaved: false })
                                await ensureWritePermission(entry)
                            }
                        }
                    }
                    tree.push(folder)
                    persistTree()
                    persistFiles()
                    addRecent(dirHandle.name)
                    if (openFiles.length > 0) setCurrentFile(0)
                } catch (e) {
                    if (e.name !== "AbortError") console.error(e)
                }
            } else {
                folderInput.value = ""
                folderInput.onchange = async () => {
                    const files = Array.from(folderInput.files)
                    if (!files.length) return
                    openFiles = []
                    tree = []
                    if (window.monacoEditor) {
                        window.monacoEditor.setValue("")
                        window.monacoEditor.updateOptions({ readOnly: true })
                    }
                    showPlaceholder(true)
                    currentIndex = null
                    const folderName = files[0].webkitRelativePath.split("/")[0]
                    const folder = { type: "folder", name: folderName, expanded: true, children: [] }
                    for (const file of files) {
                        const content = await readFileViaInput(file)
                        folder.children.push({ type: "file", name: file.name, content })
                        openFiles.push({ name: file.name, content, handle: null, unsaved: false })
                    }
                    tree.push(folder)
                    persistTree()
                    persistFiles()
                    addRecent(folderName)
                    if (openFiles.length > 0) setCurrentFile(0)
                }
                folderInput.click()
            }
        }
    }

    async function ensureWritePermission(handle) {
        if (!handle) return false
        const permission = await handle.queryPermission({ mode: "readwrite" })
        if (permission === "granted") return true
        const request = await handle.requestPermission({ mode: "readwrite" })
        return request === "granted"
    }

    async function saveCurrentFile() {
        if (currentIndex === null || currentIndex >= openFiles.length) return
        const file = openFiles[currentIndex]
        if (window.monacoEditor) file.content = window.monacoEditor.getValue()
        if (file.handle) {
            try {
                const ok = await ensureWritePermission(file.handle)
                if (!ok) return
                const writable = await file.handle.createWritable()
                await writable.write(file.content || "")
                await writable.close()
                file.unsaved = false
                persistFiles()
                renderTabs()
                if (window.triggerPreviewUpdate) window.triggerPreviewUpdate()
            } catch (e) {
                console.error(e)
            }
        } else {

            file.unsaved = false
            persistFiles()
            renderTabs()
            if (window.triggerPreviewUpdate) window.triggerPreviewUpdate()
        }
    }

    async function saveAs() {
        if (currentIndex === null || currentIndex >= openFiles.length) return
        const file = openFiles[currentIndex]
        if (window.monacoEditor) file.content = window.monacoEditor.getValue()
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: file.name,
                types: [{ description: "Text Files", accept: { "text/plain": [".txt", ".js", ".html", ".css", ".md", ".json"] } }]
            })
            const writable = await handle.createWritable()
            await writable.write(file.content || "")
            await writable.close()
            file.handle = handle
            file.name = handle.name
            file.unsaved = false
            persistFiles()
            renderTabs()
            renderFileTree()
        } catch (e) {
            if (e.name !== "AbortError") console.error(e)
        }
    }

    document.addEventListener("keydown", async (e) => {
        if (e.ctrlKey && e.key === "s") {
            e.preventDefault()
            if (e.shiftKey) await saveAs()
            else await saveCurrentFile()
        }
    })

    const editorSettings = {
        theme:                  localStorage.getItem(ukey('slate_theme'))                   || localStorage.getItem('slate_theme') || 'dark',
        fontSize:               parseInt(localStorage.getItem(ukey('slate_fontSize')))      || 14,
        tabSize:                parseInt(localStorage.getItem(ukey('slate_tabSize')))       || 4,
        wordWrap:               localStorage.getItem(ukey('slate_wordWrap'))                || 'off',
        lineNumbers:            localStorage.getItem(ukey('slate_lineNumbers'))             || 'on',
        cursorStyle:            localStorage.getItem(ukey('slate_cursorStyle'))             || 'line',
        cursorBlinking:         localStorage.getItem(ukey('slate_cursorBlinking'))          || 'blink',
        renderWhitespace:       localStorage.getItem(ukey('slate_renderWhitespace'))        || 'none',
        bracketPairColorization: localStorage.getItem(ukey('slate_bracketPairColorization')) !== 'false',
        smoothScrolling:        localStorage.getItem(ukey('slate_smoothScrolling'))         === 'true',
    }

    function applySettings() {
        document.body.setAttribute('data-theme', editorSettings.theme)
        localStorage.setItem(ukey('slate_theme'), editorSettings.theme)
        if (window.setEditorTheme) window.setEditorTheme(editorSettings.theme)
        if (window.monacoEditor) {
            window.monacoEditor.updateOptions({
                fontSize:         editorSettings.fontSize,
                tabSize:          editorSettings.tabSize,
                wordWrap:         editorSettings.wordWrap,
                lineNumbers:      editorSettings.lineNumbers,
                cursorStyle:      editorSettings.cursorStyle,
                cursorBlinking:   editorSettings.cursorBlinking,
                renderWhitespace: editorSettings.renderWhitespace,
                smoothScrolling:  editorSettings.smoothScrolling,
                'bracketPairColorization.enabled': editorSettings.bracketPairColorization,
            })
        }
        document.querySelectorAll('.setting-select[data-setting]').forEach(sel => {
            const key = sel.dataset.setting
            if (editorSettings[key] !== undefined) sel.value = String(editorSettings[key])
        })
        document.querySelectorAll('.setting-toggle input[data-setting]').forEach(chk => {
            const key = chk.dataset.setting
            if (editorSettings[key] !== undefined) chk.checked = editorSettings[key] === true || editorSettings[key] === 'on' || editorSettings[key] === 'true'
        })
    }

    document.querySelectorAll('.setting-select[data-setting]').forEach(sel => {
        sel.addEventListener('change', () => {
            const key = sel.dataset.setting
            const val = sel.value
            editorSettings[key] = (key === 'fontSize' || key === 'tabSize') ? parseInt(val) : val
            localStorage.setItem(ukey('slate_' + key), val)
            applySettings()
        })
    })

    document.querySelectorAll('.setting-toggle input[data-setting]').forEach(chk => {
        chk.addEventListener('change', () => {
            const key = chk.dataset.setting
            const val = chk.checked ? (chk.dataset.on || 'true') : (chk.dataset.off || 'false')
            editorSettings[key] = chk.checked
            localStorage.setItem(ukey('slate_' + key), val)
            applySettings()
        })
    })

    applySettings()
    window.editorReady && window.editorReady.then(() => applySettings())

    const searchInput   = document.getElementById('searchInput')
    const replaceInput  = document.getElementById('replaceInput')
    const searchMeta    = document.getElementById('searchMeta')
    const searchResults = document.getElementById('searchResults')
    const btnCase       = document.getElementById('searchCaseSensitive')
    const btnWord       = document.getElementById('searchWholeWord')
    const btnRegex      = document.getElementById('searchRegex')
    const btnReplaceOne = document.getElementById('replaceOne')
    const btnReplaceAll = document.getElementById('replaceAll')

    let searchOpts = { caseSensitive: false, wholeWord: false, useRegex: false }

    function toggleSearchOpt(btn, key) {
        searchOpts[key] = !searchOpts[key]
        btn.classList.toggle('active', searchOpts[key])
        runSearch()
    }
    if (btnCase)  btnCase.onclick  = () => toggleSearchOpt(btnCase,  'caseSensitive')
    if (btnWord)  btnWord.onclick  = () => toggleSearchOpt(btnWord,  'wholeWord')
    if (btnRegex) btnRegex.onclick = () => toggleSearchOpt(btnRegex, 'useRegex')

    function buildRegex(query) {
        if (!query) return null
        try {
            let pattern = searchOpts.useRegex ? query : query.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
            if (searchOpts.wholeWord) pattern = '\b' + pattern + '\b'
            return new RegExp(pattern, searchOpts.caseSensitive ? 'g' : 'gi')
        } catch { return null }
    }

    function getAllFileContents() {
        const files = []
        function walk(nodes) {
            for (const n of nodes) {
                if (n.type === 'file') files.push({ name: n.name, content: n.content || '' })
                else if (n.type === 'folder') walk(n.children || [])
            }
        }
        walk(tree)
        return files
    }

    function runSearch() {
        if (!searchResults) return
        const query = searchInput ? searchInput.value : ''
        searchResults.innerHTML = ''
        if (searchMeta) searchMeta.textContent = ''
        if (!query) return
        const regex = buildRegex(query)
        if (!regex) { if (searchMeta) searchMeta.textContent = 'Invalid regex'; return }

        const files = getAllFileContents()
        let totalMatches = 0

        for (const file of files) {
            const lines = file.content.split('\n')
            const fileMatches = []
            lines.forEach((line, i) => {
                regex.lastIndex = 0
                let m
                while ((m = regex.exec(line)) !== null) {
                    fileMatches.push({ line: i + 1, col: m.index, text: line, match: m[0] })
                    if (!regex.global) break
                }
            })
            if (!fileMatches.length) continue
            totalMatches += fileMatches.length

            const group = document.createElement('div')
            group.className = 'search-file-group'

            const header = document.createElement('div')
            header.className = 'search-file-header'
            const icon = document.createElement('i')
            applyFileIcon(icon, file.name)
            icon.style.marginRight = '5px'
            header.appendChild(icon)
            header.appendChild(document.createTextNode(file.name))
            const badge = document.createElement('span')
            badge.className = 'search-file-count'
            badge.textContent = fileMatches.length
            header.appendChild(badge)
            group.appendChild(header)

            fileMatches.slice(0, 50).forEach(hit => {
                const row = document.createElement('div')
                row.className = 'search-match'
                const lineNum = document.createElement('span')
                lineNum.className = 'search-line-num'
                lineNum.textContent = hit.line
                row.appendChild(lineNum)
                const text = document.createElement('span')
                const safe = hit.text.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                const safeQ = query.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')
                text.innerHTML = safe.replace(new RegExp(safeQ, searchOpts.caseSensitive ? 'g' : 'gi'), function(s) { return '<span class="search-match-hl">' + s + '</span>' })
                row.appendChild(text)
                row.onclick = () => {
                    openFileInEditor(file.name, file.content)
                    setTimeout(() => {
                        if (window.monacoEditor) {
                            window.monacoEditor.revealLineInCenter(hit.line)
                            window.monacoEditor.setPosition({ lineNumber: hit.line, column: hit.col + 1 })
                            window.monacoEditor.focus()
                        }
                    }, 80)
                }
                group.appendChild(row)
            })
            searchResults.appendChild(group)
        }

        if (searchMeta) searchMeta.textContent = totalMatches
            ? totalMatches + ' result' + (totalMatches !== 1 ? 's' : '') + ' in ' + searchResults.children.length + ' file' + (searchResults.children.length !== 1 ? 's' : '')
            : 'No results'
    }

    if (searchInput) {
        searchInput.addEventListener('input', runSearch)
        searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch() })
    }

    if (btnReplaceOne) btnReplaceOne.onclick = () => {
        const query = searchInput ? searchInput.value : ''
        const replacement = replaceInput ? replaceInput.value : ''
        if (!query || currentIndex === null) return
        const ed = window.monacoEditor
        if (!ed) return
        const regex = buildRegex(query)
        if (!regex) return
        const val = ed.getValue()
        regex.lastIndex = 0
        const newVal = val.replace(regex, replacement)
        if (newVal !== val) {
            suppressChange = true
            ed.setValue(newVal)
            suppressChange = false
            openFiles[currentIndex].content = newVal
            persistFiles()
        }
        runSearch()
    }

    if (btnReplaceAll) btnReplaceAll.onclick = () => {
        const query = searchInput ? searchInput.value : ''
        const replacement = replaceInput ? replaceInput.value : ''
        if (!query) return
        const regex = buildRegex(query)
        if (!regex) return
        let changed = 0
        for (const file of openFiles) {
            const newContent = file.content.replace(regex, replacement)
            if (newContent !== file.content) { file.content = newContent; changed++ }
            const node = findTreeNodeByName(tree, file.name)
            if (node) node.content = newContent
        }
        persistFiles()
        persistTree()
        if (window.monacoEditor && currentIndex !== null) {
            suppressChange = true
            window.monacoEditor.setValue(openFiles[currentIndex].content)
            suppressChange = false
        }
        runSearch()
        if (searchMeta) searchMeta.textContent += ' — replaced in ' + changed + ' file' + (changed !== 1 ? 's' : '')
    }

    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
            e.preventDefault()
            setSidebarView('search')
            setTimeout(() => searchInput && searchInput.focus(), 50)
        }
    })

    function isImageFile(name) {
        return /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(name)
    }

    const imagePreviewPane = document.createElement('div')
    imagePreviewPane.className = 'image-preview-pane'
    imagePreviewPane.style.display = 'none'
    const imgEl = document.createElement('img')
    const imgInfo = document.createElement('div')
    imgInfo.className = 'image-preview-info'
    imagePreviewPane.appendChild(imgEl)
    imagePreviewPane.appendChild(imgInfo)
    const editorPaneEl = document.getElementById('editor-pane')
    if (editorPaneEl) editorPaneEl.appendChild(imagePreviewPane)

    function showImagePreview(name, content) {
        const container = document.getElementById('editor-container')
        const placeholder = document.getElementById('editor-placeholder')
        if (container)   container.style.display   = 'none'
        if (placeholder) placeholder.style.display = 'none'
        imagePreviewPane.style.display = 'flex'
        if (content && content.startsWith('data:')) {
            imgEl.src = content
            imgEl.onload = () => { imgInfo.textContent = name + ' — ' + imgEl.naturalWidth + ' × ' + imgEl.naturalHeight + 'px' }
        } else if (name.endsWith('.svg') && content) {
            const blob = new Blob([content], { type: 'image/svg+xml' })
            imgEl.src = URL.createObjectURL(blob)
            imgEl.onload = () => { imgInfo.textContent = name + ' — ' + imgEl.naturalWidth + ' × ' + imgEl.naturalHeight + 'px' }
        } else {
            imgEl.src = ''
            imgInfo.textContent = name + ' — open from disk to preview'
        }
    }

    function hideImagePreview() {
        imagePreviewPane.style.display = 'none'
    }

    let _profileTimer = null

    function _getProfileEls() {
        return {
            btn:     document.getElementById('profileBtn'),
            popover: document.getElementById('profilePopover'),
            avatar:  document.getElementById('activityAvatar'),
            pAvatar: document.getElementById('popoverAvatar'),
            pName:   document.getElementById('popoverName'),
            pEmail:  document.getElementById('popoverEmail'),
            pLogout: document.getElementById('popoverLogout'),
            pSignIn: document.getElementById('popoverSignIn'),
        }
    }

    function loadUserProfile() {
        const { avatar, pAvatar, pName, pEmail, pLogout, pSignIn } = _getProfileEls()
        const user  = localStorage.getItem('slate_user')
        const email = localStorage.getItem('slate_email') || '—'
        const init  = user ? user[0].toUpperCase() : '?'
        if (avatar)  avatar.textContent  = init
        if (pAvatar) pAvatar.textContent = init
        if (pName)   pName.textContent   = user || 'Not signed in'
        if (pEmail)  pEmail.textContent  = user ? email : '—'
        if (pLogout) pLogout.style.display = user ? 'flex' : 'none'
        if (pSignIn) pSignIn.style.display = user ? 'none' : 'flex'

        const tasksEl  = document.getElementById('popoverTasks')
        const totalEl  = document.getElementById('pptTotal')
        const doneEl   = document.getElementById('pptDone')
        const overdueEl= document.getElementById('pptOverdue')
        if (tasksEl) tasksEl.style.display = user ? 'flex' : 'none'
        if (user && totalEl && doneEl && overdueEl) {
            const tasks = JSON.parse(localStorage.getItem(ukey('slate_tasks')) || '[]')
            const today = new Date(); today.setHours(0,0,0,0)
            let total = tasks.length, done = 0, overdue = 0
            tasks.forEach(t => {
                if (t.done) { done++ }
                else if (t.date && new Date(t.date) < today) { overdue++ }
            })
            totalEl.textContent   = total
            doneEl.textContent    = done
            overdueEl.textContent = overdue
        }
    }

    function _showPopover() {
        clearTimeout(_profileTimer)
        const { popover } = _getProfileEls()
        if (!popover) return
        loadUserProfile()
        popover.style.display = 'flex'
    }

    function _hidePopover() {
        clearTimeout(_profileTimer)
        _profileTimer = setTimeout(() => {
            const { popover } = _getProfileEls()
            if (popover) popover.style.display = 'none'
        }, 180)
    }

    setTimeout(() => {
        const { btn, popover, pLogout } = _getProfileEls()
        if (btn) {
            btn.addEventListener('mouseenter', _showPopover)
            btn.addEventListener('mouseleave', _hidePopover)
        }
        if (popover) {
            popover.addEventListener('mouseenter', () => clearTimeout(_profileTimer))
            popover.addEventListener('mouseleave', _hidePopover)
            popover.style.display = 'none'
        }
        const { pSignIn: signInBtn } = _getProfileEls()
        if (signInBtn) {
            signInBtn.onclick = () => { location.href = 'home.html' }
        }
        if (pLogout) {
            pLogout.onclick = () => {
                localStorage.removeItem('slate_user')
                localStorage.removeItem('slate_email')
                localStorage.removeItem('slate_project_name')
                loadUserProfile()
                const { popover: p } = _getProfileEls()
                if (p) p.style.display = 'none'
                location.href = 'home.html'
            }
        }
        loadUserProfile()
    }, 0)

    renderFileTree()
    renderTabs()

})
