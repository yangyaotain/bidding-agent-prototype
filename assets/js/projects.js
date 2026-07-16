(function () {
  "use strict";

  let projects = ((window.BiddingProjectData || {}).projects || []).slice();
  let activeFilter = "all";
  let currentPage = 1;
  const pageSize = 10;
  let pendingProjectId = "";
  let pendingAction = "";

  const icons = {
    enter: '<svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
    archive: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M9 13h6"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>'
  };

  function loadPendingProject() {
    const params = new URLSearchParams(window.location.search);
    let pending = null;
    try {
      const saved = window.sessionStorage.getItem("biddingPendingProject");
      if (saved) pending = JSON.parse(saved);
    } catch (error) { pending = null; }
    if (params.get("created") !== "1" || (pending && pending.status !== "parsing")) pending = null;
    if (!pending && params.get("created") === "1") {
      pending = {
        id: "TEMP-202607-006",
        name: "项目信息识别中",
        purchaser: "正在从招标文件提取",
        deadline: "待解析",
        deadlineText: "后台解析中",
        stage: "解析中",
        progress: 12,
        owner: "李明远",
        status: "parsing",
        budget: "待解析",
        fileName: params.get("file") || "新上传的招标文件.pdf"
      };
    }
    if (pending) {
      const existingIndex = projects.findIndex(function (project) { return project.id === pending.id; });
      if (existingIndex === -1) {
        projects.unshift(pending);
      } else {
        projects[existingIndex] = Object.assign({}, projects[existingIndex], pending);
      }
    }
  }

  function listStage(project) {
    const stage = String(project.stage || "");
    if (stage.indexOf("编制") !== -1 || stage.indexOf("质量审核") !== -1) return "标书编制与审核";
    return stage || "解析中";
  }

  function updateProjectCounts() {
    const counts = projects.reduce(function (summary, project) {
      summary.all += 1;
      if (project.status === "deadline") summary.deadline += 1;
      else if (project.status === "archived") summary.archived += 1;
      else summary.ongoing += 1;
      return summary;
    }, { all: 0, ongoing: 0, deadline: 0, archived: 0 });
    [
      ["allProjectMetric", counts.all],
      ["allProjectTabCount", counts.all],
      ["ongoingProjectMetric", counts.ongoing],
      ["ongoingProjectTabCount", counts.ongoing],
      ["deadlineProjectMetric", counts.deadline],
      ["deadlineProjectTabCount", counts.deadline],
      ["archivedProjectMetric", counts.archived],
      ["archivedProjectTabCount", counts.archived]
    ].forEach(function (entry) {
      const node = document.getElementById(entry[0]);
      if (node) node.textContent = String(entry[1]);
    });
  }

  function projectMatches(project) {
    const query = (document.getElementById("projectSearch").value || "").trim().toLowerCase();
    const stage = document.getElementById("stageFilter").value;
    const owner = document.getElementById("ownerFilter").value;
    const searchable = [project.name, project.id, project.purchaser].join(" ").toLowerCase();
    const filterMatch = activeFilter === "all" ||
      (activeFilter === "ongoing" && project.status !== "archived" && project.status !== "deadline") ||
      (activeFilter === "deadline" && project.status === "deadline") ||
      (activeFilter === "archived" && project.status === "archived");
    return filterMatch && (!query || searchable.indexOf(query) !== -1) && (stage === "all" || listStage(project) === stage) && (owner === "all" || project.owner === owner);
  }

  function projectEntryPage(project) {
    const stage = project.stage || "";
    if (project.status === "parsing" || stage === "解析中") return "project-files.html";
    if (stage.indexOf("解析") !== -1 || stage.indexOf("投标决策") !== -1 || stage.indexOf("资格") !== -1 || stage.indexOf("响应策划") !== -1 || stage.indexOf("知识匹配") !== -1) return "project-analysis.html";
    if (stage.indexOf("编制") !== -1) return "project-writing.html";
    if (stage.indexOf("质量审核") !== -1) return "project-writing.html";
    if (stage.indexOf("交付归档") !== -1) return "project-delivery.html";
    return "project-analysis.html";
  }

  function projectStageDetail(project) {
    if (project.stageDetail) return project.stageDetail;
    if (project.stage === "解析中") return "AI 正在逐页识别采购文件";
    if (project.stage === "解析结果") return "待确认综合投标结论";
    if (listStage(project) === "标书编制与审核") return "投标文件编制与质量审核中";
    if (project.stage === "交付归档") return project.status === "archived" ? "已完成交付并归档" : "待确认最终交付文件";
    return "项目持续推进中";
  }

  function rowTemplate(project) {
    const urgentClass = project.status === "deadline" ? " style=\"color:#dc2626\"" : "";
    const projectSubline = project.status === "parsing" ? project.fileName + " · 项目编号生成中" : project.id + ' · 预算 <b class="amount-text">' + project.budget + "</b>";
    const entryHref = projectEntryPage(project) + "?id=" + encodeURIComponent(project.id);
    const stateAction = project.status === "archived" ?
      '<button class="project-row-action-btn danger" type="button" data-project-action="delete"><span class="btn-icon">' + icons.trash + '</span><span>删除</span></button>' :
      '<button class="project-row-action-btn" type="button" data-project-action="archive"><span class="btn-icon">' + icons.archive + '</span><span>归档</span></button>';
    const actionContent = '<a class="project-entry-btn compact-btn" href="' + entryHref + '"><span class="btn-icon">' + icons.enter + '</span><span>进入项目</span></a>' + stateAction;
    const stageTone = project.status === "archived" ? "gray" : "blue";
    const displayStage = listStage(project);
    return [
      '<tr data-project-id="' + project.id + '">',
      '<td><div class="table-primary"><div><strong title="' + project.name + '">' + project.name + '</strong><span>' + projectSubline + '</span></div></div></td>',
      '<td><strong class="purchaser-name" title="' + project.purchaser + '">' + project.purchaser + '</strong></td>',
      '<td><div class="cell-stack"><strong' + urgentClass + '>' + project.deadline + '</strong><span' + urgentClass + '>' + project.deadlineText + '</span></div></td>',
      '<td><div class="stage-cell"><span class="status-tag ' + stageTone + '">' + displayStage + '</span><small>' + projectStageDetail(project) + '</small></div></td>',
      '<td><div class="table-progress"><span class="table-progress-track"><b style="width:' + project.progress + '%"></b></span><b>' + project.progress + '%</b></div></td>',
      '<td><div class="owner-cell"><span class="person-avatar">' + project.owner.slice(0, 1) + '</span><span>' + project.owner + '</span></div></td>',
      '<td><div class="row-actions project-list-actions">' + actionContent + '</div></td>',
      '</tr>'
    ].join("");
  }

  function renderProjects() {
    const filtered = projects.filter(projectMatches);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const pageStart = (currentPage - 1) * pageSize;
    const pageProjects = filtered.slice(pageStart, pageStart + pageSize);
    const body = document.getElementById("projectTableBody");
    const tableWrap = document.getElementById("projectTableWrap");
    const empty = document.getElementById("projectEmptyState");
    body.innerHTML = pageProjects.map(rowTemplate).join("");
    tableWrap.classList.toggle("hidden", filtered.length === 0);
    empty.classList.toggle("hidden", filtered.length !== 0);
    document.getElementById("projectResultCount").textContent = "共 " + filtered.length + " 条项目记录 · 每页 " + pageSize + " 条";
    renderPagination(totalPages, filtered.length);
  }

  function renderPagination(totalPages, totalItems) {
    const pagination = document.getElementById("projectPagination");
    if (!pagination) return;
    if (totalItems === 0) {
      pagination.innerHTML = "";
      return;
    }
    const buttons = ['<button class="page-btn" type="button" data-page="' + (currentPage - 1) + '" aria-label="上一页"' + (currentPage === 1 ? " disabled" : "") + ">‹</button>"];
    for (let page = 1; page <= totalPages; page += 1) {
      buttons.push('<button class="page-btn' + (page === currentPage ? " active" : "") + '" type="button" data-page="' + page + '"' + (page === currentPage ? ' aria-current="page"' : "") + ">" + page + "</button>");
    }
    buttons.push('<button class="page-btn" type="button" data-page="' + (currentPage + 1) + '" aria-label="下一页"' + (currentPage === totalPages ? " disabled" : "") + ">›</button>");
    pagination.innerHTML = buttons.join("");
  }

  function openActionModal(projectId, action) {
    const project = projects.find(function (item) { return item.id === projectId; });
    if (!project) return;
    pendingProjectId = projectId;
    pendingAction = action;
    const isDelete = action === "delete";
    document.getElementById("projectActionTitle").textContent = isDelete ? "删除已归档项目" : "归档项目";
    document.getElementById("projectActionDescription").textContent = isDelete ? "删除后该项目将从项目列表移除。" : "归档后项目将进入已归档列表。";
    document.getElementById("projectActionMessage").textContent = (isDelete ? "确认删除“" : "确认归档“") + project.name + '”？';
    document.getElementById("projectActionHint").textContent = isDelete ? "此操作不可撤销，请确认项目资料已无需继续保留。" : "归档后仍可进入项目查看，并可在投标台账中继续维护结果。";
    document.getElementById("projectActionAlert").className = "info-alert " + (isDelete ? "danger" : "warning");
    const confirm = document.getElementById("confirmProjectAction");
    confirm.className = "primary-btn project-action-confirm" + (isDelete ? " danger" : "");
    confirm.querySelector("span:last-child").textContent = isDelete ? "确认删除" : "确认归档";
    window.projectPrototype.openLayer("projectActionModal");
  }

  function confirmProjectAction() {
    const project = projects.find(function (item) { return item.id === pendingProjectId; });
    if (!project) return;
    if (pendingAction === "archive") {
      projects = projects.map(function (item) {
        if (item.id !== pendingProjectId) return item;
        return Object.assign({}, item, { status: "archived", stage: "交付归档", stageDetail: "已完成交付并归档", progress: 100, deadlineText: "已归档" });
      });
    } else if (pendingAction === "delete") {
      projects = projects.filter(function (item) { return item.id !== pendingProjectId; });
    }
    window.projectPrototype.closeLayers();
    updateProjectCounts();
    renderProjects();
    if (window.showToast) window.showToast(pendingAction === "delete" ? "已删除归档项目" : "项目已归档");
    pendingProjectId = "";
    pendingAction = "";
  }

  function initEvents() {
    document.querySelectorAll("[data-project-filter]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeFilter = button.getAttribute("data-project-filter");
        currentPage = 1;
        document.querySelectorAll("[data-project-filter]").forEach(function (item) { item.classList.toggle("active", item === button); });
        renderProjects();
      });
    });
    ["projectSearch", "stageFilter", "ownerFilter"].forEach(function (id) {
      const node = document.getElementById(id);
      node.addEventListener(id === "projectSearch" ? "input" : "change", function () {
        currentPage = 1;
        renderProjects();
      });
    });
    document.getElementById("resetProjectFilters").addEventListener("click", function () {
      activeFilter = "all";
      currentPage = 1;
      document.getElementById("projectSearch").value = "";
      document.getElementById("stageFilter").value = "all";
      document.getElementById("ownerFilter").value = "all";
      document.querySelectorAll("[data-project-filter]").forEach(function (item) { item.classList.toggle("active", item.getAttribute("data-project-filter") === "all"); });
      renderProjects();
      if (window.showToast) window.showToast("筛选条件已重置");
    });
    document.addEventListener("click", function (event) {
      const actionButton = event.target.closest("[data-project-action]");
      if (!actionButton) return;
      const row = actionButton.closest("tr");
      if (!row) return;
      openActionModal(row.getAttribute("data-project-id"), actionButton.getAttribute("data-project-action"));
    });
    document.getElementById("projectPagination").addEventListener("click", function (event) {
      const pageButton = event.target.closest("[data-page]");
      if (!pageButton || pageButton.disabled) return;
      currentPage = Number(pageButton.getAttribute("data-page"));
      renderProjects();
    });
    document.getElementById("confirmProjectAction").addEventListener("click", confirmProjectAction);
  }

  function init() {
    loadPendingProject();
    updateProjectCounts();
    renderProjects();
    initEvents();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
