(function () {
  "use strict";
  const copy = function (value) { return JSON.parse(JSON.stringify(value)); };
  const esc = function (value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  const date = function (value) { const raw = String(value || "").trim(); return raw ? new Date(raw.replace(" ", "T") + (/[zZ]$|[+-]\d\d:\d\d$/.test(raw) ? "" : /T| /.test(raw) ? "+08:00" : "T23:59:59+08:00")).getTime() : NaN; };
  const text = function (record) { return [record.name, record.standard, record.type, record.summary, record.description, record.scope].concat(record.tags || []).join("；"); };
  const topics = [
    ["数据治理|数据中台|数据共享|共享交换|数据资源|数据目录|数据质量", "数据中台|数据治理|数据共享|共享交换|数据资源"],
    ["办公审批|客户管理|合同管理|资产管理|项目管理", "办公审批|客户管理|合同管理|资产管理|项目管理|业务系统"],
    ["知识库|智能体|智能问数|智能助手|文档处理|报告生成", "知识库|智能体|智能问数|智能助手|文档处理|报告生成|人工智能"],
    ["运维|运行维护|安全加固", "运维|运行维护|安全整改"],
    ["系统集成", "系统集成"]
  ];
  function records() {
    const data = window.KnowledgePrototypeData || {}, unique = new Map();
    ["companyRecords", "certificates", "peopleRecords", "caseRecords", "solutionRecords"].forEach(function (key) {
      (data[key] || []).forEach(function (record) { unique.set(record.id, record); });
    });
    (data.peopleProfiles || []).forEach(function (profile) {
      const parent = unique.get(profile.id);
      if (!parent) return;
      ["certificates", "materials", "experiences"].forEach(function (key) {
        (profile[key] || []).forEach(function (entry) {
          const record = Object.assign({}, entry, { category: "people", parentId: parent.id, role: profile.bidRole, personName: parent.name, name: parent.name + " · " + (entry.name || entry.project), version: entry.version || parent.version, updatedAt: entry.updatedAt || parent.updatedAt,
            lifecycleState: parent.lifecycleState === "archived" ? "archived" : entry.lifecycleState || "active", parseStatus: parent.parseStatus, summary: [entry.status, entry.period, entry.proof].filter(Boolean).join("；"), description: entry.content || "", validityDueDate: entry.endDate || "", validityStartDate: entry.issueDate || "", scope: parent.scope });
          unique.set(record.id, record);
        });
      });
    });
    return Array.from(unique.values());
  }
  function availability(record, at) {
    if (record.lifecycleState === "archived") return { key: "unavailable", reason: "材料已归档，不作为当前有效证明" };
    const end = record.validityDueDate || record.endDate || "", start = record.validityStartDate || record.startDate || "";
    if (Number.isFinite(date(end)) && date(end) < at) return { key: "expired", reason: "有效期至 " + end + "，未覆盖本次要求日期" };
    if (Number.isFinite(date(start)) && date(start) - 86400000 > at) return { key: "unavailable", reason: "材料尚未生效：" + start };
    if (record.parseStatus === "processing") return { key: "unavailable", reason: "材料正在解析，尚无完整内容作为判断依据" };
    if (/待补|缺少|尚不完整|待核验|需补充|需覆盖|拟覆盖|计划覆盖|仅.*摘要|仅允许引用|不作为.*证明/.test([record.summary, record.description, record.validityLabel, record.period].join("；"))) return { key: "partial", reason: "现有材料未形成完整证明，依据不足" };
    if (!record.file) return { key: "partial", reason: "尚未关联证明文件" };
    return { key: "supported", reason: "已找到有效的在库证明材料" };
  }
  function material(record, at) {
    const result = availability(record, at), saved = {};
    ["id", "name", "category", "categoryLabel", "file", "version", "updatedAt", "description", "summary", "scope", "standard", "number", "issuer", "startDate", "endDate", "validityStartDate", "validityDueDate", "validityMode", "period", "dateRange", "statusKey", "contractAmount", "contractDate", "tags", "lifecycleState", "parseStatus", "parentId", "personName", "role", "recordType", "sections", "previewText", "content", "previewUrl"].forEach(function (key) { if (record[key] != null) saved[key] = copy(record[key]); });
    if (!saved.sections && !saved.previewText && !saved.content) saved.sections = knowledgeDocument(record);
    saved.state = result.key; saved.reason = result.reason;
    return saved;
  }
  function relevant(item, record) {
    const primary = [item.name, item.coreDelivery].join("；");
    let wanted = topics.slice(0, -1).filter(function (pair) { return new RegExp(pair[0]).test(primary); });
    if (!wanted.length) wanted = topics.filter(function (pair) { return new RegExp(pair[0]).test(primary); });
    if (!wanted.length) wanted = topics.filter(function (pair) { return new RegExp(pair[0]).test(item.summary || ""); });
    return wanted.some(function (pair) { return new RegExp(pair[1]).test(text(record)); });
  }
  function requirements(item) {
    const source = String(item.qualification || "").trim(), rows = [];
    if (!source) return [{ id: "Q1", groupId: "G1", original: "公告未披露完整资格要求", kind: "unclear", title: "资格要求", clause: "公告未披露完整资格要求" }];
    source.split(/[；;。\n]/).map(function (value) { return value.trim(); }).filter(Boolean).forEach(function (original, index) {
      const seen = new Set();
      function add(kind, title, clause, code, role) {
        const key = kind + ":" + (code || clause);
        if (seen.has(key)) return;
        seen.add(key);
        rows.push({ id: "Q" + (rows.length + 1), groupId: "G" + (index + 1), original: original, kind: kind, title: title, clause: clause, code: code || "", role: role || "", scored: kind !== "participation" });
      }
      original.split(/[，,]|以及|并且|且|并须|并应|并提供|并具备|并具有|并持有|同时|和/).map(function (value) { return value.trim(); }).filter(Boolean).forEach(function (clause) {
        let known = false;
        const company = clause.match(/营业执照|独立法人资格?|独立承担民事责任/);
        if (company) { add("company", "企业主体资格", company[0]); known = true; }
        ["9001", "27001", "20000", "45001", "14001"].forEach(function (code) {
          if (new RegExp("(?:ISO|ISO/IEC)\\s*" + code, "i").test(clause)) { add("certificate", "ISO " + code + " 认证", "ISO " + code + " 认证", code); known = true; }
        });
        const licenses = clause.match(/CMMI(?:\s*[一二三四五\d]+级)?|(?:[\u4e00-\u9fa5A-Za-z]+?)(?:许可证|资质证书|专项许可)/g) || [];
        if (/专业承包/.test(clause) && !licenses.some(function (value) { return /专业承包/.test(value); })) licenses.push("专业承包资质");
        licenses.forEach(function (value) {
          const name = value.replace(/^(?:(?:提供|具备|具有|持有|取得|有效|须|应|需|和|及|并|的))+/, "");
          add("special-certificate", "专项资质要求", name, name); known = true;
        });
        if (/类似项目|同类.*业绩|同类.*合同|项目业绩/.test(clause)) { add("cases", "类似项目业绩", clause); known = true; }
        const roles = clause.match(/项目经理|技术负责人|高级工程师|人员/);
        const contextRoles = Array.from(new Set(original.match(/项目经理|技术负责人/g) || []));
        const role = roles ? roles[0] : contextRoles.length === 1 ? contextRoles[0] : "";
        if (role || /社保证明|社保材料|职称证书|学历证明/.test(clause)) {
          let specific = false;
          if (/社保/.test(clause)) { add("people", "人员社保证明", clause, "social", role); specific = true; }
          if (/高级工程师|职称/.test(clause)) { add("people", "人员职称证明", clause, "certificate", role); specific = true; }
          if (/学历/.test(clause)) { add("people", "人员学历证明", clause, "education", role); specific = true; }
          if (!specific) add("people", "人员岗位及履历", clause, "resume", role);
          known = true;
        }
        if (/专业技术能力|履约能力/.test(clause)) { add("ability", "专业技术及履约能力", clause); known = true; }
        if (/联合体/.test(clause)) { add("participation", "联合体及参与方式", clause); known = true; }
        if (!known || /信用|纳税|财务|违法|特定资格|注册资本|经营范围|授权/.test(clause)) add("other", "其他资格要求", clause);
      });
    });
    return mergeRequirementConditions(rows);
  }
  function requirementText(row) {
    const clean = function (value) {
      return String(value || "").replace(/(?:[，,；;]\s*)?(?:本项目)?(?:不接受|不允许|禁止|允许|接受)联合体(?:投标|参与)?/g, "").replace(/[（(]\s*[)）]/g, "").replace(/^[，,；;。\s]+|[，,；;。\s]+$/g, "");
    };
    const source = clean(row.original || row.requirementText || row.clause);
    if (!row.kind || row.kind === "other") return clean(row.clause || source);
    const parts = source.split(/[，,]|并且|以及|且|并须|并应|并提供|并具备|并具有|并持有|同时|和/).map(clean).filter(Boolean);
    const compact = function (value) { return String(value || "").replace(/\s/g, "").toLowerCase(); };
    const selected = parts.map(function (part, index) {
      let matches = false;
      if (row.kind === "company") matches = /营业执照|独立法人|独立承担民事责任/.test(part);
      else if (row.kind === "certificate") matches = compact(part).includes(compact(row.code || (String(row.clause).match(/\d{4,5}/) || [""])[0])) && /ISO/i.test(part);
      else if (row.kind === "special-certificate") matches = compact(part).includes(compact(row.code || row.clause));
      else if (row.kind === "cases") matches = /类似项目|同类.*业绩|同类.*合同|项目业绩/.test(part);
      else if (row.kind === "ability") matches = /专业技术能力|履约能力/.test(part);
      else if (row.kind === "people") matches = row.code === "social" ? /社保/.test(part) : row.code === "certificate" ? /职称|高级工程师/.test(part) : row.code === "education" ? /学历|教育证明/.test(part) : /简历|履历|项目经理|技术负责人|人员/.test(part);
      return matches ? index : -1;
    }).filter(function (index) { return index >= 0; });
    if (!selected.length) return source || clean(row.clause);
    const included = new Set(selected);
    const independent = /营业执照|独立法人|ISO|CMMI|许可证|专项许可|类似项目|同类|业绩|社保|学历|职称|专业技术能力|履约能力|注册资本|经营范围|纳税|财务|信用|违法|授权/i;
    const condition = /范围|覆盖|有效期|等级|以上|年内|近.{0,12}[年月]|以来|金额|万元|至少|不少于|不低于|不超过|截止|个月|期间|在职|全职|主体|合同|验收/;
    selected.forEach(function (index) {
      [-1, 1].forEach(function (direction) {
        let cursor = index + direction;
        while (cursor >= 0 && cursor < parts.length && !independent.test(parts[cursor]) && condition.test(parts[cursor])) { included.add(cursor); cursor += direction; }
      });
    });
    const clauses = parts.filter(function (_, index) { return included.has(index); });
    (row.requirementClauses || []).forEach(function (clause) {
      if (clause !== row.clause && !clauses.some(function (part) { return compact(part).includes(compact(clause)); })) clauses.push(clause);
    });
    let result = clauses.join("；");
    if (row.kind === "people" && row.role && row.role !== "人员" && !result.includes(row.role)) result = row.role + "：" + result;
    return result;
  }
  function mergeRequirementJudgments(host, condition) {
    // These rows are clones, so old scores, material versions and stored judgments stay intact.
    if (!host.state || !condition.state) return;
    const conclusions = [conclusionOf(host), conclusionOf(condition)];
    const states = [host.state, condition.state];
    const state = states.every(function (value) { return value === "supported"; }) ? "supported" : states.some(function (value) { return value === "supported" || value === "partial"; }) ? "partial" : states.includes("expired") ? "expired" : states.includes("unavailable") ? "unavailable" : "missing";
    const labels = { supported: "符合", partial: "依据不足", missing: "依据不足", expired: "不符合", unavailable: "依据不足" };
    host.reason = Array.from(new Set([host.reason, condition.reason].filter(Boolean))).join("；");
    host.state = state; host.label = labels[state];
    host.conclusion = conclusions.every(function (value) { return value === "matched"; }) ? "matched" : conclusions.includes("insufficient") ? "insufficient" : conclusions.includes("partial") || conclusions.includes("matched") && conclusions.includes("unmatched") ? "partial" : "unmatched";
    const materials = (host.materials || []).concat(condition.materials || []), seen = new Set();
    host.materials = materials.filter(function (record) { const key = JSON.stringify(record); if (seen.has(key)) return false; seen.add(key); return true; });
  }
  function mergeRequirementConditions(input) {
    const rows = copy(input || []), absorbed = new Set();
    rows.forEach(function (condition) {
      if (condition.kind !== "other" || !condition.original && !condition.groupId) return;
      const clause = String(condition.clause || "");
      if (!/[\d一二三四五六七八九十百千万两]/.test(clause) || !/数量|金额|单项|每项|合同|履约|年内|年限|年以|月以|至少|不少于|不低于|不超过|近.{0,12}[年月]|以来/.test(clause)) return;
      if (/注册资本|营业执照|独立法人|纳税|财务|信用|违法|授权|经营范围|预算|报价|保证金|ISO|CMMI|许可证|社保|学历|职称|联合体/i.test(clause)) return;
      let hosts = rows.filter(function (row) {
        return row !== condition && ["cases", "people", "certificate", "special-certificate", "company", "ability"].includes(row.kind) && row.groupId === condition.groupId && row.original === condition.original;
      });
      if (/合同|业绩|履约|单项|每项/.test(clause)) hosts = hosts.filter(function (row) { return row.kind === "cases"; });
      else if (/工作|从业|任职|经验/.test(clause)) hosts = hosts.filter(function (row) { return row.kind === "people"; });
      // Ambiguous supplemental conditions stay separate rather than being attached to an unrelated requirement.
      if (hosts.length !== 1) return;
      const host = hosts[0], clauses = host.requirementClauses || [host.clause];
      host.requirementClauses = Array.from(new Set(clauses.concat(clause))).filter(Boolean).sort(function (a, b) {
        const first = String(host.original || "").indexOf(a), second = String(host.original || "").indexOf(b);
        return (first < 0 ? 0 : first) - (second < 0 ? 0 : second);
      });
      host.requirementText = requirementText(host);
      mergeRequirementJudgments(host, condition);
      absorbed.add(condition);
    });
    return rows.filter(function (row) { return !absorbed.has(row); });
  }
  function candidates(item, row, all) {
    if (row.kind === "company") return all.filter(function (record) { return record.category === "company" && /营业执照/.test(record.name); });
    if (row.kind === "certificate") return all.filter(function (record) { return record.category === "certificates" && text(record).replace(/\s/g, "").includes(row.code); });
    if (row.kind === "special-certificate") return all.filter(function (record) {
      const key = row.code.replace(/\s*[一二三四五\d]+级/g, "");
      return record.category === "certificates" && text(record).replace(/\s/g, "").includes(key);
    });
    if (row.kind === "cases") return all.filter(function (record) { return record.category === "cases" && relevant(item, record); });
    if (row.kind === "ability") return all.filter(function (record) { return ["company", "solutions"].includes(record.category) && relevant(item, record); });
    if (row.kind === "people") return all.filter(function (record) {
      if (record.category !== "people" || !record.parentId) return false;
      if (row.role && row.role !== "人员" && row.role !== "高级工程师" && record.role !== row.role) return false;
      if (row.code === "social") return /社保/.test(record.name);
      if (row.code === "certificate") return /职称|高级工程师/.test(record.name);
      if (row.code === "education") return /学历|教育证明/.test(record.name);
      return /简历|履历/.test(record.name);
    });
    return [];
  }
  const conclusionLabels = { matched: "符合", partial: "部分符合", unmatched: "不符合", insufficient: "依据不足" };
  function conclusionOf(row) {
    // Legacy partial meant unverified, not a proven partial match. Never reinterpret it as evidence.
    return row.conclusion || (row.state === "supported" ? "matched" : row.state === "expired" ? "unmatched" : "insufficient");
  }
  function assessmentReason(value) {
    return String(value || "").replace(/仍需逐项核对|仍需逐条核对|仍需核对|仍需确认|需补充或核对|需结合公告条款核对适用范围/g, "现有依据未能完整证明").replace(/(?:需要|需|请)(?:人工)?(?:逐项|逐条)?(?:核对|核验|确认)/g, "现有依据不足以判断").replace(/待确认|待核验/g, "依据不足");
  }
  function qualificationViewRows(match) {
    const points = qualificationPoints(match);
    return mergeRequirementConditions(match && match.rows || []).filter(function (row) { return row.scored !== false && row.kind !== "participation" && row.kind !== "unclear"; }).map(function (row) {
      row.conclusion = conclusionOf(row); row.label = conclusionLabels[row.conclusion]; row.reason = assessmentReason(row.reason);
      if (points && points[row.id] != null) row.score = points[row.id];
      row.materials = (row.materials || []).map(function (record) { record.reason = assessmentReason(record.reason); return record; });
      return row;
    });
  }
  function qualificationPoints(match) {
    const rows = (match && match.rows || []).filter(function (row) { return row.scored !== false; });
    if (!rows.length || !match || match.format !== "ai-conditions-v1" || !Number.isFinite(match.score) || !rows.every(function (row) { return Number.isFinite(row.credit); })) return null;
    const values = rows.map(function (row, index) { const raw = 250 * row.credit / rows.length; return { id: row.id, index: index, units: Math.floor(raw + 1e-8), fraction: raw - Math.floor(raw + 1e-8) }; });
    let remaining = Math.round(match.score * 10) - values.reduce(function (sum, entry) { return sum + entry.units; }, 0);
    values.slice().sort(function (a, b) { return b.fraction - a.fraction || a.index - b.index; }).forEach(function (entry) { if (remaining > 0) { entry.units++; remaining--; } });
    if (remaining !== 0) return null;
    const result = {}; values.forEach(function (entry) { result[entry.id] = entry.units / 10; }); return result;
  }
  function qualificationSummary(rows) {
    const counts = { matched: 0, partial: 0, unmatched: 0, insufficient: 0 };
    rows.forEach(function (row) { counts[conclusionOf(row)]++; });
    const conclusion = !rows.length ? "insufficient" : counts.matched === rows.length ? "matched" : counts.partial || counts.matched && counts.unmatched ? "partial" : counts.unmatched ? "unmatched" : "insufficient";
    return { label: conclusionLabels[conclusion], tone: conclusion === "matched" ? "green" : conclusion === "unmatched" ? "red" : "orange", summary: !rows.length ? "未列明需知识库证明的资格要求" : "共 " + rows.length + " 项材料要求：" + Object.keys(counts).filter(function (key) { return counts[key]; }).map(function (key) { return counts[key] + " 项" + conclusionLabels[key]; }).join("，") };
  }
  function numberValue(value) {
    const digits = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value);
    if (value === "十") return 10;
    if (value.includes("十")) { const parts = value.split("十"); return (digits[parts[0]] || 1) * 10 + (digits[parts[1]] || 0); }
    return digits[value] || NaN;
  }
  function coverage(value) {
    const match = String(value || "").match(/(20\d{2})[-/.年]\s*(\d{1,2})(?:[-/.月]\s*(\d{1,2})日?|月)?\s*(?:至|到|～|~|—)\s*(?:(20\d{2})[-/.年]\s*)?(\d{1,2})(?:[-/.月]\s*(\d{1,2})日?|月)?/);
    if (!match) return null;
    const year = +match[1], endYear = +(match[4] || year), month = +match[2], endMonth = +match[5];
    return { start: date(year + "-" + String(month).padStart(2, "0") + "-" + String(match[3] || "01").padStart(2, "0")), end: date(endYear + "-" + String(endMonth).padStart(2, "0") + "-" + String(match[6] || new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate()).padStart(2, "0")) };
  }
  function qualificationChecks(row, found, target) {
    const requested = requirementText(row), checks = [], usable = found.filter(function (record) { return record.state === "supported"; });
    const check = function (name, result, evidence) { checks.push({ name: name, result: result, evidence: evidence }); };
    if (!usable.length) {
      const expired = found.length && found.every(function (record) { return record.state === "expired"; });
      check("材料依据", expired ? "failed" : "unknown", expired ? found[0].reason : found.length ? found[0].reason : "知识库未找到对应证明，不代表企业不具备资格");
      return checks;
    }
    const proofText = function (record) { return [record.name, record.file, record.description, record.summary, record.content].join("；"); };
    if (row.kind === "ability") {
      const proof = usable.some(function (record) { return /(?:专业技术|履约)能力证明|人员.*设备.*能力/.test(proofText(record)); });
      check("能力证明", proof ? "passed" : "unknown", proof ? "在库材料提供了对应专业技术及履约能力证明" : "已找到相关方案，但现有材料未能完整证明公告要求的专业技术及履约能力");
    } else if (row.kind === "cases") {
      const proof = usable.filter(function (record) { return record.statusKey === "verified" || /合同.*验收|验收.*合同/.test(proofText(record)); });
      const amount = requested.match(/(?:金额|合同额)[^；，]{0,8}?(?:不低于|不少于|至少)\s*(\d+(?:\.\d+)?)\s*万元/);
      const years = requested.match(/近\s*([\d一二三四五六七八九十两]+)\s*年/), quantity = requested.match(/(?:不少于|至少)\s*([\d一二三四五六七八九十两]+)\s*项/);
      const unresolved = /金额|万元/.test(requested) && !amount || /近.*年|年内|以来/.test(requested) && !years || /数量|(?:不少于|至少).*项/.test(requested) && !quantity;
      const needed = quantity ? numberValue(quantity[1]) : 1, earliest = new Date(target); if (years) earliest.setUTCFullYear(earliest.getUTCFullYear() - numberValue(years[1]));
      const status = proof.map(function (record) {
        const facts = [];
        if (unresolved) facts.push("unknown");
        if (amount) facts.push(record.contractAmount == null ? "unknown" : Number(record.contractAmount) >= +amount[1] ? "passed" : "failed");
        if (years) facts.push(!Number.isFinite(date(record.contractDate)) ? "unknown" : date(record.contractDate) >= earliest.getTime() && date(record.contractDate) <= target ? "passed" : "failed");
        return facts.includes("failed") ? "failed" : facts.includes("unknown") ? "unknown" : "passed";
      });
      const count = status.filter(function (value) { return value === "passed"; }).length;
      check("类似业绩及附加条件", count >= needed ? "passed" : !proof.length || status.includes("unknown") ? "unknown" : "failed", count >= needed ? "已找到 " + count + " 项证明完整且满足公告条件的相关业绩" : "公告要求 " + needed + " 项；已完整匹配 " + count + " 项" + (status.includes("unknown") ? "，部分合同金额或签订日期未记载" : !proof.length ? "，现有内容不足以构成完整业绩证明" : "，现有业绩证明未达到公告条件"));
      return checks;
    } else if (row.kind === "people" && row.code === "social") {
      const required = coverage(requested), ranges = usable.map(function (record) { return coverage(record.period || record.dateRange || record.summary); }).filter(Boolean);
      const supported = required && ranges.some(function (range) { return range.start <= required.start && range.end >= required.end; });
      check("社保覆盖期间", supported ? "passed" : required && ranges.length ? "failed" : "unknown", supported ? "社保证明覆盖公告要求的完整期间" : required && ranges.length ? "在库社保证明未覆盖公告要求的完整期间" : "公告要求或材料未记载可对应的完整社保期间");
      return checks;
    } else if (["certificate", "special-certificate"].includes(row.kind) || row.kind === "people" && row.code === "certificate") {
      const dated = usable.some(function (record) { return record.validityMode === "longterm" || Number.isFinite(date(record.validityDueDate || record.endDate)); });
      check("证书类型与有效期", dated ? "passed" : "unknown", dated ? "在库证书类型相符，且有效期覆盖本次公告要求日期" : "已找到对应证书，但材料未记载有效期");
    } else check("对应证明材料", "passed", "有效在库材料与本项证明类型相符");
    const remaining = requested.match(/(?:剩余)?有效期[^；，）)]{0,12}?(?:不少于|不低于|至少)\s*([\d一二三四五六七八九十两]+)\s*(年|月)/);
    if (remaining) {
      const end = new Date(target), size = numberValue(remaining[1]); if (remaining[2] === "年") end.setUTCFullYear(end.getUTCFullYear() + size); else end.setUTCMonth(end.getUTCMonth() + size);
      const dates = usable.map(function (record) { return record.validityMode === "longterm" ? Infinity : date(record.validityDueDate || record.endDate); });
      check("附加有效年限", dates.some(function (value) { return value >= end.getTime(); }) ? "passed" : dates.some(Number.isFinite) ? "failed" : "unknown", "公告要求投标截止日剩余有效期不少于 " + size + " " + remaining[2] + (dates.some(function (value) { return value >= end.getTime(); }) ? "，在库证书覆盖该期限" : dates.some(Number.isFinite) ? "，在库证书有效期未达到该期限" : "，材料未记载截止日期"));
    }
    const scope = requested.match(/(?:适用范围|认证范围|覆盖)(?:包含|包括|为|须涵盖|涵盖|[：:])?\s*([^，；（）]+)/);
    if (scope && row.kind === "certificate") {
      const value = scope[1].replace(/范围.*|的?\s*ISO.*|的?认证.*/gi, "").trim(), known = usable.filter(function (record) { return record.scope; });
      if (value) check("认证范围", known.some(function (record) { return record.scope.includes(value); }) ? "passed" : known.length ? "failed" : "unknown", known.some(function (record) { return record.scope.includes(value); }) ? "证书认证范围包含公告要求的“" + value + "”" : "在库证书未提供覆盖“" + value + "”的范围依据");
    }
    const grade = requested.match(/(?:CMMI\s*|资质[^；，]{0,8})([一二三四五\d]+)级/);
    if (grade) {
      const actual = usable.map(function (record) { const value = [record.standard, record.name].join(" ").match(/([一二三四五\d]+)级/); return value ? numberValue(value[1]) : NaN; });
      check("资质等级", actual.some(function (value) { return value >= numberValue(grade[1]); }) ? "passed" : actual.some(Number.isFinite) ? "failed" : "unknown", "公告要求 " + grade[1] + " 级及以上；" + (actual.some(Number.isFinite) ? "按在库资质记载的等级对照" : "材料未记载对应等级"));
    }
    const otherConditions = requested.replace(remaining ? remaining[0] : /$^/, "").replace(grade ? grade[0] : /$^/, "");
    if (/数量|金额|年限|工作经验|至少|不少于|不低于|不超过/.test(otherConditions)) check("其他附加条件", "unknown", "现有材料未提供足以判断公告附加条件的完整事实");
    return checks;
  }
  function matchQualification(item, at) {
    const instant = Number.isFinite(at) ? at : Date.now(), target = Number.isFinite(date(item.deadline)) ? date(item.deadline) : instant, all = records();
    const rows = requirements(item).map(function (row) {
      if (row.kind === "participation") return Object.assign({}, row, { state: "participation", label: "按公告参与", materials: [], reason: "参与方式不作为知识库证明项计分" });
      const order = { supported: 0, partial: 1, expired: 2, unavailable: 3 }, found = candidates(item, row, all).map(function (record) { return material(record, target); }).sort(function (a, b) { return order[a.state] - order[b.state] || a.id.localeCompare(b.id); });
      let checks;
      const usable = found.filter(function (record) { return record.state === "supported"; });
      if (row.kind !== "cases" && usable.length > 1) {
        // A single certificate/person must meet the conditions; never combine complementary failures.
        const options = usable.map(function (record) { const entries = qualificationChecks(row, [record], target); return { record: record, checks: entries, credit: entries.filter(function (entry) { return entry.result === "passed"; }).length / entries.length }; }).sort(function (a, b) { return b.credit - a.credit; });
        checks = options[0].checks;
        found.splice(found.indexOf(options[0].record), 1); found.unshift(options[0].record);
      } else checks = qualificationChecks(row, found, target);
      const passed = checks.filter(function (entry) { return entry.result === "passed"; }).length, failed = checks.some(function (entry) { return entry.result === "failed"; }), unknown = checks.filter(function (entry) { return entry.result === "unknown"; }).length;
      const conclusion = passed === checks.length ? "matched" : passed && failed ? "partial" : failed ? "unmatched" : "insufficient";
      const state = conclusion === "matched" ? "supported" : conclusion === "partial" ? "partial" : conclusion === "unmatched" ? found.every(function (record) { return record.state === "expired"; }) ? "expired" : "unmatched" : row.kind === "unclear" ? "unclear" : found.length && found.every(function (record) { return record.state === "unavailable"; }) ? "unavailable" : "missing";
      return Object.assign({}, row, { state: state, conclusion: conclusion, checks: checks, credit: passed / checks.length, unknownCredit: unknown / checks.length, label: conclusionLabels[conclusion], reason: checks.map(function (entry) { return entry.evidence; }).join("；"), materials: found });
    });
    const scored = rows.filter(function (row) { return row.scored !== false; }), aggregate = qualificationSummary(scored);
    const result = { format: "ai-conditions-v1", at: new Date(instant + 8 * 3600000).toISOString().slice(0, 16).replace("T", " "), noticeRevision: item.revision, rows: rows,
      score: scored.length ? Math.round(25 * scored.reduce(function (sum, row) { return sum + row.credit; }, 0) / scored.length * 10) / 10 : 0,
      unknown: scored.length ? Math.round(25 * scored.reduce(function (sum, row) { return sum + row.unknownCredit; }, 0) / scored.length * 10) / 10 : 25, label: aggregate.label, summary: aggregate.summary };
    const points = qualificationPoints(result); if (points) scored.forEach(function (row) { row.score = points[row.id]; });
    return result;
  }
  function matchBasis(match) {
    return JSON.stringify((match && match.rows || []).map(function (row) { return [row.original, row.clause, row.kind, row.scored, row.state, row.conclusion, row.checks, row.reason, row.materials.map(function (record) { return [record.id, record.name, record.version || "", record.updatedAt || "", record.state, record.reason, record.file, record.description, record.summary, record.scope, record.standard, record.number, record.issuer, record.validityStartDate || record.startDate || "", record.validityDueDate || record.endDate || "", record.period, record.dateRange, record.contractAmount, record.contractDate, record.statusKey, record.sections, record.previewText, record.content, record.parentId]; })]; }));
  }
  function noticeSections(item) {
    const money = function (value) { return value == null ? "公告未明确" : value + " 万元"; };
    return [
      { title: "一、项目基本情况", text: "项目名称：" + item.name + "\n项目编号：" + item.number + "\n采购包：" + item.package + "\n采购人：" + item.purchaser + "\n采购方式：" + item.method + "\n本包预算：" + money(item.amount) + "\n最高限价：" + money(item.cap) + "\n项目总预算：" + money(item.totalAmount) },
      { title: "二、采购需求", text: item.summary || "公告未明确" },
      { title: "三、申请人资格要求", text: item.qualification || "公告未披露完整资格要求" },
      { title: "四、获取文件与投标安排", text: "文件获取：" + (item.acquisitionStart || "公告未明确") + " 至 " + (item.acquisitionEnd || "公告未明确") + "\n报名截止：" + (item.registrationEnd || "公告未单独列明") + "\n投标截止：" + (item.deadline || "公告未明确") + "\n开标时间：" + (item.opening || "公告未明确") + "\n以上时间均为北京时间。" },
      { title: "五、履约及联系方式", text: "实施地点：" + (item.region || "公告未明确") + "\n履约期限：" + (item.term || "公告未明确") + "\n代理机构：" + (item.agency || "公告未明确") + "\n联系方式：" + (item.contact || "详见采购公告") }
    ];
  }
  function detailAddress(value, source) {
    try { const url = new URL(value); return /^https?:$/.test(url.protocol) && !/^\/(?:index\.(?:html?|jsp|aspx?))?\/?$/i.test(url.pathname) && value !== (source && (source.collectionUrl || source.url)); } catch (error) { return false; }
  }
  function noticeHref(item, sourceId, source) {
    const specific = item.noticeUrls && item.noticeUrls[sourceId] || ((item.sourceIds || [])[0] === sourceId ? item.noticeUrl : "");
    return detailAddress(specific, source) ? specific : "";
  }
  function sampleNoticeHref(source) {
    // External notice examples for the three static source fixtures, never a platform homepage.
    const examples = {
      "szecp.com.cn": "https://www.szecp.com.cn/first_zbgg/2026-09-16/2867158.html",
      "zfcg.szggzy.com": "http://zfcg.szggzy.com:8081/gsgg/002001/002001002/002001002001/20261016/9d3a7238-30e1-4a5f-a35c-74144e7bbcac.html",
      "zhiliaobiaoxun.com": "https://www.zhiliaobiaoxun.com/content/605730284/b1/1CDF8D03C3BED4937E4604004B59B6DA44EE2D8E?sk=1CDF8D03C3BED4937E4604004B59B6DA44EE2D8E&from=skill"
    };
    try {
      const url = new URL(source.collectionUrl || source.url);
      return examples[url.hostname.replace(/^www\./, "")] || "";
    } catch (error) { return ""; }
  }
  function prepareFiles(item) {
    (item.files || []).forEach(function (file) {
      if (file.kind !== "demo" || file.sections && file.sections.length || file.previewText || file.content) return;
      // File content is fixed once, and is not regenerated when the notice changes.
      const source = item.assessmentSnapshot && item.assessmentSnapshot.notice || item;
      file.version = file.version || 1;
      file.noticeRevision = file.noticeRevision || source.revision;
      file.sections = [
        { title: file.name, text: source.name + "\n项目编号：" + source.number + "\n" + source.package + "\n采购人：" + source.purchaser + "\n文件版本：" + versionLabel(file.version) },
        { title: "第一章 采购需求", text: source.summary || "文件未列明采购需求" },
        { title: "第二章 供应商资格条件", text: source.qualification || "文件未列明完整资格条件" },
        { title: "第三章 采购包及履约要求", text: "本包预算：" + (source.amount == null ? "文件未列明" : source.amount + " 万元") + "\n最高限价：" + (source.cap == null ? "文件未列明" : source.cap + " 万元") + "\n实施地点：" + (source.region || "文件未列明") + "\n履约期限：" + (source.term || "文件未列明") },
        { title: "第四章 文件获取与投标安排", text: "文件获取：" + (source.acquisitionStart || "文件未列明") + " 至 " + (source.acquisitionEnd || "文件未列明") + "\n报名截止：" + (source.registrationEnd || "未单独列明") + "\n投标截止：" + (source.deadline || "文件未列明") + "\n开标时间：" + (source.opening || "文件未列明") + "\n以上时间均为北京时间。" }
      ];
    });
  }
  function knowledgeDocument(record) {
    // Only a corresponding, versioned document may supply fixture content; descriptions are not file bodies.
    if (record.id === "KB-CERT-003" && record.version === "V1.2") return [{ title: "质量管理体系认证证书", text: "认证标准：ISO 9001\n证书编号：QMS-90******57\n签发机构：质量认证机构\n\n认证范围\n软件开发、系统集成与运行维护服务\n\n证书有效期间\n2024-05-19 至 2027-05-18" }];
    return [];
  }
  function documentPayload(item, file) {
    const sections = Array.isArray(file.sections) && file.sections.length ? copy(file.sections) : file.previewText || file.content ? [{ title: file.name, text: file.previewText || file.content }] : [];
    return { name: file.name, size: file.size || "—", version: file.version || "未记录", context: "招标机会 · " + item.name, number: item.number, sections: sections, sourceUrl: file.previewUrl || file.url || file.sourceUrl || "" };
  }
  function materialPayload(record) {
    const sections = record.sections && record.sections.length ? copy(record.sections) : record.previewText || record.content ? [{ title: record.name, text: record.previewText || record.content }] : knowledgeDocument(record);
    return { name: record.file || record.name, size: "—", version: record.version || record.updatedAt || "未记录", context: "知识库材料 · " + record.name, number: record.id, sections: sections, sourceUrl: record.previewUrl || "" };
  }
  function previewHref(payload) {
    return "file-preview.html?profile=opportunity-evidence&name=" + encodeURIComponent(payload.name) + "&context=" + encodeURIComponent(payload.context) + "#evidence=" + encodeURIComponent(JSON.stringify(payload));
  }
  function versionLabel(value) {
    return value == null || value === "" ? "未记录" : /^\d+(?:\.\d+)*$/.test(String(value)) ? "V" + value : String(value);
  }
  function previewProfile(hash, requestedName) {
    let payload;
    try { payload = JSON.parse(new URLSearchParams(String(hash || "").replace(/^#/, "")).get("evidence")); } catch (error) { payload = null; }
    if (!payload || !Array.isArray(payload.sections)) payload = { name: requestedName || "文件", sections: [] };
    let sourceUrl = "";
    try {
      if (typeof payload.sourceUrl === "string" && payload.sourceUrl.trim()) {
        const url = new URL(payload.sourceUrl.trim(), window.location.href), current = new URL(window.location.href);
        if (["http:", "https:", "file:", "blob:"].includes(url.protocol) && !(url.origin === current.origin && url.pathname === current.pathname)) sourceUrl = url.href;
      }
    } catch (error) { /* Missing or unsupported addresses never fall back to another document. */ }
    const viewable = /\.(pdf|png|jpe?g|svg|webp|gif)(?:[?#]|$)/i;
    if (!payload.sections.length && sourceUrl && (viewable.test(payload.name) || viewable.test(sourceUrl))) return { name: payload.name, size: payload.size || "—", kind: "bid-document", projectNumber: payload.number || "", pages: 1,
      pageData: [{ number: 1, html: '<h1>' + esc(payload.name) + '</h1><iframe class="opportunity-source-frame" title="' + esc(payload.name) + '" src="' + esc(sourceUrl) + '"></iframe>' }], sections: [{ page: 1, title: payload.name, kind: "bid-section" }] };
    const sections = payload.sections.length ? payload.sections : [{ title: "文件暂不可预览", text: String(payload.context || "").startsWith("知识库材料") ? "未取得该版本材料的可预览正文，请在知识库核对对应文件。" : "未取得该文件的可预览内容，请返回公告查看附件获取要求。" }];
    return { name: payload.name, size: payload.size || "—", kind: "bid-document", projectNumber: payload.number || "", pages: sections.length,
      pageData: sections.map(function (section, index) { return { number: index + 1, html: '<h1>' + esc(section.title) + '</h1><p class="opportunity-preview-context">' + esc(payload.context || "") + ' · 文件版本 ' + esc(versionLabel(payload.version)) + '</p>' + String(section.text || "").split(/\n/).map(function (line) { return '<p>' + esc(line) + '</p>'; }).join("") }; }),
      sections: sections.map(function (section, index) { return { page: index + 1, title: String(section.title || "文件内容"), kind: "bid-section" }; }) };
  }
  window.OpportunityEvidence = { records: records, requirements: requirements, requirementText: requirementText, mergeRequirementConditions: mergeRequirementConditions, qualificationViewRows: qualificationViewRows, qualificationSummary: qualificationSummary, matchQualification: matchQualification, matchBasis: matchBasis, availability: availability, noticeSections: noticeSections, noticeHref: noticeHref, sampleNoticeHref: sampleNoticeHref, prepareFiles: prepareFiles, documentPayload: documentPayload, materialPayload: materialPayload, previewHref: previewHref, previewProfile: previewProfile, versionLabel: versionLabel };
})();
