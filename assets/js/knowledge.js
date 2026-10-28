(function () {
  "use strict";

  const data = window.KnowledgePrototypeData || {};
  const activeSection = document.body.getAttribute("data-knowledge-section") || "all";
  const isPeoplePage = activeSection === "people";
  const catalogCollections = {
    company: data.companyRecords || [],
    certificates: data.certificates || [],
    cases: data.caseRecords || [],
    solutions: data.solutionRecords || [],
    business: data.businessRecords || [],
    templates: data.templateRecords || [],
    charts: data.chartRecords || [],
    history: data.historyRecords || []
  };
  const isCatalogPage = Object.prototype.hasOwnProperty.call(catalogCollections, activeSection);
  const overviewRecords = [].concat(
    data.companyRecords || [], data.certificates || [], data.peopleRecords || [], data.caseRecords || [],
    data.solutionRecords || [], data.businessRecords || [], data.templateRecords || [], data.chartRecords || [], data.historyRecords || []
  );
  const currentUserName = (window.AppCurrentUser && window.AppCurrentUser.name) || "李明远";
  const validity = window.KnowledgeValidity || { info: function () { return { applicable: false, warning: false, key: "none", label: "不涉及", tone: "gray", dateText: "" }; } };
  const profileMap = (data.peopleProfiles || []).reduce(function (result, profile) {
    result[profile.id] = profile;
    return result;
  }, {});
  let activeTab = new URLSearchParams(window.location.search).get("view") || "instore";
  let mainPage = 1;
  const mainPageSize = 10;

  const icons = {
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.7 3.1-6.5 7-6.5s7 2.8 7 6.5"/></svg>',
    enter: '<svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4"/></svg>',
    archive: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M9 13h6"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>'
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function closeRowMenus() {
    document.querySelectorAll(".knowledge-row-menu").forEach(function (menu) { menu.classList.add("hidden"); });
    document.querySelectorAll(".knowledge-more-btn").forEach(function (button) { button.setAttribute("aria-expanded", "false"); });
  }

  function recordStatus(item) {
    if (item.lifecycleState === "archived") return { key: "archived", label: "已归档", tone: "gray", note: (item.archivedAt || "-") + " · " + (item.archivedBy || currentUserName) };
    if (item.parseStatus === "processing") return { key: "processing", label: "解析中", tone: "blue", note: "正在提取资料属性" };
    const note = item.manualFilled ? "AI 未识别结果，已人工补充" : item.category === "certificates" && item.dateRange ? "AI 识别：" + item.dateRange : "AI 已提取标签与摘要";
    return { key: "stored", label: "已入库", tone: "green", note: note };
  }

  function stateMatches(item, key) {
    if (key === "all") return true;
    if (key === "instore") return item.lifecycleState !== "archived";
    if (key === "validity-alert") return item.lifecycleState !== "archived" && itemHasValidityWarning(item);
    return recordStatus(item).key === key;
  }

  function fileIconMarkup(fileName) {
    if (window.BiddingFileIcons) return window.BiddingFileIcons.markup(fileName, "knowledge-record-format-icon");
    return '<span class="file-type-icon type-generic knowledge-record-format-icon"><span class="file-format-mark">FILE</span></span>';
  }

  function personValiditySummary(item) {
    const profile = profileMap[item.id] || {};
    const infos = (profile.certificates || []).filter(function (certificate) { return certificate.lifecycleState !== "archived" && !certificate.deleted; }).map(function (certificate) { return validity.info(certificate); }).filter(function (info) { return info.applicable; });
    const warnings = infos.filter(function (info) { return info.warning; });
    const expired = warnings.filter(function (info) { return info.key === "expired"; });
    if (expired.length) return { applicable: true, warning: true, label: expired.length + " 项证书已过期", tone: "red", dateText: expired[0].dateText };
    if (warnings.length) return { applicable: true, warning: true, label: warnings.length + " 项证书临期", tone: "orange", dateText: warnings[0].dateText };
    if (infos.length) return { applicable: true, warning: false, label: "证书有效", tone: "green", dateText: "暂无到期预警" };
    return { applicable: false, warning: false, label: "未关联证书", tone: "gray", dateText: "" };
  }

  function itemValidity(item) {
    if (item.parseStatus === "processing") return { applicable: false, warning: false, key: "pending", label: "待识别", tone: "gray", dateText: "" };
    return item.category === "people" ? personValiditySummary(item) : validity.info(item);
  }

  function itemHasValidityWarning(item) {
    return itemValidity(item).warning;
  }

  function syncRecordSummary(records) {
    const available = (records || []).filter(function (item) { return !item.deleted; });
    const active = available.filter(function (item) { return item.lifecycleState !== "archived"; });
    const stored = active.filter(function (item) { return item.parseStatus !== "processing"; });
    const processing = active.filter(function (item) { return item.parseStatus === "processing"; });
    const archived = available.filter(function (item) { return item.lifecycleState === "archived"; });
    const validityAlerts = active.filter(itemHasValidityWarning);
    const values = {
      "知识资料": available.length,
      "在库资料": active.length,
      "已入库": stored.length,
      "解析中": processing.length,
      "有效期预警": validityAlerts.length,
      "已归档": archived.length
    };
    document.querySelectorAll(".knowledge-metric-copy").forEach(function (metric) {
      const label = metric.querySelector("span");
      const value = metric.querySelector("strong");
      if (label && value && Object.prototype.hasOwnProperty.call(values, label.textContent.trim())) value.textContent = values[label.textContent.trim()];
    });
    [
      ["instore", active.length],
      ["stored", stored.length],
      ["processing", processing.length],
      ["validity-alert", validityAlerts.length],
      ["archived", archived.length]
    ].forEach(function (entry) {
      const count = document.querySelector('[data-knowledge-tab="' + entry[0] + '"] b');
      if (count) count.textContent = entry[1];
    });
  }

  function validityCellHtml(item) {
    const info = itemValidity(item);
    if (!info.applicable) return '<span class="knowledge-validity-na">—</span>';
    return '<div class="knowledge-cell-stack knowledge-validity-cell"><span class="status-tag ' + info.tone + '">' + escapeHtml(info.label) + '</span><small title="' + escapeHtml(info.dateText) + '">' + escapeHtml(info.dateText) + '</small></div>';
  }

  function prioritizeValidityWarnings(records) {
    if (activeTab !== "validity-alert" && activeTab !== "expiring") return records;
    return records.slice().sort(function (left, right) {
      const leftInfo = itemValidity(left);
      const rightInfo = itemValidity(right);
      const leftExpired = leftInfo.tone === "red" ? 0 : 1;
      const rightExpired = rightInfo.tone === "red" ? 0 : 1;
      if (leftExpired !== rightExpired) return leftExpired - rightExpired;
      const leftDate = left.validityDueDate || left.endDate || "9999-12-31";
      const rightDate = right.validityDueDate || right.endDate || "9999-12-31";
      return leftDate.localeCompare(rightDate);
    });
  }

  function actionMenu(item) {
    const archived = item.lifecycleState === "archived";
    if (!archived && item.parseStatus === "processing") return "";
    return [
      '<button class="ghost-btn compact-btn knowledge-more-btn" type="button" aria-expanded="false" title="更多操作" aria-label="更多操作"><span class="btn-icon">' + icons.more + '</span><span>更多</span></button>',
      '<div class="knowledge-row-menu hidden">',
      archived
        ? '<button class="danger" type="button" data-knowledge-action="delete" data-knowledge-id="' + escapeHtml(item.id) + '">' + icons.trash + '<span>删除资料</span></button>'
        : '<button type="button" data-knowledge-action="edit" data-knowledge-id="' + escapeHtml(item.id) + '">' + icons.edit + '<span>编辑资料</span></button><button type="button" data-knowledge-action="archive" data-knowledge-id="' + escapeHtml(item.id) + '">' + icons.archive + '<span>归档资料</span></button>',
      '</div>'
    ].join("");
  }

  function rowActions(item) {
    return '<div class="knowledge-row-actions"><button class="text-btn compact-btn knowledge-view-btn" type="button" data-knowledge-action="detail" data-knowledge-id="' + escapeHtml(item.id) + '"><span class="btn-icon">' + icons.enter + '</span><span>查看</span></button>' + actionMenu(item) + '</div>';
  }

  function commonRow(item, showCategory, showValidity) {
    const status = recordStatus(item);
    const typeTags = (item.tags || []).slice(0, 2).join(" · ");
    const categoryTitle = showCategory ? (item.categoryLabel || "知识资料") : (item.type || "资料");
    const categoryNote = status.key === "processing" ? "解析完成后自动更新" : showCategory ? (item.type || "未识别类型") : (typeTags || "AI 自动生成标签");
    const isPerson = item.category === "people";
    const actions = isPerson
      ? '<div class="knowledge-row-actions"><button class="text-btn compact-btn knowledge-view-btn" type="button" data-knowledge-action="person-detail" data-knowledge-id="' + escapeHtml(item.id) + '"><span class="btn-icon">' + icons.enter + '</span><span>进入档案</span></button></div>'
      : rowActions(item);
    return [
      '<tr data-knowledge-row="' + escapeHtml(item.id) + '">',
      '<td><div class="knowledge-name-cell">' + (isPerson ? '<span class="knowledge-file-icon person">' + icons.person + '</span>' : fileIconMarkup(item.file)) + '<div><button class="knowledge-name-button" type="button" data-knowledge-action="' + (isPerson ? 'person-detail' : 'detail') + '" data-knowledge-id="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + '</button><span>' + escapeHtml(item.file || item.id) + '</span></div></div></td>',
      '<td><div class="knowledge-cell-stack"><strong>' + escapeHtml(categoryTitle) + '</strong><span>' + escapeHtml(categoryNote) + '</span></div></td>',
      '<td><div class="knowledge-cell-stack"><strong>' + escapeHtml(item.summary || item.description || "AI 正在生成内容摘要") + '</strong><span>' + escapeHtml(typeTags) + '</span></div></td>',
      '<td><div class="knowledge-cell-stack"><span class="status-tag ' + status.tone + '">' + status.label + '</span><small>' + escapeHtml(status.note) + '</small></div></td>',
      showValidity ? '<td>' + validityCellHtml(item) + '</td>' : '',
      '<td><div class="knowledge-cell-stack"><strong>' + escapeHtml(status.key === "archived" ? item.archivedAt || "-" : item.updatedAt || "-") + '</strong><span>' + escapeHtml(status.key === "archived" ? item.archivedBy || currentUserName : currentUserName) + '</span></div></td>',
      '<td>' + actions + '</td>',
      '</tr>'
    ].join("");
  }

  function mainMatches(item) {
    const query = (document.getElementById("knowledgeSearch").value || "").trim().toLowerCase();
    const category = document.getElementById("knowledgeCategoryFilter").value;
    const searchable = [item.name, item.id, item.categoryLabel, item.type, item.summary, (item.tags || []).join(" ")].join(" ").toLowerCase();
    return !item.deleted && stateMatches(item, activeTab) &&
      (!query || searchable.indexOf(query) !== -1) &&
      (category === "all" || item.category === category);
  }

  function renderMainRecords() {
    syncRecordSummary(overviewRecords);
    const filtered = prioritizeValidityWarnings(overviewRecords.filter(mainMatches));
    const pageCount = Math.max(1, Math.ceil(filtered.length / mainPageSize));
    mainPage = Math.min(mainPage, pageCount);
    const offset = (mainPage - 1) * mainPageSize;
    const visible = filtered.slice(offset, offset + mainPageSize);
    document.getElementById("knowledgeTableBody").innerHTML = visible.map(function (item) { return commonRow(item, true, true); }).join("");
    document.getElementById("knowledgeTableWrap").classList.toggle("hidden", filtered.length === 0);
    document.getElementById("knowledgeEmptyState").classList.toggle("hidden", filtered.length !== 0);
    document.getElementById("knowledgeResultCount").textContent = "当前展示 " + visible.length + " 条 · 筛选结果 " + filtered.length + " 项 · 资料共 " + overviewRecords.length + " 项";
    const pagination = document.getElementById("knowledgePagination");
    pagination.innerHTML = '<button class="knowledge-page-btn" type="button" data-main-page="' + Math.max(1, mainPage - 1) + '" aria-label="上一页"' + (mainPage === 1 ? ' disabled' : '') + '>‹</button>' +
      Array.from({ length: pageCount }, function (_, index) { const page = index + 1; return '<button class="knowledge-page-btn' + (page === mainPage ? ' active' : '') + '" type="button" data-main-page="' + page + '">' + page + '</button>'; }).join("") +
      '<button class="knowledge-page-btn" type="button" data-main-page="' + Math.min(pageCount, mainPage + 1) + '" aria-label="下一页"' + (mainPage === pageCount ? ' disabled' : '') + '>›</button>';
  }

  function catalogMatches(item) {
    const query = (document.getElementById("catalogSearch").value || "").trim().toLowerCase();
    const type = document.getElementById("catalogTypeFilter").value;
    const searchable = [item.name, item.id, item.type, item.summary, item.description, (item.tags || []).join(" ")].join(" ").toLowerCase();
    return !item.deleted && stateMatches(item, activeTab) &&
      (!query || searchable.indexOf(query) !== -1) &&
      (type === "all" || item.type === type);
  }

  function renderCatalogRecords() {
    syncRecordSummary(catalogCollections[activeSection] || []);
    const filtered = prioritizeValidityWarnings((catalogCollections[activeSection] || []).filter(catalogMatches));
    const showValidity = true;
    document.getElementById("catalogTableBody").innerHTML = filtered.map(function (item) { return commonRow(item, false, showValidity); }).join("");
    document.getElementById("catalogTableWrap").classList.toggle("hidden", filtered.length === 0);
    document.getElementById("catalogEmptyState").classList.toggle("hidden", filtered.length !== 0);
    const label = document.body.getAttribute("data-category-label") || "知识资料";
    const count = (catalogCollections[activeSection] || []).length;
    document.getElementById("catalogResultCount").textContent = "当前展示 " + filtered.length + " 条资料 · " + label + "共 " + count + " 项";
  }

  function peopleRow(item) {
    const profile = profileMap[item.id] || {};
    const certificateCount = (profile.certificates || []).filter(function (record) { return record.lifecycleState !== "archived" && !record.deleted; }).length;
    const experienceCount = (profile.experiences || []).filter(function (record) { return record.lifecycleState !== "archived" && !record.deleted; }).length;
    const materialCount = (profile.materials || []).filter(function (record) { return record.lifecycleState !== "archived" && !record.deleted; }).length;
    const archived = item.lifecycleState === "archived";
    const validitySummary = personValiditySummary(item);
    const attention = archived ? (item.archivedAt || "-") + " · " + (item.archivedBy || currentUserName) : validitySummary.warning ? validitySummary.dateText : "人员主档已建立";
    const menu = archived
      ? '<button class="danger" type="button" data-knowledge-action="person-delete" data-knowledge-id="' + escapeHtml(item.id) + '">' + icons.trash + '<span>删除人员</span></button>'
      : '<button type="button" data-knowledge-action="person-edit" data-knowledge-id="' + escapeHtml(item.id) + '">' + icons.edit + '<span>编辑人员</span></button><button type="button" data-knowledge-action="person-archive" data-knowledge-id="' + escapeHtml(item.id) + '">' + icons.archive + '<span>归档人员</span></button>';
    return [
      '<tr data-knowledge-row="' + escapeHtml(item.id) + '">',
      '<td><div class="knowledge-name-cell"><span class="knowledge-file-icon person">' + icons.person + '</span><div><button class="knowledge-name-button" type="button" data-knowledge-action="person-detail" data-knowledge-id="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + '</button><span>' + escapeHtml(item.id) + '</span></div></div></td>',
      '<td><div class="knowledge-cell-stack"><strong>' + escapeHtml(profile.department || "未填写部门") + '</strong><span>' + escapeHtml(profile.position || item.type) + '</span></div></td>',
      '<td><div class="knowledge-cell-stack"><strong>' + escapeHtml(item.type) + '</strong><span>' + escapeHtml((item.tags || []).slice(0, 2).join(" · ")) + '</span></div></td>',
      '<td><div class="knowledge-cell-stack"><strong>' + certificateCount + ' 项证书 · ' + experienceCount + ' 段经历</strong><span>' + materialCount + ' 项证明材料已关联</span></div></td>',
      '<td><div class="knowledge-cell-stack"><span class="status-tag ' + (archived ? 'gray' : 'green') + '">' + (archived ? '已归档' : '在库') + '</span>' + (!archived && validitySummary.warning ? '<span class="status-tag ' + validitySummary.tone + ' knowledge-inline-validity">' + escapeHtml(validitySummary.label) + '</span>' : '') + '<small>' + escapeHtml(attention) + '</small></div></td>',
      '<td><div class="knowledge-cell-stack"><strong>' + escapeHtml(archived ? item.archivedAt || "-" : item.updatedAt) + '</strong><span>' + escapeHtml(archived ? item.archivedBy || currentUserName : currentUserName) + '</span></div></td>',
      '<td><div class="knowledge-row-actions"><button class="text-btn compact-btn knowledge-view-btn" type="button" data-knowledge-action="person-detail" data-knowledge-id="' + escapeHtml(item.id) + '"><span class="btn-icon">' + icons.enter + '</span><span>' + (archived ? '查看档案' : '进入档案') + '</span></button><button class="ghost-btn compact-btn knowledge-more-btn" type="button" aria-expanded="false"><span class="btn-icon">' + icons.more + '</span><span>更多</span></button><div class="knowledge-row-menu hidden">' + menu + '</div></div></td>',
      '</tr>'
    ].join("");
  }

  function peopleMatches(item) {
    const query = (document.getElementById("peopleSearch").value || "").trim().toLowerCase();
    const role = document.getElementById("peopleRoleFilter").value;
    const profile = profileMap[item.id] || {};
    const searchable = [item.name, item.id, item.type, profile.department, profile.position, (item.tags || []).join(" ")].join(" ").toLowerCase();
    const tabMatch = (activeTab === "instore" && item.lifecycleState !== "archived") ||
      (activeTab === "expiring" && item.lifecycleState !== "archived" && personValiditySummary(item).warning) ||
      (activeTab === "archived" && item.lifecycleState === "archived");
    return !item.deleted && tabMatch && (!query || searchable.indexOf(query) !== -1) && (role === "all" || item.type === role);
  }

  function syncPeopleSummary() {
    const records = (data.peopleRecords || []).filter(function (item) { return !item.deleted; });
    const active = records.filter(function (item) { return item.lifecycleState !== "archived"; });
    const archived = records.filter(function (item) { return item.lifecycleState === "archived"; });
    const warnings = active.filter(function (item) { return personValiditySummary(item).warning; });
    const linked = active.filter(function (item) {
      const profile = profileMap[item.id] || {};
      return [profile.certificates, profile.experiences, profile.materials].some(function (list) { return (list || []).some(function (record) { return record.lifecycleState !== "archived" && !record.deleted; }); });
    });
    [["peopleMetricInStore", active.length], ["peopleMetricLinked", linked.length], ["peopleMetricWarnings", warnings.length], ["peopleMetricArchived", archived.length], ["peopleTabInStore", active.length], ["peopleTabWarnings", warnings.length], ["peopleTabArchived", archived.length]].forEach(function (entry) {
      const node = document.getElementById(entry[0]);
      if (node) node.textContent = entry[1];
    });
  }

  function renderPeopleRecords() {
    syncPeopleSummary();
    const filtered = prioritizeValidityWarnings((data.peopleRecords || []).filter(peopleMatches));
    document.getElementById("peopleTableBody").innerHTML = filtered.map(peopleRow).join("");
    document.getElementById("peopleTableWrap").classList.toggle("hidden", filtered.length === 0);
    document.getElementById("peopleEmptyState").classList.toggle("hidden", filtered.length !== 0);
    const total = (data.peopleRecords || []).filter(function (item) { return !item.deleted; }).length;
    document.getElementById("peopleResultCount").textContent = "当前展示 " + filtered.length + " 条" + (activeTab === "archived" ? "已归档" : activeTab === "expiring" ? "预警" : "在库") + "档案 · 人员档案共 " + total + " 项";
  }

  function currentCollection() {
    if (isPeoplePage) return data.peopleRecords || [];
    if (isCatalogPage) return catalogCollections[activeSection] || [];
    return overviewRecords;
  }

  function findItem(id) {
    return currentCollection().find(function (item) { return item.id === id; });
  }

  function renderCurrentPage() {
    if (isPeoplePage) renderPeopleRecords();
    else if (isCatalogPage) renderCatalogRecords();
    else renderMainRecords();
  }

  function setActiveTab(value) {
    activeTab = value;
    if (!isPeoplePage && !isCatalogPage) mainPage = 1;
    document.querySelectorAll("[data-knowledge-tab]").forEach(function (button) {
      const active = button.getAttribute("data-knowledge-tab") === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    renderCurrentPage();
  }

  function handleKnowledgeAction(action, item) {
    if (!item) return;
    if (action === "person-detail") {
      window.location.href = "knowledge-person-detail.html?id=" + encodeURIComponent(item.id) + "&v=20260717-3";
      return;
    }
    if (action === "person-edit") {
      window.knowledgePrototype.openPersonModal("edit", item);
      return;
    }
    if (action === "person-archive") {
      window.knowledgePrototype.openArchive(item);
      return;
    }
    if (action === "person-delete") {
      window.knowledgePrototype.openDelete(item);
      return;
    }
    if (action === "detail") window.knowledgePrototype.openDetail(item);
    const presetCategory = activeSection !== "all" && activeSection !== "people" ? activeSection : "";
    if (action === "edit") window.knowledgePrototype.openAssetModal("edit", item, presetCategory);
    if (action === "archive") window.knowledgePrototype.openArchive(item);
    if (action === "delete") window.knowledgePrototype.openDelete(item);
  }

  function bindTableEvents() {
    document.addEventListener("click", function (event) {
      const more = event.target.closest(".knowledge-more-btn");
      if (more) {
        event.preventDefault();
        event.stopPropagation();
        const menu = more.parentElement.querySelector(".knowledge-row-menu");
        const willOpen = menu.classList.contains("hidden");
        closeRowMenus();
        if (willOpen) {
          menu.classList.remove("hidden");
          more.setAttribute("aria-expanded", "true");
        }
        return;
      }
      const actionButton = event.target.closest("[data-knowledge-action]");
      if (actionButton) {
        event.preventDefault();
        event.stopPropagation();
        closeRowMenus();
        handleKnowledgeAction(actionButton.getAttribute("data-knowledge-action"), findItem(actionButton.getAttribute("data-knowledge-id")));
        return;
      }
      closeRowMenus();
    });
  }

  function bindTabs() {
    document.querySelectorAll("[data-knowledge-tab]").forEach(function (button) {
      button.addEventListener("click", function () { setActiveTab(button.getAttribute("data-knowledge-tab")); });
    });
  }

  function initMainPage() {
    const initialCategory = new URLSearchParams(window.location.search).get("category") || "all";
    document.getElementById("knowledgeCategoryFilter").value = initialCategory;
    ["knowledgeSearch", "knowledgeCategoryFilter"].forEach(function (id) {
      const node = document.getElementById(id);
      node.addEventListener(id === "knowledgeSearch" ? "input" : "change", function () { mainPage = 1; renderMainRecords(); });
    });
    document.getElementById("resetKnowledgeFilters").addEventListener("click", function () {
      document.getElementById("knowledgeSearch").value = "";
      document.getElementById("knowledgeCategoryFilter").value = "all";
      setActiveTab("instore");
      window.showToast("筛选条件已重置", "success");
    });
    document.querySelectorAll("[data-create-asset]").forEach(function (button) {
      button.addEventListener("click", function () { window.knowledgePrototype.openAssetModal("create", null, ""); });
    });
    document.getElementById("knowledgePagination").addEventListener("click", function (event) {
      const button = event.target.closest("[data-main-page]");
      if (!button || button.disabled) return;
      mainPage = Number(button.getAttribute("data-main-page")) || 1;
      renderMainRecords();
    });
  }

  function initCatalogPage() {
    ["catalogSearch", "catalogTypeFilter"].forEach(function (id) {
      const node = document.getElementById(id);
      node.addEventListener(id === "catalogSearch" ? "input" : "change", renderCatalogRecords);
    });
    document.getElementById("resetCatalogFilters").addEventListener("click", function () {
      document.getElementById("catalogSearch").value = "";
      document.getElementById("catalogTypeFilter").value = "all";
      setActiveTab("instore");
      window.showToast("筛选条件已重置", "success");
    });
    document.querySelectorAll("[data-create-catalog]").forEach(function (button) {
      button.addEventListener("click", function () { window.knowledgePrototype.openAssetModal("create", null, activeSection); });
    });
  }

  function initPeoplePage() {
    ["peopleSearch", "peopleRoleFilter"].forEach(function (id) {
      const node = document.getElementById(id);
      node.addEventListener(id === "peopleSearch" ? "input" : "change", renderPeopleRecords);
    });
    document.getElementById("resetPeopleFilters").addEventListener("click", function () {
      document.getElementById("peopleSearch").value = "";
      document.getElementById("peopleRoleFilter").value = "all";
      setActiveTab("instore");
      window.showToast("筛选条件已重置", "success");
    });
    document.querySelectorAll("[data-create-person]").forEach(function (button) {
      button.addEventListener("click", function () { window.knowledgePrototype.openPersonModal("create", null); });
    });
    document.querySelectorAll("[data-import-people]").forEach(function (button) {
      button.addEventListener("click", function () { window.knowledgePrototype.openPersonImportModal("people"); });
    });
    document.querySelectorAll("[data-import-credentials]").forEach(function (button) {
      button.addEventListener("click", function () { window.knowledgePrototype.openPersonImportModal("credentials"); });
    });
  }

  function init() {
    bindTableEvents();
    bindTabs();
    if (isPeoplePage) initPeoplePage();
    else if (isCatalogPage) initCatalogPage();
    else initMainPage();
    const allowedTabs = Array.from(document.querySelectorAll("[data-knowledge-tab]")).map(function (button) { return button.getAttribute("data-knowledge-tab"); });
    document.addEventListener("knowledge-record-changed", function (event) {
      const detail = event.detail || {};
      if (detail.action === "create" && Array.isArray(detail.records)) {
        if (!isPeoplePage && !isCatalogPage) {
          detail.records.slice().reverse().forEach(function (record) { overviewRecords.unshift(record); });
          document.getElementById("knowledgeSearch").value = "";
          document.getElementById("knowledgeCategoryFilter").value = "all";
          mainPage = 1;
        } else if (isCatalogPage) {
          document.getElementById("catalogSearch").value = "";
          document.getElementById("catalogTypeFilter").value = "all";
        }
        setActiveTab("processing");
        return;
      }
      renderCurrentPage();
    });
    const defaultTab = "instore";
    setActiveTab(allowedTabs.indexOf(activeTab) !== -1 ? activeTab : defaultTab);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
