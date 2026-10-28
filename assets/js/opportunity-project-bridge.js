(function () {
  "use strict";
  // Shared workbench data binding for both creation paths.
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function text(selector, value) { const node = document.querySelector(selector); if (node) node.textContent = value; }
  function analysis(project) {
    return { name: project.name, purchaser: project.purchaser || "待补充", budget: project.budget || "待补充", deadline: project.deadline || "待补充",
      summary: project.sourceSummary || "围绕“" + project.name + "”完成需求梳理、方案设计、交付实施及验收，具体范围以主招标文件为准。",
      qualification: project.qualification || "营业执照、信用记录及项目专项资格材料需结合招标文件确认。",
      fileName: project.fileName, forecastScore: 84, pages: 34, requirementCount: 93, at: new Date().toISOString(),
      fileVersion: (project.files || []).map(function (file) { return { name: file.name, version: Number(file.version || 1) }; }) };
  }
  function documents(project) {
    const a = project.analysis || analysis(project);
    const titles = {
      technical: ["项目理解与建设目标", "需求响应与功能方案", "系统架构与数据接入", "实施计划与交付安排", "测试及验收方案", "项目组织与安全保障", "服务支持方案", "关键承诺及响应偏离"],
      business: ["投标函与项目基本信息", "报价表与报价说明", "法定代表人与授权材料", "企业基本资料", "同类项目业绩", "拟投入人员与证明材料", "商务条款响应", "资格证明与有效期"]
    };
    const result = {};
    ["technical", "business"].forEach(function (id) {
      const name = id === "technical" ? "技术标" : "商务标";
      result[id] = { id: id, name: name, fileName: name + ".docx", source: project.fileName, pageCount: titles[id].length,
        outline: titles[id].map(function (title, i) { return { title: title, page: i + 1, level: 1 }; }),
        pages: titles[id].map(function (title, i) {
          let content = '<h1>' + esc(title) + '</h1><p>项目名称：' + esc(project.name) + '</p><p>采购人：' + esc(project.purchaser || "待补充") + '</p>';
          if (id === "technical") content += '<p>' + esc(a.summary) + '</p><p>本章节围绕“' + esc(title) + '”编制响应内容，交付范围与实施安排应逐项对应采购要求。</p>';
          else content += '<p>招标编号：' + esc(project.tenderNumber || "待补充") + '</p><p>' + esc(i === 7 ? a.qualification : "本节材料按本项目采购文件及企业实际资料编制。") + '</p>';
          content += '<p class="project-review-slot">' + (id === "business" && i === 1 ? '报价及税率：待人工确认，尚未填写正式报价。' : '相关材料、数量指标和对外承诺：待补充或确认，不以 AI 生成内容代替真实证明。') + '</p>';
          return { number: i + 1, html: content };
        }) };
    });
    return result;
  }
  function source(root, project) {
    if (!project.opportunityId) return;
    const snapshot = project.sourceOpportunity || {}, saved = snapshot.assessment || {}, records = snapshot.history || [];
    const score = saved.result ? saved.result.score : project.opportunityScore;
    const block = document.createElement("div"); block.className = "project-source-summary";
    block.innerHTML = '<div class="inline-actions"><a class="text-btn compact-btn" href="opportunity-detail.html?id=' + encodeURIComponent(project.opportunityId) + '"><span class="btn-icon"><svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></svg></span><span>查看来源机会</span></a><span class="status-tag blue">招标机会转入</span><span>机会初评 ' + esc(score == null ? "—" : score) + ' 分 · 公告 V' + esc(project.opportunityRevision || snapshot.revision || 1) + '</span></div><details><summary>转入时的初评与确认记录</summary><p>评估时间：' + esc(saved.at || "—") + '　规则版本：V' + esc(saved.ruleRevision || (saved.rule || {}).revision || 1) + '</p><p>公告信息：' + esc(snapshot.summary || project.sourceSummary) + '</p><p>确认人：' + esc(snapshot.confirmedBy || (records[0] || {}).user || project.owner) + '　确认时间：' + esc(snapshot.confirmedAt || (records[0] || {}).at || project.createdAt) + '</p>' + records.map(function (record) { return '<p>' + esc(record.action + ' · ' + record.at + ' · ' + (record.note || "无备注")) + '</p>'; }).join("") + '</details>';
    root.querySelector(".project-identity-main").appendChild(block);
    if (saved.result && saved.result.details) block.querySelector("details").insertAdjacentHTML("beforeend", saved.result.details.map(function (detail) { return '<p>' + esc(detail.name + '：' + detail.score + ' 分 · ' + (detail.evidence || "待补充依据")) + '</p>'; }).join(""));
    if (project.sourceReturnUrl && /^opportunity-detail\.html\?/.test(project.sourceReturnUrl)) block.querySelector("a").setAttribute("href", project.sourceReturnUrl);
    if (project.opportunityChange) {
      const warning = document.createElement("div"); warning.className = "info-alert warning";
      warning.innerHTML = '<span class="btn-icon"><svg viewBox="0 0 24 24"><path d="M12 3 2 21h20zM12 9v5M12 17h.01"/></svg></span><div><strong>来源公告已更新</strong><span>' + esc(project.opportunityChange) + '；请对照项目文件核对影响，需要时补传文件并重新解析。</span></div>';
      root.appendChild(warning);
    }
  }
  function prepareFiles(project) {
    const body = document.getElementById("projectFileTableBody"); if (!body) return;
    const template = body.querySelector("tr").cloneNode(true); body.replaceChildren();
    (project.files || []).forEach(function (file) {
      const row = template.cloneNode(true);
      row.dataset.main = String(Boolean(file.main)); row.dataset.kind = file.kind || "uploaded"; row.dataset.version = String(file.version || 1);
      row.dataset.fileType = file.main ? "main" : "attachment";
      row.querySelector(".cell-stack strong").textContent = file.name;
      row.querySelector(".cell-stack span").textContent = project.owner + ' · V' + (file.version || 1);
      row.children[1].textContent = file.main ? "主招标文件" : "附件"; row.children[2].textContent = file.size; body.appendChild(row);
    });
    text("#projectFileCount", String(project.files.length));
    const node = document.getElementById("projectFileCount");
    if (node && node.nextElementSibling) node.nextElementSibling.textContent = '主文件 1、附件 ' + Math.max(0, project.files.length - 1);
    if (project.filesChanged) { text("#fileParseStatusTitle", "文件清单已发生变化"); text("#fileParseStatusDescription", "变更文件尚未参与解析，请重新解析后核对受影响的内容。"); text("#fileParseStatusTag", "待重新解析"); }
  }
  function prepareAnalysis(project) {
    const a = project.analysis || analysis(project);
    const facts = [a.purchaser, a.budget, a.deadline, "待确认", "综合评分法", "待确认", a.purchaser, "待人工报价", a.summary, "按文件要求配置", "按文件要求执行", "按文件要求执行"];
    document.querySelectorAll(".result-project-facts > div > strong").forEach(function (node, i) { node.textContent = facts[i] || "待确认"; });
    text("#resultForecastScore", a.forecastScore); text(".result-title-line > strong", "建议完善后编制"); text(".result-title-line .status-tag", "待补充材料");
    text("#businessForecastScore", a.forecastScore === 86 ? "预测 8 分" : "预测 6 分");
    text("#businessReadinessValue", a.forecastScore === 86 ? "80%" : "60%");
    const readiness = document.getElementById("businessReadinessTrack"); if (readiness) readiness.style.width = a.forecastScore === 86 ? "80%" : "60%";
    text("#resultRecommendationText", "已整理本项目采购要求，需补充资格、人员、业绩等真实材料，并确认报价和关键承诺后继续编制。" + (project.opportunityId ? "机会初评及确认记录独立保留。" : ""));
    const factsPanel = document.querySelector(".result-project-facts");
    if (factsPanel) { const hint = factsPanel.closest("article").querySelector(".panel-heading p"); if (hint && project.opportunityId) hint.textContent = "公告信息已带入，请结合当前招标文件核对正式条款。"; }
    const requirements = {
      qualification: [a.qualification, "核对营业执照、信用及专项资格证明，材料缺失需人工补充。", "不满足"],
      score: ["结合本项目需求提供实施方案、同类业绩和人员证明。", "方案可由 AI 整理；企业业绩及人员证明必须来自真实材料。", "AI处理"],
      business: ["核对报价、付款、履约与商务偏离要求。", "报价及对外承诺待人工确认，按企业实际情况填写。", "AI处理"],
      technical: [a.summary, "按本项目需求编制功能、实施、数据及安全响应内容。", "AI处理"],
      delivery: ["按采购文件组织响应目录、签章、提交与验收文件。", "按本项目要求整理目录和交付材料。", "AI处理"]
    };
    document.querySelectorAll("#resultMatterBody tr").forEach(function (row) {
      const value = requirements[row.dataset.resultCategory]; if (!value) return;
      row.children[1].textContent = value[0]; row.children[2].innerHTML = '<span class="matter-strategy">' + esc(value[1]) + '</span><small>本项目响应建议</small>';
      row.children[3].innerHTML = '<span class="status-tag ' + (value[2] === "不满足" ? "red" : "blue") + '">' + value[2] + '</span>';
      const button = row.querySelector(".result-source-btn");
      button.dataset.section = { qualification: "资格要求", score: "评分要求", business: "商务要求", technical: "技术要求", delivery: "文件与交付" }[row.dataset.resultCategory];
      const type = row.querySelector(".matrix-type"); if (type) type.textContent = button.dataset.section;
      button.dataset.file = project.fileName; button.dataset.original = value[0]; button.dataset.title = "本项目采购要求"; button.dataset.source = project.fileName + ' · 第' + button.dataset.page + '页';
      button.querySelector("span").textContent = button.dataset.source;
    });
    text(".result-source-paper-brand", project.name);
    document.querySelectorAll(".result-source-paper footer span").forEach(function (node) { node.textContent = project.fileName; });
    text("#personMaterialFactor em", "人员及资格证明需补充真实材料");
    text("#confirmGenerateModal .generate-summary strong", "生成本项目响应文件");
    text("#confirmGenerateModal .generate-summary span", "技术标 8 页、商务标 8 页，按当前项目采购要求建立响应关联。");
    text(".forecast-quick-list .green-text", "待补充材料");
    document.querySelectorAll(".score-impact-list em, .score-factor-list em").forEach(function (node) { node.textContent = "根据本项目要求核对相关证明材料"; });
    document.querySelectorAll(".readiness-factor-list em").forEach(function (node) { node.textContent = "根据本项目要求核对相关证明材料"; });
    text(".result-evidence-line", "已解析 34 页 · 识别 93 项要求 · 企业材料待补充 · 拆解 7 项评分因素");
    text(".readiness-row:first-child strong", "待补充");
    const bar = document.querySelector(".readiness-row:first-child .readiness-track b"); if (bar) bar.style.width = "0%";
  }
  function prepareDelivery(project) {
    const list = document.getElementById("deliveryArchiveFileList"); if (!list) return;
    const template = list.querySelector("[data-archive-shared]"); if (!template) return;
    const sample = template.cloneNode(true); list.querySelectorAll("[data-archive-shared]").forEach(function (node) { node.remove(); });
    project.files.forEach(function (file) { const node = sample.cloneNode(true); node.querySelector("strong").textContent = file.name; node.querySelector("small").textContent = file.size + ' · V' + (file.version || 1); const icon = node.querySelector(".file-type-icon"); if (icon) icon.outerHTML = window.BiddingFileIcons.markup(file.name); list.appendChild(node); });
    document.querySelectorAll("[data-knowledge-item] strong").forEach(function (node, i) { node.textContent = [project.name + '技术方案', project.name + '商务响应', project.name + '交付材料'][i % 3]; });
    document.querySelectorAll(".delivery-package-files small").forEach(function (node) { node.textContent = "人工审核通过内容 · 共 8 页"; });
    document.querySelectorAll(".delivery-package-card footer > span").forEach(function (node) { node.textContent = "2 份文件 · 正式交付版本"; });
    document.querySelectorAll("[data-delivery-preview]").forEach(function (node) { node.dataset.previewSize = "—"; });
  }
  function prepare(section, project) {
    if (section === "files") prepareFiles(project);
    if (!project.workspaceProfile) return;
    if (section === "analysis") prepareAnalysis(project);
    if (section === "delivery") prepareDelivery(project);
    document.querySelectorAll(".workspace-content small, .workspace-content span, .workspace-content strong, .prototype-modal p, .prototype-modal small").forEach(function (node) {
      if (!node.children.length) node.textContent = node.textContent.replace(/技术标 73 页/g, "技术标 8 页").replace(/商务标 23 页/g, "商务标 8 页").replace(/96 页/g, "16 页");
    });
  }
  window.ProjectWorkspaceData = { prepare: prepare, source: source, analysis: analysis, documents: documents };
})();
