(function () {
  "use strict";

  function one(selector, root) { return (root || document).querySelector(selector); }
  function all(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }
  function toast(message, type, target) { if (window.showToast) window.showToast(message, type, target); }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  const requestedProjectId = new URLSearchParams(window.location.search).get("id");
  let currentProject = window.BiddingProjectStore.get(requestedProjectId || window.BiddingProjectData.featuredProject.id);
  if (!currentProject) return;
  if (!window.BiddingProjectStore.allowed(currentProject, "delivery")) return;
  const versionApi = window.BiddingBidVersions || null;
  let bidVersions = versionApi ? versionApi.load(currentProject) : [];
  let activeArchiveVersionId = "";
  const issueIds = ["Q-T-001", "Q-T-002", "Q-B-001", "Q-B-002", "Q-B-003"];
  let archiveCompleted = false;

  function selectedDeliveryVersion() {
    if (!versionApi) return null;
    return bidVersions.find(function (version) { return version.isDeliveryVersion; }) ||
      bidVersions.find(function (version) { return version.review && version.review.status === "approved"; }) ||
      versionApi.latest(bidVersions);
  }

  function selectedArchiveVersion() {
    return bidVersions.find(function (version) { return version.id === activeArchiveVersionId; }) || selectedDeliveryVersion();
  }

  function saveProject(patch) {
    const next = Object.assign({}, currentProject, patch || {});
    window.BiddingProjectStore.save(currentProject.id, patch || {});
    currentProject = next;
    if (window.projectPrototype) window.projectPrototype.currentProject = next;
    return next;
  }

  function safeStorageGet(key) {
    try { return window.sessionStorage.getItem(key) || ""; } catch (error) { return ""; }
  }

  function safeStorageSet(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function markSmartCheckForRecheck() {
    const smartCheckStorageKey = "biddingQualityReview:v2:" + (currentProject.id || "BID-202601-001");
    let smartCheck = null;
    const stored = safeStorageGet(smartCheckStorageKey);
    if (stored) {
      try { smartCheck = JSON.parse(stored); } catch (error) { smartCheck = null; }
    }
    if (!smartCheck || typeof smartCheck !== "object") {
      smartCheck = { status: "result", batch: 2, score: 98, startedAt: 0, reviewWillComplete: false, issues: {} };
    }
    smartCheck.status = "result";
    smartCheck.score = 98;
    smartCheck.startedAt = 0;
    smartCheck.reviewWillComplete = false;
    smartCheck.issues = smartCheck.issues || {};
    issueIds.forEach(function (issueId) {
      if (smartCheck.issues[issueId] !== "ignored") smartCheck.issues[issueId] = "done";
    });
    safeStorageSet(smartCheckStorageKey, JSON.stringify(smartCheck));
  }

  function returnDeliveryForRevision() {
    const reason = (one("#deliveryReturnReason").value || "").trim();
    if (!reason) {
      toast("请填写退回原因", "warning", one("#deliveryReturnReason"));
      one("#deliveryReturnReason").focus();
      return;
    }
    const manualReviewStorageKey = "biddingManualQualityReview:v1:" + (currentProject.id || "BID-202601-001");
    let manualReview = {};
    const stored = safeStorageGet(manualReviewStorageKey);
    if (stored) {
      try { manualReview = JSON.parse(stored) || {}; } catch (error) { manualReview = {}; }
    }
    manualReview.status = "returned";
    manualReview.returnReason = reason;
    manualReview.returnedAt = Date.now();
    manualReview.returnedBy = currentProject.owner || "李明远";
    manualReview.returnSource = "delivery";
    safeStorageSet(manualReviewStorageKey, JSON.stringify(manualReview));
    if (versionApi) {
      const deliveryVersion = versionApi.find(bidVersions, manualReview.versionId || manualReview.version) || selectedDeliveryVersion();
      if (deliveryVersion) {
        versionApi.update(currentProject, deliveryVersion.id, {
          review: Object.assign({}, deliveryVersion.review || {}, {
            status: "returned",
            returnedAt: manualReview.returnedAt,
            returnedBy: manualReview.returnedBy,
            returnReason: reason
          }),
          isDeliveryVersion: false
        });
        bidVersions = versionApi.load(currentProject);
      }
    }
    markSmartCheckForRecheck();
    const next = saveProject({
      stage: "标书编制",
      stageDetail: "交付归档退回，待修改并重新智能检查",
      progress: 88,
      status: currentProject.status === "archived" ? "archived" : "ongoing"
    });
    if (window.projectPrototype) window.projectPrototype.closeLayers();
    toast("已从交付归档退回标书编制");
    window.setTimeout(function () {
      window.location.href = "project-writing.html?id=" + encodeURIComponent(next.id || "BID-202601-001");
    }, 300);
  }

  function numericAmount(value) {
    const match = String(value || "").replace(/,/g, "").match(/[\d.]+/);
    return match ? Number(match[0]) : 0;
  }

  function versionArchiveMarkup(version, interactive) {
    const status = versionApi.statusMeta(version);
    const check = version.check || {};
    const review = version.review || {};
    const metaParts = [
      version.createdBy || currentProject.owner || "李明远",
      versionApi.formatDateTime(version.createdAt),
      "技术标、商务标 · 2 份 DOCX"
    ];
    let secondary = "未提交人工审核";
    if (review.status === "approved") secondary = "人工审核已通过";
    else if (review.status === "pending") secondary = "人工审核中";
    else if (review.status === "returned") secondary = "人工审核已退回";
    else if (check.status === "passed") secondary = "智能检查已通过";
    const active = interactive && version.id === activeArchiveVersionId;
    const tag = interactive ? "button" : "div";
    const attributes = interactive
      ? ' type="button" role="tab" aria-selected="' + (active ? "true" : "false") + '" aria-controls="deliveryArchiveFileList" data-delivery-archive-version="' + escapeHtml(version.id) + '"'
      : "";
    return "<" + tag + ' class="delivery-version-record' + (version.isDeliveryVersion ? " is-delivery" : "") + (active ? " active" : "") + '"' + attributes + ">" +
      '<span class="delivery-version-index">' + escapeHtml(version.number.replace("V1.0.", "V")) + '</span>' +
      '<span class="delivery-version-record-main"><strong>' + escapeHtml(version.number) + (version.isDeliveryVersion ? " · 正式交付版本" : "") + '</strong><small>' + escapeHtml(metaParts.join(" · ")) + '</small><span class="delivery-version-note">' + escapeHtml(version.note || "人工保存版本") + "</span></span>" +
      '<span class="delivery-version-record-status"><span class="status-tag ' + status.tone + '">' + status.label + '</span><small>' + escapeHtml(secondary) + "</small></span></" + tag + ">";
  }

  function archiveFileIcon(name) {
    return window.BiddingFileIcons
      ? window.BiddingFileIcons.markup(name, "compact-file-icon")
      : '<span class="file-type-icon type-word compact-file-icon" role="img" aria-label="DOCX 文件" title="DOCX 文件"><span class="file-format-mark">DOCX</span></span>';
  }

  function archiveFileActionsMarkup() {
    return '<div class="archive-file-actions">' +
      '<button class="archive-file-action is-preview" type="button" data-archive-file-preview><svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></svg><span>预览</span></button>' +
      '<button class="archive-file-action" type="button" data-archive-file-download><svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg><span>下载</span></button></div>';
  }

  function ensureArchiveFileActions(list) {
    all("[data-archive-shared]", list).forEach(function (item) {
      if (!one(".archive-file-actions", item)) item.insertAdjacentHTML("beforeend", archiveFileActionsMarkup());
    });
  }

  function archivePreviewProfile(name) {
    const fileName = String(name || "");
    if (fileName.indexOf("技术标") !== -1) return "bid-technical";
    if (fileName.indexOf("商务标") !== -1) return "bid-business";
    if (fileName.indexOf("澄清") !== -1 || fileName.indexOf("答疑") !== -1) return "clarification";
    if (/\.xlsx?$/i.test(fileName)) return window.BiddingFilePreview.profileFromName(fileName);
    return "procurement";
  }

  function archiveDownloadHref(name) {
    const fileName = String(name || "");
    if (fileName.indexOf("技术标") !== -1) return "../assets/bid-documents/technical.docx";
    if (fileName.indexOf("商务标") !== -1) return "../assets/bid-documents/business.docx";
    if (/\.xlsx?$/i.test(fileName)) return "../assets/knowledge-files/knowledge-source-sample.xlsx";
    if (fileName.indexOf("澄清") !== -1 || fileName.indexOf("答疑") !== -1) return "../assets/bid-documents/business.pdf";
    if (/\.pdf$/i.test(fileName)) return "../assets/bid-documents/technical.pdf";
    return "../assets/bid-documents/technical.docx";
  }

  function openArchiveFilePreview(item) {
    const name = one("strong", item).textContent.trim();
    if (currentProject.workspaceProfile) {
      const generated = /技术标|商务标/.test(name);
      window.BiddingFilePreview.open({ profile: generated ? name.includes("技术标") ? "bid-technical" : "bid-business" : "project-source", name: name, projectId: currentProject.id, versionId: item.dataset.versionId || (selectedArchiveVersion() || {}).id, context: currentProject.name });
      return;
    }
    const description = one("small", item).textContent.trim();
    const sizeMatch = description.match(/\d+(?:\.\d+)?\s*(?:KB|MB|GB)/i);
    window.BiddingFilePreview.open({
      profile: archivePreviewProfile(name),
      name: name,
      size: sizeMatch ? sizeMatch[0] : "—",
      sourceUrl: archiveDownloadHref(name),
      context: "交付归档文件"
    });
  }

  function downloadArchiveFile(item, button) {
    const name = one("strong", item).textContent.trim();
    if (currentProject.workspaceProfile) {
      const version = versionApi.find(bidVersions, item.dataset.versionId) || selectedArchiveVersion();
      if (!/技术标|商务标/.test(name)) { openArchiveFilePreview(item); return; }
      window.BiddingProjectExport.download(window.BiddingProjectExport.file(currentProject, version, name.includes("技术标") ? "technical" : "business", "docx"), name, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      return;
    }
    const link = document.createElement("a");
    link.href = archiveDownloadHref(name);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast("已开始下载：" + name, "success", button);
  }

  function renderSelectedArchiveFiles() {
    const list = one("#deliveryArchiveFileList");
    const selected = selectedArchiveVersion();
    if (!list || !selected) return;
    all("[data-version-file]", list).forEach(function (item) { item.remove(); });
    const category = selected.isDeliveryVersion ? "正式交付" : "历史版本";
    const tone = selected.isDeliveryVersion ? "green" : "gray";
    const markup = ["技术标", "商务标"].map(function (documentName, index) {
      const fileName = documentName + "_" + selected.number + ".docx";
      return '<div data-version-file data-version-id="' + escapeHtml(selected.id) + '"' + (index === 0 ? ' class="is-first"' : "") + ">" +
        archiveFileIcon(fileName) +
        '<div><strong>' + escapeHtml(fileName) + '</strong><small>' + escapeHtml(selected.number + " · " + (selected.note || "人工保存版本")) + '</small></div>' +
        '<span class="status-tag ' + tone + '">' + category + "</span>" + archiveFileActionsMarkup() + "</div>";
    }).join("");
    list.insertAdjacentHTML("beforeend", markup);
    ensureArchiveFileActions(list);
    const sourceCount = all("[data-archive-shared]", list).length;
    one("#deliveryArchiveFileCount").textContent = sourceCount + " 份原件 · 2 份 " + selected.number + " 标书";
    one("#deliveryArchiveFileDescription").textContent = "招标文件原件保持不变，当前展示 " + selected.number + " 对应的技术标与商务标。";
  }

  function renderArchiveVersionLists() {
    const selected = selectedArchiveVersion();
    if (selected && !bidVersions.some(function (version) { return version.id === activeArchiveVersionId; })) {
      activeArchiveVersionId = selected.id;
    }
    one("#deliveryVersionArchiveList").innerHTML = bidVersions.slice().reverse().map(function (version) {
      return versionArchiveMarkup(version, true);
    }).join("");
    one("#archiveConfirmVersionList").innerHTML = bidVersions.slice().reverse().map(function (version) {
      return versionArchiveMarkup(version, false);
    }).join("");
    renderSelectedArchiveFiles();
  }

  function renderDeliveryVersionState() {
    if (!versionApi) return;
    bidVersions = versionApi.load(currentProject);
    let selected = selectedDeliveryVersion();
    if (selected && !selected.isDeliveryVersion) {
      versionApi.setDeliveryVersion(currentProject, selected.id);
      bidVersions = versionApi.load(currentProject);
      selected = selectedDeliveryVersion();
    }
    if (!selected) return;

    const number = selected.number;
    const projectName = currentProject.name || "某港口集团2026年度集装箱业务平台运维项目";
    one("#deliveryVersionNumber").textContent = number;
    one("#deliveryVersionMeta").textContent = (selected.review && selected.review.status === "approved" ? "人工质量审核已通过" : "当前交付候选版本") + " · 共归档 " + bidVersions.length + " 个版本";
    one("#deliveryPackageDirectory").textContent = projectName + " / " + number + " / Word 文件套、PDF 文件套";
    one("#wordPackageVersionMeta").textContent = "正式交付版本 " + number + " · 保留正文、表格及图片";
    one("#pdfPackageVersionMeta").textContent = "正式交付版本 " + number + " · 保持文件页序与内容";
    one("#deliveryTechnicalDocxName").textContent = "技术标_" + number + ".docx";
    one("#deliveryBusinessDocxName").textContent = "商务标_" + number + ".docx";
    one("#deliveryTechnicalPdfName").textContent = "技术标_" + number + ".pdf";
    one("#deliveryBusinessPdfName").textContent = "商务标_" + number + ".pdf";
    const previewNames = {
      "bid-technical": "技术标_" + number,
      "bid-business": "商务标_" + number
    };
    all("[data-delivery-preview]").forEach(function (button) {
      const extension = String(button.getAttribute("data-preview-name") || "").toLowerCase().endsWith(".pdf") ? ".pdf" : ".docx";
      button.setAttribute("data-preview-name", previewNames[button.getAttribute("data-delivery-preview")] + extension);
    });
    one("#downloadWordPackage").setAttribute("download", projectName + "_" + number + "_Word文件套.zip");
    one("#downloadPdfPackage").setAttribute("download", projectName + "_" + number + "_PDF文件套.zip");
    one("#deliveryArchiveVersionCount").textContent = bidVersions.length + " 个版本 · " + (bidVersions.length * 2) + " 份 DOCX";
    one("#archiveConfirmVersionCount").textContent = bidVersions.length + " 个版本";
    renderArchiveVersionLists();
  }

  function archiveFilesFromPage() {
    const sourceFiles = all(".ledger-archive-group .archive-attachment-list > [data-archive-shared]").map(function (item) {
      const name = one("strong", item).textContent.trim();
      const description = one("small", item).textContent.trim();
      const tag = one(".status-tag", item);
      return {
        name: name,
        description: description,
        category: tag ? tag.textContent.trim() : "归档文件",
        tone: tag && tag.classList.contains("green") ? "green" : "blue"
      };
    });
    const versionFiles = versionApi ? bidVersions.reduce(function (files, version) {
      const category = version.isDeliveryVersion ? "正式交付" : "历史版本";
      const tone = version.isDeliveryVersion ? "green" : "gray";
      ["技术标", "商务标"].forEach(function (documentName) {
        files.push({
          name: documentName + "_" + version.number + ".docx",
          description: version.number + " · " + (version.note || "人工保存版本"),
          category: category,
          tone: tone,
          versionId: version.id,
          versionNumber: version.number,
          documentType: documentName
        });
      });
      return files;
    }, []) : [];
    return sourceFiles.concat(versionFiles);
  }

  function knowledgeItemsForLedger() {
    return knowledgeItems().filter(function (item) {
      return item.getAttribute("data-state") === "confirmed";
    }).map(function (item) {
      return {
        name: one("strong", item).textContent.trim(),
        description: one("small", item).textContent.trim(),
        state: "已沉淀"
      };
    });
  }

  function upsertLedgerRecord() {
    const storageKey = "biddingLedgerRecords";
    let stored = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(parsed)) stored = parsed;
    } catch (error) {
      stored = [];
    }
    const bidDateText = currentProject.deadline || "2026-07-20 09:30";
    const bidDate = bidDateText.slice(0, 10);
    const existingIndex = stored.findIndex(function (record) { return record.id === currentProject.id; });
    const existing = existingIndex === -1 ? null : stored[existingIndex];
    const deliveryVersion = selectedDeliveryVersion();
    const baseRecord = {
      id: currentProject.id,
      name: currentProject.name || "某港口集团2026年度集装箱业务平台运维项目",
      purchaser: currentProject.purchaser || "某港口集团有限公司",
      bidDate: bidDate,
      bidDateText: bidDateText,
      archiveDate: currentProject.workspaceProfile ? new Date().toLocaleDateString("sv-SE") : bidDate,
      archiveTime: currentProject.workspaceProfile ? new Date().toLocaleString("sv-SE").slice(0,16) : bidDate + " 10:12",
      archiveVersion: "正式交付 " + (deliveryVersion ? deliveryVersion.number : "V1.0"),
      deliveryVersionId: deliveryVersion ? deliveryVersion.id : "",
      archiveVersions: bidVersions.map(function (version) {
        return {
          id: version.id,
          number: version.number,
          createdAt: version.createdAt,
          createdBy: version.createdBy,
          note: version.note,
          check: version.check,
          review: version.review,
          isDeliveryVersion: Boolean(version.isDeliveryVersion),
          archiveStatus: version.archiveStatus
        };
      }),
      archiveOperator: currentProject.owner || "李明远",
      bidAmount: currentProject.workspaceProfile ? "" : currentProject.id === "BID-202601-001" ? 59.76 : numericAmount(currentProject.budget),
      owner: currentProject.owner || "李明远",
      archiveFiles: archiveFilesFromPage(),
      knowledgeItems: knowledgeItemsForLedger()
    };
    const next = Object.assign({
      result: "pending",
      resultDate: "",
      score: "",
      rank: "",
      winner: "",
      winningAmount: "",
      reviewStatus: "待结果",
      reviewTone: "gray",
      source: "",
      remark: "已完成正式文件交付，等待采购结果公告。",
      resultFiles: []
    }, existing || {}, baseRecord);
    if (existingIndex === -1) stored.push(next);
    else stored[existingIndex] = next;
    try { window.localStorage.setItem(storageKey, JSON.stringify(stored)); } catch (error) { /* storage unavailable */ }
  }

  function knowledgeItems() {
    return all("[data-knowledge-item]");
  }

  function knowledgeCounts() {
    return knowledgeItems().reduce(function (counts, item) {
      const state = item.getAttribute("data-state") || "pending";
      counts[state] += 1;
      counts.total += 1;
      return counts;
    }, { pending: 0, confirmed: 0, canceled: 0, total: 0 });
  }

  function bindKnowledgeMenu(menu) {
    if (!menu || menu.getAttribute("data-menu-bound") === "true") return;
    menu.setAttribute("data-menu-bound", "true");
    menu.addEventListener("toggle", function () {
      if (!menu.open) return;
      all(".knowledge-state-menu, .knowledge-batch-menu").forEach(function (other) {
        if (other !== menu) other.removeAttribute("open");
      });
    });
  }

  function renderKnowledgeState() {
    knowledgeItems().forEach(function (item) {
      const state = item.getAttribute("data-state") || "pending";
      const status = one("[data-knowledge-status]", item);
      const stateMenu = one(".knowledge-state-menu", item);
      const confirmButton = one('[data-knowledge-action="confirm"]', item);
      const cancelButton = one('[data-knowledge-action="cancel"]', item);
      if (state === "confirmed") {
        status.textContent = "已确认";
      } else if (state === "canceled") {
        status.textContent = "已取消";
      } else {
        status.textContent = "待确认";
      }
      stateMenu.className = "knowledge-state-menu state-" + state + (archiveCompleted ? " locked" : "");
      if (archiveCompleted) stateMenu.removeAttribute("open");
      confirmButton.disabled = archiveCompleted || state === "confirmed";
      cancelButton.disabled = archiveCompleted || state === "canceled";
    });

    const counts = knowledgeCounts();
    const summary = one("#knowledgeArchiveState");
    if (archiveCompleted) {
      summary.className = counts.confirmed ? "status-tag green" : "status-tag gray";
      summary.textContent = counts.confirmed ? counts.confirmed + " 项已沉淀" : "未沉淀";
    } else if (counts.pending) {
      summary.className = "status-tag orange";
      summary.textContent = counts.pending + " 项待确认";
    } else if (counts.confirmed === counts.total) {
      summary.className = "status-tag green";
      summary.textContent = counts.total + " 项已确认";
    } else if (counts.canceled === counts.total) {
      summary.className = "status-tag gray";
      summary.textContent = "全部已取消";
    } else {
      summary.className = "status-tag blue";
      summary.textContent = "确认 " + counts.confirmed + " · 取消 " + counts.canceled;
    }

    all("[data-knowledge-batch]").forEach(function (button) {
      const state = button.getAttribute("data-knowledge-batch");
      button.disabled = archiveCompleted || counts[state] === counts.total;
    });
    all(".knowledge-batch-menu").forEach(function (batchMenu) {
      batchMenu.classList.toggle("locked", archiveCompleted);
      if (archiveCompleted) batchMenu.removeAttribute("open");
    });
    return counts;
  }

  function setKnowledgeState(item, state) {
    item.setAttribute("data-state", state);
    const counts = renderKnowledgeState();
    if (one("#deliveryArchiveConfirmModal").classList.contains("open")) renderArchiveConfirmState(counts);
  }

  function setAllKnowledgeState(state) {
    knowledgeItems().forEach(function (item) { item.setAttribute("data-state", state); });
    const counts = renderKnowledgeState();
    if (one("#deliveryArchiveConfirmModal").classList.contains("open")) renderArchiveConfirmState(counts);
  }

  function renderArchiveConfirmKnowledgeList() {
    const list = one("#archiveConfirmKnowledgeList");
    if (!list) return;
    const stateMeta = {
      pending: { label: "待确认" },
      confirmed: { label: "已确认" },
      canceled: { label: "已取消" }
    };
    list.innerHTML = knowledgeItems().map(function (item, index) {
      const state = item.getAttribute("data-state") || "pending";
      const meta = stateMeta[state];
      const name = one("strong", item).textContent;
      const description = one("small", item).textContent;
      const icon = window.BiddingFileIcons.markup(name, "compact-file-icon");
      return '<div data-state="' + state + '">' + icon + '<div><strong>' + escapeHtml(name) + '</strong><small>' + escapeHtml(description) + '</small></div><details class="knowledge-state-menu state-' + state + '" name="knowledge-action-menu"><summary><span class="knowledge-state-dot"></span><span>' + meta.label + '</span><svg class="menu-chevron" viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></svg></summary><div class="knowledge-menu-popover"><button type="button" data-modal-knowledge-action="confirm" data-knowledge-index="' + index + '"' + (state === "confirmed" ? " disabled" : "") + '><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg><span>确认沉淀</span></button><button type="button" data-modal-knowledge-action="cancel" data-knowledge-index="' + index + '"' + (state === "canceled" ? " disabled" : "") + '><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg><span>取消沉淀</span></button></div></details></div>';
    }).join("");
    all(".knowledge-state-menu", list).forEach(bindKnowledgeMenu);
  }

  function renderArchiveConfirmState(counts) {
    const alert = one("#archiveConfirmAlert");
    const title = one("#archiveConfirmAlertTitle");
    const text = one("#archiveConfirmAlertText");
    const countText = one("#archiveConfirmKnowledgeCount");
    const submit = one("#submitDeliveryArchive");
    const countParts = [];
    if (counts.confirmed) countParts.push(counts.confirmed + " 已确认");
    if (counts.pending) countParts.push(counts.pending + " 待确认");
    if (counts.canceled) countParts.push(counts.canceled + " 已取消");
    countText.className = "status-tag " + (counts.pending ? "orange" : counts.confirmed ? "green" : "gray");
    countText.textContent = countParts.join(" · ");
    renderArchiveConfirmKnowledgeList();

    if (counts.pending) {
      alert.className = "info-alert warning";
      title.textContent = "知识待沉淀内容尚未全部确认";
      text.textContent = "当前仍有 " + counts.pending + " 项待确认，请在下方列表中选择确认或取消。";
      submit.disabled = true;
      one("span:last-child", submit).textContent = "请先处理 " + counts.pending + " 项";
    } else {
      alert.className = "info-alert";
      title.textContent = "知识沉淀范围已确认";
      text.textContent = counts.confirmed + " 项内容将沉淀至知识库，" + counts.canceled + " 项内容不沉淀。";
      submit.disabled = false;
      one("span:last-child", submit).textContent = "确认归档";
    }
  }

  function openArchiveConfirm() {
    const counts = renderKnowledgeState();
    renderDeliveryVersionState();
    renderArchiveConfirmState(counts);
    if (window.projectPrototype) window.projectPrototype.openLayer("deliveryArchiveConfirmModal");
  }

  function completeDeliveryArchive() {
    const beforeArchive = knowledgeCounts();
    if (beforeArchive.pending) {
      renderArchiveConfirmState(beforeArchive);
      return;
    }
    const deliveryVersion = selectedDeliveryVersion();
    if (versionApi && deliveryVersion) {
      bidVersions = versionApi.archiveAll(currentProject, deliveryVersion.id);
      renderDeliveryVersionState();
    }
    archiveCompleted = true;
    const counts = renderKnowledgeState();
    const archiveTag = one("#autoArchiveTag");
    const archiveDescription = one("#autoArchiveDescription");
    const ledgerState = one("#ledgerArchiveState");
    if (archiveTag) {
      archiveTag.className = "status-tag green";
      archiveTag.textContent = "已完成归档";
    }
    if (archiveDescription) archiveDescription.textContent = "投标台账已归档 " + bidVersions.length + " 个标书版本，" + counts.confirmed + " 项知识内容已沉淀" + (counts.canceled ? "，" + counts.canceled + " 项未沉淀。" : "。");
    if (ledgerState) {
      ledgerState.className = "status-tag green";
      ledgerState.textContent = "已归档";
    }
    const archiveButton = one("#confirmDeliveryArchive");
    if (archiveButton) {
      archiveButton.disabled = true;
      one("span:last-child", archiveButton).textContent = "已完成归档";
    }
    const returnButton = one("#returnDeliveryRevision");
    if (returnButton) {
      returnButton.disabled = true;
      returnButton.classList.add("hidden");
    }
    saveProject({ stage: "交付归档", stageDetail: (deliveryVersion ? deliveryVersion.number + " " : "") + "已完成正式交付，全部标书版本已归档", progress: 100, status: "archived", deadlineText: "已完成交付" });
    upsertLedgerRecord();
    if (window.projectPrototype) window.projectPrototype.closeLayers();
    toast("交付归档已完成，" + bidVersions.length + " 个标书版本及台账记录已保存", "success");
  }

  function init() {
    if (!one("#confirmDeliveryArchive")) return;
    if (currentProject.workspaceProfile) {
      ["downloadWordPackage", "downloadPdfPackage"].forEach(function (id) {
        const link = one("#" + id); link.removeAttribute("href"); link.removeAttribute("download");
        link.setAttribute("role", "button"); link.setAttribute("tabindex", "0");
        const run = function (event) { event.preventDefault(); const version = selectedDeliveryVersion(); if (version && version.review.status === "approved") window.BiddingProjectExport.packageDownload(currentProject, version, id === "downloadPdfPackage" ? "pdf" : "docx"); else toast("请先完成人工质量审核", "warning"); };
        link.addEventListener("click", run); link.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") run(event); });
      });
    }
    renderDeliveryVersionState();
    renderKnowledgeState();
    const returnButton = one("#returnDeliveryRevision");
    if (currentProject.status === "archived") {
      returnButton.classList.add("hidden");
    } else {
      returnButton.addEventListener("click", function () {
        one("#deliveryReturnReason").value = "";
        if (window.projectPrototype) window.projectPrototype.openLayer("deliveryReturnRevisionModal");
        window.setTimeout(function () { one("#deliveryReturnReason").focus(); }, 80);
      });
    }
    one("#confirmDeliveryReturnRevision").addEventListener("click", returnDeliveryForRevision);
    const archiveVersionList = one("#deliveryVersionArchiveList");
    if (archiveVersionList) {
      archiveVersionList.addEventListener("click", function (event) {
        const button = event.target.closest("[data-delivery-archive-version]");
        if (!button) return;
        activeArchiveVersionId = button.getAttribute("data-delivery-archive-version");
        renderArchiveVersionLists();
      });
    }
    const archiveFileList = one("#deliveryArchiveFileList");
    if (archiveFileList) {
      archiveFileList.addEventListener("click", function (event) {
        const item = event.target.closest("#deliveryArchiveFileList > div");
        if (!item) return;
        const previewButton = event.target.closest("[data-archive-file-preview]");
        if (previewButton) {
          openArchiveFilePreview(item);
          return;
        }
        const downloadButton = event.target.closest("[data-archive-file-download]");
        if (downloadButton) downloadArchiveFile(item, downloadButton);
      });
    }
    all(".knowledge-state-menu, .knowledge-batch-menu").forEach(bindKnowledgeMenu);
    all("[data-delivery-preview]").forEach(function (button) {
      button.addEventListener("click", function () {
        window.BiddingFilePreview.open({
          profile: button.getAttribute("data-delivery-preview"),
          name: button.getAttribute("data-preview-name"),
          size: button.getAttribute("data-preview-size"),
          context: "交付归档正式文件",
          projectId: currentProject.id, versionId: (selectedDeliveryVersion() || {}).id
        });
      });
    });
    document.addEventListener("click", function (event) {
      if (event.target.closest(".knowledge-state-menu, .knowledge-batch-menu")) return;
      all(".knowledge-state-menu, .knowledge-batch-menu").forEach(function (menu) { menu.removeAttribute("open"); });
    });
    const list = one(".archive-knowledge-list");
    if (list) {
      list.addEventListener("click", function (event) {
        const button = event.target.closest("[data-knowledge-action]");
        if (!button || button.disabled) return;
        const item = button.closest("[data-knowledge-item]");
        const state = button.getAttribute("data-knowledge-action") === "confirm" ? "confirmed" : "canceled";
        setKnowledgeState(item, state);
        const menu = button.closest("details");
        if (menu) menu.removeAttribute("open");
      });
    }
    const modalList = one("#archiveConfirmKnowledgeList");
    if (modalList) {
      modalList.addEventListener("click", function (event) {
        const button = event.target.closest("[data-modal-knowledge-action]");
        if (!button || button.disabled) return;
        const item = knowledgeItems()[Number(button.getAttribute("data-knowledge-index"))];
        if (!item) return;
        const state = button.getAttribute("data-modal-knowledge-action") === "confirm" ? "confirmed" : "canceled";
        setKnowledgeState(item, state);
      });
    }
    all("[data-knowledge-batch]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.disabled) return;
        setAllKnowledgeState(button.getAttribute("data-knowledge-batch"));
        const menu = button.closest("details");
        if (menu) menu.removeAttribute("open");
      });
    });
    one("#confirmDeliveryArchive").addEventListener("click", openArchiveConfirm);
    one("#submitDeliveryArchive").addEventListener("click", completeDeliveryArchive);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
