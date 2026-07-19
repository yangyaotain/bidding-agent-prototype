(function () {
  "use strict";

  const PAGE_SIZE = 6;
  const currentYear = "2026";
  const STORAGE_KEY = "biddingLedgerRecords";
  const ownerOptions = ["李明远", "周晓雯", "王子谦", "陈思远", "赵嘉怡"];
  let activeFilter = "all";
  let currentPage = 1;
  let editingId = null;
  let feeId = null;
  let reviewId = null;
  let activeLayerId = null;
  let resultDirty = false;
  let feeDirty = false;
  let reviewDirty = false;
  let pendingResultFiles = [];
  let pendingFees = [];
  let activeFeeIndex = 0;

  const icons = {
    edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>',
    view: '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    fee: '<svg viewBox="0 0 24 24"><path d="M4 7h16v12H4zM7 7V5h10v2M4 11h16"/><path d="M15 15h2"/></svg>',
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

  function formatFeeAmount(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return "0.00 元";
    if (Math.abs(number) >= 10000) return (number / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " 万元";
    return number.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " 元";
  }

  function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function feeStatusDefinition(status, fee) {
    const map = {
      not_applicable: { label: "不涉及", tone: "gray" },
      pending_result: { label: "待结果", tone: "gray" },
      pending_confirm: { label: "待确认", tone: "orange" },
      pending_payment: { label: "待支付", tone: "blue" },
      paid: { label: "已支付", tone: "green" },
      waived: { label: "已减免", tone: "gray" },
      paid_pending_refund: { label: "已缴纳待退", tone: "blue" },
      refunding: { label: "退款中", tone: "blue" },
      refunded: { label: "已退回", tone: "green" },
      converted: { label: "已转履约保证金", tone: "green" },
      cancelled: { label: "已取消", tone: "gray" },
      exception: { label: "异常", tone: "red" }
    };
    const definition = map[status] || map.pending_confirm;
    if (feeIsOverdue(fee)) return { label: status === "pending_payment" ? "逾期未支付" : "逾期未退", tone: "red" };
    return definition;
  }

  function feeStatusOptions(type) {
    if (type === "deposit") {
      return [
        ["not_applicable", "不涉及"], ["pending_confirm", "待确认"], ["pending_payment", "待缴纳"],
        ["paid_pending_refund", "已缴纳待退"], ["refunding", "退款中"], ["refunded", "已退回"],
        ["converted", "已转履约保证金"], ["exception", "异常"]
      ];
    }
    if (type === "service") {
      return [
        ["pending_result", "待结果"], ["not_applicable", "不涉及"], ["pending_confirm", "待确认"],
        ["pending_payment", "待支付"], ["paid", "已支付"], ["waived", "已减免"], ["exception", "异常"]
      ];
    }
    return [
      ["not_applicable", "不涉及"], ["pending_confirm", "待确认"], ["pending_payment", "待支付"],
      ["paid", "已支付"], ["waived", "已减免"], ["cancelled", "已取消"], ["exception", "异常"]
    ];
  }

  function normalizeFee(fee, index, record) {
    const type = ["document", "deposit", "service", "other"].indexOf(fee.type) === -1 ? "other" : fee.type;
    const names = { document: "标书费用", deposit: "投标保证金", service: "中标服务费", other: "其他招标费用" };
    const involved = fee.involved !== false && fee.status !== "not_applicable";
    return {
      id: fee.id || type + "-" + record.id + "-" + index,
      type: type,
      name: fee.name || names[type],
      involved: involved,
      status: fee.status || (involved ? "pending_confirm" : "not_applicable"),
      basis: fee.basis || "",
      expectedAmount: Number(fee.expectedAmount || 0),
      actualAmount: Number(fee.actualAmount || 0),
      payee: fee.payee || "",
      dueDate: fee.dueDate || "",
      paidDate: fee.paidDate || "",
      owner: fee.owner || record.owner || ownerOptions[0],
      guaranteeMethod: fee.guaranteeMethod || "",
      refundAmount: Number(fee.refundAmount || 0),
      refundDueDate: fee.refundDueDate || "",
      refundDate: fee.refundDate || "",
      files: Array.isArray(fee.files) ? fee.files.map(function (file) { return Object.assign({}, file); }) : [],
      remark: fee.remark || ""
    };
  }

  function defaultFees(record) {
    const documentAmount = record.bidAmount > 1000 ? 800 : 500;
    const depositAmount = record.bidAmount > 1000 ? 80000 : record.bidAmount > 700 ? 50000 : 40000;
    const isPending = record.result === "pending";
    const isWon = record.result === "won";
    const pendingRefund = isPending || record.id === "BID-202605-012";
    const serviceAmount = isWon ? Math.round(Number(record.winningAmount || record.bidAmount || 0) * 10000 * 0.015) : 0;
    const servicePending = record.id === "BID-202605-014";
    const documentFee = {
      id: "document-" + record.id, type: "document", name: "标书费用", involved: true, status: "paid",
      basis: "招标文件获取及制作费用", expectedAmount: documentAmount, actualAmount: documentAmount,
      payee: record.purchaser, dueDate: addDays(record.bidDate, -14), paidDate: addDays(record.bidDate, -13),
      owner: record.owner, files: [{ name: "标书费用付款回单.pdf", description: "银行付款回单", category: "支付凭证", tone: "green" }],
      remark: "已按招标文件要求完成支付。"
    };
    const depositFee = {
      id: "deposit-" + record.id, type: "deposit", name: "投标保证金", involved: true,
      status: pendingRefund ? (record.id === "BID-202605-012" ? "refunding" : "paid_pending_refund") : (isWon && record.id === "BID-202606-016" ? "converted" : "refunded"),
      basis: "按招标文件投标保证金要求缴纳", expectedAmount: depositAmount, actualAmount: depositAmount,
      payee: record.purchaser, dueDate: addDays(record.bidDate, -3), paidDate: addDays(record.bidDate, -5),
      owner: record.owner, guaranteeMethod: "银行转账", refundAmount: depositAmount,
      refundDueDate: record.id === "BID-202605-012" ? "2026-07-12" : (isPending ? "" : addDays(record.resultDate || record.bidDate, 20)),
      refundDate: pendingRefund || (isWon && record.id === "BID-202606-016") ? "" : addDays(record.resultDate || record.bidDate, 12),
      files: [{ name: "投标保证金缴纳凭证.pdf", description: "保证金支付凭证", category: "保证金凭证", tone: "blue" }],
      remark: isPending ? "已缴纳，待采购结果公布后跟进退回。" : "保证金状态已根据项目结果维护。"
    };
    const serviceFee = {
      id: "service-" + record.id, type: "service", name: "中标服务费", involved: isPending || isWon,
      status: isPending ? "pending_result" : (isWon ? (servicePending ? "pending_payment" : "paid") : "not_applicable"),
      basis: "按中标金额及招标代理服务收费标准计取", expectedAmount: serviceAmount,
      actualAmount: isWon && !servicePending ? serviceAmount : 0, payee: isWon ? "项目招标代理机构" : "",
      dueDate: servicePending ? "2026-07-15" : (isWon ? addDays(record.resultDate, 7) : ""),
      paidDate: isWon && !servicePending ? addDays(record.resultDate, 5) : "", owner: record.owner,
      files: isWon && !servicePending ? [{ name: "中标服务费付款凭证.pdf", description: "服务费付款回单", category: "支付凭证", tone: "green" }] : [],
      remark: isPending ? "待投标结果公布后确认是否涉及。" : (isWon ? "按正式收费通知维护。" : "项目未中标，不涉及中标服务费。")
    };
    return [documentFee, depositFee, serviceFee].map(function (fee, index) { return normalizeFee(fee, index, record); });
  }

  function feeIsOverdue(fee) {
    if (!fee || fee.status === "exception") return fee && fee.status === "exception";
    const today = todayString();
    if (fee.status === "pending_payment" && fee.dueDate) return fee.dueDate < today;
    if ((fee.status === "paid_pending_refund" || fee.status === "refunding") && fee.refundDueDate) return fee.refundDueDate < today;
    return false;
  }

  function feeSummary(record) {
    const fees = Array.isArray(record.fees) ? record.fees : [];
    const involved = fees.filter(function (fee) { return fee.involved && fee.status !== "not_applicable"; });
    if (!involved.length) return { key: "none", label: "无相关费用", tone: "gray", hint: "均不涉及", pending: 0, exception: 0 };
    const exception = involved.filter(feeIsOverdue).length;
    const maintain = involved.filter(function (fee) { return fee.status === "pending_confirm"; }).length;
    const processing = involved.filter(function (fee) {
      return ["pending_payment", "paid_pending_refund", "refunding"].indexOf(fee.status) !== -1 && !feeIsOverdue(fee);
    }).length;
    const inTransit = involved.filter(function (fee) {
      return fee.type === "deposit" && ["paid_pending_refund", "refunding"].indexOf(fee.status) !== -1;
    }).reduce(function (sum, fee) { return sum + Number(fee.actualAmount || fee.expectedAmount || 0); }, 0);
    if (exception) return { key: "exception", label: "费用有异常", tone: "red", hint: exception + " 项已逾期", pending: maintain + processing, exception: exception };
    if (maintain) return { key: "maintain", label: "费用待维护", tone: "orange", hint: maintain + " 项待确认", pending: maintain + processing, exception: 0 };
    if (processing) return { key: "processing", label: "费用待处理", tone: "blue", hint: inTransit ? "保证金 " + formatFeeAmount(inTransit) + " 在途" : processing + " 项待处理", pending: processing, exception: 0 };
    return { key: "settled", label: "费用已结清", tone: "green", hint: "相关费用均已完成", pending: 0, exception: 0 };
  }

  function feeTotals(record) {
    const fees = Array.isArray(record.fees) ? record.fees : [];
    return fees.reduce(function (totals, fee) {
      if (!fee.involved || fee.status === "not_applicable") return totals;
      if (fee.type !== "deposit" && fee.status === "paid") totals.paid += Number(fee.actualAmount || 0);
      if (fee.type !== "deposit" && ["pending_confirm", "pending_payment"].indexOf(fee.status) !== -1) {
        totals.pending += Math.max(0, Number(fee.expectedAmount || 0) - Number(fee.actualAmount || 0));
      }
      if (fee.type === "deposit" && ["paid_pending_refund", "refunding"].indexOf(fee.status) !== -1) {
        totals.deposit += Number(fee.actualAmount || fee.expectedAmount || 0);
      }
      if (["pending_confirm", "pending_payment", "paid_pending_refund", "refunding"].indexOf(fee.status) !== -1 || feeIsOverdue(fee)) totals.actions += 1;
      if (feeIsOverdue(fee)) totals.exceptions += 1;
      return totals;
    }, { paid: 0, pending: 0, deposit: 0, actions: 0, exceptions: 0 });
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

  function defaultArchiveVersions(record) {
    const formalNumber = String(record.archiveVersion || "正式交付 V1.0.4").replace(/^正式交付\s*/, "") || "V1.0.4";
    return [
      {
        id: record.id + "-VER-001",
        number: "V1.0.1",
        createdAt: new Date(record.archiveDate + " 09:10").getTime(),
        createdBy: record.owner,
        note: "完成技术标与商务标初稿。",
        check: { status: "result", batch: 1, score: 82 },
        review: { status: "not_submitted" },
        isDeliveryVersion: false,
        archiveStatus: "archived"
      },
      {
        id: record.id + "-VER-FORMAL",
        number: formalNumber,
        createdAt: new Date(record.archiveTime || record.archiveDate + " 18:20").getTime(),
        createdBy: record.archiveOperator || record.owner,
        note: "完成智能检查与人工质量审核，形成正式交付版本。",
        check: { status: "passed", batch: 2, score: 98 },
        review: { status: "approved" },
        isDeliveryVersion: true,
        archiveStatus: "archived"
      }
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
    record.archiveVersion = record.archiveVersion || "正式交付 V1.0.4";
    record.archiveOperator = record.archiveOperator || record.owner;
    record.archiveVersions = Array.isArray(record.archiveVersions) && record.archiveVersions.length ? record.archiveVersions : defaultArchiveVersions(record);
    record.archiveFiles = Array.isArray(record.archiveFiles) ? record.archiveFiles : defaultArchiveFiles(record);
    record.resultFiles = Array.isArray(record.resultFiles) ? record.resultFiles : defaultResultFiles(record);
    record.knowledgeItems = Array.isArray(record.knowledgeItems) ? record.knowledgeItems : defaultKnowledgeItems();
    record.fees = Array.isArray(record.fees) && record.fees.length
      ? record.fees.map(function (fee, index) { return normalizeFee(fee, index, record); })
      : defaultFees(record);
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
    const feeFilter = document.getElementById("ledgerFeeFilter").value;
    const searchable = [record.id, record.name, record.purchaser].join(" ").toLowerCase();
    return (!query || searchable.indexOf(query) !== -1) &&
      (year === "all" || record.bidDate.slice(0, 4) === year) &&
      (owner === "all" || record.owner === owner) &&
      (feeFilter === "all" || feeSummary(record).key === feeFilter);
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
    const won = yearly.filter(function (record) { return record.result === "won"; });
    const decided = yearly.filter(function (record) { return record.result === "won" || record.result === "lost"; });
    const winningAmount = won.reduce(function (sum, record) { return sum + Number(record.winningAmount || 0); }, 0);
    const feeMetrics = yearly.reduce(function (totals, record) {
      const recordTotals = feeTotals(record);
      totals.paid += recordTotals.paid;
      totals.pending += recordTotals.pending;
      totals.deposit += recordTotals.deposit;
      totals.actions += recordTotals.actions;
      totals.exceptions += recordTotals.exceptions;
      return totals;
    }, { paid: 0, pending: 0, deposit: 0, actions: 0, exceptions: 0 });
    document.getElementById("ledgerYearTotal").textContent = yearly.length;
    document.getElementById("ledgerWonTotal").textContent = won.length;
    document.getElementById("ledgerWonAmount").textContent = formatAmount(winningAmount);
    document.getElementById("ledgerWinRate").textContent = decided.length ? (won.length / decided.length * 100).toFixed(1) + "%" : "0%";
    document.getElementById("ledgerFeePaidAmount").textContent = formatFeeAmount(feeMetrics.paid);
    document.getElementById("ledgerFeePendingAmount").textContent = formatFeeAmount(feeMetrics.pending);
    document.getElementById("ledgerDepositInTransit").textContent = formatFeeAmount(feeMetrics.deposit);
    document.getElementById("ledgerFeeActionTotal").textContent = feeMetrics.actions;
    document.getElementById("ledgerFeeActionHint").textContent = feeMetrics.exceptions
      ? feeMetrics.exceptions + " 项费用已逾期"
      : (feeMetrics.actions ? feeMetrics.actions + " 项费用待跟进" : "当前无费用异常");
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
    const fees = feeSummary(record);
    const resultClass = record.result === "pending" ? " ledger-result-pending" : "";
    const score = record.score === "" ? "—" : Number(record.score).toFixed(2);
    const rank = record.rank === "" ? "排名待补" : "第 " + record.rank + " 名";
    const resultHint = record.resultDate ? record.resultDate + " 公布" : "公告待跟进";
    const resultScoreHint = record.score === "" ? resultHint : score + " 分 · " + rank;
    const resultText = record.result === "pending" ? "维护结果" : "更新结果";
    return [
      '<tr data-ledger-id="' + escapeHtml(record.id) + '">',
      '<td><div class="table-primary"><div><strong title="' + escapeHtml(record.name) + '">' + escapeHtml(record.name) + '</strong><span class="ledger-project-subline">' + escapeHtml(record.id) + '<i></i>归档于 ' + escapeHtml(record.archiveDate) + '<i></i>' + record.archiveVersions.length + " 个版本</span></div></div></td>",
      '<td><strong class="purchaser-name" title="' + escapeHtml(record.purchaser) + '">' + escapeHtml(record.purchaser) + "</strong></td>",
      '<td><div class="cell-stack"><strong>' + escapeHtml(record.bidDateText.slice(0, 10)) + '</strong><span>' + escapeHtml(record.bidDateText.slice(11)) + " 截止</span></div></td>",
      '<td><strong class="table-amount amount-text">' + formatAmount(record.bidAmount) + "</strong></td>",
      '<td><div class="ledger-result-cell"><span class="status-tag ' + result.tone + resultClass + '">' + result.label + "</span><small>" + escapeHtml(resultScoreHint) + "</small></div></td>",
      '<td><div class="ledger-fee-cell"><span class="status-tag ' + fees.tone + '">' + fees.label + "</span><small>" + escapeHtml(fees.hint) + "</small></div></td>",
      '<td><div class="owner-cell"><span class="person-avatar">' + escapeHtml(record.owner.slice(0, 1)) + "</span><span>" + escapeHtml(record.owner) + "</span></div></td>",
      '<td><div class="row-actions"><button class="ledger-action-btn primary-action" type="button" data-edit-result="' + escapeHtml(record.id) + '"><span class="btn-icon">' + icons.edit + "</span><span>" + resultText + '</span></button><button class="ledger-action-btn fee-action" type="button" data-edit-fee="' + escapeHtml(record.id) + '"><span class="btn-icon">' + icons.fee + '</span><span>维护费用</span></button><button class="ledger-action-btn" type="button" data-ledger-detail="' + escapeHtml(record.id) + '"><span class="btn-icon">' + icons.view + "</span><span>详情</span></button></div></td>",
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
    return (activeLayerId === "ledgerResultModal" && resultDirty) ||
      (activeLayerId === "ledgerFeeModal" && feeDirty) ||
      (activeLayerId === "ledgerReviewModal" && reviewDirty);
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
    feeDirty = false;
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

  function currentPendingFee() {
    return pendingFees[activeFeeIndex] || null;
  }

  function renderFeeStatusOptions(fee) {
    const select = document.getElementById("ledgerFeeStatus");
    const options = feeStatusOptions(fee.type);
    select.innerHTML = options.map(function (option) {
      return '<option value="' + option[0] + '">' + option[1] + "</option>";
    }).join("");
    select.value = options.some(function (option) { return option[0] === fee.status; }) ? fee.status : "pending_confirm";
  }

  function renderFeeFiles() {
    const fee = currentPendingFee();
    const list = document.getElementById("ledgerFeeFileList");
    const files = fee && Array.isArray(fee.files) ? fee.files : [];
    list.innerHTML = files.map(function (file, index) {
      return '<div class="ledger-result-file-item">' + fileIcon(file.name) + '<div><strong title="' + escapeHtml(file.name) + '">' + escapeHtml(file.name) + '</strong><small>' + escapeHtml(file.description || "费用佐证附件") + '</small></div><button type="button" data-remove-fee-file="' + index + '">移除</button></div>';
    }).join("");
  }

  function renderFeeTabs() {
    const list = document.getElementById("ledgerFeeTabList");
    list.innerHTML = pendingFees.map(function (fee, index) {
      const definition = feeStatusDefinition(fee.status, fee);
      return '<button class="ledger-fee-tab' + (index === activeFeeIndex ? " active" : "") + '" type="button" data-fee-tab="' + index + '"><span class="ledger-fee-tab-icon">' + icons.fee + '</span><span><strong>' + escapeHtml(fee.name) + '</strong><small>' + escapeHtml(fee.type === "deposit" ? "保证金缴纳与退回" : "应付与实付信息") + '</small></span><em class="status-tag ' + definition.tone + '">' + definition.label + "</em></button>";
    }).join("");
  }

  function updateFeeEditorState() {
    const fee = currentPendingFee();
    if (!fee) return;
    const involvedSelect = document.getElementById("ledgerFeeInvolved");
    const involved = involvedSelect.value === "true";
    const statusSelect = document.getElementById("ledgerFeeStatus");
    if (!involved && statusSelect.value !== "not_applicable") statusSelect.value = "not_applicable";
    if (involved && statusSelect.value === "not_applicable") statusSelect.value = fee.type === "service" && recordById(feeId).result === "pending" ? "pending_result" : "pending_confirm";
    fee.involved = involved;
    fee.status = involved ? statusSelect.value : "not_applicable";
    statusSelect.disabled = !involved;
    [
      "ledgerFeeBasis", "ledgerFeeExpectedAmount", "ledgerFeeActualAmount", "ledgerFeePayee",
      "ledgerFeeDueDate", "ledgerFeePaidDate", "ledgerFeeOwner", "ledgerGuaranteeMethod",
      "ledgerFeeRefundAmount", "ledgerFeeRefundDueDate", "ledgerFeeRefundDate",
      "selectLedgerFeeFiles", "ledgerFeeRemark"
    ].forEach(function (id) {
      const element = document.getElementById(id);
      if (element) element.disabled = !involved;
    });
    document.querySelectorAll(".ledger-guarantee-field").forEach(function (field) {
      field.classList.toggle("hidden", fee.type !== "deposit");
    });
    const definition = feeStatusDefinition(statusSelect.value, Object.assign({}, fee, {
      status: statusSelect.value,
      involved: involved,
      dueDate: document.getElementById("ledgerFeeDueDate").value,
      refundDueDate: document.getElementById("ledgerFeeRefundDueDate").value
    }));
    const tag = document.getElementById("ledgerFeeEditorStatus");
    tag.className = "status-tag " + definition.tone;
    tag.textContent = definition.label;
  }

  function populateFeeEditor() {
    const fee = currentPendingFee();
    if (!fee) return;
    document.getElementById("ledgerFeeTypeEyebrow").textContent = fee.type === "other" ? "其他招标费用" : "固定费用项目";
    document.getElementById("ledgerFeeEditorTitle").textContent = fee.name;
    document.getElementById("ledgerFeeName").value = fee.name;
    document.getElementById("ledgerFeeName").readOnly = fee.type !== "other";
    document.getElementById("ledgerFeeInvolved").value = fee.involved ? "true" : "false";
    renderFeeStatusOptions(fee);
    document.getElementById("ledgerFeeBasis").value = fee.basis || "";
    document.getElementById("ledgerFeeExpectedAmount").value = fee.expectedAmount || "";
    document.getElementById("ledgerFeeActualAmount").value = fee.actualAmount || "";
    document.getElementById("ledgerFeePayee").value = fee.payee || "";
    document.getElementById("ledgerFeeDueDate").value = fee.dueDate || "";
    document.getElementById("ledgerFeePaidDate").value = fee.paidDate || "";
    document.getElementById("ledgerFeeOwner").value = fee.owner || recordById(feeId).owner;
    document.getElementById("ledgerGuaranteeMethod").value = fee.guaranteeMethod || "";
    document.getElementById("ledgerFeeRefundAmount").value = fee.refundAmount || "";
    document.getElementById("ledgerFeeRefundDueDate").value = fee.refundDueDate || "";
    document.getElementById("ledgerFeeRefundDate").value = fee.refundDate || "";
    document.getElementById("ledgerFeeRemark").value = fee.remark || "";
    document.getElementById("deleteLedgerOtherFee").classList.toggle("hidden", fee.type !== "other");
    renderFeeFiles();
    updateFeeEditorState();
  }

  function syncFeeEditor() {
    const fee = currentPendingFee();
    if (!fee) return;
    fee.name = document.getElementById("ledgerFeeName").value.trim() || fee.name;
    fee.involved = document.getElementById("ledgerFeeInvolved").value === "true";
    fee.status = fee.involved ? document.getElementById("ledgerFeeStatus").value : "not_applicable";
    fee.basis = document.getElementById("ledgerFeeBasis").value.trim();
    fee.expectedAmount = Number(document.getElementById("ledgerFeeExpectedAmount").value || 0);
    fee.actualAmount = Number(document.getElementById("ledgerFeeActualAmount").value || 0);
    fee.payee = document.getElementById("ledgerFeePayee").value.trim();
    fee.dueDate = document.getElementById("ledgerFeeDueDate").value;
    fee.paidDate = document.getElementById("ledgerFeePaidDate").value;
    fee.owner = document.getElementById("ledgerFeeOwner").value;
    fee.guaranteeMethod = document.getElementById("ledgerGuaranteeMethod").value;
    fee.refundAmount = Number(document.getElementById("ledgerFeeRefundAmount").value || 0);
    fee.refundDueDate = document.getElementById("ledgerFeeRefundDueDate").value;
    fee.refundDate = document.getElementById("ledgerFeeRefundDate").value;
    fee.remark = document.getElementById("ledgerFeeRemark").value.trim();
  }

  function updateCurrentFeeSummary() {
    const summary = feeSummary({ fees: pendingFees });
    const tag = document.getElementById("ledgerCurrentFeeTag");
    tag.className = "status-tag " + summary.tone;
    tag.textContent = summary.label;
  }

  function switchFeeEditor(index) {
    if (index < 0 || index >= pendingFees.length || index === activeFeeIndex) return;
    syncFeeEditor();
    activeFeeIndex = index;
    renderFeeTabs();
    populateFeeEditor();
    updateCurrentFeeSummary();
  }

  function openFeeEditor(id) {
    const record = recordById(id);
    if (!record) return;
    feeId = id;
    pendingFees = cloneValue(record.fees);
    activeFeeIndex = 0;
    document.getElementById("ledgerFeeProjectName").textContent = record.name;
    document.getElementById("ledgerFeeProjectMeta").textContent = record.id + " · " + record.purchaser;
    renderFeeTabs();
    populateFeeEditor();
    updateCurrentFeeSummary();
    feeDirty = false;
    openLayer("ledgerFeeModal", "#ledgerFeeInvolved");
  }

  function addOtherFee() {
    syncFeeEditor();
    const record = recordById(feeId);
    pendingFees.push(normalizeFee({
      id: "other-" + record.id + "-" + Date.now(),
      type: "other",
      name: "其他招标费用",
      involved: true,
      status: "pending_confirm",
      owner: record.owner
    }, pendingFees.length, record));
    activeFeeIndex = pendingFees.length - 1;
    renderFeeTabs();
    populateFeeEditor();
    updateCurrentFeeSummary();
    feeDirty = true;
  }

  function deleteOtherFee() {
    const fee = currentPendingFee();
    if (!fee || fee.type !== "other") return;
    pendingFees.splice(activeFeeIndex, 1);
    activeFeeIndex = Math.max(0, Math.min(activeFeeIndex, pendingFees.length - 1));
    renderFeeTabs();
    populateFeeEditor();
    updateCurrentFeeSummary();
    feeDirty = true;
  }

  function focusFeeValidation(index, selector, message) {
    if (index !== activeFeeIndex) {
      activeFeeIndex = index;
      renderFeeTabs();
      populateFeeEditor();
    }
    notify(message, "warning", selector);
    const element = document.querySelector(selector);
    if (element) element.focus();
  }

  function saveFees() {
    const record = recordById(feeId);
    if (!record) return;
    syncFeeEditor();
    for (let index = 0; index < pendingFees.length; index += 1) {
      const fee = pendingFees[index];
      if (!fee.name.trim()) {
        focusFeeValidation(index, "#ledgerFeeName", "请填写费用名称");
        return;
      }
      if (!fee.involved) continue;
      if (["pending_payment", "paid", "paid_pending_refund", "refunding", "refunded", "converted"].indexOf(fee.status) !== -1 && !fee.expectedAmount) {
        focusFeeValidation(index, "#ledgerFeeExpectedAmount", "请填写" + fee.name + "的应付金额");
        return;
      }
      if (fee.status === "paid" && (!fee.actualAmount || !fee.paidDate)) {
        focusFeeValidation(index, !fee.actualAmount ? "#ledgerFeeActualAmount" : "#ledgerFeePaidDate", "请补充" + fee.name + "的实际支付金额和日期");
        return;
      }
      if (fee.type === "deposit" && ["paid_pending_refund", "refunding", "refunded", "converted"].indexOf(fee.status) !== -1 && (!fee.actualAmount || !fee.paidDate)) {
        focusFeeValidation(index, !fee.actualAmount ? "#ledgerFeeActualAmount" : "#ledgerFeePaidDate", "请补充投标保证金的实际缴纳金额和日期");
        return;
      }
      if (fee.type === "deposit" && fee.status === "refunded" && !fee.refundDate) {
        focusFeeValidation(index, "#ledgerFeeRefundDate", "请填写投标保证金实际退回日期");
        return;
      }
    }
    record.fees = pendingFees.map(function (fee, index) { return normalizeFee(fee, index, record); });
    persistRecords();
    renderMetrics();
    renderTable();
    feeDirty = false;
    closeLayer(true);
    notify("招标费用已保存，台账费用状态已更新", "success");
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
    record.fees.forEach(function (fee) {
      if (fee.type !== "service" || fee.status !== "pending_result") return;
      if (result === "won") {
        fee.involved = true;
        fee.status = "pending_confirm";
        fee.remark = "项目已中标，请根据正式收费通知确认服务费。";
      } else if (result === "lost") {
        fee.involved = false;
        fee.status = "not_applicable";
        fee.remark = "项目未中标，不涉及中标服务费。";
      }
    });
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
      owner: document.getElementById("ledgerOwnerFilter").value,
      fee: document.getElementById("ledgerFeeFilter").value
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
    document.getElementById("ledgerFeeFilter").value = state.fee || "all";
    if (!document.getElementById("ledgerFeeFilter").value) document.getElementById("ledgerFeeFilter").value = "all";
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
      { label: "费用状态", width: 16, value: function (record) { return feeSummary(record).label; } },
      { label: "已支付招标费用（元）", width: 22, value: function (record) { return feeTotals(record).paid.toFixed(2); } },
      { label: "在途保证金（元）", width: 20, value: function (record) { return feeTotals(record).deposit.toFixed(2); } },
      { label: "项目负责人", width: 14, value: function (record) { return record.owner; } },
      { label: "结果来源", width: 30, value: function (record) { return record.source || "待补充"; } }
    ];
  }

  function feeExportFields() {
    return [
      { label: "项目编号", width: 18, value: function (row) { return row.record.id; } },
      { label: "项目名称", width: 34, value: function (row) { return row.record.name; } },
      { label: "费用类型", width: 18, value: function (row) { return row.fee.name; } },
      { label: "是否涉及", width: 12, value: function (row) { return row.fee.involved ? "涉及" : "不涉及"; } },
      { label: "当前状态", width: 18, value: function (row) { return feeStatusDefinition(row.fee.status, row.fee).label; } },
      { label: "费用说明 / 计费依据", width: 38, value: function (row) { return row.fee.basis || ""; } },
      { label: "应付金额（元）", width: 18, value: function (row) { return Number(row.fee.expectedAmount || 0).toFixed(2); } },
      { label: "实际支付金额（元）", width: 22, value: function (row) { return Number(row.fee.actualAmount || 0).toFixed(2); } },
      { label: "收款单位", width: 28, value: function (row) { return row.fee.payee || ""; } },
      { label: "付款截止日期", width: 18, value: function (row) { return row.fee.dueDate || ""; } },
      { label: "实际支付日期", width: 18, value: function (row) { return row.fee.paidDate || ""; } },
      { label: "保证金形式", width: 16, value: function (row) { return row.fee.guaranteeMethod || ""; } },
      { label: "应退金额（元）", width: 18, value: function (row) { return Number(row.fee.refundAmount || 0).toFixed(2); } },
      { label: "预计退回日期", width: 18, value: function (row) { return row.fee.refundDueDate || ""; } },
      { label: "实际退回日期", width: 18, value: function (row) { return row.fee.refundDate || ""; } },
      { label: "经办人", width: 14, value: function (row) { return row.fee.owner || row.record.owner; } },
      { label: "凭证数量", width: 14, value: function (row) { return Array.isArray(row.fee.files) ? row.fee.files.length : 0; } },
      { label: "备注", width: 42, value: function (row) { return row.fee.remark || ""; } }
    ];
  }

  function feeExportRows(recordsToExport) {
    const rows = [];
    recordsToExport.forEach(function (record) {
      (record.fees || []).forEach(function (fee) {
        rows.push({ record: record, fee: fee });
      });
    });
    return rows;
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

  function buildLedgerWorkbook(recordsToExport) {
    const feeRows = feeExportRows(recordsToExport);
    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Microsoft YaHei"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1677FF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    return buildZipBlob([
      { name: "[Content_Types].xml", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: "_rels/.rels", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="投标台账" sheetId="1" r:id="rId1"/><sheet name="招标费用明细" sheetId="2" r:id="rId2"/></sheets></workbook>' },
      { name: "xl/_rels/workbook.xml.rels", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: "xl/worksheets/sheet1.xml", content: buildWorksheetXml(coreExportFields(), recordsToExport) },
      { name: "xl/worksheets/sheet2.xml", content: buildWorksheetXml(feeExportFields(), feeRows) },
      { name: "xl/styles.xml", content: styles }
    ]);
  }

  function exportLedger() {
    const recordsToExport = filteredRecords();
    if (!recordsToExport.length) {
      notify("当前筛选范围暂无可导出的台账记录", "warning", "#exportLedgerBtn");
      return;
    }
    const feeRows = feeExportRows(recordsToExport);
    const blob = buildLedgerWorkbook(recordsToExport);
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "投标台账_" + todayString() + ".xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    notify("投标台账 Excel 已下载，共 " + recordsToExport.length + " 条项目记录、" + feeRows.length + " 条费用明细", "success");
  }

  function resetFilters() {
    activeFilter = "all";
    currentPage = 1;
    document.getElementById("ledgerSearch").value = "";
    document.getElementById("ledgerYearFilter").value = currentYear;
    document.getElementById("ledgerOwnerFilter").value = "all";
    document.getElementById("ledgerFeeFilter").value = "all";
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
    ["ledgerYearFilter", "ledgerOwnerFilter", "ledgerFeeFilter"].forEach(function (id) {
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
    document.getElementById("ledgerFeeModal").addEventListener("input", function () {
      feeDirty = true;
      syncFeeEditor();
      renderFeeTabs();
      updateCurrentFeeSummary();
    });
    document.getElementById("ledgerFeeModal").addEventListener("change", function () {
      feeDirty = true;
      syncFeeEditor();
      updateFeeEditorState();
      renderFeeTabs();
      updateCurrentFeeSummary();
    });
    document.getElementById("ledgerReviewModal").addEventListener("input", function () { reviewDirty = true; });
    document.getElementById("ledgerReviewModal").addEventListener("change", function () { reviewDirty = true; });
    document.getElementById("saveLedgerReviewDraft").addEventListener("click", function () { saveReview(false); });
    document.getElementById("completeLedgerReview").addEventListener("click", function () { saveReview(true); });
    document.getElementById("addLedgerOtherFee").addEventListener("click", addOtherFee);
    document.getElementById("deleteLedgerOtherFee").addEventListener("click", deleteOtherFee);
    document.getElementById("saveLedgerFees").addEventListener("click", saveFees);
    document.getElementById("selectLedgerFeeFiles").addEventListener("click", function () { document.getElementById("ledgerFeeFiles").click(); });
    document.getElementById("ledgerFeeFiles").addEventListener("change", function (event) {
      const fee = currentPendingFee();
      if (!fee) return;
      Array.from(event.target.files || []).forEach(function (file) {
        if (fee.files.some(function (item) { return item.name === file.name; })) return;
        fee.files.push({ name: file.name, description: "本次新增 · " + formatBytes(file.size), category: "费用凭证", tone: "blue" });
      });
      event.target.value = "";
      feeDirty = true;
      renderFeeFiles();
    });
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
      const feeButton = event.target.closest("[data-edit-fee]");
      if (feeButton) {
        openFeeEditor(feeButton.getAttribute("data-edit-fee"));
        return;
      }
      const feeTab = event.target.closest("[data-fee-tab]");
      if (feeTab) {
        switchFeeEditor(Number(feeTab.getAttribute("data-fee-tab")));
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
      const removeFeeFile = event.target.closest("[data-remove-fee-file]");
      if (removeFeeFile) {
        const fee = currentPendingFee();
        if (!fee) return;
        fee.files.splice(Number(removeFeeFile.getAttribute("data-remove-fee-file")), 1);
        feeDirty = true;
        renderFeeFiles();
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
