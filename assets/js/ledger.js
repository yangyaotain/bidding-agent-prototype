(function () {
  "use strict";

  const PAGE_SIZE = 6;
  const currentYear = "2026";
  const STORAGE_KEY = "biddingLedgerRecords";
  const ownerOptions = ["李明远", "周晓雯", "王子谦", "陈思远", "赵嘉怡"];
  let activeFilter = "all";
  let currentPage = 1;
  let editingId = null;
  let reviewId = null;
  let activeLayerId = null;
  let resultDirty = false;
  let reviewDirty = false;
  let pendingResultFiles = [];

  const icons = {
    edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>',
    view: '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    review: '<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>',
    previous: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>'
  };

  const defaultRecords = [
    { id: "BID-202606-018", name: "城市运行管理服务平台运维项目", purchaser: "市城市运行管理中心", bidDate: "2026-07-08", bidDateText: "2026-07-08 16:00", archiveDate: "2026-07-08", bidAmount: 508.20, result: "pending", resultDate: "", score: "", rank: "", winner: "", winningAmount: "", owner: "李明远", reviewStatus: "待结果", reviewTone: "gray", source: "", remark: "已完成正式文件交付，等待采购结果公告。" },
    { id: "BID-202606-016", name: "政务云资源池扩容与运维服务项目", purchaser: "市大数据管理中心", bidDate: "2026-06-25", bidDateText: "2026-06-25 09:30", archiveDate: "2026-06-25", bidAmount: 856.80, result: "won", resultDate: "2026-07-03", score: 89.16, rank: 1, winner: "本公司", winningAmount: 856.80, owner: "周晓雯", reviewStatus: "已完成", reviewTone: "green", source: "采购结果公告", remark: "技术方案完整性与服务体系得分领先，报价处于合理区间。" },
    { id: "BID-202605-014", name: "教育数字基座能力扩展项目", purchaser: "市教育信息中心", bidDate: "2026-06-28", bidDateText: "2026-06-28 10:00", archiveDate: "2026-06-28", bidAmount: 628.00, result: "won", resultDate: "2026-07-06", score: 88.72, rank: 1, winner: "本公司", winningAmount: 628.00, owner: "陈思远", reviewStatus: "待复盘", reviewTone: "orange", source: "中标通知书", remark: "整体能力响应完整，教育行业案例与实施计划获得认可。" },
    { id: "BID-202605-012", name: "区域医疗数据交换与共享平台项目", purchaser: "区域卫生健康委员会", bidDate: "2026-05-29", bidDateText: "2026-05-29 14:00", archiveDate: "2026-05-29", bidAmount: 1356.00, result: "lost", resultDate: "2026-06-06", score: 82.34, rank: 3, winner: "华东数字医疗科技有限公司", winningAmount: 1318.60, owner: "陈思远", reviewStatus: "复盘中", reviewTone: "blue", source: "评审结果通知", remark: "主要失分集中在同类医疗数据平台业绩和本地驻场服务能力。" },
    { id: "BID-202604-009", name: "水务集团生产调度平台改造项目", purchaser: "市水务集团有限公司", bidDate: "2026-05-30", bidDateText: "2026-05-30 09:00", archiveDate: "2026-05-30", bidAmount: 912.00, result: "lost", resultDate: "2026-06-08", score: 82.15, rank: 3, winner: "城市水务科技有限公司", winningAmount: 886.40, owner: "李明远", reviewStatus: "待复盘", reviewTone: "orange", source: "采购结果公告与得分表", remark: "技术响应完整，主要差距为水务行业同类案例数量和价格得分。" },
    { id: "BID-202603-026", name: "公共卫生数据分析平台项目", purchaser: "市疾病预防控制中心", bidDate: "2026-04-26", bidDateText: "2026-04-26 14:00", archiveDate: "2026-04-26", bidAmount: 718.00, result: "won", resultDate: "2026-05-08", score: 87.65, rank: 1, winner: "本公司", winningAmount: 718.00, owner: "周晓雯", reviewStatus: "已完成", reviewTone: "green", source: "中标通知书", remark: "数据治理方案、项目团队和公共卫生行业经验构成主要优势。" },
    { id: "BID-202603-007", name: "智慧园区数字化运营平台项目", purchaser: "高新区产业发展集团", bidDate: "2026-03-18", bidDateText: "2026-03-18 09:30", archiveDate: "2026-03-18", bidAmount: 938.00, result: "lost", resultDate: "2026-03-27", score: 80.72, rank: 4, winner: "城市智联科技股份有限公司", winningAmount: 902.40, owner: "王子谦", reviewStatus: "已完成", reviewTone: "green", source: "采购结果公告与得分表", remark: "技术功能覆盖完整，但同类业绩数量和本地服务资源证明不足。" },
    { id: "BID-202602-005", name: "数据中心基础设施监控升级项目", purchaser: "省级政务数据中心", bidDate: "2026-02-26", bidDateText: "2026-02-26 10:00", archiveDate: "2026-02-26", bidAmount: 425.60, result: "won", resultDate: "2026-03-05", score: 87.48, rank: 1, winner: "本公司", winningAmount: 425.60, owner: "李明远", reviewStatus: "已完成", reviewTone: "green", source: "中标通知书", remark: "监控方案、应急响应和项目团队配置获得较高评价。" },
    { id: "BID-202601-003", name: "应急指挥系统集成与升级改造项目", purchaser: "某市应急管理局", bidDate: "2026-01-23", bidDateText: "2026-01-23 10:00", archiveDate: "2026-01-23", bidAmount: 2186.00, result: "lost", resultDate: "2026-02-04", score: 84.10, rank: 2, winner: "安域系统集成有限公司", winningAmount: 2138.00, owner: "王子谦", reviewStatus: "待复盘", reviewTone: "orange", source: "评审结果通知", remark: "总分与第一名接近，价格分和既有应急行业案例数量存在差距。" },
    { id: "BID-202512-031", name: "港口平台运维服务项目", purchaser: "某港口集团有限公司", bidDate: "2025-12-18", bidDateText: "2025-12-18 10:00", archiveDate: "2025-12-18", bidAmount: 59.76, result: "won", resultDate: "2025-12-26", score: 86.42, rank: 1, winner: "本公司", winningAmount: 59.76, owner: "李明远", reviewStatus: "已完成", reviewTone: "green", source: "中标通知书", remark: "质量得分较高，复盘提示服务响应参数必须按项目重新核对。" },
    { id: "BID-202510-024", name: "智慧园区平台建设项目", purchaser: "临港产业园区管委会", bidDate: "2025-10-09", bidDateText: "2025-10-09 09:30", archiveDate: "2025-10-09", bidAmount: 916.30, result: "lost", resultDate: "2025-10-17", score: 78.66, rank: 5, winner: "园区数智科技有限公司", winningAmount: 881.00, owner: "陈思远", reviewStatus: "已完成", reviewTone: "green", source: "采购结果公告", remark: "主要失分为同类业绩和本地服务能力，已形成专项材料补强计划。" },
    { id: "BID-202508-019", name: "政务云平台运维服务项目", purchaser: "市政务服务和数据管理局", bidDate: "2025-08-26", bidDateText: "2025-08-26 10:00", archiveDate: "2025-08-26", bidAmount: 682.40, result: "won", resultDate: "2025-09-03", score: 90.08, rank: 1, winner: "本公司", winningAmount: 682.40, owner: "周晓雯", reviewStatus: "已完成", reviewTone: "green", source: "中标通知书", remark: "服务管理体系、驻场组织和交付计划为主要竞争优势。" }
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function notify(message, type, target) {
    if (window.showToast) window.showToast(message, type, target);
  }

  function todayString() {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }

  function addDays(dateText, amount) {
    const date = new Date((dateText || todayString()) + "T00:00:00");
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + amount);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (!bytes) return "大小待同步";
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function resultDefinition(result) {
    const map = {
      pending: { label: "结果待公布", tone: "orange", short: "待维护" },
      won: { label: "已中标", tone: "green", short: "中标" },
      lost: { label: "未中标", tone: "gray", short: "未中标" }
    };
    return map[result] || map.pending;
  }

  function reviewDefinition(record) {
    if (record.result === "pending") return { label: "待结果", tone: "gray" };
    if (record.reviewStatus === "已完成") return { label: "已完成", tone: "green" };
    if (record.reviewStatus === "复盘中") return { label: "复盘中", tone: "blue" };
    return { label: "待复盘", tone: "orange" };
  }

  function formatAmount(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " 万元";
  }

  function defaultArchiveFiles(record) {
    return [
      { name: "招标文件及附件.pdf", description: "主招标文件 · 归档原格式", category: "招标文件", tone: "blue" },
      { name: "澄清答疑文件.pdf", description: "补遗与澄清资料 · 归档原格式", category: "澄清文件", tone: "blue" },
      { name: "技术标.docx", description: "正式交付版本 · 已完成终审", category: "技术标", tone: "green" },
      { name: "商务标.docx", description: "正式交付版本 · 已完成终审", category: "商务标", tone: "green" },
      { name: record.id + "-最终交付文件包.zip", description: "Word、PDF 与签章文件汇总", category: "交付文件包", tone: "gray" }
    ];
  }

  function defaultKnowledgeItems() {
    return [
      { name: "项目技术方案核心章节.docx", description: "产品与技术方案 · 已确认复用范围", state: "已沉淀" },
      { name: "同类项目业绩证明材料.pdf", description: "业绩案例 · 已关联来源材料", state: "已沉淀" },
      { name: "项目团队履历与证书.zip", description: "人员档案 · 已按人员归档", state: "已沉淀" }
    ];
  }

  function defaultResultFiles(record) {
    if (record.result === "pending") return [];
    const primaryName = record.result === "won" ? "中标通知书.pdf" : "评审结果通知.pdf";
    return [
      { name: primaryName, description: record.source || "正式结果材料", category: "结果佐证", tone: record.result === "won" ? "green" : "gray" },
      { name: "评审得分表.xlsx", description: "本公司得分与排名核验材料", category: "评分材料", tone: "blue" }
    ];
  }

  function defaultReview(record) {
    const completed = record.reviewStatus === "已完成";
    const inProgress = record.reviewStatus === "复盘中";
    const hasContent = completed || inProgress;
    const won = record.result === "won";
    return {
      summary: hasContent ? record.remark : "",
      strengths: hasContent ? (won ? "技术方案完整、服务体系成熟，项目团队配置与实施计划获得较高评价。" : "资格与技术响应完整，核心功能及交付计划均满足招标要求。") : "",
      weaknesses: hasContent ? (won ? "报价测算仍可进一步沉淀同类项目基准，减少重复核算。" : record.remark) : "",
      experience: completed ? (won ? "保留服务体系、项目组织和实施计划章节，纳入同类项目方案素材。" : "提前准备同类案例与本地服务证明，评分策划阶段明确差距和补强责任人。") : "",
      owner: record.owner,
      dueDate: record.resultDate ? addDays(record.resultDate, 14) : "",
      completedAt: completed ? addDays(record.resultDate, 8) : "",
      actions: hasContent ? [
        { task: won ? "固化本项目服务体系与实施计划章节" : "补强同类项目业绩与证明材料", owner: record.owner, dueDate: record.resultDate ? addDays(record.resultDate, 20) : "", done: completed },
        { task: won ? "沉淀报价测算基准与复核清单" : "完善本地服务资源证明与响应模板", owner: won ? "周晓雯" : "陈思远", dueDate: record.resultDate ? addDays(record.resultDate, 30) : "", done: completed }
      ] : []
    };
  }

  function normalizeRecord(input) {
    const record = Object.assign({}, input);
    record.result = ["pending", "won", "lost"].indexOf(record.result) === -1 ? "pending" : record.result;
    if (record.result === "pending") {
      record.reviewStatus = "待结果";
      record.reviewTone = "gray";
    } else {
      const review = reviewDefinition(record);
      record.reviewStatus = review.label;
      record.reviewTone = review.tone;
    }
    record.archiveTime = record.archiveTime || record.archiveDate + " 18:20";
    record.archiveVersion = record.archiveVersion || "正式交付 V1.0";
    record.archiveOperator = record.archiveOperator || record.owner;
    record.archiveFiles = Array.isArray(record.archiveFiles) ? record.archiveFiles : defaultArchiveFiles(record);
    record.resultFiles = Array.isArray(record.resultFiles) ? record.resultFiles : defaultResultFiles(record);
    record.knowledgeItems = Array.isArray(record.knowledgeItems) ? record.knowledgeItems : defaultKnowledgeItems();
    record.review = Object.assign(defaultReview(record), record.review || {});
    record.review.actions = Array.isArray(record.review.actions) ? record.review.actions : [];
    return record;
  }

  function loadRecords() {
    let stored = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(parsed)) stored = parsed;
    } catch (error) {
      stored = [];
    }
    const merged = defaultRecords.map(function (record) { return Object.assign({}, record); });
    stored.forEach(function (saved) {
      const index = merged.findIndex(function (record) { return record.id === saved.id; });
      if (index === -1) merged.push(saved);
      else merged[index] = Object.assign({}, merged[index], saved);
    });
    return merged.map(normalizeRecord).sort(function (a, b) { return String(b.bidDate).localeCompare(String(a.bidDate)); });
  }

  function persistRecords() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch (error) { /* storage unavailable */ }
  }

  let records = loadRecords();

  function recordById(id) {
    return records.find(function (item) { return item.id === id; });
  }

  function baseMatches(record) {
    const query = (document.getElementById("ledgerSearch").value || "").trim().toLowerCase();
    const year = document.getElementById("ledgerYearFilter").value;
    const owner = document.getElementById("ledgerOwnerFilter").value;
    const searchable = [record.id, record.name, record.purchaser].join(" ").toLowerCase();
    return (!query || searchable.indexOf(query) !== -1) &&
      (year === "all" || record.bidDate.slice(0, 4) === year) &&
      (owner === "all" || record.owner === owner);
  }

  function tabMatches(record) {
    if (activeFilter === "review") return record.result !== "pending" && record.reviewStatus !== "已完成";
    return activeFilter === "all" || record.result === activeFilter;
  }

  function filteredRecords() {
    return records.filter(function (record) { return baseMatches(record) && tabMatches(record); });
  }

  function renderMetrics() {
    const yearly = records.filter(function (record) { return record.archiveDate.slice(0, 4) === currentYear; });
    const pending = yearly.filter(function (record) { return record.result === "pending"; });
    const won = yearly.filter(function (record) { return record.result === "won"; });
    const decided = yearly.filter(function (record) { return record.result === "won" || record.result === "lost"; });
    const winningAmount = won.reduce(function (sum, record) { return sum + Number(record.winningAmount || 0); }, 0);
    document.getElementById("ledgerYearTotal").textContent = yearly.length;
    document.getElementById("ledgerPendingTotal").textContent = pending.length;
    document.getElementById("ledgerWonTotal").textContent = won.length;
    document.getElementById("ledgerWonAmount").innerHTML = '年度中标金额 <b class="amount-text">' + formatAmount(winningAmount) + "</b>";
    document.getElementById("ledgerWinRate").textContent = decided.length ? (won.length / decided.length * 100).toFixed(1) + "%" : "0%";
  }

  function renderTabCounts() {
    const base = records.filter(baseMatches);
    const counts = {
      all: base.length,
      pending: base.filter(function (record) { return record.result === "pending"; }).length,
      won: base.filter(function (record) { return record.result === "won"; }).length,
      lost: base.filter(function (record) { return record.result === "lost"; }).length,
      review: base.filter(function (record) { return record.result !== "pending" && record.reviewStatus !== "已完成"; }).length
    };
    document.getElementById("ledgerAllCount").textContent = counts.all;
    document.getElementById("ledgerPendingCount").textContent = counts.pending;
    document.getElementById("ledgerWonCount").textContent = counts.won;
    document.getElementById("ledgerLostCount").textContent = counts.lost;
    document.getElementById("ledgerReviewCount").textContent = counts.review;
  }

  function rowTemplate(record) {
    const result = resultDefinition(record.result);
    const resultClass = record.result === "pending" ? " ledger-result-pending" : "";
    const score = record.score === "" ? "—" : Number(record.score).toFixed(2);
    const rank = record.rank === "" ? "排名待补" : "第 " + record.rank + " 名";
    const resultHint = record.resultDate ? record.resultDate + " 公布" : "公告待跟进";
    const resultText = record.result === "pending" ? "维护结果" : "更新结果";
    return [
      '<tr data-ledger-id="' + escapeHtml(record.id) + '">',
      '<td><div class="table-primary"><div><strong title="' + escapeHtml(record.name) + '">' + escapeHtml(record.name) + '</strong><span class="ledger-project-subline">' + escapeHtml(record.id) + '<i></i>归档于 ' + escapeHtml(record.archiveDate) + "</span></div></div></td>",
      '<td><strong class="purchaser-name" title="' + escapeHtml(record.purchaser) + '">' + escapeHtml(record.purchaser) + "</strong></td>",
      '<td><div class="cell-stack"><strong>' + escapeHtml(record.bidDateText.slice(0, 10)) + '</strong><span>' + escapeHtml(record.bidDateText.slice(11)) + " 截止</span></div></td>",
      '<td><strong class="table-amount amount-text">' + formatAmount(record.bidAmount) + "</strong></td>",
      '<td><div class="ledger-result-cell"><span class="status-tag ' + result.tone + resultClass + '">' + result.label + "</span><small>" + escapeHtml(resultHint) + "</small></div></td>",
      '<td><div class="ledger-score"><strong>' + score + "</strong><span>" + rank + "</span></div></td>",
      '<td><div class="owner-cell"><span class="person-avatar">' + escapeHtml(record.owner.slice(0, 1)) + "</span><span>" + escapeHtml(record.owner) + "</span></div></td>",
      '<td><div class="row-actions"><button class="ledger-action-btn primary-action" type="button" data-edit-result="' + escapeHtml(record.id) + '"><span class="btn-icon">' + icons.edit + "</span><span>" + resultText + '</span></button><button class="ledger-action-btn" type="button" data-ledger-detail="' + escapeHtml(record.id) + '"><span class="btn-icon">' + icons.view + "</span><span>详情</span></button></div></td>",
      "</tr>"
    ].join("");
  }

  function renderPagination(total) {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (!Number.isInteger(currentPage) || currentPage < 1) currentPage = 1;
    if (currentPage > pages) currentPage = pages;
    const pagination = document.getElementById("ledgerPagination");
    if (total <= PAGE_SIZE) {
      pagination.innerHTML = "";
      return;
    }
    const buttons = ['<button class="page-btn" type="button" data-page="previous" aria-label="上一页"' + (currentPage === 1 ? " disabled" : "") + ">" + icons.previous + "</button>"];
    for (let page = 1; page <= pages; page += 1) {
      buttons.push('<button class="page-btn' + (page === currentPage ? " active" : "") + '" type="button" data-page="' + page + '" aria-label="第 ' + page + ' 页">' + page + "</button>");
    }
    buttons.push('<button class="page-btn" type="button" data-page="next" aria-label="下一页"' + (currentPage === pages ? " disabled" : "") + ">" + icons.next + "</button>");
    pagination.innerHTML = buttons.join("");
  }

  function renderTable() {
    if (!Number.isInteger(currentPage) || currentPage < 1) currentPage = 1;
    renderTabCounts();
    const filtered = filteredRecords();
    renderPagination(filtered.length);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRecords = filtered.slice(start, start + PAGE_SIZE);
    const body = document.getElementById("ledgerTableBody");
    const tableWrap = document.getElementById("ledgerTableWrap");
    const empty = document.getElementById("ledgerEmptyState");
    body.innerHTML = pageRecords.map(rowTemplate).join("");
    tableWrap.classList.toggle("hidden", filtered.length === 0);
    empty.classList.toggle("hidden", filtered.length !== 0);
    const end = Math.min(start + pageRecords.length, filtered.length);
    document.getElementById("ledgerResultCount").textContent = filtered.length ? "共 " + filtered.length + " 条台账记录，当前显示 " + (start + 1) + "-" + end + " 条" : "共 0 条台账记录";
  }

  function hasUnsavedChanges() {
    return (activeLayerId === "ledgerResultModal" && resultDirty) || (activeLayerId === "ledgerReviewModal" && reviewDirty);
  }

  function closeLayer(force) {
    if (!force && hasUnsavedChanges() && !window.confirm("当前填写内容尚未保存，确认关闭吗？")) return false;
    document.querySelectorAll(".prototype-modal.open").forEach(function (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    });
    const backdrop = document.getElementById("prototypeBackdrop");
    if (backdrop) backdrop.classList.remove("open");
    document.body.classList.remove("layer-open");
    activeLayerId = null;
    resultDirty = false;
    reviewDirty = false;
    return true;
  }

  function openLayer(id, focusSelector) {
    closeLayer(true);
    const modal = document.getElementById(id);
    const backdrop = document.getElementById("prototypeBackdrop");
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    if (backdrop) backdrop.classList.add("open");
    document.body.classList.add("layer-open");
    activeLayerId = id;
    if (focusSelector) window.setTimeout(function () {
      const target = document.querySelector(focusSelector);
      if (target) target.focus();
    }, 60);
  }

  function fileIcon(name) {
    return window.BiddingFileIcons ? window.BiddingFileIcons.markup(name, "compact-file-icon") : '<span class="file-type-icon compact-file-icon"><span class="file-format-mark">FILE</span></span>';
  }

  function renderResultFiles() {
    const list = document.getElementById("ledgerResultFileList");
    if (!pendingResultFiles.length) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = pendingResultFiles.map(function (file, index) {
      return '<div class="ledger-result-file-item">' + fileIcon(file.name) + '<div><strong title="' + escapeHtml(file.name) + '">' + escapeHtml(file.name) + '</strong><small>' + escapeHtml(file.description || "结果佐证附件") + '</small></div><button type="button" data-remove-result-file="' + index + '">移除</button></div>';
    }).join("");
  }

  function updateResultFieldState() {
    const result = document.getElementById("ledgerResultStatus").value;
    const definition = resultDefinition(result);
    document.querySelectorAll(".ledger-outcome-field").forEach(function (field) { field.classList.toggle("hidden", result === "pending"); });
    document.getElementById("ledgerResultDate").required = result !== "pending";
    document.getElementById("ledgerCurrentResultTag").className = "status-tag " + definition.tone;
    document.getElementById("ledgerCurrentResultTag").textContent = definition.label;
    if (result === "won" && !document.getElementById("ledgerWinner").value.trim()) document.getElementById("ledgerWinner").value = "本公司";
    if (result === "lost" && document.getElementById("ledgerWinner").value.trim() === "本公司") document.getElementById("ledgerWinner").value = "";
  }

  function openResultEditor(id) {
    const record = recordById(id);
    if (!record) return;
    editingId = id;
    pendingResultFiles = record.resultFiles.map(function (file) { return Object.assign({}, file); });
    document.getElementById("ledgerResultProjectName").textContent = record.name;
    document.getElementById("ledgerResultProjectMeta").textContent = record.id + " · " + record.purchaser;
    document.getElementById("ledgerResultStatus").value = record.result;
    document.getElementById("ledgerResultDate").value = record.resultDate || "";
    document.getElementById("ledgerScore").value = record.score;
    document.getElementById("ledgerRank").value = record.rank;
    document.getElementById("ledgerWinner").value = record.winner || "";
    document.getElementById("ledgerWinningAmount").value = record.winningAmount || "";
    document.getElementById("ledgerResultSource").value = record.source || "";
    document.getElementById("ledgerResultRemark").value = record.remark || "";
    updateResultFieldState();
    renderResultFiles();
    resultDirty = false;
    openLayer("ledgerResultModal", "#ledgerResultStatus");
  }

  function saveResult() {
    const record = recordById(editingId);
    if (!record) return;
    const result = document.getElementById("ledgerResultStatus").value;
    const resultDate = document.getElementById("ledgerResultDate").value;
    const winner = document.getElementById("ledgerWinner").value.trim();
    const winningAmount = document.getElementById("ledgerWinningAmount").value;
    const source = document.getElementById("ledgerResultSource").value.trim();
    if (result !== "pending" && !resultDate) {
      notify("请选择结果公布日期", "warning", "#ledgerResultDate");
      return;
    }
    if (result === "won" && !winningAmount) {
      notify("请填写中标金额", "warning", "#ledgerWinningAmount");
      return;
    }
    if (result === "lost" && !winner) {
      notify("请填写中标单位", "warning", "#ledgerWinner");
      return;
    }
    if (result !== "pending" && !source) {
      notify("请填写结果公告或评审反馈来源", "warning", "#ledgerResultSource");
      return;
    }
    record.result = result;
    record.resultDate = resultDate;
    record.score = document.getElementById("ledgerScore").value;
    record.rank = document.getElementById("ledgerRank").value;
    record.winner = result === "pending" ? "" : winner;
    record.winningAmount = result === "pending" ? "" : winningAmount;
    record.source = source;
    record.remark = document.getElementById("ledgerResultRemark").value.trim();
    record.resultFiles = pendingResultFiles.map(function (file) { return Object.assign({}, file); });
    if (result === "pending") {
      record.reviewStatus = "待结果";
      record.reviewTone = "gray";
    } else if (record.reviewStatus === "待结果") {
      record.reviewStatus = "待复盘";
      record.reviewTone = "orange";
    }
    persistRecords();
    renderMetrics();
    renderTable();
    resultDirty = false;
    closeLayer(true);
    notify("投标结果已更新，台账记录已保存", "success");
  }

  function saveListState() {
    const state = {
      activeFilter: activeFilter,
      currentPage: currentPage,
      search: document.getElementById("ledgerSearch").value,
      year: document.getElementById("ledgerYearFilter").value,
      owner: document.getElementById("ledgerOwnerFilter").value
    };
    try { window.sessionStorage.setItem("biddingLedgerListState", JSON.stringify(state)); } catch (error) { /* storage unavailable */ }
  }

  function restoreListState() {
    let state = null;
    try { state = JSON.parse(window.sessionStorage.getItem("biddingLedgerListState") || "null"); } catch (error) { state = null; }
    if (!state) return;
    activeFilter = ["all", "pending", "won", "lost"].indexOf(state.activeFilter) === -1 ? "all" : state.activeFilter;
    currentPage = Number.isInteger(state.currentPage) && state.currentPage > 0 ? state.currentPage : 1;
    document.getElementById("ledgerSearch").value = state.search || "";
    document.getElementById("ledgerYearFilter").value = state.year || currentYear;
    if (!document.getElementById("ledgerYearFilter").value) document.getElementById("ledgerYearFilter").value = currentYear;
    document.getElementById("ledgerOwnerFilter").value = state.owner || "all";
    if (!document.getElementById("ledgerOwnerFilter").value) document.getElementById("ledgerOwnerFilter").value = "all";
    document.querySelectorAll("[data-ledger-filter]").forEach(function (button) {
      const active = button.getAttribute("data-ledger-filter") === activeFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function openDetail(id) {
    const record = recordById(id);
    if (!record) return;
    persistRecords();
    saveListState();
    try { window.sessionStorage.setItem("biddingLedgerSelectedRecord", JSON.stringify(record)); } catch (error) { /* storage unavailable */ }
    window.location.href = "ledger-detail.html?id=" + encodeURIComponent(record.id);
  }

  function reviewActionTemplate(action, index) {
    const ownerSelect = ownerOptions.map(function (owner) {
      return '<option value="' + escapeHtml(owner) + '"' + (owner === action.owner ? " selected" : "") + ">" + escapeHtml(owner) + "</option>";
    }).join("");
    return '<div class="ledger-review-action-row" data-review-action-row><input type="text" data-review-action-task value="' + escapeHtml(action.task || "") + '" placeholder="填写明确的改进事项" aria-label="改进事项"/><select data-review-action-owner aria-label="改进事项负责人">' + ownerSelect + '</select><input type="date" data-review-action-date value="' + escapeHtml(action.dueDate || "") + '" aria-label="改进事项完成日期"/><label class="ledger-review-action-state"><input type="checkbox" data-review-action-done' + (action.done ? " checked" : "") + '/><span>已完成</span></label><button class="ledger-review-action-remove" type="button" data-remove-review-action="' + index + '">移除</button></div>';
  }

  function renderReviewActions(actions) {
    const list = document.getElementById("ledgerReviewActionList");
    list.innerHTML = actions.length ? actions.map(reviewActionTemplate).join("") : '<div class="ledger-review-empty">暂未添加改进事项，可点击右上角“添加事项”。</div>';
  }

  function collectReviewActions() {
    return Array.from(document.querySelectorAll("[data-review-action-row]")).map(function (row) {
      return {
        task: row.querySelector("[data-review-action-task]").value.trim(),
        owner: row.querySelector("[data-review-action-owner]").value,
        dueDate: row.querySelector("[data-review-action-date]").value,
        done: row.querySelector("[data-review-action-done]").checked
      };
    }).filter(function (action) { return action.task; });
  }

  function openReviewEditor(id) {
    const record = recordById(id);
    if (!record) return;
    if (record.result === "pending") {
      notify("请先维护正式投标结果，再开始项目复盘", "warning");
      return;
    }
    reviewId = id;
    const result = resultDefinition(record.result);
    const review = reviewDefinition(record);
    document.getElementById("ledgerReviewProjectName").textContent = record.name;
    document.getElementById("ledgerReviewProjectMeta").textContent = record.id + " · " + record.purchaser;
    document.getElementById("ledgerReviewStatusTag").className = "status-tag " + review.tone;
    document.getElementById("ledgerReviewStatusTag").textContent = review.label;
    document.getElementById("ledgerReviewResult").textContent = result.label;
    document.getElementById("ledgerReviewScore").textContent = record.score === "" ? "待补充" : Number(record.score).toFixed(2) + " 分";
    document.getElementById("ledgerReviewRank").textContent = record.rank === "" ? "待补充" : "第 " + record.rank + " 名";
    document.getElementById("ledgerReviewSource").textContent = record.source || "待补充";
    document.getElementById("ledgerReviewSummary").value = record.review.summary || "";
    document.getElementById("ledgerReviewStrengths").value = record.review.strengths || "";
    document.getElementById("ledgerReviewWeaknesses").value = record.review.weaknesses || "";
    document.getElementById("ledgerReviewExperience").value = record.review.experience || "";
    document.getElementById("ledgerReviewOwner").value = record.review.owner || record.owner;
    document.getElementById("ledgerReviewDueDate").value = record.review.dueDate || "";
    const actions = record.review.actions.length ? record.review.actions : [{ task: "", owner: record.owner, dueDate: record.resultDate ? addDays(record.resultDate, 20) : "", done: false }];
    renderReviewActions(actions);
    document.getElementById("completeLedgerReview").querySelector("span:last-child").textContent = review.label === "已完成" ? "保存复盘更新" : "完成复盘";
    reviewDirty = false;
    openLayer("ledgerReviewModal", "#ledgerReviewSummary");
  }

  function saveReview(complete) {
    const record = recordById(reviewId);
    if (!record) return;
    const summary = document.getElementById("ledgerReviewSummary").value.trim();
    const strengths = document.getElementById("ledgerReviewStrengths").value.trim();
    const weaknesses = document.getElementById("ledgerReviewWeaknesses").value.trim();
    const actions = collectReviewActions();
    if (complete && !summary) {
      notify("请填写评审反馈与结论摘要", "warning", "#ledgerReviewSummary");
      return;
    }
    if (complete && !strengths && !weaknesses) {
      notify("请至少填写主要优势或失分原因", "warning", "#ledgerReviewStrengths");
      return;
    }
    if (complete && !actions.length) {
      notify("请至少添加一项明确的改进事项", "warning", "#ledgerReviewActionList");
      return;
    }
    record.review = {
      summary: summary,
      strengths: strengths,
      weaknesses: weaknesses,
      experience: document.getElementById("ledgerReviewExperience").value.trim(),
      owner: document.getElementById("ledgerReviewOwner").value,
      dueDate: document.getElementById("ledgerReviewDueDate").value,
      completedAt: complete ? todayString() : record.review.completedAt || "",
      actions: actions
    };
    record.reviewStatus = complete ? "已完成" : "复盘中";
    record.reviewTone = complete ? "green" : "blue";
    persistRecords();
    renderTable();
    reviewDirty = false;
    closeLayer(true);
    notify(complete ? "项目复盘已完成并保存" : "项目复盘草稿已保存", "success");
  }

  function coreExportFields() {
    return [
      { label: "项目编号", width: 18, value: function (record) { return record.id; } },
      { label: "项目名称", width: 34, value: function (record) { return record.name; } },
      { label: "采购人", width: 26, value: function (record) { return record.purchaser; } },
      { label: "投标时间", width: 22, value: function (record) { return record.bidDateText; } },
      { label: "投标报价（万元）", width: 18, value: function (record) { return Number(record.bidAmount).toFixed(2); } },
      { label: "投标结果", width: 14, value: function (record) { return resultDefinition(record.result).label; } },
      { label: "得分与排名", width: 20, value: function (record) { return record.score === "" ? "待公布" : Number(record.score).toFixed(2) + (record.rank === "" ? " / 排名待补" : " / 第 " + record.rank + " 名"); } },
      { label: "项目负责人", width: 14, value: function (record) { return record.owner; } },
      { label: "结果来源", width: 30, value: function (record) { return record.source || "待补充"; } }
    ];
  }

  function xmlEscape(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function excelColumnName(index) {
    let value = index + 1;
    let name = "";
    while (value > 0) {
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }

  function excelTextCell(reference, value, styleIndex) {
    return '<c r="' + reference + '" t="inlineStr"' + (styleIndex ? ' s="' + styleIndex + '"' : "") + '><is><t xml:space="preserve">' + xmlEscape(value) + "</t></is></c>";
  }

  function buildWorksheetXml(fields, records) {
    const lastColumn = excelColumnName(fields.length - 1);
    const lastRow = records.length + 1;
    const columns = fields.map(function (field, index) {
      return '<col min="' + (index + 1) + '" max="' + (index + 1) + '" width="' + field.width + '" customWidth="1"/>';
    }).join("");
    const header = '<row r="1" ht="24" customHeight="1">' + fields.map(function (field, index) {
      return excelTextCell(excelColumnName(index) + "1", field.label, 1);
    }).join("") + "</row>";
    const rows = records.map(function (record, rowIndex) {
      const excelRow = rowIndex + 2;
      return '<row r="' + excelRow + '">' + fields.map(function (field, columnIndex) {
        return excelTextCell(excelColumnName(columnIndex) + excelRow, field.value(record), 0);
      }).join("") + "</row>";
    }).join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + lastColumn + lastRow + '"/>' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="20"/><cols>' + columns + "</cols><sheetData>" + header + rows + "</sheetData>" +
      '<autoFilter ref="A1:' + lastColumn + lastRow + '"/></worksheet>';
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
      crc ^= bytes[index];
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function buildZipBlob(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    let offset = 0;

    files.forEach(function (file) {
      const name = encoder.encode(file.name);
      const data = encoder.encode(file.content);
      const checksum = crc32(data);
      const local = new Uint8Array(30 + name.length);
      const localView = new DataView(local.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, dosTime, true);
      localView.setUint16(12, dosDate, true);
      localView.setUint32(14, checksum, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, name.length, true);
      local.set(name, 30);
      localParts.push(local, data);

      const central = new Uint8Array(46 + name.length);
      const centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, dosTime, true);
      centralView.setUint16(14, dosDate, true);
      centralView.setUint32(16, checksum, true);
      centralView.setUint32(20, data.length, true);
      centralView.setUint32(24, data.length, true);
      centralView.setUint16(28, name.length, true);
      centralView.setUint32(42, offset, true);
      central.set(name, 46);
      centralParts.push(central);
      offset += local.length + data.length;
    });

    const centralSize = centralParts.reduce(function (sum, part) { return sum + part.length; }, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    return new Blob(localParts.concat(centralParts, [end]), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  function buildLedgerWorkbook(fields, records) {
    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Microsoft YaHei"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1677FF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    return buildZipBlob([
      { name: "[Content_Types].xml", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: "_rels/.rels", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="投标台账" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: "xl/_rels/workbook.xml.rels", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: "xl/worksheets/sheet1.xml", content: buildWorksheetXml(fields, records) },
      { name: "xl/styles.xml", content: styles }
    ]);
  }

  function exportLedger() {
    const recordsToExport = filteredRecords();
    if (!recordsToExport.length) {
      notify("当前筛选范围暂无可导出的台账记录", "warning", "#exportLedgerBtn");
      return;
    }
    const blob = buildLedgerWorkbook(coreExportFields(), recordsToExport);
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "投标台账_" + todayString() + ".xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    notify("投标台账 Excel 已下载，共 " + recordsToExport.length + " 条记录", "success");
  }

  function resetFilters() {
    activeFilter = "all";
    currentPage = 1;
    document.getElementById("ledgerSearch").value = "";
    document.getElementById("ledgerYearFilter").value = currentYear;
    document.getElementById("ledgerOwnerFilter").value = "all";
    document.querySelectorAll("[data-ledger-filter]").forEach(function (button) {
      const active = button.getAttribute("data-ledger-filter") === "all";
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    renderTable();
    notify("筛选条件已重置", "success");
  }

  function initBackdrop() {
    const backdrop = document.createElement("div");
    backdrop.id = "prototypeBackdrop";
    backdrop.className = "prototype-backdrop";
    backdrop.addEventListener("click", function () { closeLayer(false); });
    document.body.appendChild(backdrop);
  }

  function initEvents() {
    document.querySelectorAll("[data-ledger-filter]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeFilter = button.getAttribute("data-ledger-filter");
        currentPage = 1;
        document.querySelectorAll("[data-ledger-filter]").forEach(function (item) {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", active ? "true" : "false");
        });
        renderTable();
      });
    });
    document.getElementById("ledgerSearch").addEventListener("input", function () { currentPage = 1; renderTable(); });
    ["ledgerYearFilter", "ledgerOwnerFilter"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () { currentPage = 1; renderTable(); });
    });
    document.getElementById("resetLedgerFilters").addEventListener("click", resetFilters);
    document.getElementById("exportLedgerBtn").addEventListener("click", exportLedger);
    document.getElementById("ledgerResultStatus").addEventListener("change", updateResultFieldState);
    document.getElementById("saveLedgerResult").addEventListener("click", saveResult);
    document.getElementById("selectLedgerResultFiles").addEventListener("click", function () { document.getElementById("ledgerResultFiles").click(); });
    document.getElementById("ledgerResultFiles").addEventListener("change", function (event) {
      Array.from(event.target.files || []).forEach(function (file) {
        if (pendingResultFiles.some(function (item) { return item.name === file.name; })) return;
        pendingResultFiles.push({ name: file.name, description: "本次新增 · " + formatBytes(file.size), category: "结果佐证", tone: "blue" });
      });
      event.target.value = "";
      resultDirty = true;
      renderResultFiles();
    });
    document.getElementById("ledgerResultModal").addEventListener("input", function () { resultDirty = true; });
    document.getElementById("ledgerResultModal").addEventListener("change", function () { resultDirty = true; });
    document.getElementById("ledgerReviewModal").addEventListener("input", function () { reviewDirty = true; });
    document.getElementById("ledgerReviewModal").addEventListener("change", function () { reviewDirty = true; });
    document.getElementById("saveLedgerReviewDraft").addEventListener("click", function () { saveReview(false); });
    document.getElementById("completeLedgerReview").addEventListener("click", function () { saveReview(true); });
    document.getElementById("addLedgerReviewAction").addEventListener("click", function () {
      const actions = collectReviewActions();
      const record = recordById(reviewId);
      actions.push({ task: "", owner: record ? record.owner : ownerOptions[0], dueDate: record && record.resultDate ? addDays(record.resultDate, 20) : "", done: false });
      renderReviewActions(actions);
      reviewDirty = true;
    });
    document.addEventListener("click", function (event) {
      const closeButton = event.target.closest("[data-close-ledger-layer]");
      if (closeButton) {
        closeLayer(false);
        return;
      }
      const editButton = event.target.closest("[data-edit-result]");
      if (editButton) {
        openResultEditor(editButton.getAttribute("data-edit-result"));
        return;
      }
      const reviewButton = event.target.closest("[data-ledger-review]");
      if (reviewButton) {
        openReviewEditor(reviewButton.getAttribute("data-ledger-review"));
        return;
      }
      const detailButton = event.target.closest("[data-ledger-detail]");
      if (detailButton) {
        openDetail(detailButton.getAttribute("data-ledger-detail"));
        return;
      }
      const removeResultFile = event.target.closest("[data-remove-result-file]");
      if (removeResultFile) {
        pendingResultFiles.splice(Number(removeResultFile.getAttribute("data-remove-result-file")), 1);
        resultDirty = true;
        renderResultFiles();
        return;
      }
      const removeReviewAction = event.target.closest("[data-remove-review-action]");
      if (removeReviewAction) {
        const row = removeReviewAction.closest("[data-review-action-row]");
        if (row) row.remove();
        if (!document.querySelector("[data-review-action-row]")) renderReviewActions([]);
        reviewDirty = true;
        return;
      }
      const pageButton = event.target.closest("#ledgerPagination .page-btn[data-page]");
      if (pageButton && !pageButton.disabled) {
        const value = pageButton.getAttribute("data-page");
        const pages = Math.max(1, Math.ceil(filteredRecords().length / PAGE_SIZE));
        if (value === "previous") currentPage = Math.max(1, currentPage - 1);
        else if (value === "next") currentPage = Math.min(pages, currentPage + 1);
        else {
          const page = Number(value);
          if (!Number.isInteger(page) || page < 1 || page > pages) return;
          currentPage = page;
        }
        renderTable();
        return;
      }
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && activeLayerId) closeLayer(false); });
  }

  function init() {
    initBackdrop();
    restoreListState();
    renderMetrics();
    renderTable();
    initEvents();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
