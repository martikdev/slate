document.addEventListener("DOMContentLoaded", () => {

    const activityIcons = document.querySelectorAll(".activity-icon[data-view]")
    const panels = document.querySelectorAll(".sidebar-panel")

    activityIcons.forEach(icon => {
        icon.onclick = () => {
            activityIcons.forEach(i => i.classList.remove("active"))
            icon.classList.add("active")
            const view = icon.dataset.view
            panels.forEach(p => {
                p.style.display = p.dataset.view === view ? "flex" : "none"
            })
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

    function createTask(title, desc, date, color, done = false) {
        if (!tasksList) return
        const li = document.createElement("li")
        li.className = "task-item" + (done ? " task-done" : "")
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
            saveTasks()
        }

        const editBtn = document.createElement("button")
        editBtn.className = "task-btn task-btn-edit"
        editBtn.innerHTML = '<i class="codicon codicon-edit"></i>'
        editBtn.title = "Edit"
        editBtn.onclick = (e) => {
            e.stopPropagation()
            editingLi = li
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
        localStorage.setItem("slate_tasks", JSON.stringify(data))
    }

    function loadTasks() {
        if (!tasksList) return
        const data = JSON.parse(localStorage.getItem("slate_tasks") || "[]")
        data.forEach(t => createTask(t.title, t.desc, t.date, t.color, t.done))
    }

    loadTasks()

    const fileTreeEl = document.getElementById("fileTree")
    const newFileBtn = document.getElementById("newFileBtn")
    const newFolderBtn = document.getElementById("newFolderBtn")
    const openFileBtn = document.getElementById("openFileBtn")
    const openFolderBtn = document.getElementById("openFolderBtn")
    const tabBar = document.getElementById("tabBar")
    const editorPlaceholder = document.getElementById("editor-placeholder")

    let openFiles = JSON.parse(localStorage.getItem("slate_open_files") || "[]").map(f => ({ ...f, handle: null, unsaved: false }))
    let currentIndex = openFiles.length > 0 ? 0 : null
    let currentDirHandle = null
    let tree = JSON.parse(localStorage.getItem("slate_tree") || "[]")
    let draggedPath = null
    let monacoReady = false

    window.editorReady.then(ed => {
        monacoReady = true
        ed.onDidChangeModelContent(() => {
            if (currentIndex === null) return
            const file = openFiles[currentIndex]
            file.content = ed.getValue()
            markUnsaved(currentIndex)
            persistFiles()
            const node = findTreeNodeByName(tree, file.name)
            if (node) { node.content = ed.getValue(); persistTree() }
        })
        if (currentIndex !== null) setCurrentFile(currentIndex)
        else showPlaceholder(true)
    })

    function persistFiles() {
        localStorage.setItem("slate_open_files", JSON.stringify(openFiles.map(f => ({ name: f.name, content: f.content }))))
    }

    function persistTree() {
        localStorage.setItem("slate_tree", JSON.stringify(tree))
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
        if (monacoReady && window.monacoEditor) {
            showPlaceholder(false)
            const lang = window.getEditorLanguage(file.name)
            monaco.editor.setModelLanguage(window.monacoEditor.getModel(), lang)
            window.monacoEditor.setValue(file.content || "")
            window.monacoEditor.updateOptions({ readOnly: false })
            window.monacoEditor.focus()
        }
        renderTabs()
        renderFileTree()
    }

    function markUnsaved(index) {
        openFiles[index].unsaved = true
        renderTabs()
    }

    function renderTabs() {
        if (!tabBar) return
        tabBar.innerHTML = ""
        openFiles.forEach((file, index) => {
            const tab = document.createElement("div")
            tab.className = "tab" + (index === currentIndex ? " active" : "")

            const label = document.createElement("span")
            label.className = "tab-label"
            label.textContent = (file.unsaved ? "● " : "") + file.name
            label.onclick = () => setCurrentFile(index)

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

            tab.appendChild(label)
            tab.appendChild(close)
            tabBar.appendChild(tab)
        })
    }

    function renderFileTree() {
        if (!fileTreeEl) return
        fileTreeEl.innerHTML = ""
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
        contextMenu.style.display = "block"
        const x = Math.min(e.clientX, window.innerWidth - contextMenu.offsetWidth - 8)
        const y = Math.min(e.clientY, window.innerHeight - contextMenu.offsetHeight - 8)
        contextMenu.style.left = x + "px"
        contextMenu.style.top = y + "px"
    }

    function hideContextMenu() {
        contextMenu.style.display = "none"
    }

    document.addEventListener("click", hideContextMenu)
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideContextMenu() })

    function fileContextMenu(e, node, path) {
        showContextMenu(e, [
            {
                icon: "codicon-go-to-file", label: "Open",
                action: () => openFileInEditor(node.name, node.content)
            },
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
        ])
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

    function renderFileNode(node, container, path) {
        const li = document.createElement("li")
        const isActive = currentIndex !== null && openFiles[currentIndex]?.name === node.name
        li.className = "file" + (isActive ? " active" : "")
        li.dataset.path = path
        li.dataset.type = "file"
        li.draggable = true

        const icon = document.createElement("i")
        icon.className = "codicon codicon-file"
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

    function addRecent(name, type) {
        const recents = JSON.parse(localStorage.getItem("slate_recents") || "[]").filter(r => r.name !== name)
        recents.unshift({ name, type, time: Date.now() })
        localStorage.setItem("slate_recents", JSON.stringify(recents.slice(0, 10)))
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
            reader.readAsText(file)
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
                    addRecent(file.name, "file")
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
                    addRecent(file.name, "file")
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
                    addRecent(dirHandle.name, "folder")
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
                    addRecent(folderName, "folder")
                    tree.push(folder)
                    persistTree()
                    persistFiles()
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
                renderTabs()
            } catch (e) {
                console.error(e)
            }
        } else {
            await saveAs()
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

    renderFileTree()
    renderTabs()


})
