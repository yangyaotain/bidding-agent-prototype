(function () {
  "use strict";

  const data = window.BiddingProjectData || {};
  const icon = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M10 17l-5-5 5-5"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    progress: '<svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.7 3.1-6.5 7-6.5s7 2.8 7 6.5"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    spinner: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v6h-6"/></svg>',
    wait: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    warning: '<svg viewBox="0 0 24 24"><path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
  };

  const tabs = [
    { key: "files", label: "招标文件", href: "project-files.html" },
    { key: "analysis", label: "解析结果", href: "project-analysis.html" },
    { key: "writing", label: "标书编制", href: "project-writing.html" },
    { key: "quality", label: "质量审核", href: "project-quality.html" },
    { key: "delivery", label: "交付归档", href: "project-delivery.html" }
  ];

  function isParsingProject(project) {
    const stage = String(project.stage || "");
    return project.status === "parsing" && stage.indexOf("交付") === -1;
  }

  function stageRank(project) {
    const stage = String(project.stage || "");
    if (project.filesChanged) return 0;
    if (stage.indexOf("交付") !== -1 || project.status === "archived") return 4;
    if (isParsingProject(project) || stage.indexOf("解析中") !== -1) return 0;
    if (stage.indexOf("质量") !== -1 || stage.indexOf("人工审核") !== -1) return 3;
    if (stage.indexOf("编制") !== -1 || stage.indexOf("生成") !== -1) return 2;
    return 1;
  }

  function selectedProject() {
    const id = new URLSearchParams(window.location.search).get("id");
    return window.BiddingProjectStore.get(id || (data.featuredProject || {}).id);
  }

  function buildWorkspaceHeader(activeKey, project) {
    project = Object.assign({}, project);
    ["id", "name", "purchaser", "budget", "owner", "deadline", "deadlineText", "stage"].forEach(function (key) {
      if (project[key] != null) project[key] = String(project[key]).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
    });
    const projectId = project.id || "项目编号生成中";
    const isParsing = isParsingProject(project);
    const currentRank = stageRank(project);
    const tabHtml = tabs.map(function (tab, index) {
      const locked = index > currentRank;
      if (locked) return '<span class="workspace-tab locked" aria-disabled="true" title="完成前一阶段后自动解锁"><span>' + tab.label + '</span><i class="workspace-tab-lock">' + icon.wait + '</i></span>';
      return '<a class="workspace-tab' + (tab.key === activeKey ? ' active' : '') + '" href="' + tab.href + '?id=' + encodeURIComponent(projectId) + '"><span>' + tab.label + '</span></a>';
    }).join("");
    const deadline = project.deadline || "待解析";
    const progress = Number(project.progress || 0);
    const parseSummary = isParsing ? "正在解析文件" : "解析已完成";
    const deadlineHint = project.opportunityId && isParsing ? "来自机会公告，解析后需复核" : isParsing ? "将从投标人须知前附表自动识别" : (project.deadlineText || "请按计划完成终审与交付");
    const progressHint = isParsing ? "正在处理主文件及附件" : "当前阶段：" + (project.stage || "项目推进中");
    const budget = project.budget || "待解析";
    const budgetMarkup = budget === "待解析" ? budget : '<b class="amount-text">' + budget + "</b>";

    return [
      '<div class="page-breadcrumb"><a href="dashboard.html">投标助手</a><span>/</span><a href="projects.html">投标项目</a><span>/</span><strong>' + (project.name || "项目信息识别中") + '</strong></div>',
      '<section class="project-identity card">',
      '<div class="project-identity-main">',
      '<a class="project-back" href="projects.html">' + icon.back + '<span>返回项目列表</span></a>',
      '<div class="project-title-line"><h1>' + (project.name || "项目信息识别中") + '</h1><span class="status-tag blue">' + (project.stage || "解析中") + '</span></div>',
      '<div class="project-meta"><span>' + projectId + '</span><i></i><span>采购人：' + (project.purchaser || "待解析") + '</span><i></i><span>预算：' + budgetMarkup + '</span></div>',
      '</div>',
      '<div class="project-status-grid">',
      '<div class="project-status-item' + (isParsing ? '' : ' danger') + '">' + icon.clock + '<div><span>投标截止</span><strong>' + deadline + '</strong><small>' + deadlineHint + '</small></div></div>',
      '<div class="project-status-item">' + icon.progress + '<div><span>' + (isParsing ? "文件解析进度" : "总体进度") + '</span><strong>' + progress + '%</strong><small>' + progressHint + '<i class="mini-progress"><b style="width:' + progress + '%"></b></i></small></div></div>',
      '<div class="project-status-item">' + icon.user + '<div><span>项目负责人</span><strong>' + (project.owner || "李明远") + '</strong><small>' + (project.opportunityId ? "机会转入时已确认" : "当前登录用户 · 可在解析后调整") + '</small></div></div>',
      '<div class="project-status-item">' + icon.file + '<div><span>AI 自动处理</span><strong>' + parseSummary + '</strong><small>' + (project.opportunityId ? "来源机会与文件信息可追溯" : isParsing ? "完成后自动进入解析结果" : "已完成解析、研判和知识匹配") + '</small></div></div>',
      '</div>',
      '<nav class="workspace-tabs" aria-label="项目工作台页面">' + tabHtml + '</nav>',
      '</section>'
    ].join("");
  }

  function buildParsingEmpty(activeKey, project) {
    const tab = tabs.find(function (item) { return item.key === activeKey; });
    const label = tab ? tab.label : "当前页面";
    return [
      '<header class="content-heading"><div><h2>' + label + '</h2><p>AI 正在完成解析、研判和知识匹配，完成后将自动进入解析结果。</p></div></header>',
      '<section class="content-card card"><div class="empty-state" style="padding:76px 24px">',
      icon.warning,
      '<strong>招标文件尚未解析完成，' + label + '暂无数据</strong>',
      '<span>后台正在处理 8 / 34 页。您无需进行中间操作，可以返回列表继续处理其他项目。</span>',
      '<div class="inline-actions" style="justify-content:center;margin-top:20px"><a class="primary-btn" href="project-files.html?id=' + encodeURIComponent(project.id) + '"><span class="btn-icon">' + icon.progress + '</span><span>查看解析进度</span></a><a class="ghost-btn" href="projects.html"><span class="btn-icon">' + icon.back + '</span><span>返回项目列表</span></a></div>',
      '</div></section>'
    ].join("");
  }

  function setNodeText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setStatusTag(id, tone, value) {
    const node = document.getElementById(id);
    if (!node) return;
    node.className = "status-tag " + tone;
    node.textContent = value;
  }

  function applyParsingFileState(project) {
    const card = document.getElementById("fileParseStatusCard");
    if (!card) return;

    const progress = Number(project.progress || 12);
    const fileCount = document.querySelectorAll("[data-project-file-row]").length;
    const attachmentCount = Math.max(0, fileCount - 1);
    card.classList.remove("completed");
    card.classList.add("parsing");
    card.setAttribute("data-parse-state", "parsing");

    const statusIcon = document.getElementById("fileParseStatusIcon");
    if (statusIcon) statusIcon.innerHTML = icon.spinner;
    setNodeText("fileParseStatusTitle", "招标文件解析中");
    setNodeText("fileParseStatusDescription", "当前执行第 3 / 6 步：OCR 与页码索引。任务在后台持续运行，您可以离开当前页面。");
    setStatusTag("fileParseStatusTag", "blue", "解析中 " + progress + "%");

    card.querySelectorAll("[data-file-parse-step]").forEach(function (row) {
      const step = Number(row.getAttribute("data-file-parse-step"));
      const status = row.querySelector(".parse-step-status");
      row.classList.toggle("current", step === 3);
      if (!status) return;
      if (step < 3) {
        status.className = "status-tag green parse-step-status";
        status.textContent = "已完成";
      } else if (step === 3) {
        status.className = "status-tag blue parse-step-status";
        status.textContent = "进行中";
      } else {
        status.className = "status-tag gray parse-step-status";
        status.textContent = "等待中";
      }
    });

    const currentStepDescription = card.querySelector('[data-file-parse-step="3"] > div span');
    if (currentStepDescription) currentStepDescription.textContent = "已处理 8 / 34 页，正在识别运维服务要求";
    setNodeText("mainParseTaskDescription", "已完成 8 / 34 页，正在处理第 9 页");
    setStatusTag("mainParseTaskStatus", "blue", "进行中");
    setNodeText("attachmentParseTaskDescription", attachmentCount ? attachmentCount + " 份附件等待主文件解析后同步处理" : "未检测到独立附件");
    setStatusTag("attachmentParseTaskStatus", "gray", attachmentCount ? "排队中" : "不适用");
    setNodeText("resultParseTaskDescription", "等待文件结构解析完成");
    setStatusTag("resultParseTaskStatus", "gray", "等待中");

    const completeNote = document.getElementById("fileParseCompleteNote");
    if (completeNote) completeNote.classList.add("hidden");
    setNodeText("projectFileCount", String(fileCount));
    setNodeText("projectParsedPageCount", "8 / 34");
    setNodeText("projectRequirementCount", "待生成");
    setNodeText("projectLatestParseTime", "解析中");
    const fileSummary = document.getElementById("projectFileCount");
    const pageSummary = document.getElementById("projectParsedPageCount");
    const requirementSummary = document.getElementById("projectRequirementCount");
    const timeSummary = document.getElementById("projectLatestParseTime");
    if (fileSummary && fileSummary.nextElementSibling) fileSummary.nextElementSibling.textContent = attachmentCount ? "主文件 1、附件 " + attachmentCount + "，正在解析" : "主文件 1，正在解析";
    if (pageSummary && pageSummary.nextElementSibling) pageSummary.nextElementSibling.textContent = "正在处理第 9 页";
    if (requirementSummary && requirementSummary.nextElementSibling) requirementSummary.nextElementSibling.textContent = "结构解析完成后统一生成";
    if (timeSummary && timeSummary.nextElementSibling) timeSummary.nextElementSibling.textContent = "后台持续执行，可离开页面";

    document.querySelectorAll(".file-parse-status").forEach(function (status, index) {
      status.className = "status-tag " + (index === 0 ? "blue" : "gray") + " file-parse-status";
      status.textContent = index === 0 ? "解析中" : "排队中";
    });
  }

  function applyCompletedFileState(project) {
    if (!project.parseCompletedAt) return;
    const completedAt = new Date(project.parseCompletedAt);
    if (Number.isNaN(completedAt.getTime())) return;
    const pad = function (value) { return String(value).padStart(2, "0"); };
    const shortTime = pad(completedAt.getMonth() + 1) + "-" + pad(completedAt.getDate()) + " " + pad(completedAt.getHours()) + ":" + pad(completedAt.getMinutes());
    const fullTime = completedAt.getFullYear() + "-" + shortTime;
    setNodeText("projectLatestParseTime", shortTime);
    const latestNode = document.getElementById("projectLatestParseTime");
    if (latestNode && latestNode.nextElementSibling) latestNode.nextElementSibling.textContent = "本次解析耗时" + (project.parseDurationText || "约 15 秒");
    const completeNote = document.getElementById("fileParseCompleteNote");
    if (completeNote) {
      const value = completeNote.querySelector("strong");
      const hint = completeNote.querySelector("small");
      if (value) value.textContent = fullTime;
      if (hint) hint.textContent = "解析耗时" + (project.parseDurationText || "约 15 秒") + " · AI 已生成完整解析结果";
    }
  }

  function applyProjectState(activeKey, project) {
    if (!isParsingProject(project)) {
      if (activeKey === "files") applyCompletedFileState(project);
      return;
    }
    if (activeKey === "files") {
      applyParsingFileState(project);
      return;
    }
    const content = document.querySelector(".workspace-content");
    if (!content) return;
    content.innerHTML = buildParsingEmpty(activeKey, project);
  }

  function applyDeliveryGuard(activeKey, project) {
    if (activeKey !== "delivery" || stageRank(project) >= 4) return false;
    const content = document.querySelector(".workspace-content");
    if (!content) return false;
    const manualReviewReady = stageRank(project) >= 3;
    const nextHref = manualReviewReady ? "project-quality.html" : "project-writing.html";
    const nextLabel = manualReviewReady ? "进入质量审核" : "返回标书编制";
    content.innerHTML = [
      '<header class="content-heading"><div><h2>交付归档</h2><p>人工质量审核通过后，系统将开放正式文件交付与归档。</p></div></header>',
      '<section class="content-card card"><div class="empty-state" style="padding:76px 24px">',
      icon.wait,
      '<strong>交付归档尚未解锁</strong>',
      '<span>' + (manualReviewReady ? "技术标和商务标送审版本仍待人工审核，请先完成质量审核。" : "请先完成标书编制、智能检查并提交人工质量审核。") + '</span>',
      '<div class="inline-actions" style="justify-content:center;margin-top:20px"><a class="primary-btn" href="' + nextHref + '?id=' + encodeURIComponent(project.id || "BID-202601-001") + '"><span class="btn-icon">' + icon.check + '</span><span>' + nextLabel + '</span></a></div>',
      '</div></section>'
    ].join("");
    return true;
  }

  function closeLayers() {
    document.querySelectorAll(".side-drawer.open, .prototype-modal.open").forEach(function (layer) {
      layer.classList.remove("open");
      layer.setAttribute("aria-hidden", "true");
    });
    const backdrop = document.getElementById("prototypeBackdrop");
    if (backdrop) backdrop.classList.remove("open");
    document.body.classList.remove("layer-open");
  }

  function openLayer(id) {
    const layer = document.getElementById(id);
    if (!layer) return;
    closeLayers();
    layer.classList.add("open");
    layer.setAttribute("aria-hidden", "false");
    const backdrop = document.getElementById("prototypeBackdrop");
    if (backdrop) backdrop.classList.add("open");
    document.body.classList.add("layer-open");
  }

  function initLayers() {
    if (!document.getElementById("prototypeBackdrop")) {
      const backdrop = document.createElement("div");
      backdrop.id = "prototypeBackdrop";
      backdrop.className = "prototype-backdrop";
      backdrop.addEventListener("click", closeLayers);
      document.body.appendChild(backdrop);
    }
    document.addEventListener("click", function (event) {
      const openTrigger = event.target.closest("[data-open-layer]");
      if (openTrigger) {
        event.preventDefault();
        openLayer(openTrigger.getAttribute("data-open-layer"));
        return;
      }
      if (event.target.closest("[data-close-layer]")) {
        event.preventDefault();
        closeLayers();
      }
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeLayers(); });
  }

  function initWorkspace() {
    const root = document.getElementById("projectWorkspaceHeader");
    if (!root) { initLayers(); return; }
    const activeKey = document.body.getAttribute("data-project-section") || "files";
    const project = selectedProject();
    window.projectPrototype.currentProject = project;
    if (!project) {
      const content = document.querySelector(".workspace-content");
      if (content) content.innerHTML = '<section class="content-card card"><div class="empty-state"><strong>项目不存在或已移除</strong><span>请返回项目列表选择当前项目。</span><a class="secondary-btn" href="projects.html"><span class="btn-icon">' + icon.back + '</span><span>返回项目列表</span></a></div></section>';
      return;
    }
    if (root && !window.BiddingProjectStore.allowed(project, activeKey)) {
      window.projectPrototype.currentProject = null;
      window.location.replace(window.BiddingProjectStore.entry(project) + "?id=" + encodeURIComponent(project.id));
      return;
    }
    if (window.ProjectWorkspaceData) window.ProjectWorkspaceData.prepare(activeKey, project);
    if (root) root.innerHTML = buildWorkspaceHeader(activeKey, project);
    if (!applyDeliveryGuard(activeKey, project)) applyProjectState(activeKey, project);
    if (root && window.ProjectWorkspaceData) window.ProjectWorkspaceData.source(root, project);
    initLayers();
  }

  function updateHeader(project) {
    const root = document.getElementById("projectWorkspaceHeader");
    if (!root) return;
    window.projectPrototype.currentProject = project;
    root.innerHTML = buildWorkspaceHeader(document.body.getAttribute("data-project-section") || "files", project);
    if (window.ProjectWorkspaceData) window.ProjectWorkspaceData.source(root, project);
  }
  window.projectPrototype = { openLayer: openLayer, closeLayers: closeLayers, applyProjectState: applyProjectState, updateHeader: updateHeader };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initWorkspace);
  else initWorkspace();
})();
