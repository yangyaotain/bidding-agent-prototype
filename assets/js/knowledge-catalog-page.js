(function () {
  "use strict";

  const data = window.KnowledgePrototypeData || {};
  const collections = {
    company: data.companyRecords || [], certificates: data.certificates || [], cases: data.caseRecords || [],
    solutions: data.solutionRecords || [], business: data.businessRecords || [], templates: data.templateRecords || [],
    charts: data.chartRecords || [], history: data.historyRecords || []
  };

  const icons = {
    library: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12v17H6a2 2 0 0 0-2 2V5z"/><path d="M8 7h6M8 11h7"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></svg>',
    scan: '<svg viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10M9 9h6M9 15h6"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    archive: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M9 13h6"/></svg>',
    export: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v5h5"/><path d="M12 11v6M9 14l3 3 3-3"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 14v6h14v-6"/></svg>',
    reset: '<svg viewBox="0 0 24 24"><path d="M4 4v6h6M20 20v-6h-6"/><path d="M19 9a8 8 0 0 0-13.5-3L4 10M5 15a8 8 0 0 0 13.5 3L20 14"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'
  };

  const configs = {
    company: {
      title: "企业基础资料", description: "上传企业主体、银行账户、财务、信用税务和标准介绍资料，由 AI 自动提取名称、标签、摘要和关键信息。",
      count: 8, inStore: 7, stored: 6, processing: 1, archived: 1, hasValidity: true, validityAlerts: 2, validityDetail: "2 项固定有效期资料临期",
      types: ["主体资格", "企业介绍", "银行账户", "财务资料", "信用税务"],
      search: "搜索资料名称、类型、摘要或标签", empty: "没有找到符合条件的企业基础资料", pages: 1
    },
    certificates: {
      title: "企业资质证照", description: "上传行业资质、体系认证和企业认定资料，由 AI 自动提取证书编号、发证机构和有效期限等信息。",
      count: 9, inStore: 8, stored: 7, processing: 1, archived: 1, hasValidity: true, validityAlerts: 4, validityDetail: "3 项临期 · 1 项已过期", validityTone: "red",
      types: ["体系认证", "行业资质", "企业认定"],
      search: "搜索证照名称、类型、摘要或标签", empty: "没有找到符合条件的企业资质证照", pages: 1
    },
    cases: {
      title: "业绩案例", description: "上传合同、验收证明和项目说明，AI 自动识别项目、客户、行业、服务期间及证明材料。",
      count: 6, inStore: 5, stored: 3, processing: 2, archived: 1,
      types: ["信息系统运维", "数字化运营", "系统集成", "云平台运维", "软件开发", "安全服务"],
      search: "搜索案例名称、类型、摘要或标签", empty: "没有找到符合条件的业绩案例", pages: 1
    },
    solutions: {
      title: "产品与技术方案", description: "上传产品、技术、实施、运维和安全方案，AI 自动形成可检索的主题、标签与内容摘要。",
      count: 6, inStore: 5, stored: 3, processing: 2, archived: 1,
      types: ["产品方案", "技术方案", "运维服务", "安全整改", "容灾备份", "数据迁移", "安全保障", "应急响应"],
      search: "搜索方案名称、类型、摘要或标签", empty: "没有找到符合条件的产品与技术方案", pages: 1
    },
    business: {
      title: "商务素材", description: "上传服务、保密、廉洁、售后和履约材料，AI 自动提取承诺主题、关键条款和使用提示。",
      count: 6, inStore: 5, stored: 4, processing: 1, archived: 1,
      types: ["售后承诺", "保密承诺", "廉洁承诺", "履约承诺", "数据合规"],
      search: "搜索素材名称、类型、摘要或标签", empty: "没有找到符合条件的商务素材", pages: 1
    },
    templates: {
      title: "模板与格式", description: "上传偏离表、人员模板、承诺函和封面目录等文件，AI 自动识别模板类型、格式和适用内容。",
      count: 8, inStore: 7, stored: 7, processing: 0, archived: 1,
      types: ["偏离表", "人员模板", "承诺函", "封面目录", "投标函", "报价表", "核验清单"],
      search: "搜索模板名称、类型、摘要或标签", empty: "没有找到符合条件的模板与格式", pages: 1
    },
    charts: {
      title: "图表素材", description: "上传架构图、流程图、拓扑图和组织架构图，AI 自动识别图表主题、结构和源文件格式。",
      count: 5, inStore: 4, stored: 4, processing: 0, archived: 1,
      types: ["架构图", "流程图", "拓扑图", "组织架构图"],
      search: "搜索图表名称、类型、摘要或标签", empty: "没有找到符合条件的图表素材", pages: 1
    },
    history: {
      title: "历史标书", description: "上传既往项目的技术标、商务标和最终交付附件，AI 自动识别项目类型、文件组成和投标时间。",
      count: 4, inStore: 3, stored: 3, processing: 0, archived: 1,
      types: ["运维服务", "云平台运维", "数字化平台", "系统集成"],
      search: "搜索标书名称、项目类型、摘要或标签", empty: "没有找到符合条件的历史标书", pages: 1
    }
  };

  function metrics(config) {
    const result = [
      ["在库资料", config.inStore, "默认展示当前可检索和使用的资料", "", icons.library],
      ["已入库", config.stored, "资料信息已保存，可用于检索和投标编制", "green", icons.check],
      ["解析中", config.processing, "文件正在上传、识别或结构化处理", "cyan", icons.scan],
      ["已归档", config.archived, "已移出在库列表，可查看或永久删除", "", icons.archive]
    ];
    if (config.hasValidity) result.splice(3, 0, ["有效期预警", config.validityAlerts, config.validityDetail, config.validityTone || "orange", icons.clock]);
    return result;
  }

  function metricHtml(metric) {
    return '<article class="knowledge-metric card"><span class="knowledge-metric-icon ' + metric[3] + '">' + metric[4] + '</span><div class="knowledge-metric-copy"><span>' + metric[0] + '</span><strong>' + metric[1] + '</strong><small>' + metric[2] + '</small></div></article>';
  }

  function tabHtml(tab, index) {
    return '<button class="knowledge-tab' + (index === 0 ? ' active' : '') + (tab[0] === 'validity-alert' ? tab[3] === 'red' ? ' danger-attention' : ' attention' : '') + '" type="button" role="tab" aria-selected="' + (index === 0 ? 'true' : 'false') + '" data-knowledge-tab="' + tab[0] + '">' + tab[1] + '<b>' + tab[2] + '</b></button>';
  }

  function typeOptions(config) {
    return '<option value="all">全部类型</option>' + config.types.map(function (type) { return '<option value="' + type + '">' + type + '</option>'; }).join("");
  }

  function pageButtons(count) {
    let buttons = '<button class="knowledge-page-btn" type="button" aria-label="上一页">‹</button>';
    for (let index = 1; index <= count; index += 1) buttons += '<button class="knowledge-page-btn' + (index === 1 ? ' active' : '') + '" type="button">' + index + '</button>';
    return buttons + '<button class="knowledge-page-btn" type="button" aria-label="下一页">›</button>';
  }

  function render() {
    const root = document.getElementById("knowledgeCatalogPage");
    const section = document.body.getAttribute("data-knowledge-section");
    const config = configs[section];
    if (!root || !config) return;
    const records = collections[section] || [];
    config.count = records.length;
    config.inStore = records.filter(function (item) { return item.lifecycleState !== "archived"; }).length;
    config.stored = records.filter(function (item) { return item.lifecycleState !== "archived" && item.parseStatus === "stored"; }).length;
    config.processing = records.filter(function (item) { return item.lifecycleState !== "archived" && item.parseStatus === "processing"; }).length;
    config.archived = records.filter(function (item) { return item.lifecycleState === "archived"; }).length;
    config.pages = Math.max(1, Math.ceil(config.count / 10));
    const tabs = [["instore", "在库资料", config.inStore], ["stored", "已入库", config.stored], ["processing", "解析中", config.processing], ["archived", "已归档", config.archived]];
    if (config.hasValidity) tabs.splice(3, 0, ["validity-alert", "有效期预警", config.validityAlerts, config.validityTone || "orange"]);
    const headings = ["资料名称", "类型与标签", "AI 解析摘要", "资料状态", "有效期", "最近更新", "操作"];
    const columns = ["20%", "14%", "19%", "12%", "13%", "10%", "12%"];
    root.innerHTML = [
      '<div class="page-breadcrumb"><span>投标助手</span><span>/</span><a href="knowledge.html">知识库</a><span>/</span><strong>' + config.title + '</strong></div>',
      '<header class="knowledge-module-heading"><div><h1>' + config.title + '</h1><p>' + config.description + '</p></div><div class="knowledge-heading-actions">',
      '<button class="secondary-btn" type="button" data-toast="' + config.title + '目录已生成"><span class="btn-icon">' + icons.export + '</span><span>导出目录</span></button>',
      '<button class="primary-btn" type="button" data-create-catalog="true"><span class="btn-icon">' + icons.upload + '</span><span>上传资料</span></button></div></header>',
      '<section class="knowledge-metrics' + (config.hasValidity ? ' five' : '') + '" aria-label="' + config.title + '概览">' + metrics(config).map(metricHtml).join("") + '</section>',
      '<section class="knowledge-shell card"><aside class="knowledge-sidebar" id="knowledgeSidebar"></aside><div class="knowledge-main">',
      '<div class="knowledge-tabs" role="tablist" aria-label="' + config.title + '资料状态筛选">' + tabs.map(tabHtml).join("") + '</div>',
      '<div class="knowledge-toolbar"><label class="knowledge-search"><span class="visually-hidden">搜索' + config.title + '</span>' + icons.search + '<input id="catalogSearch" type="search" placeholder="' + config.search + '" autocomplete="off"/></label>',
      '<div class="knowledge-filter-group"><select class="knowledge-select" id="catalogTypeFilter" aria-label="按类型筛选">' + typeOptions(config) + '</select><button class="ghost-btn compact-btn" id="resetCatalogFilters" type="button"><span class="btn-icon">' + icons.reset + '</span><span>重置</span></button></div></div>',
      '<div class="knowledge-table-wrap" id="catalogTableWrap"><table class="knowledge-table" aria-label="' + config.title + '列表"><colgroup>' + columns.map(function (width) { return '<col style="width:' + width + '"/>'; }).join("") + '</colgroup><thead><tr>' + headings.map(function (label) { return '<th>' + label + '</th>'; }).join("") + '</tr></thead><tbody id="catalogTableBody"></tbody></table></div>',
      '<div class="knowledge-empty hidden" id="catalogEmptyState">' + icons.search + '<strong>' + config.empty + '</strong><span>可以调整关键词、类型或资料状态。</span></div>',
      '<footer class="knowledge-panel-footer"><span id="catalogResultCount">' + config.title + '共 ' + config.count + ' 项</span><div class="knowledge-pagination" aria-label="分页">' + pageButtons(config.pages) + '</div></footer>',
      '</div></section>'
    ].join("");
  }

  render();
})();
