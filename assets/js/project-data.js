(function () {
  "use strict";

  window.BiddingProjectData = {
    featuredProject: {
      id: "BID-202601-001",
      name: "某港口集团2026年度集装箱业务平台运维项目",
      purchaser: "某港口集团有限公司",
      agency: "采购人自主采购",
      owner: "李明远",
      deadline: "2026-07-20 09:30",
      deadlineText: "请按计划完成终审与交付",
      budget: "60 万元",
      stage: "质量审核",
      stageDetail: "人工查看技术标与商务标送审版本",
      progress: 92,
      deadlineHint: "请按计划完成终审与交付",
      baseline: "项目资料已就绪",
      status: "ongoing"
    },
    projects: [
      { id: "BID-202607-003", name: "市级应急指挥中心升级改造项目", purchaser: "某市应急管理局", deadline: "待解析", deadlineText: "后台解析中", stage: "解析中", stageDetail: "AI 正在逐页识别招标文件", progress: 18, owner: "王子谦", status: "parsing", budget: "待解析" },
      { id: "BID-202607-002", name: "智慧园区数字化运营平台项目", purchaser: "高新区产业发展集团", deadline: "2026-07-13 09:30", deadlineText: "剩余 61 小时", stage: "解析结果", stageDetail: "待确认综合投标结论", progress: 38, owner: "周晓雯", status: "deadline", budget: "960 万元" },
      { id: "BID-202607-004", name: "区域医疗数据交换与共享平台", purchaser: "区域卫生健康委员会", deadline: "2026-07-22 14:00", deadlineText: "剩余 12 天", stage: "标书编制", stageDetail: "技术标与商务标编制中", progress: 64, owner: "陈思远", status: "ongoing", budget: "1,380 万元" },
      { id: "BID-202601-001", name: "某港口集团2026年度集装箱业务平台运维项目", purchaser: "某港口集团有限公司", deadline: "2026-07-20 09:30", deadlineText: "请按计划完成终审与交付", stage: "质量审核", stageDetail: "人工查看技术标与商务标送审版本", progress: 92, owner: "李明远", status: "ongoing", budget: "60 万元" },
      { id: "BID-202607-005", name: "公共资源交易数据中台建设项目", purchaser: "市公共资源交易中心", deadline: "2026-07-28 17:00", deadlineText: "剩余 18 天", stage: "交付归档", stageDetail: "待确认最终交付文件", progress: 96, owner: "赵嘉怡", status: "ongoing", budget: "780 万元" },
      { id: "BID-202606-018", name: "城市运行管理服务平台运维项目", purchaser: "市城市运行管理中心", deadline: "2026-07-08 16:00", deadlineText: "已完成交付", stage: "交付归档", stageDetail: "已完成交付并归档", progress: 100, owner: "李明远", status: "archived", budget: "520 万元" },
      { id: "BID-202607-006", name: "城市轨道交通数据治理平台项目", purchaser: "市轨道交通集团有限公司", deadline: "2026-07-15 14:30", deadlineText: "剩余 26 小时", stage: "标书编制", stageDetail: "技术标重点章节完善中", progress: 72, owner: "赵嘉怡", status: "deadline", budget: "1,680 万元" },
      { id: "BID-202606-021", name: "政务云统一运维服务采购项目", purchaser: "市大数据管理局", deadline: "2026-08-01 10:00", deadlineText: "剩余 18 天", stage: "解析结果", stageDetail: "待确认综合投标结论", progress: 42, owner: "周晓雯", status: "ongoing", budget: "860 万元" },
      { id: "BID-202606-022", name: "国企财务共享平台升级建设项目", purchaser: "省产业投资集团有限公司", deadline: "2026-08-05 09:30", deadlineText: "剩余 22 天", stage: "标书编制", stageDetail: "商务标与技术标交叉复核", progress: 82, owner: "王子谦", status: "ongoing", budget: "1,260 万元" },
      { id: "BID-202605-014", name: "教育数字基座能力扩展项目", purchaser: "市教育信息中心", deadline: "2026-06-28 10:00", deadlineText: "已完成交付", stage: "交付归档", stageDetail: "已完成交付并归档", progress: 100, owner: "陈思远", status: "archived", budget: "640 万元" },
      { id: "BID-202604-009", name: "水务集团生产调度平台改造项目", purchaser: "市水务集团有限公司", deadline: "2026-05-30 09:00", deadlineText: "已完成交付", stage: "交付归档", stageDetail: "已完成交付并归档", progress: 100, owner: "李明远", status: "archived", budget: "920 万元" },
      { id: "BID-202603-026", name: "公共卫生数据分析平台项目", purchaser: "市疾病预防控制中心", deadline: "2026-04-26 14:00", deadlineText: "已完成交付", stage: "交付归档", stageDetail: "已完成交付并归档", progress: 100, owner: "周晓雯", status: "archived", budget: "730 万元" }
    ]
  };

  const seeds = JSON.parse(JSON.stringify(window.BiddingProjectData.projects));
  const registryKey = "biddingProjects:v1";
  const opportunityKey = "biddingOpportunityPrototype:v1";
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function read(key, fallback) {
    for (const name of ["localStorage", "sessionStorage"]) {
      try { const value = window[name].getItem(key); if (value) return JSON.parse(value); } catch (error) { /* Try the available storage. */ }
    }
    return copy(fallback);
  }
  function write(key, value) {
    for (const name of ["localStorage", "sessionStorage"]) {
      try {
        window[name].setItem(key, JSON.stringify(value));
        if (name === "sessionStorage") { try { window.localStorage.removeItem(key); } catch (error) { /* The fallback remains available. */ } }
        return;
      } catch (error) { /* Try the available storage. */ }
    }
    throw new Error("项目数据未能保存，请重试。");
  }
  function opportunities() { return window.OpportunityStore ? window.OpportunityStore.get() : read(opportunityKey, { projects: [], opportunities: [] }); }
  function files(project) {
    const list = copy(project.files || []);
    if (!Array.isArray(project.files) && project.fileName) list.push({ name: project.fileName, size: "—", main: true });
    if (!Array.isArray(project.files) && !list.length && !project.workspaceProfile) {
      ["采购文件.doc", "技术需求及服务规范.pdf", "投标文件格式及报价清单.xlsx", "合同主要条款.pdf", "澄清答疑纪要.pdf"].forEach(function (name, i) { list.push({ name: name, size: ["372 KB", "1.8 MB", "86 KB", "620 KB", "428 KB"][i], main: i === 0 }); });
    }
    if (list.length && !list.some(function (file) { return file.main; })) {
      const main = list.find(function (file) { return /\.(pdf|docx?)$/i.test(file.name); });
      if (main) main.main = true;
    }
    return list.sort(function (a, b) { return Number(Boolean(b.main)) - Number(Boolean(a.main)); });
  }
  function sourceSnapshot(item) {
    if (!item) return null;
    const saved = item.assessmentSnapshot || (window.OpportunityStore && window.OpportunityStore.assessment(item));
    return copy({ id: item.id, name: item.name, number: item.number, revision: item.revision, summary: item.summary,
      purchaser: item.purchaser, amount: item.amount, deadline: item.deadline, qualification: item.qualification,
      notices: item.notices || [], sources: (opportunities().sources || []).filter(function (source) { return (item.sourceIds || []).includes(source.id); }), sourceIds: item.sourceIds || [], changes: item.changes || [],
      assessment: saved || null, confirmedBy: item.confirmedBy || "", confirmedAt: item.confirmedAt || "",
      history: (item.history || []).filter(function (record) { return /确认投标|重新确认/.test(record.action); }) });
  }
  function normalize(project) {
    const next = copy(project);
    next.files = files(next);
    next.fileName = (next.files.find(function (file) { return file.main; }) || {}).name || "";
    if (next.status === "parsing") { next.progress = Number(next.progress || 12); next.stageDetail = "AI 正在解析招标文件"; }
    if (next.opportunityId) {
      next.sourceType = "opportunity";
      next.workspaceProfile = true;
      if (!next.sourceOpportunity) {
        next.sourceOpportunity = sourceSnapshot((opportunities().opportunities || []).find(function (item) { return item.id === next.opportunityId; }));
        if (next.sourceOpportunity && next.opportunityRevision !== next.sourceOpportunity.revision) {
          next.sourceOpportunity.revision = next.opportunityRevision;
          next.sourceOpportunity.summary = next.sourceSummary;
          next.sourceOpportunity.deadline = next.deadline;
          next.sourceOpportunity.assessment = { at: "", noticeRevision: next.opportunityRevision, result: { score: next.opportunityScore } };
        }
      }
    }
    return next;
  }
  function all() {
    const registry = read(registryKey, { projects: [], deleted: [] });
    const ordinary = seeds.filter(function (project) { return !(registry.deleted || []).includes(project.id); }).map(function (project) { return Object.assign({}, project, (registry.projects || []).find(function (saved) { return saved.id === project.id; }) || {}); });
    (registry.projects || []).forEach(function (project) { if (!project.opportunityId && !ordinary.some(function (entry) { return entry.id === project.id; }) && !(registry.deleted || []).includes(project.id)) ordinary.unshift(project); });
    return (opportunities().projects || []).filter(function (project) { return project.opportunityId; }).concat(ordinary).map(normalize);
  }
  function get(id) { return all().find(function (project) { return project.id === id; }) || null; }
  function sync() { window.BiddingProjectData.projects = all(); }
  function save(id, patch) {
    const current = get(id);
    if (!current) throw new Error("项目不存在或已移除，请返回项目列表。");
    const next = normalize(Object.assign({}, current, copy(patch || {}), { id: id, updatedAt: new Date().toISOString() }));
    if (patch && patch.filesChanged) Object.assign(next, { stage: "解析结果", status: "ongoing", stageDetail: "文件变更，待重新解析", progress: 38 });
    if (next.opportunityId) {
      if (window.OpportunityStore) window.OpportunityStore.updateProject(id, next);
      else {
        const state = opportunities();
        const index = state.projects.findIndex(function (project) { return project.id === id; });
        if (index < 0) throw new Error("来源项目已恢复或移除，请返回项目列表。");
        state.projects[index] = next; write(opportunityKey, state);
      }
    } else {
      const registry = read(registryKey, { projects: [], deleted: [] });
      registry.projects = (registry.projects || []).filter(function (project) { return project.id !== id; });
      registry.projects.unshift(next); write(registryKey, registry);
    }
    try { window.sessionStorage.removeItem("biddingPendingProject"); } catch (error) { /* Legacy cache is optional. */ }
    sync();
    if (window.projectPrototype && window.projectPrototype.currentProject && window.projectPrototype.currentProject.id === id && window.projectPrototype.updateHeader) window.projectPrototype.updateHeader(next);
    return next;
  }
  function create(uploaded, owner) {
    if (!uploaded.length || !uploaded.some(function (file) { return /\.(pdf|docx?)$/i.test(file.name) && file.main; })) throw new Error("请上传一份 PDF / Word 主招标文件。");
    const id = "BID-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const main = uploaded.find(function (file) { return file.main; });
    const project = normalize({ id: id, sourceType: "upload", workspaceProfile: true, name: main.name.replace(/\.[^.]+$/, ""), purchaser: "待解析", deadline: "待解析", budget: "待解析", owner: owner || "李明远", files: uploaded,
      status: "parsing", stage: "解析中", stageDetail: "AI 正在解析招标文件", progress: 12, createdAt: new Date().toISOString() });
    const registry = read(registryKey, { projects: [], deleted: [] });
    registry.projects.unshift(project); write(registryKey, registry); sync(); return project;
  }
  function clearSession(ids) {
    const archived = {};
    try {
      const storage = window.sessionStorage;
      for (let i = storage.length - 1; i >= 0; i -= 1) {
        const key = storage.key(i);
        if (ids.some(function (id) { return key === "biddingParseStartedAt:" + id || key.endsWith(":" + id) || key.includes(":" + id + ":"); })) { archived[key] = storage.getItem(key); storage.removeItem(key); }
      }
      const pending = JSON.parse(storage.getItem("biddingPendingProject") || "null");
      if (pending && ids.includes(pending.id)) storage.removeItem("biddingPendingProject");
    } catch (error) { /* Unrelated sessions remain untouched. */ }
    return archived;
  }
  function remove(id) {
    const project = get(id); if (!project) return;
    if (project.opportunityId) {
      const mutate = function (state) {
        state.projects = state.projects.filter(function (entry) { return entry.id !== id; });
        const item = state.opportunities.find(function (entry) { return entry.id === project.opportunityId; });
        if (item) { item.projectId = ""; item.review = "approved"; item.recheck = Boolean(item.recheck || item.approvedRevision !== item.revision); item.history.unshift({ action: "移除关联项目", note: "归档项目已删除，原投标决定和初评记录保留。", user: project.owner, at: new Date().toISOString() }); }
      };
      if (window.OpportunityStore) window.OpportunityStore.change(mutate);
      else { const state = opportunities(); mutate(state); write(opportunityKey, state); }
    } else {
      const registry = read(registryKey, { projects: [], deleted: [] });
      registry.projects = registry.projects.filter(function (entry) { return entry.id !== id; });
      registry.deleted = (registry.deleted || []).concat(id); write(registryKey, registry);
    }
    clearSession([id]); sync();
  }
  function entry(project) {
    const stage = String(project.stage || "");
    return project.filesChanged || project.status === "parsing" || stage === "解析中" ? "project-files.html" : /交付/.test(stage) || project.status === "archived" ? "project-delivery.html" : /质量/.test(stage) ? "project-quality.html" : /编制|生成/.test(stage) ? "project-writing.html" : "project-analysis.html";
  }
  function deadlineState(project, now) {
    const raw = String(project.deadline || "").trim();
    const at = raw ? Date.parse(raw.replace(" ", "T") + (/[zZ]$|[+-]\d\d:\d\d$/.test(raw) ? "" : /^\d{4}-\d{2}-\d{2}$/.test(raw) ? "T23:59:59+08:00" : "+08:00")) : NaN;
    const remaining = at - (Number.isFinite(now) ? now : Date.now());
    if (project.status === "archived") return { key: "archived", label: "已交付归档", tone: "gray", at: at };
    if (!Number.isFinite(at)) return { key: "unknown", label: "截止时间待解析", tone: "gray", at: at };
    if (remaining <= 0) return { key: "closed", label: "投标已截止", tone: "gray", at: at };
    if (remaining <= 72 * 3600000) return { key: "near", label: "72 小时内投标截止", tone: "red", at: at };
    return { key: "open", label: "按计划推进", tone: "blue", at: at };
  }
  function isUrgent(project, now) { return deadlineState(project, now).key === "near"; }
  function allowed(project, section) {
    if (!project) return false;
    if (section === "files") return true;
    if (project.filesChanged || project.status === "parsing") return false;
    const order = ["files", "analysis", "writing", "quality", "delivery"];
    const current = entry(project).replace("project-", "").replace(".html", "");
    return order.indexOf(section) <= order.indexOf(current);
  }
  window.BiddingProjectStore = { all: all, get: get, save: save, create: create, remove: remove, files: files, sourceSnapshot: sourceSnapshot, clearSession: clearSession, sync: sync, entry: entry, allowed: allowed, deadlineState: deadlineState, isUrgent: isUrgent };

  // Migrate the previous single-project cache once; opportunity records stay authoritative.
  try {
    const legacy = JSON.parse(window.sessionStorage.getItem("biddingPendingProject") || "null");
    if (legacy && !legacy.opportunityId) {
      const registry = read(registryKey, { projects: [], deleted: [] });
      if (!registry.projects.some(function (project) { return project.id === legacy.id; }) && !(registry.deleted || []).includes(legacy.id)) { registry.projects.unshift(legacy); write(registryKey, registry); }
      window.sessionStorage.removeItem("biddingPendingProject");
    }
  } catch (error) { /* Legacy storage may be unavailable. */ }
  sync();
})();
