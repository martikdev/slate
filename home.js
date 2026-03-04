document.addEventListener("DOMContentLoaded", () => {

    const recentList = document.getElementById("recent-list")
    const openFileLink = document.getElementById("openFileLink")
    const openFolderLink = document.getElementById("openFolderLink")

    function getRecents() {
        return JSON.parse(localStorage.getItem("slate_recents") || "[]")
    }

    function addRecent(name, type) {
        const recents = getRecents().filter(r => r.name !== name)
        recents.unshift({ name, type, time: Date.now() })
        localStorage.setItem("slate_recents", JSON.stringify(recents.slice(0, 10)))
    }

    function renderRecents() {
        if (!recentList) return
        const recents = getRecents()
        if (recents.length === 0) {
            recentList.innerHTML = '<li class="muted">No recent projects</li>'
            return
        }
        recentList.innerHTML = ""
        recents.forEach(r => {
            const li = document.createElement("li")
            const icon = r.type === "folder" ? "codicon-folder" : "codicon-file"
            li.innerHTML = '<i class="codicon ' + icon + '" style="margin-right:6px;font-size:13px;"></i>' + r.name
            li.onclick = () => {
                if (r.type === "folder") {
                    openFolder()
                } else {
                    openFile()
                }
            }
            recentList.appendChild(li)
        })
    }

    async function openFile() {
        try {
            const [handle] = await window.showOpenFilePicker({ multiple: false })
            const file = await handle.getFile()
            addRecent(file.name, "file")
            sessionStorage.setItem("slate_open_file", file.name)
            location.href = "index.html"
        } catch (e) {
            if (e.name !== "AbortError") console.error(e)
        }
    }

    async function openFolder() {
        try {
            const dirHandle = await window.showDirectoryPicker()
            addRecent(dirHandle.name, "folder")
            sessionStorage.setItem("slate_open_folder", dirHandle.name)
            location.href = "index.html"
        } catch (e) {
            if (e.name !== "AbortError") console.error(e)
        }
    }

    if (openFileLink) openFileLink.onclick = openFile
    if (openFolderLink) openFolderLink.onclick = openFolder

    renderRecents()
})