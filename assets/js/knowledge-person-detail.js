(function () {
  "use strict";

  const data = window.KnowledgePrototypeData || { peopleRecords: [], peopleProfiles: [] };
  const requestedId = new URLSearchParams(window.location.search).get("id");
  const person = data.peopleRecords.find(function (item) { return item.id === requestedId; }) || data.peopleRecords[0];
  const profile = data.peopleProfiles.find(function (item) { return person && item.id === person.id; }) || null;
  const root = document.getElementById("personProfilePage");
  const modal = document.getElementById("personSubrecordModal");
  const validity = window.KnowledgeValidity || { info: function () { return { applicable: true, warning: false, key: "longterm", label: "长期有效", tone: "green", dateText: "无固定截止日期" }; } };
  const currentUserName = (window.AppCurrentUser && window.AppCurrentUser.name) || "李明远";
  let activeTab = "overview";
  let currentRecordType = "certificate";
  let currentRecordMode = "create";
  let currentRecordItem = null;
  let selectedFileName = "";
  let selectedFile = null;
  let subrecordParsed = false;
  let subrecordTimer = null;

  const icons = {
    back: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4"/></svg>',
    certificate: '<svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V7l-8-4z"/><path d="m9 12 2 2 4-5"/></svg>',
    project: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 5V3M16 5V3M4 9h16"/></svg>',
    material: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
    archive: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M9 13h6"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>',
    enter: '<svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 14v6h14v-6"/></svg>',
    scan: '<svg viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10M9 9h6M9 15h6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>'
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function statusTag(label, tone) {
    return '<span class="status-tag ' + (tone || "gray") + '">' + escapeHtml(label) + '</span>';
  }

  function fileCell(name, fileName, subtitle) {
    const icon = window.BiddingFileIcons ? window.BiddingFileIcons.markup(fileName, "knowledge-record-format-icon") : '<span class="file-type-icon type-generic knowledge-record-format-icon"><span class="file-format-mark">FILE</span></span>';
    return '<div class="knowledge-person-file-cell">' + icon + '<span class="knowledge-person-file-copy"><strong title="' + escapeHtml(name || "未命名资料") + '">' + escapeHtml(name || "未命名资料") + '</strong><small title="' + escapeHtml(fileName || "未关联来源文件") + '">' + escapeHtml(fileName || "未关联来源文件") + '</small>' + (subtitle ? '<small>' + escapeHtml(subtitle) + '</small>' : '') + '</span></div>';
  }

  function activeRecords(records) {
    return (records || []).filter(function (item) { return item.lifecycleState !== "archived" && !item.deleted; });
  }

  function archivedRecords() {
    const result = [];
    [["certificate", profile.certificates], ["experience", profile.experiences], ["material", profile.materials]].forEach(function (group) {
      (group[1] || []).forEach(function (item) {
        if (item.lifecycleState === "archived" && !item.deleted) result.push({ type: group[0], item: item });
      });
    });
    return result.sort(function (left, right) { return String(right.item.archivedAt || "").localeCompare(String(left.item.archivedAt || "")); });
  }

  function recordTypeLabel(type) {
    return { certificate: "证书与资质", experience: "项目经历", material: "证明材料" }[type] || "人员资料";
  }

  function recordSummary(type, item) {
    if (type === "certificate") return item.content || (item.type + " · " + item.number);
    if (type === "experience") return item.content || (item.project + " · " + item.role);
    return item.period || item.status || "资料内容已解析";
  }

  function recordActions(type, item) {
    const base = ' data-person-record-type="' + type + '" data-person-record-id="' + escapeHtml(item.id) + '"';
    if (item.lifecycleState === "archived") {
      return '<div class="knowledge-person-record-actions"><button class="text-btn compact-btn knowledge-view-btn" type="button" data-person-record-action="view"' + base + '><span class="btn-icon">' + icons.enter + '</span><span>查看</span></button><button class="danger-btn compact-btn" type="button" data-person-record-action="delete"' + base + '><span class="btn-icon">' + icons.trash + '</span><span>删除</span></button></div>';
    }
    if (person.lifecycleState === "archived") {
      return '<div class="knowledge-person-record-actions"><button class="text-btn compact-btn knowledge-view-btn" type="button" data-person-record-action="view"' + base + '><span class="btn-icon">' + icons.enter + '</span><span>查看</span></button></div>';
    }
    return '<div class="knowledge-person-record-actions"><button class="text-btn compact-btn knowledge-view-btn" type="button" data-person-record-action="view"' + base + '><span class="btn-icon">' + icons.enter + '</span><span>查看</span></button><button class="ghost-btn compact-btn" type="button" data-person-record-action="edit"' + base + '><span class="btn-icon">' + icons.edit + '</span><span>编辑</span></button><button class="ghost-btn compact-btn" type="button" data-person-record-action="archive"' + base + '><span class="btn-icon">' + icons.archive + '</span><span>归档</span></button></div>';
  }

  function sectionHead(title, description, actions) {
    return '<div class="knowledge-person-section-head"><div><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(description) + '</p></div>' + (actions ? '<div class="knowledge-person-section-actions">' + actions + '</div>' : '') + '</div>';
  }

  function emptyHtml(title, description) {
    return '<div class="knowledge-person-empty"><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(description) + '</span></div>';
  }

  function tableHtml(headings, rows) {
    return '<div class="knowledge-person-table-wrap"><table class="knowledge-person-table"><thead><tr>' + headings.map(function (item) { return '<th>' + item + '</th>'; }).join("") + '</tr></thead><tbody>' + rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td>' + cell + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div>';
  }

  function findRecord(type, id) {
    const list = type === "certificate" ? profile.certificates : type === "experience" ? profile.experiences : profile.materials;
    return (list || []).find(function (item) { return item.id === id; });
  }

  function renderShell() {
    if (!root) return;
    if (!person || !profile || person.deleted) {
      root.innerHTML = '<div class="knowledge-empty card"><strong>人员档案已删除或不存在</strong><span>请返回人员列表重新选择。</span><a class="primary-btn" href="knowledge-people.html?view=archived"><span class="btn-icon">' + icons.back + '</span><span>返回人员列表</span></a></div>';
      return;
    }
    const certificates = activeRecords(profile.certificates);
    const experiences = activeRecords(profile.experiences);
    const materials = activeRecords(profile.materials);
    const archived = archivedRecords();
    const validityWarnings = certificates.map(function (item) { return validity.info(item); }).filter(function (info) { return info.warning; });
    const expired = validityWarnings.filter(function (info) { return info.key === "expired"; }).length;
    const relatedCount = certificates.length + experiences.length + materials.length;
    const personArchived = person.lifecycleState === "archived";
    const tabs = [
      ["overview", "基本信息", 0], ["certificates", "证书与资质", certificates.length], ["experiences", "项目经历", experiences.length],
      ["materials", "证明材料", materials.length], ["references", "引用记录", profile.referencesList.length], ["archived", "已归档资料", archived.length]
    ];
    root.innerHTML = [
      '<div class="page-breadcrumb"><span>投标助手</span><span>/</span><a href="knowledge.html">知识库</a><span>/</span><a href="knowledge-people.html">人员档案</a><span>/</span><strong>' + escapeHtml(person.name) + '</strong></div>',
      '<header class="knowledge-module-heading"><div><h1>人员档案详情</h1><p>以人员为主档，分别维护证书资质、项目经历、证明材料和投标引用记录。</p></div><div class="knowledge-heading-actions"><a class="secondary-btn" href="knowledge-people.html' + (personArchived ? '?view=archived' : '') + '"><span class="btn-icon">' + icons.back + '</span><span>返回人员列表</span></a></div></header>',
      '<section class="knowledge-person-hero card"><div class="knowledge-person-avatar">' + escapeHtml(person.name.slice(0, 1)) + '</div><div class="knowledge-person-identity"><div><h2>' + escapeHtml(person.name) + '</h2>' + statusTag(personArchived ? "已归档" : "在库", personArchived ? "gray" : "green") + statusTag("已关联 " + relatedCount + " 项在库资料", "blue") + '</div><p>' + escapeHtml(profile.department) + ' · ' + escapeHtml(profile.position) + '</p><span>' + escapeHtml(person.summary) + '</span></div><div class="knowledge-person-hero-meta"><div><span>投标角色</span><strong>' + escapeHtml(profile.bidRole) + '</strong></div><div><span>档案编号</span><strong>' + escapeHtml(person.id) + '</strong></div><div><span>' + (personArchived ? '归档时间' : '最近更新') + '</span><strong>' + escapeHtml(personArchived ? person.archivedAt || "-" : person.updatedAt) + '</strong></div></div></section>',
      '<section class="knowledge-metrics" aria-label="人员档案资料概览">',
      '<article class="knowledge-metric card"><span class="knowledge-metric-icon' + (expired ? ' red' : validityWarnings.length ? ' orange' : '') + '">' + icons.certificate + '</span><div class="knowledge-metric-copy"><span>证书与资质</span><strong>' + certificates.length + '</strong><small>' + (expired ? expired + ' 项已过期 · 请立即更新' : validityWarnings.length ? validityWarnings.length + ' 项证书在 60 天内到期' : '证书有效期状态正常') + '</small></div></article>',
      '<article class="knowledge-metric card"><span class="knowledge-metric-icon cyan">' + icons.project + '</span><div class="knowledge-metric-copy"><span>项目经历</span><strong>' + experiences.length + '</strong><small>已关联可核验项目经历资料</small></div></article>',
      '<article class="knowledge-metric card"><span class="knowledge-metric-icon orange">' + icons.material + '</span><div class="knowledge-metric-copy"><span>证明材料</span><strong>' + materials.length + '</strong><small>来源文件与解析信息已关联</small></div></article>',
      '<article class="knowledge-metric card"><span class="knowledge-metric-icon">' + icons.archive + '</span><div class="knowledge-metric-copy"><span>已归档资料</span><strong>' + archived.length + '</strong><small>归档后可查看或永久删除</small></div></article>',
      '</section>',
      '<section class="knowledge-person-workbench card"><div class="knowledge-person-tabs" role="tablist">',
      tabs.map(function (tab, index) {
        const attention = tab[0] === "certificates" && validityWarnings.length;
        const archiveAttention = tab[0] === "archived" && tab[2];
        return '<button class="knowledge-person-tab' + (index === 0 ? ' active' : '') + (attention ? ' attention' : '') + (archiveAttention ? ' archive' : '') + '" type="button" role="tab" aria-selected="' + (index === 0 ? 'true' : 'false') + '" data-person-tab="' + tab[0] + '">' + tab[1] + (tab[2] ? '<b>' + tab[2] + '</b>' : '') + '</button>';
      }).join(""),
      '</div><div class="knowledge-person-panel" id="personProfilePanel"></div></section>'
    ].join("");
    document.querySelectorAll("[data-person-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeTab = button.getAttribute("data-person-tab");
        document.querySelectorAll("[data-person-tab]").forEach(function (tabButton) {
          const active = tabButton === button;
          tabButton.classList.toggle("active", active);
          tabButton.setAttribute("aria-selected", active ? "true" : "false");
        });
        renderPanel();
      });
    });
    if (!tabs.some(function (tab) { return tab[0] === activeTab; })) activeTab = "overview";
    const activeButton = document.querySelector('[data-person-tab="' + activeTab + '"]');
    if (activeButton) activeButton.click(); else renderPanel();
  }

  function renderPanel() {
    const panel = document.getElementById("personProfilePanel");
    if (!panel || !person || !profile) return;
    const personArchived = person.lifecycleState === "archived";
    const certificates = activeRecords(profile.certificates);
    const experiences = activeRecords(profile.experiences);
    const materials = activeRecords(profile.materials);
    if (activeTab === "overview") {
      const action = personArchived
        ? '<button class="danger-btn" type="button" data-delete-person-profile><span class="btn-icon">' + icons.trash + '</span><span>删除人员档案</span></button>'
        : '<button class="primary-btn" type="button" data-edit-person-profile><span class="btn-icon">' + icons.edit + '</span><span>编辑人员主档</span></button>';
      panel.innerHTML = sectionHead("人员主档", personArchived ? "当前人员已归档，可查看主档和关联资料，确认无误后可删除。" : "维护人员身份、组织岗位和投标角色等稳定信息。", action) + '<div class="knowledge-person-info-grid">' + [
        ["姓名", person.name], ["所属部门", profile.department], ["岗位名称", profile.position], ["投标角色", profile.bidRole],
        ["档案状态", personArchived ? "已归档" : "在库"], ["最高学历", profile.education], ["从业年限", profile.years + " 年"], ["联系方式", profile.phone],
        ["电子邮箱", profile.email], ["关联资料", certificates.length + " 项证书、" + experiences.length + " 段经历、" + materials.length + " 项证明"]
      ].map(function (item) { return '<div><span>' + item[0] + '</span><strong>' + escapeHtml(item[1]) + '</strong></div>'; }).join("") + '</div><div class="knowledge-person-ability"><h4>核心能力</h4><div class="knowledge-detail-tags">' + profile.coreAbilities.map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join("") + '</div></div>';
    } else if (activeTab === "certificates") {
      const add = personArchived ? "" : '<button class="secondary-btn" type="button" data-add-person-record="certificate"><span class="btn-icon">' + icons.upload + '</span><span>导入证书</span></button>';
      const rows = certificates.map(function (item) { const info = validity.info(item); return [fileCell(item.name, item.file, item.type), escapeHtml(item.type) + '<small>' + escapeHtml(item.number) + '</small>', escapeHtml(item.issuer), escapeHtml(info.dateText || item.issueDate + " 取得"), statusTag(info.label, info.tone), recordActions("certificate", item)]; });
      panel.innerHTML = sectionHead("证书与资质", "上传证书后由 AI 自动提取名称、编号、机构和有效期限。", add) + (rows.length ? tableHtml(["资料名称", "证书信息", "发证机构", "有效期限", "有效状态", "操作"], rows) : emptyHtml("暂无在库证书与资质", "可以导入证书文件并由 AI 自动解析。"));
    } else if (activeTab === "experiences") {
      const add = personArchived ? "" : '<button class="secondary-btn" type="button" data-add-person-record="experience"><span class="btn-icon">' + icons.upload + '</span><span>导入项目经历</span></button>';
      const rows = experiences.map(function (item) { return [fileCell(item.name || item.project + "项目经历证明", item.file, "项目：" + item.project), escapeHtml(item.role), escapeHtml(item.period), escapeHtml(item.content), recordActions("experience", item)]; });
      panel.innerHTML = sectionHead("项目经历", "上传项目经历材料后由 AI 提取资料名称、项目、角色和参与时间。", add) + (rows.length ? tableHtml(["资料名称", "承担角色", "参与时间", "当前相关内容", "操作"], rows) : emptyHtml("暂无在库项目经历", "可以导入项目证明或履历文件。"));
    } else if (activeTab === "materials") {
      const add = personArchived ? "" : '<button class="secondary-btn" type="button" data-add-person-record="material"><span class="btn-icon">' + icons.upload + '</span><span>导入证明材料</span></button>';
      const rows = materials.map(function (item) { return [fileCell(item.name, item.file, item.type), escapeHtml(item.type), escapeHtml(item.period), statusTag("已解析", item.tone === "red" ? "red" : "green"), recordActions("material", item)]; });
      panel.innerHTML = sectionHead("证明材料", "上传简历、学历和劳动关系等材料，AI 自动识别材料类型和覆盖信息。", add) + (rows.length ? tableHtml(["资料名称", "材料类型", "当前相关内容", "解析状态", "操作"], rows) : emptyHtml("暂无在库证明材料", "可以导入简历、学历或劳动关系材料。"));
    } else if (activeTab === "references") {
      panel.innerHTML = sectionHead("投标引用记录", "记录人员档案被哪些投标项目和标书章节引用。") + (profile.referencesList.length ? tableHtml(["投标项目", "使用角色", "标书位置", "状态", "引用时间"], profile.referencesList.map(function (item) { return [escapeHtml(item.project), escapeHtml(item.role), escapeHtml(item.section), statusTag(item.status, "green"), escapeHtml(item.date)]; })) : emptyHtml("暂无投标引用记录", "人员被知识匹配或标书章节引用后，将在这里保留记录。"));
    } else {
      const archived = archivedRecords();
      const rows = archived.map(function (entry) { const item = entry.item; return [fileCell(item.name, item.file, recordSummary(entry.type, item)), recordTypeLabel(entry.type), escapeHtml(item.archivedAt || "-"), escapeHtml(item.archivedBy || currentUserName), escapeHtml(recordSummary(entry.type, item)), recordActions(entry.type, item)]; });
      panel.innerHTML = sectionHead("已归档资料", "集中展示当前人员已归档的证书、项目经历和证明材料，归档后可查看或删除。") + (rows.length ? tableHtml(["资料名称", "资料类型", "归档时间", "归档人", "当前相关内容", "操作"], rows) : emptyHtml("暂无已归档资料", "证书、项目经历或证明材料归档后将在这里集中展示。"));
    }
    bindPanelActions(panel);
  }

  function bindPanelActions(panel) {
    const editProfile = panel.querySelector("[data-edit-person-profile]");
    if (editProfile) editProfile.addEventListener("click", function () { window.knowledgePrototype.openPersonModal("edit", person); });
    const deleteProfile = panel.querySelector("[data-delete-person-profile]");
    if (deleteProfile) deleteProfile.addEventListener("click", function () { window.knowledgePrototype.openDelete(person); });
    panel.querySelectorAll("[data-add-person-record]").forEach(function (button) { button.addEventListener("click", function () { openRecordModal(button.getAttribute("data-add-person-record")); }); });
    panel.querySelectorAll("[data-person-record-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        const type = button.getAttribute("data-person-record-type");
        const item = findRecord(type, button.getAttribute("data-person-record-id"));
        const action = button.getAttribute("data-person-record-action");
        if (!item) return;
        if (action === "edit") openRecordModal(type, item);
        if (action === "archive") window.knowledgePrototype.openArchive(item);
        if (action === "delete") window.knowledgePrototype.openDelete(item);
        if (action === "view") {
          item.categoryLabel = recordTypeLabel(type);
          item.updatedAt = item.updatedAt || person.updatedAt;
          item.owner = item.owner || currentUserName;
          item.summary = item.summary || recordSummary(type, item);
          item.description = item.description || "来源文件已完成解析并关联“" + person.name + "”的人员档案。";
          item.detailReadOnly = person.lifecycleState === "archived" && item.lifecycleState !== "archived";
          window.knowledgePrototype.openDetail(item);
        }
      });
    });
  }

  function field(label, id, value, full, type, required) {
    return '<div class="knowledge-form-field' + (full ? ' full' : '') + '"><label for="' + id + '">' + label + (required === false ? '' : ' <em>*</em>') + '</label><input class="knowledge-control" id="' + id + '" type="' + (type || 'text') + '" value="' + escapeHtml(value || "") + '"/></div>';
  }

  function setSubrecordButton(text, icon, disabled) {
    document.getElementById("savePersonSubrecordText").textContent = text;
    document.getElementById("savePersonSubrecordIcon").innerHTML = icon;
    document.getElementById("savePersonSubrecord").disabled = Boolean(disabled);
  }

  function recordFileConfig(type) {
    return {
      certificate: { accept: ".pdf,.png,.jpg,.jpeg", hint: "支持 PDF、PNG、JPG 证书文件" },
      experience: { accept: ".pdf,.doc,.docx,.png,.jpg,.jpeg", hint: "支持合同、项目证明和履历文件" },
      material: { accept: ".pdf,.doc,.docx,.png,.jpg,.jpeg", hint: "支持 PDF、Word 和图片文件" }
    }[type];
  }

  function parsedSubrecordFields(type, fileName, item) {
    const baseName = (fileName || "人员资料").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    if (type === "certificate") {
      return field("证书名称", "subrecordName", item ? item.name : /信息系统/.test(baseName) ? "信息系统项目管理师" : baseName, true) +
        field("证书类型", "subrecordType", item ? item.type : "专业资格证书", false) + field("证书编号", "subrecordNumber", item ? item.number : "CERT-2026-0715", false) +
        field("发证机构", "subrecordIssuer", item ? item.issuer : "AI 已从证书原文识别", true) + field("取得日期", "subrecordStart", item ? item.issueDate : "2024-06-18", false, "date") +
        field("到期日期", "subrecordEnd", item ? item.endDate : "2027-06-18", false, "date", false);
    }
    if (type === "experience") {
      return field("项目名称", "subrecordName", item ? item.project : baseName, true) + field("承担角色", "subrecordType", item ? item.role : profile.bidRole, false) +
        field("参与时间", "subrecordNumber", item ? item.period : "2023-03 至 2024-08", false) + field("主要工作", "subrecordIssuer", item ? item.content : "负责项目相关专业工作及交付协同", true);
    }
    return field("材料名称", "subrecordName", item ? item.name : baseName, true) +
      field("材料类型", "subrecordType", item ? item.type : /学历/.test(baseName) ? "学历证明" : /社保/.test(baseName) ? "劳动关系证明" : "人员证明材料", false) +
      field("版本或覆盖期间", "subrecordNumber", item ? item.period : "AI 已从文件日期识别", false);
  }

  function startSubrecordParsing(file) {
    selectedFileName = file.name;
    selectedFile = file;
    subrecordParsed = false;
    if (subrecordTimer) window.clearTimeout(subrecordTimer);
    document.getElementById("subrecordParseStatus").textContent = "AI 正在解析“" + file.name + "”并提取相关属性...";
    document.getElementById("subrecordParsedFields").classList.add("hidden");
    setSubrecordButton("AI 解析中", icons.scan, true);
    subrecordTimer = window.setTimeout(function () {
      const container = document.getElementById("subrecordParsedFields");
      container.innerHTML = '<div class="knowledge-ai-extract-head"><span>' + icons.scan + '</span><div><strong>AI 已自动填充</strong><small>以下信息来自上传文件，可直接修改后保存</small></div></div><div class="knowledge-form-grid">' + parsedSubrecordFields(currentRecordType, file.name) + '</div>';
      container.classList.remove("hidden");
      document.getElementById("subrecordParseStatus").textContent = "解析完成，请核对自动填充的信息";
      subrecordParsed = true;
      setSubrecordButton("确认导入", icons.check, false);
    }, 720);
  }

  function openRecordModal(type, item) {
    if (person.lifecycleState === "archived" && !item) return;
    currentRecordType = type;
    currentRecordMode = item ? "edit" : "create";
    currentRecordItem = item || null;
    selectedFileName = item ? item.file : "";
    selectedFile = null;
    subrecordParsed = Boolean(item);
    if (subrecordTimer) window.clearTimeout(subrecordTimer);
    const label = recordTypeLabel(type);
    document.getElementById("personSubrecordTitle").textContent = item ? "编辑" + label : "导入" + label;
    document.getElementById("personSubrecordSubtitle").textContent = item ? "可修改解析信息，也可重新上传来源文件并重新解析。" : "上传资料后，AI 将自动提取信息并关联到“" + person.name + "”。";
    if (item) {
      const config = recordFileConfig(type);
      document.getElementById("personSubrecordFields").innerHTML = '<div class="knowledge-current-file full"><span>当前来源文件</span>' + fileCell(item.name, item.file, recordSummary(type, item)) + '</div><div class="knowledge-form-field full"><label>重新上传来源文件</label><label class="knowledge-upload-zone compact" for="subrecordFile"><span class="knowledge-upload-icon">' + icons.upload + '</span><strong>点击选择新文件</strong><span>' + config.hint + '；不选择则保留当前文件</span><input id="subrecordFile" type="file" accept="' + config.accept + '"/></label></div><div class="knowledge-batch-status full" id="subrecordParseStatus">未选择新文件，将保留当前来源文件</div><div class="knowledge-ai-extract knowledge-parsed-fields full" id="subrecordParsedFields"><div class="knowledge-ai-extract-head"><span>' + icons.edit + '</span><div><strong>编辑解析信息</strong><small>修改后将更新当前人员资料记录</small></div></div><div class="knowledge-form-grid">' + parsedSubrecordFields(type, item.file, item) + '</div></div>';
      document.getElementById("subrecordFile").addEventListener("change", function () { const file = this.files && this.files[0]; if (file) startSubrecordParsing(file); });
      setSubrecordButton("保存修改", icons.check, false);
    } else {
      const config = recordFileConfig(type);
      document.getElementById("personSubrecordFields").innerHTML = '<div class="knowledge-form-field full"><label>资料文件 <em>*</em></label><label class="knowledge-upload-zone" for="subrecordFile"><span class="knowledge-upload-icon">' + icons.upload + '</span><strong>点击选择文件并进行 AI 解析</strong><span>' + config.hint + '</span><input id="subrecordFile" type="file" accept="' + config.accept + '"/></label></div><div class="knowledge-batch-status full" id="subrecordParseStatus">尚未选择资料文件</div><div class="knowledge-ai-extract knowledge-parsed-fields full hidden" id="subrecordParsedFields"></div>';
      document.getElementById("subrecordFile").addEventListener("change", function () { const file = this.files && this.files[0]; if (file) startSubrecordParsing(file); });
      setSubrecordButton("等待上传", icons.scan, true);
    }
    window.knowledgePrototype.openLayer("personSubrecordModal");
  }

  function closeRecordModal() {
    if (subrecordTimer) window.clearTimeout(subrecordTimer);
    subrecordTimer = null;
    currentRecordItem = null;
    selectedFile = null;
    window.knowledgePrototype.closeLayers();
  }

  function saveSubrecord() {
    if (currentRecordMode === "create") {
      const fileInput = document.getElementById("subrecordFile");
      if (!fileInput || !fileInput.files.length || !subrecordParsed) {
        window.showToast("请先上传资料并等待 AI 解析完成", "warning");
        if (fileInput) fileInput.focus();
        return;
      }
    }
    const name = document.getElementById("subrecordName");
    const type = document.getElementById("subrecordType");
    if (!name || !type || !name.value.trim() || !type.value.trim()) {
      window.showToast("请核对资料名称和类型", "warning");
      if (name && !name.value.trim()) name.focus(); else if (type) type.focus();
      return;
    }
    let item = currentRecordItem;
    if (!item) {
      item = { id: person.id + "-" + currentRecordType.toUpperCase().slice(0, 3) + "-NEW-" + Date.now(), category: "people-record", recordType: currentRecordType, lifecycleState: "active", file: selectedFileName, sourceFile: selectedFile, owner: currentUserName };
      if (currentRecordType === "certificate") profile.certificates.push(item);
      if (currentRecordType === "experience") profile.experiences.push(item);
      if (currentRecordType === "material") profile.materials.push(item);
    }
    if (currentRecordType === "certificate") {
      item.name = name.value.trim(); item.type = type.value.trim(); item.number = document.getElementById("subrecordNumber").value.trim(); item.issuer = document.getElementById("subrecordIssuer").value.trim(); item.issueDate = document.getElementById("subrecordStart").value; item.endDate = document.getElementById("subrecordEnd").value;
    } else if (currentRecordType === "experience") {
      item.project = name.value.trim(); item.name = item.project + "项目经历证明"; item.role = type.value.trim(); item.period = document.getElementById("subrecordNumber").value.trim(); item.content = document.getElementById("subrecordIssuer").value.trim(); item.proof = "来源文件已关联";
    } else {
      item.name = name.value.trim(); item.type = type.value.trim(); item.period = document.getElementById("subrecordNumber").value.trim(); item.status = "已解析"; item.tone = "green";
    }
    const editMode = currentRecordMode === "edit";
    const replacedFile = editMode && Boolean(selectedFile);
    if (selectedFile) {
      item.file = selectedFile.name;
      item.sourceFile = selectedFile;
      item.sourceFileUrl = "";
    }
    item.updatedAt = new Date().toISOString().slice(0, 10);
    closeRecordModal();
    renderShell();
    window.showToast(editMode ? "“" + item.name + "”已更新" + (replacedFile ? "，新来源文件已重新解析" : "") : "“" + item.name + "”已导入并关联人员", "success");
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-close-person-record]") || event.target.id === "knowledgeBackdrop") closeRecordModal();
  });
  document.getElementById("savePersonSubrecord").addEventListener("click", saveSubrecord);
  document.addEventListener("knowledge-person-record-edit-request", function (event) {
    if (!event.detail || person.lifecycleState === "archived") return;
    const item = findRecord(event.detail.type, event.detail.id);
    if (item) openRecordModal(event.detail.type, item);
  });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape" && modal.classList.contains("open")) closeRecordModal(); });
  document.addEventListener("knowledge-record-changed", function (event) {
    if (!event.detail || !person) return;
    if (event.detail.id === person.id || findRecord("certificate", event.detail.id) || findRecord("experience", event.detail.id) || findRecord("material", event.detail.id)) renderShell();
  });

  renderShell();
})();
