(function () {
  "use strict";

  const form = document.getElementById("loginForm");
  const loginPanel = document.querySelector(".login-panel");
  const accountInput = document.getElementById("accountInput");
  const passwordInput = document.getElementById("passwordInput");
  const rememberInput = document.getElementById("rememberInput");
  const passwordToggle = document.getElementById("passwordToggle");
  const forgotBtn = document.getElementById("forgotBtn");
  const loginBtn = document.getElementById("loginBtn");
  const recoveryCard = document.getElementById("recoveryCard");
  const recoveryBackBtn = document.getElementById("recoveryBackBtn");
  const recoveryVerifyForm = document.getElementById("recoveryVerifyForm");
  const recoveryResetForm = document.getElementById("recoveryResetForm");
  const recoverySuccess = document.getElementById("recoverySuccess");
  const recoveryAccountInput = document.getElementById("recoveryAccountInput");
  const verificationCodeInput = document.getElementById("verificationCodeInput");
  const sendCodeBtn = document.getElementById("sendVerificationCodeBtn");
  const sendCodeLabel = document.getElementById("sendCodeLabel");
  const verificationSendTip = document.getElementById("verificationSendTip");
  const newPasswordInput = document.getElementById("recoveryNewPasswordInput");
  const confirmPasswordInput = document.getElementById("recoveryConfirmPasswordInput");
  const returnToLoginBtn = document.getElementById("returnToLoginBtn");
  const loginResultNotice = document.getElementById("loginResultNotice");

  const profile = window.AppCurrentUser || {
    account: "toubiao",
    phone: "13800001001",
    email: "limingyuan@bidtech.cn"
  };
  const demoCode = "123456";
  const disabledDemoAccounts = ["zhaojy", "13800001005", "linrb", "13800001007"];
  let demoPassword = "123456";
  let activeChannel = "phone";
  let codeSent = false;
  let countdownTimer = 0;
  let countdownSeconds = 0;

  function setError(input, errorId, message) {
    const error = document.getElementById(errorId);
    if (error) error.textContent = message || "";
    if (input) input.classList.toggle("is-error", Boolean(message));
  }

  function restoreAccount() {
    try {
      const saved = localStorage.getItem("bidding-agent-account");
      if (saved && accountInput) accountInput.value = saved;
    } catch (error) {}
  }

  function validateLogin() {
    const account = accountInput ? accountInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";
    setError(accountInput, "accountError", account ? "" : "请输入登录账号");
    setError(passwordInput, "passwordError", password ? "" : "请输入登录密码");
    return Boolean(account && password);
  }

  function maskPhone(phone) {
    const text = String(phone || "");
    if (text.length !== 11) return "未维护手机号";
    return text.slice(0, 3) + "****" + text.slice(-4);
  }

  function maskEmail(email) {
    const text = String(email || "");
    const parts = text.split("@");
    if (parts.length !== 2) return "未维护邮箱";
    const local = parts[0];
    return local.slice(0, Math.min(3, local.length)) + "***@" + parts[1];
  }

  function updateMaskedContacts() {
    document.getElementById("maskedPhoneText").textContent = maskPhone(profile.phone);
    document.getElementById("maskedEmailText").textContent = maskEmail(profile.email);
  }

  function accountMatches() {
    const value = recoveryAccountInput.value.trim().toLowerCase();
    return value && (value === String(profile.account || "").toLowerCase() || value === String(profile.phone || "").toLowerCase());
  }

  function accountIsDisabled() {
    const value = recoveryAccountInput.value.trim().toLowerCase();
    return disabledDemoAccounts.indexOf(value) !== -1;
  }

  function clearCountdown() {
    if (countdownTimer) window.clearInterval(countdownTimer);
    countdownTimer = 0;
    countdownSeconds = 0;
  }

  function resetCodeState() {
    clearCountdown();
    codeSent = false;
    sendCodeBtn.disabled = false;
    sendCodeLabel.textContent = "发送验证码";
    verificationCodeInput.value = "";
    setError(verificationCodeInput, "verificationCodeError", "");
    verificationSendTip.classList.remove("expired");
    verificationSendTip.classList.add("hidden");
    verificationSendTip.textContent = "";
  }

  function startCountdown() {
    clearCountdown();
    countdownSeconds = 60;
    sendCodeBtn.disabled = true;
    sendCodeLabel.textContent = countdownSeconds + " 秒后重发";
    countdownTimer = window.setInterval(function () {
      countdownSeconds -= 1;
      if (countdownSeconds <= 0) {
        clearCountdown();
        codeSent = false;
        sendCodeBtn.disabled = false;
        sendCodeLabel.textContent = "重新发送";
        verificationSendTip.textContent = "验证码已过期，请重新发送。";
        verificationSendTip.classList.add("expired");
        verificationSendTip.classList.remove("hidden");
        return;
      }
      sendCodeLabel.textContent = countdownSeconds + " 秒后重发";
    }, 1000);
  }

  function resetSteps() {
    document.querySelector(".recovery-steps").classList.remove("is-reset");
    document.getElementById("verifyStepIndicator").className = "recovery-step active";
    document.getElementById("resetStepIndicator").className = "recovery-step";
  }

  function resetPasswordRules() {
    document.querySelectorAll("[data-password-rule]").forEach(function (rule) { rule.classList.remove("passed"); });
  }

  function resetRecoveryState() {
    resetCodeState();
    resetSteps();
    activeChannel = "phone";
    document.querySelectorAll("[data-recovery-channel]").forEach(function (button) {
      const active = button.getAttribute("data-recovery-channel") === activeChannel;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    recoveryVerifyForm.classList.remove("hidden");
    recoveryResetForm.classList.add("hidden");
    recoverySuccess.classList.add("hidden");
    document.getElementById("recoveryDescription").textContent = "验证账号身份后重新设置登录密码。";
    recoveryAccountInput.value = accountInput.value.trim() || profile.account;
    newPasswordInput.value = "";
    confirmPasswordInput.value = "";
    [newPasswordInput, confirmPasswordInput].forEach(function (input) { input.type = "password"; });
    document.querySelectorAll("[data-recovery-password-target]").forEach(function (button) {
      button.title = "显示密码";
      button.setAttribute("aria-label", "显示密码");
    });
    setError(recoveryAccountInput, "recoveryAccountError", "");
    setError(newPasswordInput, "recoveryNewPasswordError", "");
    setError(confirmPasswordInput, "recoveryConfirmPasswordError", "");
    resetPasswordRules();
    updateMaskedContacts();
  }

  function showRecovery() {
    form.classList.add("hidden");
    recoveryCard.classList.remove("hidden");
    loginPanel.classList.add("recovery-mode");
    loginResultNotice.classList.add("hidden");
    resetRecoveryState();
    window.setTimeout(function () { recoveryAccountInput.focus(); }, 20);
  }

  function showLogin(showSuccess) {
    clearCountdown();
    recoveryCard.classList.add("hidden");
    form.classList.remove("hidden");
    loginPanel.classList.remove("recovery-mode");
    if (showSuccess) {
      accountInput.value = recoveryAccountInput.value.trim() || profile.account;
      passwordInput.value = "";
      passwordInput.type = "password";
      passwordToggle.title = "显示密码";
      passwordToggle.setAttribute("aria-label", "显示密码");
      loginResultNotice.classList.remove("hidden");
      window.setTimeout(function () { passwordInput.focus(); }, 20);
    } else {
      loginResultNotice.classList.add("hidden");
    }
  }

  function sendVerificationCode() {
    setError(recoveryAccountInput, "recoveryAccountError", "");
    if (!recoveryAccountInput.value.trim()) {
      setError(recoveryAccountInput, "recoveryAccountError", "请输入登录账号或手机号");
      return;
    }
    if (accountIsDisabled()) {
      setError(recoveryAccountInput, "recoveryAccountError", "该账号已禁用，请联系管理员启用后再重置密码");
      return;
    }
    if (!accountMatches()) {
      setError(recoveryAccountInput, "recoveryAccountError", "账号信息无法验证，请确认后重试或联系管理员");
      return;
    }
    const target = activeChannel === "phone" ? maskPhone(profile.phone) : maskEmail(profile.email);
    if (target.indexOf("未维护") === 0) {
      setError(recoveryAccountInput, "recoveryAccountError", "当前账号未维护该联系方式，请选择其他验证方式");
      return;
    }
    codeSent = true;
    verificationSendTip.textContent = "验证码已发送至 " + target + "。";
    verificationSendTip.classList.remove("expired");
    verificationSendTip.classList.remove("hidden");
    startCountdown();
    verificationCodeInput.focus();
  }

  function enterResetStage(event) {
    event.preventDefault();
    let valid = true;
    if (!recoveryAccountInput.value.trim()) {
      setError(recoveryAccountInput, "recoveryAccountError", "请输入登录账号或手机号");
      valid = false;
    } else if (accountIsDisabled()) {
      setError(recoveryAccountInput, "recoveryAccountError", "该账号已禁用，请联系管理员启用后再重置密码");
      valid = false;
    } else if (!accountMatches()) {
      setError(recoveryAccountInput, "recoveryAccountError", "账号信息无法验证，请确认后重试或联系管理员");
      valid = false;
    }
    const code = verificationCodeInput.value.trim();
    if (!codeSent) {
      setError(verificationCodeInput, "verificationCodeError", verificationSendTip.classList.contains("expired") ? "验证码已过期，请重新发送" : "请先发送验证码");
      valid = false;
    } else if (!/^\d{6}$/.test(code)) {
      setError(verificationCodeInput, "verificationCodeError", "请输入 6 位验证码");
      valid = false;
    } else if (code !== demoCode) {
      setError(verificationCodeInput, "verificationCodeError", "验证码错误或已过期");
      valid = false;
    }
    if (!valid) return;

    clearCountdown();
    recoveryVerifyForm.classList.add("hidden");
    recoveryResetForm.classList.remove("hidden");
    document.querySelector(".recovery-steps").classList.add("is-reset");
    document.getElementById("verifyStepIndicator").className = "recovery-step completed";
    document.getElementById("resetStepIndicator").className = "recovery-step active";
    document.getElementById("recoveryDescription").textContent = "身份验证成功，请设置新的登录密码。";
    document.getElementById("recoveryAccountSummary").textContent = profile.account;
    newPasswordInput.focus();
  }

  function updatePasswordRules() {
    const value = newPasswordInput.value;
    const states = {
      length: value.length >= 8,
      letter: /[A-Za-z]/.test(value),
      number: /\d/.test(value)
    };
    Object.keys(states).forEach(function (key) {
      const rule = document.querySelector('[data-password-rule="' + key + '"]');
      if (rule) rule.classList.toggle("passed", states[key]);
    });
    return states.length && states.letter && states.number;
  }

  function completePasswordReset(event) {
    event.preventDefault();
    const next = newPasswordInput.value;
    const confirm = confirmPasswordInput.value;
    const rulesPassed = updatePasswordRules();
    let valid = true;
    setError(newPasswordInput, "recoveryNewPasswordError", "");
    setError(confirmPasswordInput, "recoveryConfirmPasswordError", "");
    if (!rulesPassed) {
      setError(newPasswordInput, "recoveryNewPasswordError", "新密码至少 8 位，并同时包含字母和数字");
      valid = false;
    } else if (next === demoPassword) {
      setError(newPasswordInput, "recoveryNewPasswordError", "新密码不能与原密码相同");
      valid = false;
    }
    if (!confirm) {
      setError(confirmPasswordInput, "recoveryConfirmPasswordError", "请再次输入新密码");
      valid = false;
    } else if (confirm !== next) {
      setError(confirmPasswordInput, "recoveryConfirmPasswordError", "两次输入的新密码不一致");
      valid = false;
    }
    if (!valid) return;

    demoPassword = next;
    recoveryResetForm.classList.add("hidden");
    recoverySuccess.classList.remove("hidden");
    document.getElementById("verifyStepIndicator").className = "recovery-step completed";
    document.getElementById("resetStepIndicator").className = "recovery-step completed";
    document.getElementById("recoveryDescription").textContent = "密码已更新，可以返回登录系统。";
    document.getElementById("recoverySuccessAccount").textContent = profile.account;
  }

  if (accountInput) {
    accountInput.addEventListener("input", function () {
      setError(accountInput, "accountError", "");
      loginResultNotice.classList.add("hidden");
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      setError(passwordInput, "passwordError", "");
      loginResultNotice.classList.add("hidden");
    });
  }

  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener("click", function () {
      const willShow = passwordInput.type === "password";
      passwordInput.type = willShow ? "text" : "password";
      passwordToggle.title = willShow ? "隐藏密码" : "显示密码";
      passwordToggle.setAttribute("aria-label", passwordToggle.title);
    });
  }

  forgotBtn.addEventListener("click", showRecovery);
  recoveryBackBtn.addEventListener("click", function () { showLogin(false); });
  returnToLoginBtn.addEventListener("click", function () { showLogin(true); });
  sendCodeBtn.addEventListener("click", sendVerificationCode);
  recoveryVerifyForm.addEventListener("submit", enterResetStage);
  recoveryResetForm.addEventListener("submit", completePasswordReset);

  document.querySelectorAll("[data-recovery-channel]").forEach(function (button) {
    button.addEventListener("click", function () {
      activeChannel = button.getAttribute("data-recovery-channel");
      document.querySelectorAll("[data-recovery-channel]").forEach(function (item) {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });
      resetCodeState();
    });
  });

  recoveryAccountInput.addEventListener("input", function () {
    setError(recoveryAccountInput, "recoveryAccountError", "");
    if (codeSent) resetCodeState();
  });

  verificationCodeInput.addEventListener("input", function () {
    verificationCodeInput.value = verificationCodeInput.value.replace(/\D/g, "").slice(0, 6);
    setError(verificationCodeInput, "verificationCodeError", "");
  });

  newPasswordInput.addEventListener("input", function () {
    setError(newPasswordInput, "recoveryNewPasswordError", "");
    updatePasswordRules();
  });

  confirmPasswordInput.addEventListener("input", function () {
    setError(confirmPasswordInput, "recoveryConfirmPasswordError", "");
  });

  document.querySelectorAll("[data-recovery-password-target]").forEach(function (button) {
    button.addEventListener("click", function () {
      const input = document.getElementById(button.getAttribute("data-recovery-password-target"));
      const willShow = input.type === "password";
      input.type = willShow ? "text" : "password";
      button.title = willShow ? "隐藏密码" : "显示密码";
      button.setAttribute("aria-label", button.title);
    });
  });

  if (form && loginBtn) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!validateLogin()) return;

      try {
        if (rememberInput && rememberInput.checked) {
          localStorage.setItem("bidding-agent-account", accountInput.value.trim());
        } else {
          localStorage.removeItem("bidding-agent-account");
        }
      } catch (error) {}

      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner"></span><span>正在进入工作台...</span>';
      window.setTimeout(function () {
        window.location.href = "dashboard.html";
      }, 520);
    });
  }

  restoreAccount();
  updateMaskedContacts();
})();
