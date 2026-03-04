const explorerList = document.querySelector(".file-tree");
const newFileBtn = document.getElementById("newFileBtn");
const newFolderBtn = document.getElementById("newFolderBtn");
const editorArea = document.getElementById("editor");

let project = JSON.parse(localStorage.getItem("currentProject")) || { files: [] };

function renderExplorer() {
    explorerList.innerHTML = "";
    if(project.files.length === 0){
        const li = document.createElement("li");
        li.classList.add("muted");
        li.textContent = "No files yet";
        explorerList.appendChild(li);
        return;
    }
    project.files.forEach(file => {
        const li = document.createElement("li");
        li.classList.add("file");
        li.textContent = file.name;
        li.addEventListener("click", () => {
            editorArea.value = file.content || "";
        });
        explorerList.appendChild(li);
    });
}

newFileBtn.addEventListener("click", () => {
    const name = prompt("Enter new file name");
    if(!name) return;
    project.files.push({ name, content: "" });
    localStorage.setItem("currentProject", JSON.stringify(project));
    renderExplorer();
});

newFolderBtn.addEventListener("click", () => {
    const name = prompt("Enter new folder name");
    if(!name) return;
    project.files.push({ name: name+"/", content: null });
    localStorage.setItem("currentProject", JSON.stringify(project));
    renderExplorer();
});

renderExplorer();