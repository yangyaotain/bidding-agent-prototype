(function () {
  "use strict";

  const categories = [
    { key: "all", label: "知识总览", count: 60, href: "knowledge.html", validityAlerts: 8, validityAlertLabel: "8 项预警", validityTone: "red" },
    { key: "company", label: "企业基础资料", count: 8, href: "knowledge-company.html", validityAlerts: 2, validityAlertLabel: "2 项临期" },
    { key: "certificates", label: "企业资质证照", count: 9, href: "knowledge-certificates.html", validityAlerts: 4, validityAlertLabel: "4 项预警", validityTone: "red" },
    { key: "people", label: "人员档案", count: 8, href: "knowledge-people.html", validityAlerts: 2, validityAlertLabel: "2 项临期" },
    { key: "cases", label: "业绩案例", count: 6, href: "knowledge-cases.html" },
    { key: "solutions", label: "产品与技术方案", count: 6, href: "knowledge-solutions.html" },
    { key: "business", label: "商务素材", count: 6, href: "knowledge-business.html" },
    { key: "templates", label: "模板与格式", count: 8, href: "knowledge-templates.html" },
    { key: "charts", label: "图表素材", count: 5, href: "knowledge-charts.html" },
    { key: "history", label: "历史标书", count: 4, href: "knowledge-history.html" }
  ];

  const categoryGroups = [
    { key: "overview", label: "", items: ["all"] },
    { key: "enterprise", label: "企业资料", items: ["company", "certificates"] },
    { key: "people", label: "人员资料", items: ["people"] },
    { key: "experience", label: "项目经验", items: ["cases", "history"] },
    { key: "content", label: "内容素材", items: ["solutions", "business", "templates", "charts"] }
  ];

  const assets = [
    {
      id: "KB-COMP-001",
      name: "企业营业执照",
      category: "company",
      categoryLabel: "企业基础资料",
      type: "企业证照",
      scope: "全部投标项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "longterm",
      validityLabel: "长期有效",
      validityTone: "green",
      dateRange: "核准日期 2023-06-18",
      references: 6,
      updatedAt: "2026-07-11",
      version: "V2.1",
      owner: "综合管理部",
      file: "营业执照.pdf",
      tags: ["独立法人", "资格条件", "已核验"],
      permissions: "投标团队可引用",
      description: "用于证明企业主体资格的当前有效营业执照副本，正式投标前由商务负责人核验原件。"
    },
    {
      id: "KB-CERT-006",
      name: "信息安全管理体系认证证书",
      category: "certificates",
      categoryLabel: "企业资质证照",
      type: "体系认证",
      scope: "信息化、运维与安全类项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "expiring",
      validityLabel: "45 天后到期",
      validityTone: "orange",
      dateRange: "有效期至 2026-08-28",
      references: 2,
      updatedAt: "2026-07-09",
      version: "V1.3",
      owner: "质量与安全部",
      file: "ISO27001_认证证书.pdf",
      tags: ["ISO 27001", "信息安全", "临期"],
      permissions: "投标团队可引用",
      description: "信息安全管理体系认证材料，证书临近有效期，请及时准备换证并通过编辑替换当前文件。"
    },
    {
      id: "KB-CERT-003",
      name: "质量管理体系认证证书",
      category: "certificates",
      categoryLabel: "企业资质证照",
      type: "体系认证",
      scope: "全部投标项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "valid",
      validityLabel: "有效",
      validityTone: "green",
      dateRange: "有效期至 2027-05-18",
      references: 4,
      updatedAt: "2026-06-26",
      version: "V1.2",
      owner: "质量与安全部",
      file: "ISO9001_认证证书.pdf",
      tags: ["ISO 9001", "质量管理", "企业能力"],
      permissions: "投标团队可引用",
      description: "质量管理体系认证材料，可用于企业能力评分和管理体系说明。"
    },
    {
      id: "KB-CERT-027",
      name: "电子与智能化工程专业承包资质证书",
      category: "certificates",
      categoryLabel: "企业资质证照",
      type: "行业资质",
      summary: "专业承包资质已经超过有效期，需要替换新证书",
      startDate: "2023-07-06",
      endDate: "2026-07-05",
      validity: "expired",
      validityLabel: "已过期",
      validityTone: "red",
      dateRange: "有效期至 2026-07-05",
      references: 1,
      updatedAt: "2026-07-06",
      owner: "综合管理部",
      file: "电子与智能化工程专业承包资质证书.pdf",
      tags: ["专业承包", "行业资质", "已过期"],
      description: "证书已超过有效期，更新前不得作为当前有效证明自动匹配或引用。"
    },
    {
      id: "KB-PEO-038",
      name: "王磊",
      category: "people",
      categoryLabel: "人员档案",
      type: "项目经理",
      scope: "信息系统建设与运维项目",
      maintenance: "待完善",
      maintenanceTone: "orange",
      validity: "pending",
      validityLabel: "材料待核验",
      validityTone: "orange",
      dateRange: "社保证明待补充",
      references: 0,
      updatedAt: "2026-07-13",
      version: "草稿 V1.0",
      owner: "人力资源部",
      file: "王磊_人员履历与证明材料.zip",
      tags: ["项目经理", "职称", "证书待核验"],
      permissions: "仅商务负责人和项目负责人可查看",
      description: "证书和近三个月社保材料尚不完整，请补充真实附件后再使用。"
    },
    {
      id: "KB-CASE-021",
      name: "港口集装箱业务平台运维项目业绩包",
      category: "cases",
      categoryLabel: "业绩案例",
      type: "信息系统运维",
      scope: "港航物流、平台运维项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "longterm",
      validityLabel: "可复用",
      validityTone: "green",
      dateRange: "履约期 2023-2025",
      references: 3,
      updatedAt: "2026-07-08",
      version: "V2.0",
      owner: "解决方案中心",
      file: "港口平台运维_业绩证明包.zip",
      tags: ["港航物流", "运维服务", "合同与验收"],
      permissions: "投标团队可引用",
      description: "包含合同关键页、验收证明和项目说明，可用于同类项目业绩评分。"
    },
    {
      id: "KB-SOL-064",
      name: "信息系统日常运维与应急保障方案",
      category: "solutions",
      categoryLabel: "产品与技术方案",
      type: "运维服务方案",
      scope: "信息系统运维项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "valid",
      validityLabel: "当前可用",
      validityTone: "green",
      dateRange: "最近更新 2026-07-06",
      references: 4,
      updatedAt: "2026-07-06",
      version: "V3.4",
      owner: "解决方案中心",
      file: "信息系统运维与应急保障方案.docx",
      tags: ["巡检", "应急", "发布", "服务报告"],
      permissions: "投标团队可编辑引用，量化指标需按项目确认",
      description: "覆盖巡检、发布、测试、故障应急和服务报告，引用时必须按招标要求校准响应时效。"
    },
    {
      id: "KB-BUS-009",
      name: "7×24 售后服务与故障响应承诺",
      category: "business",
      categoryLabel: "商务素材",
      type: "售后承诺",
      scope: "运维服务类项目",
      maintenance: "待完善",
      maintenanceTone: "orange",
      validity: "pending",
      validityLabel: "参数待确认",
      validityTone: "orange",
      dateRange: "P1-P4 时效未统一",
      references: 0,
      updatedAt: "2026-07-12",
      version: "草稿 V1.6",
      owner: "商务管理部",
      file: "售后服务与故障响应承诺.docx",
      tags: ["售后服务", "7×24", "人工确认"],
      permissions: "参数补充完成后可引用，量化承诺必须人工确认",
      description: "当前模板参数与部分项目采购要求存在差异，不允许在未确认时自动写入正式承诺函。"
    },
    {
      id: "KB-TPL-004",
      name: "技术偏离表标准模板",
      category: "templates",
      categoryLabel: "模板与格式",
      type: "偏离表模板",
      scope: "技术标响应",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "valid",
      validityLabel: "当前可用",
      validityTone: "green",
      dateRange: "模板版本 V3.2",
      references: 5,
      updatedAt: "2026-06-30",
      version: "V3.2",
      owner: "投标管理部",
      file: "技术偏离表标准模板_V3.2.docx",
      tags: ["技术偏离", "人工确认", "标准格式"],
      permissions: "投标团队可引用",
      description: "用于整理技术要求、响应参数和偏离说明，正式偏离结论必须由项目负责人确认。"
    },
    {
      id: "KB-CHART-002",
      name: "运维服务体系架构图",
      category: "charts",
      categoryLabel: "图表素材",
      type: "架构图",
      scope: "运维方案与服务体系章节",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "valid",
      validityLabel: "当前可用",
      validityTone: "green",
      dateRange: "最近更新 2026-06-21",
      references: 2,
      updatedAt: "2026-06-21",
      version: "V2.3",
      owner: "解决方案中心",
      file: "运维服务体系架构图.svg",
      tags: ["运维体系", "组织架构", "流程关系"],
      permissions: "投标团队可引用并按项目调整",
      description: "展示服务管理、监控预警、应急响应和持续改进之间的关系。"
    },
    {
      id: "KB-HIS-001",
      name: "港口平台运维项目投标文件",
      category: "history",
      categoryLabel: "历史标书",
      type: "运维服务标书",
      scope: "同类港航物流项目参考",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "restricted",
      validityLabel: "受限资料",
      validityTone: "blue",
      dateRange: "归档日期 2025-12-18",
      references: 1,
      updatedAt: "2026-05-19",
      version: "归档 V1.0",
      owner: "投标管理部",
      file: "港口平台运维项目归档包.zip",
      tags: ["历史标书", "港航物流", "受限复用"],
      permissions: "投标团队可查看，原始报价和客户信息禁止直接复用",
      description: "保留历史投标文件及附件，可用于查找同类项目的目录结构和内容表达。"
    }
  ];

  const companyRecords = [
    {
      id: "KB-COMP-001",
      name: "企业营业执照",
      category: "company",
      categoryLabel: "企业基础资料",
      type: "主体资格",
      summary: "企业主体信息完整",
      scope: "全部投标项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "longterm",
      validityLabel: "长期有效",
      validityTone: "green",
      dateRange: "核准日期 2023-06-18",
      references: 6,
      updatedAt: "2026-07-11",
      version: "V2.1",
      owner: "综合管理部",
      file: "营业执照.pdf",
      tags: ["独立法人", "资格条件", "已核验"],
      permissions: "投标团队可引用",
      restricted: false,
      description: "企业主体资格的当前有效证明，正式投标前由商务负责人核验原件与采购文件要求。"
    },
    {
      id: "KB-COMP-004",
      name: "企业标准简介与核心能力说明",
      category: "company",
      categoryLabel: "企业基础资料",
      type: "企业介绍",
      summary: "公司概况、业务方向、研发与交付能力",
      scope: "商务标企业介绍、技术标总体能力",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "valid",
      validityLabel: "当前可用",
      validityTone: "green",
      dateRange: "建议更新 2026-10-01",
      references: 5,
      updatedAt: "2026-07-03",
      version: "V4.2",
      owner: "品牌与市场部",
      file: "企业标准简介与核心能力说明.docx",
      tags: ["公司简介", "核心能力", "标准表述"],
      permissions: "投标团队可编辑引用，关键经营数据需保持当前版本",
      restricted: false,
      description: "统一企业介绍口径，覆盖公司定位、主营业务、研发能力和交付体系，禁止自行增加未经核验的数据。"
    },
    {
      id: "KB-COMP-007",
      name: "基本存款账户信息",
      category: "company",
      categoryLabel: "企业基础资料",
      type: "银行账户",
      summary: "开户银行与账户信息按权限展示",
      scope: "保证金、付款与账户证明相关项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "longterm",
      validityLabel: "长期有效",
      validityTone: "green",
      dateRange: "最近核验 2026-06-20",
      references: 2,
      updatedAt: "2026-06-20",
      version: "V1.4",
      owner: "财务管理部",
      file: "基本存款账户信息.pdf",
      tags: ["开户信息", "账户证明", "受限资料"],
      permissions: "仅商务负责人和财务授权人员可查看完整信息",
      restricted: true,
      description: "用于需要提供开户证明的投标项目。"
    },
    {
      id: "KB-COMP-010",
      name: "2025 年度财务审计报告",
      category: "company",
      categoryLabel: "企业基础资料",
      type: "财务资料",
      summary: "审计意见、资产负债与经营数据证明",
      scope: "要求提供近年度财务状况的项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "valid",
      validityLabel: "本年度可用",
      validityTone: "green",
      dateRange: "报告年度 2025",
      references: 3,
      updatedAt: "2026-05-12",
      version: "归档 V1.0",
      owner: "财务管理部",
      file: "2025年度财务审计报告.pdf",
      tags: ["财务审计", "年度报告", "受限资料"],
      permissions: "仅商务负责人和项目负责人可引用",
      restricted: true,
      description: "用于财务状况和履约能力相关资格或评分要求，引用时必须核对采购文件要求的报告年度。"
    },
    {
      id: "KB-COMP-012",
      name: "企业信用报告（2026 年 4 月）",
      category: "company",
      categoryLabel: "企业基础资料",
      type: "信用税务",
      summary: "内部规则要求信用报告三个月内有效",
      scope: "企业信用与合规审查相关项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "update",
      validityLabel: "17 天内更新",
      validityTone: "orange",
      dateRange: "内部有效期至 2026-07-31",
      references: 1,
      updatedAt: "2026-04-30",
      version: "V1.0",
      owner: "财务管理部",
      file: "企业信用报告_202604.pdf",
      tags: ["企业信用", "合规证明", "临期"],
      permissions: "仅商务负责人可查看完整报告",
      restricted: true,
      description: "当前报告即将超出内部三个月有效期，更新前仍需按具体招标文件判断是否可以使用。"
    },
    {
      id: "KB-COMP-014",
      name: "依法缴纳税收证明（2026 年第二季度）",
      category: "company",
      categoryLabel: "企业基础资料",
      type: "信用税务",
      summary: "2026 年 4-6 月纳税凭证与汇总说明",
      scope: "资格审查与政府采购项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "valid",
      validityLabel: "当前可用",
      validityTone: "green",
      dateRange: "覆盖期间 2026-04 至 2026-06",
      references: 4,
      updatedAt: "2026-07-08",
      version: "V1.0",
      owner: "财务管理部",
      file: "依法缴纳税收证明_2026Q2.zip",
      tags: ["纳税证明", "资格条件", "季度材料"],
      permissions: "投标团队可引用",
      restricted: false,
      description: "用于依法缴纳税收相关资格条件，引用时根据采购文件选择对应月份或季度材料。"
    },
    {
      id: "KB-COMP-015",
      name: "社会保障资金缴纳证明（2026 年第二季度）",
      category: "company",
      categoryLabel: "企业基础资料",
      type: "信用税务",
      summary: "企业社保缴纳凭证，不包含人员明细",
      scope: "资格审查与政府采购项目",
      maintenance: "待完善",
      maintenanceTone: "orange",
      validity: "update",
      validityLabel: "待补 6 月凭证",
      validityTone: "orange",
      dateRange: "计划完成 2026-07-31",
      references: 0,
      updatedAt: "2026-07-13",
      version: "草稿 V1.0",
      owner: "人力资源部",
      file: "社会保障资金缴纳证明_2026Q2.zip",
      tags: ["社保缴纳", "资格条件", "待完善"],
      permissions: "材料补充完成后投标团队可引用，不展示人员明细",
      restricted: true,
      description: "当前材料缺少 2026 年 6 月缴纳凭证，请补充真实附件后再使用。"
    },
    {
      id: "KB-COMP-018",
      name: "企业组织架构与服务能力简介",
      category: "company",
      categoryLabel: "企业基础资料",
      type: "企业介绍",
      summary: "部门职责、技术团队与服务支撑体系",
      scope: "技术方案、项目组织与服务保障章节",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "valid",
      validityLabel: "当前可用",
      validityTone: "green",
      dateRange: "最近更新 2026-06-28",
      references: 3,
      updatedAt: "2026-06-28",
      version: "V2.6",
      owner: "综合管理部",
      file: "企业组织架构与服务能力简介.docx",
      tags: ["组织架构", "服务体系", "团队能力"],
      permissions: "投标团队可编辑引用，项目人员配置需单独核验",
      restricted: false,
      description: "提供企业级组织和服务能力说明，不替代具体投标项目的人员名单与履历材料。"
    }
  ];

  const peopleRecords = [
    {
      id: "KB-PEO-038",
      name: "王磊",
      category: "people",
      categoryLabel: "人员档案",
      type: "项目经理",
      summary: "高级项目管理人员 · 12 年信息化项目经验",
      materialSummary: "职称材料已提供，近三个月社保证明待补",
      scope: "信息系统建设与运维项目",
      maintenance: "待完善",
      maintenanceTone: "orange",
      validity: "incomplete",
      validityLabel: "材料待补",
      validityTone: "orange",
      dateRange: "计划完成 2026-07-31",
      references: 0,
      updatedAt: "2026-07-13",
      version: "草稿 V1.0",
      owner: "人力资源部",
      file: "王磊_人员履历与证明材料.zip",
      tags: ["项目经理", "高级职称", "社保待补"],
      permissions: "仅人力资源、商务负责人和获授权的项目负责人可查看",
      description: "拟用于项目人员评分，但当前缺少可核验的近三个月社保证明，请补充后再使用。"
    },
    {
      id: "KB-PEO-012",
      name: "陈静",
      category: "people",
      categoryLabel: "人员档案",
      type: "技术负责人",
      summary: "高级解决方案架构师 · 14 年系统建设经验",
      materialSummary: "高级职称、架构能力证明与项目经历完整",
      scope: "大型信息化建设、平台架构与集成项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "ready",
      validityLabel: "可参与匹配",
      validityTone: "green",
      dateRange: "最近更新 2026-06-25",
      references: 4,
      updatedAt: "2026-06-25",
      version: "V3.1",
      owner: "人力资源部",
      file: "陈静_技术负责人档案.zip",
      tags: ["技术负责人", "高级职称", "解决方案架构"],
      permissions: "投标团队可引用简历，个人证件仅授权角色可查看",
      description: "人员履历、职称和同类项目经历已完成核验，可用于满足角色要求相符的投标项目。"
    },
    {
      id: "KB-PEO-026",
      name: "李峰",
      category: "people",
      categoryLabel: "人员档案",
      type: "安全工程师",
      summary: "信息安全工程师 · 安全运维与整改经验",
      materialSummary: "注册信息安全专业人员证书将在 45 天后到期",
      scope: "网络安全、等保整改与安全运维项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "expiring",
      validityLabel: "证书 45 天后到期",
      validityTone: "orange",
      dateRange: "证书有效期至 2026-08-28",
      references: 1,
      updatedAt: "2026-07-09",
      version: "V2.0",
      owner: "人力资源部",
      file: "李峰_安全工程师档案.zip",
      tags: ["安全工程师", "安全运维", "证书临期"],
      permissions: "投标团队可引用简历，个人证件仅授权角色可查看",
      description: "当前证书仍在有效期内，换证后需要同步替换人员档案证书，并提醒正在引用的项目重新核对。"
    },
    {
      id: "KB-PEO-045",
      name: "周航",
      category: "people",
      categoryLabel: "人员档案",
      type: "运维负责人",
      summary: "高级运维工程师 · 10 年平台运维经验",
      materialSummary: "职称、服务管理能力与同类项目经历完整",
      scope: "信息系统运行维护与服务管理项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "ready",
      validityLabel: "可参与匹配",
      validityTone: "green",
      dateRange: "最近更新 2026-06-18",
      references: 3,
      updatedAt: "2026-06-18",
      version: "V2.4",
      owner: "人力资源部",
      file: "周航_运维负责人档案.zip",
      tags: ["运维负责人", "高级工程师", "服务管理"],
      permissions: "投标团队可引用简历，联系方式不进入标书草稿",
      description: "覆盖运维组织、服务管理、应急响应和持续改进等项目经历，适用于运维负责人角色。"
    },
    {
      id: "KB-PEO-051",
      name: "赵敏",
      category: "people",
      categoryLabel: "人员档案",
      type: "实施经理",
      summary: "项目实施经理 · 9 年交付与项目管理经验",
      materialSummary: "项目管理专业资格将在 53 天后到期",
      scope: "软件实施、系统集成与交付管理项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "expiring",
      validityLabel: "证书 53 天后到期",
      validityTone: "orange",
      dateRange: "证书有效期至 2026-09-05",
      references: 2,
      updatedAt: "2026-07-10",
      version: "V1.8",
      owner: "人力资源部",
      file: "赵敏_实施经理档案.zip",
      tags: ["实施经理", "交付管理", "证书临期"],
      permissions: "投标团队可引用简历，个人证件仅授权角色可查看",
      description: "项目管理和交付经历已核验，证书续期完成后需通过编辑替换当前证书文件。"
    },
    {
      id: "KB-PEO-063",
      name: "刘洋",
      category: "people",
      categoryLabel: "人员档案",
      type: "网络工程师",
      summary: "网络技术工程师 · 数据中心与网络保障经验",
      materialSummary: "职称、网络技术能力与项目经历完整",
      scope: "网络建设、数据中心与基础设施运维项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "ready",
      validityLabel: "可参与匹配",
      validityTone: "green",
      dateRange: "最近更新 2026-05-30",
      references: 2,
      updatedAt: "2026-05-30",
      version: "V2.2",
      owner: "人力资源部",
      file: "刘洋_网络工程师档案.zip",
      tags: ["网络工程师", "数据中心", "基础设施"],
      permissions: "投标团队可引用简历，联系方式不进入标书草稿",
      description: "具备网络规划、设备配置和运行保障相关经历，可用于网络与基础设施技术岗位响应。"
    },
    {
      id: "KB-PEO-077",
      name: "孙悦",
      category: "people",
      categoryLabel: "人员档案",
      type: "商务负责人",
      summary: "投标商务经理 · 8 年商务与合同管理经验",
      materialSummary: "履历、劳动关系与项目经历已核验",
      scope: "商务响应、合同管理与投标组织",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "ready",
      validityLabel: "可参与匹配",
      validityTone: "green",
      dateRange: "最近更新 2026-06-12",
      references: 2,
      updatedAt: "2026-06-12",
      version: "V1.6",
      owner: "人力资源部",
      file: "孙悦_商务负责人档案.zip",
      tags: ["商务负责人", "合同管理", "投标组织"],
      permissions: "投标团队可引用简历，个人证件仅授权角色可查看",
      description: "适用于商务标组织、合同管理和项目商务负责人角色，不作为专业技术岗位能力证明。"
    },
    {
      id: "KB-PEO-091",
      name: "郑凯",
      category: "people",
      categoryLabel: "人员档案",
      type: "开发运维工程师",
      summary: "DevOps 工程师 · 自动化发布与平台运维经验",
      materialSummary: "技术能力、劳动关系与项目经历完整",
      scope: "持续集成、自动化发布与平台运维项目",
      maintenance: "资料完整",
      maintenanceTone: "green",
      validity: "ready",
      validityLabel: "可参与匹配",
      validityTone: "green",
      dateRange: "最近更新 2026-06-08",
      references: 1,
      updatedAt: "2026-06-08",
      version: "V1.4",
      owner: "人力资源部",
      file: "郑凯_开发运维工程师档案.zip",
      tags: ["DevOps", "自动化发布", "平台运维"],
      permissions: "投标团队可引用简历，联系方式不进入标书草稿",
      description: "覆盖持续集成、自动化部署、监控和故障处理经历，可用于 DevOps 与平台运维岗位响应。"
    }
  ];

  const peopleProfiles = peopleRecords.map(function (person, index) {
    const departments = {
      "项目经理": ["项目交付部", "高级项目经理"],
      "技术负责人": ["解决方案中心", "高级解决方案架构师"],
      "安全工程师": ["质量与安全部", "信息安全工程师"],
      "运维负责人": ["运维服务部", "高级运维工程师"],
      "实施经理": ["项目交付部", "实施经理"],
      "网络工程师": ["基础设施部", "网络工程师"],
      "商务负责人": ["商务管理部", "商务经理"],
      "开发运维工程师": ["研发中心", "DevOps 工程师"]
    };
    const department = departments[person.type] || ["项目交付部", person.type];
    const base = {
      id: person.id,
      name: person.name,
      department: department[0],
      position: department[1],
      bidRole: person.type,
      education: index % 3 === 0 ? "本科" : "硕士",
      years: 8 + (index % 7),
      phone: "138****" + String(5600 + index * 37),
      email: "person" + String(index + 1).padStart(2, "0") + "@example.com",
      coreAbilities: person.tags || [],
      certificates: [{ name: "专业能力证明", type: "岗位能力", number: "CERT-" + person.id.slice(-3), issuer: "内部能力评审委员会", issueDate: "2024-06-18", endDate: "", status: "已核验", tone: "green", file: person.name + "_专业能力证明.pdf" }],
      experiences: [{ project: "企业信息化平台建设项目", role: person.type, period: "2023-03 至 2024-08", content: "负责项目相关专业工作及交付协同", proof: "项目经历已核验" }],
      materials: [
        { name: "个人简历", type: "履历材料", period: "当前版本", status: "已完善", tone: "green" },
        { name: "劳动关系证明", type: "关系证明", period: "最近更新 2026-06", status: "已核验", tone: "green" }
      ],
      referencesList: person.references ? [{ project: "信息化运维服务项目", role: person.type, section: "商务标 / 项目团队", status: "已引用", date: "2026-06-28" }] : []
    };
    const overrides = {
      "KB-PEO-038": {
        department: "项目交付部", position: "高级项目经理", education: "本科", years: 12,
        certificates: [
          { name: "高级工程师职称证书", type: "职称证书", number: "GD-GJ-20******38", issuer: "省人力资源主管部门", issueDate: "2021-11-12", endDate: "", status: "已核验", tone: "green", file: "王磊_高级工程师职称证书.pdf" }
        ],
        experiences: [
          { project: "城市运行管理平台建设项目", role: "项目经理", period: "2022-04 至 2024-01", content: "负责计划、协调、交付与验收管理", proof: "合同及验收材料已关联" },
          { project: "公共服务数据平台运维项目", role: "项目经理", period: "2020-02 至 2022-03", content: "负责运维组织和服务质量管理", proof: "项目证明已关联" }
        ],
        materials: [
          { name: "个人简历", type: "履历材料", period: "当前版本 V1.0", status: "已完善", tone: "green" },
          { name: "学历证明", type: "教育证明", period: "长期保留", status: "已核验", tone: "green" },
          { name: "近三个月社保证明", type: "劳动关系证明", period: "需覆盖 2026-05 至 2026-07", status: "待补充", tone: "orange" }
        ],
        referencesList: []
      },
      "KB-PEO-012": {
        department: "解决方案中心", position: "高级解决方案架构师", education: "硕士", years: 14,
        certificates: [
          { name: "高级工程师职称证书", type: "职称证书", number: "GD-GJ-20******12", issuer: "省人力资源主管部门", issueDate: "2019-08-16", endDate: "", status: "已核验", tone: "green", file: "陈静_高级工程师职称证书.pdf" },
          { name: "系统架构设计师证书", type: "专业资格", number: "ARCH-20******12", issuer: "专业技术资格认证机构", issueDate: "2020-11-08", endDate: "", status: "已核验", tone: "green", file: "陈静_系统架构设计师证书.pdf" }
        ]
      },
      "KB-PEO-026": {
        department: "质量与安全部", position: "信息安全工程师", education: "本科", years: 9,
        certificates: [
          { name: "注册信息安全专业人员证书", type: "专业资格", number: "CISP-20******26", issuer: "信息安全测评机构", issueDate: "2023-08-29", endDate: "2026-08-28", status: "45 天后到期", tone: "orange", file: "李峰_CISP证书.pdf" }
        ]
      },
      "KB-PEO-051": {
        department: "项目交付部", position: "实施经理", education: "本科", years: 9,
        certificates: [
          { name: "项目管理专业人员资格证书", type: "项目管理资格", number: "PMP-20******51", issuer: "项目管理认证机构", issueDate: "2023-09-06", endDate: "2026-09-05", status: "53 天后到期", tone: "orange", file: "赵敏_项目管理资格证书.pdf" }
        ]
      }
    };
    return Object.assign(base, overrides[person.id] || {});
  });

  peopleProfiles.forEach(function (profile, profileIndex) {
    (profile.certificates || []).forEach(function (item, index) {
      item.id = item.id || profile.id + "-CERT-" + String(index + 1).padStart(2, "0");
      item.category = "people-record";
      item.recordType = "certificate";
      item.lifecycleState = item.lifecycleState || "active";
      item.file = item.file || profile.name + "_" + item.name + ".pdf";
    });
    (profile.experiences || []).forEach(function (item, index) {
      item.id = item.id || profile.id + "-EXP-" + String(index + 1).padStart(2, "0");
      item.category = "people-record";
      item.recordType = "experience";
      item.lifecycleState = item.lifecycleState || "active";
      item.name = item.name || item.project + "项目经历证明";
      item.file = item.file || profile.name + "_" + item.project + "项目经历证明.pdf";
    });
    (profile.materials || []).forEach(function (item, index) {
      item.id = item.id || profile.id + "-MAT-" + String(index + 1).padStart(2, "0");
      item.category = "people-record";
      item.recordType = "material";
      item.lifecycleState = item.lifecycleState || "active";
      item.file = item.file || profile.name + "_" + item.name + (/简历/.test(item.name) ? ".docx" : ".pdf");
    });
    if (profileIndex === 0) {
      profile.certificates.push({ id: profile.id + "-CERT-ARCH-01", category: "people-record", recordType: "certificate", lifecycleState: "archived", name: "项目管理继续教育证明（旧版）", type: "继续教育证明", number: "PM-OLD-2023-038", issuer: "项目管理专业机构", issueDate: "2023-06-15", endDate: "2025-06-14", file: profile.name + "_项目管理继续教育证明_旧版.pdf", archivedAt: "2026-06-20", archivedBy: "李明远", content: "已由当前有效的专业能力证明替代" });
      profile.experiences.push({ id: profile.id + "-EXP-ARCH-01", category: "people-record", recordType: "experience", lifecycleState: "archived", name: "政务服务平台升级项目经历证明（旧版）", project: "政务服务平台升级项目", role: "项目经理", period: "2019-05 至 2020-12", content: "早期版本仅保留项目名称，已由完整证明材料替代", proof: "旧版项目证明", file: profile.name + "_政务服务平台升级项目经历证明_旧版.pdf", archivedAt: "2026-05-18", archivedBy: "李明远" });
      profile.materials.push({ id: profile.id + "-MAT-ARCH-01", category: "people-record", recordType: "material", lifecycleState: "archived", name: "2025年度劳动关系证明", type: "劳动关系证明", period: "覆盖 2025 年度", status: "历史材料", tone: "gray", file: profile.name + "_2025年度劳动关系证明.pdf", archivedAt: "2026-04-12", archivedBy: "李明远" });
    }
  });

  function catalogRecord(category, categoryLabel, values) {
    return Object.assign({
      category: category,
      categoryLabel: categoryLabel,
      maintenance: "资料完整",
      maintenanceTone: "green",
      version: "V1.0",
      references: 0
    }, values);
  }

  const caseRecords = [
    catalogRecord("cases", "业绩案例", {
      id: "KB-CASE-021", name: "港口集装箱业务平台运维项目", type: "信息系统运维",
      summary: "覆盖集装箱业务平台、接口与基础设施运维", scope: "港航物流、平台运维项目",
      statusKey: "verified", validityLabel: "证据完整", validityTone: "green", dateRange: "履约期 2023-2025",
      references: 3, updatedAt: "2026-07-08", version: "V2.0", owner: "解决方案中心",
      file: "港口平台运维_合同与验收证明包.zip", tags: ["港航物流", "运维服务", "合同与验收"],
      permissions: "投标团队可引用",
      description: "包含合同关键页、验收证明和项目说明，可用于同类信息系统运维业绩评分。"
    }),
    catalogRecord("cases", "业绩案例", {
      id: "KB-CASE-033", name: "智慧园区数字化运营平台项目", type: "数字化运营",
      summary: "园区运营、物联感知与综合管理平台建设", scope: "智慧园区、数字化运营项目",
      statusKey: "verified", validityLabel: "证据完整", validityTone: "green", dateRange: "履约期 2024-2025",
      references: 2, updatedAt: "2026-06-24", version: "V1.6", owner: "解决方案中心",
      file: "智慧园区数字化运营_业绩证明包.zip", tags: ["智慧园区", "数字化运营", "平台建设"],
      permissions: "投标团队可引用",
      description: "覆盖园区运营、设备接入和综合管理能力，可用于智慧园区同类业绩响应。"
    }),
    catalogRecord("cases", "业绩案例", {
      id: "KB-CASE-041", name: "应急指挥中心系统集成项目", type: "系统集成",
      summary: "指挥调度、视频会商与多系统集成", scope: "应急指挥、综合集成项目",
      statusKey: "incomplete", validityLabel: "验收材料待补", validityTone: "orange", dateRange: "计划补充 2026-07-25",
      maintenance: "待完善", maintenanceTone: "orange", updatedAt: "2026-07-12", owner: "项目交付部",
      file: "应急指挥中心_合同关键页.pdf", tags: ["应急指挥", "系统集成", "验收待补"],
      permissions: "证据补齐后可参与项目匹配",
      description: "当前仅有合同关键页，缺少可核验的验收证明，不能作为完整业绩证据使用。"
    }),
    catalogRecord("cases", "业绩案例", {
      id: "KB-CASE-052", name: "政务云平台运行维护服务项目", type: "云平台运维",
      summary: "云资源、监控、备份和服务管理体系运维", scope: "政务云、私有云与平台运维项目",
      statusKey: "verified", validityLabel: "证据完整", validityTone: "green", dateRange: "履约期 2022-2024",
      references: 1, updatedAt: "2026-05-28", version: "V1.4", owner: "解决方案中心",
      file: "政务云平台运维_业绩证明包.zip", tags: ["政务云", "平台运维", "服务管理"],
      permissions: "投标团队可引用",
      description: "可用于云平台运行维护、监控和服务管理相关业绩评分。"
    }),
    catalogRecord("cases", "业绩案例", {
      id: "KB-CASE-067", name: "企业数据中台建设项目", type: "软件开发",
      summary: "数据治理、指标平台与数据服务能力建设", scope: "数据平台、数据治理项目",
      statusKey: "restricted", validityLabel: "受限资料", validityTone: "blue", dateRange: "归档日期 2025-09-16",
      updatedAt: "2026-04-19", owner: "解决方案中心",
      file: "企业数据中台案例说明.pdf", tags: ["数据中台", "数据治理", "受限复用"],
      permissions: "仅可引用案例摘要，原始合同和技术参数禁止外传",
      description: "受客户保密约束，仅允许引用行业、建设内容和项目成果。"
    }),
    catalogRecord("cases", "业绩案例", {
      id: "KB-CASE-074", name: "关键信息系统安全运维服务项目", type: "安全服务",
      summary: "安全监测、漏洞处置与应急响应服务", scope: "安全运维、等级保护相关项目",
      statusKey: "incomplete", validityLabel: "客户证明待核验", validityTone: "orange", dateRange: "计划补充 2026-07-29",
      maintenance: "待完善", maintenanceTone: "orange", updatedAt: "2026-07-10", owner: "质量与安全部",
      file: "安全运维项目_合同关键页.pdf", tags: ["安全运维", "漏洞处置", "证明待核验"],
      permissions: "证明材料完成核验前不可参与项目智能匹配",
      description: "服务内容可复用，但客户履约证明尚未完成核验，暂不作为评分证据。"
    })
  ];

  const solutionRecords = [
    catalogRecord("solutions", "产品与技术方案", {
      id: "KB-SOL-064", name: "信息系统日常运维与应急保障方案", type: "运维服务",
      summary: "巡检、发布、测试、故障应急和服务报告", scope: "信息系统运维项目",
      statusKey: "reusable", validityLabel: "可复用", validityTone: "green", dateRange: "最近更新 2026-07-06",
      references: 4, updatedAt: "2026-07-06", version: "V3.4", owner: "解决方案中心",
      file: "信息系统运维与应急保障方案.docx", tags: ["巡检", "应急", "服务报告"],
      permissions: "投标团队可编辑引用，量化指标需按项目确认",
      description: "方案结构完整，引用时必须按招标要求校准服务范围、响应时效和交付物。"
    }),
    catalogRecord("solutions", "产品与技术方案", {
      id: "KB-SOL-081", name: "组件漏洞升级与验证处置方案", type: "安全整改",
      summary: "漏洞去重、升级评估、实施和回归验证", scope: "软件安全整改与运维项目",
      statusKey: "reusable", validityLabel: "可复用", validityTone: "green", dateRange: "最近更新 2026-07-04",
      references: 2, updatedAt: "2026-07-04", version: "V2.2", owner: "质量与安全部",
      file: "组件漏洞升级与验证处置方案.docx", tags: ["漏洞整改", "组件升级", "验证闭环"],
      permissions: "投标团队可引用，具体组件版本必须基于项目现状确认",
      description: "覆盖漏洞识别、影响评估、升级实施和验证闭环，不预设项目未提供的技术版本。"
    }),
    catalogRecord("solutions", "产品与技术方案", {
      id: "KB-SOL-099", name: "两地三中心容灾与备份方案", type: "容灾备份",
      summary: "容灾架构、备份策略、演练和恢复验证", scope: "高可用、业务连续性项目",
      statusKey: "incomplete", validityLabel: "架构待完善", validityTone: "orange", dateRange: "计划完成 2026-07-26",
      maintenance: "待完善", maintenanceTone: "orange", updatedAt: "2026-07-11", owner: "解决方案中心",
      file: "两地三中心容灾与备份方案.docx", tags: ["容灾", "备份", "业务连续性"],
      permissions: "关键参数补充完成后可引用，RPO/RTO 指标必须人工确认",
      description: "架构逻辑已完成，量化恢复指标和资源规模仍需补充。"
    }),
    catalogRecord("solutions", "产品与技术方案", {
      id: "KB-SOL-112", name: "业务系统数据迁移实施方案", type: "数据迁移",
      summary: "数据盘点、迁移、校验、切换和回退", scope: "系统替换、平台升级项目",
      statusKey: "reusable", validityLabel: "可复用", validityTone: "green", dateRange: "最近更新 2026-06-15",
      references: 1, updatedAt: "2026-06-15", version: "V2.0", owner: "项目交付部",
      file: "业务系统数据迁移实施方案.docx", tags: ["数据迁移", "切换", "回退"],
      permissions: "投标团队可引用，数据量和停机窗口需按项目确认",
      description: "提供迁移实施方法和质量控制步骤，不包含未经项目确认的数据规模。"
    }),
    catalogRecord("solutions", "产品与技术方案", {
      id: "KB-SOL-137", name: "信息系统安全保障总体方案", type: "安全保障",
      summary: "安全治理、技术防护、监测和应急体系", scope: "信息化建设与安全服务项目",
      statusKey: "incomplete", validityLabel: "规则待完善", validityTone: "orange", dateRange: "计划完成 2026-07-30",
      maintenance: "待完善", maintenanceTone: "orange", updatedAt: "2026-07-12", owner: "质量与安全部",
      file: "信息系统安全保障总体方案.docx", tags: ["安全治理", "监测", "应急"],
      permissions: "最新合规规则补充完成后可参与匹配",
      description: "正在同步最新安全规则，内容完善前保留为草稿，不直接写入正式技术标。"
    }),
    catalogRecord("solutions", "产品与技术方案", {
      id: "KB-SOL-158", name: "故障分级与应急响应方案", type: "应急响应",
      summary: "P1-P4 故障分级、升级与处置流程", scope: "运维服务与售后保障项目",
      statusKey: "conflict", validityLabel: "参数冲突", validityTone: "red", dateRange: "响应时效需按项目校准",
      references: 0, updatedAt: "2026-07-13", version: "V1.9", owner: "解决方案中心",
      file: "故障分级与应急响应方案.docx", tags: ["P1-P4", "应急响应", "参数冲突"],
      permissions: "人工确认服务时效后方可引用",
      description: "通用模板未完整覆盖当前项目要求的 15 分钟、30 分钟、1 小时和 2 小时响应时效。"
    })
  ];

  const businessRecords = [
    catalogRecord("business", "商务素材", {
      id: "KB-BUS-009", name: "7×24 售后服务与故障响应承诺", type: "售后承诺",
      summary: "服务窗口、故障分级、到场和恢复承诺", scope: "运维服务类项目",
      statusKey: "conflict", validityLabel: "参数冲突", validityTone: "red", dateRange: "P1-P4 时效未统一",
      updatedAt: "2026-07-12", version: "草稿 V1.6", owner: "商务管理部",
      file: "售后服务与故障响应承诺.docx", tags: ["7×24", "故障响应", "人工确认"],
      permissions: "量化承诺经项目负责人确认后方可引用",
      description: "模板参数与当前采购要求存在差异，不允许在未确认时自动写入正式承诺函。"
    }),
    catalogRecord("business", "商务素材", {
      id: "KB-BUS-003", name: "项目保密与信息安全承诺", type: "保密承诺",
      summary: "人员保密、数据保护和资料归还要求", scope: "涉及敏感数据与系统访问的项目",
      statusKey: "complete", validityLabel: "内容完整", validityTone: "green", dateRange: "最近更新 2026-06-22",
      references: 3, updatedAt: "2026-06-22", version: "V2.1", owner: "法务与合规部",
      file: "项目保密与信息安全承诺.docx", tags: ["保密", "数据安全", "合规"],
      permissions: "投标团队可引用，违约责任需按项目合同确认",
      description: "适用于保密、数据保护和人员管理要求，项目特定违约条款必须人工确认。"
    }),
    catalogRecord("business", "商务素材", {
      id: "KB-BUS-005", name: "廉洁投标与反商业贿赂承诺", type: "廉洁承诺",
      summary: "廉洁投标、利益冲突和反商业贿赂声明", scope: "政府采购与国企采购项目",
      statusKey: "complete", validityLabel: "内容完整", validityTone: "green", dateRange: "最近更新 2026-05-18",
      references: 2, updatedAt: "2026-05-18", owner: "法务与合规部",
      file: "廉洁投标与反商业贿赂承诺.docx", tags: ["廉洁投标", "反商业贿赂", "合规"],
      permissions: "投标团队可引用，签署主体需按项目确认",
      description: "提供统一廉洁声明口径，正式签署主体和日期必须由授权人员确认。"
    }),
    catalogRecord("business", "商务素材", {
      id: "KB-BUS-007", name: "项目售后服务保障承诺", type: "售后承诺",
      summary: "服务组织、响应渠道和持续保障机制", scope: "软件建设与运维项目",
      statusKey: "confirm", validityLabel: "量化指标待确认", validityTone: "orange", dateRange: "服务期限与到场时效待填",
      maintenance: "待完善", maintenanceTone: "orange", updatedAt: "2026-07-09", owner: "商务管理部",
      file: "项目售后服务保障承诺.docx", tags: ["售后服务", "响应渠道", "待确认"],
      permissions: "服务期限、到场时效和赔偿承诺必须人工确认",
      description: "通用保障结构可复用，但所有量化承诺必须根据资源能力和采购要求确认。"
    }),
    catalogRecord("business", "商务素材", {
      id: "KB-BUS-011", name: "合同履约与项目交付承诺", type: "履约承诺",
      summary: "进度、质量、交付物和验收配合承诺", scope: "建设、实施与交付类项目",
      statusKey: "complete", validityLabel: "内容完整", validityTone: "green", dateRange: "最近更新 2026-06-10",
      references: 2, updatedAt: "2026-06-10", version: "V1.5", owner: "项目交付部",
      file: "合同履约与项目交付承诺.docx", tags: ["合同履约", "交付", "验收"],
      permissions: "投标团队可引用，具体交付期限按项目计划确认",
      description: "覆盖进度、质量和验收配合，不预设未经确认的交付日期。"
    }),
    catalogRecord("business", "商务素材", {
      id: "KB-BUS-013", name: "数据安全与合规使用承诺", type: "数据合规",
      summary: "数据访问、使用、留存和销毁边界", scope: "涉及个人信息和业务数据的项目",
      statusKey: "confirm", validityLabel: "责任边界待确认", validityTone: "orange", dateRange: "需结合法务条款确认",
      maintenance: "待完善", maintenanceTone: "orange", updatedAt: "2026-07-11", owner: "法务与合规部",
      file: "数据安全与合规使用承诺.docx", tags: ["数据安全", "个人信息", "责任边界"],
      permissions: "法务确认责任边界后方可引用",
      description: "提供数据处理基本承诺，具体数据范围、留存周期和违约责任需结合项目条款确认。"
    })
  ];

  const templateRecords = [
    catalogRecord("templates", "模板与格式", { id: "KB-TPL-004", name: "技术偏离表标准模板", type: "偏离表", summary: "技术要求、响应参数、证明材料与偏离说明", scope: "技术标响应", statusKey: "current", validityLabel: "当前版本", validityTone: "green", dateRange: "模板版本 V3.2", references: 5, updatedAt: "2026-06-30", version: "V3.2", owner: "投标管理部", file: "技术偏离表标准模板_V3.2.docx", tags: ["技术偏离", "人工确认", "标准格式"], permissions: "投标团队可引用，正式偏离结论必须人工确认", description: "用于整理技术要求和响应情况，表格结构与当前输出规范一致。" }),
    catalogRecord("templates", "模板与格式", { id: "KB-TPL-002", name: "商务偏离表标准模板", type: "偏离表", summary: "商务条款、响应内容和偏离结论", scope: "商务标响应", statusKey: "current", validityLabel: "当前版本", validityTone: "green", dateRange: "模板版本 V2.8", references: 4, updatedAt: "2026-06-28", version: "V2.8", owner: "投标管理部", file: "商务偏离表标准模板_V2.8.docx", tags: ["商务偏离", "人工确认"], permissions: "投标团队可引用，关键商务偏离必须人工确认", description: "用于商务条款逐项响应，不允许自动确认价格、付款或违约责任。" }),
    catalogRecord("templates", "模板与格式", { id: "KB-TPL-003", name: "项目人员简历模板", type: "人员模板", summary: "岗位、履历、证书和项目经历标准结构", scope: "商务标人员材料", statusKey: "current", validityLabel: "当前版本", validityTone: "green", dateRange: "模板版本 V2.1", references: 3, updatedAt: "2026-06-18", version: "V2.1", owner: "投标管理部", file: "项目人员简历模板_V2.1.docx", tags: ["人员简历", "证书", "项目经历"], permissions: "仅填充资料完整的人员档案信息", description: "统一人员简历结构，缺失证书或经历字段保持待补充，不自动编造。" }),
    catalogRecord("templates", "模板与格式", { id: "KB-TPL-005", name: "投标承诺函通用模板", type: "承诺函", summary: "主体声明、合规承诺与授权签署区", scope: "商务标承诺材料", statusKey: "incomplete", validityLabel: "条款待完善", validityTone: "orange", dateRange: "计划完成 2026-07-24", maintenance: "待完善", maintenanceTone: "orange", updatedAt: "2026-07-10", version: "草稿 V1.9", owner: "法务与合规部", file: "投标承诺函通用模板.docx", tags: ["承诺函", "条款待完善"], permissions: "条款补充确认后可引用", description: "通用承诺与项目特定条款的边界仍需补充确认，当前不参与自动匹配。" }),
    catalogRecord("templates", "模板与格式", { id: "KB-TPL-006", name: "投标文件封面与目录模板", type: "封面目录", summary: "封面信息、目录层级和页码格式", scope: "技术标与商务标汇编", statusKey: "current", validityLabel: "当前版本", validityTone: "green", dateRange: "模板版本 V3.0", references: 5, updatedAt: "2026-06-27", version: "V3.0", owner: "投标管理部", file: "投标文件封面与目录模板_V3.0.docx", tags: ["封面", "目录", "页码"], permissions: "投标团队可引用，采购文件指定格式优先", description: "作为无指定格式时的默认模板，存在采购文件模板时必须以采购文件为准。" }),
    catalogRecord("templates", "模板与格式", { id: "KB-TPL-007", name: "投标函标准模板", type: "投标函", summary: "项目名称、报价引用、有效期和签署区", scope: "商务标投标函", statusKey: "current", validityLabel: "当前版本", validityTone: "green", dateRange: "模板版本 V2.4", references: 4, updatedAt: "2026-06-23", version: "V2.4", owner: "投标管理部", file: "投标函标准模板_V2.4.docx", tags: ["投标函", "有效期", "授权签署"], permissions: "报价和有效期必须人工确认", description: "提供标准结构，不自动填充报价、投标有效期和授权签署信息。" }),
    catalogRecord("templates", "模板与格式", { id: "KB-TPL-001", name: "旧版报价明细表模板", type: "报价表", summary: "历史报价科目与税率结构", scope: "仅供历史项目追溯", statusKey: "deprecated", validityLabel: "已停用", validityTone: "gray", dateRange: "停用于 2026-05-01", updatedAt: "2026-05-01", version: "V1.7", owner: "商务管理部", file: "旧版报价明细表模板_V1.7.xlsx", tags: ["报价表", "历史版本", "已停用"], permissions: "禁止用于新项目，仅允许查看历史引用", description: "税率和费用结构已不适用于当前项目，保留用于历史交付版本追溯。" }),
    catalogRecord("templates", "模板与格式", { id: "KB-TPL-008", name: "资格证明材料核验清单", type: "核验清单", summary: "资格条件、证明材料和人工核验记录", scope: "资格审查与交付终审", statusKey: "current", validityLabel: "当前版本", validityTone: "green", dateRange: "模板版本 V1.3", references: 3, updatedAt: "2026-07-02", version: "V1.3", owner: "质量管理部", file: "资格证明材料核验清单_V1.3.xlsx", tags: ["资格审查", "证明材料", "核验"], permissions: "投标团队可引用，核验结论由授权人员确认", description: "用于区分资格硬门槛与评分材料，不将评分缺口误判为资格阻断。" })
  ];

  const chartRecords = [
    catalogRecord("charts", "图表素材", { id: "KB-CHART-002", name: "运维服务体系架构图", type: "架构图", summary: "服务管理、监控预警、应急和持续改进关系", scope: "运维方案与服务体系章节", statusKey: "complete", validityLabel: "文件完整", validityTone: "green", dateRange: "画布 1600×900", references: 2, updatedAt: "2026-06-21", version: "V2.3", owner: "解决方案中心", file: "运维服务体系架构图.svg", tags: ["运维体系", "架构图"], permissions: "投标团队可引用并按项目调整", description: "展示运维服务体系核心能力与协同关系，源文件支持编辑。" }),
    catalogRecord("charts", "图表素材", { id: "KB-CHART-003", name: "P1-P4 故障应急处置流程图", type: "流程图", summary: "告警、分级、升级、处置与关闭流程", scope: "应急响应和售后服务章节", statusKey: "complete", validityLabel: "文件完整", validityTone: "green", dateRange: "画布 1920×1080", references: 3, updatedAt: "2026-07-01", version: "V1.8", owner: "解决方案中心", file: "P1-P4故障应急处置流程图.svg", tags: ["应急响应", "P1-P4", "流程图"], permissions: "流程可引用，响应时效必须按项目确认", description: "提供故障处置流程，不固化项目未确认的量化响应时效。" }),
    catalogRecord("charts", "图表素材", { id: "KB-CHART-004", name: "平台网络与安全域拓扑图", type: "拓扑图", summary: "接入区、应用区、数据区与安全边界", scope: "总体架构与安全设计章节", statusKey: "incomplete", validityLabel: "架构待完善", validityTone: "orange", dateRange: "计划完成 2026-07-27", maintenance: "待完善", maintenanceTone: "orange", updatedAt: "2026-07-12", owner: "解决方案中心", file: "平台网络与安全域拓扑图.svg", tags: ["网络拓扑", "安全域", "待完善"], permissions: "图表完善后可引用，地址与设备信息不得虚构", description: "通用分区结构已完成，需根据项目真实网络边界调整后使用。" }),
    catalogRecord("charts", "图表素材", { id: "KB-CHART-005", name: "项目实施组织架构图", type: "组织架构图", summary: "项目经理、技术、实施、质量和服务团队", scope: "项目组织与人员配置章节", statusKey: "complete", validityLabel: "文件完整", validityTone: "green", dateRange: "画布 1600×900", references: 2, updatedAt: "2026-06-16", version: "V2.0", owner: "项目交付部", file: "项目实施组织架构图.svg", tags: ["组织架构", "项目团队"], permissions: "结构可引用，具体人员必须关联资料完整的人员档案", description: "提供标准项目组织结构，不自动填充未经核验的人员姓名和角色。" }),
    catalogRecord("charts", "图表素材", { id: "KB-CHART-001", name: "DevOps 持续交付流程图", type: "流程图", summary: "开发、测试、发布、监控与反馈闭环", scope: "研发效能与上线管理章节", statusKey: "complete", validityLabel: "文件完整", validityTone: "green", dateRange: "画布 1920×1080", references: 1, updatedAt: "2026-05-29", version: "V1.7", owner: "研发中心", file: "DevOps持续交付流程图.svg", tags: ["DevOps", "持续交付", "流程图"], permissions: "投标团队可引用并按项目工具链调整", description: "展示持续交付标准流程，具体工具名称和自动化能力需基于项目实际情况。" })
  ];

  const historyRecords = [
    catalogRecord("history", "历史标书", { id: "KB-HIS-001", name: "港口平台运维项目投标文件", type: "运维服务", summary: "技术标、商务标和最终交付附件完整", scope: "同类港航物流运维项目参考", statusKey: "complete", validityLabel: "文件完整", validityTone: "green", dateRange: "投标日期 2025-12-18", references: 1, updatedAt: "2026-05-19", version: "归档 V1.0", owner: "投标管理部", file: "港口平台运维项目投标文件.zip", tags: ["历史标书", "港航物流", "运维服务"], permissions: "投标团队可查看，原始报价和客户信息禁止直接复用", description: "归档技术标、商务标和交付附件，用于查找同类项目的目录结构与内容表达。" }),
    catalogRecord("history", "历史标书", { id: "KB-HIS-002", name: "政务云运维服务项目投标文件", type: "云平台运维", summary: "技术方案、服务体系和商务响应文件完整", scope: "政务云、私有云运维项目参考", statusKey: "complete", validityLabel: "文件完整", validityTone: "green", dateRange: "投标日期 2025-08-26", references: 1, updatedAt: "2026-04-12", version: "归档 V1.0", owner: "投标管理部", file: "政务云运维项目投标文件.zip", tags: ["历史标书", "云平台", "服务管理"], permissions: "投标团队可查看，项目人员和报价禁止直接复制", description: "归档最终投标文件，可作为同类项目编制时的结构和内容参考。" }),
    catalogRecord("history", "历史标书", { id: "KB-HIS-003", name: "智慧园区平台建设项目投标文件", type: "数字化平台", summary: "技术标和商务标完整，原始报价文件受限", scope: "智慧园区与数字化平台项目参考", statusKey: "restricted", validityLabel: "受限资料", validityTone: "blue", dateRange: "投标日期 2025-10-09", updatedAt: "2026-03-28", version: "归档 V1.1", owner: "投标管理部", file: "智慧园区平台项目投标文件.zip", tags: ["历史标书", "智慧园区", "受限资料"], permissions: "投标团队可查看技术内容，报价与客户信息仅授权角色可查看", description: "归档历史投标文件，使用时需遵守文件权限和项目保密范围。" }),
    catalogRecord("history", "历史标书", { id: "KB-HIS-004", name: "应急指挥系统集成项目投标文件", type: "系统集成", summary: "技术标已归档，商务附件仍待补充", scope: "应急指挥和系统集成项目参考", statusKey: "incomplete", validityLabel: "附件待补", validityTone: "orange", dateRange: "投标日期 2026-01-23", maintenance: "待完善", maintenanceTone: "orange", updatedAt: "2026-07-09", version: "归档 V0.8", owner: "投标管理部", file: "应急指挥系统集成项目投标文件.zip", tags: ["历史标书", "系统集成", "附件待补"], permissions: "补齐附件后进入默认检索结果", description: "当前已归档技术标，授权文件和最终商务附件仍需补充。" })
  ];

  const certificates = [
    {
      id: "KB-CERT-006",
      name: "信息安全管理体系认证证书",
      standard: "ISO/IEC 27001",
      type: "体系认证",
      number: "ISC-27******86",
      issuer: "信息安全认证机构",
      startDate: "2023-08-29",
      endDate: "2026-08-28",
      validity: "expiring",
      validityLabel: "45 天后到期",
      validityTone: "orange",
      maintenance: "资料完整",
      maintenanceTone: "green",
      references: 2,
      version: "V1.3",
      updatedAt: "2026-07-09",
      owner: "质量与安全部",
      file: "ISO27001_认证证书.pdf",
      scope: "信息系统集成、软件开发与运维服务相关的信息安全管理活动",
      tags: ["ISO 27001", "信息安全", "临期"],
      permissions: "投标团队可引用",
      description: "证书临近有效期，请及时准备换证材料并通过编辑替换当前文件。"
    },
    {
      id: "KB-CERT-008",
      name: "信息技术服务管理体系认证证书",
      standard: "ISO/IEC 20000-1",
      type: "体系认证",
      number: "ITSM-20******31",
      issuer: "信息技术服务认证机构",
      startDate: "2023-09-06",
      endDate: "2026-09-05",
      validity: "expiring",
      validityLabel: "53 天后到期",
      validityTone: "orange",
      maintenance: "资料完整",
      maintenanceTone: "green",
      references: 1,
      version: "V1.1",
      updatedAt: "2026-07-10",
      owner: "质量与安全部",
      file: "ISO20000_认证证书.pdf",
      scope: "面向客户提供的信息技术运行维护服务管理体系",
      tags: ["ISO 20000", "IT 服务管理", "临期"],
      permissions: "投标团队可引用",
      description: "用于信息系统运维和服务管理类项目的企业能力证明。"
    },
    {
      id: "KB-CERT-011",
      name: "信息安全服务能力认证证书",
      standard: "安全运维三级",
      type: "行业资质",
      number: "CCRC-ISV-******19",
      issuer: "信息安全服务认证机构",
      startDate: "2023-09-11",
      endDate: "2026-09-10",
      validity: "expiring",
      validityLabel: "58 天后到期",
      validityTone: "orange",
      maintenance: "资料完整",
      maintenanceTone: "green",
      references: 0,
      version: "V1.0",
      updatedAt: "2026-07-10",
      owner: "质量与安全部",
      file: "信息安全服务能力认证.pdf",
      scope: "信息系统安全运维服务",
      tags: ["安全运维", "行业资质", "临期"],
      permissions: "投标团队可引用",
      description: "适用于包含安全运维要求的信息化项目，请在使用前核对有效期限。"
    },
    {
      id: "KB-CERT-003",
      name: "质量管理体系认证证书",
      standard: "ISO 9001",
      type: "体系认证",
      number: "QMS-90******57",
      issuer: "质量认证机构",
      startDate: "2024-05-19",
      endDate: "2027-05-18",
      validity: "valid",
      validityLabel: "有效",
      validityTone: "green",
      maintenance: "资料完整",
      maintenanceTone: "green",
      references: 4,
      version: "V1.2",
      updatedAt: "2026-06-26",
      owner: "质量与安全部",
      file: "ISO9001_认证证书.pdf",
      scope: "软件开发、系统集成与运行维护服务",
      tags: ["ISO 9001", "质量管理", "企业能力"],
      permissions: "投标团队可引用",
      description: "用于企业质量管理能力说明和相关商务评分响应。"
    },
    {
      id: "KB-CERT-015",
      name: "环境管理体系认证证书",
      standard: "ISO 14001",
      type: "体系认证",
      number: "EMS-14******24",
      issuer: "环境管理认证机构",
      startDate: "2025-03-13",
      endDate: "2028-03-12",
      validity: "valid",
      validityLabel: "有效",
      validityTone: "green",
      maintenance: "资料完整",
      maintenanceTone: "green",
      references: 1,
      version: "V1.0",
      updatedAt: "2026-04-18",
      owner: "质量与安全部",
      file: "ISO14001_认证证书.pdf",
      scope: "软件开发和信息技术服务相关的环境管理活动",
      tags: ["ISO 14001", "环境管理"],
      permissions: "投标团队可引用",
      description: "适用于明确要求环境管理体系证明的投标项目。"
    },
    {
      id: "KB-CERT-016",
      name: "职业健康安全管理体系认证证书",
      standard: "ISO 45001",
      type: "体系认证",
      number: "OHS-45******42",
      issuer: "职业健康安全认证机构",
      startDate: "2025-03-13",
      endDate: "2028-03-12",
      validity: "valid",
      validityLabel: "有效",
      validityTone: "green",
      maintenance: "资料完整",
      maintenanceTone: "green",
      references: 1,
      version: "V1.0",
      updatedAt: "2026-04-18",
      owner: "质量与安全部",
      file: "ISO45001_认证证书.pdf",
      scope: "软件开发和信息技术服务相关的职业健康安全管理活动",
      tags: ["ISO 45001", "职业健康安全"],
      permissions: "投标团队可引用",
      description: "适用于明确要求职业健康安全管理体系证明的投标项目。"
    },
    {
      id: "KB-CERT-021",
      name: "高新技术企业证书",
      standard: "国家高新技术企业",
      type: "企业认定",
      number: "GR20********31",
      issuer: "省级科技主管部门",
      startDate: "2025-12-03",
      endDate: "2028-12-02",
      validity: "valid",
      validityLabel: "有效",
      validityTone: "green",
      maintenance: "资料完整",
      maintenanceTone: "green",
      references: 3,
      version: "V1.0",
      updatedAt: "2026-01-09",
      owner: "综合管理部",
      file: "高新技术企业证书.pdf",
      scope: "企业科技创新能力与研发投入证明",
      tags: ["高新技术企业", "企业认定", "创新能力"],
      permissions: "投标团队可引用",
      description: "可用于企业创新能力和综合实力相关评分项。"
    },
    {
      id: "KB-CERT-024",
      name: "软件企业证书",
      standard: "软件企业评估",
      type: "企业认定",
      number: "RJQY-20******16",
      issuer: "软件行业协会",
      startDate: "2026-04-20",
      endDate: "2027-04-19",
      validity: "valid",
      validityLabel: "有效",
      validityTone: "green",
      maintenance: "资料完整",
      maintenanceTone: "green",
      references: 2,
      version: "V1.0",
      updatedAt: "2026-04-22",
      owner: "综合管理部",
      file: "软件企业证书.pdf",
      scope: "软件产品研发和信息技术服务能力证明",
      tags: ["软件企业", "企业认定"],
      permissions: "投标团队可引用",
      description: "可用于软件开发和信息化建设项目的企业能力证明。"
    },
    {
      id: "KB-CERT-027",
      name: "电子与智能化工程专业承包资质证书",
      standard: "专业承包二级",
      type: "行业资质",
      number: "D3******27",
      issuer: "省住房和城乡建设主管部门",
      startDate: "2023-07-06",
      endDate: "2026-07-05",
      validity: "expired",
      validityLabel: "已过期",
      validityTone: "red",
      references: 1,
      version: "V1.0",
      updatedAt: "2026-07-06",
      owner: "综合管理部",
      file: "电子与智能化工程专业承包资质证书.pdf",
      scope: "涉及电子与智能化工程施工能力要求的项目",
      tags: ["专业承包", "行业资质", "已过期"],
      permissions: "投标团队可查看，更新前不得作为当前有效证明引用",
      description: "证书已经超过有效期，需要通过编辑替换为新证书后再用于投标项目。"
    }
  ];

  const processingRecordIds = ["KB-BUS-009", "KB-CERT-006", "KB-COMP-004", "KB-CASE-041", "KB-CASE-052", "KB-SOL-081", "KB-SOL-099"];
  const archivedRecordIds = ["KB-COMP-018", "KB-CERT-024", "KB-PEO-091", "KB-CASE-074", "KB-SOL-158", "KB-BUS-013", "KB-TPL-001", "KB-CHART-001", "KB-HIS-001"];
  const manualFilledRecordIds = ["KB-CHART-002", "KB-CERT-008", "KB-CASE-067", "KB-SOL-137"];
  const companyValidityConfig = {
    "KB-COMP-001": { mode: "longterm", startDate: "2023-06-18" },
    "KB-COMP-004": { mode: "fixed", dueDate: "2026-10-01" },
    "KB-COMP-007": { mode: "longterm" },
    "KB-COMP-010": { mode: "fixed", dueDate: "2026-12-31" },
    "KB-COMP-012": { mode: "fixed", dueDate: "2026-07-31" },
    "KB-COMP-014": { mode: "fixed", dueDate: "2026-09-30" },
    "KB-COMP-015": { mode: "fixed", dueDate: "2026-07-31" }
  };

  function dateFromText(value) {
    const matched = String(value || "").match(/20\d{2}-\d{2}-\d{2}/);
    return matched ? matched[0] : "";
  }

  function normalizeKnowledgeRecord(record) {
    if (!record) return record;
    if (/^KB-CERT-/.test(record.id || "")) {
      record.category = "certificates";
      record.categoryLabel = "企业资质证照";
    }
    record.lifecycleState = archivedRecordIds.indexOf(record.id) !== -1 ? "archived" : "active";
    record.parseStatus = record.lifecycleState === "active" && processingRecordIds.indexOf(record.id) !== -1 ? "processing" : "stored";
    record.manualFilled = manualFilledRecordIds.indexOf(record.id) !== -1;
    const companyValidity = companyValidityConfig[record.id];
    if (record.category === "certificates") {
      record.validityMode = record.endDate || dateFromText(record.dateRange) ? "fixed" : "longterm";
      record.validityStartDate = record.startDate || "";
      record.validityDueDate = record.endDate || dateFromText(record.dateRange);
    } else if (companyValidity) {
      record.validityMode = companyValidity.mode;
      record.validityStartDate = companyValidity.startDate || "";
      record.validityDueDate = companyValidity.dueDate || "";
    } else {
      record.validityMode = "longterm";
      record.validityStartDate = "";
      record.validityDueDate = "";
    }
    if (record.lifecycleState === "archived") {
      record.archivedAt = "2026-07-15";
      record.archivedBy = "李明远";
    }
    delete record.permissions;
    delete record.maintenance;
    delete record.maintenanceTone;
    delete record.statusKey;
    if (record.validityLabel) record.validityLabel = record.validityLabel.replace(/受限资料/g, "需人工确认").replace(/待完善/g, "需按项目调整");
    if (record.summary) record.summary = record.summary.replace(/受限/g, "需人工核对").replace(/待完善/g, "需按项目调整");
    if (record.description) record.description = record.description.replace(/查看权限|权限/g, "使用要求").replace(/受限/g, "需人工确认").replace(/待完善/g, "需按项目调整");
    if (record.tags) {
      record.tags = record.tags.map(function (tag) {
        return tag.replace(/受限资料/g, "敏感信息").replace(/受限复用/g, "谨慎引用").replace(/待完善/g, "需按项目调整").replace(/附件待补/g, "归档附件");
      });
    }
    return record;
  }

  [assets, companyRecords, peopleRecords, caseRecords, solutionRecords, businessRecords, templateRecords, chartRecords, historyRecords, certificates].forEach(function (collection) {
    collection.forEach(normalizeKnowledgeRecord);
  });

  window.KnowledgePrototypeData = {
    categories: categories,
    categoryGroups: categoryGroups,
    assets: assets,
    companyRecords: companyRecords,
    peopleRecords: peopleRecords,
    peopleProfiles: peopleProfiles,
    caseRecords: caseRecords,
    solutionRecords: solutionRecords,
    businessRecords: businessRecords,
    templateRecords: templateRecords,
    chartRecords: chartRecords,
    historyRecords: historyRecords,
    certificates: certificates
  };
})();
