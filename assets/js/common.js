(function () {
  "use strict";

  const icons = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>',
    project: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M8 5V3h8v2M3 10h18"/></svg>',
    knowledge: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12v17H6a2 2 0 0 0-2 2V5z"/><path d="M8 7h6M8 11h7"/></svg>',
    ledger: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M11 8h6M11 12h6M11 16h4"/></svg>',
    admin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.7 3.1-6.5 7-6.5s7 2.8 7 6.5"/><path d="M18.5 5.5 20 4m0 0 1.5 1.5M20 4v3"/></svg>',
    chevron: '<svg class="chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M6.6 3h3l1.5 4-2 1.5a15 15 0 0 0 6.4 6.4l1.5-2 4 1.5v3A3.6 3.6 0 0 1 17.4 21C9.5 20.3 3.7 14.5 3 6.6A3.6 3.6 0 0 1 6.6 3z"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6l-7-3z"/><path d="m9 12 2 2 4-4"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    logout: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    warning: '<svg viewBox="0 0 24 24"><path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>'
  };

  const currentUser = {
    name: "李明远",
    avatar: "李",
    account: "toubiao",
    role: "管理员",
    phone: "13800001001",
    email: "limingyuan@bidtech.cn"
  };
  let currentPassword = "123456";
  window.AppCurrentUser = currentUser;

  function fileFormatMeta(name) {
    const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    const extension = match ? match[1] : "";
    const formats = {
      pdf: { type: "pdf", mark: "PDF" },
      doc: { type: "word", mark: "DOC" },
      docx: { type: "word", mark: "DOCX" },
      wps: { type: "word", mark: "WPS" },
      xls: { type: "excel", mark: "XLS" },
      xlsx: { type: "excel", mark: "XLSX" },
      csv: { type: "excel", mark: "CSV" },
      ppt: { type: "powerpoint", mark: "PPT" },
      pptx: { type: "powerpoint", mark: "PPTX" },
      ofd: { type: "ofd", mark: "OFD" },
      png: { type: "image", mark: "PNG" },
      jpg: { type: "image", mark: "JPG" },
      jpeg: { type: "image", mark: "JPEG" },
      webp: { type: "image", mark: "WEBP" },
      gif: { type: "image", mark: "GIF" },
      bmp: { type: "image", mark: "BMP" },
      svg: { type: "vector", mark: "SVG" },
      txt: { type: "text", mark: "TXT" },
      md: { type: "text", mark: "MD" },
      json: { type: "data", mark: "JSON" },
      xml: { type: "data", mark: "XML" },
      zip: { type: "archive", mark: "ZIP" },
      rar: { type: "archive", mark: "RAR" },
      "7z": { type: "archive", mark: "7Z" }
    };
    const format = formats[extension] || { type: "generic", mark: extension ? extension.toUpperCase().slice(0, 5) : "FILE" };
    return { type: format.type, mark: format.mark, label: format.mark + " 文件" };
  }

  function fileIconMarkup(name, extraClass) {
    const format = fileFormatMeta(name);
    const className = "file-type-icon type-" + format.type + (extraClass ? " " + extraClass : "");
    return '<span class="' + className + '" role="img" aria-label="' + format.label + '" title="' + format.label + '"><span class="file-format-mark">' + format.mark + "</span></span>";
  }

  window.BiddingFileIcons = {
    meta: fileFormatMeta,
    markup: fileIconMarkup
  };

  function previewProfileFromName(name) {
    const format = fileFormatMeta(name);
    if (format.type === "excel") return "quote";
    if (format.type === "image" || format.type === "vector") return "image";
    if (format.type === "archive") return "package";
    return "uploaded";
  }

  function openFilePreview(config) {
    const options = config || {};
    const query = new URLSearchParams();
    const values = {
      profile: options.profile || previewProfileFromName(options.name),
      name: options.name,
      format: options.formatLabel,
      size: options.size,
      context: options.context,
      url: options.sourceUrl,
      page: options.page
    };
    Object.keys(values).forEach(function (key) {
      if (values[key] !== undefined && values[key] !== null && String(values[key]).trim() !== "") query.set(key, values[key]);
    });
    const pathname = String(window.location.pathname || "").replace(/\\/g, "/");
    const previewPage = pathname.indexOf("/pages/") !== -1 ? "file-preview.html" : "pages/file-preview.html";
    const link = document.createElement("a");
    link.href = previewPage + "?" + query.toString();
    link.target = "_blank";
    link.rel = "noopener";
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    const href = link.href;
    link.remove();
    return href;
  }

  window.BiddingFilePreview = {
    open: openFilePreview,
    profileFromName: previewProfileFromName
  };

  const menuItems = [
    { key: "dashboard", label: "首页", href: "dashboard.html", icon: icons.home },
    { key: "projects", label: "投标项目", href: "projects.html", icon: icons.project },
    { key: "knowledge", label: "知识库", href: "knowledge.html", icon: icons.knowledge },
    { key: "ledger", label: "投标台账", href: "ledger.html", icon: icons.ledger },
    { key: "admin", label: "管理中心", href: "admin.html", icon: icons.admin }
  ];

  function buildHeader(activeKey) {
    const menu = menuItems.map(function (item) {
      return '<a class="menu-item' + (item.key === activeKey ? " active" : "") + '" href="' + item.href + '">' + item.icon + '<span>' + item.label + "</span></a>";
    }).join("");

    return [
      '<header class="topbar">',
      '<a class="brand-link" href="dashboard.html" aria-label="返回投标助手首页">',
      '<span class="brand-logo">投</span>',
      '<span class="brand-copy"><strong>投标助手</strong><span>AI Bidding Copilot</span></span>',
      "</a>",
      '<nav class="top-menu" aria-label="一级菜单">' + menu + "</nav>",
      '<div class="top-actions">',
      '<button type="button" class="user-trigger" id="userTrigger" aria-label="打开用户菜单" aria-expanded="false">',
      '<span class="avatar" id="userTriggerAvatar">' + currentUser.avatar + '</span><strong id="userTriggerName">' + currentUser.name + '</strong>' + icons.chevron,
      "</button>",
      '<section class="popover user-popover hidden" id="userPopover" aria-label="用户菜单">',
      '<div class="user-summary"><span class="avatar" id="userSummaryAvatar">' + currentUser.avatar + '</span><div class="user-summary-copy"><div class="user-summary-name"><strong id="userSummaryName">' + currentUser.name + '</strong><span class="user-role-badge" id="userSummaryRole">' + currentUser.role + '</span></div><span class="user-summary-account">登录账号：' + currentUser.account + '</span><span class="user-summary-email" id="userSummaryEmail">' + currentUser.email + '</span></div></div>',
      '<div class="user-menu-list">',
      '<button type="button" class="user-menu-item" id="personalInfoMenuBtn"><span class="user-menu-icon">' + icons.user + '</span><span class="user-menu-copy"><strong>个人信息</strong><small>维护姓名、手机和邮箱</small></span><span class="user-menu-arrow">' + icons.arrow + '</span></button>',
      '<button type="button" class="user-menu-item" id="changePasswordMenuBtn"><span class="user-menu-icon">' + icons.lock + '</span><span class="user-menu-copy"><strong>修改密码</strong><small>更新当前账号登录密码</small></span><span class="user-menu-arrow">' + icons.arrow + '</span></button>',
      '<div class="menu-divider"></div>',
      '<button type="button" class="user-menu-item danger logout-item" id="logoutBtn"><span class="user-menu-icon">' + icons.logout + '</span><span class="user-menu-copy"><strong>退出登录</strong><small>安全退出当前账号</small></span><span class="user-menu-arrow">' + icons.arrow + '</span></button>',
      "</div>",
      "</section>",
      "</div>",
      "</header>"
    ].join("");
  }

  function buildAccountLayers() {
    return [
      '<div class="account-modal-backdrop hidden" id="accountModalBackdrop" aria-hidden="true"></div>',
      '<section class="account-modal" id="personalInfoModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="personalInfoTitle">',
      '<header class="account-layer-head"><div><span class="account-layer-kicker">账号设置</span><h3 id="personalInfoTitle">个人信息</h3><p>维护当前登录用户的基础联系信息。</p></div><button class="account-layer-close" type="button" data-close-account-layer title="关闭" aria-label="关闭个人信息弹窗">' + icons.close + '</button></header>',
      '<form id="personalInfoForm" novalidate>',
      '<div class="account-layer-body">',
      '<div class="account-profile-card"><span class="avatar" id="profileFormAvatar">' + currentUser.avatar + '</span><div class="account-profile-copy"><div class="account-profile-title"><strong id="profileFormName">' + currentUser.name + '</strong><span class="account-profile-role" id="profileFormRole">' + currentUser.role + '</span></div><span id="profileFormMeta">登录账号：' + currentUser.account + '</span></div></div>',
      '<div class="account-modal-feedback hidden" id="profileModalFeedback" role="status"></div>',
      '<div class="account-form-grid">',
      '<label class="account-field" id="profileNameField"><span>姓名<em>*</em></span><div class="account-input-wrap">' + icons.user + '<input id="profileNameInput" type="text" maxlength="20" autocomplete="name" /></div><small id="profileNameError"></small></label>',
      '<label class="account-field"><span>登录账号</span><div class="account-input-wrap readonly">' + icons.shield + '<input id="profileAccountInput" type="text" disabled /></div><small>登录账号开通后不可修改</small></label>',
      '<label class="account-field" id="profilePhoneField"><span>手机号<em>*</em></span><div class="account-input-wrap">' + icons.phone + '<input id="profilePhoneInput" type="tel" maxlength="11" autocomplete="tel" /></div><small id="profilePhoneError"></small></label>',
      '<label class="account-field" id="profileEmailField"><span>邮箱</span><div class="account-input-wrap">' + icons.mail + '<input id="profileEmailInput" type="email" maxlength="60" autocomplete="email" /></div><small id="profileEmailError"></small></label>',
      '<label class="account-field full"><span>当前角色</span><div class="account-input-wrap readonly">' + icons.shield + '<input id="profileRoleInput" type="text" disabled /></div><small>角色由管理员在用户管理中维护</small></label>',
      "</div>",
      "</div>",
      '<footer class="account-layer-footer"><button class="ghost-btn" type="button" data-close-account-layer><span class="btn-icon">' + icons.close + '</span><span>取消</span></button><button class="primary-btn" type="submit"><span class="btn-icon">' + icons.check + '</span><span>保存修改</span></button></footer>',
      "</form>",
      "</section>",
      '<section class="account-modal compact" id="changePasswordModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="changePasswordTitle">',
      '<header class="account-layer-head"><div><span class="account-layer-kicker">账号安全</span><h3 id="changePasswordTitle">修改密码</h3><p>定期更新密码有助于保障账号安全。</p></div><button class="account-layer-close" type="button" data-close-account-layer title="关闭" aria-label="关闭修改密码弹窗">' + icons.close + '</button></header>',
      '<form id="changePasswordForm" novalidate>',
      '<div class="account-layer-body">',
      '<div class="account-security-tip">' + icons.shield + '<div><strong>密码安全要求</strong><span>至少 8 位，并同时包含字母和数字。</span></div></div>',
      '<div class="account-modal-feedback hidden" id="passwordModalFeedback" role="status"></div>',
      '<div class="account-form-grid single">',
      '<label class="account-field full" id="currentPasswordField"><span>当前密码<em>*</em></span><div class="account-input-wrap password">' + icons.lock + '<input id="currentPasswordInput" type="password" autocomplete="current-password" placeholder="请输入当前登录密码" /><button class="account-password-toggle" type="button" data-password-target="currentPasswordInput" title="显示密码" aria-label="显示当前密码">' + icons.eye + '</button></div><small id="currentPasswordError"></small></label>',
      '<label class="account-field full" id="newPasswordField"><span>新密码<em>*</em></span><div class="account-input-wrap password">' + icons.lock + '<input id="newPasswordInput" type="password" maxlength="24" autocomplete="new-password" placeholder="请输入新密码" /><button class="account-password-toggle" type="button" data-password-target="newPasswordInput" title="显示密码" aria-label="显示新密码">' + icons.eye + '</button></div><small id="newPasswordError"></small></label>',
      '<label class="account-field full" id="confirmPasswordField"><span>确认新密码<em>*</em></span><div class="account-input-wrap password">' + icons.lock + '<input id="confirmPasswordInput" type="password" maxlength="24" autocomplete="new-password" placeholder="请再次输入新密码" /><button class="account-password-toggle" type="button" data-password-target="confirmPasswordInput" title="显示密码" aria-label="显示确认密码">' + icons.eye + '</button></div><small id="confirmPasswordError"></small></label>',
      "</div>",
      "</div>",
      '<footer class="account-layer-footer"><button class="ghost-btn" type="button" data-close-account-layer><span class="btn-icon">' + icons.close + '</span><span>取消</span></button><button class="primary-btn" type="submit"><span class="btn-icon">' + icons.check + '</span><span>确认修改</span></button></footer>',
      "</form>",
      "</section>"
    ].join("");
  }

  function closePopovers() {
    const user = document.getElementById("userPopover");
    const userTrigger = document.getElementById("userTrigger");
    if (user) user.classList.add("hidden");
    if (userTrigger) {
      userTrigger.classList.remove("is-open");
      userTrigger.setAttribute("aria-expanded", "false");
    }
  }

  function toggleUserPopover() {
    const trigger = document.getElementById("userTrigger");
    const popover = document.getElementById("userPopover");
    if (!trigger || !popover) return;
    const willOpen = popover.classList.contains("hidden");
    closePopovers();
    if (willOpen) {
      popover.classList.remove("hidden");
      trigger.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    }
  }

  function clearAccountFormState(root) {
    const scope = root || document;
    scope.querySelectorAll(".account-field.has-error").forEach(function (field) { field.classList.remove("has-error"); });
    scope.querySelectorAll('.account-field > small[id$="Error"]').forEach(function (error) { error.textContent = ""; });
    scope.querySelectorAll(".account-modal-feedback").forEach(function (feedback) {
      feedback.className = "account-modal-feedback hidden";
      feedback.textContent = "";
    });
  }

  function setAccountFieldError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (field) field.classList.add("has-error");
    if (error) error.textContent = message;
  }

  function showAccountFeedback(id, message, type) {
    const feedback = document.getElementById(id);
    if (!feedback) return;
    feedback.className = "account-modal-feedback " + (type === "error" ? "error" : "success");
    feedback.textContent = message;
  }

  function populateProfileForm() {
    document.getElementById("profileNameInput").value = currentUser.name;
    document.getElementById("profileAccountInput").value = currentUser.account;
    document.getElementById("profilePhoneInput").value = currentUser.phone;
    document.getElementById("profileEmailInput").value = currentUser.email;
    document.getElementById("profileRoleInput").value = currentUser.role;
    document.getElementById("profileFormAvatar").textContent = currentUser.avatar;
    document.getElementById("profileFormName").textContent = currentUser.name;
    document.getElementById("profileFormRole").textContent = currentUser.role;
    document.getElementById("profileFormMeta").textContent = "登录账号：" + currentUser.account;
  }

  function resetPasswordForm() {
    ["currentPasswordInput", "newPasswordInput", "confirmPasswordInput"].forEach(function (id) {
      const input = document.getElementById(id);
      input.value = "";
      input.type = "password";
    });
    document.querySelectorAll("[data-password-target]").forEach(function (button) {
      button.classList.remove("is-visible");
      button.title = "显示密码";
      button.setAttribute("aria-label", "显示密码");
    });
  }

  function openAccountLayer(id) {
    closePopovers();
    closeAccountLayers();
    const layer = document.getElementById(id);
    if (!layer) return;
    clearAccountFormState(layer);
    if (id === "personalInfoModal") populateProfileForm();
    if (id === "changePasswordModal") resetPasswordForm();
    document.getElementById("accountModalBackdrop").classList.remove("hidden");
    layer.classList.add("open");
    layer.setAttribute("aria-hidden", "false");
    document.body.classList.add("account-layer-open");
    const focusTarget = layer.querySelector("input:not([disabled])");
    window.setTimeout(function () { if (focusTarget) focusTarget.focus(); }, 30);
  }

  function closeAccountLayers() {
    document.querySelectorAll(".account-modal.open").forEach(function (layer) {
      layer.classList.remove("open");
      layer.setAttribute("aria-hidden", "true");
    });
    const backdrop = document.getElementById("accountModalBackdrop");
    if (backdrop) backdrop.classList.add("hidden");
    document.body.classList.remove("account-layer-open");
  }

  function saveProfile(event) {
    event.preventDefault();
    const form = document.getElementById("personalInfoForm");
    clearAccountFormState(form);
    const name = document.getElementById("profileNameInput").value.trim();
    const phone = document.getElementById("profilePhoneInput").value.trim();
    const email = document.getElementById("profileEmailInput").value.trim();
    let valid = true;
    if (!name) { setAccountFieldError("profileNameField", "profileNameError", "请输入姓名"); valid = false; }
    if (!/^1\d{10}$/.test(phone)) { setAccountFieldError("profilePhoneField", "profilePhoneError", "请输入正确的 11 位手机号"); valid = false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setAccountFieldError("profileEmailField", "profileEmailError", "请输入正确的邮箱地址"); valid = false; }
    if (!valid) return;

    currentUser.name = name;
    currentUser.avatar = name.slice(0, 1);
    currentUser.phone = phone;
    currentUser.email = email;
    document.getElementById("userTriggerAvatar").textContent = currentUser.avatar;
    document.getElementById("userTriggerName").textContent = currentUser.name;
    document.getElementById("userSummaryAvatar").textContent = currentUser.avatar;
    document.getElementById("userSummaryName").textContent = currentUser.name;
    document.getElementById("userSummaryEmail").textContent = currentUser.email || "未填写邮箱";
    populateProfileForm();
    showAccountFeedback("profileModalFeedback", "个人信息已保存，并已同步更新顶部用户信息。", "success");
    window.dispatchEvent(new CustomEvent("app:user-updated", { detail: { name: name, phone: phone, email: email } }));
  }

  function savePassword(event) {
    event.preventDefault();
    const form = document.getElementById("changePasswordForm");
    clearAccountFormState(form);
    const current = document.getElementById("currentPasswordInput").value;
    const next = document.getElementById("newPasswordInput").value;
    const confirm = document.getElementById("confirmPasswordInput").value;
    let valid = true;
    if (!current) { setAccountFieldError("currentPasswordField", "currentPasswordError", "请输入当前密码"); valid = false; }
    else if (current !== currentPassword) { setAccountFieldError("currentPasswordField", "currentPasswordError", "当前密码不正确"); valid = false; }
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) { setAccountFieldError("newPasswordField", "newPasswordError", "新密码至少 8 位，并同时包含字母和数字"); valid = false; }
    else if (next === currentPassword) { setAccountFieldError("newPasswordField", "newPasswordError", "新密码不能与当前密码相同"); valid = false; }
    if (!confirm) { setAccountFieldError("confirmPasswordField", "confirmPasswordError", "请再次输入新密码"); valid = false; }
    else if (confirm !== next) { setAccountFieldError("confirmPasswordField", "confirmPasswordError", "两次输入的新密码不一致"); valid = false; }
    if (!valid) return;

    currentPassword = next;
    resetPasswordForm();
    showAccountFeedback("passwordModalFeedback", "密码修改成功，下次登录请使用新密码。", "success");
  }

  function inferToastType(message) {
    const text = String(message || "");
    if (/失败|错误|异常|无法|不支持|已阻止|不足/.test(text)) return "error";
    if (/请|尚未|至少|待确认|不能为空|需要|仍未|将暂时/.test(text)) return "warning";
    if (/成功|完成|已保存|已更新|已添加|已创建|已删除|已移除|已开放|已通过|已归档|已记录|已锁定|已上传/.test(text)) return "success";
    return "info";
  }

  function clearInlineFeedback(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("[data-generated-feedback]").forEach(function (item) { item.remove(); });
    scope.querySelectorAll(".is-feedback-error").forEach(function (item) {
      item.classList.remove("is-feedback-error");
      item.removeAttribute("aria-invalid");
    });
  }

  function resolveFeedbackTarget(target) {
    if (target && target.nodeType === 1) return target;
    if (typeof target === "string") return document.querySelector(target);
    return null;
  }

  function activeFeedbackContext(anchor) {
    const openLayer = document.querySelector('.prototype-modal.open, .side-drawer.open, .knowledge-modal.open, .knowledge-drawer.open, [role="dialog"].open');
    if (openLayer) return openLayer.querySelector(".layer-body, .knowledge-layer-body") || openLayer;
    if (!anchor || !anchor.closest) return document.querySelector("main");
    return anchor.closest("form, .writing-ai-panel, .content-card, .panel-body, .workspace-content") || document.querySelector("main");
  }

  window.showInlineFeedback = function (message, type, target) {
    const text = String(message || "请检查当前填写内容");
    const feedbackType = type === "error" ? "error" : "warning";
    const explicitTarget = resolveFeedbackTarget(target);
    const anchor = explicitTarget || document.activeElement;
    const context = activeFeedbackContext(anchor);
    if (!context) return;
    clearInlineFeedback(context);

    const feedback = document.createElement("div");
    feedback.className = "inline-feedback " + feedbackType;
    feedback.setAttribute("data-generated-feedback", "");
    feedback.setAttribute("role", feedbackType === "error" ? "alert" : "status");
    feedback.innerHTML = '<span class="inline-feedback-icon" aria-hidden="true">' + (feedbackType === "error" ? icons.error : icons.warning) + '</span><span></span>';
    feedback.querySelector("span:last-child").textContent = text;

    if (explicitTarget) {
      const field = explicitTarget.closest(".form-field, .checkbox-line, .upload-field, .knowledge-form-field, .knowledge-check-line") || explicitTarget;
      field.classList.add("is-feedback-error");
      field.setAttribute("aria-invalid", "true");
      field.insertAdjacentElement("afterend", feedback);
      return;
    }

    const footer = context.querySelector(":scope > .layer-footer, :scope > .wizard-footer");
    if (footer) context.insertBefore(feedback, footer);
    else context.prepend(feedback);
  };

  window.clearInlineFeedback = clearInlineFeedback;

  window.showToast = function (message, type, target) {
    const text = String(message || "请检查当前填写内容");
    const feedbackType = ["success", "info", "warning", "error"].indexOf(type) !== -1 ? type : inferToastType(text);
    if (feedbackType === "success" || feedbackType === "info") return;
    window.showInlineFeedback(text, feedbackType, target);
  };

  function initInlineFeedback() {
    ["input", "change"].forEach(function (eventName) {
      document.addEventListener(eventName, function (event) {
        const context = event.target.closest(".prototype-modal, .side-drawer, .knowledge-modal, .knowledge-drawer, form, .content-card, .writing-ai-panel");
        if (context) clearInlineFeedback(context);
      });
    });
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-open-layer], [data-close-layer], [data-close-knowledge-layer]")) clearInlineFeedback();
    }, true);
  }

  function initHeader() {
    const root = document.getElementById("appHeader");
    if (!root) return;
    const activeKey = document.body.getAttribute("data-page") || "dashboard";
    root.innerHTML = buildHeader(activeKey);
    if (!document.getElementById("accountModalBackdrop")) root.insertAdjacentHTML("afterend", buildAccountLayers());

    const userTrigger = document.getElementById("userTrigger");
    const personalInfoMenuBtn = document.getElementById("personalInfoMenuBtn");
    const changePasswordMenuBtn = document.getElementById("changePasswordMenuBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (userTrigger) {
      userTrigger.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleUserPopover();
      });
    }

    if (personalInfoMenuBtn) personalInfoMenuBtn.addEventListener("click", function () { openAccountLayer("personalInfoModal"); });
    if (changePasswordMenuBtn) changePasswordMenuBtn.addEventListener("click", function () { openAccountLayer("changePasswordModal"); });
    document.getElementById("personalInfoForm").addEventListener("submit", saveProfile);
    document.getElementById("changePasswordForm").addEventListener("submit", savePassword);
    document.querySelectorAll("[data-close-account-layer]").forEach(function (button) { button.addEventListener("click", closeAccountLayers); });
    document.getElementById("accountModalBackdrop").addEventListener("click", closeAccountLayers);
    document.querySelectorAll("[data-password-target]").forEach(function (button) {
      button.addEventListener("click", function () {
        const input = document.getElementById(button.getAttribute("data-password-target"));
        const willShow = input.type === "password";
        input.type = willShow ? "text" : "password";
        button.classList.toggle("is-visible", willShow);
        button.title = willShow ? "隐藏密码" : "显示密码";
        button.setAttribute("aria-label", willShow ? "隐藏密码" : "显示密码");
      });
    });
    document.querySelectorAll(".account-modal input").forEach(function (input) {
      input.addEventListener("input", function () {
        const field = input.closest(".account-field");
        if (field) {
          field.classList.remove("has-error");
          const error = field.querySelector('small[id$="Error"]');
          if (error) error.textContent = "";
        }
        const feedback = input.closest(".account-modal").querySelector(".account-modal-feedback");
        if (feedback) feedback.className = "account-modal-feedback hidden";
      });
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        window.location.href = "login.html";
      });
    }

    document.addEventListener("click", function (event) {
      if (!event.target.closest(".top-actions")) closePopovers();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (document.querySelector(".account-modal.open")) closeAccountLayers();
        else closePopovers();
      }
    });
  }

  function initToastActions() {
    document.addEventListener("click", function (event) {
      const target = event.target.closest("[data-toast]");
      if (!target) return;
      event.preventDefault();
      window.showToast(target.getAttribute("data-toast"), target.getAttribute("data-toast-type") || undefined);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initHeader();
      initToastActions();
      initInlineFeedback();
    });
  } else {
    initHeader();
    initToastActions();
    initInlineFeedback();
  }
})();
