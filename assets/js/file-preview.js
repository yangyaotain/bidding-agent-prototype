(function () {
  "use strict";

  function one(selector, root) { return (root || document).querySelector(selector); }
  function all(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }
  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  const documentFiles = {
    procurement: {
      name: "采购文件.doc",
      formatLabel: "Word 文档",
      size: "372 KB",
      pages: 34,
      projectNumber: "XYZX-2026-GK-001",
      coverLabel: "公开招标文件",
      coverTitle: "智慧园区综合管理平台建设项目",
      coverSubtitle: "采购文件",
      issuer: "某市数字化发展中心",
      agency: "中远采购咨询有限公司",
      date: "二〇二六年一月",
      sections: [
        { page: 1, title: "封面", kind: "cover" },
        { page: 2, title: "目录", kind: "contents" },
        { page: 3, title: "第一章 投标邀请", kind: "invitation", lead: "本项目采用公开招标方式组织采购，欢迎符合资格条件的供应商参加投标。" },
        { page: 5, title: "第二章 投标人须知", kind: "instructions", lead: "投标人应认真阅读采购文件全部内容，并按规定编制、签署和递交投标文件。" },
        { page: 9, title: "第三章 资格审查", kind: "qualification", lead: "资格审查采用合格制，任一实质性资格条件不满足的，投标无效。" },
        { page: 12, title: "第四章 评标方法和标准", kind: "scoring", lead: "评标委员会按照综合评分法对通过资格审查和符合性审查的投标文件进行评审。" },
        { page: 18, title: "第五章 采购需求", kind: "technical", lead: "建设统一的智慧园区综合管理平台，实现数据汇聚、业务协同、统一门户和运维保障。" },
        { page: 27, title: "第六章 合同主要条款", kind: "contract", lead: "合同条款明确项目实施、交付验收、付款安排、知识产权和违约责任。" },
        { page: 31, title: "第七章 投标文件格式", kind: "format", lead: "投标人应按本章规定的目录和格式编制投标文件，不得遗漏实质性响应材料。" },
        { page: 34, title: "附件", kind: "attachments", lead: "本页列示采购文件配套附件及其使用说明。" }
      ]
    },
    technical: {
      name: "技术需求及服务规范.pdf",
      formatLabel: "PDF 文件",
      size: "1.8 MB",
      pages: 22,
      projectNumber: "XYZX-2026-GK-001-FJ01",
      coverLabel: "采购附件 01",
      coverTitle: "智慧园区综合管理平台建设项目",
      coverSubtitle: "技术需求及服务规范",
      issuer: "某市数字化发展中心",
      agency: "信息化建设处",
      date: "二〇二六年一月",
      sections: [
        { page: 1, title: "封面", kind: "cover" },
        { page: 2, title: "目录", kind: "contents" },
        { page: 3, title: "一、项目建设背景", kind: "background", lead: "现有园区系统分散建设，数据标准不统一，需要构建统一、开放、可持续演进的数字化底座。" },
        { page: 5, title: "二、总体建设要求", kind: "technical", lead: "平台应采用分层解耦架构，满足统一身份、统一门户、数据交换和安全审计要求。" },
        { page: 8, title: "三、功能需求", kind: "functions", lead: "功能范围包括园区运营、事件协同、资产管理、数据分析和移动应用。" },
        { page: 14, title: "四、非功能性要求", kind: "performance", lead: "系统应满足性能、可靠性、安全性、兼容性和可维护性指标。" },
        { page: 18, title: "五、实施与服务要求", kind: "service", lead: "中标人应提供实施计划、驻场支持、培训、试运行和质保期运维服务。" },
        { page: 21, title: "六、验收要求", kind: "acceptance", lead: "验收分为到货验收、阶段验收和最终验收，所有交付成果应完整、可追溯。" }
      ]
    },
    contract: {
      name: "合同主要条款.pdf",
      formatLabel: "PDF 文件",
      size: "620 KB",
      pages: 12,
      projectNumber: "XYZX-2026-GK-001-FJ03",
      coverLabel: "采购附件 03",
      coverTitle: "智慧园区综合管理平台建设项目",
      coverSubtitle: "合同主要条款",
      issuer: "某市数字化发展中心",
      agency: "中远采购咨询有限公司",
      date: "二〇二六年一月",
      sections: [
        { page: 1, title: "合同封面", kind: "cover" },
        { page: 2, title: "第一条 合同主体及定义", kind: "definitions", lead: "本合同由采购人和中标供应商依据采购文件、投标文件及中标通知书订立。" },
        { page: 3, title: "第二条 合同标的与价款", kind: "price", lead: "合同总价为完成约定范围内全部工作并达到验收标准的含税总价。" },
        { page: 5, title: "第三条 实施、交付与验收", kind: "acceptance", lead: "供应商应在合同生效后按经采购人确认的实施计划完成建设和交付。" },
        { page: 7, title: "第四条 双方权利与义务", kind: "responsibilities", lead: "双方应明确项目联系人，及时协调实施条件、资料提供、成果确认等事项。" },
        { page: 9, title: "第五条 知识产权与保密", kind: "confidentiality", lead: "项目交付成果及相关资料的知识产权归属和使用范围按合同约定执行。" },
        { page: 11, title: "第六条 违约责任与争议解决", kind: "breach", lead: "任何一方未履行合同义务，应承担继续履行、采取补救措施及赔偿损失等责任。" }
      ]
    },
    clarification: {
      name: "澄清答疑纪要.pdf",
      formatLabel: "PDF 文件",
      size: "428 KB",
      pages: 6,
      projectNumber: "XYZX-2026-GK-001-CQ01",
      coverLabel: "澄清文件 01",
      coverTitle: "智慧园区综合管理平台建设项目",
      coverSubtitle: "澄清答疑纪要",
      issuer: "某市数字化发展中心",
      agency: "中远采购咨询有限公司",
      date: "二〇二六年一月二十三日",
      sections: [
        { page: 1, title: "澄清文件首页", kind: "cover" },
        { page: 2, title: "一、澄清说明", kind: "clarification", lead: "本纪要是采购文件的组成部分，与采购文件表述不一致的，以本纪要为准。" },
        { page: 3, title: "二、供应商问题答复", kind: "qa", lead: "采购人对规定时间内收到的问题统一答复，未涉及的采购要求保持不变。" },
        { page: 6, title: "三、调整事项汇总", kind: "changes", lead: "本次澄清涉及演示要求、接口清单、服务人员证明和投标截止时间四项调整。" }
      ]
    }
  };

  const spreadsheetFile = {
    name: "投标文件格式及报价清单.xlsx",
    formatLabel: "Excel 工作簿",
    size: "86 KB",
    kind: "spreadsheet",
    projectNumber: "XYZX-2026-GK-001-FJ02",
    sheets: [
      {
        name: "分项报价表",
        title: "智慧园区综合管理平台建设项目分项报价表",
        headers: ["序号", "费用类别", "内容说明", "数量", "单位", "单价（元）", "合价（元）", "备注"],
        rows: [
          ["1", "软件平台", "统一门户及权限中心", "1", "套", "¥420,000.00", "¥420,000.00", "含部署实施"],
          ["2", "软件平台", "园区运营管理平台", "1", "套", "¥680,000.00", "¥680,000.00", "含移动端"],
          ["3", "数据服务", "数据交换与治理服务", "1", "项", "¥360,000.00", "¥360,000.00", "含接口适配"],
          ["4", "实施服务", "需求调研、实施及试运行", "1", "项", "¥280,000.00", "¥280,000.00", "项目周期内"],
          ["5", "运维服务", "三年质保与驻场支持", "3", "年", "¥160,000.00", "¥480,000.00", "7×24 小时"],
          ["6", "培训服务", "管理员及业务人员培训", "4", "场", "¥15,000.00", "¥60,000.00", "不少于 20 人/场"],
          ["", "合计", "", "", "", "", "¥2,280,000.00", "含税总价"]
        ]
      },
      {
        name: "技术偏离表",
        title: "技术规格偏离表",
        headers: ["序号", "采购要求", "投标响应", "偏离情况", "证明材料", "所在页码", "确认状态", "备注"],
        rows: [
          ["1", "支持统一身份认证与单点登录", "完全响应，支持 OAuth2.0 / OIDC", "无偏离", "技术方案第 3.2 节", "技术标 P32", "已确认", ""],
          ["2", "核心页面平均响应时间≤2秒", "完全响应，目标值≤1.5秒", "正偏离", "性能测试方案", "技术标 P41", "待确认", "承诺值需终审"],
          ["3", "支持不少于 5000 个并发在线用户", "完全响应，支持 6000 并发用户", "正偏离", "容量规划说明", "技术标 P43", "已确认", ""],
          ["4", "提供三年免费质保服务", "完全响应，提供三年质保", "无偏离", "售后服务承诺", "技术标 P72", "已确认", ""]
        ]
      },
      {
        name: "商务偏离表",
        title: "商务条款偏离表",
        headers: ["序号", "商务条款", "采购文件要求", "投标响应", "偏离情况", "确认人", "确认状态", "备注"],
        rows: [
          ["1", "项目工期", "合同签订后 180 日历日内完成", "180 日历日内完成", "无偏离", "李明远", "已确认", ""],
          ["2", "付款方式", "按合同约定分阶段支付", "完全响应采购文件", "无偏离", "周慧", "已确认", ""],
          ["3", "履约保证金", "合同金额的 5%", "按合同金额的 5% 提交", "无偏离", "李明远", "已确认", ""],
          ["4", "质保期", "最终验收通过之日起 3 年", "提供 3 年免费质保", "无偏离", "陈工", "待确认", "以终审意见为准"]
        ]
      }
    ]
  };

  const params = new URLSearchParams(window.location.search);
  const fileKey = params.get("profile") || params.get("file") || "procurement";
  const requestedName = params.get("name") || "";
  const requestedFormat = params.get("format") || "";
  const requestedSize = params.get("size") || "";
  const requestedContext = params.get("context") || "项目采购文件";
  const requestedSourceUrl = params.get("url") || "";

  function inferredFormatLabel(name) {
    const meta = window.BiddingFileIcons.meta(name);
    const labels = {
      word: "Word 文档",
      pdf: "PDF 文件",
      excel: "Excel 工作簿",
      image: "图片文件",
      vector: "矢量图文件",
      archive: "压缩包"
    };
    return labels[meta.type] || meta.label;
  }

  function bidDocumentProfile(key) {
    const project = window.BiddingProjectStore && window.BiddingProjectStore.get(params.get("projectId"));
    if (params.get("projectId") && !project) return missingProjectProfile();
    const source = project && project.workspaceProfile ? window.ProjectWorkspaceData.documents(project) : window.BidDocumentFlowData || {};
    const documentKey = key === "bid-business" ? "business" : "technical";
    const bidDocument = source[documentKey];
    if (!bidDocument) return null;
    let pages = bidDocument.pages;
    if (project && project.workspaceProfile && window.BiddingBidVersions) {
      const snapshot = params.get("versionId") ? window.BiddingBidVersions.loadSnapshot(project, params.get("versionId"), documentKey) : null;
      if (Array.isArray(snapshot)) pages = snapshot.map(function (html, i) { return { number: i + 1, html: html }; });
    }
    const sections = (bidDocument.outline || []).map(function (item) {
      return { page: item.page, title: item.title, kind: "bid-section" };
    });
    if (!sections.length || sections[0].page !== 1) sections.unshift({ page: 1, title: "文件首页", kind: "bid-section" });
    return {
      name: requestedName || bidDocument.fileName,
      formatLabel: requestedFormat || inferredFormatLabel(requestedName || bidDocument.fileName),
      size: requestedSize || (project && project.workspaceProfile ? "—" : /\.pdf$/i.test(requestedName || "") ? (documentKey === "technical" ? "1.73 MB" : "2.44 MB") : (documentKey === "technical" ? "2.57 MB" : "6.40 MB")),
      kind: "bid-document",
      pages: pages.length,
      pageData: pages,
      sections: sections,
      projectNumber: project ? project.id : "BID-202601-001"
    };
  }

  function missingProjectProfile() {
    return { name: requestedName || "项目文件", formatLabel: requestedFormat || inferredFormatLabel(requestedName), size: "—", kind: "bid-document", projectNumber: params.get("projectId"), pages: 1, pageData: [{ number: 1, html: "<h1>项目记录已移除</h1><p>请返回项目列表选择当前项目。</p>" }], sections: [{ page: 1, title: "项目记录已移除", kind: "bid-section" }] };
  }
  function genericProfile() {
    const project = window.BiddingProjectStore && window.BiddingProjectStore.get(params.get("projectId"));
    if (params.get("projectId") && !project) return missingProjectProfile();
    if (project && project.workspaceProfile && fileKey === "project-source") {
      return { name: requestedName || project.fileName, formatLabel: requestedFormat || inferredFormatLabel(requestedName), size: requestedSize || "—", kind: "bid-document", projectNumber: project.id,
        pages: 1, pageData: [{ number: 1, html: "<h1>" + escapeHtml(requestedName || project.fileName) + "</h1><p>项目：" + escapeHtml(project.name) + "</p><p>采购人：" + escapeHtml(project.purchaser) + "</p><p>" + escapeHtml(project.sourceSummary || "原始文件内容以所上传文件为准。") + "</p>" }],
        sections: [{ page: 1, title: "项目文件", kind: "bid-section" }] };
    }
    const meta = window.BiddingFileIcons.meta(requestedName);
    if (fileKey === "image" || meta.type === "image" || meta.type === "vector") {
      return {
        name: requestedName || "图片文件.svg",
        formatLabel: requestedFormat || inferredFormatLabel(requestedName),
        size: requestedSize || "—",
        kind: "image",
        pages: 1,
        sourceUrl: requestedSourceUrl,
        sections: [{ page: 1, title: "图片", kind: "image" }]
      };
    }
    if (fileKey === "package" || meta.type === "archive") {
      return {
        name: requestedName || "交付文件包.zip",
        formatLabel: requestedFormat || inferredFormatLabel(requestedName),
        size: requestedSize || "8.96 MB",
        kind: "package",
        pages: 1,
        sections: [{ page: 1, title: "文件列表", kind: "package" }],
        manifest: [
          { name: "技术标.docx", size: "2.57 MB" },
          { name: "商务标.docx", size: "6.40 MB" }
        ]
      };
    }
    return Object.assign({}, documentFiles.technical, {
      name: requestedName || "来源文件.docx",
      formatLabel: requestedFormat || inferredFormatLabel(requestedName || "来源文件.docx"),
      size: requestedSize || "—"
    });
  }

  const knownFile = fileKey === "quote" ? spreadsheetFile : documentFiles[fileKey];
  const bidFile = fileKey === "bid-technical" || fileKey === "bid-business" ? bidDocumentProfile(fileKey) : null;
  const evidenceFile = fileKey === "opportunity-evidence" && window.OpportunityEvidence ? window.OpportunityEvidence.previewProfile(window.location.hash, requestedName) : null;
  if (evidenceFile) evidenceFile.formatLabel = requestedFormat || inferredFormatLabel(evidenceFile.name);
  const file = Object.assign({}, evidenceFile || bidFile || knownFile || genericProfile());
  if (requestedName) file.name = requestedName;
  if (requestedFormat) file.formatLabel = requestedFormat;
  if (requestedSize) file.size = requestedSize;
  file.context = requestedContext;
  const state = { index: Math.max(1, Number(params.get("page")) || 1), zoom: 100, nav: "pages" };
  let autoPageTimer = null;
  let scrollFrame = 0;

  function totalItems() { return file.kind === "spreadsheet" ? file.sheets.length : file.pages; }
  function isPagedDocument() { return file.kind !== "spreadsheet" && file.kind !== "image" && file.kind !== "package"; }

  function tableMarkup(headers, rows) {
    return '<table class="document-table"><thead><tr>' + headers.map(function (item) { return "<th>" + item + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.map(function (row) {
      return "<tr>" + row.map(function (item) { return "<td>" + item + "</td>"; }).join("") + "</tr>";
    }).join("") + "</tbody></table>";
  }

  function currentSection(pageIndex) {
    const targetPage = Number(pageIndex) || state.index;
    let section = file.sections[0];
    file.sections.forEach(function (item) { if (item.page <= targetPage) section = item; });
    return section;
  }

  function documentHeader() {
    return '<div class="document-page-head"><span>' + escapeHtml(file.name) + '</span><span>项目编号：' + escapeHtml(file.projectNumber) + "</span></div>";
  }

  function coverMarkup() {
    return '<div class="document-cover">' +
      '<span class="document-cover-mark">' + escapeHtml(file.coverLabel) + "</span>" +
      "<h1>" + escapeHtml(file.coverTitle) + "</h1>" +
      "<h2>" + escapeHtml(file.coverSubtitle) + "</h2>" +
      '<span class="document-cover-line"></span>' +
      '<div class="document-cover-info">' +
      "<p><span>项目编号：</span><strong>" + escapeHtml(file.projectNumber) + "</strong></p>" +
      "<p><span>采购人：</span><strong>" + escapeHtml(file.issuer) + "</strong></p>" +
      "<p><span>编制单位：</span><strong>" + escapeHtml(file.agency) + "</strong></p>" +
      "</div>" +
      '<p class="document-cover-date">' + escapeHtml(file.date) + "</p>" +
      "</div>";
  }

  function contentsMarkup(pageIndex) {
    return documentHeader() + '<h1 class="document-title">目&nbsp;&nbsp;录</h1><div class="document-toc">' + file.sections.filter(function (item) { return item.kind !== "cover" && item.kind !== "contents"; }).map(function (item) {
      return '<div class="document-toc-row"><span>' + escapeHtml(item.title) + '</span><i></i><strong>' + item.page + "</strong></div>";
    }).join("") + '</div><div class="document-page-number">— ' + pageIndex + " —</div>";
  }

  function sectionTable(section) {
    const tables = {
      invitation: {
        headers: ["项目事项", "采购信息"],
        rows: [["项目名称", "智慧园区综合管理平台建设项目"], ["预算金额", "人民币 2,400,000.00 元"], ["采购方式", "公开招标"], ["投标截止时间", "2026 年 2 月 6 日 09:30"], ["递交方式", "电子投标文件在线递交"]]
      },
      instructions: {
        headers: ["条款号", "条款名称", "具体要求"],
        rows: [["2.1", "采购资金", "财政资金，已落实"], ["4.2", "投标有效期", "自投标截止之日起 90 日历日"], ["9.1", "投标保证金", "人民币 40,000.00 元"], ["15.3", "签署要求", "按指定位置加盖电子签章"]]
      },
      qualification: {
        headers: ["序号", "资格条件", "证明材料"],
        rows: [["1", "具有独立承担民事责任的能力", "营业执照或法人证书"], ["2", "具有良好的商业信誉和健全的财务制度", "财务状况报告或资信证明"], ["3", "具有履行合同所必需的设备和专业技术能力", "书面声明及相关证明"], ["4", "参加采购活动前三年内无重大违法记录", "无重大违法记录声明"]]
      },
      scoring: {
        headers: ["评分项目", "分值", "主要评分标准"],
        rows: [["报价部分", "30 分", "满足采购文件要求且投标价格最低的报价为评标基准价"], ["技术方案", "34 分", "总体架构、功能设计、数据治理、安全与性能方案"], ["实施与服务", "20 分", "实施计划、团队配置、培训、运维和应急保障"], ["企业能力", "16 分", "类似业绩、体系认证、项目团队及服务能力"]]
      },
      technical: {
        headers: ["编号", "建设内容", "关键要求"],
        rows: [["T-01", "统一门户", "统一入口、单点登录、个性化工作台"], ["T-02", "园区运营", "事件处置、资产管理、服务协同"], ["T-03", "数据治理", "数据标准、交换任务、质量监控、指标管理"], ["T-04", "安全运维", "日志审计、监控告警、备份恢复、权限管控"]]
      },
      functions: {
        headers: ["功能域", "功能模块", "响应要求"],
        rows: [["园区运营", "事件协同中心", "支持上报、派单、处置、回访和闭环统计"], ["资产管理", "设施设备台账", "支持编码、巡检、维保、故障和寿命周期管理"], ["数据分析", "运营驾驶舱", "支持多维指标、趋势分析和专题看板"], ["移动应用", "移动工作台", "支持待办、巡检、事件处置和消息提醒"]]
      },
      performance: {
        headers: ["指标类别", "指标要求", "验收方式"],
        rows: [["页面响应", "常用操作平均响应时间不超过 2 秒", "性能测试报告"], ["并发能力", "支持不少于 5,000 个并发在线用户", "压力测试"], ["可用性", "年度可用性不低于 99.9%", "运行监测记录"], ["安全性", "满足等保三级相关技术要求", "测评报告与整改记录"]]
      },
      service: {
        headers: ["服务事项", "最低要求", "交付成果"],
        rows: [["驻场实施", "不少于 4 名核心人员，关键阶段现场支持", "驻场记录、周报"], ["培训服务", "不少于 4 场，每场不少于 20 人", "培训材料、签到表"], ["故障响应", "重大故障 15 分钟响应，2 小时到场", "工单与服务报告"], ["质保运维", "最终验收后提供 3 年免费质保", "年度运维报告"]]
      },
      acceptance: {
        headers: ["验收阶段", "验收条件", "主要成果"],
        rows: [["到货验收", "软硬件到场且清单一致", "到货清单、授权证明"], ["阶段验收", "核心功能完成并通过测试", "测试报告、问题清单"], ["试运行", "连续稳定运行不少于 30 日", "试运行报告、运行记录"], ["最终验收", "全部整改完成、资料齐全", "验收报告、交付清单"]]
      },
      price: {
        headers: ["价款事项", "合同约定"],
        rows: [["合同总价", "以中标通知书和最终合同签署金额为准"], ["预付款", "合同生效并收到合规发票后支付合同价款的 20%"], ["阶段款", "通过阶段验收后支付合同价款的 50%"], ["尾款", "最终验收通过并完成资料移交后支付剩余价款"]]
      },
      qa: {
        headers: ["序号", "供应商问题", "采购人答复"],
        rows: [["1", "原型演示是否必须连接真实业务数据？", "无需连接生产数据，可使用与采购业务一致的模拟数据。"], ["2", "第三方系统接口文档何时提供？", "中标后由采购人统一协调提供，投标阶段按附件接口清单设计。"], ["3", "项目经理社保证明需要提供几个月？", "提供投标截止日前连续 6 个月的社保证明。"], ["4", "是否接受联合体投标？", "本项目不接受联合体投标。"]]
      },
      changes: {
        headers: ["调整事项", "原要求", "调整后要求"],
        rows: [["投标截止时间", "2026-02-03 09:30", "调整为 2026-02-06 09:30"], ["演示时长", "不超过 20 分钟", "调整为不超过 25 分钟"], ["接口清单", "采购文件正文说明", "以澄清附件 1 的接口清单为准"], ["人员证明", "近 3 个月社保", "调整为近 6 个月连续社保"]]
      }
    };
    const selected = tables[section.kind] || {
      headers: ["序号", "条款事项", "内容说明"],
      rows: [["1", "适用范围", "本条款适用于本项目采购、实施、交付和验收活动。"], ["2", "响应要求", "投标人应结合采购文件提供完整、明确且可验证的响应。"], ["3", "证明要求", "涉及资质、业绩、人员及承诺的，应提供真实有效的证明材料。"]]
    };
    return tableMarkup(selected.headers, selected.rows);
  }

  function sectionMarkup(section, pageIndex) {
    const offset = pageIndex - section.page + 1;
    const titles = ["适用范围与总体要求", "工作内容与执行标准", "材料提交及审查要求", "实施控制与成果确认"];
    const clauseTitle = titles[(offset - 1) % titles.length];
    return documentHeader() +
      '<h1 class="document-title">' + escapeHtml(section.title) + "</h1>" +
      '<h2 class="document-section-title">' + offset + ". " + clauseTitle + "</h2>" +
      "<p>投标人应根据采购文件规定的范围、标准和时间要求逐项作出实质性响应。响应内容应与投标文件其他章节保持一致，并明确对应的技术方案、商务承诺和证明材料。</p>" +
      sectionTable(section) +
      '<div class="document-page-number">— ' + pageIndex + " —</div>";
  }

  function renderDocument() {
    one("#previewDocumentPages").innerHTML = Array.from({ length: file.pages }, function (_, index) {
      const pageIndex = index + 1;
      if (file.kind === "bid-document") {
        const page = file.pageData[index] || { html: "" };
        return '<article class="preview-paper bid-document-paper" id="previewDocumentPage-' + pageIndex + '" data-document-page="' + pageIndex + '" aria-label="第 ' + pageIndex + ' 页"><div class="bid-preview-content">' + page.html + '</div><div class="document-page-number">— ' + pageIndex + " —</div></article>";
      }
      const section = currentSection(pageIndex);
      let content = sectionMarkup(section, pageIndex);
      if (section.kind === "cover") content = coverMarkup();
      else if (section.kind === "contents") content = contentsMarkup(pageIndex);
      return '<article class="preview-paper" id="previewDocumentPage-' + pageIndex + '" data-document-page="' + pageIndex + '" aria-label="第 ' + pageIndex + ' 页">' + content + "</article>";
    }).join("");
  }

  function renderImage() {
    const image = one("#previewImageContent");
    image.src = file.sourceUrl || "../assets/knowledge-files/knowledge-source-sample.svg";
    image.alt = file.name;
  }

  function renderPackage() {
    one("#previewPackageName").textContent = file.name;
    one("#previewPackageSummary").textContent = (file.manifest || []).length + " 个文件 · " + file.size;
    one("#previewPackageList").innerHTML = (file.manifest || []).map(function (item) {
      return '<div>' + window.BiddingFileIcons.markup(item.name, "package-content-icon") + '<span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.size || "—") + "</small></span></div>";
    }).join("");
  }

  function sheetColumns(count) {
    return Array.from({ length: count }, function (_, index) { return String.fromCharCode(65 + index); });
  }

  function renderSpreadsheet() {
    const sheet = file.sheets[state.index - 1];
    const columns = sheetColumns(sheet.headers.length);
    const minimumRows = 18;
    const rowData = sheet.rows.concat(Array.from({ length: Math.max(0, minimumRows - sheet.rows.length) }, function () { return []; }));
    const head = '<thead><tr><th class="excel-corner"></th>' + columns.map(function (letter) { return "<th>" + letter + "</th>"; }).join("") + "</tr></thead>";
    let body = '<tbody><tr class="sheet-title-row"><th class="excel-row-number">1</th><td colspan="' + sheet.headers.length + '">' + escapeHtml(sheet.title) + "</td></tr>";
    body += '<tr class="sheet-header-row"><th class="excel-row-number">2</th>' + sheet.headers.map(function (value, columnIndex) {
      return '<td data-cell-name="' + columns[columnIndex] + '2">' + escapeHtml(value) + "</td>";
    }).join("") + "</tr>";
    rowData.forEach(function (row, rowIndex) {
      const excelRow = rowIndex + 3;
      body += '<tr><th class="excel-row-number">' + excelRow + "</th>" + columns.map(function (letter, columnIndex) {
        const value = row[columnIndex] || "";
        const cellClass = /¥|^[\d,.]+$/.test(value) ? "number" : "";
        return '<td class="' + cellClass + '" data-cell-name="' + letter + excelRow + '" data-cell-value="' + escapeHtml(value) + '">' + escapeHtml(value) + "</td>";
      }).join("") + "</tr>";
    });
    body += "</tbody>";
    one("#spreadsheetGridWrap").innerHTML = '<table class="excel-grid">' + head + body + "</table>";
    one("#spreadsheetSheetbar").innerHTML = file.sheets.map(function (item, index) {
      return '<button class="spreadsheet-sheet-tab' + (index + 1 === state.index ? " active" : "") + '" type="button" data-sheet-index="' + (index + 1) + '">' + escapeHtml(item.name) + "</button>";
    }).join("");
    const firstCell = one(".excel-grid td[data-cell-name]");
    if (firstCell) selectSpreadsheetCell(firstCell);
  }

  function selectSpreadsheetCell(cell) {
    all(".excel-grid td.selected").forEach(function (item) { item.classList.remove("selected"); });
    cell.classList.add("selected");
    one("#spreadsheetCellName").textContent = cell.getAttribute("data-cell-name") || "A1";
    one("#spreadsheetFormulaValue").textContent = cell.getAttribute("data-cell-value") || cell.textContent.trim();
  }

  function thumbnailDocumentMarkup(index) {
    if (index === 1) return '<span class="preview-thumbnail-sheet is-cover"></span>';
    return '<span class="preview-thumbnail-sheet"><i class="preview-thumb-line title"></i><i class="preview-thumb-line"></i><i class="preview-thumb-line medium"></i><i class="preview-thumb-line"></i><i class="preview-thumb-line short"></i><i class="preview-thumb-line"></i><i class="preview-thumb-line medium"></i><i class="preview-thumb-line short"></i></span>';
  }

  function thumbnailSheetMarkup() {
    return '<span class="preview-sheet-thumbnail">' + Array.from({ length: 25 }, function () { return "<i></i>"; }).join("") + "</span>";
  }

  function renderNavigation() {
    const total = totalItems();
    one("#previewThumbnailList").innerHTML = Array.from({ length: total }, function (_, index) {
      const itemIndex = index + 1;
      const label = file.kind === "spreadsheet" ? file.sheets[index].name : "第 " + itemIndex + " 页";
      const visual = file.kind === "spreadsheet" ? thumbnailSheetMarkup() : thumbnailDocumentMarkup(itemIndex);
      return '<button class="preview-thumbnail-btn' + (itemIndex === state.index ? " active" : "") + '" type="button" data-preview-index="' + itemIndex + '" aria-label="打开' + escapeHtml(label) + '">' + visual + "<span>" + escapeHtml(label) + "</span></button>";
    }).join("");

    const outlineItems = file.kind === "spreadsheet" ? file.sheets.map(function (sheet, index) {
      return { title: sheet.name, page: index + 1 };
    }) : file.sections.map(function (section) { return { title: section.title, page: section.page }; });
    one("#previewOutlineList").innerHTML = outlineItems.map(function (item) {
      const active = file.kind === "spreadsheet" ? item.page === state.index : item.page === currentSection().page;
      return '<button class="preview-outline-item' + (active ? " active" : "") + '" type="button" data-preview-index="' + item.page + '"><span>' + escapeHtml(item.title) + "</span><span>" + item.page + "</span></button>";
    }).join("");
  }

  function updateToolbar() {
    const total = totalItems();
    const isSheet = file.kind === "spreadsheet";
    one("#previewPageInput").value = state.index;
    one("#previewPageInput").max = total;
    one("#previewPageTotal").textContent = "/ " + total;
    one("#previewPreviousPage").disabled = state.index <= 1;
    one("#previewNextPage").disabled = state.index >= total;
    one("#previewZoomValue").textContent = state.zoom + "%";
    one("#previewPageFieldLabel").textContent = isSheet ? "当前工作表" : "当前页";
    one("#previewPagesTabLabel").textContent = isSheet ? "工作表" : "页面";
    one("#previewToolbarStatus").textContent = isSheet ? "工作表 " + state.index + " / " + total + " · " + file.sheets[state.index - 1].name : "第 " + state.index + " / " + total + " 页";
    one("#previewAutoPage").hidden = !isPagedDocument();
    document.documentElement.style.setProperty("--preview-zoom", String(state.zoom / 100));
  }

  function scrollActiveThumbnailIntoView() {
    const active = one(".preview-thumbnail-btn.active");
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function updateActiveNavigation() {
    all(".preview-thumbnail-btn").forEach(function (button) {
      button.classList.toggle("active", Number(button.getAttribute("data-preview-index")) === state.index);
    });
    const activeSectionPage = file.kind === "spreadsheet" ? state.index : currentSection(state.index).page;
    all(".preview-outline-item").forEach(function (button) {
      button.classList.toggle("active", Number(button.getAttribute("data-preview-index")) === activeSectionPage);
    });
    scrollActiveThumbnailIntoView();
  }

  function scrollDocumentPageIntoView(behavior) {
    if (!isPagedDocument()) return;
    const target = one('[data-document-page="' + state.index + '"]');
    if (target) target.scrollIntoView({ block: "start", behavior: behavior || "smooth" });
  }

  function setAutoPageState(isPlaying) {
    const button = one("#previewAutoPage");
    button.setAttribute("aria-pressed", String(isPlaying));
    button.setAttribute("title", isPlaying ? "暂停自动翻页" : "开始自动翻页");
    button.innerHTML = isPlaying
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3" height="14" rx="1"/><rect x="14" y="5" width="3" height="14" rx="1"/></svg><span>暂停翻页</span>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg><span>自动翻页</span>';
  }

  function stopAutoPage() {
    if (autoPageTimer) window.clearInterval(autoPageTimer);
    autoPageTimer = null;
    setAutoPageState(false);
  }

  function startAutoPage() {
    if (!isPagedDocument()) return;
    if (state.index >= totalItems()) setIndex(1, { behavior: "smooth" });
    setAutoPageState(true);
    autoPageTimer = window.setInterval(function () {
      if (state.index >= totalItems()) {
        stopAutoPage();
        return;
      }
      setIndex(state.index + 1, { behavior: "smooth" });
    }, 3500);
  }

  function syncPageFromScroll() {
    scrollFrame = 0;
    if (!isPagedDocument()) return;
    const canvas = one("#previewCanvas");
    const canvasRect = canvas.getBoundingClientRect();
    const focusLine = canvasRect.top + Math.min(180, canvasRect.height * .28);
    let visiblePage = state.index;
    all("[data-document-page]").some(function (paper) {
      const rect = paper.getBoundingClientRect();
      if (rect.top <= focusLine) visiblePage = Number(paper.getAttribute("data-document-page"));
      return rect.top <= focusLine && rect.bottom > focusLine;
    });
    if (visiblePage !== state.index) {
      state.index = visiblePage;
      updateToolbar();
      updateActiveNavigation();
    }
  }

  function render() {
    const isSheet = file.kind === "spreadsheet";
    const isImage = file.kind === "image";
    const isPackage = file.kind === "package";
    one("#previewDocumentStage").hidden = !isPagedDocument();
    one("#previewSpreadsheetStage").hidden = !isSheet;
    one("#previewImageStage").hidden = !isImage;
    one("#previewPackageStage").hidden = !isPackage;
    if (isSheet) renderSpreadsheet();
    else if (isImage) renderImage();
    else if (isPackage) renderPackage();
    else renderDocument();
    renderNavigation();
    updateToolbar();
    one("#previewCanvas").scrollTo({ top: 0, left: 0 });
    scrollActiveThumbnailIntoView();
    if (isPagedDocument() && state.index > 1) window.requestAnimationFrame(function () { scrollDocumentPageIntoView("auto"); });
  }

  function setIndex(nextIndex, options) {
    state.index = Math.max(1, Math.min(totalItems(), Number(nextIndex) || 1));
    if (file.kind === "spreadsheet") {
      render();
      return;
    }
    updateToolbar();
    updateActiveNavigation();
    if (!options || options.scroll !== false) scrollDocumentPageIntoView(options && options.behavior);
  }

  function setZoom(nextZoom) {
    state.zoom = Math.max(50, Math.min(200, Math.round(nextZoom / 5) * 5));
    updateToolbar();
    if (isPagedDocument()) window.requestAnimationFrame(function () { scrollDocumentPageIntoView("auto"); });
  }

  function changeZoom(direction) {
    const steps = [50, 60, 75, 90, 100, 110, 125, 150, 175, 200];
    const currentIndex = steps.reduce(function (closest, value, index) { return Math.abs(value - state.zoom) < Math.abs(steps[closest] - state.zoom) ? index : closest; }, 0);
    setZoom(steps[Math.max(0, Math.min(steps.length - 1, currentIndex + direction))]);
  }

  function initIdentity() {
    const format = window.BiddingFileIcons.meta(file.name);
    const icon = one("#previewFileIcon");
    icon.className = "file-type-icon type-" + format.type;
    icon.setAttribute("aria-label", format.label);
    icon.setAttribute("title", format.label);
    icon.innerHTML = '<span class="file-format-mark">' + escapeHtml(format.mark) + "</span>";
    one("#previewFileName").textContent = file.name;
    one("#previewFileMeta").textContent = file.formatLabel + " · " + file.size + " · " + file.context;
    document.title = file.name + " - 文件预览";
  }

  function initEvents() {
    const canvas = one("#previewCanvas");
    one("#closeFilePreview").addEventListener("click", function () { window.close(); });
    one("#previewPreviousPage").addEventListener("click", function () { stopAutoPage(); setIndex(state.index - 1); });
    one("#previewNextPage").addEventListener("click", function () { stopAutoPage(); setIndex(state.index + 1); });
    one("#previewPageInput").addEventListener("change", function () { stopAutoPage(); setIndex(this.value); });
    one("#previewAutoPage").addEventListener("click", function () {
      if (autoPageTimer) stopAutoPage();
      else startAutoPage();
    });
    one("#previewZoomOut").addEventListener("click", function () { changeZoom(-1); });
    one("#previewZoomIn").addEventListener("click", function () { changeZoom(1); });
    one("#previewFitWidth").addEventListener("click", function () {
      if (file.kind === "spreadsheet") { setZoom(100); return; }
      const availableWidth = one("#previewCanvas").clientWidth - 100;
      setZoom(Math.min(150, Math.max(50, availableWidth / 794 * 100)));
    });
    one("#togglePreviewSidebar").addEventListener("click", function () {
      const sidebar = one("#previewSidebar");
      const willCollapse = !sidebar.classList.contains("is-collapsed");
      sidebar.classList.toggle("is-collapsed", willCollapse);
      this.setAttribute("aria-pressed", String(!willCollapse));
      this.setAttribute("title", willCollapse ? "展开导航栏" : "收起导航栏");
    });
    document.addEventListener("click", function (event) {
      const navTab = event.target.closest("[data-preview-nav]");
      if (navTab) {
        state.nav = navTab.getAttribute("data-preview-nav");
        all("[data-preview-nav]").forEach(function (button) {
          const active = button === navTab;
          button.classList.toggle("active", active);
          button.setAttribute("aria-selected", String(active));
        });
        one("#previewPagesPanel").hidden = state.nav !== "pages";
        one("#previewOutlinePanel").hidden = state.nav !== "outline";
        return;
      }
      const previewIndex = event.target.closest("[data-preview-index]");
      if (previewIndex) { stopAutoPage(); setIndex(previewIndex.getAttribute("data-preview-index")); return; }
      const sheetTab = event.target.closest("[data-sheet-index]");
      if (sheetTab) { setIndex(sheetTab.getAttribute("data-sheet-index")); return; }
      const spreadsheetCell = event.target.closest(".excel-grid td[data-cell-name]");
      if (spreadsheetCell) selectSpreadsheetCell(spreadsheetCell);
    });
    canvas.addEventListener("scroll", function () {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(syncPageFromScroll);
    });
    canvas.addEventListener("wheel", function () { if (autoPageTimer) stopAutoPage(); }, { passive: true });
    canvas.addEventListener("pointerdown", function () { if (autoPageTimer) stopAutoPage(); });
    document.addEventListener("keydown", function (event) {
      if (event.target.matches("input")) return;
      if (event.key === "PageUp" || event.key === "ArrowLeft") { event.preventDefault(); stopAutoPage(); setIndex(state.index - 1); }
      if (event.key === "PageDown" || event.key === "ArrowRight") { event.preventDefault(); stopAutoPage(); setIndex(state.index + 1); }
      if ((event.ctrlKey || event.metaKey) && (event.key === "+" || event.key === "=")) { event.preventDefault(); changeZoom(1); }
      if ((event.ctrlKey || event.metaKey) && event.key === "-") { event.preventDefault(); changeZoom(-1); }
    });
    window.addEventListener("beforeunload", function () { if (autoPageTimer) window.clearInterval(autoPageTimer); });
  }

  function init() {
    state.index = Math.min(totalItems(), state.index);
    initIdentity();
    initEvents();
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
