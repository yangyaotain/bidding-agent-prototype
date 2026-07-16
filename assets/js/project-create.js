(function () {
  "use strict";

  let files = [
    { name: "采购文件.doc", size: "372 KB", progress: 100, type: "主招标文件" }
  ];

  const fileIcon = '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
  const removeIcon = '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>';

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function renderFiles() {
    const list = document.getElementById("tenderUploadList");
    if (!files.length) {
      list.innerHTML = '<div class="empty-state"><strong>尚未添加招标文件</strong><span>请至少上传一份主招标文件。</span></div>';
      return;
    }
    list.innerHTML = files.map(function (file, index) {
      return '<div class="upload-file-row" data-file-index="' + index + '"><span class="file-type-icon">' + fileIcon + '</span><div class="cell-stack"><strong>' + file.name + '</strong><span>' + file.type + ' · ' + file.size + '</span></div><div class="file-progress"><span class="table-progress-track"><b style="width:' + file.progress + '%"></b></span><b>' + file.progress + '%</b></div><button class="ghost-btn compact-btn remove-upload-file" type="button"><span class="btn-icon">' + removeIcon + '</span><span>移除</span></button></div>';
    }).join("");
  }

  function addFiles(fileList) {
    Array.from(fileList).forEach(function (file) {
      files.push({ name: file.name, size: formatSize(file.size), progress: 0, type: files.length ? "补充附件" : "主招标文件" });
    });
    renderFiles();
    let progress = 0;
    const timer = window.setInterval(function () {
      progress += 20;
      files.forEach(function (file) { if (file.progress < 100) file.progress = Math.min(progress, 100); });
      renderFiles();
      if (progress >= 100) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  function initUploader() {
    const input = document.getElementById("tenderFileInput");
    const zone = document.getElementById("tenderUploadZone");
    zone.addEventListener("click", function () { input.click(); });
    zone.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); input.click(); } });
    input.addEventListener("change", function () { if (input.files.length) addFiles(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (name) { zone.addEventListener(name, function (event) { event.preventDefault(); zone.classList.add("dragover"); }); });
    ["dragleave", "drop"].forEach(function (name) { zone.addEventListener(name, function (event) { event.preventDefault(); zone.classList.remove("dragover"); }); });
    zone.addEventListener("drop", function (event) { if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files); });
    document.getElementById("tenderUploadList").addEventListener("click", function (event) {
      const button = event.target.closest(".remove-upload-file");
      if (!button) return;
      const index = Number(button.closest("[data-file-index]").getAttribute("data-file-index"));
      files.splice(index, 1);
      renderFiles();
    });
  }

  function createPendingProject() {
    const pendingProject = {
      id: "BID-202601-001",
      name: "某港口集团2026年度集装箱业务平台运维项目",
      purchaser: "正在从招标文件提取",
      deadline: "待解析",
      deadlineText: "后台解析中",
      stage: "解析中",
      progress: 12,
      owner: "李明远",
      status: "parsing",
      budget: "待解析",
      fileName: files[0].name
    };
    try { window.sessionStorage.setItem("biddingPendingProject", JSON.stringify(pendingProject)); } catch (error) { /* file protocol may restrict storage */ }
    window.location.href = "projects.html?created=1&file=" + encodeURIComponent(files[0].name);
  }

  function initSubmit() {
    document.getElementById("createProjectForm").addEventListener("submit", function (event) {
      event.preventDefault();
      if (!files.length) {
        if (window.showToast) window.showToast("请先上传主招标文件", "warning", "#tenderUploadZone");
        return;
      }
      const button = document.getElementById("createProjectBtn");
      button.disabled = true;
      button.querySelector("span:last-child").textContent = "正在创建项目";
      window.setTimeout(createPendingProject, 450);
    });
  }

  function init() {
    renderFiles();
    initUploader();
    initSubmit();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
