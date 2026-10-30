(function () {
  "use strict";

  let projects = window.BiddingProjectStore.all();
  const entryParams = new URLSearchParams(window.location.search);
  let activeFilter = ["all", "ongoing", "deadline", "archived", "active"].includes(entryParams.get("filter")) ? entryParams.get("filter") : "all";
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
    projects = window.BiddingProjectStore.all();
  }

  function listStage(project) {
    const page = window.BiddingProjectStore.entry(project);
    if (page === "project-files.html") return project.status === "parsing" ? "解析中" : "招标文件";
    return { "project-analysis.html": "解析结果", "project-writing.html": "标书编制", "project-quality.html": "质量审核", "project-delivery.html": "交付归档" }[page];
  }

  function updateProjectCounts() {
    const counts = projects.reduce(function (summary, project) {
      summary.all += 1;
      if (window.BiddingProjectStore.isUrgent(project)) summary.deadline += 1;
      if (project.status === "archived") summary.archived += 1;
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
    const near = projects.filter(function (project) { return window.BiddingProjectStore.isUrgent(project); }).sort(function (left, right) { return window.BiddingProjectStore.deadlineState(left).at - window.BiddingProjectStore.deadlineState(right).at; });
    const hint = document.getElementById("deadlineProjectHint");
    if (hint) hint.textContent = near.length ? "最早截止 " + near[0].deadline : "当前无 72 小时内截标的项目";
  }

  function projectMatches(project) {
    const query = (document.getElementById("projectSearch").value || "").trim().toLowerCase();
    const stage = document.getElementById("stageFilter").value;
    const owner = document.getElementById("ownerFilter").value;
    const searchable = [project.name, project.id, project.purchaser].join(" ").toLowerCase();
    const filterMatch = activeFilter === "all" ||
      (activeFilter === "active" && project.status !== "archived") ||
      (activeFilter === "ongoing" && project.status !== "archived") ||
      (activeFilter === "deadline" && window.BiddingProjectStore.isUrgent(project)) ||
      (activeFilter === "archived" && project.status === "archived");
    const stageMatch = stage === "all" || (stage === "解析与研判" ? ["project-files.html", "project-analysis.html"].includes(projectEntryPage(project)) : listStage(project) === stage);
    return filterMatch && (!query || searchable.indexOf(query) !== -1) && stageMatch && (owner === "all" || project.owner === owner);
  }

  function projectEntryPage(project) {
    return window.BiddingProjectStore.entry(project);
  }

  function projectStageDetail(project) {
    if (project.stageDetail) return project.stageDetail;
    if (project.stage === "解析中") return "AI 正在逐页识别采购文件";
    if (project.stage === "解析结果") return "待确认综合投标结论";
    if (listStage(project) === "标书编制") return "技术标、商务标编制与智能检查中";
    if (listStage(project) === "质量审核") return "技术标、商务标送审版本待人工审核";
    if (project.stage === "交付归档") return project.status === "archived" ? "已完成交付并归档" : "待确认最终交付文件";
    return "项目持续推进中";
  }

  function rowTemplate(rawProject) {
    const project = Object.assign({}, rawProject);
    ["name", "purchaser", "budget", "deadline", "deadlineText", "stageDetail", "owner", "fileName"].forEach(function (key) {
      project[key] = String(project[key] || "").replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
    });
    const timing = window.BiddingProjectStore.deadlineState(rawProject);
    const urgentClass = timing.key === "near" ? " style=\"color:#dc2626\"" : "";
    project.deadlineText = timing.label;
    const projectSubline = project.opportunityId ? '<span>招标机会转入 · ' + project.id + '</span>' : project.status === "parsing" ?
      '<span class="project-row-parsing">' + project.fileName + " · 项目编号生成中</span>" :
      "<span>" + project.id + "</span>";
    const budgetContent = project.status === "parsing" && project.budget === "待解析" ?
      '<span class="table-amount-pending">待解析</span>' :
      '<strong class="table-amount amount-text">' + project.budget + "</strong>";
    const entryHref = projectEntryPage(project) + "?id=" + encodeURIComponent(project.id);
    const stateAction = project.status === "archived" ?
      '<button class="project-row-action-btn danger" type="button" data-project-action="delete"><span class="btn-icon">' + icons.trash + '</span><span>删除</span></button>' :
      '<button class="project-row-action-btn" type="button" data-project-action="archive"' + (project.stage !== "交付归档" ? ' disabled title="完成质量审核和交付确认后可归档"' : '') + '><span class="btn-icon">' + icons.archive + '</span><span>归档</span></button>';
    const actionContent = '<a class="project-entry-btn compact-btn" href="' + entryHref + '"><span class="btn-icon">' + icons.enter + '</span><span>进入项目</span></a>' + stateAction;
    const stageTone = project.status === "archived" ? "gray" : "blue";
    const displayStage = listStage(project);
    return [
      '<tr data-project-id="' + project.id + '">',
      '<td><div class="table-primary"><div><strong title="' + project.name + '">' + project.name + "</strong>" + projectSubline + "</div></div></td>",
      '<td><strong class="purchaser-name" title="' + project.purchaser + '">' + project.purchaser + '</strong></td>',
      "<td>" + budgetContent + "</td>",
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
    document.getElementById("projectResultCount").textContent = (activeFilter === "active" ? "未归档项目 · " : "") + "共 " + filtered.length + " 条项目记录 · 每页 " + pageSize + " 条";
    document.querySelector(".module-heading p").textContent = activeFilter === "active" ? "当前仅查看未归档项目；可调整阶段、切换状态或重置筛选条件。" : "统一管理招标文件、解析结果、标书编制、质量审核与交付归档。";
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
    try {
      if (pendingAction === "archive") window.BiddingProjectStore.save(pendingProjectId, { status: "archived", stage: "交付归档", stageDetail: "已完成交付并归档", progress: 100, deadlineText: "已归档" });
      else window.BiddingProjectStore.remove(pendingProjectId);
      projects = window.BiddingProjectStore.all();
      window.projectPrototype.closeLayers(); updateProjectCounts(); renderProjects();
      if (window.showToast) window.showToast(pendingAction === "delete" ? "已删除归档项目" : "项目已归档");
      pendingProjectId = ""; pendingAction = "";
    } catch (error) { if (window.showToast) window.showToast(error.message, "warning"); }
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
    const stageFilter = document.getElementById("stageFilter");
    if (Array.from(stageFilter.options).some(function (option) { return option.value === entryParams.get("stage"); })) stageFilter.value = entryParams.get("stage");
    // An active-stage entry includes deadline projects; retain the existing status tabs.
    document.querySelectorAll("[data-project-filter]").forEach(function (button) {
      const value = button.getAttribute("data-project-filter");
      button.classList.toggle("active", value === activeFilter || activeFilter === "active" && value === "all");
    });
    updateProjectCounts();
    renderProjects();
    initEvents();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
