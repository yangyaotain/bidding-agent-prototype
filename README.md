# 投标助手静态原型

面向企业投标团队的全过程智能投标工作台原型，已覆盖登录、首页、投标项目、知识库、投标台账和用户管理主流程。

## 快速入口

- `index.html`：项目入口，自动跳转登录页。
- `pages/login.html`：登录页。
- `pages/dashboard.html`：首页。
- `pages/projects.html`：投标项目列表与项目入口。
- `pages/project-files.html`：招标文件与解析过程。
- `pages/project-analysis.html`：解析结果、资格研判、投标事项和知识材料匹配。
- `pages/project-writing.html`：标书编制、版本保存、智能检查与整改。
- `pages/project-quality.html`：人工质量审核。
- `pages/project-delivery.html`：文件交付与归档。
- `pages/knowledge.html`：知识库模块入口。
- `pages/ledger.html`：投标台账列表、结果维护与项目复盘。
- `pages/ledger-detail.html`：整合查看报告归档结果、投标结果与复盘结果。
- `pages/admin.html`：管理中心用户管理。

登录页内置原型演示账号：

- 账号：`toubiao`
- 密码：`123456`

原型不连接后端，填写任意非空账号和密码也可进入首页。

## 项目目录

```text
bidding-agent-prototype/
├── index.html
├── AGENTS.md
├── README.md
├── PROTOTYPE_TASKS.md
├── assets/
│   ├── css/
│   │   ├── theme.css
│   │   ├── layout.css
│   │   ├── login.css
│   │   ├── dashboard.css
│   │   ├── projects.css
│   │   ├── knowledge.css
│   │   ├── ledger.css
│   │   └── admin.css
│   └── js/
│       ├── common.js
│       ├── login.js
│       ├── dashboard.js
│       ├── project-common.js
│       ├── project-detail.js
│       ├── project-writing-editor.js
│       ├── knowledge-common.js
│       ├── ledger.js
│       └── admin.js
├── docs/
│   ├── PRODUCT_ARCHITECTURE.md
│   └── DESIGN_SYSTEM.md
└── pages/
    ├── login.html
    ├── dashboard.html
    ├── projects.html
    ├── project-files.html
    ├── project-analysis.html
    ├── project-writing.html
    ├── project-quality.html
    ├── project-delivery.html
    ├── knowledge.html
    ├── ledger.html
    └── admin.html
```

## 使用约定

- 本项目为纯静态 HTML/CSS/JS 原型，不需要安装依赖或启动服务。
- 所有业务页面通过 `assets/js/common.js` 注入统一顶部菜单，不在单个页面重复设计导航。
- 投标项目固定使用“招标文件、解析结果、标书编制、质量审核、交付归档”五个页签；资格研判、响应处理建议和知识材料匹配已整合在解析结果页。
- 管理中心当前只实现用户管理。
- 后续开始新对话前，请先阅读 `AGENTS.md`、`docs/PRODUCT_ARCHITECTURE.md` 和 `docs/DESIGN_SYSTEM.md`。
- 当前不包含“招标机会/线索管理”。产品入口从“新建投标项目并上传招标文件”开始。
