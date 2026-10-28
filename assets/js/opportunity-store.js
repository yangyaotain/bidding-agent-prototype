(function () {
  "use strict";

  const KEY = "biddingOpportunityPrototype:v1";
  const weights = [35, 25, 15, 10, 15];
  const dimensions = ["业务需求匹配", "资格与材料匹配", "项目规模适配", "地域与服务适配", "准备时间适配"];
  const PRESET_VERSION = 8;
  const RULE_ID = "UNIFIED";
  const defaultRemarks = "优先关注采购需求明确、交付范围清晰的项目。\n涉及驻场实施或本地服务的，需确认团队安排。\n要求专项资质或同类业绩的，审核时重点核验。";
  const scopeGroups = [
    { name: "信息化软件", items: ["数据中台", "数据治理", "BI 报表", "数据可视化", "系统集成"] },
    { name: "管理软件", items: ["办公审批", "客户管理", "合同管理", "资产管理", "项目管理", "个性化业务系统"] },
    { name: "成熟 AI 应用", items: ["知识库问答", "智能问数", "文档处理", "报告生成", "智能助手"] }
  ];
  const exclusionGroups = [
    { name: "专业技术门槛", items: ["前沿技术研究", "专项技术研究", "复杂算法自研", "底层技术研发", "特殊视频识别"] },
    { name: "专业业务门槛", items: ["专业财务核算", "复杂税务处理", "法律专业判断", "医疗诊断"] }
  ];
  const focusOptions = ["核心交付与公司能力", "企业资质、人员和类似业绩", "项目规模、工期及交付要求", "驻场、服务地点及团队安排", "文件获取、报名和准备时间"];
  const ruleFields = ["description", "keywords", "excludes", "regions", "min", "max", "minDays", "threshold", "remarks", "hours", "lookback"];
  function ruleBasis(rule) {
    if (!rule) return "";
    const model = ruleModel(rule), list = function (items) { return Array.from(new Set((items || []).map(function (item) { return String(item).trim().toLowerCase(); }))).sort(); };
    return JSON.stringify({ description: String(model.description || "").trim(), accepted: list((model.accepted || []).concat(model.extraAccepted || [])),
      excluded: list((model.excluded || []).concat(model.extraExcluded || [])), regions: list(model.regions), regionMode: model.regionMode, min: model.min || 0, max: model.max == null ? null : model.max,
      minDays: model.minDays, threshold: model.threshold, remarks: String(model.remarks || "").trim(), onsite: model.onsite || "all" });
  }
  function allItems(groups) { return groups.reduce(function (items, group) { return items.concat(group.items); }, []); }
  function presetRule() {
    return { id: RULE_ID, format: "form", revision: 1, savedAt: stamp(), description: "以成熟技术完成信息化软件、管理软件及 AI 应用开发，核心交付不依赖研究突破或公司不具备的专业知识。", keywords: allItems(scopeGroups).join(","), excludes: allItems(exclusionGroups).join(","), regions: "", min: 0, max: null, minDays: 3, threshold: 60, remarks: defaultRemarks, hours: 2, lookback: 7 };
  }
  function ruleModel(rule) {
    if (rule.format === "structured") return rule;
    const selected = tokens(rule.keywords), excluded = tokens(rule.excludes);
    const known = allItems(scopeGroups), restrictions = allItems(exclusionGroups);
    return { format: "structured", accepted: known.filter(function (name) { return selected.includes(name.toLowerCase()); }), extraAccepted: selected.filter(function (name) { return !known.some(function (knownName) { return knownName.toLowerCase() === name; }); }), excluded: restrictions.filter(function (name) { return excluded.includes(name.toLowerCase()); }), extraExcluded: excluded.filter(function (name) { return !restrictions.includes(name); }), regionMode: tokens(rule.regions).length ? "selected" : "all", regions: tokens(rule.regions), budgetMode: rule.min || rule.max != null ? "range" : "all", min: rule.min, max: rule.max, minDays: rule.minDays, onsite: "all", threshold: rule.threshold, remarks: rule.remarks || "", focus: focusOptions, description: rule.description };
  }
  function ruleSummary(rule) {
    if (!rule || !["structured", "form"].includes(rule.format)) return "历史业务要求（表单调整前）";
    const model = ruleModel(rule);
    return ["关注 " + (model.accepted.length + model.extraAccepted.length) + " 项业务", model.regionMode === "all" ? "地区不限" : "实施地区：" + model.regions.join("、"), model.budgetMode === "all" ? "预算不限" : "本包预算：" + (model.min || 0) + "～" + (model.max == null ? "不限" : model.max) + " 万元", "建议至少准备 " + model.minDays + " 天", "初评至少 " + model.threshold + " 分"].join("；");
  }
  function presetSchedule() { return { hours: 2, lookback: 7, lastRun: Date.now() }; }
  function screeningBaseline() {
    return {
      title: "项目机会筛选基准",
      principle: "成熟技术的应用开发可以做；需要研究突破或依赖公司不具备的专业知识，不能做。",
      groups: [
        { id: "R1", name: "信息化软件", description: "数据中台、数据治理、BI 报表、数据可视化、系统集成", keywords: "数据中台,数据治理,数据目录,数据质量,数据平台,数据资源,数据资产,BI报表,BI 报表,数据可视化,系统集成,共享交换,软件运维,应用系统" },
        { id: "R2", name: "管理软件", description: "办公审批、客户管理、合同管理、资产管理、项目管理、个性化业务系统", keywords: "办公审批,客户管理,合同管理,资产管理,项目管理,个性化业务系统,定制业务系统,业务管理系统" },
        { id: "R3", name: "成熟 AI 应用", description: "知识库问答、智能问数、文档处理、报告生成、智能助手", keywords: "知识库问答,知识检索,智能问数,文档处理,报告生成,智能助手,智能体,AI应用,AI 应用,知识服务" }
      ],
      technical: "前沿技术研究,专项技术研究,复杂算法自研,底层技术研发,特殊视频识别",
      professional: "专业财务核算,复杂税务处理,法律专业判断,医疗诊断"
    };
  }
  function presetRules() {
    return [presetRule()];
  }
  function presetSources() {
    return [
      { id: "S1", name: "华润守正采购交易平台", url: "https://www.szecp.com.cn/index.html", exampleUrl: "https://www.szecp.com.cn/index.html", type: "企业采购", column: "公开招标 / 更正公告", status: "ready", enabled: true, checked: "", lastSuccess: "", error: "尚无采集记录" },
      { id: "S2", name: "深圳政府采购智慧平台", url: "http://zfcg.szggzy.com:8081/", exampleUrl: "http://zfcg.szggzy.com:8081/gsgg/002001/002001002/002001002001/20261016/9d3a7238-30e1-4a5f-a35c-74144e7bbcac.html", type: "政府采购", column: "公开招标 / 更正公告", status: "ready", enabled: true, checked: "", lastSuccess: "", error: "尚无采集记录" },
      { id: "S3", name: "知了标讯", url: "https://www.zhiliaobiaoxun.com/", exampleUrl: "https://www.zhiliaobiaoxun.com/content/605730284/b1/1CDF8D03C3BED4937E4604004B59B6DA44EE2D8E?sk=1CDF8D03C3BED4937E4604004B59B6DA44EE2D8E&from=skill", type: "标讯聚合", column: "公开招标信息 / 关联更新", status: "ready", enabled: true, checked: "", lastSuccess: "", error: "公告信息须回溯原始发布方核验。" }
    ];
  }
  let storage = null;
  ["localStorage", "sessionStorage"].some(function (name) {
    try {
      const candidate = window[name];
      candidate.setItem(KEY + ":probe", "1");
      candidate.removeItem(KEY + ":probe");
      storage = candidate;
      return true;
    } catch (error) { return false; }
  });

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function time(value) { return value ? new Date(String(value).replace(" ", "T") + (/[zZ]|[+]\d\d:\d\d$/.test(value) ? "" : "+08:00")).getTime() : NaN; }
  function stamp(value) { return new Date((value || Date.now()) + 8 * 3600000).toISOString().slice(0, 16).replace("T", " "); }
  function dateAt(days, hour) { return stamp(Date.now() + days * 86400000).slice(0, 10) + " " + (hour || "17:00"); }
  function opportunity(id, name, purchaser, region, amount, ruleId, extra) {
    return Object.assign({ id: id, number: "CG-" + id, name: name, purchaser: purchaser, agency: "公共采购代理中心", region: region, amount: amount, totalAmount: amount, cap: amount, package: "采购包 1", round: "首次招标", sourceIds: ["S1"], published: dateAt(-2, "09:00"), acquisitionStart: dateAt(-2, "09:00"), acquisitionEnd: dateAt(5), registrationEnd: "", deadline: dateAt(15, "09:30"), opening: dateAt(15, "09:30"), term: "合同签订后 180 日历日", method: "公开招标", ruleId: ruleId, matchedRules: [ruleId], review: "pending", lifecycle: "open", acquired: false, registered: false, unknown: [0, 0, 0, 0, 0], factors: [1, 1, 1, 1, 1], risks: [], requiresConfirmation: false, recheck: false, revision: 1, files: [], history: [], changes: [], captured: stamp(), verified: stamp(), projectId: "", contact: "采购联系人 · 联系方式见公告", qualification: "具备履约所需专业技术能力；提供类似项目证明，不接受联合体。", evidence: ["产品与技术方案 · 数据平台建设方案", "企业资质证照 · ISO 9001、ISO 27001", "业绩案例 · 同类平台建设合同", "企业资料 · 服务区域说明", "公告第四节 · 获取文件与投标期限"] }, extra || {});
  }
  function initial() {
    const rules = presetRules();
    const opportunities = [
      opportunity("OP001", "某市公共数据治理与共享平台建设项目", "某市政务数据管理中心", "广东", 680, "R1", { summary: "建设数据目录、数据质量、数据共享交换和运营管理能力，完成存量数据治理及接口接入。", factors: [1, 1, 1, 1, .5], files: [{ name: "数据治理与共享平台采购文件.pdf", size: "2.6 MB", kind: "demo", main: true }], risks: ["采购文件要求驻场实施，需确认服务团队安排。"], requiresConfirmation: true }),
      opportunity("OP002", "某区政务应用系统年度运维服务项目", "某区政务服务中心", "广东", 120, "R1", { summary: "提供软件运维、监控巡检、故障响应、数据备份及服务报告。", factors: [1, .5, 1, 1, 1], unknown: [0, 10, 0, 0, 0], risks: ["项目经理近三个月社保证明尚未在资料库核验。"], review: "pending" }),
      opportunity("OP003", "某集团智能体应用与知识服务平台建设", "某产业投资集团", "江苏", 360, "R3", { summary: "建设 AI应用、智能体编排、知识检索和内部服务助手，包含数据接入及部署实施。", factors: [1, 1, 1, .5, 1], review: "approved", approvedRevision: 1, acquired: true, files: [{ name: "智能体应用采购文件.pdf", size: "1.8 MB", kind: "demo", main: true }], history: [{ action: "确认投标", note: "已确认需求匹配，主招标文件已获取，建议进入投标准备。", user: "李明远", at: stamp(), revision: 1 }] }),
      opportunity("OP004", "某市数据资源目录升级与质量治理服务", "某市大数据中心", "四川", 220, "R1", { summary: "升级数据目录，开展数据治理、质量规则配置与质量问题闭环。", acquisitionEnd: dateAt(-1), registrationEnd: dateAt(-1, "12:00"), deadline: dateAt(2, "09:30"), opening: dateAt(2, "09:30"), factors: [1, .5, 1, .5, .5], risks: ["文件获取和报名已截止，请关注公告参与条件；投标将在两天后截止。"], unknown: [0, 5, 0, 0, 0] }),
      opportunity("OP005", "某单位业务平台安全运维及改造项目", "某事业单位", "北京", 90, "R1", { summary: "开展软件运维、安全加固、平台接口改造与应急保障。", lifecycle: "paused", factors: [.5, .5, 1, .5, .5], risks: ["采购方已发布暂停公告，等待恢复采购。"], history: [{ action: "采购暂停", note: "采购计划调整，暂停期间保留机会，不能确认投标。", user: "系统", at: stamp(), revision: 1 }, { action: "采集入库", note: "暂停前初评 65 分，符合入库要求；当前采购暂停，保留当时初评结果。", user: "系统", at: dateAt(-1, "10:00"), revision: 1, score: 65 }], changes: [{ at: stamp(), title: "暂停采购", text: "采购计划调整，恢复时间另行通知。", revision: 1 }] }),
      opportunity("OP006", "某园区数据平台软件许可与配套服务", "某园区运营公司", "广东", 180, "R1", { summary: "采购数据平台软件及配套实施、培训和接口服务。", published: dateAt(-16, "09:00"), acquisitionStart: dateAt(-16, "09:00"), deadline: dateAt(-2, "09:30"), opening: dateAt(-2, "09:30"), acquisitionEnd: dateAt(-9), captured: dateAt(-15, "10:00"), verified: dateAt(-2, "10:00"), factors: [.5, .5, 1, 1, 0], review: "rejected", history: [{ action: "放弃机会", note: "已过投标截止时间，保留历史记录。", user: "周晓雯", at: dateAt(-2, "10:00"), revision: 1 }, { action: "采集入库", note: "初评 70 分，符合入库要求；投标截止后保留原初评与处理记录。", user: "系统", at: dateAt(-15, "10:00"), revision: 1, score: 70 }] })
    ];
    const candidates = [
      opportunity("OP007", "某市数据资产运营与治理平台建设", "某市数据运营公司", "广东", 460, "R1", { summary: "建设数据资产目录、质量治理、运营分析与共享服务，交付软件平台及实施服务。", sourceIds: ["S2"], factors: [1, .5, 1, 1, 1], unknown: [0, 5, 0, 0, 0], risks: ["数据安全专职人员资质需要进一步核验。"] }),
      opportunity("OP008", "某集团软件运维与AI应用开发服务", "某交通投资集团", "江苏", 260, "R3", { summary: "提供业务软件运维、AI应用开发、知识库问答和智能体应用集成服务。", sourceIds: ["S2"], factors: [1, 1, 1, .5, 1] }),
      opportunity("OP009", "某中心办公楼土建装修工程", "某公共服务中心", "四川", 600, "R1", { summary: "开展办公楼土建装修、施工及配套安装。", sourceIds: ["S1"], factors: [0, 0, 1, .5, 1] }),
      opportunity("OP010", "某单位数据资源管理服务采购", "某公共数据单位", "北京", null, "R1", { summary: "数据目录整理与平台管理服务，预算和完整资格要求需获取采购文件后核验。", sourceIds: ["S1"], factors: [1, .5, 0, .5, 1], unknown: [0, 10, 15, 0, 0], risks: ["公告未披露包预算及完整资格条件。"] }),
      opportunity("OP011", "某单位办公审批与合同资产管理系统", "某公共服务单位", "广东", 150, "R2", { summary: "开发办公审批、合同管理、资产管理和项目管理功能，采用成熟技术完成个性化业务系统集成。", sourceIds: ["S3"], factors: [1, 1, 1, 1, 1] }),
      opportunity("OP012", "某园区智能助手与特殊视频识别研发", "某园区运营单位", "广东", 300, "R3", { summary: "核心交付包括特殊视频识别、复杂算法自研及底层技术研发，需研究突破。", sourceIds: ["S1"], factors: [1, 1, 1, 1, 1] }),
      opportunity("OP013", "某单位财务管理软件与专业财务核算服务", "某事业单位", "广东", 180, "R2", { summary: "核心交付需要承担专业财务核算、复杂税务处理及结果准确性责任。", sourceIds: ["S2"], factors: [1, 1, 1, 1, 1] }),
      opportunity("OP014", "某医院办公审批与知识库问答系统", "某医院", "广东", 85, "R2", { summary: "开发办公审批和知识库问答功能。医疗诊断由医生负责，本项目不承担医疗诊断责任，不涉及复杂算法自研。", sourceIds: ["S3"], factors: [1, .5, 1, 1, 1], risks: ["需核实知识库内容由采购人专业人员确认。"] })
    ];
    opportunities.concat(candidates).forEach(function (item) { item.ruleId = RULE_ID; item.matchedRules = [RULE_ID]; item.ruleSnapshot = copy(rules[0]); });
    return { schema: 1, presetVersion: PRESET_VERSION, remarksInitialized: true, baseline: screeningBaseline(), opportunities: opportunities, candidates: candidates, rules: rules, collection: presetSchedule(), sources: presetSources(), runs: [], projects: [], lastRun: {}, collectionRound: 0 };
  }
  function statusSamples() {
    const rule = presetRule();
    function record(action, note, hours, revision, score) {
      return { action: action, note: note, user: action === "采集入库" || action === "关联更正公告" ? "系统" : "周晓雯", at: stamp(Date.now() + hours * 3600000), revision: revision || 1, score: score, ruleSnapshot: copy(rule) };
    }
    function file(name, size) { return [{ name: name, size: size || "2.1 MB", kind: "demo", main: true }]; }
    const items = [
      opportunity("OP015", "某市公共数据可视化与运营分析平台", "某市数据运营中心", "广东", 320, RULE_ID, { summary: "建设数据可视化、BI 报表与运营分析功能，采用成熟平台完成实施与系统集成。", sourceIds: ["S2"], acquisitionEnd: stamp(Date.now() + 30 * 3600000), factors: [.9, .8, 1, 1, 1], files: file("数据可视化与运营分析平台采购文件.pdf"), risks: ["文件获取将在 30 小时内截止，请及时办理获取手续。"], history: [record("采集入库", "初评达到入库要求；文件获取临近截止，需尽快确认参与。", -12, 1, 84)] }),
      opportunity("OP016", "某集团客户管理与合同管理系统一体化建设及办公审批协同、存量业务数据迁移与系统集成服务采购项目", "某市城市建设投资控股集团有限公司数字化运营与信息技术管理中心", "广东", 240, RULE_ID, { summary: "开发客户管理、合同管理和办公审批功能，完成存量数据迁移及系统集成。", sourceIds: ["S1", "S2", "S3"], review: "approved", approvedRevision: 1, confirmedBy: "周晓雯", confirmedAt: stamp(Date.now() - 6 * 3600000), confirmedRuleRevision: 1, factors: [1, 1, 1, .5, 1], risks: ["已确认参与，尚未取得主招标文件，转入项目时需补传。"], history: [record("确认投标", "", -6), record("采集入库", "初评 95 分，需求与业务方向匹配，主文件待获取。", -24, 1, 95)] }),
      opportunity("OP017", "某市数据共享交换平台升级服务", "某市政务服务和数据管理局", "广东", 580, RULE_ID, { summary: "升级数据共享交换、数据目录与接口管理功能，交付软件平台及实施服务。", sourceIds: ["S2"], review: "transferred", approvedRevision: 1, acquired: true, registered: true, projectId: "BID-OP-OP017", files: file("数据共享交换平台升级采购文件.pdf", "3.2 MB"), history: [record("转入投标项目", "项目 BID-OP-OP017；负责人 周晓雯；主招标文件已带入。", -6), record("确认投标", "需求匹配、服务团队及主文件均已确认，进入项目准备。", -12), record("采集入库", "初评 100 分，符合入库要求。", -30, 1, 100)] }),
      opportunity("OP018", "某集团办公审批与资产管理平台", "某城市运营集团", "江苏", 210, RULE_ID, { summary: "建设办公审批、资产管理及项目管理功能，使用成熟技术开展应用开发。", sourceIds: ["S3"], review: "rejected", risks: ["业务团队本期资源已排满，主动放弃本次机会。"], history: [record("放弃机会", "实施窗口与现有项目冲突，团队资源不足，放弃本次投标。", -4), record("采集入库", "初评 100 分，符合业务范围及入库要求。", -24, 1, 100)] }),
      opportunity("OP019", "某区知识库问答与文档处理应用", "某区政务服务中心", "广东", 130, RULE_ID, { summary: "建设知识库问答、文档处理及报告生成功能，采用成熟 AI 应用组件实施。", sourceIds: ["S3"], acquisitionStart: dateAt(2, "09:00"), acquisitionEnd: dateAt(8), factors: [.8, .8, 1, 1, 1], files: file("知识库问答与文档处理应用采购文件.pdf"), risks: ["文件获取尚未开始，请关注公告列明的获取时间。"], history: [record("采集入库", "公告已发布，初评 88 分；文件获取将在两天后开始。", -12, 1, 88)] }),
      opportunity("OP020", "某单位运营支撑服务采购", "某公共数据服务中心", "北京", 160, RULE_ID, { summary: "采购范围调整为运营支撑与日常辅助服务，详细工作清单和新的投标截止时间将在补充公告中公布。", sourceIds: ["S1"], deadline: "", opening: "", revision: 2, recheck: true, factors: [1, .5, 1, 1, 0], unknown: [0, 0, 0, 0, 15], risks: ["采购范围已调整，核心交付与新的投标截止时间尚未明确，需要核对补充公告。"], evidence: ["更正公告第二节 · 工作清单待补充", "企业材料 · 调整后的类似业绩要求待核对", "更正公告第一节 · 本包预算 160 万元", "公告第二节 · 服务实施地点", "更正公告第四节 · 新的投标截止时间待补充"], changes: [{ at: stamp(Date.now() - 3 * 3600000), title: "采购范围及时间调整", text: "原数据治理与报表管理服务调整为运营支撑，详细工作清单和新的截止时间待补充；原入库记录保留，未核实部分不计分。", revision: 2 }], history: [record("关联更正公告", "采购范围和参与时间调整后信息不完整，当前分数下降；请核验补充公告后确认是否参与。", -3, 2), record("采集入库", "原公告为数据治理与报表管理服务，初评 95 分，符合当时入库要求。", -30, 1, 95)] }),
      opportunity("OP021", "某园区合同与项目管理系统升级", "某科技园运营公司", "广东", 190, RULE_ID, { summary: "升级合同管理、项目管理及办公审批功能，开展软件应用改造与系统集成。", sourceIds: ["S2"], lifecycle: "terminated", review: "rejected", factors: [1, .8, 1, 1, 1], risks: ["采购方已发布终止公告，本轮采购不再继续。"], changes: [{ at: stamp(Date.now() - 10 * 3600000), title: "终止采购", text: "因采购需求调整终止本轮采购，后续安排以新公告为准。", revision: 2 }], revision: 2, history: [record("放弃机会", "采购方已终止本轮采购，保留机会与终止依据。", -6, 2), record("关联更正公告", "本轮采购终止，停止推进投标。", -10, 2), record("采集入库", "初评 95 分，符合入库要求。", -30, 1, 95)] }),
      opportunity("OP022", "某市数据中台与质量治理平台建设", "某市公共数据中心", "四川", 480, RULE_ID, { summary: "建设数据中台、数据质量及共享接口功能；更正公告增加现场实施服务期限。", sourceIds: ["S2"], review: "approved", approvedRevision: 1, revision: 2, recheck: true, factors: [1, .8, 1, 1, 1], files: file("数据中台与质量治理平台采购文件.pdf", "2.8 MB"), risks: ["现场实施服务由 3 个月调整为 6 个月，需要重新确认人员安排。"], changes: [{ at: stamp(Date.now() - 3 * 3600000), title: "服务期限更正", text: "现场实施服务由 3 个月调整为 6 个月；原确认记录保留，请重新确认是否投标。", revision: 2 }], history: [record("关联更正公告", "服务期限调整为 6 个月，保留原决定，请重新确认是否投标。", -3, 2), record("确认投标", "按原公告的实施周期确认参与，团队安排可满足。", -16), record("采集入库", "初评 95 分，符合入库要求。", -30, 1, 95)] }),
      opportunity("OP023", "某集团知识服务与智能助手应用平台", "某产业发展集团", "江苏", 350, RULE_ID, { summary: "建设知识库问答、智能助手及文档处理功能；更正公告将投标截止延长两天。", sourceIds: ["S1", "S3"], review: "transferred", projectId: "BID-OP-OP023", approvedRevision: 1, revision: 2, recheck: true, acquired: true, registered: true, deadline: dateAt(17, "09:30"), opening: dateAt(17, "09:30"), factors: [.9, 1, 1, 1, 1], files: file("知识服务与智能助手平台采购文件.pdf", "2.4 MB"), risks: ["投标截止已延期，需在关联项目中核对交付安排和公告版本。"], changes: [{ at: stamp(Date.now() - 2 * 3600000), title: "投标截止延期", text: dateAt(15, "09:30") + " → " + dateAt(17, "09:30") + "；请在关联项目中核对变更影响。", revision: 2 }], history: [record("关联更正公告", "投标截止延期两天，已同步关联项目的来源更新提醒。", -2, 2), record("转入投标项目", "项目 BID-OP-OP023；负责人 李明远；主招标文件已带入。", -14), record("确认投标", "需求与成熟 AI 应用方向匹配，确认参与。", -20), record("采集入库", "初评 97 分，符合入库要求。", -30, 1, 97)] }),
      opportunity("OP024", "某园区数据可视化与视频分析平台", "某智慧园区运营公司", "广东", 280, RULE_ID, { summary: "更正后的核心交付新增特殊视频识别及复杂算法自研，需承担算法研究与准确率指标。", sourceIds: ["S3"], revision: 2, recheck: true, factors: [1, .5, 1, .5, 1], risks: ["更正后新增专项技术研究，超出当前成熟应用开发的承接范围。"], changes: [{ at: stamp(Date.now() - 2 * 3600000), title: "采购范围更正", text: "原范围为数据可视化与报表展示；新增特殊视频识别和复杂算法自研要求，当前初评低于入库标准，保留历史供人工确认。", revision: 2 }], history: [record("关联更正公告", "核心交付新增算法研究任务，当前范围不符且初评分下降；原机会保留，待人工决定。", -2, 2), record("采集入库", "原公告采购数据可视化与 BI 报表，初评 95 分，符合当时入库要求。", -30, 1, 95)] })
    ];
    items.forEach(function (item) {
      item.ruleSnapshot = copy(rule);
      item.captured = stamp(Date.now() - 36 * 3600000);
      if (item.review === "approved" || item.projectId) {
        const confirmation = item.history.find(function (entry) { return entry.action === "确认投标"; });
        item.confirmedBy = confirmation.user; item.confirmedAt = confirmation.at; item.confirmedRuleRevision = rule.revision;
      }
      if (["OP020", "OP024"].includes(item.id)) {
        const saved = captureAssessment(item, rule, stamp(Date.now() - 3600000));
        item.history.unshift({ action: "重新初评", note: "按更正后的公告完成初评；" + saved.decision.reason + "。原合格入库记录保留，是否投标由人工决定。", user: "周晓雯", at: saved.at, revision: item.revision, score: saved.result.score, ruleSnapshot: copy(rule), assessmentSnapshot: copy(saved) });
      }
    });
    const projects = items.filter(function (item) { return item.projectId; }).map(function (item) {
      const updated = item.id === "OP023";
      return { id: item.projectId, name: item.name, purchaser: item.purchaser, owner: updated ? "李明远" : "周晓雯", deadline: updated ? dateAt(15, "09:30") : item.deadline, deadlineText: updated ? "来源公告已更新，请核对截止时间" : "已确认投标，待解析招标文件", budget: item.amount + " 万元", stage: "解析中", stageDetail: "招标机会转入 · 等待解析", progress: 0, status: "parsing", opportunityId: item.id, opportunityScore: updated ? 97 : 100, opportunityRevision: 1, tenderNumber: item.number, package: item.package, files: copy(item.files), fileName: item.files[0].name, sourceSummary: updated ? "建设知识库问答、智能助手及文档处理功能，采用成熟技术完成应用开发与系统集成。" : item.summary, qualification: item.qualification, region: item.region, createdAt: stamp(Date.now() - (updated ? 14 : 6) * 3600000), opportunityChange: updated ? item.changes[0].text : "" };
    });
    return { opportunities: items, projects: projects };
  }
  function completeStatusSamples(next) {
    if (next.statusSamplesVersion === 2) return next;
    const samples = statusSamples();
    samples.opportunities.forEach(function (item) {
      // Append once; existing decisions, deleted project links and colliding records remain untouched.
      if (next.opportunities.concat(next.candidates || []).some(function (existing) { return existing.id === item.id; }) || next.projects.some(function (project) { return project.opportunityId === item.id || project.id === item.projectId; })) return;
      next.opportunities.push(item);
      const project = samples.projects.find(function (entry) { return entry.opportunityId === item.id; });
      if (project) next.projects.push(project);
    });
    next.statusSamplesVersion = 2;
    return next;
  }
  let state;
  try { state = storage && JSON.parse(storage.getItem(KEY)); } catch (error) { state = null; }
  if (!state || state.schema !== 1 || !Array.isArray(state.opportunities) || !Array.isArray(state.projects) || !Array.isArray(state.rules) || !Array.isArray(state.sources)) state = initial();
  function intervalSchedule(next) {
    const rule = next.rules[0], previous = next.collection || {};
    const hours = Number(rule.hours == null ? previous.hours : rule.hours);
    const lookback = Number(rule.lookback == null ? previous.lookback : rule.lookback);
    rule.hours = Number.isInteger(hours) && hours >= 1 && hours <= 72 ? hours : 2;
    rule.lookback = Number.isInteger(lookback) && lookback >= 1 && lookback <= 30 ? lookback : 7;
    delete rule.cadence; delete rule.fixed;
    next.collection = { hours: rule.hours, lookback: rule.lookback, lastRun: previous.lastRun || Date.now() };
    return next;
  }
  function upgradePreset(previous) {
    if (previous.presetVersion === PRESET_VERSION && previous.rules.length === 1 && previous.rules[0].format === "form" && previous.collection) return previous;
    if (previous.presetVersion === 7 && previous.rules.length === 1 && previous.rules[0].format === "form") {
      const next = copy(previous);
      next.legacyRules = (next.legacyRules || []).concat(copy(next.rules));
      next.presetVersion = PRESET_VERSION;
      return intervalSchedule(next);
    }
    if (previous.presetVersion === 6 && previous.rules.length === 1 && previous.rules[0].format === "form") {
      const next = copy(previous), rule = next.rules[0];
      next.legacyRules = (next.legacyRules || []).concat(copy(next.rules));
      delete rule.missingPolicy;
      rule.remarks = String(rule.remarks || ""); rule.revision += 1; rule.savedAt = stamp();
      next.opportunities.forEach(function (item) {
        item.recheck = true;
        item.history.unshift({ action: "入库规则调整", note: "入库标准已更新，原审核与文件保留，请重新初评并复核。", user: "系统", at: stamp(), revision: item.revision });
      });
      next.projects.forEach(function (project) { project.opportunityChange = "来源机会已改为统一按初评分入库，请回溯复核；原项目文件保留。"; });
      next.presetVersion = PRESET_VERSION;
      return intervalSchedule(next);
    }
    const next = copy(previous), legacy = next.rules || [], rule = presetRule();
    next.legacyRules = (next.legacyRules || []).concat(copy(legacy));
    rule.revision = Math.max.apply(null, legacy.map(function (old) { return Number(old.revision) || 1; }).concat([0])) + 1;
    const structured = legacy.find(function (old) { return old.format === "structured"; });
    const textRule = legacy.find(function (old) { return old.id === RULE_ID && typeof old.accepted === "string"; });
    if (structured) {
      rule.keywords = structured.accepted.concat(structured.extraAccepted || []).join(",");
      rule.excludes = structured.excluded.concat(structured.extraExcluded || []).join(",");
      rule.regions = structured.regionMode === "selected" ? structured.regions.join(",") : "";
      rule.min = structured.budgetMode === "range" ? structured.min || 0 : 0;
      rule.max = structured.budgetMode === "range" ? structured.max : null;
      rule.minDays = structured.minDays; rule.threshold = structured.threshold; rule.remarks = String(structured.remarks || structured.notes || "");
    } else if (!textRule && legacy.length) {
      rule.description = Array.from(new Set(legacy.map(function (old) { return old.description; }).filter(Boolean))).join("；") || rule.description;
      rule.keywords = Array.from(new Set(legacy.reduce(function (items, old) { return items.concat(tokens(old.keywords)); }, []))).join(",") || rule.keywords;
      rule.excludes = Array.from(new Set(legacy.reduce(function (items, old) { return items.concat(tokens(old.excludes)); }, []))).join(",");
      rule.regions = Array.from(new Set(legacy.reduce(function (items, old) { return items.concat(tokens(old.regions)); }, []))).join(",");
      if (legacy.length === 1) ["min", "max", "minDays", "threshold", "remarks"].forEach(function (key) { if (legacy[0][key] != null) rule[key] = legacy[0][key]; });
    }
    // Preserve prior free-form notes without guessing constraints or discarding them.
    rule.legacyNotes = legacy.reduce(function (notes, old) { return notes.concat(old.legacyNotes || [], [old.notes, old.preferences, typeof old.accepted === "string" ? old.accepted : "", typeof old.excluded === "string" ? old.excluded : ""].filter(Boolean)); }, []);
    const sourceIds = next.sources.map(function (source) { return source.id; });
    const previousSources = legacy.reduce(function (items, old) { return items.concat(Array.isArray(old.sources) ? old.sources : []); }, []);
    rule.sources = previousSources.length ? Array.from(new Set(previousSources)).filter(function (id) { return sourceIds.includes(id); }) : sourceIds;
    const oldSchedule = legacy.find(function (old) { return old.enabled && old.cadence; });
    next.collection = next.collection || presetSchedule();
    if (oldSchedule) Object.assign(next.collection, { cadence: oldSchedule.cadence, hours: oldSchedule.hours || 2, fixed: oldSchedule.fixed || "09:00,14:00,18:00", lookback: oldSchedule.lookback || 7 });
    ["cadence", "hours", "fixed", "lookback"].forEach(function (key) { if (next.collection[key] != null) rule[key] = next.collection[key]; });
    if (next.collection.enabled === false) rule.cadence = "manual";
    next.rules = [rule]; next.baseline = next.baseline || screeningBaseline();
    [next.opportunities, next.candidates || []].forEach(function (items) { items.forEach(function (item) { item.ruleId = RULE_ID; item.matchedRules = [RULE_ID]; }); });
    next.opportunities.forEach(function (item) {
      item.recheck = true; item.history = item.history || [];
      item.history.unshift({ action: "筛选规则更新", note: "筛选要求已更新，原审核、文件与项目关联保留，请重新初评并复核。", user: "系统", at: stamp(), revision: item.revision });
    });
    next.projects.forEach(function (project) { project.opportunityChange = "来源机会的筛选要求已更新，请回溯复核；原项目文件保留。"; });
    next.presetVersion = PRESET_VERSION;
    return intervalSchedule(next);
  }
  function collectionMessage(value) {
    const messages = {
      "模拟访问超时": "网站请求超时，未能获取公告列表，请稍后重试。",
      "访问超时": "网站请求超时，未能获取公告列表，请稍后重试。",
      "请求超时": "网站请求超时，未能获取公告列表，请稍后重试。",
      "模拟采集失败": "公告列表读取失败，请检查网站是否可正常访问。",
      "模拟访问失败": "网站连接失败，请稍后重试。"
    };
    return messages[value] || String(value || "").replace(/(?:模拟|演示)(?:访问|请求)超时/g, "网站请求超时，未能获取公告列表，请稍后重试。");
  }
  function collectionSourceSnapshot(source) {
    return { id: source.id, name: source.name, collectionUrl: source.collectionUrl || source.url || "" };
  }
  function collectionIdentity(row, run, index, next) {
    const snapshot = row.sourceSnapshot || {};
    const references = Array.from(new Set([row.sourceId, row.id, snapshot.id].filter(Boolean).map(String)));
    if (references.length > 1) return "";
    const explicit = references[0];
    if (explicit) return String(explicit);
    if ((run.rows || []).length === 1 && run.retrySource) return String(run.retrySource);
    const address = snapshot.collectionUrl || row.collectionUrl || row.sourceUrl || "";
    const name = String(snapshot.name || row.source || row.sourceName || "").trim();
    const captured = run.ruleSources || [];
    function unique(items) {
      const ids = Array.from(new Set(items.map(function (item) { return item.id; }).filter(Boolean)));
      return ids.length === 1 ? ids[0] : "";
    }
    if (address) {
      const key = sourceAddressKey(address);
      const match = unique(captured.filter(function (item) { return item.collectionUrl && sourceAddressKey(item.collectionUrl) === key; }).concat((next.sources || []).filter(function (item) {
        return sourceAddressKey(item.collectionUrl) === key || (item.entryHistory || []).some(function (entry) { return sourceAddressKey(entry.collectionUrl) === key; });
      })));
      return match || "legacy-url:" + key;
    }
    if (name) {
      const capturedMatch = unique(captured.filter(function (item) { return item.name === name; }));
      const currentMatch = unique((next.sources || []).filter(function (item) { return item.name === name; }));
      return capturedMatch || currentMatch || "legacy-record:" + run.id + ":" + index;
    }
    return "";
  }
  function completeCollectionStatistics(next) {
    const metrics = { newCount: "newCount", updatedCount: "updated", duplicateCount: "duplicate", excludedCount: "excluded" };
    const kinds = { added: "newCount", updated: "updatedCount", duplicate: "duplicateCount", excluded: "excludedCount", "入库": "newCount", "新增入库": "newCount", "更正": "updatedCount", "更正关联": "updatedCount", "去重": "duplicateCount", "来源合并": "duplicateCount", "重复去重": "duplicateCount", "未入库": "excludedCount", "筛除": "excludedCount", "首次回溯范围外": "excludedCount" };
    const fields = Object.keys(metrics);
    function count(value) { return Number.isSafeInteger(value) && value >= 0; }
    (next.runs || []).forEach(function (run, runIndex) {
      if (!run.id) run.id = "legacy-run:" + runIndex;
      function backup() {
        if (!run.sourceStatisticsBackup) run.sourceStatisticsBackup = copy({ at: run.at || "", rows: run.rows || [], newCount: run.newCount, updated: run.updated, duplicate: run.duplicate, excluded: run.excluded, state: run.state });
      }
      const batch = run.originalStatistics || run;
      if (!(run.rows || []).length && !run.unresolvedRows) {
        backup();
        const refs = run.ruleSources && run.ruleSources.length ? run.ruleSources : run.retrySource ? [{ id: run.retrySource }] : run.ruleSnapshot && Array.isArray(run.ruleSnapshot.sources) ? run.ruleSnapshot.sources.map(function (id) { return { id: id }; }) : [];
        const ids = Array.from(new Set(refs.map(function (item) { return item.id; }).concat((run.results || []).map(function (item) { return item.sourceId; })).filter(Boolean)));
        run.rows = ids.map(function (id) {
          const reference = refs.find(function (item) { return item.id === id; }) || {};
          const evidence = (run.results || []).find(function (item) { return item.sourceId === id; }) || {};
          return { id: id, source: reference.name || evidence.sourceName || "", sourceSnapshot: reference.collectionUrl ? reference : undefined, ok: run.state === "success", state: run.state === "success" ? "completed" : "failed", message: run.message || "" };
        });
        if (!run.rows.length) run.unresolvedRows = [{ original: copy(run.sourceStatisticsBackup), reason: "原记录缺少网站归属，未自动分配来源。" }];
      }
      const rows = run.rows || [];
      const identities = rows.map(function (row, index) { return collectionIdentity(row, run, index, next); });
      const evidence = rows.map(function () { return new Map(); });
      let ambiguousEvidence = false;
      (run.results || []).forEach(function (entry, index) {
        const field = kinds[entry.kind] || kinds[entry.result];
        if (!field) return;
        const matches = identities.map(function (id, rowIndex) { return { id: id, index: rowIndex }; }).filter(function (item) {
          if (entry.sourceId) return item.id === entry.sourceId;
          const row = rows[item.index];
          return entry.sourceName && entry.sourceName === ((row.sourceSnapshot || {}).name || row.source);
        });
        if (matches.length !== 1) { ambiguousEvidence = true; return; }
        const map = evidence[matches[0].index], key = entry.noticeId || "entry:" + index;
        if (map.has(key) && map.get(key) !== field) ambiguousEvidence = true;
        else map.set(key, field);
      });
      const evidenceCounts = evidence.map(function (map) {
        const values = { newCount: 0, updatedCount: 0, duplicateCount: 0, excludedCount: 0 };
        map.forEach(function (field) { values[field] += 1; });
        return values;
      });
      const completeEvidence = !ambiguousEvidence && (run.results || []).length > 0 && fields.every(function (field) {
        return count(batch[metrics[field]]) && batch[metrics[field]] === evidenceCounts.reduce(function (sum, values) { return sum + values[field]; }, 0);
      });
      const retained = [];
      rows.forEach(function (row, index) {
        const id = identities[index], source = (next.sources || []).find(function (item) { return item.id === id; });
        const originalSnapshot = row.sourceSnapshot || {};
        const address = originalSnapshot.collectionUrl || row.collectionUrl || row.sourceUrl || "";
        let name = String(originalSnapshot.name || row.source || row.sourceName || (source || {}).name || "").trim();
        if (!name && address) { try { name = new URL(address).hostname; } catch (error) { /* No speculative name fallback. */ } }
        const base = row.statisticsOrigin === "prototype-example-completion" && row.originalStatistics ? row.originalStatistics : row;
        let values = {};
        fields.forEach(function (field) { values[field] = base[field]; });
        if (!fields.every(function (field) { return count(values[field]); })) {
          backup();
          const proven = evidenceCounts[index], total = fields.reduce(function (sum, field) { return sum + proven[field]; }, 0);
          const compatible = fields.every(function (field) { return !count(base[field]) || base[field] === proven[field]; });
          if (compatible && !ambiguousEvidence && (completeEvidence || count(base.collectedCount) && base.collectedCount === total && total > 0)) values = proven;
          else if (rows.length === 1 && fields.every(function (field) { return count(batch[metrics[field]]) && (!count(base[field]) || base[field] === batch[metrics[field]]); })) fields.forEach(function (field) { values[field] = batch[metrics[field]]; });
        }
        const validTime = Number.isFinite(time(row.at || run.at));
        if (!id || !name || !validTime || !fields.every(function (field) { return count(values[field]); })) {
          backup();
          if (!run.unresolvedRows) run.unresolvedRows = [];
          run.unresolvedRows.push({ original: copy(row), reason: !id || !name ? "原记录的网站归属无法唯一确定。" : !validTime ? "原记录缺少执行时间。" : "原记录缺少可核对的网站级统计。" });
          return;
        }
        const total = fields.reduce(function (sum, field) { return sum + values[field]; }, 0);
        if (!row.sourceSnapshot || row.id !== id || row.sourceId !== id || row.collectedCount !== total || fields.some(function (field) { return values[field] !== row[field]; })) backup();
        row.id = id; row.sourceId = id;
        row.sourceSnapshot = { id: id, name: name, collectionUrl: address, inferred: Boolean(originalSnapshot.inferred || !originalSnapshot.name && !row.source && !row.sourceName) };
        if (!row.source) row.source = name;
        fields.forEach(function (field) { row[field] = values[field]; });
        row.collectedCount = total;
        if (row.statisticsOrigin === "prototype-example-completion") row.statisticsOrigin = "verified-source-statistics";
        if (row.state !== "completed" && row.state !== "failed") {
          row.originalExecution = row.originalExecution || { state: row.state, ok: row.ok, message: row.message };
          row.state = row.ok ? "completed" : "failed";
        }
        row.ok = row.state === "completed";
        row.message = collectionMessage(row.message);
        retained.push(row);
      });
      run.rows = retained;
      if (retained.length && !(run.unresolvedRows || []).length) {
        fields.forEach(function (field) { run[metrics[field]] = retained.reduce(function (sum, row) { return sum + row[field]; }, 0); });
        run.failed = retained.filter(function (row) { return !row.ok; }).length;
        run.state = run.failed === retained.length ? "failed" : run.failed ? "partial" : "success";
      }
    });
    return next;
  }
  function seedCollectionSamples(next) {
    if (next.collectionSamplesVersion === 1) return;
    next.collectionSamplesVersion = 1;
    const recorded = new Set((next.runs || []).flatMap(function (run) { return (run.rows || []).map(function (row) { return row.sourceId || row.id; }); }));
    const sources = (next.sources || []).filter(function (source) { return !recorded.has(source.id) && presetSources().some(function (preset) { return preset.id === source.id && sourceAddressKey(preset.url) === sourceAddressKey(source.collectionUrl); }); });
    if (!sources.length) return;
    const times = (next.runs || []).map(function (run) { return time(run.at); }).filter(Number.isFinite);
    const base = Math.min(Date.now() - 2 * 3600000, times.length ? Math.min.apply(null, times) - 3600000 : Date.now());
    function batch(id, at, rows) {
      const run = { id: id, at: stamp(at), trigger: "计划采集", rows: rows, results: [], ruleSnapshot: copy(next.rules[0]), ruleSources: sources.map(collectionSourceSnapshot) };
      ["newCount", "updated", "duplicate", "excluded"].forEach(function (key, index) { run[key] = rows.reduce(function (sum, row) { return sum + row[["newCount", "updatedCount", "duplicateCount", "excludedCount"][index]]; }, 0); });
      run.failed = rows.filter(function (row) { return !row.ok; }).length;
      run.state = run.failed === rows.length ? "failed" : run.failed ? "partial" : "success";
      return run;
    }
    function row(source, added, duplicate, ok) {
      return { id: source.id, sourceId: source.id, source: source.name, sourceSnapshot: collectionSourceSnapshot(source), ok: ok, state: ok ? "completed" : "failed", message: ok ? "公告列表与正文读取完成" : "网站请求超时，未能获取公告列表，请稍后重试。", newCount: added, updatedCount: 0, duplicateCount: duplicate, excludedCount: 0, collectedCount: added + duplicate };
    }
    const initialRows = sources.map(function (source) { return row(source, next.opportunities.filter(function (item) { return item.sourceIds[0] === source.id; }).length, 0, true); });
    const latestRows = sources.map(function (source) {
      const result = row(source, 0, next.opportunities.filter(function (item) { return item.sourceIds.includes(source.id); }).length, true);
      result.updatedCount = next.opportunities.filter(function (item) { return item.sourceIds.includes(source.id) && item.revision > 1; }).length;
      result.excludedCount = (next.candidates || []).filter(function (item) { return item.sourceIds.includes(source.id) && admission(item, next.rules[0]).key === "excluded"; }).length;
      result.collectedCount += result.updatedCount + result.excludedCount;
      return result;
    });
    const samples = [batch("RUN-BASELINE-LATEST", base, latestRows), batch("RUN-BASELINE-INITIAL", base - 36 * 3600000, initialRows)];
    const aggregate = sources.find(function (source) { return source.id === "S3"; });
    if (aggregate) samples.push(batch("RUN-BASELINE-RETRY", base - 2 * 3600000, [row(aggregate, 0, 0, false)]));
    next.runs = next.runs.concat(samples).sort(function (a, b) { return time(b.at) - time(a.at); });
    sources.forEach(function (source) {
      if (!source.lastSuccess && !source.entryChangedAt) source.lastSuccess = stamp(base);
      if (!source.checked && source.status === "ready") source.checked = stamp(base - 37 * 3600000);
    });
  }
  function cleanStoredPresentation(next) {
    // Seed previously empty remarks once; subsequent edits and deliberate clearing remain intact.
    if (!next.remarksInitialized) {
      if (!String(next.rules[0].remarks || "").trim()) next.rules[0].remarks = defaultRemarks;
      next.remarksInitialized = true;
    }
    // Change only known, system-authored copy; leave user-entered rules and notes intact.
    const sourceMessages = {
      "用户指定示例来源；可模拟采集，真实接入待验证。": "尚无采集记录",
      "用户指定示例公告；正文、时效和真实采集能力待核验。": "尚无采集记录",
      "用户指定聚合来源；公告信息仍须回溯原始发布方核验。": "公告信息须回溯原始发布方核验。",
      "演示验证通过；尚未进行真实网站接入": "接入验证通过"
    };
    const fileNames = {
      "数据治理与共享平台采购文件（演示）.pdf": "数据治理与共享平台采购文件.pdf",
      "智能体应用采购文件（演示）.pdf": "智能体应用采购文件.pdf"
    };
    function cleanFiles(item) {
      const main = (item.files || []).find(function (file) { return file.kind === "demo" && file.name === item.fileName && fileNames[file.name]; });
      if (main) item.fileName = fileNames[main.name];
      (item.files || []).forEach(function (file) { if (file.kind === "demo" && fileNames[file.name]) file.name = fileNames[file.name]; });
    }
    (next.rules || []).forEach(function (rule) {
      if (rule.format === "form" && Array.isArray(rule.sources)) {
        if (!rule.legacySources) rule.legacySources = copy(rule.sources);
        delete rule.sources;
      }
    });
    (next.sources || []).forEach(function (source) {
      if (Object.prototype.hasOwnProperty.call(sourceMessages, source.error)) source.error = sourceMessages[source.error];
      if (source.collectionUrl == null) source.collectionUrl = source.url || "";
      if (source.checkError == null) source.checkError = source.status === "error" ? source.error || "来源检查未通过" : "";
      if (!source.accessMode) source.accessMode = "public";
      if (!source.loginMethod) source.loginMethod = "password";
      if (source.loginMethod !== "password") {
        source.previousLoginSetup = source.previousLoginSetup || { method: source.loginMethod, state: source.loginState || "pending", at: source.lastLogin || "" };
        source.loginMethod = "password"; source.passwordSet = false; source.loginState = "pending"; source.loginExpiresAt = 0;
        source.status = "pending"; source.checkError = "";
      }
      if (!source.loginAccount) source.loginAccount = "";
      source.passwordSet = Boolean(source.passwordSet);
      source.credentialRevision = Number(source.credentialRevision) || 0;
      // Credentials are never persisted by this local prototype; only presentation markers remain.
      delete source.loginPassword;
      source.error = collectionMessage(source.error);
      source.checkError = collectionMessage(source.checkError);
    });
    (next.opportunities || []).concat(next.candidates || []).forEach(function (item) {
      if (item.review === "following") item.review = "pending";
      if (item.projectId) item.review = "transferred";
      if (item.review === "rejected") item.recheck = false;
      if (item.number === "DEMO-" + item.id) item.number = "CG-" + item.id;
      if (item.agency === "示例公共采购代理中心") item.agency = "公共采购代理中心";
      if (item.contact === "示例项目联系人 · 0755-00000000") item.contact = "采购联系人 · 联系方式见公告";
      cleanFiles(item);
      (item.changes || []).forEach(function (entry) { if (entry.text === "演示公告：采购计划调整，恢复时间另行通知。") entry.text = "采购计划调整，恢复时间另行通知。"; });
      (item.history || []).forEach(function (entry) {
        const actions = { "审核通过": "确认投标", "继续跟进": "补充说明", "重新审核": "重新确认" };
        if (actions[entry.action]) { entry.legacyAction = entry.legacyAction || entry.action; entry.action = actions[entry.action]; }
        if (entry.action === "筛选要求更新") entry.note = String(entry.note || "").replace(/^(统一规则更新为 V\d+)；原初评与审核记录保留，推进前请重新初评并人工复核。$/, "$1；原初评与确认记录保留，请重新确认是否投标。");
        if (entry.action === "采集入库") entry.note = String(entry.note || "").replace(/^(按统一规则 V\d+ )完成初评演示；/, "$1完成初评；");
        if (entry.action === "重新初评") entry.note = String(entry.note || "").replace(/^(依据当前公告与统一规则 V\d+ )保存初评演示，/, "$1保存初评结果，");
        if (entry.action === "规则表单恢复") {
          entry.action = "筛选规则更新";
          if (entry.note === "已恢复原编辑表单，原有多条业务规则合并为一份；原审核、文件与项目关联保留，请重新初评并复核。") entry.note = "筛选要求已更新，原审核、文件与项目关联保留，请重新初评并复核。";
        }
        if (entry.action === "入库规则调整" && entry.note === "已取消信息不足特殊入库，统一按初评分判断；新增备注说明，原审核与文件保留，请重新初评并复核。") entry.note = "入库标准已更新，原审核与文件保留，请重新初评并复核。";
        const oldNotes = {
          "入库标准已更新，原审核与文件保留，请重新初评并复核。": "入库标准已更新，原确认和文件保留，请重新确认是否投标。",
          "筛选要求已更新，原审核、文件与项目关联保留，请重新初评并复核。": "筛选要求已更新，原确认、文件与项目关联保留，请重新确认是否投标。"
        };
        if (["入库规则调整", "筛选规则更新"].includes(entry.action) && oldNotes[entry.note]) { entry.legacyNote = entry.legacyNote || entry.note; entry.note = oldNotes[entry.note]; }
      });
    });
    (next.runs || []).forEach(function (run) {
      if (run.trigger === "计划采集（演示）") run.trigger = "计划采集";
      (run.rows || []).forEach(function (row) {
        if (row.message === "演示列表与正文读取完成") row.message = "公告列表与正文读取完成";
        else if (row.message === "模拟访问超时") row.message = collectionMessage(row.message);
        else if (sourceMessages[row.message]) row.message = sourceMessages[row.message];
      });
    });
    (next.projects || []).forEach(function (project) {
      if (project.deadlineText === "机会审核通过，待解析招标文件") project.deadlineText = "已确认投标，待解析招标文件";
      const opportunity = (next.opportunities || []).find(function (item) { return item.id === project.opportunityId; });
      if (opportunity && project.tenderNumber === "DEMO-" + opportunity.id) project.tenderNumber = opportunity.number;
      if (project.stageDetail === "机会转入 · 演示解析完成") project.stageDetail = "机会转入 · 解析完成";
      if (project.opportunityChange === "来源机会规则已合并至原编辑表单，请回溯复核；原项目文件保留。") project.opportunityChange = "来源机会的筛选要求已更新，请回溯复核；原项目文件保留。";
      if (["来源机会的筛选要求已更新，请回溯复核；原项目文件保留。", "来源机会已改为统一按初评分入库，请回溯复核；原项目文件保留。"].includes(project.opportunityChange)) project.opportunityChange = "来源机会的筛选要求已更新，请核对关联项目；原文件保留。";
      cleanFiles(project);
    });
    return completeCollectionStatistics(next);
  }
  state = completeStatusSamples(cleanStoredPresentation(upgradePreset(state)));
  completeOpportunityAssessments(state);
  let restoredDefaults = false;
  function isOpportunityDocument() {
    const current = window.location || (typeof location !== "undefined" ? location : {});
    return /(?:^|\/)(?:opportunities|opportunity-detail)\.html$/i.test(String(current.pathname || current.href || "").split(/[?#]/)[0].replace(/\\/g, "/"));
  }
  function isPageReload() {
    try {
      const performance = window.performance;
      const entry = performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      return entry ? entry.type === "reload" : Boolean(performance && performance.navigation && performance.navigation.type === 1);
    } catch (error) { return false; }
  }
  function restoreOpportunitySamples(next) {
    const previous = { at: stamp(), opportunities: copy(next.opportunities), candidates: copy(next.candidates || []), projects: copy(next.projects) };
    if (!next.beforeOpportunitySamples) next.beforeOpportunitySamples = previous;
    else next.previousOpportunityRound = previous;
    const seeds = completeOpportunityAssessments(completeStatusSamples(initial()));
    seeds.opportunities.forEach(function (item) {
      if (item.history.some(function (record) { return record.action === "采集入库"; })) return;
      const saved = item.assessmentSnapshot;
      item.history.push({ action: "采集入库", note: saved.decision.reason, user: "系统", at: saved.at, revision: saved.noticeRevision, score: saved.result.score, ruleSnapshot: copy(saved.rule), assessmentSnapshot: copy(saved) });
    });
    const resetIds = new Set(next.opportunities.concat(seeds.opportunities).map(function (item) { return item.id; }));
    const removedProjects = new Set(next.projects.filter(function (project) { return resetIds.has(project.opportunityId); }).map(function (project) { return project.id; }));
    if (window.BiddingProjectStore) previous.projectWorkspace = window.BiddingProjectStore.clearSession(Array.from(removedProjects));
    next.projects = next.projects.filter(function (project) { return !resetIds.has(project.opportunityId); }).concat(seeds.projects);
    next.opportunities = seeds.opportunities;
    next.candidates = seeds.candidates;
    next.statusSamplesVersion = 2;
    next.opportunitySampleRound = { version: 1, startedAt: stamp(), id: "ROUND-" + Date.now() + "-" + Math.random().toString(36).slice(2) };
    // Restart only the execution clock; saved rules, source settings and collection history remain intact.
    next.collection.lastRun = Date.now();
    try {
      const pending = JSON.parse(window.sessionStorage.getItem("biddingPendingProject"));
      if (pending && (removedProjects.has(pending.id) || resetIds.has(pending.opportunityId))) window.sessionStorage.removeItem("biddingPendingProject");
    } catch (error) { /* Unrelated project sessions and unavailable storage stay untouched. */ }
    restoredDefaults = true;
  }
  if (isOpportunityDocument() && (isPageReload() || !state.opportunitySampleRound)) restoreOpportunitySamples(state);
  seedCollectionSamples(state);
  function commit(next) {
    completeCollectionStatistics(next);
    completeOpportunityAssessments(next);
    if (storage) storage.setItem(KEY, JSON.stringify(next));
    state = next;
    return state;
  }
  function refresh() {
    if (!storage) return;
    const latest = JSON.parse(storage.getItem(KEY));
    if (latest && latest.schema === 1 && Array.isArray(latest.projects)) { state = completeStatusSamples(cleanStoredPresentation(upgradePreset(latest))); completeOpportunityAssessments(state); }
  }
  function change(handler) { refresh(); const next = copy(state); const result = handler(next); commit(next); return result; }
  try { commit(state); } catch (error) { storage = null; }
  if (window.BiddingProjectData && Array.isArray(window.BiddingProjectData.projects)) {
    // Project pages load their shared data before this store; include newly seeded links on first load.
    window.BiddingProjectData.projects = state.projects.concat(window.BiddingProjectData.projects.filter(function (project) {
      return !state.projects.some(function (linked) { return linked.id === project.id; });
    }));
  }
  function find(id) { return state.opportunities.find(function (item) { return item.id === id; }); }
  function tokens(value) { return String(value || "").split(/[,，、\n]/).map(function (part) { return part.trim().toLowerCase(); }).filter(Boolean); }
  function policyFor(rule) {
    rule = ruleModel(rule);
    const aliases = { "数据中台": "数据中台,数据平台,共享交换", "数据治理": "数据治理,数据目录,数据质量,数据资源,数据资产", "BI 报表": "BI报表,BI 报表", "系统集成": "系统集成,软件运维,应用系统", "个性化业务系统": "个性化业务系统,定制业务系统,业务管理系统", "知识库问答": "知识库问答,知识检索,知识服务", "智能助手": "智能助手,智能体,AI应用,AI 应用" };
    return {
      groups: scopeGroups.map(function (group) { return { name: group.name, keywords: group.items.filter(function (name) { return rule.accepted.includes(name); }).map(function (name) { return aliases[name] || name; }).join(",") }; }).concat(rule.extraAccepted.length ? [{ name: "其他关注业务", keywords: rule.extraAccepted.join(",") }] : []),
      technical: exclusionGroups[0].items.filter(function (name) { return rule.excluded.includes(name); }).join(","),
      professional: exclusionGroups[1].items.filter(function (name) { return rule.excluded.includes(name); }).join(","),
      extra: rule.extraExcluded.join(",")
    };
  }
  function capability(item, rule) {
    const selected = rule || state.rules[0];
    const policy = policyFor(selected);
    // The prototype evaluates the stated core delivery, not the buyer's industry.
    const original = String(item.coreDelivery || item.summary || "");
    const text = original.toLowerCase();
    function hits(value) {
      return tokens(value).filter(function (word) {
        let at = text.indexOf(word);
        while (at !== -1) {
          const left = text.slice(Math.max(0, at - 24), at);
          const right = text.slice(at + word.length, at + word.length + 24);
          const negated = /(?:不涉及|不承担|不负责|不开展|不要求|无需)[^，。；;]{0,12}$/.test(left);
          const externalOwner = /^由[^，。；;]{1,12}(?:负责|承担|完成)/.test(right);
          const displayOnly = /^(?:结果|数据)(?:的)?(?:展示|查询|导入|接口)/.test(right);
          if (!negated && !externalOwner && !displayOnly) return true;
          at = text.indexOf(word, at + word.length);
        }
        return false;
      });
    }
    const technical = hits(policy.technical);
    const professional = hits(policy.professional);
    const extra = hits(policy.extra);
    if (extra.length) return { key: "blocked", label: "不能做", blocked: true, group: "其他不承接事项", reason: "核心交付涉及不承接事项：" + extra.join("、"), hits: extra };
    if (technical.length || professional.length) return { key: "blocked", label: "不能做", blocked: true, group: technical.length ? "专业技术门槛" : "专业业务门槛", reason: "核心交付涉及" + (technical.length ? "专业技术门槛：" + technical.join("、") : "专业业务门槛：" + professional.join("、")), hits: technical.concat(professional) };
    const groups = policy.groups.filter(function (group) { return tokens(group.keywords).some(function (word) { return text.includes(word); }); });
    if (!groups.length) {
      const other = policyFor(presetRule()).groups.some(function (group) { return tokens(group.keywords).some(function (word) { return text.includes(word); }); });
      if (other) return { key: "outside", label: "不在关注范围", blocked: true, group: "业务范围不符", reason: "公告核心交付属于未选择的业务范围", hits: [] };
      return { key: "unknown", label: "待核验", blocked: false, group: "核心交付待核验", reason: "现有公告不足以确认属于已选业务范围，需要人工核对核心交付内容。", hits: [] };
    }
    return { key: "allowed", label: "可以做", blocked: false, group: groups.map(function (group) { return group.name; }).join(" / "), reason: "核心交付为" + groups.map(function (group) { return group.name; }).join("、") + "，未发现需承担的研究突破或专业业务判断。", hits: [] };
  }
  function status(item, now) {
    const current = now || Date.now();
    if (item.lifecycle === "terminated") return { key: "terminated", text: "已终止", tone: "red", blocked: true };
    if (item.lifecycle === "paused") return { key: "paused", text: "已暂停", tone: "orange", blocked: true };
    if (!item.deadline || !Number.isFinite(time(item.deadline))) return { key: "unknown", text: "时效待核验", tone: "orange", blocked: false };
    if (time(item.deadline) <= current) return { key: "closed", text: "投标已截止", tone: "gray", blocked: true };
    if ((item.registrationEnd && time(item.registrationEnd) <= current && !item.registered) || (item.acquisitionEnd && time(item.acquisitionEnd) <= current && !item.acquired)) return { key: "acquisitionClosed", text: "获取/报名已截止", tone: "orange", blocked: false };
    if (item.acquisitionStart && time(item.acquisitionStart) > current) return { key: "notStarted", text: "尚未开始获取", tone: "blue", blocked: false };
    if (!item.acquisitionEnd) return { key: "unknown", text: "获取期限待核验", tone: "orange", blocked: false };
    return { key: "open", text: item.acquired ? "已获取文件" : "可获取文件", tone: "green", blocked: false };
  }
  function participationChecks(item, now) {
    const current = now || Date.now(), checks = [];
    if (!Number.isFinite(time(item.deadline))) checks.push("公告未明确投标截止时间，请关注后续公告");
    if (!item.acquired) {
      if (!Number.isFinite(time(item.acquisitionEnd))) checks.push("公告未明确文件获取截止时间");
      else if (time(item.acquisitionEnd) <= current) checks.push("文件获取已截止，请关注公告参与条件");
    }
    if (item.registrationEnd && !item.registered) {
      if (!Number.isFinite(time(item.registrationEnd))) checks.push("公告未明确报名截止时间");
      else if (time(item.registrationEnd) <= current) checks.push("报名已截止，请关注公告参与条件");
    }
    return checks;
  }
  function evaluate(item, rule, at) {
    rule = ruleModel(rule || state.rules[0]);
    const ruleWeights = weights;
    const boundary = capability(item, rule);
    const current = at || Date.now(), timing = status(item, current);
    const deadlineDays = Math.max(0, (time(item.deadline) - current) / 86400000);
    const remaining = Math.min(deadlineDays, item.acquired ? deadlineDays : Math.max(0, (time(item.acquisitionEnd) - current) / 86400000));
    const factors = item.factors.slice();
    const missingPoints = item.unknown.slice();
    if (boundary.key === "unknown") missingPoints[0] = weights[0];
    if (!String(item.qualification || "").trim()) missingPoints[1] = weights[1];
    if (item.amount == null) missingPoints[2] = weights[2];
    const conditions = projectConditions(item, rule, current);
    if (!String(item.region || "").trim() || conditions.unknown.some(function (reason) { return /地区|地点|驻场/.test(reason); })) missingPoints[3] = weights[3];
    if (!Number.isFinite(remaining)) missingPoints[4] = weights[4];
    if (boundary.blocked) factors[0] = 0;
    factors[4] = timing.blocked ? 0 : !Number.isFinite(remaining) ? 0 : remaining >= rule.minDays ? 1 : remaining > 1 ? .5 : 0;
    const details = dimensions.map(function (name, index) {
      const unknown = Math.min(ruleWeights[index], Math.round(ruleWeights[index] * (missingPoints[index] || 0) / weights[index]));
      const score = Math.round((ruleWeights[index] - unknown) * factors[index] * 10) / 10;
      return { name: name, weight: ruleWeights[index], score: score, unknown: unknown, evidence: item.evidence[index] };
    });
    const score = Math.round(details.reduce(function (sum, row) { return sum + row.score; }, 0));
    const unknown = details.reduce(function (sum, row) { return sum + row.unknown; }, 0);
    return { score: score, unknown: unknown, coverage: 100 - unknown, details: details, boundary: boundary, label: boundary.blocked ? "不能做 · 不予推荐" : boundary.key === "unknown" ? "核心交付待核验" : timing.blocked ? "暂停推荐" : item.recheck ? "需重新确认" : score >= 80 ? "优先确认" : score >= 60 ? "进一步了解" : "低优先级", timing: timing };
  }
  function projectConditions(item, rule, at) {
    rule = ruleModel(rule || state.rules[0]);
    const blocked = [], unknown = [], warnings = [];
    const provinces = "北京,天津,上海,重庆,河北,山西,辽宁,吉林,黑龙江,江苏,浙江,安徽,福建,江西,山东,河南,湖北,湖南,广东,海南,四川,贵州,云南,陕西,甘肃,青海,台湾,内蒙古,广西,西藏,宁夏,新疆,香港,澳门".split(",");
    const cityProvince = { 深圳: "广东", 广州: "广东", 东莞: "广东", 佛山: "广东", 珠海: "广东", 惠州: "广东", 南京: "江苏", 苏州: "江苏", 成都: "四川", 杭州: "浙江", 武汉: "湖北" };
    function province(value) { return provinces.find(function (name) { return String(value || "").startsWith(name); }) || cityProvince[String(value || "").replace(/市$/, "")] || ""; }
    if (rule.regionMode === "selected") {
      const place = String(item.region || ""), parent = province(place);
      const matched = rule.regions.some(function (region) { return place.includes(region) || place.replace(/市$/, "") === region.replace(/市$/, "") || (provinces.includes(region) && region === parent); });
      if (!matched) {
        if (parent && rule.regions.every(function (region) { return province(region) && province(region) !== parent; })) blocked.push("实施地区不在指定范围：" + place);
        else unknown.push("实施地点尚不足以核实指定地区要求");
      }
    }
    if (rule.budgetMode === "range") {
      if (item.amount == null) unknown.push("本包预算未披露，需核验预算范围");
      else if ((rule.min != null && item.amount < rule.min) || (rule.max != null && item.amount > rule.max)) blocked.push("本包预算 " + item.amount + " 万元不在指定范围");
    }
    const onsiteText = [item.summary].concat(item.risks || []).join("；");
    const onsite = item.onsite || (/无需驻场|不要求驻场/.test(onsiteText) ? "no" : /驻场/.test(onsiteText) ? "required" : "unknown");
    if (rule.onsite === "reject") {
      if (onsite === "required") blocked.push("项目要求驻场，不符合不接受驻场的要求");
      else if (onsite === "unknown") unknown.push("驻场要求未明确");
    } else if (rule.onsite === "review" && onsite === "required") warnings.push("驻场安排需要具体评估");
    const days = (time(item.deadline) - (at || Date.now())) / 86400000;
    if (!Number.isFinite(days)) unknown.push("投标截止时间未明确");
    else if (days < rule.minDays) warnings.push("距投标截止不足期望的 " + rule.minDays + " 天");
    return { blocked: blocked, unknown: unknown, warnings: warnings };
  }
  function admission(item, rule, at) {
    rule = ruleModel(rule || state.rules[0]);
    const assessment = evaluate(item, rule, at), conditions = projectConditions(item, rule, at), boundary = assessment.boundary;
    if (boundary.blocked) return { key: "excluded", reason: boundary.reason, assessment: assessment, conditions: conditions };
    if (conditions.blocked.length) return { key: "excluded", reason: conditions.blocked.join("；"), assessment: assessment, conditions: conditions };
    if (boundary.key === "unknown" && /土建装修|土建施工/.test(item.summary)) return { key: "excluded", reason: "核心交付不属于已选软件应用范围", assessment: assessment, conditions: conditions };
    const missing = conditions.unknown.concat(boundary.key === "unknown" ? [boundary.reason] : [], assessment.unknown ? ["初评仍有 " + assessment.unknown + " 分对应条件待核验"] : []);
    const missingNote = missing.length ? "；" + missing.join("；") + "，未核实内容不计入得分" : "";
    if (assessment.score < rule.threshold) return { key: "excluded", reason: "初评 " + assessment.score + " 分，低于最低入库分数 " + rule.threshold + " 分" + missingNote, assessment: assessment, conditions: conditions };
    return { key: "admitted", reason: "初评 " + assessment.score + " 分，达到最低入库分数 " + rule.threshold + " 分" + missingNote + (conditions.warnings.length ? "；" + conditions.warnings.join("；") : ""), assessment: assessment, conditions: conditions };
  }
  function assessmentNotice(item) {
    const notice = {};
    ["id", "name", "number", "package", "round", "purchaser", "agency", "region", "amount", "cap", "totalAmount", "method", "term", "published", "summary", "coreDelivery", "qualification", "acquisitionStart", "acquisitionEnd", "registrationEnd", "deadline", "opening", "acquired", "registered", "lifecycle", "factors", "unknown", "evidence", "risks", "revision", "sourceIds", "noticeUrl", "noticeUrls"].forEach(function (key) { if (item[key] !== undefined) notice[key] = copy(item[key]); });
    return notice;
  }
  function captureAssessment(item, rule, at, retainedDecision) {
    const instant = typeof at === "number" ? at : Number.isFinite(time(at)) ? time(at) : Date.now();
    const assessedAt = typeof at === "string" ? at : stamp(instant), notice = assessmentNotice(item), decision = retainedDecision || admission(notice, rule, instant);
    item.assessmentSnapshot = { at: assessedAt, assessedAtMs: instant, noticeRevision: item.revision, ruleRevision: rule.revision, rule: copy(rule), notice: notice, result: copy(decision.assessment), decision: { key: decision.key, reason: decision.reason, conditions: copy(decision.conditions) } };
    item.assessmentInputsChanged = false;
    return item.assessmentSnapshot;
  }
  function completeOpportunityAssessments(next) {
    (next.opportunities || []).forEach(function (item) {
      if (!item.acquisitionStatus) item.acquisitionStatus = item.acquired ? "obtained" : "unknown";
      if (!item.registrationStatus) item.registrationStatus = item.registered ? "registered" : "unknown";
      if (item.assessmentSnapshot) return;
      const record = (item.history || []).find(function (entry) { return ["采集入库", "重新初评"].includes(entry.action) && Number.isFinite(entry.score); });
      const rule = record && record.ruleSnapshot || item.ruleSnapshot || next.rules[0];
      const saved = captureAssessment(item, rule, record && record.at || stamp());
      if (record) {
        saved.noticeRevision = record.revision || item.revision;
        // Preserve recorded totals. Missing historical breakdowns are not reconstructed from changed notices.
        if (saved.result.score !== record.score || saved.noticeRevision !== item.revision) {
          saved.result.score = record.score;
          saved.result.details = [];
          saved.result.label = "已保存初评";
          saved.result.unknown = 0;
          saved.result.coverage = null;
          saved.notice = saved.noticeRevision === item.revision ? saved.notice : null;
          if (!saved.notice) saved.result.boundary = { key: "unknown", label: "待核验", blocked: false, group: "评估依据已变化", reason: "该初评对应公告 V" + saved.noticeRevision + "，当前公告已有更新。" };
          saved.decision = { key: record.score >= rule.threshold ? "admitted" : "excluded", reason: record.note || "已保存本次初评结果", conditions: { blocked: [], unknown: [], warnings: [] } };
        }
      }
    });
    return next;
  }
  function assessment(item) {
    const saved = item.assessmentSnapshot;
    return { snapshot: saved, result: saved.result, decision: saved.decision, stale: Boolean(item.assessmentInputsChanged) || saved.noticeRevision !== item.revision || ruleBasis(saved.rule) !== ruleBasis(state.rules[0]) };
  }
  function assessmentBasis(saved) {
    const notice = {}, source = saved.notice || {};
    ["name", "number", "package", "round", "purchaser", "region", "amount", "cap", "summary", "coreDelivery", "qualification", "term", "method", "acquisitionStart", "acquisitionEnd", "registrationEnd", "deadline", "opening", "lifecycle", "acquired", "registered", "factors", "unknown", "evidence", "risks"].forEach(function (key) { if (source[key] !== undefined) notice[key] = source[key]; });
    const result = saved.result, conditions = saved.decision.conditions || {};
    return JSON.stringify({ noticeRevision: saved.noticeRevision, rule: ruleBasis(saved.rule), notice: notice, score: result.score, unknown: result.unknown, boundary: { key: result.boundary.key, reason: result.boundary.reason }, details: (result.details || []).map(function (row) { return { name: row.name, score: row.score, unknown: row.unknown, evidence: row.evidence }; }), decision: saved.decision.key, conditions: ["blocked", "unknown", "warnings"].map(function (key) { return (conditions[key] || []).slice().sort(); }) });
  }
  function reassess(id) {
    return change(function (next) {
      const item = next.opportunities.find(function (entry) { return entry.id === id; });
      if (!item) throw new Error("机会记录已变化，请返回机会列表查看。");
      if (item.projectId) throw new Error("该机会已转入项目，请查看关联项目。");
      const previous = copy(item.assessmentSnapshot);
      const alreadyNeedsConfirmation = Boolean(item.recheck);
      const saved = captureAssessment(item, next.rules[0]);
      const materialChanged = assessmentBasis(previous) !== assessmentBasis(saved);
      item.ruleSnapshot = copy(next.rules[0]);
      item.admission = copy(saved.decision);
      if (item.review === "approved") item.recheck = alreadyNeedsConfirmation || materialChanged;
      const confirmationNote = item.review === "approved" ? item.recheck ? "；投标判断依据已变化，请重新确认是否投标。" : "；投标判断依据无实质变化，原确认结果保留。" : "";
      item.history.unshift({ action: "重新初评", note: saved.decision.reason + confirmationNote, materialChanged: materialChanged, user: (window.AppCurrentUser || {}).name || "李明远", at: saved.at, revision: item.revision, score: saved.result.score, ruleSnapshot: copy(saved.rule), assessmentSnapshot: copy(saved), previousAssessmentSnapshot: previous });
      return saved;
    });
  }
  function normalizedRule(input, previous, next) {
    const updated = { id: RULE_ID, format: "form", revision: previous.revision, savedAt: previous.savedAt };
    ["description", "keywords", "excludes", "regions"].forEach(function (key) { updated[key] = String(input[key] || "").trim(); if (updated[key].length > 1000) throw new Error("单项内容最多填写 1000 字。"); });
    if (!updated.description || !tokens(updated.keywords).length) throw new Error("请填写业务方向和关键词。");
    ["min", "max", "minDays", "threshold", "hours", "lookback"].forEach(function (key) {
      const raw = input[key], value = raw === "" || raw == null ? null : Number(raw);
      if (value != null && (!Number.isFinite(value) || value < 0)) throw new Error("金额、天数、间隔和分数须填写有效的非负数字。"); updated[key] = value;
    });
    if (updated.min == null) updated.min = 0;
    if (updated.max != null && updated.min > updated.max) throw new Error("最低预算不能高于最高预算。");
    if (updated.minDays == null || !Number.isInteger(updated.minDays) || updated.minDays > 365) throw new Error("建议最少准备天数请填写 0～365 的整数。");
    if (updated.threshold == null || !Number.isInteger(updated.threshold) || updated.threshold > 100) throw new Error("初评入库标准请填写 0～100 的整数。");
    updated.remarks = String(input.remarks || "").trim();
    if (updated.remarks.length > 1000) throw new Error("备注说明最多填写 1000 字。");
    if (updated.hours == null || !Number.isInteger(updated.hours) || updated.hours < 1 || updated.hours > 72) throw new Error("采集周期请填写 1～72 的整数小时。");
    if (updated.lookback == null || !Number.isInteger(updated.lookback) || updated.lookback < 1 || updated.lookback > 30) throw new Error("首次回溯天数请填写 1～30 的整数。");
    if (previous.legacySources) updated.legacySources = copy(previous.legacySources);
    if (previous.legacyNotes) updated.legacyNotes = copy(previous.legacyNotes);
    return updated;
  }
  function saveRule(input, expectedRevision) {
    return change(function (next) {
      const previous = next.rules[0];
      if (expectedRevision !== previous.revision) throw new Error("规则已在其他页面更新，请先载入最新规则，再保存本次修改。");
      const updated = normalizedRule(input, previous, next);
      if (ruleFields.every(function (key) { return JSON.stringify(updated[key]) === JSON.stringify(previous[key]); })) return previous;
      const businessChanged = ruleBasis(previous) !== ruleBasis(updated);
      updated.revision += 1; updated.savedAt = stamp(); next.rules = [updated];
      const scheduleChanged = updated.hours !== previous.hours;
      next.collection = { hours: updated.hours, lookback: updated.lookback, lastRun: scheduleChanged ? Date.now() : next.collection.lastRun };
      if (businessChanged) next.opportunities.forEach(function (item) {
        item.recheck = item.review !== "rejected";
        item.history.unshift({ action: "筛选要求更新", note: "统一规则更新为 V" + updated.revision + "；原初评与确认记录保留。" + (item.review === "rejected" ? "机会继续保留为已放弃。" : item.projectId ? "请在关联项目中核对变更影响。" : "请重新确认是否投标。"), user: (window.AppCurrentUser || {}).name || "李明远", at: stamp(), revision: item.revision, ruleSnapshot: copy(updated), previousRuleSnapshot: copy(previous) });
      });
      if (businessChanged) next.projects.forEach(function (project) { project.opportunityChange = "来源机会的筛选要求已更新，请回溯复核；原项目文件保留。"; });
      return updated;
    });
  }
  function log(item, action, note) {
    const saved = item.assessmentSnapshot;
    item.history.unshift({ action: action, note: note, user: (window.AppCurrentUser || {}).name || "李明远", at: stamp(), revision: item.revision, score: saved ? saved.result.score : evaluate(item).score, ruleSnapshot: item.ruleSnapshot ? copy(item.ruleSnapshot) : null, assessmentSnapshot: saved ? copy(saved) : null });
  }
  function sourceAddress(value, label, required) {
    const text = String(value || "").trim();
    if (!text && !required) return "";
    let parsed;
    try { parsed = new URL(text); } catch (error) { throw new Error("请填写有效的" + label + "地址。"); }
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(label + "须使用 HTTP / HTTPS 地址。");
    if (text.length > 2048) throw new Error(label + "地址过长，请核对后重试。");
    return text;
  }
  function sourceAddressKey(value) {
    try { const parsed = new URL(value); parsed.hash = ""; return parsed.href.replace(/\/$/, ""); } catch (error) { return String(value || "").trim(); }
  }
  function sourceConfig(source) { return JSON.stringify([sourceAddressKey(source.collectionUrl), source.accessMode || "public", source.loginMethod || "password", source.loginAccount || "", Number(source.credentialRevision) || 0]); }
  function sourceAccess(source, now) {
    if (!source || source.accessMode !== "login") return { state: "public", label: "无需登录", reason: "", tone: "gray" };
    const current = now == null ? Date.now() : now;
    if (source.loginState === "active" && Number(source.loginExpiresAt) > current) return { state: "active", label: "已登录", reason: "", tone: "green" };
    if (source.loginState === "expired" || source.loginState === "active") return { state: "expired", label: "登录已失效", reason: "登录已失效，请重新检查登录。", tone: "orange" };
    return { state: "pending", label: "待登录", reason: source.loginAccount && source.passwordSet ? "请先检查来源，验证账号登录。" : "请先配置登录账号和密码。", tone: "orange" };
  }
  function saveSource(input, id) {
    return change(function (next) {
      const previous = id ? next.sources.find(function (source) { return source.id === id; }) : null;
      if (id && !previous) throw new Error("来源网站不存在，请刷新后查看。");
      const values = { name: String(input.name || "").trim(), type: String(input.type || previous && previous.type || "政府采购").trim(), column: String(input.column || "").trim(), collectionUrl: sourceAddress(input.collectionUrl, "采集入口", true) };
      if (!values.name || values.name.length > 50) throw new Error("网站名称请填写 1～50 字。");
      if (values.column.length > 80) throw new Error("采集栏目最多填写 80 字。");
      if (next.sources.some(function (source) { return source.id !== id && sourceAddressKey(source.collectionUrl) === sourceAddressKey(values.collectionUrl); })) throw new Error("该采集入口已配置，请编辑已有来源。");
      const updated = Object.assign({}, previous || { enabled: true, status: "pending", checked: "", lastSuccess: "" }, values, { id: id || "S" + Date.now() + "-" + (next.sources.length + 1) });
      updated.accessMode = input.accessMode || previous && previous.accessMode || "public";
      updated.loginMethod = "password";
      if (!["public", "login"].includes(updated.accessMode)) throw new Error("请选择有效的访问方式。");
      if (input.loginMethod && input.loginMethod !== "password") throw new Error("当前仅支持账号密码登录。");
      updated.loginAccount = String(input.loginAccount == null ? previous && previous.loginAccount || "" : input.loginAccount).trim();
      if (updated.loginAccount.length > 80) throw new Error("登录账号最多填写 80 字。");
      const passwordChanged = typeof input.loginPassword === "string" && input.loginPassword.length > 0;
      if (passwordChanged && input.loginPassword.length > 128) throw new Error("登录密码最多填写 128 位。");
      let sameOrigin = false;
      try { sameOrigin = previous && new URL(previous.collectionUrl).origin === new URL(updated.collectionUrl).origin; } catch (error) { /* Invalid legacy addresses cannot reuse a credential marker. */ }
      const sameCredential = previous && previous.loginMethod === updated.loginMethod && previous.loginAccount === updated.loginAccount && sameOrigin;
      updated.passwordSet = Boolean(updated.loginMethod === "password" && (passwordChanged || sameCredential && previous.passwordSet));
      updated.credentialRevision = (Number(previous && previous.credentialRevision) || 0) + (passwordChanged ? 1 : 0);
      if (updated.accessMode === "login" && updated.loginMethod === "password" && (!updated.loginAccount || !updated.passwordSet)) throw new Error("请填写登录账号和密码；更换账号或网站后需重新填写密码。");
      delete updated.loginPassword;
      const changed = !previous || sourceConfig(previous) !== sourceConfig(updated);
      const entryChanged = previous && sourceAddressKey(previous.collectionUrl) !== sourceAddressKey(updated.collectionUrl);
      if (changed) { updated.status = "pending"; updated.checkError = ""; updated.loginState = "pending"; updated.loginExpiresAt = 0; }
      if (entryChanged) {
        updated.entryHistory = (previous.entryHistory || []).concat([{ at: stamp(), collectionUrl: previous.collectionUrl, lastSuccess: previous.lastSuccess || "", captureFrom: previous.captureFrom }]);
        delete updated.captureFrom;
        delete updated.profileId;
        updated.entryChangedAt = stamp();
      }
      if (previous) next.sources[next.sources.findIndex(function (source) { return source.id === id; })] = updated;
      else next.sources.push(updated);
      return { source: updated, needsCheck: changed };
    });
  }
  function checkSource(id, expectedConfig) {
    return change(function (next) {
      const source = next.sources.find(function (entry) { return entry.id === id; });
      if (!source) throw new Error("来源网站不存在，请刷新后查看。");
      if (expectedConfig && expectedConfig !== sourceConfig(source)) throw new Error("来源配置已在其他页面更新，请按最新配置重新检查。");
      const steps = [];
      function step(label, ok, message) { steps.push({ label: label, ok: ok, message: message }); return ok; }
      let valid = true;
      try { sourceAddress(source.collectionUrl, "采集入口", true); }
      catch (error) { valid = false; step("入口地址", false, error.message); }
      if (valid) step("入口地址", true, "采集入口地址格式有效");
      // Local fixtures describe supported source interactions; this prototype performs no network checks.
      const profile = valid && presetSources().find(function (entry) { return sourceAddressKey(entry.url) === sourceAddressKey(source.collectionUrl); });
      let accessReady = true;
      if (valid && profile) {
        if (source.accessMode === "login" && source.loginMethod === "password" && source.loginAccount && source.passwordSet) {
          source.loginState = "active"; source.loginExpiresAt = Date.now() + 2 * 3600000; source.lastLogin = stamp();
        }
        const access = sourceAccess(source);
        accessReady = !access.reason;
        step("登录状态", accessReady, accessReady ? access.state === "public" ? "无需登录，读取公开公告" : "登录有效，已确认公告访问权限" : access.reason);
      }
      if (valid && !profile) step("公告列表", false, "未识别到可采集的公告列表，请核对采集入口。");
      if (profile && accessReady) {
        step("公告列表", true, "已识别公告列表及公告链接");
        const notice = next.candidates.find(function (item) { return item.sourceIds.includes(profile.id); });
        step("公告正文", Boolean(notice && notice.name && notice.summary), notice && notice.name && notice.summary ? "已从公告列表选取公告并识别标题和正文，未披露字段将在初评时按缺失信息处理" : "未能从公告列表识别正文，请核对采集入口。");
        source.accessScope = "公告正文可采集；附件按公告及账号权限获取";
        steps.push({ label: "附件权限", ok: true, limited: true, message: profile.id === "S2" ? "招标文件需按公告要求登录领取，不自动办理领取手续" : "附件获取范围以公告及网站账号权限为准" });
      }
      const failed = steps.find(function (entry) { return !entry.ok; });
      source.status = failed ? "error" : "ready";
      source.checked = stamp();
      source.checkError = failed ? failed.message : "";
      source.checkResult = { at: source.checked, ok: !failed, message: failed ? failed.message : "来源检查通过", steps: steps, config: sourceConfig(source) };
      if (!failed) source.profileId = profile.id;
      return source;
    });
  }
  function collect(sourceOnly, ruleIds, execution) {
    return change(function (next) {
      const run = { id: "RUN-" + Date.now(), at: stamp(), trigger: ruleIds ? "计划采集" : sourceOnly ? "单个来源采集" : "手动采集", rows: [], results: [], retrySource: sourceOnly || "", newCount: 0, updated: 0, duplicate: 0, excluded: 0, failed: 0 };
      const rule = next.rules[0];
      run.ruleSnapshot = copy(rule);
      run.ruleSources = next.sources.map(collectionSourceSnapshot);
      const selected = next.sources.filter(function (source) { return !sourceOnly || source.id === sourceOnly; });
      function started(source) { return (execution || []).find(function (entry) { return entry.id === source.id; }); }
      function blockReason(source) { return !source.enabled ? "来源已停用" : sourceAccess(source).reason || (source.status === "ready" ? "" : source.status === "pending" ? "尚未完成来源检查" : "来源检查未通过"); }
      run.skippedSources = selected.filter(function (source) { return !started(source) && blockReason(source); }).map(function (source) { return { id: source.id, name: source.name, reason: blockReason(source) }; });
      const sources = selected.filter(function (source) { return started(source) || !blockReason(source); });
      if (!sources.length) throw new Error("没有可采集来源，请检查来源启用、登录状态及检查结果。");
      sources.forEach(function (source) {
        const attempt = started(source), access = sourceAccess(source);
        const failure = attempt && attempt.config !== sourceConfig(source) ? "采集期间来源配置已变更，请重新检查来源后采集。" : access.reason ? (access.state === "expired" ? "读取公告时登录已失效。" : "读取公告时未完成登录。") + access.reason : !source.enabled ? "来源已停用，本次采集已停止。" : "";
        if (failure) {
          run.failed += 1;
          run.rows.push({ source: source.name, id: source.id, sourceId: source.id, sourceSnapshot: collectionSourceSnapshot(source), ok: false, state: "failed", message: failure, collectedCount: 0, newCount: 0, updatedCount: 0, duplicateCount: 0, excludedCount: 0 });
          return;
        }
        // Keep the first historical window stable; later runs do not slide it forward.
        if (!Number.isFinite(source.captureFrom)) source.captureFrom = (!source.entryChangedAt && Number.isFinite(time(source.lastSuccess)) ? time(source.lastSuccess) : Date.now()) - next.collection.lookback * 86400000;
        delete source.entryChangedAt;
        const sourceRow = { source: source.name, id: source.id, sourceId: source.id, sourceSnapshot: collectionSourceSnapshot(source), ok: true, state: "completed", message: "公告列表与正文读取完成", collectedCount: 0, newCount: 0, updatedCount: 0, duplicateCount: 0, excludedCount: 0 };
        run.rows.push(sourceRow);
        const collectedNotices = new Set(), previous = { newCount: run.newCount, updated: run.updated, duplicate: run.duplicate, excluded: run.excluded };
        function record(candidate, kind, result, reason, assessment, opportunityId, assessmentNote, noticeId) {
          const entry = { name: candidate.name, noticeId: noticeId || candidate.id, sourceId: source.id, sourceName: source.name, kind: kind, result: result, reason: reason };
          entry.noticeSnapshot = { summary: candidate.summary || "", number: candidate.number || "", published: candidate.published || "" };
          if (assessment && Number.isFinite(assessment.score)) {
            entry.score = assessment.score;
            entry.assessmentState = "assessed";
            entry.assessmentSnapshot = { score: assessment.score, details: copy(assessment.details), ruleRevision: rule.revision };
          } else {
            entry.assessmentState = "not_assessed";
            entry.assessmentNote = assessmentNote || "本条记录未执行初评。";
          }
          if (opportunityId) entry.opportunityId = opportunityId;
          run.results.push(entry);
        }
        const profileId = source.profileId || source.id;
        const pool = next.candidates.filter(function (item) { return item.sourceIds.includes(profileId); });
        pool.forEach(function (candidate) {
          if (!sourceRow.ok) return;
          if (sourceAccess(source).reason) {
            sourceRow.ok = false; sourceRow.state = "failed"; run.failed += 1;
            sourceRow.message = "公告读取中登录已失效，已保留完成处理的统计，请重新登录后采集。";
            return;
          }
          if (collectedNotices.has(candidate.id)) return;
          collectedNotices.add(candidate.id);
          const item = next.opportunities.find(function (entry) { return entry.id === candidate.id; });
          if (item) { if (!item.sourceIds.includes(source.id)) item.sourceIds.push(source.id); run.duplicate += 1; record(candidate, "duplicate", "重复去重", "公告已存在且内容未变，保留原确认状态", null, item.id, "本次仅去重并合并来源，未重新初评。"); return; }
          if (Number.isFinite(time(candidate.published)) && time(candidate.published) < source.captureFrom) { run.excluded += 1; record(candidate, "excluded", "筛除", "公告发布时间早于该来源首次采集的历史回溯起点", null, null, "公告超出首次回溯范围，未进入初评。"); return; }
          const decision = admission(candidate, rule);
          if (decision.key === "excluded") { run.excluded += 1; record(candidate, "excluded", "筛除", decision.reason, decision.assessment); return; }
          const incoming = copy(candidate);
          incoming.sourceIds = [source.id];
          incoming.matchedRules = [RULE_ID];
          incoming.ruleId = RULE_ID;
          incoming.admission = { key: decision.key, reason: decision.reason };
          incoming.captured = stamp();
          incoming.ruleSnapshot = copy(rule);
          captureAssessment(incoming, rule, Date.now(), decision);
          log(incoming, "采集入库", "按统一规则 V" + rule.revision + " 完成初评；" + decision.reason);
          next.opportunities.unshift(incoming);
          run.newCount += 1;
          record(incoming, "added", "新增入库", decision.reason, decision.assessment, incoming.id);
        });
        // The second public platform republishes OP001. Merge source and apply one amendment once.
        if (sourceRow.ok && profileId === "S2") {
          const item = next.opportunities.find(function (entry) { return entry.id === "OP001"; });
          if (item && !collectedNotices.has(item.id)) {
            collectedNotices.add(item.id);
            if (!item.sourceIds.includes(source.id)) item.sourceIds.push(source.id);
            run.duplicate += 1;
            record(item, "duplicate", "重复去重", "同项目转载或重复采集，保留已有机会及确认记录", null, item.id, "本次仅去重并合并来源，未执行初评。");
          }
          if (item && !item.amendmentApplied && !collectedNotices.has(item.id + ":amendment")) {
            collectedNotices.add(item.id + ":amendment");
            const before = item.deadline;
            item.deadline = stamp(time(item.deadline) + 2 * 86400000);
            item.opening = item.deadline;
            item.revision += 1;
            item.amendmentApplied = true;
            item.recheck = item.review !== "rejected";
            item.verified = stamp();
            const changeAdvice = item.review === "rejected" ? "机会继续保留为已放弃。" : item.projectId ? "请在关联项目中核对变更影响。" : "请重新确认是否投标。";
            item.changes.unshift({ at: stamp(), title: "投标截止延期", text: before + " → " + item.deadline + "；已关联原公告。" + changeAdvice, revision: item.revision });
            log(item, "关联更正公告", "投标截止延期；保留原决定及记录。" + changeAdvice);
            const project = next.projects.find(function (entry) { return entry.opportunityId === item.id; });
            if (project) project.opportunityChange = item.changes[0].text;
            run.updated += 1;
            record(item, "updated", "更正关联", item.changes[0].text, null, item.id, "本次仅关联更正公告，未执行初评。", item.id + ":amendment");
          } else if (item && !collectedNotices.has(item.id + ":amendment")) {
            collectedNotices.add(item.id + ":amendment");
            run.duplicate += 1;
            record(item, "duplicate", "重复去重", "该更正公告已处理，公告内容未变", null, item.id, "本次仅去重，保留原变更及确认记录。", item.id + ":amendment");
          }
        }
        sourceRow.collectedCount = collectedNotices.size;
        sourceRow.newCount = run.newCount - previous.newCount;
        sourceRow.updatedCount = run.updated - previous.updated;
        sourceRow.duplicateCount = run.duplicate - previous.duplicate;
        sourceRow.excludedCount = run.excluded - previous.excluded;
        if (sourceRow.collectedCount !== sourceRow.newCount + sourceRow.updatedCount + sourceRow.duplicateCount + sourceRow.excludedCount) throw new Error("公告处理统计未核对通过，请重新采集。");
        if (sourceRow.ok) source.lastSuccess = stamp();
      });
      run.state = run.failed === sources.length ? "failed" : run.failed ? "partial" : "success";
      if (!sourceOnly) next.collection.lastRun = Date.now();
      next.collectionRound += 1;
      next.runs.unshift(run);
      return run;
    });
  }
  function actionContext(id, current) {
    const next = current || state, item = next.opportunities.find(function (entry) { return entry.id === id; });
    if (!item) return null;
    const round = next.opportunitySampleRound || {}, notice = assessmentNotice(item);
    ["sourceIds", "noticeUrl", "noticeUrls", "verified", "captured"].forEach(function (key) { delete notice[key]; });
    return { round: round.id || round.startedAt || "", noticeRevision: item.revision, notice: JSON.stringify(notice), rule: ruleBasis(next.rules[0]), assessment: item.assessmentSnapshot ? assessmentBasis(item.assessmentSnapshot) : "",
      review: item.review, recheck: Boolean(item.recheck), confirmedAt: item.confirmedAt || "", approvedRevision: item.approvedRevision || 0, projectId: item.projectId || "" };
  }
  function contextMessage(id, expected, current) {
    if (!expected) return "";
    const actual = actionContext(id, current);
    if (!actual || actual.round !== expected.round) return "机会记录已变化，请重新打开并查看当前记录。";
    if (actual.noticeRevision !== expected.noticeRevision || actual.notice !== expected.notice) return "公告内容已更新，请查看最新公告后再操作。";
    if (actual.rule !== expected.rule) return "筛选要求已更新，请查看最新要求后再操作。";
    if (actual.assessment !== expected.assessment) return "初评结果已更新，请查看最新结果后再操作。";
    if (["review", "recheck", "confirmedAt", "approvedRevision", "projectId"].some(function (key) { return actual[key] !== expected[key]; })) return "该机会的处理状态已变化，请查看最新记录后再操作。";
    return "";
  }
  function assertActionContext(id, expected, next) {
    const message = contextMessage(id, expected, next);
    if (message) { const error = new Error(message); error.code = "OPPORTUNITY_CONTEXT_CHANGED"; throw error; }
  }
  function review(id, outcome, note, expected) {
    return change(function (next) {
      const item = next.opportunities.find(function (entry) { return entry.id === id; });
      if (!item) throw new Error("机会记录已变化，请返回机会列表查看。");
      if (item.projectId) throw new Error("该机会已转入项目，请查看关联项目。");
      assertActionContext(id, expected, next);
      if (!["approved", "rejected"].includes(outcome)) throw new Error("请选择确认投标或放弃机会。");
      const remarks = String(note || "").trim();
      if (remarks.length > 600) throw new Error("备注说明最多填写 600 字。");
      if (item.review === "rejected" && outcome === "rejected") return item;
      if (outcome === "approved" && status(item).blocked) throw new Error(status(item).text + "，暂不能确认投标。");
      if (item.review === outcome && !item.recheck && item.approvedRevision === item.revision) return item;
      const reconfirming = outcome === "approved" && (item.review === "rejected" || item.review === "approved" && item.recheck);
      item.review = outcome;
      item.recheck = false;
      item.confirmedBy = (window.AppCurrentUser || {}).name || "李明远";
      item.confirmedAt = stamp();
      item.confirmedRuleRevision = next.rules[0].revision;
      if (outcome === "approved") item.approvedRevision = item.revision;
      else delete item.approvedRevision;
      log(item, outcome === "approved" ? reconfirming ? "重新确认投标" : "确认投标" : "放弃机会", remarks);
      item.history[0].ruleSnapshot = copy(next.rules[0]);
      return item;
    });
  }
  function transfer(id, owner, files, expected) {
    if (!storage) throw new Error("当前数据无法保存，请重试后再转入项目。");
    return change(function (next) {
      const item = next.opportunities.find(function (entry) { return entry.id === id; });
      if (!item) throw new Error("机会记录已变化，请返回机会列表查看。");
      const existing = next.projects.find(function (entry) { return entry.opportunityId === id; });
      if (existing) return existing;
      assertActionContext(id, expected, next);
      if (item.review !== "approved" || item.recheck || item.approvedRevision !== item.revision) throw new Error("请先基于最新公告完成人工确认投标。");
      const timing = status(item);
      if (timing.blocked) throw new Error(timing.text + "，暂不能转入投标项目。");
      if (!String(owner || "").trim()) throw new Error("请选择项目负责人。");
      if (!Array.isArray(files) || files.filter(function (file) { return file.main; }).length !== 1 || !files.some(function (file) { return file.main && /\.(pdf|doc|docx)$/i.test(file.name); })) throw new Error("请选择一份 PDF / Word 主招标文件，公告不能代替主招标文件。");
      const project = { id: "BID-OP-" + id, name: item.name, purchaser: item.purchaser, owner: owner, deadline: item.deadline, deadlineText: "已确认投标，待解析招标文件", budget: item.amount == null ? "待解析" : item.amount + " 万元", stage: "解析中", stageDetail: "招标机会转入 · 等待解析", progress: 0, status: "parsing", opportunityId: item.id, opportunityScore: assessment(item).result.score, opportunityRevision: item.revision, tenderNumber: item.number, package: item.package, files: copy(files), fileName: files.find(function (file) { return file.main; }).name, sourceSummary: item.summary, qualification: item.qualification, region: item.region, createdAt: stamp() };
      project.sourceType = "opportunity"; project.workspaceProfile = true; project.progress = 12; project.stageDetail = "AI 正在解析招标文件";
      project.files.forEach(function (file) { file.version = Number(file.version || 1); });
      if (window.BiddingProjectStore) project.sourceOpportunity = window.BiddingProjectStore.sourceSnapshot(item);
      next.projects.unshift(project);
      item.projectId = project.id;
      item.review = "transferred";
      item.transferRecord = { projectId: project.id, owner: owner, at: stamp(), files: copy(files), mainFileName: project.fileName };
      log(item, "转入投标项目", "项目 " + project.id + "；负责人 " + owner + "；主招标文件：" + project.fileName + "；附件 " + (files.length - 1) + " 份。");
      item.history[0].transferSnapshot = copy(item.transferRecord);
      return project;
    });
  }
  function updateProject(id, patch) { return change(function (next) { const project = next.projects.find(function (item) { return item.id === id; }); if (project) Object.assign(project, patch); }); }
  function dueRules(now) {
    const schedule = state.collection, current = now || Date.now();
    if (!state.sources.some(function (source) { return source.enabled && source.status === "ready" && !sourceAccess(source).reason; })) return [];
    const last = schedule.lastRun || current;
    return current - last >= schedule.hours * 3600000 ? [RULE_ID] : [];
  }
  function due(now) { return dueRules(now).length > 0; }
  window.OpportunityStore = { key: KEY, get: function () { return state; }, copy: copy, refresh: refresh, change: change, find: find, status: status, participationChecks: participationChecks, capability: capability, evaluate: evaluate, assessment: assessment, reassess: reassess, collect: collect, review: review, transfer: transfer, updateProject: updateProject, stamp: stamp, time: time, due: due, dueRules: dueRules, dimensions: dimensions, admission: admission, projectConditions: projectConditions, ruleSummary: ruleSummary, ruleModel: ruleModel, scopeGroups: scopeGroups, exclusionGroups: exclusionGroups, focusOptions: focusOptions, saveRule: saveRule, saveSource: saveSource, checkSource: checkSource, sourceConfig: sourceConfig, ruleFields: ruleFields, restoredDefaults: restoredDefaults, persistent: Boolean(storage), storage: storage };
  Object.assign(window.OpportunityStore, { ruleBasis: ruleBasis, actionContext: actionContext, contextMessage: contextMessage, sourceAccess: sourceAccess });
})();
