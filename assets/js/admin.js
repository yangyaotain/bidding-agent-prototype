(function () {
  "use strict";

  const currentUserId = "USER-001";
  let users = [
    { id: "USER-001", name: "李明远", account: "toubiao", phone: "13800001001", email: "limingyuan@bidtech.cn", role: "admin", remark: "负责投标项目统筹与系统维护", status: "enabled", createdAt: "2026-06-03 10:18", lastLogin: "2026-07-16 09:21" },
    { id: "USER-002", name: "周晓雯", account: "zhouxw", phone: "13800001002", email: "zhouxiaowen@bidtech.cn", role: "admin", remark: "协助维护用户与项目数据", status: "enabled", createdAt: "2026-06-05 14:32", lastLogin: "2026-07-16 08:47" },
    { id: "USER-003", name: "王子谦", account: "wangzq", phone: "13800001003", email: "wangziqian@bidtech.cn", role: "user", remark: "负责商务标编制", status: "enabled", createdAt: "2026-06-12 09:06", lastLogin: "2026-07-15 17:26" },
    { id: "USER-004", name: "陈思远", account: "chensy", phone: "13800001004", email: "chensiyuan@bidtech.cn", role: "user", remark: "负责技术方案编制", status: "enabled", createdAt: "2026-06-18 11:45", lastLogin: "2026-07-15 15:03" },
    { id: "USER-005", name: "赵嘉怡", account: "zhaojy", phone: "13800001005", email: "zhaojiayi@bidtech.cn", role: "user", remark: "临时停用账号", status: "disabled", createdAt: "2026-06-20 16:20", lastLogin: "2026-07-09 10:52" },
    { id: "USER-006", name: "孙嘉航", account: "sunjh", phone: "13800001006", email: "sunjiahang@bidtech.cn", role: "user", remark: "负责质量审核", status: "enabled", createdAt: "2026-07-01 09:40", lastLogin: "2026-07-14 13:36" },
    { id: "USER-007", name: "林若冰", account: "linrb", phone: "13800001007", email: "linruobing@bidtech.cn", role: "user", remark: "待确认启用时间", status: "disabled", createdAt: "2026-07-04 15:08", lastLogin: "尚未登录" },
    { id: "USER-008", name: "何佳宁", account: "hejn", phone: "13800001008", email: "hejianing@bidtech.cn", role: "user", remark: "负责知识资料维护", status: "enabled", createdAt: "2026-07-08 10:26", lastLogin: "2026-07-15 11:18" }
  ];

  let editingUserId = "";
  let pendingUserId = "";
  let pendingAction = "";
  let noticeTimer = 0;

  const icons = {
    edit: '<svg viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z"/><path d="m13.5 7.5 3 3"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
    reset: '<svg viewBox="0 0 24 24"><path d="M4 4v6h6"/><path d="M5.5 15a8 8 0 1 0 .5-9L4 10"/><path d="M12 8v4l3 2"/></svg>',
    disable: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 8 8 8"/></svg>',
    enable: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
    delete: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>'
  };

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character];
    });
  }

  function closeActionMenus() {
    document.querySelectorAll(".admin-row-actions.menu-open").forEach(function (item) {
      item.classList.remove("menu-open");
      const trigger = item.querySelector("[data-user-more]");
      if (trigger) {
        trigger.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  function userMatches(user) {
    const query = (document.getElementById("userSearch").value || "").trim().toLowerCase();
    const status = document.getElementById("userStatusFilter").value;
    const searchable = [user.name, user.account, user.phone, user.email, user.remark].join(" ").toLowerCase();
    return (!query || searchable.indexOf(query) !== -1) && (status === "all" || user.status === status);
  }

  function actionMenuTemplate(user, openUp) {
    const isCurrent = user.id === currentUserId;
    const statusAction = user.status === "enabled" ?
      '<button type="button" data-user-action="disable"' + (isCurrent ? ' disabled title="不能禁用当前登录账号"' : "") + '>' + icons.disable + '<span>禁用账号</span></button>' :
      '<button type="button" data-user-action="enable">' + icons.enable + '<span>启用账号</span></button>';
    return [
      '<div class="admin-action-menu' + (openUp ? " open-up" : "") + '">',
      '<button type="button" data-user-action="reset">' + icons.reset + '<span>重置密码</span></button>',
      statusAction,
      '<button class="danger" type="button" data-user-action="delete"' + (isCurrent ? ' disabled title="不能删除当前登录账号"' : "") + '>' + icons.delete + '<span>删除用户</span></button>',
      "</div>"
    ].join("");
  }

  function rowTemplate(user, index, total) {
    const isCurrent = user.id === currentUserId;
    const enabled = user.status === "enabled";
    const lastLogin = user.lastLogin === "尚未登录" ? '<span class="admin-time-cell"><strong>尚未登录</strong><span>账号开通后未使用</span></span>' : '<span class="admin-time-cell"><strong>' + escapeHtml(user.lastLogin.slice(0, 10)) + '</strong><span>' + escapeHtml(user.lastLogin.slice(11)) + "</span></span>";
    return [
      '<tr data-user-id="' + user.id + '">',
      '<td><div class="admin-user-cell"><span class="admin-user-avatar">' + escapeHtml(user.name.slice(0, 1)) + '</span><div class="admin-user-copy"><strong>' + escapeHtml(user.name) + (isCurrent ? '<em class="admin-current-mark">当前用户</em>' : "") + '</strong><span>' + escapeHtml(user.account) + "</span></div></div></td>",
      '<td><div class="admin-contact-cell"><strong>' + escapeHtml(user.phone) + '</strong><span title="' + escapeHtml(user.email || "未填写邮箱") + '">' + escapeHtml(user.email || "未填写邮箱") + "</span></div></td>",
      '<td><div class="admin-role-cell"><span class="status-tag ' + (user.role === "admin" ? "blue" : "gray") + '">' + (user.role === "admin" ? "管理员" : "普通用户") + '</span><span>' + (user.role === "admin" ? "全部功能 · 所有数据" : "全部功能 · 当前用户数据") + "</span></div></td>",
      '<td><span class="status-tag ' + (enabled ? "green" : "gray") + '">' + (enabled ? "已启用" : "已禁用") + "</span></td>",
      '<td><span class="admin-remark' + (user.remark ? "" : " empty") + '" title="' + escapeHtml(user.remark || "暂无备注") + '">' + escapeHtml(user.remark || "暂无备注") + "</span></td>",
      "<td>" + lastLogin + "</td>",
      '<td><div class="admin-row-actions"><button class="admin-action-btn" type="button" data-user-action="edit"><span class="btn-icon">' + icons.edit + '</span><span>编辑</span></button><button class="admin-action-btn" type="button" data-user-more aria-haspopup="menu" aria-expanded="false"><span class="btn-icon">' + icons.more + '</span><span>更多</span></button>' + actionMenuTemplate(user, index >= total - 2) + "</div></td>",
      "</tr>"
    ].join("");
  }

  function updateSummary() {
    const enabledCount = users.filter(function (user) { return user.status === "enabled"; }).length;
    const disabledCount = users.length - enabledCount;
    document.getElementById("userSummary").textContent = "共 " + users.length + " 位用户 · 已启用 " + enabledCount + " 位 · 已禁用 " + disabledCount + " 位";
  }

  function renderUsers() {
    closeActionMenus();
    const filtered = users.filter(userMatches);
    const body = document.getElementById("userTableBody");
    const tableWrap = document.getElementById("userTableWrap");
    const empty = document.getElementById("userEmptyState");
    body.innerHTML = filtered.map(function (user, index) { return rowTemplate(user, index, filtered.length); }).join("");
    tableWrap.classList.toggle("hidden", filtered.length === 0);
    empty.classList.toggle("hidden", filtered.length !== 0);
    document.getElementById("userResultCount").textContent = "共 " + filtered.length + " 条用户记录";
    updateSummary();
  }

  function showNotice(message, tone) {
    const notice = document.getElementById("adminNotice");
    window.clearTimeout(noticeTimer);
    notice.classList.remove("hidden", "warning");
    if (tone === "warning") notice.classList.add("warning");
    document.getElementById("adminNoticeText").textContent = message;
    noticeTimer = window.setTimeout(function () { notice.classList.add("hidden"); }, 4200);
  }

  function openLayer(id) {
    closeActionMenus();
    closeLayers();
    const layer = document.getElementById(id);
    if (!layer) return;
    document.getElementById("adminBackdrop").classList.remove("hidden");
    layer.classList.add("open");
    layer.setAttribute("aria-hidden", "false");
    document.body.classList.add("admin-layer-open");
    const focusTarget = layer.querySelector("input:not([disabled]), button:not([disabled])");
    window.setTimeout(function () { if (focusTarget) focusTarget.focus(); }, 30);
  }

  function closeLayers() {
    document.querySelectorAll(".admin-modal.open").forEach(function (layer) {
      layer.classList.remove("open");
      layer.setAttribute("aria-hidden", "true");
    });
    document.getElementById("adminBackdrop").classList.add("hidden");
    document.body.classList.remove("admin-layer-open");
  }

  function clearFormErrors() {
    ["userName", "userAccount", "userPhone", "userEmail", "userRole", "userPassword", "userRemark"].forEach(function (key) {
      document.getElementById(key + "Field").classList.remove("has-error");
      document.getElementById(key + "Error").textContent = "";
    });
  }

  function setFieldError(key, message) {
    document.getElementById(key + "Field").classList.add("has-error");
    document.getElementById(key + "Error").textContent = message;
  }

  function generatePassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let suffix = "";
    for (let index = 0; index < 4; index += 1) suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return "Tb@2026" + suffix;
  }

  function updateRoleAccessTip() {
    const isAdmin = document.getElementById("userRoleInput").value === "admin";
    document.getElementById("roleAccessTitle").textContent = isAdmin ? "管理员" : "普通用户";
    document.getElementById("roleAccessDescription").textContent = isAdmin ? "拥有所有功能和所有数据权限。" : "拥有所有功能和当前用户的数据权限。";
  }

  function openCreateUser() {
    editingUserId = "";
    clearFormErrors();
    document.getElementById("userFormTitle").textContent = "新增用户";
    document.getElementById("userFormDescription").textContent = "填写账号信息并开通投标助手。";
    document.getElementById("saveUserBtn").querySelector("span:last-child").textContent = "开通用户";
    document.getElementById("userNameInput").value = "";
    document.getElementById("userAccountInput").value = "";
    document.getElementById("userAccountInput").disabled = false;
    document.getElementById("userPhoneInput").value = "";
    document.getElementById("userEmailInput").value = "";
    document.getElementById("userRoleInput").value = "user";
    document.getElementById("userRoleInput").disabled = false;
    document.getElementById("userRoleHint").textContent = "系统默认角色，暂不支持自定义。";
    document.getElementById("userRemarkInput").value = "";
    document.getElementById("userPasswordInput").value = generatePassword();
    document.getElementById("userPasswordField").classList.remove("hidden");
    document.getElementById("userEnableField").classList.remove("hidden");
    document.getElementById("userEnabledInput").checked = true;
    updateRoleAccessTip();
    openLayer("userFormModal");
  }

  function openEditUser(userId) {
    const user = users.find(function (item) { return item.id === userId; });
    if (!user) return;
    editingUserId = userId;
    clearFormErrors();
    document.getElementById("userFormTitle").textContent = "编辑用户";
    document.getElementById("userFormDescription").textContent = "修改用户基础信息和系统默认角色，登录账号开通后不可修改。";
    document.getElementById("saveUserBtn").querySelector("span:last-child").textContent = "保存修改";
    document.getElementById("userNameInput").value = user.name;
    document.getElementById("userAccountInput").value = user.account;
    document.getElementById("userAccountInput").disabled = true;
    document.getElementById("userPhoneInput").value = user.phone;
    document.getElementById("userEmailInput").value = user.email;
    document.getElementById("userRoleInput").value = user.role;
    document.getElementById("userRoleInput").disabled = user.id === currentUserId;
    document.getElementById("userRoleHint").textContent = user.id === currentUserId ? "当前登录用户不能调整自身角色。" : "系统默认角色，暂不支持自定义。";
    document.getElementById("userRemarkInput").value = user.remark || "";
    document.getElementById("userPasswordField").classList.add("hidden");
    document.getElementById("userEnableField").classList.add("hidden");
    updateRoleAccessTip();
    openLayer("userFormModal");
  }

  function validateUserForm() {
    clearFormErrors();
    const name = document.getElementById("userNameInput").value.trim();
    const account = document.getElementById("userAccountInput").value.trim();
    const phone = document.getElementById("userPhoneInput").value.trim();
    const email = document.getElementById("userEmailInput").value.trim();
    const role = document.getElementById("userRoleInput").value;
    const password = document.getElementById("userPasswordInput").value.trim();
    let valid = true;
    if (!name) { setFieldError("userName", "请输入用户姓名"); valid = false; }
    if (!account) { setFieldError("userAccount", "请输入登录账号"); valid = false; }
    else if (!/^[A-Za-z0-9._-]{4,20}$/.test(account)) { setFieldError("userAccount", "请输入 4-20 位字母、数字、点、下划线或短横线"); valid = false; }
    else if (!editingUserId && users.some(function (user) { return user.account.toLowerCase() === account.toLowerCase(); })) { setFieldError("userAccount", "该登录账号已存在"); valid = false; }
    if (!/^1\d{10}$/.test(phone)) { setFieldError("userPhone", "请输入正确的 11 位手机号"); valid = false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError("userEmail", "请输入正确的邮箱地址"); valid = false; }
    else if (email && users.some(function (user) { return user.id !== editingUserId && user.email.toLowerCase() === email.toLowerCase(); })) { setFieldError("userEmail", "该邮箱已被其他用户使用"); valid = false; }
    if (["admin", "user"].indexOf(role) === -1) { setFieldError("userRole", "请选择系统默认角色"); valid = false; }
    if (!editingUserId && password.length < 8) { setFieldError("userPassword", "初始密码至少需要 8 位"); valid = false; }
    return valid;
  }

  function nextUserId() {
    const maxNumber = users.reduce(function (maximum, user) {
      return Math.max(maximum, Number(user.id.replace("USER-", "")) || 0);
    }, 0);
    return "USER-" + String(maxNumber + 1).padStart(3, "0");
  }

  function nowText() {
    const now = new Date();
    const pad = function (value) { return String(value).padStart(2, "0"); };
    return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
  }

  function saveUser(event) {
    event.preventDefault();
    if (!validateUserForm()) return;
    const name = document.getElementById("userNameInput").value.trim();
    const account = document.getElementById("userAccountInput").value.trim();
    const phone = document.getElementById("userPhoneInput").value.trim();
    const email = document.getElementById("userEmailInput").value.trim();
    const role = document.getElementById("userRoleInput").value;
    const remark = document.getElementById("userRemarkInput").value.trim();
    if (editingUserId) {
      users = users.map(function (user) {
        return user.id === editingUserId ? Object.assign({}, user, { name: name, phone: phone, email: email, role: role, remark: remark }) : user;
      });
      closeLayers();
      renderUsers();
      showNotice("用户“" + name + "”的信息已更新");
      return;
    }
    users.unshift({
      id: nextUserId(),
      name: name,
      account: account,
      phone: phone,
      email: email,
      role: role,
      remark: remark,
      status: document.getElementById("userEnabledInput").checked ? "enabled" : "disabled",
      createdAt: nowText(),
      lastLogin: "尚未登录"
    });
    closeLayers();
    renderUsers();
    showNotice("用户“" + name + "”已按“" + (role === "admin" ? "管理员" : "普通用户") + "”角色开通");
  }

  function openActionModal(userId, action) {
    const user = users.find(function (item) { return item.id === userId; });
    if (!user || user.id === currentUserId && (action === "disable" || action === "delete")) return;
    pendingUserId = userId;
    pendingAction = action;
    const config = {
      disable: {
        title: "禁用用户",
        description: "禁用后该账号将无法登录投标助手。",
        message: "确认禁用用户“" + user.name + "”？",
        hint: "用户信息将继续保留，后续可以重新启用账号。",
        confirm: "确认禁用",
        danger: false
      },
      reset: {
        title: "重置用户密码",
        description: "系统将为该账号生成新的临时密码。",
        message: "确认重置用户“" + user.name + "”的密码？",
        hint: "重置后原密码立即失效，请将新密码安全地提供给用户。",
        confirm: "确认重置",
        danger: false
      },
      delete: {
        title: "删除用户",
        description: "删除后该用户将从用户列表移除。",
        message: "确认删除用户“" + user.name + "”？",
        hint: "此操作不可撤销；如果只是暂时停止使用，建议禁用账号。",
        confirm: "确认删除",
        danger: true
      }
    }[action];
    if (!config) return;
    document.getElementById("userActionTitle").textContent = config.title;
    document.getElementById("userActionDescription").textContent = config.description;
    document.getElementById("userActionMessage").textContent = config.message;
    document.getElementById("userActionHint").textContent = config.hint;
    document.getElementById("userActionAlert").className = "admin-action-alert" + (config.danger ? " danger" : "");
    const confirmButton = document.getElementById("confirmUserAction");
    confirmButton.className = "primary-btn" + (config.danger ? " danger" : "");
    confirmButton.querySelector("span:last-child").textContent = config.confirm;
    openLayer("userActionModal");
  }

  function confirmUserAction() {
    const user = users.find(function (item) { return item.id === pendingUserId; });
    if (!user) return;
    if (pendingAction === "disable") {
      user.status = "disabled";
      closeLayers();
      renderUsers();
      showNotice("用户“" + user.name + "”已禁用", "warning");
    } else if (pendingAction === "delete") {
      users = users.filter(function (item) { return item.id !== pendingUserId; });
      closeLayers();
      renderUsers();
      showNotice("用户“" + user.name + "”已删除");
    } else if (pendingAction === "reset") {
      const password = generatePassword();
      closeLayers();
      document.getElementById("resetAccountText").textContent = user.account;
      document.getElementById("temporaryPasswordText").textContent = password;
      openLayer("passwordResultModal");
    }
    pendingUserId = "";
    pendingAction = "";
  }

  function enableUser(userId) {
    const user = users.find(function (item) { return item.id === userId; });
    if (!user) return;
    user.status = "enabled";
    renderUsers();
    showNotice("用户“" + user.name + "”已启用，可继续登录系统");
  }

  function copyTemporaryPassword() {
    const text = document.getElementById("temporaryPasswordText").textContent;
    const copyWithFallback = function () {
      const input = document.createElement("textarea");
      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(copyWithFallback);
    else copyWithFallback();
    const label = document.getElementById("copyTemporaryPassword").querySelector("span:last-child");
    label.textContent = "已复制";
    window.setTimeout(function () { label.textContent = "复制密码"; }, 1600);
  }

  function initEvents() {
    document.getElementById("createUserBtn").addEventListener("click", openCreateUser);
    document.getElementById("userForm").addEventListener("submit", saveUser);
    document.getElementById("confirmUserAction").addEventListener("click", confirmUserAction);
    document.getElementById("copyTemporaryPassword").addEventListener("click", copyTemporaryPassword);
    document.getElementById("closeAdminNotice").addEventListener("click", function () { document.getElementById("adminNotice").classList.add("hidden"); });
    document.getElementById("userSearch").addEventListener("input", renderUsers);
    document.getElementById("userStatusFilter").addEventListener("change", renderUsers);
    document.getElementById("resetUserFilters").addEventListener("click", function () {
      document.getElementById("userSearch").value = "";
      document.getElementById("userStatusFilter").value = "all";
      renderUsers();
    });
    window.addEventListener("app:user-updated", function (event) {
      const detail = event.detail || {};
      users = users.map(function (user) {
        return user.id === currentUserId ? Object.assign({}, user, {
          name: detail.name || user.name,
          phone: detail.phone || user.phone,
          email: typeof detail.email === "string" ? detail.email : user.email
        }) : user;
      });
      renderUsers();
    });
    ["userNameInput", "userAccountInput", "userPhoneInput", "userEmailInput", "userPasswordInput", "userRemarkInput"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function () {
        const key = id.replace("Input", "");
        document.getElementById(key + "Field").classList.remove("has-error");
        document.getElementById(key + "Error").textContent = "";
      });
    });
    document.getElementById("userRoleInput").addEventListener("change", function () {
      document.getElementById("userRoleField").classList.remove("has-error");
      document.getElementById("userRoleError").textContent = "";
      updateRoleAccessTip();
    });
    document.addEventListener("click", function (event) {
      const moreButton = event.target.closest("[data-user-more]");
      if (moreButton) {
        const actions = moreButton.closest(".admin-row-actions");
        const willOpen = !actions.classList.contains("menu-open");
        closeActionMenus();
        actions.classList.toggle("menu-open", willOpen);
        moreButton.classList.toggle("is-open", willOpen);
        moreButton.setAttribute("aria-expanded", willOpen ? "true" : "false");
        event.stopPropagation();
        return;
      }
      const actionButton = event.target.closest("[data-user-action]");
      if (actionButton && !actionButton.disabled) {
        const row = actionButton.closest("tr");
        if (!row) return;
        const userId = row.getAttribute("data-user-id");
        const action = actionButton.getAttribute("data-user-action");
        if (action === "edit") openEditUser(userId);
        else if (action === "enable") enableUser(userId);
        else openActionModal(userId, action);
        return;
      }
      if (!event.target.closest(".admin-action-menu")) closeActionMenus();
    });
    document.querySelectorAll("[data-close-admin-layer]").forEach(function (button) { button.addEventListener("click", closeLayers); });
    document.getElementById("adminBackdrop").addEventListener("click", closeLayers);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeActionMenus();
        closeLayers();
      }
    });
  }

  function init() {
    renderUsers();
    initEvents();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
