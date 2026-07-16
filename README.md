# 投标助手静态原型

面向企业投标团队的全过程智能投标工作台原型。当前阶段完成统一科技蓝视觉框架、登录页、首页，以及其他一级菜单的占位页面。

## 快速入口

- `index.html`：项目入口，自动跳转登录页。
- `pages/login.html`：登录页。
- `pages/dashboard.html`：首页。
- `pages/projects.html`：投标项目占位页。
- `pages/knowledge.html`：知识库占位页。
- `pages/ledger.html`：投标台账列表、结果维护与项目复盘。
- `pages/ledger-detail.html`：整合查看报告归档结果、投标结果与复盘结果。
- `pages/admin.html`：管理中心占位页。

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
│   │   └── placeholder.css
│   └── js/
│       ├── common.js
│       ├── login.js
│       └── dashboard.js
├── docs/
│   ├── PRODUCT_ARCHITECTURE.md
│   └── DESIGN_SYSTEM.md
└── pages/
    ├── login.html
    ├── dashboard.html
    ├── projects.html
    ├── knowledge.html
    ├── ledger.html
    └── admin.html
```

## 使用约定

- 本项目为纯静态 HTML/CSS/JS 原型，不需要安装依赖或启动服务。
- 所有业务页面通过 `assets/js/common.js` 注入统一顶部菜单，不在单个页面重复设计导航。
- 后续开始新对话前，请先阅读 `AGENTS.md`、`docs/PRODUCT_ARCHITECTURE.md` 和 `docs/DESIGN_SYSTEM.md`。
- 当前不包含“招标机会/线索管理”。产品入口从“新建投标项目并上传招标文件”开始。
