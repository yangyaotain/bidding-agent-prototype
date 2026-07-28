(function () {
  "use strict";

  const data = window.KnowledgePrototypeData || { categories: [], peopleRecords: [], peopleProfiles: [] };
  const currentUserName = (window.AppCurrentUser && window.AppCurrentUser.name) || "李明远";
  let currentItem = null;
  let currentPerson = null;
  let pendingArchiveItem = null;
  let pendingDeleteItem = null;
  let currentPresetCategory = "";
  let assetBatchFiles = [];
  let assetUploadActive = false;
  let assetUploadTimer = null;
  let personImportMode = "people";
  let personImportFiles = [];
  let personImportStage = "upload";
  let personImportTimer = null;

  const icons = {
    close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M5 4h12l2 2v14H5zM8 4v6h8V4M8 16h8"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 14v6h14v-6"/></svg>',
    scan: '<svg viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10M9 9h6M9 15h6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
    archive: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M9 13h6"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>',
    warning: '<svg viewBox="0 0 24 24"><path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M17 6a3 3 0 0 1 0 6M17 15c2.5.5 4 2.4 4 5"/></svg>',
    certificate: '<svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V7l-8-4z"/><path d="m9 12 2 2 4-5"/></svg>',
    preview: '<svg viewBox="0 0 24 24"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>'
  };

  const typeOptionsByCategory = {
    company: ["主体资格", "企业介绍", "银行账户", "财务资料", "信用税务"],
    certificates: ["体系认证", "行业资质", "企业认定"],
    cases: ["信息系统运维", "数字化运营", "系统集成", "云平台运维", "软件开发", "安全服务"],
    solutions: ["产品方案", "技术方案", "运维服务", "安全整改", "容灾备份", "数据迁移", "安全保障", "应急响应"],
    business: ["售后承诺", "保密承诺", "廉洁承诺", "履约承诺", "数据合规"],
    templates: ["偏离表", "人员模板", "承诺函", "封面目录", "投标函", "报价表", "核验清单"],
    charts: ["架构图", "流程图", "拓扑图", "组织架构图"],
    history: ["运维服务", "云平台运维", "数字化平台", "系统集成"]
  };

  const categoryLabels = {
    company: "企业基础资料", certificates: "企业资质证照", cases: "业绩案例", solutions: "产品与技术方案",
    business: "商务素材", templates: "模板与格式", charts: "图表素材", history: "历史标书"
  };

  const validityWarningDays = 60;

  function parseValidityDate(value) {
    if (!value) return null;
    const date = new Date(String(value).slice(0, 10) + "T00:00:00");
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function validityInfo(item) {
    if (!item) return { applicable: false, warning: false, key: "none", label: "-", tone: "gray", dateText: "" };
    let inferredMode = item.validityMode;
    if (inferredMode !== "fixed" && inferredMode !== "longterm") inferredMode = item.validityDueDate || item.endDate ? "fixed" : "longterm";
    if (inferredMode === "longterm") {
      return { applicable: true, warning: false, key: "longterm", label: "长期有效", tone: "green", dateText: item.validityStartDate || item.issueDate ? "自 " + (item.validityStartDate || item.issueDate) + " 起" : "无固定截止日期" };
    }
    const dueValue = item.validityDueDate || item.endDate || "";
    const dueDate = parseValidityDate(dueValue);
    if (!dueDate) return { applicable: true, warning: true, key: "missing", label: "日期待补充", tone: "orange", dateText: "请补充到期日期" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) {
      return { applicable: true, warning: true, key: "expired", label: "已过期", tone: "red", dateText: dueValue + " · 已超过 " + Math.abs(diffDays) + " 天" };
    }
    if (diffDays <= validityWarningDays) {
      const remaining = diffDays === 0 ? "今日" : (diffDays + 1) + " 天内";
      return { applicable: true, warning: true, key: "expiring", label: "临期", tone: "orange", dateText: dueValue + " · " + remaining + "到期" };
    }
    return { applicable: true, warning: false, key: "valid", label: "有效", tone: "green", dateText: "有效期至 " + dueValue };
  }

  function fileIconMarkup(fileName, extraClass) {
    if (window.BiddingFileIcons) return window.BiddingFileIcons.markup(fileName, extraClass || "");
    const mark = ((fileName || "FILE").split(".").pop() || "FILE").toUpperCase().slice(0, 5);
    return '<span class="file-type-icon type-generic' + (extraClass ? ' ' + extraClass : '') + '" role="img" aria-label="' + mark + ' 文件"><span class="file-format-mark">' + mark + '</span></span>';
  }

  function fileFormatLabel(fileName) {
    if (window.BiddingFileIcons) return window.BiddingFileIcons.meta(fileName).label;
    const mark = ((fileName || "FILE").split(".").pop() || "FILE").toUpperCase().slice(0, 5);
    return mark + " 文件";
  }

  function personRecordLabel(item) {
    return { certificate: "证书与资质", experience: "项目经历", material: "证明材料" }[item && item.recordType] || "人员资料";
  }

  function detailCategoryLabel(item) {
    if (item && item.category === "people-record") return item.categoryLabel || personRecordLabel(item);
    return (item && (item.categoryLabel || categoryLabels[item.category])) || "知识资料";
  }

  function personRecordDetailFields(item) {
    const fields = [];
    if (item.recordType === "certificate") {
      fields.push(["证书编号", item.number], ["发证机构", item.issuer], ["取得日期", item.issueDate], ["到期日期", item.endDate || "长期有效"]);
    } else if (item.recordType === "experience") {
      fields.push(["项目名称", item.project], ["承担角色", item.role], ["参与时间", item.period], ["主要工作", item.content]);
    } else if (item.recordType === "material") {
      fields.push(["材料类型", item.type], ["版本或覆盖期间", item.period], ["解析状态", item.status || "已解析"]);
    }
    return fields.filter(function (field) { return field[1]; });
  }

  function sourceFileTarget(item) {
    if (item && item.sourceFile && typeof item.sourceFile.size === "number") return { href: URL.createObjectURL(item.sourceFile), objectUrl: true };
    if (item && (item.sourceFileUrl || item.downloadUrl)) return { href: item.sourceFileUrl || item.downloadUrl, objectUrl: false };
    return null;
  }

  function openSourcePreview(item) {
    if (!item || !item.file) {
      window.showToast("当前资料暂未关联来源文件", "warning");
      return;
    }
    const target = sourceFileTarget(item);
    if (!target) {
      window.showToast("当前资料暂未配置来源文件", "warning");
      return;
    }
    const format = window.BiddingFileIcons.meta(item.file);
    let profile = window.BiddingFilePreview.profileFromName(item.file);
    if (format.type === "word" || format.type === "pdf") profile = "bid-technical";
    window.BiddingFilePreview.open({
      profile: profile,
      name: item.file,
      size: item.sourceFile && typeof item.sourceFile.size === "number" ? formatFileSize(item.sourceFile.size) : "—",
      context: "知识库来源文件",
      sourceUrl: target.href
    });
    if (target.objectUrl) window.setTimeout(function () { URL.revokeObjectURL(target.href); }, 300000);
  }

  function downloadSourceFile(item) {
    if (!item || !item.file) {
      window.showToast("当前资料暂未关联来源文件", "warning");
      return;
    }
    const target = sourceFileTarget(item);
    if (!target) {
      window.showToast("当前资料暂未配置来源文件", "warning");
      return;
    }
    const link = document.createElement("a");
    link.href = target.href;
    link.download = item.file;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (target.objectUrl) window.setTimeout(function () { URL.revokeObjectURL(target.href); }, 30000);
    window.showToast("已开始浏览器下载：“" + item.file + "”", "success");
  }

  window.KnowledgeValidity = {
    warningDays: validityWarningDays,
    info: validityInfo
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function getActiveCategory() {
    const section = document.body.getAttribute("data-knowledge-section") || "all";
    if (section !== "all") return section;
    return new URLSearchParams(window.location.search).get("category") || "all";
  }

  function renderSidebar() {
    const root = document.getElementById("knowledgeSidebar");
    if (!root) return;
    const active = getActiveCategory();
    const categoryMap = (data.categories || []).reduce(function (result, item) {
      result[item.key] = item;
      return result;
    }, {});
    function linkHtml(item) {
      if (!item) return "";
      const warning = item.validityAlerts ? '<small class="knowledge-category-alert' + (item.validityTone === "red" ? ' red' : '') + '">' + escapeHtml(item.validityAlertLabel || item.validityAlerts + " 项预警") + '</small>' : '';
      return '<a class="knowledge-category-link' + (item.key === active ? ' active' : '') + '" href="' + item.href + '"' + (item.key === active ? ' aria-current="page"' : '') + '><span class="knowledge-category-name">' + item.label + '</span><span class="knowledge-category-meta">' + warning + '<b>' + item.count + '</b></span></a>';
    }
    const groups = (data.categoryGroups || []).map(function (group) {
      const links = (group.items || []).map(function (key) { return linkHtml(categoryMap[key]); }).join("");
      return '<section class="knowledge-category-group">' + (group.label ? '<strong class="knowledge-category-group-title">' + group.label + '</strong>' : '') + '<div class="knowledge-category-group-links">' + links + '</div></section>';
    }).join("");
    root.innerHTML = [
      '<div class="knowledge-sidebar-head"><strong>知识库导航</strong><span>按资料分类快速查找与上传</span></div>',
      '<nav class="knowledge-category-list" aria-label="知识库分类">' + groups + '</nav>',
      '<div class="knowledge-sidebar-note"><strong>资料维护说明</strong><span>上传后由 AI 自动解析名称、标签、摘要及相关属性；普通资料无需逐项填写复杂表单。</span></div>'
    ].join("");
  }

  function recordStatus(item) {
    if (item.lifecycleState === "archived") return { key: "archived", label: "已归档", tone: "gray" };
    if (item.parseStatus === "processing") return { key: "processing", label: "解析中", tone: "blue" };
    return { key: "stored", label: "已入库", tone: "green" };
  }

  function fileBaseName(fileName) {
    return (fileName || "新上传资料").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  }

  function formatFileSize(size) {
    if (!size) return "0 KB";
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + " KB";
    return (size / 1024 / 1024).toFixed(1) + " MB";
  }

  function guessType(category, fileName) {
    const name = (fileName || "").toLowerCase();
    const rules = {
      company: [[/营业执照|法人|登记|主体/, "主体资格"], [/银行|开户|账户/, "银行账户"], [/财务|审计|报表/, "财务资料"], [/信用|税务|纳税|社保/, "信用税务"]],
      certificates: [[/行业|许可|资质/, "行业资质"], [/高新|创新|企业认定/, "企业认定"]],
      cases: [[/园区|运营/, "数字化运营"], [/集成|指挥/, "系统集成"], [/云/, "云平台运维"], [/开发|软件/, "软件开发"], [/安全/, "安全服务"]],
      solutions: [[/漏洞|整改/, "安全整改"], [/容灾|备份/, "容灾备份"], [/迁移/, "数据迁移"], [/安全保障/, "安全保障"], [/应急|故障/, "应急响应"], [/产品/, "产品方案"], [/技术|方案/, "技术方案"]],
      business: [[/保密/, "保密承诺"], [/廉洁|贿赂/, "廉洁承诺"], [/履约|交付/, "履约承诺"], [/数据|合规/, "数据合规"]],
      templates: [[/人员|简历/, "人员模板"], [/承诺函/, "承诺函"], [/封面|目录/, "封面目录"], [/投标函/, "投标函"], [/报价/, "报价表"], [/核验|清单/, "核验清单"]],
      charts: [[/拓扑/, "拓扑图"], [/流程/, "流程图"], [/组织/, "组织架构图"]],
      history: [[/云/, "云平台运维"], [/数字化|园区|平台/, "数字化平台"], [/集成|指挥/, "系统集成"]]
    };
    const matched = (rules[category] || []).find(function (rule) { return rule[0].test(name); });
    return matched ? matched[1] : (typeOptionsByCategory[category] || ["其他资料"])[0];
  }

  function defaultSummary(category, type) {
    const summaries = {
      company: "企业主体与基础证明信息",
      certificates: "证照名称、认证范围与有效信息",
      cases: "项目内容、交付成果与证明材料",
      solutions: "方案主题、关键能力与实施要点",
      business: "商务条款、承诺内容与使用提示",
      templates: "模板结构、填写内容与格式要求",
      charts: "图表主题、核心结构与源文件信息",
      history: "历史项目、标书组成与投标信息"
    };
    return summaries[category] || type || "资料核心内容与使用说明";
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function addYear(date) {
    return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
  }

  function buildAiExtract(category, type, fileName, item) {
    const fileType = ((fileName || (item && item.file) || "文件").split(".").pop() || "文件").toUpperCase();
    const now = new Date();
    const base = {
      company: [["识别主体", (item && item.name) || fileBaseName(fileName)], ["资料类型", type], ["来源格式", fileType]],
      certificates: [["证书编号", (item && item.number) || "AI-CERT-2026-0715"], ["发证机构", (item && item.issuer) || "已从证书原文识别"], ["有效期限", (item && (item.endDate ? item.startDate + " 至 " + item.endDate : item.dateRange)) || formatDate(now) + " 至 " + formatDate(addYear(now))]],
      cases: [["项目名称", (item && item.name) || fileBaseName(fileName)], ["项目类型", type], ["证明文件", (item && item.file) || fileName]],
      solutions: [["方案主题", (item && item.name) || fileBaseName(fileName)], ["方案领域", type], ["识别章节", "总体说明、实施方法、服务保障"]],
      business: [["承诺主题", (item && item.name) || fileBaseName(fileName)], ["商务类型", type], ["关键内容", "已识别责任边界与量化表述"]],
      templates: [["模板类型", type], ["文件格式", fileType], ["结构识别", "标题、表格和填写区域已提取"]],
      charts: [["图表类型", type], ["源文件格式", fileType], ["图表结构", "主题、节点和关系已识别"]],
      history: [["项目名称", (item && item.name) || fileBaseName(fileName)], ["项目类型", type], ["文件组成", (item && item.summary) || "技术标、商务标和交付附件"]]
    };
    const fields = base[category] || [["文件格式", fileType], ["识别类型", type]];
    const itemValidity = item ? validityInfo(item) : null;
    if (itemValidity && itemValidity.applicable && category !== "certificates") fields.push(["有效状态", itemValidity.label + " · " + itemValidity.dateText]);
    return fields;
  }

  function aiExtractHtml(fields) {
    return '<div class="knowledge-ai-extract-head"><span>' + icons.scan + '</span><div><strong>AI 解析信息</strong><small>根据原始文件自动提取，用于搜索、匹配和标书引用</small></div></div><div class="knowledge-ai-extract-grid">' + fields.map(function (field) { return '<div><span>' + escapeHtml(field[0]) + '</span><strong>' + escapeHtml(field[1]) + '</strong></div>'; }).join("") + '</div>';
  }

  function categoryOptions(selected) {
    return Object.keys(categoryLabels).map(function (key) { return '<option value="' + key + '"' + (key === selected ? ' selected' : '') + '>' + categoryLabels[key] + '</option>'; }).join("");
  }

  function renderTypeSuggestions(category) {
    const root = document.getElementById("assetTypeSuggestions");
    if (!root) return;
    root.innerHTML = (typeOptionsByCategory[category] || []).map(function (type) { return '<option value="' + type + '"></option>'; }).join("");
  }

  function categorySupportsValidity(category) {
    return Object.prototype.hasOwnProperty.call(categoryLabels, category);
  }

  function addDays(date, days) {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }

  function suggestedValidity(category, fileName, manualRequired) {
    if (!categorySupportsValidity(category)) return { mode: "longterm", startDate: "", dueDate: "" };
    if (manualRequired) return { mode: category === "certificates" ? "fixed" : "longterm", startDate: "", dueDate: "" };
    const now = new Date();
    const name = String(fileName || "");
    if (category === "certificates") return { mode: "fixed", startDate: formatDate(now), dueDate: formatDate(addYear(now)) };
    if (/营业执照|开户|账户/.test(name)) return { mode: "longterm", startDate: formatDate(now), dueDate: "" };
    if (/信用|纳税|税收|社保|社会保障|财务|审计/.test(name)) return { mode: "fixed", startDate: formatDate(now), dueDate: formatDate(addDays(now, 90)) };
    return { mode: "longterm", startDate: "", dueDate: "" };
  }

  function syncAssetValidityFields(category, values) {
    const root = document.getElementById("assetValidityFields");
    const supported = categorySupportsValidity(category);
    root.classList.toggle("hidden", !supported);
    if (!supported) {
      document.getElementById("assetValidityMode").value = "longterm";
      document.getElementById("assetValidityStart").value = "";
      document.getElementById("assetValidityDue").value = "";
      return;
    }
    const value = values || suggestedValidity(category, document.getElementById("assetFileLabel").textContent, false);
    document.getElementById("assetValidityMode").value = value.mode === "fixed" ? "fixed" : "longterm";
    document.getElementById("assetValidityStart").value = value.startDate || "";
    document.getElementById("assetValidityDue").value = value.dueDate || "";
    syncAssetValidityMode();
  }

  function syncAssetValidityMode() {
    const mode = document.getElementById("assetValidityMode").value;
    document.getElementById("assetValidityStartField").classList.remove("hidden");
    document.getElementById("assetValidityDueField").classList.toggle("hidden", mode === "longterm");
  }

  function injectSharedLayers() {
    if (document.getElementById("knowledgeBackdrop")) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = [
      '<div class="knowledge-backdrop" id="knowledgeBackdrop"></div>',
      '<aside class="knowledge-drawer" id="knowledgeDetailDrawer" aria-hidden="true" aria-label="知识资料详情">',
      '<header class="knowledge-layer-head"><div><span class="knowledge-layer-eyebrow" id="detailCategory">知识资料</span><h3 id="detailTitle">资料详情</h3><p id="detailCode">资料编号</p></div><button class="knowledge-layer-close" type="button" data-close-knowledge-layer title="关闭" aria-label="关闭详情">' + icons.close + '</button></header>',
      '<div class="knowledge-layer-body">',
      '<div class="knowledge-detail-summary"><div><span class="status-tag green" id="detailRecordStatus">已入库</span><span class="status-tag green hidden" id="detailValidityTag">有效</span></div><div class="knowledge-detail-key-summary"><span>AI 摘要</span><strong id="detailSummary">-</strong></div><p id="detailDescription"></p></div>',
      '<section class="knowledge-detail-section"><h4>资料信息</h4><div class="knowledge-detail-grid">',
      '<div><span>资料类型</span><strong id="detailType">-</strong></div><div><span>知识分类</span><strong id="detailClassification">-</strong></div>',
      '<div class="knowledge-detail-source"><span>来源文件</span><div class="knowledge-detail-file" id="detailFile">-</div></div><div><span>最近更新人</span><strong id="detailOwner">-</strong></div>',
      '<div><span>资料状态</span><strong id="detailStatusText">已入库</strong></div><div><span>状态时间</span><strong id="detailStatusTime">-</strong></div>',
      '<div class="hidden" id="detailValidityStatusField"><span>有效状态</span><strong id="detailValidityStatus">-</strong></div><div class="hidden" id="detailValidityDateField"><span>有效期限</span><strong id="detailValidityDate">-</strong></div>',
      '</div></section>',
      '<section class="knowledge-detail-section"><h4>AI 解析信息</h4><div class="knowledge-detail-grid" id="detailAiFields"></div></section>',
      '<section class="knowledge-detail-section" id="detailTagsSection"><h4>资料标签</h4><div class="knowledge-detail-tags" id="detailTags"></div></section>',
      '<section class="knowledge-detail-section"><h4>使用记录</h4><div class="knowledge-detail-grid"><div><span>投标引用</span><strong id="detailReferences">0 次</strong></div><div><span>最近处理</span><strong id="detailUpdatedAt">-</strong></div></div></section>',
      '<section class="knowledge-detail-section"><h4>处理记录</h4><div class="knowledge-timeline"><div class="hidden" id="detailArchiveRecord"><i></i><strong>资料归档</strong><span id="detailArchivedAt">-</span></div><div><i></i><strong>AI 解析资料内容</strong><span id="detailParsedAt">-</span></div><div><i></i><strong>资料上传入库</strong><span>系统 · 保留来源文件</span></div></div></section>',
      '</div>',
      '<footer class="knowledge-layer-footer"><button class="ghost-btn" type="button" data-close-knowledge-layer><span class="btn-icon">' + icons.close + '</span><span>关闭</span></button><button class="primary-btn" id="detailActionBtn" type="button"><span class="btn-icon" id="detailActionIcon">' + icons.edit + '</span><span id="detailActionText">编辑资料</span></button></footer>',
      '</aside>',
      '<section class="knowledge-modal" id="knowledgeAssetModal" aria-hidden="true" aria-label="维护知识资料">',
      '<header class="knowledge-layer-head"><div><h3 id="assetModalTitle">上传知识资料</h3><p id="assetModalSubtitle">支持批量上传，上传完成后系统将在后台异步解析。</p></div><button class="knowledge-layer-close" type="button" data-close-knowledge-layer title="关闭" aria-label="关闭弹窗">' + icons.close + '</button></header>',
      '<div class="knowledge-layer-body">',
      '<div class="knowledge-form-grid" id="assetUploadStage">',
      '<div class="knowledge-form-field full"><label>资料文件 <em>*</em></label><label class="knowledge-upload-zone" for="assetFile" id="assetUploadZone"><span class="knowledge-upload-icon">' + icons.upload + '</span><strong id="assetFileLabel">点击选择多个文件或拖放到这里</strong><span id="assetFileHint">支持 PDF、Word、Excel、PPT、图片和压缩包，单个文件不超过 50 MB</span><input id="assetFile" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.svg,.ofd,.zip,.rar" multiple/></label></div>',
      '<div class="knowledge-batch-status full" id="assetBatchStatus" role="status" aria-live="polite">尚未选择资料文件</div>',
      '<div class="knowledge-batch-file-list full" id="assetBatchFileList"></div>',
      '</div>',
      '<div class="knowledge-form-grid knowledge-parsed-fields hidden" id="assetEditFields">',
      '<div class="knowledge-form-field full"><label for="assetName">资料名称 <em>*</em></label><input class="knowledge-control" id="assetName" type="text" placeholder="请输入清晰、可识别的资料名称"/></div>',
      '<div class="knowledge-form-field"><label for="assetCategory">知识分类 <em>*</em></label><select class="knowledge-control" id="assetCategory">' + categoryOptions("company") + '</select></div>',
      '<div class="knowledge-form-field"><label for="assetType">资料类型 <em>*</em></label><input class="knowledge-control" id="assetType" list="assetTypeSuggestions" type="text" placeholder="由 AI 自动识别，可修改"/></div>',
      '<div class="knowledge-form-field full"><label for="assetTags">资料标签</label><input class="knowledge-control" id="assetTags" type="text" placeholder="AI 自动生成，可使用逗号分隔修改"/></div>',
      '<div class="knowledge-form-field full"><label for="assetSummary">AI 摘要 <em>*</em></label><input class="knowledge-control" id="assetSummary" type="text" maxlength="100" placeholder="由 AI 自动提取资料核心内容"/></div>',
      '<div class="knowledge-form-field full"><label for="assetDescription">资料说明</label><textarea class="knowledge-control knowledge-textarea" id="assetDescription" placeholder="AI 自动生成资料用途说明，可按需修改"></textarea></div>',
      '<div class="knowledge-validity-editor full hidden" id="assetValidityFields"><div class="knowledge-validity-editor-head"><strong>有效期信息</strong><span>由 AI 根据原始文件自动识别，可按实际情况修改</span></div><div class="knowledge-form-grid">',
      '<div class="knowledge-form-field"><label for="assetValidityMode">有效期类型</label><select class="knowledge-control" id="assetValidityMode"><option value="longterm">长期有效</option><option value="fixed">固定有效期</option></select></div>',
      '<div class="knowledge-form-field" id="assetValidityStartField"><label for="assetValidityStart">生效日期</label><input class="knowledge-control" id="assetValidityStart" type="date"/></div>',
      '<div class="knowledge-form-field" id="assetValidityDueField"><label for="assetValidityDue">到期日期</label><input class="knowledge-control" id="assetValidityDue" type="date"/></div>',
      '</div></div>',
      '<div class="knowledge-ai-extract full" id="assetAiExtract"></div>',
      '</div>',
      '<datalist id="assetTypeSuggestions"></datalist>',
      '</div>',
      '<footer class="knowledge-layer-footer"><button class="ghost-btn" type="button" data-close-knowledge-layer><span class="btn-icon">' + icons.close + '</span><span>取消</span></button><button class="primary-btn" id="saveKnowledgeAsset" type="button"><span class="btn-icon" id="saveKnowledgeAssetIcon">' + icons.upload + '</span><span id="saveKnowledgeAssetText">确认上传</span></button></footer>',
      '</section>',
      '<section class="knowledge-modal" id="knowledgePersonModal" aria-hidden="true" aria-label="维护人员主档">',
      '<header class="knowledge-layer-head"><div><h3 id="personModalTitle">新增人员</h3><p>仅维护人员身份和组织信息，证书与资质通过资料导入自动关联。</p></div><button class="knowledge-layer-close" type="button" data-close-knowledge-layer title="关闭" aria-label="关闭弹窗">' + icons.close + '</button></header>',
      '<div class="knowledge-layer-body"><div class="knowledge-form-grid">',
      '<div class="knowledge-form-field full"><label for="personName">姓名 <em>*</em></label><input class="knowledge-control" id="personName" type="text" placeholder="请输入人员姓名"/></div>',
      '<div class="knowledge-form-field"><label for="personDepartment">所属部门 <em>*</em></label><input class="knowledge-control" id="personDepartment" type="text" placeholder="例如：项目交付部"/></div>',
      '<div class="knowledge-form-field"><label for="personPosition">岗位名称 <em>*</em></label><input class="knowledge-control" id="personPosition" type="text" placeholder="例如：高级项目经理"/></div>',
      '</div></div>',
      '<footer class="knowledge-layer-footer"><button class="ghost-btn" type="button" data-close-knowledge-layer><span class="btn-icon">' + icons.close + '</span><span>取消</span></button><button class="primary-btn" id="saveKnowledgePerson" type="button"><span class="btn-icon">' + icons.save + '</span><span>保存人员</span></button></footer>',
      '</section>',
      '<section class="knowledge-modal wide" id="knowledgePersonImportModal" aria-hidden="true" aria-label="批量导入人员资料">',
      '<header class="knowledge-layer-head"><div><h3 id="personImportTitle">导入人员名单</h3><p id="personImportSubtitle">上传人员名单后，系统将识别人员信息并集中确认。</p></div><button class="knowledge-layer-close" type="button" data-close-knowledge-layer title="关闭" aria-label="关闭弹窗">' + icons.close + '</button></header>',
      '<div class="knowledge-layer-body">',
      '<div class="knowledge-import-guide" id="personImportGuide"><span id="personImportGuideIcon">' + icons.people + '</span><div><strong id="personImportGuideTitle">批量建立人员主档</strong><p id="personImportGuideText">支持 Excel 或 CSV 人员名单，AI 将识别姓名、部门和岗位信息。</p></div></div>',
      '<label class="knowledge-upload-zone" for="personImportFile" id="personImportUploadZone"><span class="knowledge-upload-icon">' + icons.upload + '</span><strong id="personImportFileLabel">点击选择人员名单</strong><span id="personImportFileHint">支持 Excel、CSV 文件</span><input id="personImportFile" type="file"/></label>',
      '<div class="knowledge-batch-status" id="personImportStatus" role="status" aria-live="polite">尚未选择文件</div>',
      '<div class="knowledge-batch-file-list" id="personImportFileList"></div>',
      '<div class="knowledge-import-results hidden" id="personImportResults"></div>',
      '</div>',
      '<footer class="knowledge-layer-footer"><button class="ghost-btn" type="button" data-close-knowledge-layer><span class="btn-icon">' + icons.close + '</span><span>取消</span></button><button class="primary-btn" id="confirmPersonImport" type="button" disabled><span class="btn-icon" id="personImportButtonIcon">' + icons.scan + '</span><span id="personImportButtonText">AI 解析并匹配</span></button></footer>',
      '</section>',
      '<section class="knowledge-modal" id="knowledgeArchiveModal" aria-hidden="true" aria-label="归档知识资料">',
      '<header class="knowledge-layer-head"><div><h3 id="archiveModalTitle">归档知识资料</h3><p id="archiveModalSubtitle">归档后资料不再出现在默认列表中。</p></div><button class="knowledge-layer-close" type="button" data-close-knowledge-layer title="关闭" aria-label="关闭弹窗">' + icons.close + '</button></header>',
      '<div class="knowledge-layer-body"><div class="knowledge-warning-block"><span>' + icons.warning + '</span><div><strong id="archiveAssetName">确认归档当前资料？</strong><p id="archiveAssetDescription">归档后资料从在库列表移入“已归档”，仍可查看，并可在归档列表中删除。</p></div></div></div>',
      '<footer class="knowledge-layer-footer"><button class="ghost-btn" type="button" data-close-knowledge-layer><span class="btn-icon">' + icons.close + '</span><span>取消</span></button><button class="primary-btn" id="confirmArchiveAsset" type="button"><span class="btn-icon">' + icons.archive + '</span><span>确认归档</span></button></footer>',
      '</section>',
      '<section class="knowledge-modal" id="knowledgeDeleteModal" aria-hidden="true" aria-label="删除已归档资料">',
      '<header class="knowledge-layer-head"><div><h3 id="deleteModalTitle">删除已归档资料</h3><p id="deleteModalSubtitle">仅已归档资料可以删除。</p></div><button class="knowledge-layer-close" type="button" data-close-knowledge-layer title="关闭" aria-label="关闭弹窗">' + icons.close + '</button></header>',
      '<div class="knowledge-layer-body"><div class="knowledge-warning-block danger"><span>' + icons.warning + '</span><div><strong id="deleteAssetName">确认删除当前资料？</strong><p id="deleteAssetDescription">删除后资料及其解析信息将从知识库移除，此操作不可恢复。</p></div></div></div>',
      '<footer class="knowledge-layer-footer"><button class="ghost-btn" type="button" data-close-knowledge-layer><span class="btn-icon">' + icons.close + '</span><span>取消</span></button><button class="danger-btn" id="confirmDeleteAsset" type="button"><span class="btn-icon">' + icons.trash + '</span><span>确认删除</span></button></footer>',
      '</section>'
    ].join("");
    document.body.appendChild(wrapper);
  }

  function clearTimers() {
    if (assetUploadTimer) window.clearTimeout(assetUploadTimer);
    assetUploadTimer = null;
    if (personImportTimer) window.clearTimeout(personImportTimer);
    personImportTimer = null;
  }

  function closeLayers() {
    clearTimers();
    document.querySelectorAll(".knowledge-drawer.open, .knowledge-modal.open").forEach(function (layer) {
      layer.classList.remove("open");
      layer.setAttribute("aria-hidden", "true");
    });
    const backdrop = document.getElementById("knowledgeBackdrop");
    if (backdrop) backdrop.classList.remove("open");
    document.body.classList.remove("knowledge-layer-open");
  }

  function requestCloseLayers() {
    if (assetUploadActive) {
      window.showToast("资料正在上传，请等待全部文件上传完成", "warning");
      return;
    }
    closeLayers();
  }

  function openLayer(id) {
    const layer = document.getElementById(id);
    if (!layer) return;
    closeLayers();
    layer.classList.add("open");
    layer.setAttribute("aria-hidden", "false");
    document.getElementById("knowledgeBackdrop").classList.add("open");
    document.body.classList.add("knowledge-layer-open");
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value || "-";
  }

  function populateDetail(item) {
    if (!item) return;
    currentItem = item;
    const status = recordStatus(item);
    const processing = status.key === "processing";
    const validity = processing || item.category === "people-record" && item.recordType !== "certificate" ? { applicable: false, tone: "gray", label: "-", dateText: "" } : validityInfo(item);
    const aiFields = processing ? [["解析状态", "资料正在后台解析，完成后自动更新"]] : item.category === "people-record" ? personRecordDetailFields(item) : buildAiExtract(item.category, item.type, item.file, item);
    setText("detailCategory", detailCategoryLabel(item));
    setText("detailTitle", item.name);
    setText("detailCode", item.id || "资料编号待生成");
    setText("detailSummary", item.summary || item.content || item.period || (item.tags || []).slice(0, 3).join("、") || item.name);
    setText("detailDescription", processing ? "文件已上传，系统正在后台解析资料内容；完成后将自动更新资料属性。" : item.description || (item.category === "people-record" ? "来源文件已完成解析并关联当前人员档案，可继续查看、编辑或归档。" : "资料内容已完成 AI 解析，可用于知识检索和投标项目匹配。"));
    setText("detailType", item.type || (item.category === "people-record" ? personRecordLabel(item) : "AI 自动识别"));
    setText("detailClassification", detailCategoryLabel(item));
    setText("detailOwner", item.owner || currentUserName);
    document.getElementById("detailFile").innerHTML = '<div class="knowledge-detail-file-name">' + fileIconMarkup(item.file, "knowledge-record-format-icon") + '<div class="knowledge-detail-file-copy"><strong title="' + escapeHtml(item.file || "来源文件已保留") + '">' + escapeHtml(item.file || "来源文件已保留") + '</strong><small>' + escapeHtml(fileFormatLabel(item.file)) + ' · 原始资料</small></div></div><div class="knowledge-detail-file-actions"><button class="text-btn compact-btn" id="detailPreviewFile" type="button"><span class="btn-icon">' + icons.preview + '</span><span>预览</span></button><button class="text-btn compact-btn" id="detailDownloadFile" type="button"><span class="btn-icon">' + icons.download + '</span><span>下载</span></button></div>';
    setText("detailStatusText", status.label);
    setText("detailStatusTime", status.key === "archived" ? (item.archivedAt || "-") + " · " + (item.archivedBy || currentUserName) : (item.updatedAt || "-") + " · " + currentUserName);
    setText("detailReferences", (item.references || 0) + " 次");
    setText("detailUpdatedAt", (item.updatedAt || "-") + " · " + (item.owner || currentUserName));
    setText("detailParsedAt", processing ? "后台解析中 · 完成后自动更新" : item.manualFilled ? "AI 未识别到有效信息 · 已人工补充" : (item.updatedAt || "-") + " · 解析信息已保存");
    const archiveRecord = document.getElementById("detailArchiveRecord");
    archiveRecord.classList.toggle("hidden", status.key !== "archived");
    setText("detailArchivedAt", (item.archivedAt || "-") + " · " + (item.archivedBy || currentUserName));
    const statusNode = document.getElementById("detailRecordStatus");
    statusNode.className = "status-tag " + status.tone;
    statusNode.textContent = status.label;
    const validityTag = document.getElementById("detailValidityTag");
    validityTag.className = "status-tag " + validity.tone + (validity.applicable ? "" : " hidden");
    validityTag.textContent = validity.label;
    document.getElementById("detailValidityStatusField").classList.toggle("hidden", !validity.applicable);
    document.getElementById("detailValidityDateField").classList.toggle("hidden", !validity.applicable);
    const detailValidityStatus = document.getElementById("detailValidityStatus");
    detailValidityStatus.className = "status-tag " + validity.tone;
    detailValidityStatus.textContent = validity.label;
    setText("detailValidityDate", validity.dateText);
    const actionButton = document.getElementById("detailActionBtn");
    const archived = status.key === "archived";
    actionButton.className = (archived ? "danger-btn" : "primary-btn") + (item.detailReadOnly || processing ? " hidden" : "");
    document.getElementById("detailActionIcon").innerHTML = archived ? icons.trash : icons.edit;
    document.getElementById("detailActionText").textContent = archived ? "删除资料" : "编辑资料";
    document.getElementById("detailAiFields").innerHTML = aiFields.map(function (field) { return '<div><span>' + escapeHtml(field[0]) + '</span><strong>' + escapeHtml(field[1]) + '</strong></div>'; }).join("");
    const tags = item.tags || [];
    document.getElementById("detailTags").innerHTML = tags.map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join("");
    document.getElementById("detailTagsSection").classList.toggle("hidden", !tags.length);
  }

  function openDetail(item) {
    populateDetail(item);
    openLayer("knowledgeDetailDrawer");
  }

  function setAssetButton(text, icon, disabled) {
    document.getElementById("saveKnowledgeAssetText").textContent = text;
    document.getElementById("saveKnowledgeAssetIcon").innerHTML = icon;
    document.getElementById("saveKnowledgeAsset").disabled = Boolean(disabled);
  }

  function setAssetUploadControlsDisabled(disabled) {
    document.getElementById("assetFile").disabled = Boolean(disabled);
    document.getElementById("assetUploadZone").classList.toggle("disabled", Boolean(disabled));
    document.querySelectorAll("#knowledgeAssetModal [data-close-knowledge-layer]").forEach(function (button) {
      button.disabled = Boolean(disabled);
    });
  }

  function resetAssetForm() {
    if (assetUploadTimer) window.clearTimeout(assetUploadTimer);
    assetUploadTimer = null;
    assetUploadActive = false;
    assetBatchFiles = [];
    ["assetName", "assetType", "assetTags", "assetSummary", "assetDescription"].forEach(function (id) { document.getElementById(id).value = ""; });
    document.getElementById("assetCategory").value = "company";
    document.getElementById("assetValidityMode").value = "longterm";
    document.getElementById("assetValidityStart").value = "";
    document.getElementById("assetValidityDue").value = "";
    document.getElementById("assetValidityFields").classList.add("hidden");
    document.getElementById("assetFile").value = "";
    document.getElementById("assetFileLabel").textContent = "点击选择多个文件或拖放到这里";
    document.getElementById("assetFileHint").textContent = "支持 PDF、Word、Excel、PPT、图片和压缩包，单个文件不超过 50 MB";
    document.getElementById("assetUploadStage").classList.remove("hidden");
    document.getElementById("assetEditFields").classList.add("hidden");
    document.getElementById("assetBatchFileList").innerHTML = "";
    document.getElementById("assetBatchStatus").textContent = "尚未选择资料文件";
    document.getElementById("assetAiExtract").innerHTML = "";
    renderTypeSuggestions("company");
    setAssetUploadControlsDisabled(false);
    setAssetButton("确认上传", icons.upload, true);
  }

  function renderBatchFileList() {
    const labels = {
      pending: ["待上传", "gray"],
      uploading: ["上传中", "blue"],
      done: ["上传完成", "green"]
    };
    document.getElementById("assetBatchFileList").innerHTML = assetBatchFiles.map(function (item) {
      const status = labels[item.status] || labels.pending;
      const action = !assetUploadActive && item.status === "pending" ? '<button class="knowledge-batch-action" type="button" data-batch-remove="' + item.id + '"><span>' + icons.close + '</span><b>移除</b></button>' : "";
      const actions = action ? '<div class="knowledge-batch-file-actions">' + action + '</div>' : "";
      const progress = item.status === "pending" ? "" : '<div class="knowledge-batch-progress" role="progressbar" aria-label="' + escapeHtml(item.file.name) + '上传进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + item.progress + '"><span><i style="width:' + item.progress + '%"></i></span><b>' + item.progress + '%</b></div>';
      return '<div class="knowledge-batch-file-item' + (progress ? ' has-progress' : '') + '">' + fileIconMarkup(item.file.name, "knowledge-batch-format-icon") + '<div class="knowledge-batch-file-name"><strong title="' + escapeHtml(item.file.name) + '">' + escapeHtml(item.file.name) + '</strong><span>' + formatFileSize(item.file.size) + '</span></div><span class="status-tag ' + status[1] + '">' + status[0] + '</span>' + actions + progress + '</div>';
    }).join("");
  }

  function updateBatchSelection() {
    renderBatchFileList();
    const status = document.getElementById("assetBatchStatus");
    if (!assetBatchFiles.length) {
      status.textContent = "尚未选择资料文件";
      document.getElementById("assetFileLabel").textContent = "点击选择多个文件或拖放到这里";
      setAssetButton("确认上传", icons.upload, true);
      return;
    }
    document.getElementById("assetFileLabel").textContent = "已选择 " + assetBatchFiles.length + " 个文件，可继续添加";
    status.textContent = "已选择 " + assetBatchFiles.length + " 个文件，上传完成后将在后台异步解析";
    setAssetButton("确认上传（" + assetBatchFiles.length + "）", icons.upload, false);
  }

  function updateUploadSummary() {
    const completed = assetBatchFiles.filter(function (item) { return item.status === "done"; }).length;
    document.getElementById("assetBatchStatus").textContent = "正在上传：已完成 " + completed + " / " + assetBatchFiles.length + " 个文件";
    setAssetButton("正在上传（" + completed + "/" + assetBatchFiles.length + "）", icons.upload, true);
  }

  function uploadNextBatchFile(index) {
    if (index >= assetBatchFiles.length) {
      document.getElementById("assetBatchStatus").textContent = "全部 " + assetBatchFiles.length + " 个文件上传完成";
      setAssetButton("上传完成", icons.check, true);
      assetUploadTimer = window.setTimeout(function () {
        assetUploadTimer = null;
        const records = createProcessingRecords();
        assetUploadActive = false;
        setAssetUploadControlsDisabled(false);
        closeLayers();
        document.dispatchEvent(new CustomEvent("knowledge-record-changed", { detail: { action: "create", records: records } }));
        window.showToast(records.length + " 个文件上传成功，系统正在后台解析", "success");
      }, 360);
      return;
    }
    const item = assetBatchFiles[index];
    const steps = [12, 30, 52, 73, 89, 100];
    let stepIndex = 0;
    item.status = "uploading";
    item.progress = 0;
    renderBatchFileList();
    updateUploadSummary();
    function advanceUpload() {
      item.progress = steps[stepIndex];
      stepIndex += 1;
      renderBatchFileList();
      if (item.progress < 100) {
        assetUploadTimer = window.setTimeout(advanceUpload, 120);
        return;
      }
      item.status = "done";
      renderBatchFileList();
      updateUploadSummary();
      assetUploadTimer = window.setTimeout(function () { uploadNextBatchFile(index + 1); }, 180);
    }
    assetUploadTimer = window.setTimeout(advanceUpload, 120);
  }

  function startBatchUpload() {
    assetUploadActive = true;
    assetBatchFiles.forEach(function (item) {
      item.status = "pending";
      item.progress = 0;
    });
    setAssetUploadControlsDisabled(true);
    renderBatchFileList();
    updateUploadSummary();
    uploadNextBatchFile(0);
  }

  function collectionForCategory(category) {
    return {
      company: data.companyRecords,
      certificates: data.certificates,
      cases: data.caseRecords,
      solutions: data.solutionRecords,
      business: data.businessRecords,
      templates: data.templateRecords,
      charts: data.chartRecords,
      history: data.historyRecords
    }[category] || null;
  }

  function createProcessingRecords() {
    const category = categoryLabels[currentPresetCategory] ? currentPresetCategory : "pending";
    const now = new Date();
    const stamp = Date.now();
    const records = assetBatchFiles.map(function (item, index) {
      return {
        id: "KB-UP-" + stamp + "-" + String(index + 1).padStart(2, "0"),
        name: fileBaseName(item.file.name),
        category: category,
        categoryLabel: category === "pending" ? "待识别" : categoryLabels[category],
        type: "待识别",
        summary: "后台解析中，完成后自动更新",
        description: "文件已上传，系统正在后台解析资料内容。",
        tags: [],
        references: 0,
        updatedAt: formatDate(now),
        owner: currentUserName,
        file: item.file.name,
        sourceFile: item.file,
        lifecycleState: "active",
        parseStatus: "processing"
      };
    });
    const collection = collectionForCategory(category);
    if (collection) records.slice().reverse().forEach(function (record) { collection.unshift(record); });
    (data.categories || []).forEach(function (item) {
      if (item.key === "all" || item.key === category) item.count += records.length;
    });
    renderSidebar();
    return records;
  }

  function addBatchFiles(fileList) {
    let oversized = 0;
    Array.from(fileList || []).forEach(function (file) {
      if (file.size > 50 * 1024 * 1024) { oversized += 1; return; }
      const duplicate = assetBatchFiles.some(function (item) { return item.file.name === file.name && item.file.size === file.size; });
      if (!duplicate) assetBatchFiles.push({ id: "asset-" + Date.now() + "-" + assetBatchFiles.length, file: file, status: "pending", progress: 0 });
    });
    if (oversized) window.showToast(oversized + " 个文件超过 50 MB，未加入上传列表", "warning", "#assetFile");
    updateBatchSelection();
  }

  function fillAssetForm(item) {
    const category = item.category || "company";
    const type = item.type || guessType(category, item.name);
    document.getElementById("assetName").value = item.name || "";
    document.getElementById("assetCategory").value = category;
    document.getElementById("assetType").value = type;
    document.getElementById("assetTags").value = (item.tags || []).join("、");
    document.getElementById("assetSummary").value = item.summary || defaultSummary(category, type);
    document.getElementById("assetDescription").value = item.description || "";
    syncAssetValidityFields(category, { mode: item.validityMode === "fixed" ? "fixed" : "longterm", startDate: item.validityStartDate || item.startDate || "", dueDate: item.validityDueDate || item.endDate || "" });
    document.getElementById("assetAiExtract").innerHTML = aiExtractHtml(buildAiExtract(category, type, item.file, item));
    renderTypeSuggestions(category);
  }

  function openAssetModal(mode, item, presetCategory) {
    resetAssetForm();
    currentItem = item || null;
    currentPresetCategory = presetCategory || "";
    const title = document.getElementById("assetModalTitle");
    const subtitle = document.getElementById("assetModalSubtitle");
    const category = document.getElementById("assetCategory");
    const fileInput = document.getElementById("assetFile");
    const modal = document.getElementById("knowledgeAssetModal");
    const isCreate = !mode || mode === "create";
    fileInput.multiple = isCreate;
    modal.classList.toggle("wide", !isCreate);
    category.value = presetCategory || (item && item.category) || "company";
    renderTypeSuggestions(category.value);
    document.getElementById("assetBatchFileList").classList.toggle("hidden", !isCreate);
    document.getElementById("assetBatchStatus").classList.toggle("hidden", !isCreate);
    if (mode === "edit" && item) {
      title.textContent = "编辑知识资料";
      subtitle.textContent = "修改 AI 自动填充的基础信息；分类相关属性保留在解析信息中。";
      document.getElementById("assetEditFields").classList.remove("hidden");
      fillAssetForm(item);
      document.getElementById("assetFileLabel").textContent = item.file || "当前来源文件";
      document.getElementById("assetFileHint").textContent = "可保留当前文件，也可重新选择文件并重新解析";
      setAssetButton("保存修改", icons.save, false);
    } else {
      title.textContent = "上传知识资料";
      subtitle.textContent = "支持批量上传，上传完成后系统将在后台异步解析。";
      category.value = presetCategory || "company";
      setAssetButton("确认上传", icons.upload, true);
    }
    modal.setAttribute("data-form-mode", mode || "create");
    openLayer("knowledgeAssetModal");
  }

  function openArchive(item) {
    if (!item || item.lifecycleState === "archived") return;
    pendingArchiveItem = item;
    const isPerson = item.category === "people";
    const isPersonRecord = item.category === "people-record";
    setText("archiveModalTitle", isPerson ? "归档人员档案" : isPersonRecord ? "归档人员资料" : "归档知识资料");
    setText("archiveModalSubtitle", isPerson ? "归档后人员不再参与项目匹配和标书编制。" : isPersonRecord ? "归档后资料将移入当前人员的“已归档资料”。" : "归档后资料不再出现在默认列表中。");
    setText("archiveAssetName", "确认归档“" + item.name + "”？");
    setText("archiveAssetDescription", isPerson ? "归档后仍可查看人员主档和关联资料，并可在“已归档人员”中删除。" : isPersonRecord ? "归档后仍可查看资料内容，并可在人员详情的“已归档资料”中删除。" : "归档后资料从在库列表移入“已归档”，仍可查看，并可在归档列表中删除。");
    openLayer("knowledgeArchiveModal");
  }

  function openDelete(item) {
    if (!item || item.lifecycleState !== "archived") {
      window.showToast(item && item.category === "people" ? "人员需先归档后才能删除" : "资料需先归档后才能删除", "warning");
      return;
    }
    pendingDeleteItem = item;
    const isPerson = item.category === "people";
    const isPersonRecord = item.category === "people-record";
    setText("deleteModalTitle", isPerson ? "删除已归档人员" : isPersonRecord ? "删除已归档人员资料" : "删除已归档资料");
    setText("deleteModalSubtitle", isPerson ? "仅已归档人员可以删除。" : isPersonRecord ? "仅已归档的人员资料可以删除。" : "仅已归档资料可以删除。");
    setText("deleteAssetName", "确认删除“" + item.name + "”？");
    setText("deleteAssetDescription", isPerson ? "删除后人员主档及其关联信息将被移除，此操作不可恢复。" : isPersonRecord ? "删除后该人员资料及其解析信息将被移除，此操作不可恢复。" : "删除后资料及其解析信息将从知识库移除，此操作不可恢复。");
    openLayer("knowledgeDeleteModal");
  }

  function openPersonModal(mode, item) {
    currentPerson = item || null;
    const profile = item ? (data.peopleProfiles || []).find(function (entry) { return entry.id === item.id; }) : null;
    document.getElementById("personModalTitle").textContent = mode === "edit" ? "编辑人员" : "新增人员";
    document.getElementById("personName").value = item ? item.name : "";
    document.getElementById("personDepartment").value = profile ? profile.department : "";
    document.getElementById("personPosition").value = profile ? profile.position : "";
    document.getElementById("knowledgePersonModal").setAttribute("data-form-mode", mode || "create");
    openLayer("knowledgePersonModal");
  }

  function setPersonImportButton(text, icon, disabled) {
    document.getElementById("personImportButtonText").textContent = text;
    document.getElementById("personImportButtonIcon").innerHTML = icon;
    document.getElementById("confirmPersonImport").disabled = Boolean(disabled);
  }

  function resetPersonImport(mode) {
    personImportMode = mode;
    personImportFiles = [];
    personImportStage = "upload";
    const isPeople = mode === "people";
    document.getElementById("personImportTitle").textContent = isPeople ? "导入人员名单" : "批量导入资质资料";
    document.getElementById("personImportSubtitle").textContent = isPeople ? "上传人员名单后，系统识别人员信息并集中确认。" : "上传证书或资质文件后，AI 自动解析并关联已有人员。";
    document.getElementById("personImportGuideIcon").innerHTML = isPeople ? icons.people : icons.certificate;
    document.getElementById("personImportGuideTitle").textContent = isPeople ? "批量建立人员主档" : "自动关联人员资质";
    document.getElementById("personImportGuideText").textContent = isPeople ? "支持 Excel 或 CSV 人员名单，AI 将识别姓名、部门和岗位信息。" : "支持 PDF 和图片，可一次选择多个文件；系统根据姓名、证书编号等信息自动匹配人员。";
    const input = document.getElementById("personImportFile");
    input.value = "";
    input.accept = isPeople ? ".xlsx,.xls,.csv" : ".pdf,.png,.jpg,.jpeg";
    input.multiple = !isPeople;
    document.getElementById("personImportFileLabel").textContent = isPeople ? "点击选择人员名单" : "点击选择多个证书或资质文件";
    document.getElementById("personImportFileHint").textContent = isPeople ? "支持 Excel、CSV 文件" : "支持 PDF、PNG、JPG，可批量选择";
    document.getElementById("personImportStatus").textContent = "尚未选择文件";
    document.getElementById("personImportFileList").innerHTML = "";
    document.getElementById("personImportResults").innerHTML = "";
    document.getElementById("personImportResults").classList.add("hidden");
    document.getElementById("personImportUploadZone").classList.remove("hidden");
    document.getElementById("personImportFileList").classList.remove("hidden");
    setPersonImportButton("AI 解析并匹配", icons.scan, true);
  }

  function renderPersonImportFiles() {
    document.getElementById("personImportFileList").innerHTML = personImportFiles.map(function (file) {
      return '<div class="knowledge-batch-file-item">' + fileIconMarkup(file.name, "knowledge-batch-format-icon") + '<div class="knowledge-batch-file-name"><strong>' + escapeHtml(file.name) + '</strong><span>' + formatFileSize(file.size) + '</span></div><span class="status-tag gray">待解析</span><div></div></div>';
    }).join("");
    document.getElementById("personImportStatus").textContent = personImportFiles.length ? "已选择 " + personImportFiles.length + " 个文件，点击“AI 解析并匹配”继续" : "尚未选择文件";
    setPersonImportButton("AI 解析并匹配", icons.scan, !personImportFiles.length);
  }

  function personSelect(selected) {
    return '<select class="knowledge-control knowledge-import-person-select">' + (data.peopleRecords || []).slice(0, 8).map(function (person) { return '<option' + (person.name === selected ? ' selected' : '') + '>' + escapeHtml(person.name) + '</option>'; }).join("") + '</select>';
  }

  function renderPersonImportResults() {
    const root = document.getElementById("personImportResults");
    document.getElementById("personImportUploadZone").classList.add("hidden");
    document.getElementById("personImportFileList").classList.add("hidden");
    root.classList.remove("hidden");
    personImportStage = "results";
    if (personImportMode === "people") {
      const rows = [
        ["陈思远", "解决方案中心", "高级解决方案经理", "可导入", "green"],
        ["周子涵", "项目交付部", "实施工程师", "可导入", "green"],
        ["王磊", "项目交付部", "项目经理", "可能重复，默认跳过", "orange"]
      ];
      root.innerHTML = '<div class="knowledge-import-result-head"><div><strong>人员识别结果</strong><span>识别 3 人，可批量选择后确认导入</span></div><span class="status-tag green">AI 解析完成</span></div><div class="knowledge-person-table-wrap"><table class="knowledge-person-table knowledge-import-table"><thead><tr><th>选择</th><th>姓名</th><th>所属部门</th><th>岗位</th><th>导入处理</th></tr></thead><tbody>' + rows.map(function (row, index) { return '<tr><td><input type="checkbox" data-import-row' + (index < 2 ? ' checked' : '') + '/></td><td><strong>' + row[0] + '</strong></td><td>' + row[1] + '</td><td>' + row[2] + '</td><td><span class="status-tag ' + row[4] + '">' + row[3] + '</span></td></tr>'; }).join("") + '</tbody></table></div>';
      document.getElementById("personImportStatus").textContent = "人员信息已识别，请确认需要导入的人员";
    } else {
      const sourceFiles = personImportFiles.length ? personImportFiles : [{ name: "王磊_信息系统项目管理师.pdf", size: 0 }, { name: "李娜_注册信息安全工程师.pdf", size: 0 }];
      root.innerHTML = '<div class="knowledge-import-result-head"><div><strong>资质解析与人员匹配结果</strong><span>系统已按姓名和证书信息自动关联，可修正低置信度结果</span></div><span class="status-tag green">AI 解析完成</span></div><div class="knowledge-person-table-wrap"><table class="knowledge-person-table knowledge-import-table"><thead><tr><th>选择</th><th>来源文件</th><th>AI 识别资质</th><th>关联人员</th><th>匹配结果</th></tr></thead><tbody>' + sourceFiles.map(function (file, index) {
        const person = (data.peopleRecords || [])[index % Math.max(1, (data.peopleRecords || []).length)] || { name: "王磊" };
        const low = index === sourceFiles.length - 1 && sourceFiles.length > 1;
        return '<tr><td><input type="checkbox" data-import-row checked/></td><td><div class="knowledge-person-file-cell">' + fileIconMarkup(file.name, "knowledge-record-format-icon") + '<span class="knowledge-person-file-copy"><strong>' + escapeHtml(file.name) + '</strong><small>' + formatFileSize(file.size) + '</small></span></div></td><td>' + (index % 2 ? '注册信息安全工程师' : '信息系统项目管理师') + '<small>编号与有效期已提取</small></td><td>' + (low ? personSelect(person.name) : '<strong>' + escapeHtml(person.name) + '</strong>') + '</td><td><span class="status-tag ' + (low ? 'orange' : 'green') + '">' + (low ? '请确认关联' : '自动匹配') + '</span></td></tr>';
      }).join("") + '</tbody></table></div>';
      document.getElementById("personImportStatus").textContent = "资质信息已解析并关联人员，请确认后导入";
    }
    setPersonImportButton("确认导入", icons.check, false);
  }

  function openPersonImportModal(mode) {
    resetPersonImport(mode);
    openLayer("knowledgePersonImportModal");
  }

  function bindSharedEvents() {
    document.getElementById("knowledgeBackdrop").addEventListener("click", requestCloseLayers);
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-close-knowledge-layer]")) {
        event.preventDefault();
        requestCloseLayers();
      }
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") requestCloseLayers(); });

    const uploadZone = document.getElementById("assetUploadZone");
    uploadZone.addEventListener("dragover", function (event) { event.preventDefault(); if (!assetUploadActive) uploadZone.classList.add("dragging"); });
    uploadZone.addEventListener("dragleave", function () { uploadZone.classList.remove("dragging"); });
    uploadZone.addEventListener("drop", function (event) {
      event.preventDefault();
      uploadZone.classList.remove("dragging");
      if (!assetUploadActive && document.getElementById("knowledgeAssetModal").getAttribute("data-form-mode") === "create") addBatchFiles(event.dataTransfer.files);
    });
    document.getElementById("assetFile").addEventListener("change", function () {
      const mode = document.getElementById("knowledgeAssetModal").getAttribute("data-form-mode");
      if (mode === "create" && !assetUploadActive) {
        addBatchFiles(this.files);
        this.value = "";
      } else {
        const file = this.files && this.files[0];
        document.getElementById("assetFileLabel").textContent = file ? file.name : "点击选择文件";
        if (file) {
          const category = document.getElementById("assetCategory").value;
          syncAssetValidityFields(category, suggestedValidity(category, file.name, false));
        }
      }
    });
    document.getElementById("assetCategory").addEventListener("change", function () {
      const type = guessType(this.value, document.getElementById("assetName").value);
      const suggested = suggestedValidity(this.value, document.getElementById("assetFileLabel").textContent, false);
      const aiFields = buildAiExtract(this.value, type, document.getElementById("assetFileLabel").textContent, null);
      const suggestedInfo = validityInfo({ validityMode: suggested.mode, validityStartDate: suggested.startDate, validityDueDate: suggested.dueDate });
      if (suggestedInfo.applicable && this.value !== "certificates") aiFields.push(["有效状态", suggestedInfo.label + " · " + suggestedInfo.dateText]);
      document.getElementById("assetType").value = type;
      document.getElementById("assetSummary").value = defaultSummary(this.value, type);
      document.getElementById("assetAiExtract").innerHTML = aiExtractHtml(aiFields);
      syncAssetValidityFields(this.value, suggested);
      renderTypeSuggestions(this.value);
    });
    document.getElementById("assetValidityMode").addEventListener("change", syncAssetValidityMode);
    document.getElementById("assetBatchFileList").addEventListener("click", function (event) {
      const remove = event.target.closest("[data-batch-remove]");
      if (remove && !assetUploadActive) {
        assetBatchFiles = assetBatchFiles.filter(function (entry) { return entry.id !== remove.getAttribute("data-batch-remove"); });
        updateBatchSelection();
      }
    });
    document.getElementById("saveKnowledgeAsset").addEventListener("click", function () {
      const mode = document.getElementById("knowledgeAssetModal").getAttribute("data-form-mode");
      if (mode === "create") {
        if (assetUploadActive) return;
        if (!assetBatchFiles.length) { window.showToast("请先选择需要上传的资料文件", "warning", "#assetFile"); return; }
        startBatchUpload();
        return;
      }
      const required = ["assetName", "assetType", "assetSummary"];
      const missing = required.find(function (id) { return !document.getElementById(id).value.trim(); });
      if (missing) { window.showToast("请核对资料名称、类型和 AI 摘要", "warning", "#" + missing); document.getElementById(missing).focus(); return; }
      const validityMode = document.getElementById("assetValidityMode").value;
      if (validityMode === "fixed" && !document.getElementById("assetValidityDue").value) {
        window.showToast("请补充到期日期", "warning", "#assetValidityDue");
        document.getElementById("assetValidityDue").focus();
        return;
      }
      if (currentItem) {
        currentItem.name = document.getElementById("assetName").value.trim();
        currentItem.category = document.getElementById("assetCategory").value;
        currentItem.categoryLabel = categoryLabels[currentItem.category];
        currentItem.type = document.getElementById("assetType").value.trim();
        currentItem.tags = document.getElementById("assetTags").value.split(/[，,、]/).map(function (tag) { return tag.trim(); }).filter(Boolean);
        currentItem.summary = document.getElementById("assetSummary").value.trim();
        currentItem.description = document.getElementById("assetDescription").value.trim();
        currentItem.validityMode = document.getElementById("assetValidityMode").value;
        currentItem.validityStartDate = document.getElementById("assetValidityStart").value;
        currentItem.validityDueDate = document.getElementById("assetValidityDue").value;
        currentItem.startDate = currentItem.validityStartDate;
        currentItem.endDate = currentItem.validityDueDate;
        const replacementFile = document.getElementById("assetFile").files[0];
        if (replacementFile) {
          currentItem.file = replacementFile.name;
          currentItem.sourceFile = replacementFile;
        }
        currentItem.parseStatus = "stored";
        currentItem.manualFilled = false;
        currentItem.updatedAt = formatDate(new Date());
      }
      closeLayers();
      document.dispatchEvent(new CustomEvent("knowledge-record-changed", { detail: { action: "update", id: currentItem && currentItem.id } }));
      window.showToast("资料已更新" + (document.getElementById("assetFile").files[0] ? "，新文件已重新解析" : ""), "success");
    });
    document.getElementById("detailActionBtn").addEventListener("click", function () {
      const section = document.body.getAttribute("data-knowledge-section");
      if (!currentItem) return;
      if (currentItem.lifecycleState === "archived") openDelete(currentItem);
      else if (currentItem.category === "people-record") document.dispatchEvent(new CustomEvent("knowledge-person-record-edit-request", { detail: { type: currentItem.recordType, id: currentItem.id } }));
      else openAssetModal("edit", currentItem, section !== "all" && section !== "people" ? section : "");
    });
    document.addEventListener("click", function (event) {
      if (event.target.closest("#detailPreviewFile")) openSourcePreview(currentItem);
      if (event.target.closest("#detailDownloadFile")) downloadSourceFile(currentItem);
    });
    document.getElementById("confirmArchiveAsset").addEventListener("click", function () {
      if (!pendingArchiveItem) return;
      pendingArchiveItem.lifecycleState = "archived";
      pendingArchiveItem.archivedAt = formatDate(new Date());
      pendingArchiveItem.archivedBy = currentUserName;
      const archivedItem = pendingArchiveItem;
      closeLayers();
      pendingArchiveItem = null;
      document.dispatchEvent(new CustomEvent("knowledge-record-changed", { detail: { action: "archive", id: archivedItem.id } }));
      window.showToast("“" + archivedItem.name + "”已归档", "success");
    });
    document.getElementById("confirmDeleteAsset").addEventListener("click", function () {
      if (!pendingDeleteItem) return;
      pendingDeleteItem.deleted = true;
      const deletedItem = pendingDeleteItem;
      closeLayers();
      pendingDeleteItem = null;
      document.dispatchEvent(new CustomEvent("knowledge-record-changed", { detail: { action: "delete", id: deletedItem.id } }));
      window.showToast("“" + deletedItem.name + "”已删除", "success");
    });
    document.getElementById("saveKnowledgePerson").addEventListener("click", function () {
      const required = ["personName", "personDepartment", "personPosition"];
      const missing = required.find(function (id) { return !document.getElementById(id).value.trim(); });
      if (missing) { window.showToast("请填写姓名、所属部门和岗位名称", "warning", "#" + missing); document.getElementById(missing).focus(); return; }
      const isEdit = document.getElementById("knowledgePersonModal").getAttribute("data-form-mode") === "edit";
      const name = document.getElementById("personName").value.trim();
      if (isEdit && currentPerson) {
        const profile = (data.peopleProfiles || []).find(function (entry) { return entry.id === currentPerson.id; });
        currentPerson.name = name;
        currentPerson.updatedAt = formatDate(new Date());
        if (profile) {
          profile.name = name;
          profile.department = document.getElementById("personDepartment").value.trim();
          profile.position = document.getElementById("personPosition").value.trim();
        }
      }
      closeLayers();
      if (isEdit && currentPerson) document.dispatchEvent(new CustomEvent("knowledge-record-changed", { detail: { action: "update-person", id: currentPerson.id } }));
      window.showToast(isEdit ? "“" + name + "”的人员信息已更新" : "人员已新增，可继续导入相关资质资料", "success");
      currentPerson = null;
    });
    document.getElementById("personImportFile").addEventListener("change", function () {
      personImportFiles = Array.from(this.files || []);
      renderPersonImportFiles();
    });
    document.getElementById("confirmPersonImport").addEventListener("click", function () {
      if (personImportStage === "upload") {
        if (!personImportFiles.length) { window.showToast("请先选择需要导入的文件", "warning", "#personImportFile"); return; }
        document.getElementById("personImportStatus").textContent = personImportMode === "people" ? "AI 正在识别人员名单..." : "AI 正在解析资质并匹配人员...";
        setPersonImportButton("AI 解析中", icons.scan, true);
        personImportTimer = window.setTimeout(renderPersonImportResults, 900);
        return;
      }
      const selected = document.querySelectorAll("#personImportResults [data-import-row]:checked").length;
      if (!selected) { window.showToast("请至少选择一项导入记录", "warning"); return; }
      closeLayers();
      window.showToast(personImportMode === "people" ? "已导入 " + selected + " 名人员" : "已导入 " + selected + " 项资质并关联人员", "success");
    });
  }

  function init() {
    renderSidebar();
    injectSharedLayers();
    bindSharedEvents();
  }

  window.knowledgePrototype = {
    closeLayers: closeLayers,
    openLayer: openLayer,
    openDetail: openDetail,
    openAssetModal: openAssetModal,
    openPersonModal: openPersonModal,
    openPersonImportModal: openPersonImportModal,
    openArchive: openArchive,
    openDelete: openDelete,
    openSourcePreview: openSourcePreview,
    downloadSourceFile: downloadSourceFile,
    activeCategory: getActiveCategory
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
