(function () {
  "use strict";

  const opportunities = window.OpportunityStore;
  const projects = window.BiddingProjectStore;
  const ledger = window.BiddingLedgerData;
  const uiKey = "biddingDashboardView:v2";
  const weeks = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const ui = { tab: "opportunities", filter: "all" };
  let lastSignature = "";
  let businessData = null;
  let dataDirty = true;
  let dataRevision = 0;
  let knowledgeDay = "";
  let refreshQueued = false;
  const icons = {
    arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M4 5h16v14H4zM8 9h8M8 13h5"/>',
    warning: '<path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
    file: '<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h4"/>'
  };

  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function setText(id, value) { const node = document.getElementById(id); if (node) node.textContent = String(value); }
  function svg(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>'; }
  function tag(label, tone) { return '<span class="status-tag ' + tone + '">' + esc(label) + '</span>'; }
  function action(label, href, className, extra) { return '<a class="' + (className || "text-btn") + '" href="' + esc(href) + '"' + (extra || "") + '><span class="btn-icon">' + svg("arrow") + '</span><span>' + esc(label) + '</span></a>'; }
  function time(value, endOfDay) {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    const raw = String(value || "").trim();
    if (!raw) return NaN;
    return Date.parse(raw.replace(" ", "T") + (/[zZ]$|[+-]\d\d:\d\d$/.test(raw) ? "" : /^\d{4}-\d{2}-\d{2}$/.test(raw) ? (endOfDay ? "T23:59:59+08:00" : "T00:00:00+08:00") : "+08:00"));
  }
  function displayDate(value) {
    if (typeof value === "number") {
      const date = new Date(value + 8 * 3600000);
      return date.toISOString().slice(0, 16).replace("T", " ");
    }
    return String(value || "").replace("T", " ").slice(0, 16);
  }
  function openOpportunity(item) { return !item.projectId && ["pending", "approved"].includes(item.review); }
  function reconfirm(item) { return item.review === "approved" && Boolean(item.recheck); }
  function needsConfirmation(item) { return item.review === "pending" || reconfirm(item); }
  function opportunityUrl(item) { return "opportunity-detail.html?id=" + encodeURIComponent(item.id) + "&returnTo=dashboard.html"; }
  function projectUrl(project) { return projects.entry(project) + "?id=" + encodeURIComponent(project.id); }
  function phase(project) { return projects.entry(project).replace("project-", "").replace(".html", ""); }
  function stage(project) {
    const key = phase(project);
    return {
      files: { label: "招标文件", action: project.filesChanged ? "重新解析招标文件" : "查看解析进度", tone: "blue", icon: "file", button: project.filesChanged ? "去解析" : "查看" },
      analysis: { label: "解析结果", action: "确认解析结论", tone: "orange", icon: "check", button: "去确认" },
      writing: { label: "标书编制", action: "继续标书编制", tone: "blue", icon: "file", button: "去编制" },
      quality: { label: "质量审核", action: "审核送审标书", tone: "orange", icon: "check", button: "去审核" },
      delivery: { label: "交付归档", action: "确认最终交付", tone: "green", icon: "check", button: "去交付" }
    }[key];
  }
  function opportunityDates(item) {
    return [["获取截止", item.acquired ? "" : item.acquisitionEnd], ["报名截止", item.registered ? "" : item.registrationEnd], ["投标截止", item.deadline]].filter(function (row) { return Number.isFinite(time(row[1], true)); }).map(function (row) { return { label: row[0], raw: row[1], at: time(row[1], true) }; }).sort(function (a, b) { return a.at - b.at; });
  }
  function opportunityDeadline(item, now, forTask) {
    const dates = opportunityDates(item);
    if (opportunities.status(item, now).blocked && Number.isFinite(time(item.deadline, true))) return { label: "投标截止", raw: item.deadline, at: time(item.deadline, true) };
    return (forTask ? dates[0] : dates.find(function (row) { return row.at > now; }) || dates[0]) || { label: "投标截止", raw: "", at: NaN };
  }
  function hasMainFile(item) { return (item.files || []).some(function (file) { return file.main && /\.(pdf|docx?)$/i.test(file.name || ""); }); }
  function opportunityConcern(item, now) {
    const timing = opportunities.status(item, now);
    if (timing.blocked) return timing.text + "，请查看或调整参与决定";
    if (reconfirm(item)) return "需根据最新内容重新确认";
    if (timing.key === "acquisitionClosed") return "获取/报名已截止";
    if (item.review === "approved" && !hasMainFile(item)) return "转入前需补齐主招标文件";
    return item.review === "approved" ? "已确认，尚未转入项目" : "查看初评后决定是否投标";
  }
  function knowledgeSummary() {
    const data = window.KnowledgePrototypeData || {};
    const keys = ["companyRecords", "certificates", "peopleRecords", "caseRecords", "solutionRecords", "businessRecords", "templateRecords", "chartRecords", "historyRecords"];
    const rows = keys.reduce(function (all, key) { return all.concat(data[key] || []); }, []).filter(function (row) { return !row.deleted && row.lifecycleState !== "archived"; });
    const profiles = data.peopleProfiles || [];
    let warnings = 0, expired = 0;
    rows.filter(function (row) { return row.parseStatus !== "processing"; }).forEach(function (row) {
      const evidence = row.category === "people" ? ((profiles.find(function (p) { return p.id === row.id; }) || {}).certificates || []).filter(function (c) { return !c.deleted && c.lifecycleState !== "archived"; }) : [row];
      const infos = evidence.map(function (entry) { return window.KnowledgeValidity.info(entry); });
      if (infos.some(function (info) { return info.warning; })) warnings += 1;
      if (infos.some(function (info) { return info.key === "expired"; })) expired += 1;
    });
    return { active: rows.length, processing: rows.filter(function (row) { return row.parseStatus === "processing"; }).length, warnings: warnings, expired: expired };
  }

  function makeTasks(items, activeProjects, now) {
    const tasks = items.filter(function (item) { return openOpportunity(item) && needsConfirmation(item); }).map(function (item) {
      const timing = opportunities.status(item, now), due = opportunityDeadline(item, now, true);
      const title = reconfirm(item) ? "重新确认投标决定" : timing.blocked ? "人工确认机会处理决定" : "人工确认是否投标";
      const event = (item.history || []).find(function (entry) { return reconfirm(item) ? /关联更正|筛选要求更新|重新初评/.test(entry.action) : /采集入库/.test(entry.action); });
      return { id: "op:" + item.id, title: title, name: item.name, href: opportunityUrl(item), button: "去确认", context: "招标机会 · " + opportunityConcern(item, now), due: due.at, dueRaw: due.raw, dueLabel: due.label, created: time(event && event.at || item.captured, false), icon: "check" };
    });
    activeProjects.forEach(function (project) {
      const key = phase(project), current = stage(project), timing = projects.deadlineState(project, now);
      // Only explicit human decision gates create Home tasks; progress or proximity alone does not.
      const gate = { analysis: { title: "确认综合投标结论", button: "去确认" }, quality: { title: "人工审核送审标书", button: "去审核" }, delivery: { title: "确认交付归档", button: "去确认" } }[key];
      if (!gate) return;
      tasks.push({ id: "project:" + project.id, title: gate.title, name: project.name, href: projectUrl(project), button: gate.button, context: "投标项目 · " + (project.stageDetail || current.label), due: timing.at, dueRaw: Number.isFinite(timing.at) ? project.deadline : "", dueLabel: "项目投标截止", created: NaN, icon: "check" });
    });
    const unique = Array.from(new Map(tasks.map(function (task) { return [task.id, task]; })).values());
    return unique.sort(function (a, b) {
      const aDue = Number.isFinite(a.due) ? a.due : Infinity, bDue = Number.isFinite(b.due) ? b.due : Infinity;
      const aCreated = Number.isFinite(a.created) ? a.created : Infinity, bCreated = Number.isFinite(b.created) ? b.created : Infinity;
      return (aDue - bDue) || (aCreated - bCreated) || a.id.localeCompare(b.id);
    });
  }
  function refreshBusinessData(now) {
    opportunities.refresh();
    businessData = {
      items: opportunities.get().opportunities,
      activeProjects: projects.all().filter(function (project) { return project.status !== "archived"; }),
      records: ledger.all(),
      knowledge: knowledgeSummary()
    };
    knowledgeDay = new Date(now).toDateString();
    dataDirty = false;
    dataRevision += 1;
  }
  function model(now) {
    if (dataDirty || !businessData) refreshBusinessData(now);
    if (knowledgeDay !== new Date(now).toDateString()) {
      businessData.knowledge = knowledgeSummary();
      knowledgeDay = new Date(now).toDateString();
      dataRevision += 1;
    }
    const items = businessData.items, activeProjects = businessData.activeProjects;
    const open = items.filter(openOpportunity), nearOps = open.filter(function (item) { return opportunities.isUrgent(item, now); }), nearProjects = activeProjects.filter(function (project) { return projects.isUrgent(project, now); });
    const nearKeys = new Set(nearOps.map(function (item) { return "op:" + item.id; }).concat(nearProjects.map(function (project) { return project.opportunityId ? "op:" + project.opportunityId : "project:" + project.id; })));
    return { now: now, opportunityCount: items.length, open: open, activeProjects: activeProjects, records: businessData.records, knowledge: businessData.knowledge, tasks: makeTasks(items, activeProjects, now), nearOps: nearOps, nearProjects: nearProjects, nearCount: nearKeys.size };
  }
  function selectedMetric() {
    return ui.filter !== "all" ? ui.filter : ui.tab === "projects" ? "active" : "";
  }
  function renderMetrics(data) {
    const waiting = data.open.filter(needsConfirmation), approved = data.open.filter(function (item) { return item.review === "approved"; }), rechecks = approved.filter(reconfirm).length;
    setText("opConfirmationMetric", waiting.length); setText("opApprovedMetric", approved.length); setText("activeProjectMetric", data.activeProjects.length); setText("urgentMetric", data.nearCount); setText("taskMetric", data.tasks.length);
    const hint = rechecks ? "其中 " + rechecks + " 条需重新确认" : "尚未转入正式投标项目";
    setText("approvedMetricHint", hint);
    document.querySelector('[data-home-metric="approved"]').title = "已确认但未转入项目；" + hint + "，不等于均可直接转入。";
    document.querySelector('[data-home-metric="urgent"]').title = "72 小时内获取、报名或投标截止；机会 " + data.nearOps.length + " 条、项目 " + data.nearProjects.length + " 个，关联对象去重，已截止不计入。";
    document.querySelectorAll("[data-home-metric]:not([data-home-metric='tasks'])").forEach(function (node) { node.setAttribute("aria-pressed", String(node.dataset.homeMetric === selectedMetric())); });
  }
  function renderHeader(data) {
    const date = new Date(data.now), hour = date.getHours();
    const greeting = hour < 6 ? "夜深了" : hour < 11 ? "上午好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好";
    setText("currentDate", date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日 " + weeks[date.getDay()]);
    setText("dashboardGreeting", greeting + "，" + ((window.AppCurrentUser || {}).name || "李明远"));
    setText("dashboardSummary", "当前有 " + data.open.filter(needsConfirmation).length + " 条机会待确认，" + data.activeProjects.length + " 个投标项目正在推进。建议按业务期限优先处理待办事项。");
    const first = sortedProjects(data)[0], node = document.getElementById("continuePriorityProject");
    node.href = first ? projectUrl(first) : "projects.html";
    node.querySelector("span:last-child").textContent = first ? stage(first).action : "查看投标项目";
  }
  function sortedOpportunities(data) {
    return data.open.slice().sort(function (a, b) {
      const rank = function (item) { return opportunities.isUrgent(item, data.now) ? 0 : reconfirm(item) ? 1 : opportunities.status(item, data.now).blocked ? 4 : item.review === "approved" ? 2 : 3; };
      const deadline = function (item) { const at = opportunityDeadline(item, data.now, false).at; return Number.isFinite(at) ? at : Infinity; };
      return rank(a) - rank(b) || deadline(a) - deadline(b) || Number(opportunities.assessment(b).result.score || 0) - Number(opportunities.assessment(a).result.score || 0) || a.id.localeCompare(b.id);
    });
  }
  function sortedProjects(data) {
    const rank = function (project) { return projects.isUrgent(project, data.now) ? 0 : ({ delivery: 1, quality: 2, analysis: 3, writing: 4, files: 5 })[phase(project)]; };
    const deadline = function (project) { const at = projects.deadlineState(project, data.now).at; return Number.isFinite(at) ? at : Infinity; };
    return data.activeProjects.slice().sort(function (a, b) { return rank(a) - rank(b) || deadline(a) - deadline(b) || a.id.localeCompare(b.id); });
  }
  function scoreState(item) {
    const saved = opportunities.assessment(item), raw = saved.result.score, numeric = raw == null ? NaN : Number(raw), known = Number.isFinite(numeric);
    const band = !known ? "unknown" : numeric >= 80 ? "high" : numeric >= 60 ? "medium" : "low";
    const title = (saved.stale ? "上次初评" : "机会初评分") + " · " + saved.snapshot.at + " · 公告 V" + saved.snapshot.noticeRevision + " / 规则 V" + saved.snapshot.ruleRevision;
    return '<div class="home-score-state"><strong class="home-score home-score-' + band + '" title="' + esc(title) + '" aria-label="' + esc(title + (known ? "，" + numeric + "分" : "，未留存分数")) + '">' + (known ? esc(numeric) : "—") + '</strong>' + tag(item.review === "approved" ? "已确认投标" : "待确认", item.review === "approved" ? "green" : "blue") + '</div>' + (saved.stale ? '<small class="home-aux">上次初评</small>' : "");
  }
  function money(value) { return value == null || !Number.isFinite(Number(value)) ? '<span class="home-muted">公告未明确</span>' : '<strong class="amount-text home-money">' + esc(Number(value).toLocaleString("zh-CN")) + '<small>万元</small></strong>'; }
  function padRows(rows, message) {
    if (!rows.length) return '<tr><td colspan="5" class="home-empty">' + esc(message) + '</td></tr>';
    while (rows.length < 4) rows.push('<tr class="preview-spacer" aria-hidden="true"><td colspan="5"></td></tr>');
    return rows.join("");
  }
  function renderLists(data) {
    const ops = sortedOpportunities(data).filter(function (item) { return ui.filter === "confirmation" ? needsConfirmation(item) : ui.filter === "approved" ? item.review === "approved" : ui.filter === "urgent" ? opportunities.isUrgent(item, data.now) : true; });
    const bids = sortedProjects(data).filter(function (project) { return ui.filter !== "urgent" || projects.isUrgent(project, data.now); });
    setText("homeOpportunityCount", ops.length); setText("homeProjectCount", bids.length);
    document.getElementById("priorityOpportunityBody").innerHTML = padRows(ops.slice(0, 4).map(function (item) {
      const due = opportunityDeadline(item, data.now, false), timing = opportunities.status(item, data.now), near = due.at > data.now && due.at - data.now <= 72 * 3600000;
      const hint = timing.blocked ? timing.text : Number.isFinite(due.at) && due.at <= data.now ? due.label.replace(/截止$/, "已截止") : due.label + (near ? " · 72 小时内" : "");
      return '<tr><td class="project-name"><a class="home-name-link" title="' + esc(item.name) + '" href="' + esc(opportunityUrl(item)) + '">' + esc(item.name) + '</a><span title="' + esc(item.purchaser + " · " + opportunityConcern(item, data.now)) + '">' + esc(item.purchaser) + '</span></td><td>' + money(item.amount) + '</td><td class="deadline-cell' + (near && !timing.blocked ? " urgent" : "") + '"><strong>' + esc(due.raw ? displayDate(due.raw) : "公告未明确") + '</strong><span title="' + esc(hint + " · " + opportunityConcern(item, data.now)) + '">' + esc(hint) + '</span></td><td>' + scoreState(item) + '</td><td>' + action("详情", opportunityUrl(item)) + '</td></tr>';
    }), "暂无符合当前条件的招标机会。");
    document.getElementById("priorityProjectBody").innerHTML = padRows(bids.slice(0, 4).map(function (project) {
      const current = stage(project), timing = projects.deadlineState(project, data.now), context = project.id + " · 负责人 " + (project.owner || "待指定") + (project.opportunityId ? " · 机会转入" : "");
      return '<tr><td class="project-name"><strong title="' + esc(project.name) + '">' + esc(project.name) + '</strong><span title="' + esc(context) + '">' + esc(context) + '</span></td><td class="deadline-cell' + (timing.key === "near" ? " urgent" : "") + '"><strong>' + esc(project.deadline || "待解析") + '</strong><span>' + esc(timing.label) + '</span></td><td>' + tag(current.label, current.tone) + '</td><td class="next-action-cell"><strong>' + esc(current.action) + '</strong><span title="' + esc(project.stageDetail) + '">' + esc(project.stageDetail || "继续推进当前阶段") + '</span></td><td>' + action("进入", projectUrl(project)) + '</td></tr>';
    }), "暂无符合当前条件的投标项目。");
    document.querySelectorAll("[data-home-tab]").forEach(function (button) {
      const selected = button.dataset.homeTab === ui.tab;
      button.classList.toggle("active", selected); button.setAttribute("aria-selected", String(selected)); button.tabIndex = selected ? 0 : -1;
    });
    document.getElementById("homeOpportunityPanel").hidden = ui.tab !== "opportunities";
    document.getElementById("homeProjectPanel").hidden = ui.tab !== "projects";
    const viewAll = document.getElementById("dashboardViewAll");
    viewAll.href = ui.tab === "projects" ? ui.filter === "urgent" ? "projects.html?filter=deadline" : "projects.html?filter=active" : ui.filter === "urgent" ? "opportunities.html?tab=list&metric=urgent" : ui.filter === "approved" ? "opportunities.html?tab=list&metric=approved" : "opportunities.html?tab=list";
    viewAll.querySelector("span:last-child").textContent = ui.tab === "opportunities" ? "全部机会" : "全部项目";
    const label = ui.filter === "confirmation" ? "首次确认及需重新确认" : ui.filter === "approved" ? "已确认但未转入" : ui.filter === "urgent" ? "72 小时内关键期限临近" : ui.tab === "opportunities" ? "待确认及已确认未转入" : "未归档项目";
    const count = ui.tab === "opportunities" ? ops.length : bids.length;
    setText("dashboardListScope", label + " · 共 " + count + " 条" + (count > 4 ? "，优先展示 4 条" : "") + (ui.filter === "urgent" ? "；可切换 Tab 查看另一类记录。" : ""));
  }
  function renderTasks(data) {
    setText("dashboardTaskCount", data.tasks.length + " 项");
    document.getElementById("dashboardTaskList").innerHTML = data.tasks.slice(0, 5).map(function (task) {
      const overdue = Number.isFinite(task.due) && task.due <= data.now;
      const label = overdue ? task.dueLabel.replace(/截止$/, "已截止") : task.dueLabel;
      const unknown = task.id.startsWith("op:") ? "公告未明确参与期限" : "项目投标截止待明确";
      const timing = task.dueRaw ? label + " " + displayDate(task.dueRaw) : unknown;
      const timingMarkup = task.dueRaw ? esc(label) + ' <time>' + esc(displayDate(task.dueRaw)) + '</time>' : unknown;
      return '<div class="task-item"><span class="task-status ' + (overdue ? "danger" : "warning") + '">' + svg(task.icon) + '</span><div class="task-copy"><strong title="' + esc(task.title + " · " + task.context) + '">' + esc(task.title) + '</strong><span class="task-object" title="' + esc(task.name) + '">' + esc(task.name) + '</span><span class="task-time' + (overdue ? " overdue" : "") + '" title="' + esc(timing + "；按业务期限排序，非人工任务到期时间") + '">' + timingMarkup + '</span></div>' + action(task.button, task.href, "task-action-btn") + '</div>';
    }).join("") || '<div class="home-empty">暂无待处理事项</div>';
    setText("dashboardTaskNote", data.tasks.length > 5 ? "按业务期限展示前 5 项；无明确期限的事项排在后面。" : "按机会参与期限或项目投标截止排序；无期限按已有产生时间排序。");
  }
  function renderFlow(data) {
    const counts = { files: 0, analysis: 0, writing: 0, quality: 0, delivery: 0 };
    data.activeProjects.forEach(function (project) { counts[phase(project)] += 1; });
    setText("flowOpportunity", "已入库 " + data.opportunityCount + " 条");
    setText("flowDecision", "已确认未转入 " + data.open.filter(function (item) { return item.review === "approved"; }).length + " 条");
    setText("flowAnalysis", "解析与研判 " + (counts.files + counts.analysis) + " 个");
    setText("flowWriting", "编制中 " + counts.writing + " 个");
    setText("flowQuality", "审核中 " + counts.quality + " 个");
    setText("flowDelivery", "待交付 " + counts.delivery + " 个");
    const pending = data.records.filter(function (record) { return record.result === "pending"; }).length;
    const reviews = data.records.filter(function (record) { return record.result !== "pending" && record.reviewStatus !== "已完成"; }).length;
    setText("flowResults", "待结果 " + pending + " · 待复盘 " + reviews);
    setText("flowKnowledge", "在库资料 " + data.knowledge.active + " 项");
    setText("validityReminderCount", data.knowledge.warnings + " 项");
    setText("processingReminderCount", data.knowledge.processing + " 项");
    setText("resultReminderCount", pending + " 项");
    setText("validityReminderText", data.knowledge.warnings ? data.knowledge.warnings + " 项资料需关注，其中 " + data.knowledge.expired + " 项已过期" : "当前暂无有效期预警资料");
    setText("processingReminderText", data.knowledge.processing ? data.knowledge.processing + " 项资料正在识别或结构化处理" : "当前暂无解析中的资料");
    setText("resultReminderText", pending ? pending + " 个已投项目等待维护结果公告、得分与排名" : "当前暂无结果待维护的项目");
  }
  function saveUi() { try { window.sessionStorage.setItem(uiKey, JSON.stringify(ui)); } catch (error) { /* Navigation still works without local view storage. */ } }
  function restoreUi() {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(uiKey) || "null");
      if (!stored) return;
      if (["opportunities", "projects"].includes(stored.tab)) ui.tab = stored.tab;
      if (["all", "confirmation", "approved", "urgent"].includes(stored.filter)) ui.filter = stored.filter;
      if (ui.tab === "projects" && ["confirmation", "approved"].includes(ui.filter)) ui.filter = "all";
    } catch (error) { /* Start from the opportunity preview. */ }
  }
  function render(force) {
    const data = model(Date.now());
    // Business stores are read on entry or external changes; the timer checks only time-dependent state.
    const signature = JSON.stringify([dataRevision, ui, new Date(data.now).toDateString(), new Date(data.now).getHours(), data.activeProjects.map(function (project) { return projects.deadlineState(project, data.now).key; }), data.tasks.map(function (task) { return [task.id, task.due <= data.now]; }), data.open.map(function (item) { return [opportunities.status(item, data.now).key, opportunities.isUrgent(item, data.now), opportunityDeadline(item, data.now, false).raw]; })]);
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    renderHeader(data); renderMetrics(data); renderLists(data); renderTasks(data); renderFlow(data);
  }
  function requestDataRefresh() {
    dataDirty = true;
    if (document.hidden || refreshQueued) return;
    refreshQueued = true;
    window.setTimeout(function () { refreshQueued = false; render(false); }, 0);
  }
  function init() {
    restoreUi(); render(true);
    document.addEventListener("click", function (event) {
      const metric = event.target.closest("[data-home-metric]"), tab = event.target.closest("[data-home-tab]");
      if (metric) {
        const key = metric.dataset.homeMetric;
        if (key === "tasks") {
          document.getElementById("dashboardTasks").scrollIntoView({ block: "nearest", behavior: "smooth" });
          document.getElementById("dashboardTaskTitle").focus({ preventScroll: true });
          return;
        }
        ui.filter = key === "active" ? "all" : key;
        if (key === "urgent") {
          const data = model(Date.now());
          // Keep the current tab when it has matches, otherwise open the matching category.
          if (ui.tab === "opportunities" && !data.nearOps.length && data.nearProjects.length) ui.tab = "projects";
          else if (ui.tab === "projects" && !data.nearProjects.length && data.nearOps.length) ui.tab = "opportunities";
        } else {
          ui.tab = key === "active" ? "projects" : "opportunities";
        }
        saveUi(); render(true);
      } else if (tab) {
        if (ui.tab === tab.dataset.homeTab) return;
        ui.tab = tab.dataset.homeTab;
        if (ui.filter !== "urgent") ui.filter = "all";
        saveUi(); render(true);
      }
    });
    document.querySelector(".dashboard-tabs").addEventListener("keydown", function (event) {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? "opportunities" : event.key === "End" ? "projects" : ui.tab === "opportunities" ? "projects" : "opportunities";
      document.querySelector('[data-home-tab="' + next + '"]').click();
      document.querySelector('[data-home-tab="' + next + '"]').focus();
    });
    window.addEventListener("storage", requestDataRefresh);
    window.addEventListener("pageshow", function (event) { if (event.persisted) requestDataRefresh(); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) requestDataRefresh(); });
    window.setInterval(function () { if (!document.hidden) render(false); }, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
