(function () {
  "use strict";
  const store = window.OpportunityStore;
  const icons = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    collect: '<path d="M4 9a8 8 0 0 1 14-3l2 3M20 3v6h-6M20 15a8 8 0 0 1-14 3l-2-3M4 21v-6h6"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    back: '<path d="M19 12H5M10 7l-5 5 5 5"/>',
    edit: '<path d="m4 20 4-1L20 7l-4-4L4 15zM13 6l5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    file: '<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h4"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 13v7H4V6h7"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    play: '<path d="m8 4 12 8-12 8z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7h.01"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/>'
  };
  const reviews = { pending: ["待确认", "blue"], approved: ["已确认投标", "green"], rejected: ["已放弃", "gray"], transferred: ["已转项目", "green"] };
  const pageParams = new URLSearchParams(location.search);
  const ui = { tab: pageParams.get("tab") || "list", page: 1, sourcePage: 1, runPage: positivePage(pageParams.get("runPage")), metric: ["pending", "approved", "urgent", "transferred"].includes(pageParams.get("metric")) ? pageParams.get("metric") : "", busy: false, collectingSource: "", checkingSource: "", files: [], timer: null };
  let activeAction = null;
  let lastTimingSignature = "", timingViewDirty = false;
  let sourceAccessSignature = "";
  const configPageSize = 8;
  ui.page = positivePage(pageParams.get("listPage"));
  ui.filters = { query: pageParams.get("listQuery") || "", review: pageParams.get("listReview") || "", region: pageParams.get("listRegion") || "", source: pageParams.get("listSource") || "", score: pageParams.get("listScore") || "" };
  ui.restoreListScroll = true;
  ui.runFilters = { source: pageParams.get("runSource") || "", sourceQuery: pageParams.get("runSourceText") || "", result: ["completed", "failed"].includes(pageParams.get("runResult")) ? pageParams.get("runResult") : "", from: validRunDate(pageParams.get("runFrom")), to: validRunDate(pageParams.get("runTo")) };
  const detailId = pageParams.get("id");
  const isDetail = document.body.hasAttribute("data-op-detail");
  const isAdmin = (window.AppCurrentUser || {}).role === "管理员";
  const ruleFormFields = [
    { key: "description", label: "业务方向", type: "textarea", wide: true, required: true },
    { key: "keywords", label: "关键词", type: "textarea", wide: true, required: true, placeholder: "多个词可用逗号、顿号或换行分隔", help: "填写关注的业务内容，辅助判断项目是否符合业务方向。多个词可用逗号、顿号或换行分隔。" },
    { key: "excludes", label: "排除词", type: "textarea", wide: true, placeholder: "多个词可用逗号、顿号或换行分隔", help: "填写不承接的核心交付内容。结合公告上下文判断，不因采购人所属行业直接排除项目。多个词可用逗号、顿号或换行分隔。" },
    { key: "regions", label: "实施地区", type: "text", wide: true, placeholder: "不限；指定多个地区时用逗号分隔" },
    { key: "min", label: "最低包预算", unit: "万元", type: "number", min: 0, step: "0.01", placeholder: "不限", help: "按本次参与的采购包预算筛选，不使用整个项目的总预算。留空或填 0 表示不限最低预算。" },
    { key: "max", label: "最高包预算", unit: "万元", type: "number", min: 0, step: "0.01", placeholder: "不限", help: "按本次参与的采购包预算筛选，不使用整个项目的总预算。留空表示不限最高预算。" },
    { key: "minDays", label: "建议最少准备天数", unit: "天", type: "number", min: 0, max: 365, step: "1", required: true, help: "从采集时到投标截止，建议至少留出的准备时间。不足时提示准备风险，供人工确认参考。" },
    { key: "threshold", label: "初评入库标准", unit: "分", type: "number", min: 0, max: 100, step: "1", required: true, help: "初评分达到此分数，且符合业务方向、地区及预算等筛选条件，才进入机会库。初评分用于判断匹配程度，不代表正式评标得分。" },
    { key: "hours", label: "采集周期", unit: "小时", type: "number", min: 1, max: 72, step: "1", required: true, help: "每隔所填小时数采集一次。例如填 2，表示每 2 小时采集一次。" },
    { key: "lookback", label: "首次回溯天数", unit: "天", type: "number", min: 1, max: 30, step: "1", required: true, help: "首次采集时补采最近 N 天发布的公告。例如填 7，表示补采最近 7 天；后续按采集周期继续采集并去重。" },
    { key: "remarks", label: "备注说明", type: "textarea", wide: true, placeholder: "补充筛选与初评要求", help: "补充前面字段未覆盖的筛选和初评要求，可填写优先考虑、必须具备或不接受的条件。" }
  ];
  const sourceFormFields = [
    { key: "source-name", name: "name", label: "网站名称", required: true, type: "text", max: 50 },
    { key: "source-type", name: "type", label: "来源类型", type: "select" },
    { key: "source-entry", name: "collectionUrl", label: "采集入口", required: true, type: "url", wide: true, help: "填写该网站的公告列表页、栏目页或搜索结果页地址，用于持续发现公告。不同栏目有不同地址时，请填写实际采集入口。" },
    { key: "source-column", name: "column", label: "采集栏目（选填）", type: "text", wide: true, max: 80, help: "按网站原有名称填写，如采购公告、招标信息等，仅用于说明入口所在栏目；公告类型将根据内容识别。" }
  ];
  let modalTrigger, ruleHelpTrigger, ruleHelpTimer;
  function one(selector) { return document.querySelector(selector); }
  function positivePage(value) { const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? number : 1; }
  function validRunDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && Number.isFinite(Date.parse(value + "T00:00:00+08:00")) ? value : ""; }
  function replacePosition(params) {
    try { if (window.history && window.history.replaceState) window.history.replaceState(null, "", "?" + params.toString()); } catch (error) { /* Links still retain position when local history is unavailable. */ }
  }

  function opportunityReturnUrl() {
    const target = pageParams.get("returnTo") || "";
    if (target.startsWith("opportunities.html?")) {
      const input = new URLSearchParams(target.slice(target.indexOf("?") + 1)), output = new URLSearchParams({ tab: "list" });
      ["listPage", "listQuery", "listReview", "listRegion", "listSource", "listScore", "metric", "listScroll"].forEach(function (key) { if (input.has(key)) output.set(key, input.get(key)); });
      return "opportunities.html?" + output.toString();
    }
    if (!target.startsWith("collection-detail.html?")) return "";
    const params = new URLSearchParams(target.slice(target.indexOf("?") + 1));
    return params.get("id") ? "opportunities.html?tab=runs&runPage=" + positivePage(params.get("runPage")) : "";
  }
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function svg(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (icons[name] || icons.info) + '</svg>'; }
  function button(label, action, id, type, icon, disabled, title) { return '<button type="button" class="' + (type || "text-btn compact-btn") + '" data-op-action="' + action + '" data-id="' + esc(id || "") + '"' + (disabled ? " disabled" : "") + (title ? ' title="' + esc(title) + '"' : '') + '><span class="btn-icon">' + svg(icon || "arrow") + '</span><span>' + esc(label) + '</span></button>'; }
  function link(label, href, type, icon) { return '<a class="' + (type || "text-btn compact-btn") + '" href="' + esc(href) + '"><span class="btn-icon">' + svg(icon || "arrow") + '</span><span>' + esc(label) + '</span></a>'; }
  function tag(text, tone) { return '<span class="status-tag ' + (tone || "blue") + '">' + esc(text) + '</span>'; }
  function needsConfirmation(item) { return !item.projectId && item.review !== "rejected" && (item.review === "pending" || item.recheck); }
  function changeLabel(item) { return item.projectId ? "来源已更新" : item.review === "approved" ? "待重新确认" : "信息已更新"; }
  function reviewTag(item) { const value = reviews[item.review] || reviews.pending; return tag(value[0], value[1]) + (item.recheck && item.review !== "rejected" ? '<small>' + changeLabel(item) + '</small>' : ""); }
  function noticeException(item) {
    const timing = store.status(item);
    return timing.blocked ? tag(timing.text, timing.tone) : "";
  }
  function deadlineNotes(item) {
    if (store.status(item).blocked) return "";
    const now = Date.now(), notes = [];
    if (store.time(item.acquisitionStart) > now) notes.push("获取尚未开始");
    [["获取", item.acquired ? "" : item.acquisitionEnd], ["报名", item.registered ? "" : item.registrationEnd], ["投标", item.deadline]].forEach(function (entry) {
      const remaining = store.time(entry[1]) - now;
      if (remaining > 0 && remaining <= 72 * 3600000) notes.push(entry[0] + "临近截止");
    });
    return notes.length ? '<small class="op-deadline-note' + (notes.some(function (note) { return note.includes("临近"); }) ? ' op-deadline-near' : '') + '" title="' + esc((store.time(item.acquisitionStart) > now ? "文件获取开始：" + item.acquisitionStart + "；" : "") + notes.join("；") + "（北京时间）") + '">' + esc(notes.join(" · ")) + '</small>' : "";
  }
  function deadlineView(item) {
    return [["获取截止", item.acquisitionEnd], ["投标截止", item.deadline]].map(function (entry) {
      const remaining = store.time(entry[1]) - Date.now();
      const near = !store.status(item).blocked && (entry[0] !== "获取截止" || !item.acquired) && remaining > 0 && remaining <= 72 * 3600000;
      return '<div class="op-list-deadline"><span>' + entry[0] + '</span><time' + (near ? ' class="op-deadline-near"' : '') + ' title="' + esc(entry[0] + "：" + (entry[1] || "公告未明确") + "（北京时间）") + '">' + esc(entry[1] || "公告未明确") + '</time></div>';
    }).join("") + deadlineNotes(item) + (noticeException(item) ? '<div class="op-list-timing">' + noticeException(item) + '</div>' : "");
  }
  function opportunityAction(item, type) {
    if (item.projectId) return link("查看项目", projectUrl(item.projectId), type, "arrow");
    const timing = store.status(item);
    if (item.review === "rejected") return button("重新确认", "review", item.id, type, "check", false, "查看或调整投标决定");
    if (item.review === "approved") {
      const reviewType = item.recheck ? type : type === "primary-btn" ? "secondary-btn" : "text-btn compact-btn";
      const review = button("重新确认", "review", item.id, reviewType, "check", false, item.recheck ? "请根据最新信息重新确认" : "查看或调整投标决定");
      return (item.recheck ? "" : button("转入投标项目", "transfer", item.id, type, "arrow", timing.blocked, timing.blocked ? timing.text + "，暂不能转入投标项目" : "转入投标项目")) + review;
    }
    if (needsConfirmation(item)) return button("人工确认", "review", item.id, type, "check");
    return "";
  }
  function projectUrl(id) { return (window.BiddingProjectStore ? window.BiddingProjectStore.entry(window.BiddingProjectStore.get(id) || {}) : "project-files.html") + "?id=" + encodeURIComponent(id); }
  function money(value) { return value == null ? "公告未明确" : Number(value).toLocaleString("zh-CN") + " 万元"; }
  function scoreMarkup(value, variant) {
    const numeric = value == null ? NaN : Number(value), valid = Number.isFinite(numeric);
    const band = !valid ? "unknown" : numeric >= 80 ? "high" : numeric >= 60 ? "medium" : "low";
    const range = !valid ? "尚无初评分" : numeric >= 80 ? "80 分及以上" : numeric >= 60 ? "60～79 分" : "60 分以下";
    const label = valid ? "机会初评分 " + numeric + " 分，" + range : range;
    return '<strong class="op-score op-score-' + band + (variant === "detail" ? ' op-detail-saved-score' : variant === "inline" ? ' op-score-inline' : '') + '" title="' + esc(label) + '" aria-label="' + esc(label) + '">' + (valid ? esc(numeric) : "—") + (variant === "detail" ? '<small>分</small>' : '') + '</strong>';
  }
  function moneyMarkup(value, variant) {
    if (value == null || !Number.isFinite(Number(value))) return '<span class="op-money-missing">公告未明确</span>';
    return '<strong class="amount-text op-money op-money-' + (variant || "inline") + (variant === "list" ? ' table-amount' : '') + '" title="' + esc(money(value)) + '">' + esc(Number(value).toLocaleString("zh-CN")) + '<span class="op-money-unit">万元</span></strong>';
  }
  function moneyFact(label, value) { return '<div><span>' + esc(label) + '</span>' + moneyMarkup(value, "inline") + '</div>'; }
  function ruleFor() { return store.get().rules[0]; }
  function assess(item) { return store.assessment(item).result; }
  function hasMainFile(item) {
    const project = store.get().projects.find(function (entry) { return entry.id === item.projectId; });
    return (item.files || []).concat(project && project.files || []).some(function (file) { return file.main && /\.(pdf|doc|docx)$/i.test(file.name); });
  }
  function currentRisks(item) {
    return (item.risks || []).map(function (risk) {
      if (risk === "业务团队本期资源已排满，主动放弃本次机会。") return "业务团队本期资源已排满，请关注团队安排。";
      if (/^(?:已确认参与[，,]\s*)?(?:尚未取得|缺少|尚未获取|未取得|未获取)主招标文件/.test(risk)) return hasMainFile(item) ? "" : "缺少主招标文件，转入投标项目时需补传。";
      return risk;
    }).filter(Boolean);
  }
  function assessmentMessage(value) {
    return String(value || "").replace(/初评仍有\s*\d+(?:\.\d+)?\s*分对应条件待核验/g, "部分公告信息尚未明确").replace(/未核实内容不计入得分/g, "未明确的信息未计入初评分");
  }
  function assessmentRisk(item) {
    const saved = store.assessment(item).snapshot;
    if (saved.decision.key !== "excluded") return "";
    if (saved.result.score < saved.rule.threshold) return "初评分低于入库标准";
    return saved.result.boundary.blocked ? "业务范围不匹配" : "筛选条件不匹配";
  }
  function assessmentUnknowns(item) {
    const saved = store.assessment(item).snapshot, notice = saved.notice;
    if (!notice) return store.assessment(item).stale ? ["请查看当前公告及留存初评依据"] : [];
    const unknown = [];
    if (saved.result.boundary.key === "unknown") unknown.push("公告核心交付未明确");
    if (!notice.qualification) unknown.push("公告未披露完整资格要求");
    else if (saved.result.details[1] && saved.result.details[1].unknown) unknown.push("资格材料依据不完整");
    if (notice.amount == null) unknown.push("本包预算未披露");
    if (!notice.region) unknown.push("实施地点未明确");
    if (!notice.deadline) unknown.push("投标截止时间未明确");
    return store.assessment(item).stale ? unknown.map(function (reason) { return "上次初评：" + reason; }) : unknown;
  }
  function noticeUnknowns(item) {
    const unknown = [];
    if (!item.qualification) unknown.push("公告未明确完整资格要求");
    if (item.amount == null) unknown.push("公告未明确本包预算");
    if (!item.region) unknown.push("公告未明确实施地点");
    return unknown;
  }
  function compactListRisk(value) {
    return String(value || "")
      .replace(/^.*(?:尚未取得主招标文件|缺少主招标文件).*$/, "缺少主招标文件")
      .replace(/^公告未明确投标截止时间.*$/, "投标截止时间未明确")
      .replace(/^公告未明确文件获取截止时间.*$/, "文件获取截止时间未明确")
      .replace(/^公告未明确报名截止时间.*$/, "报名截止时间未明确")
      .replace(/^文件获取将在.*小时内截止.*$/, "文件获取临近截止")
      .replace(/^文件获取已截止[，；].*$/, "文件获取已截止")
      .replace(/^报名已截止[，；].*$/, "报名已截止")
      .replace(/^文件获取尚未开始[，；].*$/, "文件获取尚未开始")
      .replace(/^现场实施服务由 3 个月调整为 6 个月[，；].*$/, "驻场服务延长，需重排人员")
      .replace(/^更正后新增专项技术研究[，；].*超出.*$/, "新增技术研究，超出承接范围")
      .replace(/^业务团队本期资源已排满[，；].*$/, "团队资源已排满")
      .replace(/^投标截止已延期[，；].*$/, "投标延期，需核对项目安排");
  }
  function listPositionUrl() {
    const params = new URLSearchParams({ tab: "list", listPage: String(ui.page) });
    Object.keys(ui.filters || {}).forEach(function (key) { if (ui.filters[key]) params.set("list" + key[0].toUpperCase() + key.slice(1), ui.filters[key]); });
    if (ui.metric) params.set("metric", ui.metric);
    params.set("listScroll", String(Math.max(0, Math.round(window.scrollY || 0))));
    return "opportunities.html?" + params.toString();
  }
  function detailUrl(id) { return "opportunity-detail.html?id=" + encodeURIComponent(id) + "&returnTo=" + encodeURIComponent(listPositionUrl()); }
  function sourcesFor(item) { return item.sourceIds.map(function (id) { const source = store.get().sources.find(function (s) { return s.id === id; }); return source ? source.name : "来源已停用"; }).join(" / "); }
  function toast(text, tone) { if (window.showToast) window.showToast(text, tone); const live = one("#opportunityLive"); if (live) live.textContent = text; }
  function guard(handler) { try { return handler(); } catch (error) { if (error.code === "OPPORTUNITY_CONTEXT_CHANGED") invalidateAction(error.message); const feedback = one("#opFeedback"); if (feedback) { feedback.hidden = false; feedback.textContent = error.message; feedback.focus(); } else toast(error.message, "warning"); return null; } }
  function save(handler) { return store.change(handler); }
  function empty(title, text) { return '<div class="op-empty">' + svg("search") + '<strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></div>'; }
  function field(label, name, value, type, extra) {
    if (name === "max") { label = "最高包预算 · 留空不限"; extra = String(extra || "").replace("required", ""); }
    return '<label class="op-field"><span>' + esc(label) + '</span><input name="' + name + '" type="' + (type || "text") + '" value="' + esc(value) + '" ' + (extra || "") + ' /></label>';
  }
  function textarea(label, name, value, extra) { return '<label class="op-field wide"><span>' + esc(label) + '</span><textarea name="' + name + '" ' + (/\brows=/.test(extra || "") ? "" : 'rows="3" ') + (extra || "") + '>' + esc(value) + '</textarea></label>'; }
  function option(value, text, selected) { return '<option value="' + esc(value) + '"' + (selected ? " selected" : "") + '>' + esc(text) + '</option>'; }
  function external(url, label) {
    if (!/^https?:\/\//i.test(url)) return "";
    return '<a class="op-source-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + svg("external") + esc(label) + '</a>';
  }
  function sourceLinks(source, name) {
    if (!name) return external(source.collectionUrl || source.url, "访问来源");
    const entry = source.url || source.collectionUrl;
    return external(entry, name || (source.url ? "网站首页" : "采集入口")) + (source.exampleUrl && source.exampleUrl !== entry ? '<br/>' + external(source.exampleUrl, "查看公告") : "");
  }
  function capabilityBadge(item) {
    const boundary = store.capability(item);
    return tag(boundary.label, boundary.blocked ? "red" : boundary.key === "allowed" ? "green" : "orange") + '<small>' + esc(boundary.group) + '</small>';
  }
  function nextText(rule) { return store.stamp((rule.lastRun || Date.now()) + rule.hours * 3600000); }
  function modal(title, description, body, submitLabel, onSubmit, customFooter, appearance) {
    hideRuleHelp();
    activeAction = null;
    modalTrigger = document.activeElement;
    one("#opportunityLayers").innerHTML = '<section class="prototype-modal' + (appearance ? ' ' + appearance : '') + '" id="opModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="opModalTitle"><form id="opModalForm"><header class="layer-head"><div><h3 id="opModalTitle">' + esc(title) + '</h3>' + (description ? '<p>' + esc(description) + '</p>' : '') + '</div><button class="layer-close" type="button" data-close-layer title="关闭弹窗" aria-label="关闭弹窗">' + svg("close") + '</button></header><div class="layer-body"><div class="op-feedback" id="opFeedback" role="alert" tabindex="-1" hidden></div>' + body + '</div><footer class="layer-footer" id="opModalFooter">' + (customFooter || button("取消", "close", "", "ghost-btn", "close") + (submitLabel ? '<button class="primary-btn" type="submit"><span class="btn-icon">' + svg("check") + '</span><span>' + esc(submitLabel) + '</span></button>' : button("关闭", "close", "", "primary-btn", "check"))) + '</footer></form></section>';
    window.projectPrototype.openLayer("opModal");
    const form = one("#opModalForm");
    form.addEventListener("submit", function (event) { event.preventDefault(); if (onSubmit) guard(function () { onSubmit(new FormData(form), form, event.submitter); }); });
    window.setTimeout(function () { const target = form.querySelector("input:not([type=checkbox]):not([type=file]), textarea, select, button"); if (target) target.focus(); }, 30);
  }
  function syncOpportunityView() {
    const y = Math.max(0, window.scrollY || 0), form = one("#opFilters");
    const draft = form && form.elements ? Object.fromEntries(new FormData(form)) : null;
    store.refresh(); render();
    const latestForm = one("#opFilters");
    if (draft && latestForm && latestForm.elements) Object.keys(draft).forEach(function (key) { if (latestForm.elements[key]) latestForm.elements[key].value = draft[key]; });
    lastTimingSignature = opportunityTimingSignature(); timingViewDirty = false;
    window.setTimeout(function () { if (window.scrollTo) window.scrollTo(0, y); }, 0);
  }
  function close(sync) {
    let changed = false;
    if (sync !== false && activeAction) {
      store.refresh();
      const item = store.find(activeAction.id);
      changed = activeAction.invalid || activeAction.viewDirty || timingViewDirty || Boolean(store.contextMessage(activeAction.id, activeAction.expected)) || Boolean(item && activeAction.timingKey !== store.status(item).key);
    }
    activeAction = null; hideRuleHelp(); window.projectPrototype.closeLayers();
    if (changed) syncOpportunityView();
    else if (modalTrigger && document.contains(modalTrigger)) modalTrigger.focus();
  }
  function invalidateAction(message) {
    if (!activeAction || !one("#opModal.open")) return;
    activeAction.invalid = true;
    const feedback = one("#opFeedback"); feedback.hidden = false; feedback.textContent = message;
    one("#opModalForm").querySelectorAll('button[type="submit"]').forEach(function (node) { node.disabled = true; });
    if (!one("#opReloadAction")) (activeAction.type === "review" ? feedback : one("#opModalFooter")).insertAdjacentHTML(activeAction.type === "review" ? "beforeend" : "afterbegin", '<span id="opReloadAction">' + button("查看最新内容", "reloadAction", "", "secondary-btn", "collect") + '</span>');
  }
  function checkActionContext() {
    if (!activeAction || !one("#opModal.open")) { activeAction = null; return true; }
    store.refresh();
    const message = store.contextMessage(activeAction.id, activeAction.expected);
    if (message) invalidateAction(message);
    syncActionTiming();
    return !message && !activeAction.invalid && (activeAction.type !== "transfer" || !store.status(store.find(activeAction.id)).blocked);
  }
  function syncActionTiming() {
    if (!activeAction || !one("#opModal.open")) return;
    const item = store.find(activeAction.id); if (!item) return;
    const timing = store.status(item);
    if (activeAction.timingKey !== timing.key) { activeAction.viewDirty = true; timingViewDirty = true; activeAction.timingKey = timing.key; }
    const stale = Boolean(activeAction.invalid);
    if (activeAction.type === "transfer") {
      const main = ui.files.some(function (file) { return file.selected !== false && file.main && /\.(pdf|doc|docx)$/i.test(file.name); });
      const submit = one('#opModalForm button[type="submit"]');
      if (submit) {
        submit.disabled = stale || timing.blocked || !main;
        if (stale || timing.blocked) submit.title = stale ? "请先查看最新内容" : timing.text + "，暂不能转入投标项目";
      }
    } else {
      const approve = one("#opReviewApproved"), reject = one("#opReviewRejected"), submit = one("#opReviewConfirm");
      const alreadyApproved = item.review === "approved" && !item.recheck;
      if (approve) {
        approve.disabled = stale || timing.blocked || alreadyApproved;
        approve.title = stale ? "请先查看最新内容" : timing.blocked ? timing.text + "，暂不能确认投标" : alreadyApproved ? "当前已确认投标" : "";
      }
      if (reject) { reject.disabled = stale || item.review === "rejected"; reject.title = stale ? "请先查看最新内容" : item.review === "rejected" ? "当前已放弃" : ""; }
      const outcome = activeAction.outcome;
      if (submit) {
        const reason = outcome === "approved" ? approve && approve.title : outcome === "rejected" ? reject && reject.title : "请先选择处理结果";
        const unavailable = outcome === "approved" ? !approve || approve.disabled : outcome === "rejected" ? !reject || reject.disabled : true;
        submit.disabled = stale || unavailable;
        submit.title = stale ? "请先查看最新内容" : submit.disabled ? reason : "";
      }
    }
    if (stale) return;
    const message = !timing.blocked ? "" : activeAction.type === "transfer" ? timing.text + "，暂不能转入投标项目。" : activeAction.expected.review === "rejected" ? timing.text + "，暂不能重新确认投标，原放弃记录保留。" : timing.text + "，暂不能确认投标，仍可放弃机会。";
    const feedback = one("#opFeedback");
    if (message && message !== activeAction.deadlineMessage) { feedback.hidden = false; feedback.textContent = message; }
    else if (!message && activeAction.deadlineMessage && feedback.textContent === activeAction.deadlineMessage) feedback.hidden = true;
    activeAction.deadlineMessage = message;
  }
  function opportunityTimingSignature() {
    const items = isDetail ? [store.find(detailId)].filter(Boolean) : store.get().opportunities;
    return JSON.stringify(items.map(function (item) { return [item.id, store.status(item).key, isUrgent(item), deadlineNotes(item)]; }));
  }
  function tickOpportunityTiming() {
    if (document.hidden) return;
    if (!isDetail && ui.tab === "sources") {
      const accessSignature = JSON.stringify(store.get().sources.map(function (source) { return [source.id, store.sourceAccess(source).state]; }));
      if (sourceAccessSignature && sourceAccessSignature !== accessSignature && !one(".prototype-modal.open") && !ui.busy) renderSources();
      if (!one(".prototype-modal.open") && !ui.busy) sourceAccessSignature = accessSignature;
    }
    const signature = opportunityTimingSignature();
    if (lastTimingSignature && signature !== lastTimingSignature) timingViewDirty = true;
    lastTimingSignature = signature;
    syncActionTiming();
    if (timingViewDirty && !one(".prototype-modal.open") && !ui.busy && (isDetail || ui.tab === "list")) syncOpportunityView();
  }
  function reviewFeedback(item, reconfirming) {
    const filteredOut = !isDetail && ui.filters && ui.filters.review && ui.filters.review !== item.review;
    if (item.review === "rejected") return filteredOut ? "已放弃机会，记录已保留，可在“已放弃”中查看。" : "已放弃机会，相关记录已保留。";
    const prefix = reconfirming ? "已重新确认投标" : "已确认投标";
    return prefix + (filteredOut ? "，可在“已确认投标”中转入投标项目。" : "，可转入投标项目。");
  }
  function transferFilesSummary(item, project) {
    const record = item.transferRecord || (item.history.find(function (entry) { return entry.transferSnapshot; }) || {}).transferSnapshot;
    if (record) return '<small class="op-transfer-record">转入主文件：' + esc(record.mainFileName) + ' · 附件 ' + Math.max(0, record.files.length - 1) + ' 份</small>';
    return project && project.fileName ? '<small class="op-transfer-record">项目主文件：' + esc(project.fileName) + '</small>' : "";
  }
  function taskContext(fields, compact) {
    return '<dl class="op-task-context' + (compact ? ' op-run-context' : '') + '">' + fields.map(function (field) { return '<div><dt>' + esc(field[0]) + '</dt><dd>' + esc(field[1]) + '</dd></div>'; }).join("") + '</dl>';
  }
  function taskOutcome(title, tone, detail, at) {
    const icon = tone === "green" ? "check" : tone === "red" ? "close" : tone === "orange" ? "info" : "collect";
    return '<div class="op-task-outcome op-task-tone-' + tone + '" role="status" aria-live="polite"><span class="op-task-symbol' + (tone === "blue" ? ' op-task-spinner' : '') + '">' + svg(icon) + '</span><div><strong>' + esc(title) + '</strong>' + (detail ? '<p>' + esc(detail) + '</p>' : '') + (at ? '<small>' + esc(at) + '</small>' : '') + '</div></div>';
  }
  function taskRows(rows, busy) {
    return '<div class="op-task-rows"' + (busy ? ' aria-busy="true"' : '') + '>' + rows.map(function (row) {
      return '<div class="op-task-row"><span class="op-task-row-icon op-task-tone-' + row.tone + '">' + svg(row.icon) + '</span><div class="op-task-row-copy"><strong>' + esc(row.label) + '</strong>' + (row.message ? '<p>' + esc(row.message) + '</p>' : '') + '</div><span class="op-task-row-state op-task-tone-' + row.tone + '">' + esc(row.state) + '</span></div>';
    }).join("") + '</div>';
  }
  function taskProgress(labels, active) {
    return taskOutcome(labels[active] + "…", "blue") + taskRows(labels.map(function (label, index) {
      return { label: label, message: "", state: index < active ? "已处理" : index === active ? "进行中" : "等待", tone: index <= active ? "blue" : "gray", icon: index < active ? "check" : index === active ? "collect" : "clock" };
    }), true);
  }
  function taskIsOpen(task) {
    return task.layer === one("#opModal") && task.layer.classList.contains("open");
  }
  function taskPaint(task, content, footer) {
    if (!taskIsOpen(task)) return false;
    one("#opTaskContent").innerHTML = task.context + content;
    if (footer) {
      const target = one("#opModalFooter"), hadFocus = target.contains(document.activeElement);
      target.innerHTML = footer;
      task.layer.scrollTop = 0;
      if (hadFocus) { const next = target.querySelector(".primary-btn") || target.querySelector("button"); if (next) next.focus(); }
    }
    return true;
  }
  function taskOpen(title, context, labels, appearance) {
    modal(title, "", '<div id="opTaskContent">' + context + taskProgress(labels, 0) + '</div>', "", null, '<span class="op-task-footer-note">关闭后继续执行</span>' + button("关闭", "close", "", "ghost-btn", "close"), "op-task-modal " + (appearance || ""));
    return { layer: one("#opModal"), context: context };
  }
  function taskCloseButton() { return button("关闭", "close", "", "primary-btn", "close"); }
  function sourceRunState(row) {
    return row.state === "completed" || !row.state && row.ok ? "completed" : "failed";
  }

  function checkContent(source) {
    const result = source.checkResult;
    const rows = ["入口地址", "登录状态", "公告列表", "公告正文", "附件权限"].map(function (label) {
      const entry = result.steps.find(function (item) { return item.label === label; });
      return { label: label, message: entry ? entry.message : "", state: !entry ? "未检查" : entry.limited ? "按权限获取" : entry.ok ? "通过" : "未通过", tone: !entry ? "gray" : entry.limited ? "orange" : entry.ok ? "green" : "red", icon: !entry ? "clock" : entry.limited ? "info" : entry.ok ? "check" : "close" };
    });
    const next = !source.enabled ? "来源已停用，启用后可按规则采集。" : store.sourceAccess(source).reason || "来源可用于后续采集。";
    return taskOutcome(result.ok ? "检查通过" : "检查未通过", result.ok ? "green" : "red", "", result.at) + taskRows(rows) + (result.ok ? '<p class="op-task-next">' + esc(next) + '</p>' : '');
  }
  function renderMetrics() {
    const items = store.get().opportunities;
    const metrics = [
      ["pending", "待确认", items.filter(function (i) { return i.review === "pending"; }).length, "查看初评并处理机会", "search", ""],
      ["approved", "已确认投标", items.filter(function (i) { return i.review === "approved"; }).length, "转入投标项目或调整决定", "check", "green"],
      ["urgent", "关键期限临近", items.filter(isUrgent).length, "72 小时内获取、报名或投标截止", "clock", "red"],
      ["transferred", "已转项目", items.filter(function (i) { return i.review === "transferred"; }).length, "已关联现有投标项目工作台", "check", "green"]
    ];
    one("#opportunityMetrics").innerHTML = metrics.map(function (m) { return '<button type="button" class="project-metric card' + (ui.metric === m[0] ? " active" : "") + '" data-op-action="metric" data-id="' + m[0] + '"><span class="metric-symbol ' + m[5] + '">' + svg(m[4]) + '</span><span class="metric-copy"><span>' + m[1] + '</span><strong>' + m[2] + '</strong><small>' + m[3] + '</small></span></button>'; }).join("");
  }
  function isUrgent(item) { const now = Date.now(); return !store.status(item).blocked && [item.acquired ? null : item.acquisitionEnd, item.registrationEnd && !item.registered ? item.registrationEnd : null, item.deadline].some(function (value) { const delta = store.time(value) - now; return delta > 0 && delta <= 72 * 3600000; }); }
  function moduleShell() {
    const target = one("#opportunityModule");
    if (!target || target.dataset.ready === "true") return;
    target.innerHTML = '<header class="module-heading"><div><h1>招标机会</h1><p>发现适合企业的公开招标项目，让每一次投标从有依据的判断开始。</p></div></header><div class="op-feedback" id="opStorageHint" role="alert" hidden></div><section class="project-metrics" id="opportunityMetrics" aria-label="招标机会统计"></section><section class="card op-main-panel"><nav class="project-filter-tabs" id="opportunityTabs" aria-label="招标机会功能">' + [["list", "机会列表"], ["rules", "筛选规则"], ["sources", "来源网站"], ["runs", "采集记录"]].map(function (entry) { return '<button class="filter-tab" type="button" data-op-tab="' + entry[0] + '" aria-label="' + entry[1] + '">' + entry[1] + '</button>'; }).join("") + '</nav><div id="opportunityContent"></div></section>';
    target.dataset.ready = "true";
  }
  function render() {
    hideRuleHelp();
    if (isDetail) { renderDetail(); return; }
    moduleShell();
    if (!["list", "rules", "sources", "runs"].includes(ui.tab) || (!isAdmin && ui.tab !== "list")) ui.tab = "list";
    renderMetrics();
    document.querySelectorAll("[data-op-tab]").forEach(function (node) { node.classList.toggle("active", node.dataset.opTab === ui.tab); node.setAttribute("aria-current", node.dataset.opTab === ui.tab ? "page" : "false"); node.hidden = !isAdmin && node.dataset.opTab !== "list"; });
    const storageHint = one("#opStorageHint");
    storageHint.hidden = store.persistent;
    storageHint.textContent = store.persistent ? "" : "当前数据无法保存，请重试后再转入投标项目。";
    if (ui.tab === "list") renderListShell();
    if (ui.tab === "rules") renderRules();
    if (ui.tab === "sources") renderSources();
    if (ui.tab === "runs") renderRuns();
  }
  function renderListShell() {
    const sources = store.get().sources;
    one("#opportunityContent").innerHTML = '<form id="opFilters" class="op-filter-bar"><label class="search-box"><span class="visually-hidden">搜索机会</span>' + svg("search") + '<input name="query" type="search" placeholder="搜索项目名称、编号、采购人" autocomplete="off" /></label><select name="review" aria-label="确认状态">' + option("", "全部确认状态") + Object.keys(reviews).map(function (key) { return option(key, reviews[key][0]); }).join("") + '</select><input name="region" list="opRegions" placeholder="全部地区 · 输入搜索" aria-label="按实施地区筛选" /><datalist id="opRegions">' + Array.from(new Set(store.get().opportunities.map(function (i) { return i.region; }))).map(function (v) { return option(v, v); }).join("") + '</datalist><input name="source" list="opSourceOptions" placeholder="全部来源 · 输入搜索" aria-label="按来源筛选" /><datalist id="opSourceOptions">' + sources.map(function (s) { return option(s.name, s.name); }).join("") + '</datalist><select name="score" aria-label="初评区间">' + option("", "全部初评分") + option("80", "80 分及以上") + option("60", "60～79 分") + option("low", "60 分以下") + '</select><div class="op-filter-actions">' + button("查询", "query", "", "secondary-btn", "search") + button("重置", "reset", "", "ghost-btn", "collect") + '</div></form><div id="opListResults"></div>';
    const form = one("#opFilters");
    if (ui.filters) Object.keys(ui.filters).forEach(function (key) { if (form.elements[key]) form.elements[key].value = ui.filters[key]; });
    form.addEventListener("submit", function (event) { event.preventDefault(); query(); });
    form.addEventListener("change", function (event) { if (event.target.name !== "query") query(); });
    renderRows();
  }
  function query() {
    ui.filters = Object.fromEntries(new FormData(one("#opFilters")));
    if (["pending", "approved", "transferred"].includes(ui.metric) && ui.filters.review !== ui.metric) ui.metric = "";
    ui.page = 1; renderMetrics(); renderRows();
  }
  function renderRows() {
    const f = ui.filters || {};
    const items = store.get().opportunities.filter(function (item) {
      const result = assess(item);
      const matchesReview = function (value) { return item.review === value; };
      const metric = !ui.metric || (ui.metric === "urgent" ? isUrgent(item) : matchesReview(ui.metric));
      return metric && (!f.query || [item.name, item.number, item.purchaser].join(" ").toLowerCase().includes(f.query.trim().toLowerCase())) && (!f.review || matchesReview(f.review)) && (!f.region || item.region.includes(f.region.trim())) && (!f.source || sourcesFor(item).includes(f.source.trim())) && (!f.score || (f.score === "80" ? result.score >= 80 : f.score === "60" ? result.score >= 60 && result.score < 80 : result.score < 60));
    }).sort(function (a, b) { return assess(b).score - assess(a).score; });
    const pages = Math.max(1, Math.ceil(items.length / 8));
    ui.page = Math.min(ui.page, pages);
    const rows = items.slice((ui.page - 1) * 8, ui.page * 8).map(function (item) {
      const score = assess(item);
      const decision = store.assessment(item).decision;
      const checks = store.participationChecks(item);
      const boundary = score.boundary;
      const stale = store.assessment(item).stale;
      const risks = currentRisks(item), unknowns = assessmentUnknowns(item), currentUnknowns = noticeUnknowns(item), initialRisk = assessmentRisk(item) ? (stale ? "上次初评：" : "") + assessmentRisk(item) : "";
      const sourceText = [item.region || "公告未明确实施地", item.package, sourcesFor(item)].filter(Boolean).join(" · ");
      const timing = store.status(item), timingRisk = timing.blocked ? timing.text : "";
      const assessmentWarnings = decision.conditions.warnings.map(function (warning) { return (stale ? "上次初评：" : "") + warning; });
      const riskText = compactListRisk([timingRisk].concat(checks, currentUnknowns, risks, initialRisk, unknowns, assessmentWarnings).find(Boolean) || "未发现明显限制");
      const riskDetails = Array.from(new Set([timingRisk].concat(checks, currentUnknowns, risks, [(stale ? "上次初评：" : "") + boundary.group + "：" + boundary.reason, initialRisk, decision.key === "excluded" ? (stale ? "上次初评：" : "") + assessmentMessage(decision.reason) : ""], unknowns, assessmentWarnings).filter(Boolean))).join("\n");
      const review = reviews[item.review] || reviews.pending;
      const primaryActionClass = "project-entry-btn compact-btn op-list-main-action";
      return '<tr><td><a class="op-project-link op-list-truncate" title="' + esc(item.name) + '" data-op-detail-link="' + esc(item.id) + '" href="' + esc(detailUrl(item.id)) + '">' + esc(item.name) + '</a><small class="op-list-truncate" title="' + esc(item.purchaser) + '">' + esc(item.purchaser) + '</small><small class="op-list-truncate" title="' + esc(sourceText) + '">' + esc(sourceText) + '</small></td><td>' + moneyMarkup(item.amount, "list") + '</td><td>' + deadlineView(item) + '</td><td class="op-list-score-cell">' + scoreMarkup(score.score) + '</td><td><div class="op-list-risk-head" title="' + esc(riskDetails) + '">' + tag((stale ? "上次初评·" : "") + (boundary.key === "unknown" ? "公告信息不完整" : boundary.label), boundary.blocked ? "red" : boundary.key === "allowed" ? "green" : "orange") + '</div><div class="op-list-risk-text" title="' + esc(riskDetails) + '" aria-label="' + esc(riskDetails) + '">' + esc(riskText) + '</div></td><td><div class="op-list-review">' + tag(review[0], review[1]) + (item.recheck && item.review !== "rejected" ? '<span class="op-list-review-note" title="公告或规则已更新，请查看最新内容。">' + esc(changeLabel(item)) + '</span>' : '') + '</div></td><td><div class="op-table-actions op-list-actions"><a class="text-btn compact-btn" data-op-detail-link="' + esc(item.id) + '" href="' + esc(detailUrl(item.id)) + '"><span class="btn-icon">' + svg("search") + '</span><span>详情</span></a>' + opportunityAction(item, primaryActionClass) + '</div></td></tr>';
    }).join("");
    one("#opListResults").innerHTML = (items.length ? '<div class="table-wrap"><table class="data-table op-table op-opportunity-table"><colgroup><col class="op-col-project"/><col class="op-col-budget"/><col class="op-col-deadline"/><col class="op-col-score"/><col class="op-col-risk"/><col class="op-col-review"/><col class="op-col-actions"/></colgroup><thead><tr><th>项目 / 采购人</th><th>本包预算</th><th>关键期限</th><th class="op-list-score-cell">初评分</th><th>风险提示</th><th>确认状态</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("没有符合条件的机会", isAdmin ? "可调整筛选条件、清除指标筛选，或前往“来源网站”发起采集。" : "可调整筛选条件或清除指标筛选。")) + '<footer class="panel-footer op-pagination"><span>共 ' + items.length + ' 条 · 按初评分排序' + (ui.metric ? ' · 已应用指标筛选 ' + button("清除", "metric", "", "text-btn compact-btn", "close") : "") + '</span><div class="pagination">' + button("上一页", "page", ui.page - 1, "ghost-btn compact-btn", "back", ui.page === 1) + '<span>' + ui.page + ' / ' + pages + '</span>' + button("下一页", "page", ui.page + 1, "ghost-btn compact-btn", "arrow", ui.page === pages) + '</div></footer>';
    syncListPosition();
    if (ui.restoreListScroll) { ui.restoreListScroll = false; const y = Math.max(0, Number(pageParams.get("listScroll")) || 0); window.setTimeout(function () { if (window.scrollTo) window.scrollTo(0, y); }, 0); }
  }
  function syncListPosition() {
    const target = listPositionUrl();
    replacePosition(new URLSearchParams(target.slice(target.indexOf("?") + 1)));
  }
  function ruleFieldLabel(spec) { return spec.label + (spec.unit ? "（" + spec.unit + "）" : ""); }
  function ruleFieldValue(spec, rule) {
    const value = rule[spec.key];
    if (spec.key === "min" && (value == null || value === 0)) return "";
    return value == null ? "" : String(value);
  }
  function ruleFieldCaption(spec, editing) {
    const label = esc(ruleFieldLabel(spec));
    const required = editing && spec.required ? '<span class="op-rule-required" aria-hidden="true"> *</span>' : '';
    const text = editing ? '<label for="opRuleField-' + spec.key + '">' + label + required + '</label>' : '<span>' + label + '</span>';
    return '<span class="op-rule-caption">' + text + (spec.help ? '<button type="button" class="op-rule-help" data-rule-help="' + spec.key + '" title="查看' + esc(spec.label) + '说明" aria-label="' + esc(spec.label) + '说明">' + svg("info") + '</button>' : '') + '</span>';
  }
  function hideRuleHelp() {
    window.clearTimeout(ruleHelpTimer);
    const popup = one("#opRuleTooltip");
    if (popup) popup.hidden = true;
    if (ruleHelpTrigger) ruleHelpTrigger.removeAttribute("aria-describedby");
    ruleHelpTrigger = null;
  }
  function showRuleHelp(trigger) {
    const spec = ruleFormFields.concat(sourceFormFields).find(function (item) { return item.key === trigger.dataset.ruleHelp; });
    if (!spec || !spec.help) return;
    hideRuleHelp();
    let popup = one("#opRuleTooltip");
    if (!popup) { popup = document.createElement("div"); popup.id = "opRuleTooltip"; popup.className = "op-rule-tooltip"; popup.setAttribute("role", "tooltip"); document.body.appendChild(popup); }
    popup.textContent = spec.help;
    popup.hidden = false;
    ruleHelpTrigger = trigger;
    trigger.setAttribute("aria-describedby", popup.id);
    const rect = trigger.getBoundingClientRect();
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - popup.offsetWidth - 12));
    const below = rect.bottom + 8;
    const top = below + popup.offsetHeight <= window.innerHeight - 12 ? below : Math.max(12, rect.top - popup.offsetHeight - 8);
    popup.style.left = left + "px";
    popup.style.top = top + "px";
  }
  function bindRuleHelp() {
    document.addEventListener("mouseover", function (event) {
      const trigger = event.target.closest("[data-rule-help]");
      if (trigger) { window.clearTimeout(ruleHelpTimer); if (trigger !== ruleHelpTrigger) showRuleHelp(trigger); }
      else if (event.target.closest("#opRuleTooltip")) window.clearTimeout(ruleHelpTimer);
    });
    document.addEventListener("mouseout", function (event) {
      const owner = event.target.closest("[data-rule-help], #opRuleTooltip");
      if (owner && !owner.contains(event.relatedTarget)) ruleHelpTimer = window.setTimeout(hideRuleHelp, 180);
    });
    document.addEventListener("focusin", function (event) { const trigger = event.target.closest("[data-rule-help]"); if (trigger) showRuleHelp(trigger); });
    document.addEventListener("focusout", function (event) { if (event.target.closest("[data-rule-help]")) hideRuleHelp(); });
    document.addEventListener("click", function (event) { const trigger = event.target.closest("[data-rule-help]"); if (trigger) showRuleHelp(trigger); else if (!event.target.closest("#opRuleTooltip")) hideRuleHelp(); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && ruleHelpTrigger) { event.preventDefault(); event.stopImmediatePropagation(); hideRuleHelp(); } }, true);
    document.addEventListener("scroll", function (event) { if (!event.target.closest || !event.target.closest("#opRuleTooltip")) hideRuleHelp(); }, true);
    window.addEventListener("resize", hideRuleHelp);
  }
  function ruleFieldMarkup(spec, rule, editing) {
    const value = ruleFieldValue(spec, rule);
    const wide = spec.wide ? " wide" : "", key = spec.key;
    const caption = ruleFieldCaption(spec, editing);
    if (!editing) {
      let display = value;
      const emptyValue = !display.trim();
      if (emptyValue) display = ["regions", "min", "max"].includes(key) ? "不限" : key === "excludes" ? "无" : "未填写";
      const content = esc(display);
      const valueClass = emptyValue ? " op-rule-value-muted" : spec.type === "number" ? " op-rule-value-number" : "";
      return '<div class="op-rule-view-field' + wide + '" data-rule-field="' + key + '"><dt>' + caption + '</dt><dd><div class="op-rule-value' + valueClass + '">' + content + '</div></dd></div>';
    }
    let attributes = spec.required ? ' required' : '';
    if (spec.placeholder) attributes += ' placeholder="' + esc(spec.placeholder) + '"';
    if (spec.type !== "number") attributes += ' maxlength="1000"';
    ["min", "max", "step"].forEach(function (name) { if (spec[name] != null) attributes += ' ' + name + '="' + spec[name] + '"'; });
    const controlId = ' id="opRuleField-' + key + '"';
    const control = spec.type === "textarea" ? '<textarea' + controlId + ' name="' + key + '" rows="' + (key === "remarks" ? 4 : 3) + '" wrap="soft" data-rule-grow' + attributes + '>' + esc(value) + '</textarea>' : '<input' + controlId + ' name="' + key + '" type="' + spec.type + '" value="' + esc(value) + '"' + attributes + '/>';
    return '<div class="op-field' + wide + '" data-rule-field="' + key + '">' + caption + control + '</div>';
  }
  function ruleFieldsMarkup(rule, editing) { return ruleFormFields.map(function (spec) { return ruleFieldMarkup(spec, rule, editing); }).join(""); }
  function resizeRuleTextarea(element) {
    if (!element.clientWidth) return;
    element.style.height = "auto";
    const border = element.offsetHeight - element.clientHeight;
    element.style.height = element.scrollHeight + border + "px";
  }
  function resizeRuleFields(form) { form.querySelectorAll("textarea[data-rule-grow]").forEach(resizeRuleTextarea); }
  function renderRules() {
    const rule = store.get().rules[0], plan = store.get().collection;
    one("#opportunityContent").innerHTML = '<div class="op-config-grid op-single-rule"><article class="op-rule-card"><div class="op-card-top"><h3>招标机会筛选规则</h3>' + button("编辑规则", "rule", rule.id, "text-btn compact-btn", "edit") + '</div><dl class="op-form-grid op-rule-fields op-rule-view">' + ruleFieldsMarkup(rule, false) + '</dl><div class="op-card-bottom"><div class="op-rule-meta"><span>下次采集时间：' + esc(nextText(plan)) + '</span><span>最近保存时间：' + esc(rule.savedAt) + '</span></div></div></article></div>';
  }
  function ruleModal() {
    if (!isAdmin) return;
    const rule = store.copy(store.get().rules[0]);
    modal("编辑筛选规则", "关键词和排除词支持逗号、顿号或换行分隔。", '<div class="op-form-grid op-rule-fields">' + ruleFieldsMarkup(rule, true) + '</div>', "保存规则", function (data) {
      const values = Object.fromEntries(data);
      const updated = store.saveRule(values, rule.revision);
      const businessChanged = store.ruleBasis(rule) !== store.ruleBasis(updated);
      close(); render(); toast(updated.revision === rule.revision ? "规则未发生变化。" : businessChanged ? "筛选要求已保存，已确认的机会需重新确认是否投标。" : "配置已保存，原初评和投标决定保留。");
    });
    const form = one("#opModalForm");
    resizeRuleFields(form);
    window.setTimeout(function () { if (one("#opModalForm") === form) resizeRuleFields(form); }, 0);
    form.addEventListener("input", function (event) { if (event.target.dataset.ruleGrow !== undefined) resizeRuleTextarea(event.target); });
  }
  function sourceCollectionView(source) {
    const record = websiteRecords().find(function (entry) { return entry.sourceId === source.id; });
    if (source.entryChangedAt && (!record || record.sourceSnapshot.collectionUrl !== source.collectionUrl)) return '<strong>入口已更新，尚未采集</strong>' + (source.lastSuccess ? '<small title="原入口最近成功采集时间">历史成功：' + esc(source.lastSuccess) + '</small>' : '');
    if (record) {
      return '<strong>' + esc(record.at) + '</strong><small class="op-source-truncate" title="' + esc(record.message) + '">' + esc(record.state === "completed" ? "采集成功" : "采集失败：" + record.message) + '</small>';
    }
    return '<strong>尚无采集记录</strong>';
  }
  function sourceCheckMessage(source) {
    const message = source.checkError || source.error || "";
    return ["参考公告未能识别正文，请核对链接，或留空后重新检查。", "未能识别公告正文，请核对采集入口或参考公告链接。"].includes(message) ? "公告正文尚未确认，请重新检查来源。" : message;
  }
  function renderSources() {
    const page = configurationPage(store.get().sources, "sourcePage", "sourcePage", "来源网站分页");
    const available = store.get().sources.some(function (source) { return !sourceCollectionBlock(source); });
    one("#opportunityContent").innerHTML = '<div class="op-panel-intro"><p>维护采集入口、来源检查和启停配置。</p><div class="op-filter-actions">' + button("新增来源", "source", "", "secondary-btn", "add", ui.busy) + button(ui.collectingSource === "all" ? "正在采集" : "全部采集", "collect", "", "primary-btn", "collect", ui.busy || !available, available ? "采集全部已启用、访问有效且检查通过的来源" : "没有可采集来源，请检查登录状态及来源配置") + '</div></div><div class="table-wrap"><table class="op-table op-source-table"><colgroup><col style="width:22%"/><col style="width:15%"/><col style="width:14%"/><col style="width:19%"/><col style="width:30%"/></colgroup><thead><tr><th>来源网站</th><th>采集入口 / 栏目</th><th>来源检查</th><th>最近采集情况</th><th>操作</th></tr></thead><tbody>' + page.items.map(function (source) {
      const blocked = sourceCollectionBlock(source), checking = ui.checkingSource === source.id;
      const access = store.sourceAccess(source);
      const checked = source.checked ? (source.status === "pending" ? "上次检查：" : "最近检查：") + source.checked.slice(5) : "尚无检查记录";
      return '<tr><td><strong>' + esc(source.name) + '</strong><small>' + esc(source.type + " · " + (source.enabled ? "已启用" : "已停用")) + '</small></td><td><strong>' + esc(source.column || "未填写栏目名称") + '</strong>' + sourceLinks(source) + '</td><td>' + tag(checking ? "检查中" : access.reason ? access.label : source.status === "ready" ? "可采集" : source.status === "error" ? "检查失败" : "待检查", checking ? "blue" : access.reason ? "orange" : source.status === "ready" ? "green" : "orange") + '<small title="' + esc(source.checked ? "最近检查：" + source.checked + (source.status === "pending" ? "；配置已变更，需重新检查" : "") : checked) + '">' + esc(checked) + '</small><small class="op-source-truncate" title="' + esc(access.reason || source.accessScope || access.label) + '">' + esc(access.label + (source.accessMode === "login" ? ' · 账号密码' : '')) + '</small>' + (source.status === "error" ? '<small class="op-source-truncate" title="' + esc(sourceCheckMessage(source)) + '">' + esc(sourceCheckMessage(source)) + '</small>' : '') + '</td><td>' + sourceCollectionView(source) + '</td><td><div class="op-table-actions op-source-row-actions">' + button(ui.collectingSource === source.id ? "正在采集" : "立即采集", "collectSource", source.id, "secondary-btn compact-btn op-source-collect", "collect", ui.busy || !!blocked, blocked || "采集此来源") + button("编辑", "source", source.id, "text-btn compact-btn", "edit", ui.busy) + button(checking ? "检查中" : source.accessMode === "login" && access.reason ? "登录检查" : "检查来源", "verify", source.id, "text-btn compact-btn", "check", ui.busy) + button(source.enabled ? "停用" : "启用", "toggleSource", source.id, "text-btn compact-btn", source.enabled ? "pause" : "play", ui.busy) + '</div></td></tr>';
    }).join("") + '</tbody></table></div>' + page.footer;
  }
  function sourceCollectionBlock(source) {
    if (!source) return "来源网站不存在。";
    if (!source.enabled) return "来源已停用，请先启用。";
    if (store.sourceAccess(source).reason) return store.sourceAccess(source).reason;
    if (source.status !== "ready") return source.status === "error" ? "来源检查未通过，请检查来源后再采集。" : "请先完成来源检查。";
    return "";
  }
  function configurationPage(items, key, action, label) {
    const pages = Math.max(1, Math.ceil(items.length / configPageSize));
    ui[key] = Math.max(1, Math.min(pages, Math.floor(Number(ui[key]) || 1)));
    return {
      items: items.slice((ui[key] - 1) * configPageSize, ui[key] * configPageSize),
      footer: '<footer class="op-pagination"><span>共 ' + items.length + ' 条 · 每页 ' + configPageSize + ' 条</span><nav class="pagination" aria-label="' + esc(label) + '">' + button("上一页", action, ui[key] - 1, "ghost-btn compact-btn", "back", ui[key] === 1) + '<span>' + ui[key] + ' / ' + pages + '</span>' + button("下一页", action, ui[key] + 1, "ghost-btn compact-btn", "arrow", ui[key] === pages) + '</nav></footer>'
    };
  }
  function validCount(value) { return Number.isSafeInteger(value) && value >= 0; }
  function websiteRecords() {
    return store.get().runs.flatMap(function (run) {
      return (run.rows || []).map(function (row) {
        const id = row.sourceId || row.id, snapshot = row.sourceSnapshot || { id: id, name: row.source || "", collectionUrl: "" };
        const source = store.get().sources.find(function (entry) { return entry.id === id; });
        return { runId: run.id, at: row.at || run.at, sourceId: id, source: source ? source.name : snapshot.name || row.source, sourceSnapshot: snapshot, historical: !source, state: sourceRunState(row), message: row.message || "", collectedCount: row.collectedCount, newCount: row.newCount, updatedCount: row.updatedCount, duplicateCount: row.duplicateCount, excludedCount: row.excludedCount };
      });
    }).sort(function (a, b) { return store.time(b.at) - store.time(a.at); });
  }
  function collectionSourceOptions(records) {
    const options = new Map();
    store.get().sources.forEach(function (source) { options.set(source.id, { id: source.id, name: source.name, address: source.collectionUrl || source.url || "", historical: false, aliases: [] }); });
    (records || websiteRecords()).forEach(function (record) {
      if (!options.has(record.sourceId)) options.set(record.sourceId, { id: record.sourceId, name: record.source, address: record.sourceSnapshot.collectionUrl || "", historical: true, aliases: [] });
      const item = options.get(record.sourceId);
      if (record.sourceSnapshot.name && !item.aliases.includes(record.sourceSnapshot.name)) item.aliases.push(record.sourceSnapshot.name);
    });
    const result = Array.from(options.values());
    result.forEach(function (item) {
      let suffix = "";
      if (result.filter(function (other) { return other.name === item.name; }).length > 1) {
        try { suffix = new URL(item.address).hostname; } catch (error) { suffix = "历史来源 " + (result.indexOf(item) + 1); }
      }
      item.label = item.name + (item.historical ? "（历史来源）" : "") + (suffix ? " · " + suffix : "");
    });
    const labels = result.map(function (item) { return item.label; });
    result.forEach(function (item, index) { if (labels.filter(function (label) { return label === item.label; }).length > 1) item.label += " · 来源 " + (index + 1); });
    return result;
  }
  function resolveRunSource(value, choices, allowQuery) {
    const text = String(value || "").trim(), exact = choices.find(function (item) { return item.id === text; });
    if (exact) return { source: exact.id, sourceQuery: "" };
    const matches = choices.filter(function (item) { return item.label === text || item.name === text || item.aliases.includes(text); });
    return matches.length === 1 ? { source: matches[0].id, sourceQuery: "" } : { source: "", sourceQuery: allowQuery ? text : "" };
  }
  function collectionSourceTitle(record) {
    const parts = [record.historical ? "原来源：" + record.source : "当前网站：" + record.source];
    if (record.sourceSnapshot.name && !record.sourceSnapshot.inferred) parts.push("采集时名称：" + record.sourceSnapshot.name);
    if (record.sourceSnapshot.collectionUrl) parts.push("采集时入口：" + record.sourceSnapshot.collectionUrl);
    return parts.join("\n");
  }
  function recordQuantity(value, prominent) {
    return '<strong' + (prominent ? ' class="op-run-new-count"' : '') + '>' + (validCount(value) ? value : 0) + '</strong>';
  }

  function countHeading(label, help) {
    return '<span class="op-run-count-heading"><span>' + label + '</span><span class="op-run-count-note" tabindex="0" title="' + help + '" aria-label="' + help + '">' + svg("info") + '</span></span>';
  }
  function renderRuns() {
    const allRecords = websiteRecords(), filters = ui.runFilters;
    const choices = collectionSourceOptions(allRecords);
    const searchSources = choices.length > 10;
    if (filters.source) Object.assign(filters, resolveRunSource(filters.source, choices, searchSources));
    const selectedSource = choices.find(function (item) { return item.id === filters.source; });
    const sourceControl = searchSources ? '<input name="source" list="opRunSources" type="search" value="' + esc(selectedSource ? selectedSource.label : filters.sourceQuery || "") + '" placeholder="全部来源 · 输入搜索" autocomplete="off"/><datalist id="opRunSources">' + choices.map(function (item) { return option(item.label, item.label); }).join("") + '</datalist>' : '<select name="source">' + option("", "全部来源网站", !filters.source) + choices.map(function (item) { return option(item.id, item.label, filters.source === item.id); }).join("") + '</select>';
    const filterBar = '<form id="opRunFilters" class="op-filter-bar op-run-filters"><label class="op-field"><span>来源网站</span>' + sourceControl + '</label><label class="op-field"><span>采集结果</span><select name="result">' + option("", "全部采集结果", !filters.result) + option("completed", "采集成功", filters.result === "completed") + option("failed", "采集失败", filters.result === "failed") + '</select></label><div class="op-field op-run-date-field"><span id="opRunDateLabel">执行时间</span><div class="op-run-date-range" role="group" aria-labelledby="opRunDateLabel"><input type="date" name="from" aria-label="执行开始日期" value="' + esc(filters.from) + '"/><span>至</span><input type="date" name="to" aria-label="执行结束日期" value="' + esc(filters.to) + '"/></div></div><div class="op-filter-actions">' + (searchSources ? button("查询", "runQuery", "", "secondary-btn", "search") : "") + button("重置", "runReset", "", "ghost-btn", "collect") + '</div></form>';
    const records = allRecords.filter(function (record) {
      const day = record.at.slice(0, 10);
      return (!filters.source || record.sourceId === filters.source) && (!filters.sourceQuery || [record.source, record.sourceSnapshot.name || ""].join(" ").includes(filters.sourceQuery.trim())) && (!filters.result || record.state === filters.result) && (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to);
    });
    const page = configurationPage(records, "runPage", "runPage", "采集记录分页");
    const rows = page.items.map(function (record) {
      const state = record.state;
      const label = state === "completed" ? ["采集成功", "green"] : ["采集失败", "red"];
      const reason = state === "completed" ? record.collectedCount === 0 ? "未发现公告" : record.newCount === 0 && record.updatedCount === 0 ? "无新增或更新，已完成去重和筛选" : "采集及初评处理完成" : (record.collectedCount > 0 ? "已处理 " + record.collectedCount + " 条公告；" : "") + (record.message || "网站连接中断，本次采集未完成，请稍后重试。");
      return '<tr><td><strong>' + esc(record.at) + '</strong></td><td><span class="op-run-source" title="' + esc(collectionSourceTitle(record)) + '">' + esc(record.source) + '</span></td><td>' + tag(label[0], label[1]) + '</td><td class="op-run-number">' + recordQuantity(record.collectedCount) + '</td><td class="op-run-number">' + recordQuantity(record.newCount, true) + '</td><td class="op-run-number">' + recordQuantity(record.updatedCount) + '</td><td class="op-run-number">' + recordQuantity(record.duplicateCount) + '</td><td class="op-run-number">' + recordQuantity(record.excludedCount) + '</td><td><span class="op-run-reason" title="' + esc(reason) + '">' + esc(reason) + '</span></td></tr>';
    }).join("");
    one("#opportunityContent").innerHTML = filterBar + (records.length ? '<div class="table-wrap"><table class="op-table op-run-table"><colgroup><col style="width:17%"/><col style="width:16%"/><col style="width:9%"/><col style="width:9%"/><col style="width:7%"/><col style="width:7%"/><col style="width:7%"/><col style="width:7%"/><col style="width:21%"/></colgroup><thead><tr><th>执行时间</th><th>来源网站</th><th>采集结果</th><th class="op-run-number">' + countHeading("采集总数", "本次从该网站成功读取并完成处理的公告条数，等于新增、更新、去重、筛除之和。每条公告只归入一种结果。") + '</th><th class="op-run-number">' + countHeading("新增", "符合规则并形成新机会的公告条数。") + '</th><th class="op-run-number">' + countHeading("更新", "内容变化并更新已有机会的公告条数，如新更正公告；不是项目数。") + '</th><th class="op-run-number">' + countHeading("去重", "系统已有相同内容、无需新增或更新的公告条数，包括重复采集和跨网站转载；已处理的更正公告再次采集也归入去重。") + '</th><th class="op-run-number">' + countHeading("筛除", "不符合筛选条件、低于初评入库标准或超出首次回溯范围，未进入机会库的公告条数。") + '</th><th>概要说明</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty(allRecords.length ? "暂无符合条件的采集记录" : "暂无采集记录", allRecords.length ? "请调整查询条件或重置后查看。" : "请在“来源网站”发起采集，完成后可在此查看结果。")) + page.footer;
    const form = one("#opRunFilters");
    form.addEventListener("submit", function (event) { event.preventDefault(); queryRuns(); });
    form.addEventListener("change", function (event) { if (event.target.name !== "source" || !searchSources || !event.target.value || choices.some(function (item) { return item.label === event.target.value; })) queryRuns(); });
    form.elements.to.min = filters.from;
    form.elements.from.max = filters.to;
    const params = new URLSearchParams(location.search); params.set("tab", "runs"); params.set("runPage", String(ui.runPage));
    [["source", "runSource"], ["sourceQuery", "runSourceText"], ["result", "runResult"], ["from", "runFrom"], ["to", "runTo"]].forEach(function (entry) { if (filters[entry[0]]) params.set(entry[1], filters[entry[0]]); else params.delete(entry[1]); });
    replacePosition(params);
  }
  function queryRuns() {
    const form = one("#opRunFilters"), values = Object.fromEntries(new FormData(form));
    form.elements.to.setCustomValidity(values.from && values.to && values.from > values.to ? "结束日期不能早于开始日期。" : "");
    form.elements.from.max = values.to; form.elements.to.min = values.from;
    if (!form.reportValidity()) return;
    const focused = document.activeElement && document.activeElement.name;
    const choices = collectionSourceOptions();
    Object.assign(values, resolveRunSource(values.source, choices, choices.length > 10));
    ui.runFilters = values; ui.runPage = 1; renderRuns();
    if (focused && one("#opRunFilters").elements[focused]) one("#opRunFilters").elements[focused].focus();
  }

  function fact(label, value, wide) { return '<div' + (wide ? ' class="wide"' : "") + '><span>' + esc(label) + '</span><strong>' + esc(value || "公告未明确") + '</strong></div>'; }
  function ruleSnapshotView(rule) {
    if (!rule || !["structured", "form"].includes(rule.format)) return '<p class="op-help">历史业务要求，待按当前规则重新初评。</p>';
    const model = store.ruleModel(rule);
    return '<p>' + esc(store.ruleSummary(rule)) + '</p><p class="op-help">关键词：' + esc(rule.format === "form" ? rule.keywords : model.accepted.concat(model.extraAccepted).join("、")) + '</p><p class="op-help">排除条件：' + esc(rule.format === "form" ? rule.excludes || "无" : model.excluded.concat(model.extraExcluded).join("、") || "无") + '</p>' + (rule.remarks ? '<p class="op-help op-rule-remarks">备注说明：' + esc(rule.remarks) + '</p>' : '');
  }
  function historyRule(record) {
    return record.ruleSnapshot && ["structured", "form"].includes(record.ruleSnapshot.format) ? '<details class="op-rule-history"><summary>' + svg("file") + '查看当时的规则 · V' + esc(record.ruleSnapshot.revision) + '</summary>' + ruleSnapshotView(record.ruleSnapshot) + '</details>' : "";
  }
  function fileIcon(name) { return window.BiddingFileIcons ? window.BiddingFileIcons.markup(name) : '<span class="file-type-icon">' + svg("file") + '</span>'; }
  function noticeSections(notice) {
    return [
      { title: "项目基本情况", text: [notice.name, "项目编号：" + notice.number, notice.package, "本包预算：" + money(notice.amount), "最高限价：" + money(notice.cap)].join("；") },
      { title: "采购内容", text: notice.summary || "公告未披露具体采购内容" },
      { title: "申请人资格", text: notice.qualification || "公告未披露完整资格条件" },
      { title: "文件获取与投标", text: "文件获取：" + (notice.acquisitionStart || "未明确") + " 至 " + (notice.acquisitionEnd || "未明确") + "；单独报名截止：" + (notice.registrationEnd || "公告未单独列明") + "；投标截止：" + (notice.deadline || "未明确") + "（北京时间）" },
      { title: "实施与服务要求", text: "实施地：" + (notice.region || "未明确") + "；履约期限：" + (notice.term || "未明确") }
    ];
  }
  function opportunitySources(item) {
    return item.sourceIds.map(function (id) {
      const source = store.get().sources.find(function (entry) { return entry.id === id; });
      const specific = item.noticeUrls && item.noticeUrls[id] || item.noticeUrl;
      return '<div class="op-notice-source"><strong>' + esc(source ? source.name : "公告来源") + '</strong><div class="op-filter-actions">' + (specific ? external(specific, "查看来源公告") : "") + (source ? external(source.collectionUrl || source.url, "访问来源网站") : "") + '</div></div>';
    }).join("");
  }
  function assessmentRows(item) {
    const saved = store.assessment(item).snapshot, notice = saved.notice;
    const details = saved.result.details || [];
    if (!notice) return '<tr><td><strong>初评留存记录</strong></td><td>已保存 ' + esc(saved.result.score) + ' 分</td><td>' + esc(saved.decision.reason) + '</td><td>' + button("查看依据", "basis", item.id + ":0", "text-btn compact-btn", "file") + '</td></tr>';
    const results = notice ? [saved.result.boundary.key === "unknown" ? "公告信息不完整" : saved.result.boundary.label, details[1] && details[1].unknown ? "材料依据不完整" : "需结合完整文件核对", notice.amount == null ? "公告未明确预算" : "已识别预算", notice.region ? "已识别实施要求" : "公告未明确实施地", notice.deadline ? "已识别参与期限" : "公告未明确截止时间"] : ["查看留存依据", "查看留存依据", "查看留存依据", "查看留存依据", "查看留存依据"];
    const reasons = notice ? [saved.result.boundary.reason, notice.qualification || "公告未披露完整资格要求", "本包预算：" + money(notice.amount) + "；最高限价：" + money(notice.cap), "实施地：" + (notice.region || "未明确") + "；履约期限：" + (notice.term || "未明确"), "获取截止：" + (notice.acquisitionEnd || "未明确") + "；投标截止：" + (notice.deadline || "未明确")] : Array(5).fill(saved.decision.reason);
    return store.dimensions.map(function (name, index) {
      return '<tr><td><strong>' + esc(name) + '</strong></td><td>' + esc(results[index]) + '</td><td>' + esc(reasons[index]) + '</td><td>' + button("查看依据", "basis", item.id + ":" + index, "text-btn compact-btn", "file") + '</td></tr>';
    }).join("");
  }
  function processingRecord(record) {
    const saved = record.assessmentSnapshot;
    return '<article><strong>' + esc(record.action) + '</strong><small>' + esc(record.user + " · " + record.at) + ' · 公告 V' + esc(record.revision) + (record.score != null ? ' · 初评 ' + esc(record.score) + ' 分' + (saved ? '（公告 V' + esc(saved.noticeRevision) + ' / 规则 V' + esc(saved.ruleRevision) + '）' : '') : '') + '</small>' + (record.note ? '<p>' + esc(record.note) + '</p>' : '') + historyRule(record) + (record.previousAssessmentSnapshot ? '<details class="op-detail-fold"><summary>查看上次初评</summary><p>' + esc(record.previousAssessmentSnapshot.at) + ' · 公告 V' + record.previousAssessmentSnapshot.noticeRevision + ' · 规则 V' + record.previousAssessmentSnapshot.ruleRevision + ' · ' + record.previousAssessmentSnapshot.result.score + ' 分</p>' + ruleSnapshotView(record.previousAssessmentSnapshot.rule) + '</details>' : '') + '</article>';
  }
  function renderDetail() {
    const returnTo = opportunityReturnUrl(), backUrl = returnTo || "opportunities.html";
    const backLabel = returnTo.includes("tab=runs") ? "返回采集记录" : "返回机会列表";
    const back = link(backLabel, backUrl, "ghost-btn", "back");
    one(".page-breadcrumb").innerHTML = '<a href="' + esc(backUrl) + '">招标机会</a><span>/</span><strong>机会详情</strong>';
    const item = store.find(detailId);
    if (!item) { if (store.restoredDefaults && window.location && window.location.replace) { window.location.replace(backUrl); return; } one("#opportunityDetail").innerHTML = empty("机会不存在", "该记录不可用，请返回继续查看。") + back; return; }
    const assessment = store.assessment(item), saved = assessment.snapshot, score = assessment.result, timing = store.status(item);
    const editable = !item.projectId;
    const actions = back + opportunityAction(item, "primary-btn");
    const project = store.get().projects.find(function (entry) { return entry.id === item.projectId; });
    const lastDecision = (item.history || []).find(function (entry) { return ["确认投标", "重新确认投标", "放弃机会"].includes(entry.action); });
    const decisionBy = item.confirmedBy || lastDecision && lastDecision.user;
    const decisionAt = item.confirmedAt || lastDecision && lastDecision.at;
    const checks = store.participationChecks(item);
    const risks = Array.from(new Set(checks.concat(noticeUnknowns(item), currentRisks(item))));
    const versionText = '评估时间 ' + esc(saved.at) + ' · 公告 V' + esc(saved.noticeRevision) + ' · 规则 V' + esc(saved.ruleRevision);
    const changeMessage = (item.projectId ? item.recheck ? '来源信息已更新，请在关联项目中核对影响。' : '' : timing.blocked ? item.review === 'rejected' ? '该公告暂不能重新确认投标，原放弃记录保留。' : '该公告暂不能确认投标或转入投标项目，仍可查看或放弃机会。' : item.review === 'rejected' ? assessment.stale ? '如需重新参与，可重新确认投标。' : '' : item.recheck && item.review === 'approved' ? '请重新确认是否投标，可按需重新初评。' : assessment.stale ? item.review === 'pending' ? '可直接确认是否投标，或按需重新初评。' : '可按需重新初评，原确认结果保留。' : '');
    const alert = changeMessage ? '<div class="op-assessment op-warning">' + changeMessage + '</div>' : '';
    const hero = '<section class="card op-detail-summary"><div class="op-detail-summary-main"><div class="op-status-row">' + reviewTag(item) + noticeException(item) + '</div><div class="op-detail-title"><h1>' + esc(item.name) + '</h1><p>' + esc(item.number + " · " + item.package + " · " + item.round) + '</p></div><div class="op-detail-quick-facts"><div><span>本包预算</span>' + moneyMarkup(item.amount, "hero") + '</div><div><span>投标截止</span><strong>' + esc(item.deadline || "公告未明确") + '</strong>' + deadlineNotes(item) + '</div><div><span>机会初评分</span>' + scoreMarkup(score.score, "detail") + '</div></div>' + (decisionBy ? '<p class="op-help">' + esc((item.review === "rejected" ? "放弃记录：" : "确认记录：") + decisionBy + " · " + decisionAt) + '</p>' : '') + (project ? '<div class="op-linked-project"><span>关联项目</span>' + link(project.name, projectUrl(project.id), "op-source-link", "arrow") + '<small>负责人：' + esc(project.owner) + '</small>' + transferFilesSummary(item, project) + '</div>' : '') + '</div><div class="heading-actions op-detail-main-actions">' + actions + '</div></section>';
    const facts = '<div class="op-detail-overview"><section class="card op-section"><h2>项目概况</h2><div class="op-facts op-compact-facts">' + fact("采购人", item.purchaser) + fact("代理机构", item.agency) + fact("项目实施地", item.region) + fact("采购方式", item.method) + moneyFact("项目总预算", item.totalAmount) + moneyFact("本包最高限价", item.cap) + fact("履约期限", item.term) + fact("联系方式", item.contact) + fact("采购需求", item.summary, true) + '</div></section><section class="card op-section"><h2>参与时间</h2><div class="op-facts op-compact-facts">' + fact("公告发布时间", item.published) + fact("文件获取开始", item.acquisitionStart) + fact("文件获取截止", item.acquisitionEnd) + fact("单独报名截止", item.registrationEnd || "公告未单独列明") + fact("投标截止", item.deadline) + fact("开标时间", item.opening) + '</div></section></div>';
    const breakdown = score.details.length ? '<details class="op-detail-fold"><summary>查看分项得分</summary><div class="op-detail-score-grid">' + score.details.map(function (row) { return '<div class="op-score-row"><header><span>' + esc(row.name) + '</span><strong>' + esc(row.score) + ' 分</strong></header><small>' + esc(row.evidence) + '</small></div>'; }).join("") + '</div></details>' : '';
    const analysis = '<section class="card op-section"><header class="op-section-heading"><div><h2>初评分析</h2><p class="op-help">' + versionText + '</p></div>' + (editable ? button("重新初评", "evaluate", item.id, "secondary-btn", "collect", ui.busy) : '') + '</header><div class="op-assessment">' + esc((assessment.stale ? "上次初评：" : "") + assessmentMessage(saved.decision.reason)) + '</div>' + (risks.length ? '<div class="op-current-risks"><strong>当前需关注</strong><ul class="op-risk-list">' + risks.map(function (risk) { return '<li>' + esc(risk) + '</li>'; }).join("") + '</ul></div>' : '') + '<div class="table-wrap"><table class="op-table op-assessment-table"><colgroup><col style="width:17%"/><col style="width:18%"/><col style="width:51%"/><col style="width:14%"/></colgroup><thead><tr><th>判断项</th><th>判断结果</th><th>主要依据或关注点</th><th>操作</th></tr></thead><tbody>' + assessmentRows(item) + '</tbody></table></div>' + breakdown + '<details class="op-detail-fold"><summary>查看本次评估的筛选规则 · V' + esc(saved.ruleRevision) + '</summary>' + ruleSnapshotView(saved.rule) + '</details></section>';
    const sections = noticeSections(item);
    const notices = '<section class="card op-section" id="opNotice"><header class="op-section-heading"><h2>公告与附件</h2><span class="op-help">公告 V' + item.revision + ' · 最近更新 ' + esc(item.verified) + '</span></header><div class="op-notice-sources">' + opportunitySources(item) + '</div><details class="op-detail-fold"><summary>查看当前公告内容</summary><article class="op-notice">' + sections.map(function (section, index) { return '<section id="opNoticeSection' + index + '"><h3>' + esc(section.title) + '</h3><p>' + esc(section.text) + '</p></section>'; }).join("") + '</article></details><div class="op-detail-files">' + (item.files.length ? item.files.map(function (file, index) { return '<div class="op-file">' + fileIcon(file.name) + '<div><strong>' + esc(file.name) + '</strong><small>' + esc(file.size + " · " + (file.main ? "主招标文件" : "附件")) + '</small></div>' + button("预览", "file", item.id + ":" + index, "text-btn compact-btn", "search") + '</div>'; }).join("") : '<p class="op-help">暂无公开主招标文件' + (editable ? item.review === "approved" ? '，转入投标项目时需补传主招标文件。' : '，转入投标项目时可补传。' : hasMainFile(item) ? '，已带入项目的文件可在关联项目中查看。' : '。') + '</p>') + '</div>' + (item.changes.length ? '<details class="op-detail-fold"><summary>关联公告与变更（' + item.changes.length + '）</summary><div class="op-history">' + item.changes.map(function (change) { return '<article><strong>' + esc(change.title) + '</strong><small>' + esc(change.at) + ' · 公告 V' + esc(change.revision) + '</small><p>' + esc(change.text) + '</p></article>'; }).join("") + '</div></details>' : '') + '</section>';
    const history = '<section class="card op-section"><h2>处理记录</h2>' + (item.history.length ? '<div class="op-history">' + item.history.slice(0, 3).map(processingRecord).join("") + '</div>' + (item.history.length > 3 ? '<details class="op-detail-fold"><summary>查看更早记录（' + (item.history.length - 3) + '）</summary><div class="op-history">' + item.history.slice(3).map(processingRecord).join("") + '</div></details>' : '') : '<p class="op-help">尚无处理记录。</p>') + '</section>';
    one("#opportunityDetail").innerHTML = '<div class="op-detail-page">' + hero + alert + facts + analysis + notices + history + '</div>';
  }
  function basisModal(value) {
    const split = value.lastIndexOf(":"), item = store.find(value.slice(0, split)), index = Number(value.slice(split + 1));
    if (!item || !Number.isInteger(index) || index < 0 || index > 4) return;
    const saved = store.assessment(item).snapshot, sectionIndex = [1, 2, 0, 4, 3][index];
    const section = saved.notice ? noticeSections(saved.notice)[sectionIndex] : { title: "留存初评记录", text: saved.decision.reason };
    const row = saved.result.details[index];
    modal("查看初评依据", store.dimensions[index], '<dl class="op-basis-meta"><div><dt>对应公告</dt><dd>' + esc(item.name) + ' · V' + esc(saved.noticeRevision) + '</dd></div><div><dt>来源位置</dt><dd>' + esc(section.title) + '</dd></div><div><dt>评估记录</dt><dd>' + esc(saved.at) + ' · 规则 V' + esc(saved.ruleRevision) + '</dd></div></dl><article class="op-notice op-basis-original"><h3>' + (saved.notice ? '公告对应内容' : '留存评估说明') + '</h3><p><mark>' + esc(section.text) + '</mark></p></article>' + (row ? '<div class="op-assessment"><strong>初评依据说明</strong><p>' + esc(row.evidence) + '</p></div>' : '') + (saved.noticeRevision !== item.revision ? '<p class="op-help">当前公告为 V' + item.revision + '，以上为本次初评留存依据。</p>' : ''), "", null, taskCloseButton(), "op-evidence-modal");
  }

  function reviewModal(id) {
    store.refresh();
    const item = store.find(id);
    if (!item) { toast("机会记录已变化，请返回机会列表查看。", "warning"); return; }
    if (item.projectId) { toast("该机会已转项目，请查看关联项目。", "warning"); return; }
    const reopening = item.review === "rejected", reconfirming = item.review === "approved" && item.recheck;
    const hasDecision = item.review === "approved" || reopening;
    const score = assess(item), timing = store.status(item), decision = store.assessment(item).decision;
    const expected = store.actionContext(id), stale = store.assessment(item).stale;
    const boundary = store.capability(item);
    const risk = store.participationChecks(item)[0] || noticeUnknowns(item)[0] || (boundary.blocked ? boundary.reason : currentRisks(item)[0] || (decision.key === "excluded" ? (stale ? "上次初评：" : "") + assessmentMessage(decision.reason) : assessmentUnknowns(item)[0] || ""));
    const approveReason = timing.blocked ? timing.text + "，暂不能确认投标" : item.review === "approved" && !item.recheck ? "当前已确认投标" : "";
    const approve = '<label class="op-review-option" title="' + esc(approveReason) + '"><input type="radio" id="opReviewApproved" name="outcome" value="approved" required' + (approveReason ? ' disabled' : '') + '/><span><strong>确认投标</strong><small>' + (item.review === "approved" && !item.recheck ? '当前已确认投标' : '确认参与，后续可转入投标项目') + '</small></span></label>';
    const reject = '<label class="op-review-option"><input type="radio" id="opReviewRejected" name="outcome" value="rejected" required' + (reopening ? ' disabled' : '') + '/><span><strong>放弃机会</strong><small>' + (reopening ? '当前已放弃' : '保留记录，后续可重新确认') + '</small></span></label>';
    const currentDecision = hasDecision ? '<p class="op-help">当前决定：' + esc(reviews[item.review][0]) + '</p>' : '';
    const choices = '<fieldset class="op-review-decision"><legend>处理结果 <span>（必选）</span></legend>' + currentDecision + '<div class="op-review-options">' + approve + reject + '</div></fieldset>';
    const footer = button("取消", "close", "", "ghost-btn", "close") + '<button type="submit" id="opReviewConfirm" class="primary-btn" disabled><span class="btn-icon">' + svg("check") + '</span><span>确认</span></button>';
    modal(hasDecision ? "重新确认" : "人工确认", reconfirming ? "请根据最新信息重新选择处理结果，原记录保留。" : hasDecision ? "可调整是否参与投标，原记录保留。" : "请选择是否参与本次投标。", '<div class="op-modal-summary"><strong>' + esc(item.name) + '</strong><p>当前公告 V' + item.revision + ' · 筛选规则 V' + store.get().rules[0].revision + '</p><p>' + (stale ? '上次初评 ' : '初评 ') + scoreMarkup(score.score, 'inline') + ' 分（公告 V' + store.assessment(item).snapshot.noticeRevision + ' / 规则 V' + store.assessment(item).snapshot.ruleRevision + '）</p><p>本包预算：' + moneyMarkup(item.amount, 'inline') + ' · 投标截止：' + esc(item.deadline || '公告未明确') + '</p>' + '<p>采购需求：' + esc(item.summary || '公告未明确') + '</p>' + (noticeException(item) ? ' · ' + noticeException(item) : '') + (risk ? '<p class="op-help">' + esc(risk) + '</p>' : '') + '</div>' + choices + '<div class="op-form-grid">' + textarea("备注说明（选填）", "note", "", 'maxlength="600" placeholder="补充参与考虑或放弃原因"') + '</div>', "", function (data) {
      if (!checkActionContext()) return;
      const outcome = data.get("outcome"), current = store.find(id);
      if (!["approved", "rejected"].includes(outcome)) throw new Error("请先选择处理结果。");
      if (outcome === "rejected" && current.review === "rejected") throw new Error("当前已放弃，无需重复提交。");
      if (outcome === "approved" && current.review === "approved" && !current.recheck) throw new Error("当前已确认投标，无需重复提交。");
      const reviewed = store.review(id, outcome, data.get("note"), expected);
      const message = reviewFeedback(reviewed, reopening || reconfirming);
      close(false); render(); toast(message);
    }, footer);
    activeAction = { type: "review", id: id, expected: expected, timingKey: timing.key, outcome: "" };
    one("#opModalForm").addEventListener("change", function (event) {
      if (event.target.name !== "outcome" || event.target.disabled || !activeAction || activeAction.id !== id) return;
      activeAction.outcome = event.target.value;
      syncActionTiming();
    });
    syncActionTiming();
    const reviewAction = activeAction;
    window.setTimeout(function () {
      if (activeAction !== reviewAction) return;
      const approve = one("#opReviewApproved"), reject = one("#opReviewRejected");
      const target = approve.disabled ? reject : approve;
      if (!target.disabled) target.focus();
    }, 40);
  }

  function transferModal(id) {
    store.refresh();
    const item = store.find(id);
    if (!item) { toast("机会记录已变化，请返回机会列表查看。", "warning"); return; }
    if (item.projectId) { location.href = projectUrl(item.projectId); return; }
    if (item.review !== "approved" || item.recheck) { reviewModal(id); return; }
    if (store.status(item).blocked) { toast(store.status(item).text + "，暂不能转入投标项目。", "warning"); return; }
    const checks = store.participationChecks(item);
    const expected = store.actionContext(id);
    ui.files = store.copy(item.files);
    modal("转入投标项目", "确认项目负责人及主招标文件，创建后进入现有招标文件解析流程。", '<div class="op-modal-summary"><strong>' + esc(item.name) + '</strong><br/>' + esc(item.purchaser + " · " + item.package) + " · " + moneyMarkup(item.amount, "inline") + '<br/>投标截止：' + esc(item.deadline) + '</div><div class="op-form-grid"><label class="op-field wide"><span>项目负责人 *</span><select name="owner" required>' + ["李明远", "周晓雯", "王子谦", "陈思远", "赵嘉怡"].map(function (name) { return option(name, name); }).join("") + '</select></label><label class="op-field wide"><span>补传主文件及附件</span><input type="file" id="opTransferUpload" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"/><small>主招标文件须为 PDF / Word。</small></label><div class="wide" id="opTransferFiles"></div><p class="op-help wide" id="opTransferFileFeedback" aria-live="polite" hidden></p>' + (checks.length ? '<div class="op-assessment op-warning wide">' + checks.map(esc).join("；") + '。</div>' : '') + '<p class="op-help wide">公告信息、确认记录和初评分将与项目关联；正式文件解析后重新进行资格及响应研判。</p></div>', "确认转入投标项目", function (data) {
      if (!checkActionContext()) return;
      const files = ui.files.filter(function (file) { return file.selected !== false; });
      const project = store.transfer(id, data.get("owner"), files, expected);
      store.updateProject(project.id, { sourceReturnUrl: isDetail ? "opportunity-detail.html" + location.search : detailUrl(id) });
      close(false); location.href = "project-files.html?id=" + encodeURIComponent(project.id);
    });
    activeAction = { type: "transfer", id: id, expected: expected, timingKey: store.status(item).key };
    renderTransferFiles();
    one("#opTransferUpload").addEventListener("change", function (event) {
      const duplicates = [], unsupported = []; let added = 0;
      Array.from(event.target.files).forEach(function (file) {
        if (!/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(file.name)) { unsupported.push(file.name); return; }
        if (ui.files.some(function (existing) { return existing.name === file.name; })) { duplicates.push(file.name); return; }
        ui.files.push({ name: file.name, size: file.size < 1024 * 1024 ? Math.max(1, Math.round(file.size / 1024)) + " KB" : (file.size / 1024 / 1024).toFixed(2) + " MB", kind: "uploaded", selected: true, main: !ui.files.some(function (f) { return f.main && f.selected !== false; }) && /\.(pdf|doc|docx)$/i.test(file.name) });
        added += 1;
      });
      const feedback = one("#opTransferFileFeedback");
      feedback.hidden = !added && !duplicates.length && !unsupported.length;
      feedback.textContent = [added ? "已添加 " + added + " 份文件。" : "", duplicates.length ? "同名文件已在清单中，未重复添加：" + duplicates.join("、") + "。请核对后选择。" : "", unsupported.length ? "暂不支持以下文件格式：" + unsupported.join("、") + "。" : ""].filter(Boolean).join(" ");
      renderTransferFiles(); event.target.value = "";
    });
    one("#opTransferFiles").addEventListener("change", function (event) {
      const index = Number(event.target.dataset.fileIndex);
      if (event.target.type === "radio") { ui.files.forEach(function (file, i) { file.main = i === index; if (file.main) file.selected = true; }); }
      if (event.target.type === "checkbox") { ui.files[index].selected = event.target.checked; if (!event.target.checked) ui.files[index].main = false; }
      renderTransferFiles();
    });
  }
  function renderTransferFiles() {
    const selected = ui.files.filter(function (file) { return file.selected !== false; });
    const main = selected.find(function (file) { return file.main && /\.(pdf|doc|docx)$/i.test(file.name); });
    const reason = !ui.files.length ? "尚无主招标文件，请补传 PDF / Word 文件。" : !ui.files.some(function (file) { return /\.(pdf|doc|docx)$/i.test(file.name); }) ? "当前清单不含 PDF / Word 主招标文件，请补传。" : "请选择一份 PDF / Word 文件作为主招标文件。";
    const summary = main ? "已选主招标文件：" + main.name + "；附件 " + Math.max(0, selected.length - 1) + " 份。" : reason;
    one("#opTransferFiles").innerHTML = '<div class="op-assessment op-transfer-summary' + (main ? "" : " op-warning") + '" role="status">' + esc(summary) + "</div>" + ui.files.map(function (file, index) { return '<div class="op-file"><input type="checkbox" data-file-index="' + index + '" aria-label="带入' + esc(file.name) + '"' + (file.selected !== false ? " checked" : "") + "/>" + fileIcon(file.name) + '<div><strong>' + esc(file.name) + "</strong><small>" + esc(file.size + " · " + (file.kind === "demo" ? "公开附件" : "本次补传")) + "</small></div>" + (/\.(pdf|doc|docx)$/i.test(file.name) ? '<label class="op-help op-main-file-label"><input type="radio" name="opMainFile" data-file-index="' + index + '"' + (file.main ? " checked" : "") + "/>主招标文件</label>" : "") + "</div>"; }).join("");
    const submit = one('#opModalForm button[type="submit"]');
    submit.disabled = !main || Boolean(activeAction && activeAction.invalid);
    submit.title = activeAction && activeAction.invalid ? "请先查看最新内容" : main ? "确认文件及负责人后转入投标项目" : reason;
    syncActionTiming();
  }
  function sourceLoginFields(source) {
    const access = store.sourceAccess(source);
    return '<section class="op-source-login"><h4>登录配置</h4><div class="op-form-grid"><label class="op-field"><span>访问方式</span><select id="opSourceAccessMode" name="accessMode">' + option("public", "无需登录", source.accessMode !== "login") + option("login", "账号密码登录", source.accessMode === "login") + '</select></label><div class="op-form-grid wide" id="opSourceCredentials">' + field("登录账号", "loginAccount", source.loginAccount || "", "text", 'id="opSourceLoginAccount" maxlength="80" placeholder="supplier_ops_01" autocomplete="off"') + '<div class="op-field"><label for="opSourceLoginPassword">登录密码' + ' <span class="op-help" id="opSourcePasswordStatus">' + (source.passwordSet ? '已设置' : '') + '</span>' + '</label><div class="op-source-password"><input id="opSourceLoginPassword" name="loginPassword" type="password" maxlength="128" autocomplete="new-password" placeholder="' + (source.passwordSet ? '留空保留原密码' : '填写登录密码') + '"/><button type="button" id="opSourcePasswordToggle" class="text-btn compact-btn" aria-controls="opSourceLoginPassword" aria-pressed="false"><span class="btn-icon">' + svg("eye") + '</span><span id="opSourcePasswordToggleText">显示</span></button></div></div></div><p class="op-help wide" id="opSourceLoginHelp">仅支持账号密码登录；需要扫码、短信、验证码或数字证书的网站暂不支持自动登录。</p><div class="op-field wide"><span>登录状态</span><div><span class="status-tag ' + access.tone + '" id="opSourceLoginState">' + esc(access.label) + '</span></div></div></div></section>';
  }
  function bindSourceLoginForm(source, id) {
    const mode = one("#opSourceAccessMode"), account = one("#opSourceLoginAccount"), password = one("#opSourceLoginPassword"), entry = one("#opRuleField-source-entry");
    function update() {
      const required = mode.value === "login", credentials = required;
      one("#opSourceCredentials").hidden = !credentials;
      account.disabled = !credentials; password.disabled = !credentials;
      let sameOrigin = false;
      try { sameOrigin = new URL(entry.value).origin === new URL(source.collectionUrl).origin; } catch (error) { /* The normal URL field validation handles an unfinished address. */ }
      const canReuse = source.passwordSet && account.value.trim() === (source.loginAccount || "") && sameOrigin;
      account.required = credentials; password.required = credentials && !canReuse;
      password.placeholder = canReuse ? "留空保留原密码" : "填写登录密码";
      one("#opSourcePasswordStatus").textContent = canReuse ? "已设置" : "";
      one("#opSourcePasswordToggle").disabled = !credentials;
      one("#opSourceLoginHelp").hidden = !required;
      const unchanged = entry.value.trim() === (source.collectionUrl || "") && mode.value === (source.accessMode || "public") && (!credentials || account.value.trim() === (source.loginAccount || "") && !password.value);
      const access = required ? unchanged ? store.sourceAccess(source) : { label: "待登录", tone: "orange" } : { label: "无需登录", tone: "gray" };
      one("#opSourceLoginState").textContent = access.label; one("#opSourceLoginState").className = "status-tag " + access.tone;
      one("#opSourceSaveText").textContent = id ? "保存" : "保存并检查";
    }
    mode.addEventListener("change", update); account.addEventListener("input", update); password.addEventListener("input", update); entry.addEventListener("input", update);
    one("#opSourcePasswordToggle").addEventListener("click", function () {
      const show = password.type === "password"; password.type = show ? "text" : "password";
      one("#opSourcePasswordToggleText").textContent = show ? "隐藏" : "显示";
      one("#opSourcePasswordToggle").setAttribute("aria-pressed", String(show));
    });
    update();
  }
  function sourceModal(id) {
    if (!isAdmin || ui.busy) return;
    const source = store.get().sources.find(function (entry) { return entry.id === id; }) || { name: "", type: "政府采购", collectionUrl: "", column: "" };
    const fields = sourceFormFields.map(function (spec) {
      const caption = ruleFieldCaption(spec, true), value = source[spec.name] || "";
      const input = spec.type === "select" ? '<select id="opRuleField-' + spec.key + '" name="' + spec.name + '">' + Array.from(new Set(["政府采购", "公共资源交易", "企业采购", "代理机构", "标讯聚合", value].filter(Boolean))).map(function (type) { return option(type, type, type === value); }).join("") + '</select>' : '<input id="opRuleField-' + spec.key + '" name="' + spec.name + '" type="' + spec.type + '" value="' + esc(value) + '"' + (spec.required ? ' required' : '') + (spec.max ? ' maxlength="' + spec.max + '"' : '') + (spec.type === "url" ? ' maxlength="2048" placeholder="https://"' : '') + '/>';
      return '<div class="op-field' + (spec.wide ? ' wide' : '') + '">' + caption + input + '</div>';
    }).join("");
    modal(id ? "编辑来源网站" : "新增来源网站", "填写实际采集入口，栏目名称按网站原有名称填写。", '<div class="op-form-grid">' + fields + '</div>' + sourceLoginFields(source), id ? "保存" : "保存并检查", function (data) {
      const result = store.saveSource(Object.fromEntries(data), id);
      if (!id) ui.sourcePage = Math.max(1, Math.ceil(store.get().sources.length / configPageSize));
      close(); render();
      if (result.needsCheck) verifySource(result.source.id);
      else toast("来源信息已保存，原检查结果和采集记录保留。");
    }, button("取消", "close", "", "ghost-btn", "close") + '<button type="submit" class="primary-btn"><span class="btn-icon">' + svg("check") + '</span><span id="opSourceSaveText">保存</span></button>');
    bindSourceLoginForm(source, id);
  }
  function collect(sourceId, scheduled) {
    if (ui.busy) return;
    const source = sourceId ? store.get().sources.find(function (entry) { return entry.id === sourceId; }) : null;
    const blocked = sourceId ? sourceCollectionBlock(source) : store.get().sources.some(function (entry) { return !sourceCollectionBlock(entry); }) ? "" : "没有可采集来源，请检查来源启用、登录状态及检查结果。";
    if (blocked) { toast(blocked, "warning"); return; }
    const sources = store.get().sources.filter(function (entry) { return !sourceId || entry.id === sourceId; });
    const available = sources.filter(function (entry) { return !sourceCollectionBlock(entry); }).length;
    const execution = sources.filter(function (entry) { return !sourceCollectionBlock(entry); }).map(function (entry) { return { id: entry.id, config: store.sourceConfig(entry) }; });
    const fields = source ? [["来源", source.name], ["采集入口", source.collectionUrl]] : [["采集范围", sources.length + " 个来源 · " + available + " 个可采集"], ["来源", sources.map(function (entry) { return entry.name; }).join("、")]];
    const labels = ["读取公告", "筛选与初评", "保存结果"];
    ui.busy = true; ui.collectingSource = sourceId || "all";
    if (!isDetail && ui.tab === "sources") renderSources();
    const task = taskOpen(scheduled ? "计划采集" : source ? "立即采集" : "全部采集", taskContext(fields), labels);
    let step = 0;
    function tick() {
      taskPaint(task, taskProgress(labels, step));
      step += 1;
      if (step < labels.length) ui.timer = window.setTimeout(tick, 650);
      else ui.timer = window.setTimeout(function () {
        let result;
        try { result = store.collect(sourceId, scheduled ? [store.get().rules[0].id] : null, execution); }
        catch (error) {
          ui.busy = false; ui.collectingSource = ""; render();
          if (taskIsOpen(task)) close();
          toast("采集未完成：" + error.message, "warning");
          return;
        }
        ui.busy = false; ui.collectingSource = ""; render();
        if (taskIsOpen(task)) close();
        const incomplete = result.rows.some(function (row) { return sourceRunState(row) !== "completed"; });
        const skipped = (result.skippedSources || []).map(function (entry) { return entry.name + "（" + entry.reason + "）"; });
        toast((incomplete ? "采集已结束，部分网站采集失败，请在采集记录查看原因。" : "采集完成。") + (skipped.length ? "已跳过：" + skipped.join("、") + "。" : ""), incomplete || skipped.length ? "warning" : "success");
      }, 650);
    }
    tick();
  }
  function fileModal(id) {
    const split = id.lastIndexOf(":"), item = store.find(id.slice(0, split)), file = item && item.files[Number(id.slice(split + 1))];
    if (!file) return;
    const format = window.BiddingFileIcons ? window.BiddingFileIcons.meta(file.name).label : file.name.split(".").pop().toUpperCase() + " 文件";
    let content = '';
    if (Array.isArray(file.sections) && file.sections.length) content = file.sections.map(function (section) { return '<h3>' + esc(section.title) + '</h3><p>' + esc(section.text) + '</p>'; }).join("");
    else if (typeof file.previewText === "string" || typeof file.content === "string") content = '<p class="op-preview-text">' + esc(file.previewText || file.content) + '</p>';
    else if (file.main) content = '<h3>关联采购信息</h3><p>' + esc(item.name + " · " + item.number + " · " + item.package) + '</p><p>' + esc(item.summary) + '</p><p>资格要求：' + esc(item.qualification) + '</p><p>本包预算：' + money(item.amount) + '；投标截止：' + esc(item.deadline || "待核实") + '</p><p class="op-help">以上为关联公告信息，完整文件内容请查看来源附件。</p>';
    else content = '<p class="op-help">该附件暂无可在线预览的正文，请查看来源文件。</p>';
    modal("文件预览", file.name, '<div class="op-preview-file-head">' + fileIcon(file.name) + '<div><strong>' + esc(file.name) + '</strong><small>' + esc(format + " · " + file.size + " · " + (file.main ? "主招标文件" : "附件")) + '</small></div></div><article class="op-notice">' + content + '</article>' + (file.url || file.sourceUrl ? '<p>' + external(file.url || file.sourceUrl, "查看来源文件") + '</p>' : ''), "", null, taskCloseButton(), "op-evidence-modal");
  }
  function evaluateAgain(id) {
    if (ui.busy) return;
    const item = store.find(id);
    if (!item) { toast("机会记录已变化，请返回机会列表查看。", "warning"); return; }
    if (item.projectId) { toast("该机会已转项目，请查看关联项目。", "warning"); return; }
    modal("重新初评", item.name, '<p>依据当前公告 V' + item.revision + ' 和规则 V' + store.get().rules[0].revision + ' 保存新的初评结果，原结果及处理记录保留。</p>' + (item.review === "approved" ? '<p class="op-help">投标判断依据发生实质变化时才需重新确认，无变化则保留原确认结果。</p>' : ''), "确认重新初评", function () {
      store.reassess(id); const current = store.find(id); close(); render(); toast(current.review === "approved" ? current.recheck ? "初评结果已更新，请重新确认是否投标。" : "初评结果已更新，原确认结果保留。" : "初评结果已更新。");
    });
  }
  function verifySource(id) {
    if (!isAdmin || ui.busy) return;
    const source = store.get().sources.find(function (entry) { return entry.id === id; });
    if (!source) { toast("来源网站不存在，请刷新后查看。", "warning"); return; }
    const expected = store.sourceConfig(source), labels = ["检查入口地址", "检查登录状态", "识别公告列表", "识别公告正文", "检查附件权限"];
    ui.busy = true; ui.checkingSource = id; render();
    const task = taskOpen("检查来源", taskContext([["来源", source.name], ["采集入口", source.collectionUrl]]), labels, "op-check-modal");
    let step = 0;
    function finish() {
      let checked;
      try { checked = store.checkSource(id, expected); }
      catch (error) {
        ui.busy = false; ui.checkingSource = ""; render();
        if (!taskPaint(task, taskOutcome("检查未完成", "red", error.message), taskCloseButton())) toast("检查未完成：" + error.message, "warning");
        return;
      }
      ui.busy = false; ui.checkingSource = ""; render();
      task.context = taskContext([["来源", checked.name], ["采集入口", checked.collectionUrl]]);
      const footer = checked.checkResult.ok ? taskCloseButton() : button("关闭", "close", "", "ghost-btn", "close") + button("编辑来源", "source", id, "primary-btn", "edit");
      if (!taskPaint(task, checkContent(checked), footer)) toast(checked.name + (checked.checkResult.ok ? "：来源检查通过。" : "：来源检查未通过。"), checked.checkResult.ok ? "success" : "warning");
    }
    function tick() {
      taskPaint(task, taskProgress(labels, step));
      step += 1;
      window.setTimeout(step < labels.length ? tick : finish, 350);
    }
    tick();
  }
  function toggle(kind, id) {
    if (!isAdmin || ui.busy) return;
    const list = "sources";
    const target = store.get()[list].find(function (entry) { return entry.id === id; });
    if (!target) return;
    modal((target.enabled ? "停用" : "启用") + "来源网站", target.name, '<p>已有机会和确认记录保留，后续采集按新的启停状态执行。</p>', "确认", function () { save(function (next) { const entry = next[list].find(function (item) { return item.id === id; }); entry.enabled = !entry.enabled; }); close(); render(); toast("配置已更新。"); });
  }
  function onAction(action, id) {
    if (action === "close") { close(); return; }
    if (action === "reloadAction") {
      const previous = activeAction; if (!previous) return;
      const note = one('textarea[name="note"]'); const draft = note ? note.value : "";
      close(false); syncOpportunityView();
      if (previous.type === "transfer") transferModal(previous.id); else reviewModal(previous.id);
      const latestNote = one('textarea[name="note"]'); if (latestNote) latestNote.value = draft;
      return;
    }
    if (action === "query") { query(); return; }
    if (action === "reset") { ui.filters = {}; ui.metric = ""; ui.page = 1; render(); return; }
    if (action === "metric") {
      const previous = ui.metric;
      if (ui.tab === "list" && one("#opFilters")) ui.filters = Object.fromEntries(new FormData(one("#opFilters")));
      ui.metric = ui.metric === id ? "" : id;
      ui.filters = ui.filters || {};
      if (["pending", "approved", "transferred"].includes(ui.metric)) ui.filters.review = ui.metric;
      else if (["pending", "approved", "transferred"].includes(previous) && ui.filters.review === previous) ui.filters.review = "";
      ui.tab = "list"; ui.page = 1; render(); return;
    }
    if (action === "page") { ui.page = Number(id); renderRows(); return; }
    if (action === "sourcePage") { ui.sourcePage = Number(id); renderSources(); return; }
    if (action === "runPage") { ui.runPage = Number(id); renderRuns(); return; }
    if (action === "runQuery") { queryRuns(); return; }
    if (action === "runReset") { ui.runFilters = { source: "", result: "", from: "", to: "" }; ui.runPage = 1; renderRuns(); return; }
    if (action === "review") reviewModal(id);
    if (action === "transfer") transferModal(id);
    if (action === "rule") ruleModal();
    if (action === "source") sourceModal(id);
    if (action === "verify") verifySource(id);
    if (action === "toggleSource") toggle("source", id);
    if (action === "collect" && isAdmin) collect();
    if (action === "collectSource" && isAdmin) collect(id);
    if (action === "file") fileModal(id);
    if (action === "basis") basisModal(id);
    if (action === "evaluate") evaluateAgain(id);
  }
  function init() {
    bindRuleHelp();
    render();
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-close-layer]") || event.target.id === "prototypeBackdrop" && activeAction) { close(); return; }
      const detail = event.target.closest("[data-op-detail-link]");
      if (detail && !isDetail) { detail.href = detailUrl(detail.dataset.opDetailLink); syncListPosition(); }
      const action = event.target.closest("[data-op-action]");
      if (action && !action.disabled) { event.preventDefault(); guard(function () { onAction(action.dataset.opAction, action.dataset.id); }); return; }
      const tab = event.target.closest("[data-op-tab]");
      if (tab && !ui.busy) {
        ui.tab = tab.dataset.opTab; const params = new URLSearchParams(location.search); params.set("tab", ui.tab); replacePosition(params); render();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && activeAction) { close(); return; }
      const layer = one("#opModal.open");
      if (!layer || event.key !== "Tab") return;
      const nodes = Array.from(layer.querySelectorAll("button:not(:disabled), input:not(:disabled), select, textarea, a[href]")).filter(function (node) { return !node.closest("[hidden]"); });
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    window.setInterval(function () {
      if (document.hidden || ui.busy || one(".prototype-modal.open")) return;
      if (store.due()) collect("", true);
    }, 15000);
    lastTimingSignature = opportunityTimingSignature();
    window.setInterval(tickOpportunityTiming, 1000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) tickOpportunityTiming(); });
    window.addEventListener("resize", function () { const form = one("#opModalForm"); if (form) resizeRuleFields(form); });
    window.addEventListener("storage", function (event) { if (event.key === store.key) { guard(function () { store.refresh(); if (activeAction && one("#opModal.open")) checkActionContext(); else if (!one(".prototype-modal.open") && !ui.busy) render(); }); toast(activeAction && activeAction.invalid ? "机会内容已变化，请查看弹窗中的提示。" : "其他页面更新了机会数据，已同步最新记录。"); } });
    window.addEventListener("pageshow", function (event) { if (event.persisted) guard(function () { store.refresh(); render(); }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
