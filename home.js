const recentList = document.getElementById("recent-list")
const body = document.body
const themeToggle = document.getElementById("theme-toggle")

let currentTheme = localStorage.getItem("theme") || "dark"
body.dataset.theme = currentTheme

themeToggle.onclick = () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark"
    body.dataset.theme = currentTheme
    localStorage.setItem("theme", currentTheme)
}

document.querySelectorAll("[data-action]").forEach(item => {
    item.onclick = () => {
        const action = item.dataset.action
        if (action === "new") {
            const project = {
                "index.html": "<!DOCTYPE html>\n<html>\n<head>\n<link rel='stylesheet' href='style.css'>\n</head>\n<body>\n<h1>Hello Slate</h1>\n<script src='script.js'></script>\n</body>\n</html>",
                "style.css": "body { font-family: Arial; background: #1e1e1e; color: white; }",
                "script.js": "console.log('Slate');"
            }
            localStorage.setItem("project", JSON.stringify(project))
            window.location.href = "index.html"
        }
        if (action === "open") {
            if (localStorage.getItem("project")) {
                window.location.href = "index.html"
            } else {
                alert("No project found")
            }
        }
    }
})

const saved = JSON.parse(localStorage.getItem("recentProjects") || "[]")
if (saved.length) {
    recentList.innerHTML = ""
    saved.forEach(p => {
        const li = document.createElement("li")
        li.textContent = p.name
        li.onclick = () => {
            localStorage.setItem("project", JSON.stringify(p.files))
            window.location.href = "index.html"
        }
        recentList.appendChild(li)
    })
}