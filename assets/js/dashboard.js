(function () {
  "use strict";

  const data = window.BiddingProjectData || {};
  const weekNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const dashboardSummary = {
    gaps: 4,
    confirmations: 8,
    pendingResults: 1
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function formatDate(date) {
    return date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日 " + weekNames[date.getDay()];
  }

  function greetingByHour(hour) {
    if (hour < 6) return "夜深了";
    if (hour < 11) return "上午好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  }

  function projectList() {
    const projects = (data.projects || []).slice();
    const featured = data.featuredProject;
    if (!featured || !featured.id) return projects;
    return projects.map(function (project) {
      return project.id === featured.id ? Object.assign({}, project, featured) : project;
    });
  }

  function activeProjects() {
    return projectList().filter(function (project) { return project.status !== "archived"; });
  }

  function stageKey(project) {
    const stage = String(project.stage || "");
    if (project.status === "parsing" || stage.indexOf("解析中") !== -1 || stage.indexOf("招标文件") !== -1) return "files";
    if (stage.indexOf("交付") !== -1) return "delivery";
    if (stage.indexOf("质量审核") !== -1 || stage.indexOf("人工审核") !== -1) return "quality";
    if (stage.indexOf("编制") !== -1) return "writing";
    return "analysis";
  }

  function stageDefinition(project) {
    const key = stageKey(project);
    if (key === "files") return { label: "招标文件", tone: "blue", action: "查看解析进度" };
    if (key === "delivery") return { label: "交付归档", tone: "green", action: "确认最终交付" };
    if (key === "quality") return { label: "质量审核", tone: "orange", action: "审核送审标书" };
    if (key === "writing") return { label: "标书编制", tone: "blue", action: "继续标书编制" };
    return { label: "解析结果", tone: "orange", action: "确认解析结论" };
  }

  function projectEntry(project) {
    const key = stageKey(project);
    const file = key === "files" ? "project-files.html" : key === "analysis" ? "project-analysis.html" : key === "writing" ? "project-writing.html" : key === "quality" ? "project-quality.html" : "project-delivery.html";
    return file + "?id=" + encodeURIComponent(project.id);
  }

  function priorityRank(project) {
    if (project.status === "deadline") return 0;
    if (stageKey(project) === "delivery") return 1;
    if (stageKey(project) === "quality") return 2;
    if (stageKey(project) === "analysis") return 3;
    return 4;
  }

  function priorityProjects() {
    return activeProjects().sort(function (left, right) {
      const rank = priorityRank(left) - priorityRank(right);
      if (rank !== 0) return rank;
      return String(left.deadline || "9999").localeCompare(String(right.deadline || "9999"));
    });
  }

  function renderHeader() {
    const now = new Date();
    const projects = activeProjects();
    const urgent = projects.filter(function (project) { return project.status === "deadline"; }).length;
    const dateNode = document.getElementById("currentDate");
    const greetingNode = document.getElementById("dashboardGreeting");
    const summaryNode = document.getElementById("dashboardSummary");
    if (dateNode) dateNode.textContent = formatDate(now);
    if (greetingNode) greetingNode.textContent = greetingByHour(now.getHours()) + "，李明远";
    if (summaryNode) summaryNode.textContent = "当前有 " + projects.length + " 个投标项目正在推进，其中 " + urgent + " 个临近截标。建议优先处理解析结论确认、质量问题整改和最终交付确认。";
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value);
  }

  function renderMetrics() {
    const projects = activeProjects();
    setText("deadlineMetric", projects.filter(function (project) { return project.status === "deadline"; }).length);
    setText("gapMetric", dashboardSummary.gaps);
    setText("confirmationMetric", dashboardSummary.confirmations);
    setText("deliveryMetric", projects.filter(function (project) { return stageKey(project) === "delivery"; }).length);
    setText("resultMetric", dashboardSummary.pendingResults);
  }

  function renderPriorityProjects() {
    const body = document.getElementById("priorityProjectBody");
    if (!body) return;
    const projects = priorityProjects().slice(0, 4);
    body.innerHTML = projects.map(function (project) {
      const stage = stageDefinition(project);
      const urgent = project.status === "deadline";
      const deadlineHint = urgent ? "临近截标" : "按计划推进";
      return [
        "<tr>",
        '<td class="project-name"><strong title="' + escapeHtml(project.name) + '">' + escapeHtml(project.name) + "</strong><span>" + escapeHtml(project.id) + " · 负责人 " + escapeHtml(project.owner) + "</span></td>",
        '<td class="deadline-cell' + (urgent ? " urgent" : "") + '"><strong>' + escapeHtml(project.deadline || "待确认") + "</strong><span>" + deadlineHint + "</span></td>",
        '<td><span class="status-tag ' + stage.tone + '">' + stage.label + "</span></td>",
        '<td class="next-action-cell"><strong>' + stage.action + "</strong><span>" + escapeHtml(project.stageDetail || "继续推进当前阶段") + "</span></td>",
        '<td><a class="text-btn" href="' + projectEntry(project) + '"><span class="btn-icon"><svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></svg></span><span>进入</span></a></td>',
        "</tr>"
      ].join("");
    }).join("");

    const first = projects[0];
    const continueLink = document.getElementById("continuePriorityProject");
    if (first && continueLink) {
      continueLink.href = projectEntry(first);
      const label = continueLink.querySelector("span:last-child");
      if (label) label.textContent = stageDefinition(first).action;
    }
  }

  function renderStageSummary() {
    const counts = { files: 0, analysis: 0, writing: 0, quality: 0, delivery: 0 };
    activeProjects().forEach(function (project) { counts[stageKey(project)] += 1; });
    setText("stageFilesCount", counts.files);
    setText("stageAnalysisCount", counts.analysis);
    setText("stageWritingCount", counts.writing);
    setText("stageQualityCount", counts.quality);
    setText("stageDeliveryCount", counts.delivery);
  }

  function init() {
    renderHeader();
    renderMetrics();
    renderPriorityProjects();
    renderStageSummary();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
