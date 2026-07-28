(function () {
  "use strict";

  function all(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }
  function one(selector, root) { return (root || document).querySelector(selector); }
  function toast(message, type, target) { if (window.showToast) window.showToast(message, type, target); }
  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function saveCurrentProject(patch) {
    const current = (window.projectPrototype && window.projectPrototype.currentProject) || {};
    const next = Object.assign({}, current, patch || {});
    try { window.sessionStorage.setItem("biddingPendingProject", JSON.stringify(next)); } catch (error) { /* storage unavailable */ }
    if (window.projectPrototype) window.projectPrototype.currentProject = next;
    return next;
  }

  function initFilePage() {
    const parseDetailsToggle = one("#toggleFileParseDetails");
    const parseDetails = one("#fileParseStatusDetails");
    if (parseDetailsToggle && parseDetails) {
      parseDetailsToggle.addEventListener("click", function () {
        const willOpen = parseDetails.hasAttribute("hidden");
        if (willOpen) parseDetails.removeAttribute("hidden");
        else parseDetails.setAttribute("hidden", "");
        parseDetailsToggle.setAttribute("aria-expanded", String(willOpen));
        parseDetailsToggle.classList.toggle("active", willOpen);
        const label = parseDetailsToggle.querySelector("span:last-child");
        if (label) label.textContent = willOpen ? "收起详情" : "展开详情";
      });
    }

    const uploadModal = one("#addProjectFileModal");
    if (!uploadModal) return;
    const input = one("#projectFileInput");
    const zone = one("#projectFileUploadZone");
    const uploadList = one("#projectFileUploadList");
    let selectedFiles = [];
    let replacingRow = null;
    let deletingRow = null;
    const previewIcon = '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6H5V6h6"/></svg>';
    const replaceIcon = '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 14v5h14v-5"/></svg>';
    const deleteIcon = '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>';
    const warningIcon = '<svg viewBox="0 0 24 24"><path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
    const successIcon = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></svg>';

    function setReparseControls(isParsing) {
      const trigger = one('[data-open-layer="reparseProjectModal"]');
      const confirm = one("#confirmProjectReparse");
      if (trigger) {
        trigger.disabled = isParsing;
        trigger.classList.toggle("is-processing", isParsing);
        const label = trigger.querySelector("span:last-child");
        if (label) label.textContent = isParsing ? "解析中" : "重新解析";
      }
      if (confirm) {
        confirm.disabled = isParsing;
        confirm.classList.toggle("is-processing", isParsing);
        const label = confirm.querySelector("span:last-child");
        if (label) label.textContent = isParsing ? "正在解析" : "确认重新解析";
      }
    }

    function fileFormatMeta(name) {
      return window.BiddingFileIcons.meta(name);
    }

    function fileTypeIconMarkup(name) {
      return window.BiddingFileIcons.markup(name);
    }

    function refreshFileTypeIcon(row, name) {
      const currentIcon = row ? row.querySelector(".file-type-icon") : null;
      if (!currentIcon) return;
      const format = fileFormatMeta(name);
      currentIcon.className = "file-type-icon type-" + format.type;
      currentIcon.setAttribute("role", "img");
      currentIcon.setAttribute("aria-label", format.label);
      currentIcon.setAttribute("title", format.label);
      currentIcon.innerHTML = '<span class="file-format-mark">' + format.mark + '</span>';
    }

    all("[data-project-file-row]").forEach(function (row) {
      const nameNode = row.querySelector(".cell-stack strong");
      refreshFileTypeIcon(row, nameNode ? nameNode.textContent : "");
    });

    all(".file-table .row-actions").forEach(function (actions) {
      const previewButton = actions.querySelector(".text-btn:not(.replace-project-file-btn):not(.delete-project-file-btn)");
      const replaceButton = actions.querySelector(".replace-project-file-btn");
      if (previewButton) {
        const row = actions.closest("[data-project-file-row]");
        const nameNode = row ? row.querySelector(".cell-stack strong") : null;
        previewButton.classList.add("file-preview-btn");
        previewButton.removeAttribute("data-toast");
        previewButton.setAttribute("title", "在新页面预览");
        previewButton.setAttribute("aria-label", "在新页面预览" + (nameNode ? nameNode.textContent : "文件"));
        const previewButtonIcon = previewButton.querySelector(".btn-icon");
        if (previewButtonIcon) previewButtonIcon.innerHTML = previewIcon;
      }
      if (replaceButton) {
        replaceButton.setAttribute("title", "重新上传文件");
        const replaceButtonIcon = replaceButton.querySelector(".btn-icon");
        if (replaceButtonIcon) replaceButtonIcon.innerHTML = replaceIcon;
      }
    });

    function fileNameFromRow(row) {
      const strong = row ? row.querySelector(".cell-stack strong") : null;
      return strong ? strong.textContent : "该文件";
    }

    function openFilePreview(row) {
      const name = fileNameFromRow(row);
      const previewFiles = {
        "采购文件.doc": { profile: "procurement", size: "372 KB" },
        "技术需求及服务规范.pdf": { profile: "technical", size: "1.8 MB" },
        "投标文件格式及报价清单.xlsx": { profile: "quote", size: "86 KB" },
        "合同主要条款.pdf": { profile: "contract", size: "620 KB" },
        "澄清答疑纪要.pdf": { profile: "clarification", size: "428 KB" }
      };
      const preview = previewFiles[name] || { profile: "uploaded", size: "—" };
      window.BiddingFilePreview.open({
        profile: preview.profile,
        name: name,
        size: preview.size,
        context: "项目采购文件"
      });
    }

    function formatSize(bytes) {
      if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
      return (bytes / 1024 / 1024).toFixed(1) + " MB";
    }

    function renderSelectedFiles() {
      if (!uploadList) return;
      if (!selectedFiles.length) {
        uploadList.innerHTML = "";
        uploadList.hidden = true;
        return;
      }
      uploadList.hidden = false;
      uploadList.innerHTML = selectedFiles.map(function (file, index) {
        return '<div class="upload-file-row" data-modal-file-index="' + index + '">' + fileTypeIconMarkup(file.name) + '<div class="cell-stack"><strong>' + escapeHtml(file.name) + '</strong><span>' + (replacingRow ? "替换文件" : "补充附件") + ' · ' + file.size + '</span></div><div class="file-progress"><span class="table-progress-track"><b style="width:100%"></b></span><b>100%</b></div><button class="ghost-btn compact-btn remove-modal-upload-file" type="button"><span class="btn-icon">' + deleteIcon + '</span><span>移除</span></button></div>';
      }).join("");
    }

    function addSelectedFiles(fileList) {
      const incoming = Array.from(fileList).map(function (file) {
        return { name: file.name, size: formatSize(file.size) };
      });
      selectedFiles = replacingRow ? incoming.slice(0, 1) : selectedFiles.concat(incoming);
      renderSelectedFiles();
    }

    function updateFileCount() {
      const count = all("[data-project-file-row]").length;
      const node = one("#projectFileCount");
      if (node) node.textContent = String(count);
    }

    function markFilesChanged() {
      const currentProject = window.projectPrototype.currentProject || {};
      if (currentProject.status === "parsing") return;
      const card = one("#fileParseStatusCard");
      if (!card) return;
      card.classList.remove("completed", "parsing");
      card.classList.add("pending");
      card.setAttribute("data-parse-state", "pending");
      const icon = one("#fileParseStatusIcon");
      if (icon) icon.innerHTML = warningIcon;
      one("#fileParseStatusTitle").textContent = "文件清单已发生变化";
      one("#fileParseStatusDescription").textContent = "变更文件尚未参与解析，重新解析后会更新项目信息和全部业务数据。";
      const tag = one("#fileParseStatusTag");
      if (tag) { tag.className = "status-tag orange"; tag.textContent = "待重新解析"; }
      const completeNote = one("#fileParseCompleteNote");
      if (completeNote) completeNote.classList.add("hidden");
    }

    function startParseSimulation() {
      const currentProject = window.projectPrototype.currentProject || {};
      const statusCard = one("#fileParseStatusCard");
      if (currentProject.status !== "parsing" || !statusCard) return;
      setReparseControls(true);

      const duration = 15000;
      const projectId = currentProject.id || "BID-202601-001";
      const storageKey = "biddingParseStartedAt:" + projectId;
      let startedAt = Date.now();
      try {
        const savedStartedAt = Number(window.sessionStorage.getItem(storageKey));
        if (savedStartedAt > 0) startedAt = savedStartedAt;
        else window.sessionStorage.setItem(storageKey, String(startedAt));
      } catch (error) { /* storage unavailable */ }

      const stepNames = {
        3: "OCR 与页码索引",
        4: "项目信息识别",
        5: "招标要求结构化解析",
        6: "生成解析结果"
      };

      function setTag(id, tone, text) {
        const node = one("#" + id);
        if (!node) return;
        node.className = "status-tag " + tone + (node.classList.contains("parse-step-status") ? " parse-step-status" : "");
        node.textContent = text;
      }

      function setMetric(id, value, description) {
        const node = one("#" + id);
        if (!node) return;
        node.textContent = value;
        if (description && node.nextElementSibling) node.nextElementSibling.textContent = description;
      }

      function updateWorkspaceProgress(progress, stepName, currentStep) {
        const progressItem = one(".project-status-grid .project-status-item:nth-child(2)");
        if (progressItem) {
          const value = progressItem.querySelector("strong");
          const bar = progressItem.querySelector(".mini-progress b");
          const hint = progressItem.querySelector("small");
          if (value) value.textContent = progress + "%";
          if (bar) bar.style.width = progress + "%";
          if (hint && hint.firstChild) hint.firstChild.nodeValue = "当前步骤：" + stepName + " ";
        }
        const parseItem = one(".project-status-grid .project-status-item:nth-child(4) strong");
        if (parseItem) parseItem.textContent = "正在解析第 " + currentStep + " / 6 步";
      }

      function updateStepRows(currentStep, pageCount, infoCount, requirementCount) {
        all("[data-file-parse-step]", statusCard).forEach(function (row) {
          const step = Number(row.getAttribute("data-file-parse-step"));
          const status = row.querySelector(".parse-step-status");
          row.classList.toggle("current", step === currentStep);
          if (!status) return;
          if (step < currentStep) {
            status.className = "status-tag green parse-step-status";
            status.textContent = "已完成";
          } else if (step === currentStep) {
            status.className = "status-tag blue parse-step-status";
            status.textContent = "进行中";
          } else {
            status.className = "status-tag gray parse-step-status";
            status.textContent = "等待中";
          }
        });

        const currentDescription = statusCard.querySelector('[data-file-parse-step="' + currentStep + '"] > div span');
        if (!currentDescription) return;
        if (currentStep === 3) currentDescription.textContent = "已处理 " + pageCount + " / 34 页，正在建立原文与页码索引";
        if (currentStep === 4) currentDescription.textContent = "已识别 " + infoCount + " / 8 项信息，正在提取项目关键字段";
        if (currentStep === 5) currentDescription.textContent = "已提取 " + requirementCount + " / 93 条要求，正在结构化归类";
        if (currentStep === 6) currentDescription.textContent = "正在汇总项目信息、招标要求和来源定位";
      }

      function updateFileStatuses(ratio, currentStep) {
        const statuses = all(".file-parse-status");
        const attachmentCount = Math.max(0, statuses.length - 1);
        const attachmentRatio = Math.max(0, Math.min(1, (ratio - .55) / .35));
        const completedAttachments = Math.floor(attachmentRatio * attachmentCount);
        statuses.forEach(function (status, index) {
          let tone = "gray";
          let text = "排队中";
          if (index === 0) {
            tone = currentStep === 3 ? "blue" : "green";
            text = currentStep === 3 ? "解析中" : "解析完成";
          } else if (currentStep >= 6 || index <= completedAttachments) {
            tone = "green";
            text = "解析完成";
          } else if (currentStep >= 4 && index === completedAttachments + 1) {
            tone = "blue";
            text = "解析中";
          }
          status.className = "status-tag " + tone + " file-parse-status";
          status.textContent = text;
        });
      }

      function renderFrame(ratio) {
        const fileCount = all("[data-project-file-row]").length;
        const attachmentCount = Math.max(0, fileCount - 1);
        const progress = Math.min(99, Math.round(12 + ratio * 87));
        const currentStep = ratio < .55 ? 3 : ratio < .70 ? 4 : ratio < .90 ? 5 : 6;
        const pageRatio = Math.min(1, ratio / .55);
        const infoRatio = Math.max(0, Math.min(1, (ratio - .55) / .15));
        const requirementRatio = Math.max(0, Math.min(1, (ratio - .70) / .20));
        const pageCount = Math.min(34, Math.round(8 + pageRatio * 26));
        const infoCount = Math.min(8, Math.floor(infoRatio * 9));
        const requirementCount = Math.min(93, Math.floor(requirementRatio * 94));
        const remainingSeconds = Math.max(1, Math.ceil((duration * (1 - ratio)) / 1000));
        const stepName = stepNames[currentStep];

        one("#fileParseStatusTitle").textContent = "招标文件解析中";
        one("#fileParseStatusDescription").textContent = "当前执行第 " + currentStep + " / 6 步：" + stepName + "。预计约 " + remainingSeconds + " 秒后完成。";
        setTag("fileParseStatusTag", "blue", "解析中 " + progress + "%");
        updateWorkspaceProgress(progress, stepName, currentStep);
        updateStepRows(currentStep, pageCount, infoCount, requirementCount);
        updateFileStatuses(ratio, currentStep);

        setMetric("projectFileCount", String(fileCount), attachmentCount ? "主文件 1、附件 " + attachmentCount + "，正在解析" : "主文件正在解析");
        setMetric("projectParsedPageCount", pageCount + " / 34", pageCount < 34 ? "正在处理第 " + Math.min(34, pageCount + 1) + " 页" : "全部页面已建立来源定位");
        setMetric("projectRequirementCount", currentStep < 4 ? "待生成" : infoCount + " 项 / " + requirementCount + " 条", "项目信息 " + infoCount + " 项、招标要求 " + requirementCount + " 条");
        setMetric("projectLatestParseTime", "剩余约 " + remainingSeconds + " 秒", "任务在后台持续执行");

        setMetric("mainParseTaskDescription", pageCount < 34 ? "已完成 " + pageCount + " / 34 页" : "34 页全部处理完成");
        setTag("mainParseTaskStatus", pageCount < 34 ? "blue" : "green", pageCount < 34 ? "进行中" : "已完成");
        if (attachmentCount) {
          setMetric("attachmentParseTaskDescription", currentStep < 4 ? attachmentCount + " 份附件排队中" : currentStep < 6 ? "正在同步识别 " + attachmentCount + " 份附件" : attachmentCount + " 份附件全部识别完成");
          setTag("attachmentParseTaskStatus", currentStep < 4 ? "gray" : currentStep < 6 ? "blue" : "green", currentStep < 4 ? "排队中" : currentStep < 6 ? "进行中" : "已完成");
        } else {
          setMetric("attachmentParseTaskDescription", "未检测到独立附件");
          setTag("attachmentParseTaskStatus", "gray", "不适用");
        }
        if (currentStep < 5) {
          setMetric("resultParseTaskDescription", "等待文件结构解析完成");
          setTag("resultParseTaskStatus", "gray", "等待中");
        } else {
          setMetric("resultParseTaskDescription", currentStep === 5 ? "正在汇总识别结果与来源定位" : "正在生成最终解析结果");
          setTag("resultParseTaskStatus", "blue", "进行中");
        }
      }

      function completeSimulation() {
        const fileCount = all("[data-project-file-row]").length;
        const attachmentCount = Math.max(0, fileCount - 1);
        const now = new Date();
        const pad = function (value) { return String(value).padStart(2, "0"); };
        const completedAt = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
        statusCard.classList.remove("parsing");
        statusCard.classList.add("completed");
        statusCard.setAttribute("data-parse-state", "completed");
        setReparseControls(false);
        one("#fileParseStatusIcon").innerHTML = successIcon;
        one("#fileParseStatusTitle").textContent = "当前解析完成";
        one("#fileParseStatusDescription").textContent = "已处理 " + fileCount + " 份文件并识别 93 条采购要求，解析结果可用于后续业务页面。";
        setTag("fileParseStatusTag", "green", "解析完成");
        all("[data-file-parse-step]", statusCard).forEach(function (row) {
          row.classList.remove("current");
          const status = row.querySelector(".parse-step-status");
          if (status) { status.className = "status-tag green parse-step-status"; status.textContent = "已完成"; }
        });
        all(".file-parse-status").forEach(function (status) { status.className = "status-tag green file-parse-status"; status.textContent = "解析完成"; });
        setMetric("projectFileCount", String(fileCount), attachmentCount ? "主文件 1、附件 " + attachmentCount + "，全部解析完成" : "主文件 1，解析完成");
        setMetric("projectParsedPageCount", attachmentCount === 4 ? "74 页 / 3 表" : "34 / 34", attachmentCount === 4 ? "页面及工作表均已建立来源定位" : "所有页面均已建立来源定位");
        setMetric("projectRequirementCount", "8 项 / 93 条", "项目信息 8 项、采购要求 93 条");
        setMetric("projectLatestParseTime", pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()), "本次模拟解析耗时约 15 秒");
        setMetric("mainParseTaskDescription", "34 页全部处理完成");
        setTag("mainParseTaskStatus", "green", "已完成");
        setMetric("attachmentParseTaskDescription", attachmentCount ? attachmentCount + " 份附件全部识别完成" : "未检测到独立附件");
        setTag("attachmentParseTaskStatus", attachmentCount ? "green" : "gray", attachmentCount ? "已完成" : "不适用");
        setMetric("resultParseTaskDescription", "已生成 8 项项目信息和 93 条要求");
        setTag("resultParseTaskStatus", "green", "已完成");
        const completeNote = one("#fileParseCompleteNote");
        if (completeNote) {
          completeNote.classList.remove("hidden");
          const noteValue = completeNote.querySelector("strong");
          const noteHint = completeNote.querySelector("small");
          if (noteValue) noteValue.textContent = completedAt;
          if (noteHint) noteHint.textContent = "模拟解析耗时约 15 秒 · AI 已完成资格研判和投标事项整理";
        }
        updateWorkspaceProgress(100, "生成解析结果", 6);

        const completedProject = Object.assign({}, currentProject, {
          status: "ongoing",
          stage: "解析结果",
          stageDetail: "待确认生成投标文件",
          progress: 38,
          purchaser: currentProject.purchaser && currentProject.purchaser.indexOf("识别") === -1 ? currentProject.purchaser : "某港口集团有限公司",
          budget: currentProject.budget && currentProject.budget !== "待解析" ? currentProject.budget : "60 万元",
          deadline: currentProject.deadline && currentProject.deadline !== "待解析" ? currentProject.deadline : "待从平台公告补充",
          deadlineText: "解析完成，待确认生成投标文件",
          parseCompletedAt: now.toISOString(),
          parseDurationText: "约 15 秒"
        });
        try {
          window.sessionStorage.setItem("biddingPendingProject", JSON.stringify(completedProject));
          window.sessionStorage.removeItem(storageKey);
        } catch (error) { /* storage unavailable */ }
        toast("AI 已完成解析，正在进入解析结果");
        window.setTimeout(function () {
          window.location.href = "project-analysis.html?id=" + encodeURIComponent(completedProject.id || "BID-202601-001");
        }, 900);
      }

      let timer = 0;
      let finishing = false;
      function tick() {
        const ratio = Math.max(0, Math.min(1, (Date.now() - startedAt) / duration));
        renderFrame(ratio);
        if (ratio >= 1 && !finishing) {
          finishing = true;
          if (timer) window.clearInterval(timer);
          completeSimulation();
        }
      }
      tick();
      if (!finishing) timer = window.setInterval(tick, 250);
    }

    startParseSimulation();

    function resetUploadModal() {
      selectedFiles = [];
      one("#projectFileModalTitle").textContent = replacingRow ? "重新上传招标文件" : "补传招标文件";
      input.multiple = !replacingRow;
      input.value = "";
      renderSelectedFiles();
    }

    function appendFileRow(name, size) {
      const tableBody = one("#projectFileTableBody");
      if (tableBody) {
        const row = document.createElement("tr");
        row.setAttribute("data-project-file-row", "");
        row.setAttribute("data-file-type", "attachment");
        row.innerHTML = '<td><div class="file-name-cell">' + fileTypeIconMarkup(name) + '<div class="cell-stack"><strong>' + escapeHtml(name) + '</strong><span>李明远 · 刚刚上传</span></div></div></td><td>招标附件</td><td>' + size + '</td><td><span class="status-tag orange file-parse-status">待重新解析</span></td><td><div class="row-actions"><button class="text-btn compact-btn file-preview-btn" type="button" title="在新页面预览" aria-label="在新页面预览文件"><span class="btn-icon">' + previewIcon + '</span><span>预览</span></button><button class="text-btn compact-btn replace-project-file-btn" type="button" title="重新上传文件"><span class="btn-icon">' + replaceIcon + '</span><span>重新上传</span></button><button class="text-btn compact-btn delete-project-file-btn" type="button"><span class="btn-icon">' + deleteIcon + '</span><span>删除</span></button></div></td>';
        tableBody.appendChild(row);
      } else {
        const firstRow = one("[data-project-file-row]");
        const container = firstRow ? firstRow.parentElement : null;
        if (!container) return;
        const row = document.createElement("div");
        row.className = "file-version-item";
        row.setAttribute("data-project-file-row", "");
        row.setAttribute("data-file-type", "attachment");
        row.innerHTML = fileTypeIconMarkup(name) + '<div class="cell-stack"><strong>' + escapeHtml(name) + '</strong><span>招标附件 · 上传完成 · 等待解析</span></div><div class="inline-actions"><button class="text-btn compact-btn replace-project-file-btn" type="button"><span class="btn-icon">' + replaceIcon + '</span><span>重新上传</span></button><button class="text-btn compact-btn delete-project-file-btn" type="button"><span class="btn-icon">' + deleteIcon + '</span><span>删除</span></button></div>';
        const loading = container.querySelector(".loading-line");
        container.insertBefore(row, loading || null);
      }
    }

    document.addEventListener("click", function (event) {
      const previewButton = event.target.closest(".file-preview-btn");
      if (previewButton) {
        event.preventDefault();
        openFilePreview(previewButton.closest("[data-project-file-row]"));
        return;
      }
      const addButton = event.target.closest(".add-project-file-btn");
      if (addButton) {
        replacingRow = null;
        resetUploadModal();
      }
      const replaceButton = event.target.closest(".replace-project-file-btn");
      if (replaceButton) {
        replacingRow = replaceButton.closest("[data-project-file-row]");
        resetUploadModal();
        window.projectPrototype.openLayer("addProjectFileModal");
      }
      const deleteButton = event.target.closest(".delete-project-file-btn");
      if (deleteButton) {
        deletingRow = deleteButton.closest("[data-project-file-row]");
        one("#deleteProjectFileName").textContent = "确认删除“" + fileNameFromRow(deletingRow) + "”？";
        window.projectPrototype.openLayer("deleteProjectFileModal");
      }
    });
    zone.addEventListener("click", function () { input.click(); });
    zone.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); input.click(); }
    });
    input.addEventListener("change", function () {
      if (!input.files.length) return;
      addSelectedFiles(input.files);
      input.value = "";
    });
    ["dragenter", "dragover"].forEach(function (name) { zone.addEventListener(name, function (event) { event.preventDefault(); zone.classList.add("dragover"); }); });
    ["dragleave", "drop"].forEach(function (name) { zone.addEventListener(name, function (event) { event.preventDefault(); zone.classList.remove("dragover"); }); });
    zone.addEventListener("drop", function (event) { if (event.dataTransfer.files.length) addSelectedFiles(event.dataTransfer.files); });
    uploadList.addEventListener("click", function (event) {
      const button = event.target.closest(".remove-modal-upload-file");
      if (!button) return;
      const index = Number(button.closest("[data-modal-file-index]").getAttribute("data-modal-file-index"));
      selectedFiles.splice(index, 1);
      renderSelectedFiles();
    });
    one("#confirmProjectFileUpload").addEventListener("click", function () {
      if (!selectedFiles.length) { toast("请选择需要上传的招标文件", "warning", "#projectFileUploadZone"); return; }
      if (replacingRow) {
        const name = selectedFiles[0].name;
        replacingRow.querySelector(".cell-stack strong").textContent = name;
        refreshFileTypeIcon(replacingRow, name);
        const detail = replacingRow.querySelector(".cell-stack span");
        if (detail) detail.textContent = "李明远 · 刚刚重新上传";
        const sizeCell = replacingRow.children[2];
        if (sizeCell) sizeCell.textContent = selectedFiles[0].size;
        const status = replacingRow.querySelector(".file-parse-status");
        if (status) { status.className = "status-tag orange file-parse-status"; status.textContent = "待重新解析"; }
      } else {
        selectedFiles.forEach(function (file) { appendFileRow(file.name, file.size); });
      }
      updateFileCount();
      markFilesChanged();
      window.projectPrototype.closeLayers();
    });
    one("#confirmDeleteProjectFile").addEventListener("click", function () {
      if (deletingRow) deletingRow.remove();
      deletingRow = null;
      updateFileCount();
      markFilesChanged();
      window.projectPrototype.closeLayers();
    });
    one("#confirmProjectReparse").addEventListener("click", function () {
      if (!all("[data-project-file-row]").length) { toast("请至少保留一份主招标文件", "warning", "#reparseProjectModal .info-alert"); return; }
      const confirmButton = this;
      confirmButton.disabled = true;
      confirmButton.classList.add("is-processing");
      const confirmLabel = confirmButton.querySelector("span:last-child");
      if (confirmLabel) confirmLabel.textContent = "正在启动解析";
      const parsingProject = saveCurrentProject({ status: "parsing", stage: "解析中", progress: 6, fileName: fileNameFromRow(one("[data-project-file-row]")) });
      try {
        window.sessionStorage.setItem("biddingParseStartedAt:" + (parsingProject.id || "BID-202601-001"), String(Date.now()));
      } catch (error) { /* storage unavailable */ }
      window.setTimeout(function () {
        window.projectPrototype.closeLayers();
        if (window.projectPrototype.applyProjectState) window.projectPrototype.applyProjectState("files", parsingProject);
        setReparseControls(true);
        startParseSimulation();
      }, 180);
    });
  }

  function initAnalysisPage() {
    const tableBody = one("#resultMatterBody");
    if (!tableBody) return;
    const categoryDefinitions = [
      { key: "qualification", count: 1, prefix: "ZG" },
      { key: "score", count: 7, prefix: "PF" },
      { key: "business", count: 14, prefix: "SW" },
      { key: "technical", count: 62, prefix: "JS" },
      { key: "delivery", count: 9, prefix: "GS" }
    ];
    const processIcon = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4M4 20l1-4 3 3z"/></svg>';
    function ensureProcessCell(row) {
      if (row.querySelector(".result-process-btn")) return;
      const cell = document.createElement("td");
      cell.className = "result-process-cell";
      cell.innerHTML = '<button class="text-btn compact-btn result-process-btn" type="button" data-open-layer="resultProcessModal">' + processIcon + '<span>处理</span></button>';
      row.appendChild(cell);
    }
    const templateRows = all("tr", tableBody).map(function (row) { return row.cloneNode(true); });
    const rowsByCategory = {};
    categoryDefinitions.forEach(function (definition) {
      const templates = templateRows.filter(function (row) { return row.getAttribute("data-result-category") === definition.key; });
      rowsByCategory[definition.key] = Array.from({ length: definition.count }, function (_, index) {
        const row = templates[index % templates.length].cloneNode(true);
        const code = row.querySelector(".matter-code");
        if (code) code.textContent = definition.prefix + "-" + String(index + 1).padStart(3, "0");
        ensureProcessCell(row);
        if (index >= templates.length) {
          const source = row.querySelector(".result-source-btn");
          const sourceLabel = source && source.querySelector("span");
          const page = 2 + ((index * 5) % 33);
          if (sourceLabel) sourceLabel.textContent = "采购文件 · 第" + page + "页";
          if (source) {
            source.setAttribute("data-source", "采购文件 · 第" + page + "页 · AI来源定位");
            source.setAttribute("data-page", String(page));
            source.setAttribute("data-section", "AI来源定位");
          }
        }
        return row;
      });
    });
    const matterRows = [];
    let round = 0;
    let hasRow = true;
    while (hasRow) {
      hasRow = false;
      categoryDefinitions.forEach(function (definition) {
        const row = rowsByCategory[definition.key][round];
        if (row) { matterRows.push(row); hasRow = true; }
      });
      round += 1;
    }
    let activeMatterFilter = "all";
    let matterPageSize = 10;
    let matterPage = 1;
    const pageSizeSelect = one("#resultMatterPageSize");
    const pageNumbers = one("#resultMatterPageNumbers");
    const prevButton = one("#resultMatterPrev");
    const nextButton = one("#resultMatterNext");

    function pageSequence(totalPages, currentPage) {
      if (totalPages <= 7) return Array.from({ length: totalPages }, function (_, index) { return index + 1; });
      const pages = [1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter(function (page) { return page >= 1 && page <= totalPages; });
      const unique = Array.from(new Set(pages)).sort(function (a, b) { return a - b; });
      const sequence = [];
      unique.forEach(function (page, index) {
        if (index && page - unique[index - 1] > 1) sequence.push("ellipsis-" + index);
        sequence.push(page);
      });
      return sequence;
    }

    function renderMatterPage() {
      const filteredRows = matterRows.filter(function (row) { return activeMatterFilter === "all" || row.getAttribute("data-result-category") === activeMatterFilter; });
      const total = filteredRows.length;
      const totalPages = Math.max(1, Math.ceil(total / matterPageSize));
      matterPage = Math.min(Math.max(1, matterPage), totalPages);
      const start = (matterPage - 1) * matterPageSize;
      const end = Math.min(start + matterPageSize, total);
      const fragment = document.createDocumentFragment();
      filteredRows.slice(start, end).forEach(function (row) { fragment.appendChild(row.cloneNode(true)); });
      tableBody.replaceChildren(fragment);
      one("#resultMatterTotal").textContent = String(total);
      prevButton.disabled = matterPage <= 1;
      nextButton.disabled = matterPage >= totalPages;
      pageNumbers.innerHTML = pageSequence(totalPages, matterPage).map(function (page) {
        if (typeof page === "string") return '<span class="matter-page-ellipsis">…</span>';
        return '<button class="page-number-btn' + (page === matterPage ? ' active' : '') + '" type="button" data-result-page="' + page + '" aria-label="第' + page + '页"' + (page === matterPage ? ' aria-current="page"' : '') + '>' + page + '</button>';
      }).join("");
    }

    all("[data-result-filter]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeMatterFilter = button.getAttribute("data-result-filter");
        matterPage = 1;
        all("[data-result-filter]").forEach(function (item) { item.classList.toggle("active", item === button); });
        renderMatterPage();
      });
    });
    pageSizeSelect.addEventListener("change", function () {
      matterPageSize = Number(pageSizeSelect.value) || 10;
      matterPage = 1;
      renderMatterPage();
    });
    prevButton.addEventListener("click", function () { if (matterPage > 1) { matterPage -= 1; renderMatterPage(); } });
    nextButton.addEventListener("click", function () { matterPage += 1; renderMatterPage(); });
    pageNumbers.addEventListener("click", function (event) {
      const button = event.target.closest("[data-result-page]");
      if (!button) return;
      matterPage = Number(button.getAttribute("data-result-page"));
      renderMatterPage();
    });
    renderMatterPage();

    const processRecords = {};
    let activeProcessCode = "";
    let activeProcessStatus = "";
    let selectedProcessFiles = [];
    const processNote = one("#resultProcessNote");
    const processFileInput = one("#resultProcessFileInput");
    const processAttachmentList = one("#resultProcessAttachments");
    const rerunScoreButton = one("#rerunScoreForecast");

    function statusKey(label) {
      if (label === "不满足") return "unmet";
      if (label === "AI处理") return "ai";
      return "satisfied";
    }

    function statusTone(key) {
      if (key === "unmet") return "red";
      if (key === "ai") return "blue";
      return "green";
    }

    function formatProcessFileSize(size) {
      const bytes = Number(size || 0);
      if (!bytes) return "已选择";
      if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
      return (bytes / 1024 / 1024).toFixed(1) + " MB";
    }

    function renderProcessAttachments() {
      processAttachmentList.innerHTML = selectedProcessFiles.map(function (file, index) {
        return '<div><span><svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v5h5"/></svg></span><div><strong>' + escapeHtml(file.name) + '</strong><small>' + escapeHtml(file.sizeText || formatProcessFileSize(file.size)) + '</small></div><button type="button" data-remove-process-file="' + index + '" aria-label="移除' + escapeHtml(file.name) + '"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>';
      }).join("");
      processAttachmentList.hidden = selectedProcessFiles.length === 0;
    }

    function openProcessForRow(row) {
      const code = one(".matter-code", row).textContent.trim();
      const title = (one(".result-source-btn", row).getAttribute("data-title") || "投标事项").trim();
      const requirement = row.children[1].textContent.trim();
      const label = one(".status-tag", row).textContent.trim();
      const record = processRecords[code];
      activeProcessCode = code;
      activeProcessStatus = statusKey(label);
      selectedProcessFiles = record ? record.files.map(function (file) { return Object.assign({}, file); }) : [];
      one("#resultProcessCode").textContent = code;
      one("#resultProcessTitle").textContent = title;
      one("#resultProcessRequirement").textContent = requirement;
      one("#resultProcessStatus").className = "status-tag " + statusTone(activeProcessStatus);
      one("#resultProcessStatus").textContent = label;
      processNote.value = record ? record.note : "";
      one("#resultProcessNoteCount").textContent = processNote.value.length + " / 500";
      one("#resultProcessAlert").classList.toggle("hidden", activeProcessStatus !== "unmet");
      processFileInput.value = "";
      renderProcessAttachments();
    }

    function updateProcessedMatter(code, nextStatus, note, files) {
      matterRows.forEach(function (row) {
        const codeNode = one(".matter-code", row);
        if (!codeNode || codeNode.textContent.trim() !== code) return;
        const tag = one(".status-tag", row);
        const strategy = one(".matter-strategy", row);
        const evidence = one("td:nth-child(3) small", row);
        const processButton = one(".result-process-btn", row);
        tag.className = "status-tag " + statusTone(nextStatus);
        tag.textContent = nextStatus === "satisfied" ? "已满足" : "AI处理";
        row.setAttribute("data-result-status", nextStatus);
        if (nextStatus === "satisfied") {
          strategy.textContent = "已补充处理说明及有效附件，当前项目材料已重新匹配。";
          evidence.textContent = files.length ? files.map(function (file) { return file.name; }).join("、") + " · 已核验" : "处理说明 · 已更新";
        } else {
          strategy.textContent = "已补充处理说明，AI 将按最新要求更新响应内容。";
          evidence.textContent = "处理说明 · AI处理依据已更新";
        }
        processButton.classList.add("processed");
        processButton.setAttribute("title", "已完成处理，可再次处理");
        processButton.setAttribute("aria-label", code + "已完成处理，可再次处理");
        processButton.setAttribute("data-process-note", note);
      });
    }

    tableBody.addEventListener("click", function (event) {
      const processButton = event.target.closest(".result-process-btn");
      if (processButton) {
        openProcessForRow(processButton.closest("tr"));
        return;
      }
      const source = event.target.closest(".result-source-btn");
      if (!source) return;
      const title = source.getAttribute("data-title") || "招标条款";
      const location = source.getAttribute("data-source") || "采购文件 · AI来源定位";
      const original = source.getAttribute("data-original") || "当前条款原文暂未识别。";
      const file = source.getAttribute("data-file") || "采购文件.doc";
      const section = source.getAttribute("data-section") || "AI来源定位";
      const pageMatch = location.match(/第(\d+)页/);
      const page = source.getAttribute("data-page") || (pageMatch ? pageMatch[1] : "-");
      one("#resultSourceTitle").textContent = title;
      one("#resultSourceLocation").textContent = location;
      one("#resultSourceFile").textContent = file;
      one("#resultSourcePageSection").textContent = "第" + page + "页 · " + section;
      one("#resultSourceOriginal").textContent = original;
      one("#resultSourcePreviewFile").textContent = file;
      one("#resultSourcePageBadge").textContent = "第" + page + "页";
      one("#resultSourceScreenshotSection").textContent = section;
      one("#resultSourceScreenshotOriginal").textContent = original;
      one("#resultSourceScreenshotPage").textContent = "— " + page + " —";
      one("#resultSourceScreenshot").setAttribute("aria-label", file + "第" + page + "页原文截图，已高亮" + title + "条款");
    });

    processNote.addEventListener("input", function () {
      one("#resultProcessNoteCount").textContent = processNote.value.length + " / 500";
    });

    processFileInput.addEventListener("change", function () {
      const added = Array.from(processFileInput.files || []).map(function (file) {
        return { name: file.name, size: file.size, sizeText: formatProcessFileSize(file.size) };
      });
      added.forEach(function (file) {
        if (!selectedProcessFiles.some(function (current) { return current.name === file.name; })) selectedProcessFiles.push(file);
      });
      processFileInput.value = "";
      renderProcessAttachments();
    });

    processAttachmentList.addEventListener("click", function (event) {
      const remove = event.target.closest("[data-remove-process-file]");
      if (!remove) return;
      selectedProcessFiles.splice(Number(remove.getAttribute("data-remove-process-file")), 1);
      renderProcessAttachments();
    });

    one("#saveResultProcess").addEventListener("click", function () {
      const note = processNote.value.trim();
      if (!note) { toast("请填写处理说明", "warning", processNote); return; }
      if (activeProcessStatus === "unmet" && !selectedProcessFiles.length) { toast("该事项缺少真实材料，请上传附件", "warning", ".result-process-upload"); return; }
      const nextStatus = activeProcessStatus === "unmet" ? "satisfied" : activeProcessStatus;
      processRecords[activeProcessCode] = { note: note, files: selectedProcessFiles.map(function (file) { return Object.assign({}, file); }), status: nextStatus };
      updateProcessedMatter(activeProcessCode, nextStatus, note, selectedProcessFiles);
      rerunScoreButton.disabled = false;
      rerunScoreButton.removeAttribute("title");
      renderMatterPage();
      window.projectPrototype.closeLayers();
      toast("处理已保存，可以重新预测评分");
    });

    const scoreForecastCard = one("#scoreForecastStatusCard");
    const scoreForecastDetails = one("#scoreForecastStatusDetails");
    const scoreForecastDetailsToggle = one("#toggleScoreForecastDetails");
    const confirmScoreForecast = one("#confirmScoreForecast");

    scoreForecastDetailsToggle.addEventListener("click", function () {
      const willOpen = scoreForecastDetails.hasAttribute("hidden");
      if (willOpen) scoreForecastDetails.removeAttribute("hidden");
      else scoreForecastDetails.setAttribute("hidden", "");
      scoreForecastDetailsToggle.setAttribute("aria-expanded", String(willOpen));
      scoreForecastDetailsToggle.classList.toggle("active", willOpen);
      scoreForecastDetailsToggle.querySelector("span:last-child").textContent = willOpen ? "收起详情" : "展开详情";
    });

    function setScoreForecastTag(id, tone, text) {
      const node = one("#" + id);
      node.className = "status-tag " + tone + (node.classList.contains("parse-step-status") ? " parse-step-status" : "");
      node.textContent = text;
    }

    function setScoreForecastMetric(id, value, description) {
      const node = one("#" + id);
      node.textContent = value;
      if (description && node.nextElementSibling) node.nextElementSibling.textContent = description;
    }

    function updateScoreForecastSteps(currentStep) {
      all("[data-score-forecast-step]", scoreForecastCard).forEach(function (row) {
        const step = Number(row.getAttribute("data-score-forecast-step"));
        const status = one(".parse-step-status", row);
        row.classList.toggle("current", step === currentStep);
        if (step < currentStep) {
          status.className = "status-tag green parse-step-status";
          status.textContent = "已完成";
        } else if (step === currentStep) {
          status.className = "status-tag blue parse-step-status";
          status.textContent = "进行中";
        } else {
          status.className = "status-tag gray parse-step-status";
          status.textContent = "等待中";
        }
      });
    }

    function updateScoreForecastTasks(currentStep, matterCount, knowledgeCount) {
      const processDone = currentStep > 1;
      const knowledgeDone = currentStep > 2;
      setScoreForecastMetric("scoreForecastProcessTaskText", processDone ? "处理记录和补充附件核验完成" : "正在核验最新处理记录和附件");
      setScoreForecastTag("scoreForecastProcessTaskStatus", processDone ? "green" : "blue", processDone ? "已完成" : "进行中");
      setScoreForecastMetric("scoreForecastKnowledgeTaskText", currentStep < 2 ? "等待处理记录核验完成" : knowledgeDone ? "21 份知识材料已完成重新匹配" : "已复核 " + knowledgeCount + " / 21 份知识材料");
      setScoreForecastTag("scoreForecastKnowledgeTaskStatus", currentStep < 2 ? "gray" : knowledgeDone ? "green" : "blue", currentStep < 2 ? "等待中" : knowledgeDone ? "已完成" : "进行中");
      setScoreForecastMetric("scoreForecastResultTaskText", currentStep < 3 ? "等待知识匹配完成" : "正在基于 " + matterCount + " 条事项刷新评分与结论");
      setScoreForecastTag("scoreForecastResultTaskStatus", currentStep < 3 ? "gray" : "blue", currentStep < 3 ? "等待中" : "进行中");
    }

    function refreshScoreForecastResult() {
      one("#resultForecastScore").textContent = "86";
      one("#businessForecastScore").textContent = "预测 8 分";
      one("#businessReadinessTrack").style.width = "80%";
      one("#businessReadinessValue").textContent = "80%";
      const factor = one("#personMaterialFactor");
      factor.className = "positive";
      factor.querySelector("i").textContent = "+";
      factor.querySelector("em").textContent = "项目人员证书及社保证明已补充";
      one("#resultRecommendationText").textContent = "资格条件已满足，补充材料已纳入当前项目并完成重新匹配。最新预测商务评分提升 2 分，建议继续完善待 AI 处理事项并核实关键承诺。";
    }

    function startScoreForecastSimulation() {
      const duration = 8000;
      const startedAt = Date.now();
      const refreshIcon = '<svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M18.2 9A7 7 0 0 0 6.1 6.6L4 9M5.8 15A7 7 0 0 0 17.9 17.4L20 15"/></svg>';
      const successIcon = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></svg>';
      scoreForecastCard.classList.remove("hidden", "completed");
      scoreForecastCard.classList.add("parsing");
      one("#scoreForecastStatusIcon").innerHTML = refreshIcon;
      one("#scoreForecastCompleteNote").classList.add("hidden");
      rerunScoreButton.disabled = true;
      rerunScoreButton.classList.add("is-processing");
      rerunScoreButton.querySelector("span:last-child").textContent = "预测进行中";
      confirmScoreForecast.disabled = true;
      confirmScoreForecast.querySelector("span:last-child").textContent = "正在启动预测";
      if (scoreForecastCard.scrollIntoView) scoreForecastCard.scrollIntoView({ behavior: "smooth", block: "start" });

      function renderFrame(ratio) {
        const progress = Math.min(99, Math.max(1, Math.round(ratio * 100)));
        const currentStep = ratio < .2 ? 1 : ratio < .55 ? 2 : ratio < .82 ? 3 : 4;
        const stepNames = { 1: "核验最新处理结果", 2: "重新匹配知识材料", 3: "重新计算预测得分", 4: "刷新综合投标结论" };
        const matterCount = Math.min(93, Math.round(93 * Math.min(1, ratio / .78)));
        const knowledgeRatio = Math.max(0, Math.min(1, (ratio - .18) / .5));
        const knowledgeCount = Math.min(21, Math.round(21 * knowledgeRatio));
        const factorRatio = Math.max(0, Math.min(1, (ratio - .52) / .35));
        const factorCount = Math.min(7, Math.round(7 * factorRatio));
        const remainingSeconds = Math.max(1, Math.ceil((duration * (1 - ratio)) / 1000));
        one("#scoreForecastStatusTitle").textContent = "正在重新预测评分";
        one("#scoreForecastStatusDescription").textContent = "当前执行第 " + currentStep + " / 4 步：" + stepNames[currentStep] + "。预计约 " + remainingSeconds + " 秒后完成。";
        setScoreForecastTag("scoreForecastStatusTag", "blue", "预测中 " + progress + "%");
        setScoreForecastMetric("scoreForecastMatterProgress", matterCount + " / 93", matterCount < 93 ? "正在复核第 " + Math.min(93, matterCount + 1) + " 条事项" : "93 条事项状态已完成复核");
        setScoreForecastMetric("scoreForecastKnowledgeProgress", knowledgeCount + " / 21", knowledgeCount < 21 ? "正在重新匹配知识库和补充附件" : "知识材料已完成重新匹配");
        setScoreForecastMetric("scoreForecastFactorProgress", factorCount + " / 7", factorCount < 7 ? "正在计算商务、技术和报价影响" : "7 项评分因素已完成计算");
        setScoreForecastMetric("scoreForecastTimeProgress", "剩余约 " + remainingSeconds + " 秒", "任务在当前页面持续执行");
        updateScoreForecastSteps(currentStep);
        updateScoreForecastTasks(currentStep, matterCount, knowledgeCount);
      }

      function completeSimulation() {
        const now = new Date();
        const pad = function (value) { return String(value).padStart(2, "0"); };
        scoreForecastCard.classList.remove("parsing");
        scoreForecastCard.classList.add("completed");
        one("#scoreForecastStatusIcon").innerHTML = successIcon;
        one("#scoreForecastStatusTitle").textContent = "评分预测已更新";
        one("#scoreForecastStatusDescription").textContent = "93 条投标事项已完成复核，补充材料已纳入预测，最新预估总分为 86 分。";
        setScoreForecastTag("scoreForecastStatusTag", "green", "预测完成");
        all("[data-score-forecast-step]", scoreForecastCard).forEach(function (row) {
          row.classList.remove("current");
          const status = one(".parse-step-status", row);
          status.className = "status-tag green parse-step-status";
          status.textContent = "已完成";
        });
        setScoreForecastMetric("scoreForecastMatterProgress", "93 / 93", "93 条事项状态已完成复核");
        setScoreForecastMetric("scoreForecastKnowledgeProgress", "21 / 21", "知识材料及补充附件已完成匹配");
        setScoreForecastMetric("scoreForecastFactorProgress", "7 / 7", "7 项评分因素已完成计算");
        setScoreForecastMetric("scoreForecastTimeProgress", "约 8 秒", "本次预测已完成");
        setScoreForecastMetric("scoreForecastProcessTaskText", "处理记录和补充附件核验完成");
        setScoreForecastTag("scoreForecastProcessTaskStatus", "green", "已完成");
        setScoreForecastMetric("scoreForecastKnowledgeTaskText", "21 份知识材料已完成重新匹配");
        setScoreForecastTag("scoreForecastKnowledgeTaskStatus", "green", "已完成");
        setScoreForecastMetric("scoreForecastResultTaskText", "总分、准备度和综合结论已完成刷新");
        setScoreForecastTag("scoreForecastResultTaskStatus", "green", "已完成");
        one("#scoreForecastCompletedAt").textContent = pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
        one("#scoreForecastCompleteNote").classList.remove("hidden");
        refreshScoreForecastResult();
        rerunScoreButton.disabled = false;
        rerunScoreButton.classList.remove("is-processing");
        rerunScoreButton.querySelector("span:last-child").textContent = "重新预测评分";
        confirmScoreForecast.disabled = false;
        confirmScoreForecast.querySelector("span:last-child").textContent = "确认重新预测";
        toast("评分预测已更新：84 分提升至 86 分");
      }

      let timer = 0;
      function tick() {
        const ratio = Math.max(0, Math.min(1, (Date.now() - startedAt) / duration));
        renderFrame(ratio);
        if (ratio >= 1) {
          window.clearInterval(timer);
          completeSimulation();
        }
      }
      tick();
      timer = window.setInterval(tick, 250);
    }

    confirmScoreForecast.addEventListener("click", function () {
      window.projectPrototype.closeLayers();
      window.setTimeout(startScoreForecastSimulation, 160);
    });

    const confirmButton = one("#confirmGenerateBid");
    if (confirmButton) confirmButton.addEventListener("click", function () {
      confirmButton.disabled = true;
      confirmButton.querySelector("span:last-child").textContent = "正在创建标书编制任务";
      const project = saveCurrentProject({ status: "ongoing", stage: "标书编制", stageDetail: "AI 自动生成中", progress: 52 });
      const projectId = project.id || "BID-202601-001";
      const startedAt = Date.now();
      try {
        window.sessionStorage.removeItem("biddingQualityReview:v2:" + projectId);
        window.sessionStorage.removeItem("biddingWritingStartedAt:" + projectId);
        window.sessionStorage.setItem("biddingWritingGeneration:v1:" + projectId, JSON.stringify({
          status: "generating",
          startedAt: startedAt,
          completedAt: 0,
          progress: 8,
          activeStep: 1,
          requiresVersionSave: true
        }));
      } catch (error) { /* storage unavailable */ }
      window.setTimeout(function () {
        window.location.href = "project-writing.html?id=" + encodeURIComponent(projectId);
      }, 700);
    });
  }

  function initWritingPage() {
    const editor = one("#documentEditor");
    if (!editor) return;
    const sectionTitles = {
      overview: "第一章 系统理解",
      architecture: "第一章 现有系统技术栈与架构分析",
      governance: "第二章 日常运维体系",
      disaster: "第二章 故障应急与高可用保障",
      security: "第三章 稳定性与安全优化",
      implementation: "第四章 项目管理与实施保障",
      qualification: "商务标 供应商证明材料",
      cases: "商务标 同类项目业绩",
      deviation: "商务标 报价与商务响应"
    };
    all("[data-section-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        all("[data-section-id]").forEach(function (item) { item.classList.toggle("active", item === button); });
        const title = sectionTitles[button.getAttribute("data-section-id")];
        one("#editorSectionTitle").textContent = title;
        one("#documentEditor h1").textContent = title.replace(/^商务标\s*/, "");
        const context = one("#bidAiContextTitle");
        if (context) context.textContent = title;
      });
    });

    const launcher = one("#bidAiLauncher");
    const panel = one("#bidAiPanel");
    const messages = one("#bidAiMessages");
    const input = one("#bidAiInput");
    const tray = one("#bidAiAttachmentTray");
    let attachments = [];

    function setPanel(open) {
      panel.classList.toggle("open", open);
      panel.setAttribute("aria-hidden", String(!open));
      launcher.classList.toggle("hidden", open);
      document.body.classList.toggle("bid-ai-open", open);
      if (open) input.focus();
    }
    launcher.addEventListener("click", function () { setPanel(true); });
    one("#closeBidAi").addEventListener("click", function () { setPanel(false); });
    one("#minimizeBidAi").addEventListener("click", function () { setPanel(false); });

    function renderAttachments() {
      tray.innerHTML = attachments.map(function (item, index) {
        return '<span><svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v5h5"/></svg><b>' + escapeHtml(item.name) + '</b><button type="button" data-remove-attachment="' + index + '" aria-label="移除附件">×</button></span>';
      }).join("");
      tray.classList.toggle("hidden", attachments.length === 0);
    }
    tray.addEventListener("click", function (event) {
      const remove = event.target.closest("[data-remove-attachment]");
      if (!remove) return;
      attachments.splice(Number(remove.getAttribute("data-remove-attachment")), 1);
      renderAttachments();
    });
    [one("#bidAiImageInput"), one("#bidAiFileInput")].forEach(function (fileInput) {
      fileInput.addEventListener("change", function () {
        attachments = attachments.concat(Array.from(fileInput.files || []).map(function (file) { return { name: file.name, type: file.type || "file" }; }));
        renderAttachments();
        fileInput.value = "";
      });
    });

    function scrollMessages() { messages.scrollTop = messages.scrollHeight; }
    function sendAiMessage(forcedPrompt) {
      const prompt = String(forcedPrompt || input.value || "").trim();
      if (!prompt && !attachments.length) { toast("请输入修改要求或上传参考材料", "warning", input); return; }
      const fileText = attachments.length ? '<small>已附加：' + attachments.map(function (item) { return escapeHtml(item.name); }).join("、") + '</small>' : "";
      messages.insertAdjacentHTML("beforeend", '<div class="bid-ai-message user"><div><p>' + escapeHtml(prompt || "请根据上传材料更新当前章节") + '</p>' + fileText + '</div></div>');
      input.value = "";
      attachments = [];
      renderAttachments();
      const thinking = document.createElement("div");
      thinking.className = "bid-ai-message assistant thinking";
      thinking.innerHTML = '<span class="bid-ai-message-avatar"><svg viewBox="0 0 24 24"><path d="M12 3 9.8 8.8 4 11l5.8 2.2L12 19l2.2-5.8L20 11l-5.8-2.2L12 3z"/></svg></span><div><p><i></i><i></i><i></i><span>正在结合评分标准和知识材料分析…</span></p></div>';
      messages.appendChild(thinking);
      scrollMessages();
      window.setTimeout(function () {
        thinking.remove();
        messages.insertAdjacentHTML("beforeend", '<div class="bid-ai-message assistant"><span class="bid-ai-message-avatar"><svg viewBox="0 0 24 24"><path d="M12 3 9.8 8.8 4 11l5.8 2.2L12 19l2.2-5.8L20 11l-5.8-2.2L12 3z"/></svg></span><div><p>已完成合规比对：P2、P3 响应时效与采购要求不一致，P4 未单列；建议修正分级响应矩阵，并将赔偿比例等强承诺保留人工确认。</p><div class="bid-ai-result-meta"><span>服务等级覆盖</span><strong>3 / 4 → 4 / 4</strong></div><button class="bid-ai-apply-result" type="button"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg><span>应用到当前章节</span></button></div></div>');
        scrollMessages();
      }, 950);
    }
    one("#sendBidAiMessage").addEventListener("click", function () { sendAiMessage(); });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendAiMessage(); }
    });
    all("[data-ai-prompt]").forEach(function (button) {
      button.addEventListener("click", function () { sendAiMessage(button.getAttribute("data-ai-prompt")); });
    });
    messages.addEventListener("click", function (event) {
      const apply = event.target.closest(".bid-ai-apply-result");
      if (!apply || apply.disabled) return;
      const trace = one(".ai-content-trace", editor);
      const note = document.createElement("p");
      note.className = "ai-applied-content";
      note.textContent = "服务响应矩阵已按采购要求补齐 P1-P4 四级：P1 15 分钟、P2 30 分钟、P3 1 小时、P4 2 小时；超出采购文件依据的赔偿承诺仍标记为待人工确认。";
      editor.insertBefore(note, trace || null);
      apply.disabled = true;
      apply.classList.add("applied");
      apply.querySelector("span").textContent = "已应用到标书";
      toast("AI 优化内容已应用，章节已自动保存");
    });

    const submit = one("#submitQualityReview");
    submit.addEventListener("click", function () { window.projectPrototype.openLayer("submitQualityModal"); });
    one("#confirmSubmitQuality").addEventListener("click", function () {
      const project = saveCurrentProject({ stage: "标书编制", stageDetail: "智能检查执行中", progress: 88 });
      const button = this;
      button.disabled = true;
      button.querySelector("span:last-child").textContent = "正在提交检查";
      window.setTimeout(function () { window.location.href = "project-writing.html?id=" + encodeURIComponent(project.id || "BID-202601-001") + "#qualityReviewStatusCard"; }, 650);
    });

  }

  function initQualityPage() {
    const button = one("#enterDeliveryReview");
    if (!button) return;
    button.addEventListener("click", function () {
      const project = saveCurrentProject({ stage: "交付归档", stageDetail: "待最终确认", progress: 96 });
      button.disabled = true;
      button.querySelector("span:last-child").textContent = "正在准备交付文件";
      window.setTimeout(function () { window.location.href = "project-delivery.html?id=" + encodeURIComponent(project.id || "BID-202601-001"); }, 650);
    });
  }

  function initDeliveryPage() {
    const confirm = one("#confirmDeliveryReview");
    if (!confirm) return;
    confirm.addEventListener("click", function () {
      all(".formal-export-btn").forEach(function (button) { button.disabled = false; });
      one("#deliveryReadinessAlert").classList.add("confirmed");
      one("#deliveryHeroTitle").textContent = "最终确认已完成，正式交付已开放";
      one("#deliveryHeroDescription").textContent = "4 项关键信息已确认，正式文件可以输出，项目将在生成交付文件后自动归档。";
      one("#deliveryHeroTag").className = "status-tag green";
      one("#deliveryHeroTag").textContent = "可正式交付";
      one("#deliveryStatusText").textContent = "已完成确认";
      one("#deliveryStatusHint").textContent = "正式文件输出已开放";
      one("#deliveryChecklistStatus").className = "status-tag green";
      one("#deliveryChecklistStatus").textContent = "4 / 4 已确认";
      one("#deliveryPackageTag").className = "status-tag green";
      one("#deliveryPackageTag").textContent = "可正式输出";
      all(".delivery-final-tag").forEach(function (tag) { tag.className = "status-tag green delivery-final-tag"; tag.textContent = "已确认"; });
      saveCurrentProject({ stage: "交付归档", stageDetail: "可正式交付", progress: 100 });
      window.projectPrototype.closeLayers();
      toast("最终确认已完成，正式交付文件输出已开放");
    });
    all("[data-export-type]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.disabled) return;
        const type = button.getAttribute("data-export-type");
        const names = { word: "Word 文件", pdf: "PDF 文件", package: "正式交付文件包" };
        one("#exportProgressTitle").textContent = "正在生成" + names[type];
        one("#exportProgressText").textContent = "正在汇编技术标、商务标、采购依据和校验清单";
        one("#finishExportBtn").classList.add("hidden");
        window.projectPrototype.openLayer("exportProgressModal");
        window.setTimeout(function () {
          one("#exportProgressText").textContent = names[type] + "已完成模拟生成，目录、页码、书签和文件命名检查通过。";
          one("#finishExportBtn").classList.remove("hidden");
        }, 1100);
      });
    });
  }

  function init() {
    initFilePage();
    initAnalysisPage();
    initWritingPage();
    initQualityPage();
    initDeliveryPage();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
