(function () {
  "use strict";

  const data = window.BidDocumentFlowData || {};
  if (!data.technical || !data.business) return;

  const project = (window.projectPrototype && window.projectPrototype.currentProject) || { id: "BID-202601-001" };
  const storagePrefix = "biddingWordFlow:v1:" + (project.id || "BID-202601-001") + ":";
  const state = {
    activeId: "technical",
    dirty: false,
    saveTimer: 0,
    selection: null,
    caretRange: null,
    candidate: null,
    aiAction: "",
    aiThinking: false,
    aiElapsedTimer: 0,
    aiTypingTimer: 0,
    aiStatusTimer: 0,
    aiAttachments: [],
    generationToken: 0,
    zoom: 100,
    aiWidth: 392,
    activePage: 1,
    outlineCollapsed: false,
    quality: null,
    qualityFrame: 0,
    focusedIssueId: ""
  };

  const aiOperations = {
    rewrite: { label: "改写", placeholder: "输入改写要求，例如：保留事实不变，表达更正式、更有条理" },
    expand: { label: "扩写", placeholder: "输入扩写方向，例如：补充执行步骤，但不要新增企业事实或承诺" },
    imitate: { label: "仿写", placeholder: "输入参考风格或结构要求，AI 将沿用已选对象的事实边界" },
    polish: { label: "润色", placeholder: "输入润色目标，例如：专业、简洁，强化上下文衔接" },
    shorten: { label: "缩写", placeholder: "输入需要保留的重点或字数要求" },
    continue: { label: "续写", placeholder: "输入续写方向，AI 将从已选内容结尾继续展开" },
    deep: { label: "深度写作", placeholder: "输入主题、结构和重点，结合已选对象整体梳理" },
    custom: { label: "自定义处理", placeholder: "说明希望如何处理已选对象" }
  };

  const qualityStorageKey = "biddingQualityReview:v2:" + (project.id || "BID-202601-001");
  const qualityReviewDuration = 7200;
  const qualityIssues = [
    {
      id: "Q-T-001",
      documentId: "technical",
      page: 72,
      type: "supplement",
      title: "补充分级服务响应完整口径",
      location: "技术标 · 五、售后服务承诺 · P72",
      description: "当前服务响应表仅列出紧急、高、中三级，与采购要求的 P1-P4 分级口径未完全对应。",
      advice: "请在当前表格补齐 P1-P4 等级、响应时效和处理时效后标记已补充。"
    },
    {
      id: "Q-T-002",
      documentId: "technical",
      page: 73,
      type: "confirm",
      title: "确认量化赔偿承诺依据",
      location: "技术标 · 五、售后服务承诺 · P73",
      description: "“赔款合同额 0.1%/分钟”等量化承诺责任较高，需要确认已经内部授权并可实际履行。",
      advice: "请核对承诺依据；如需调整可直接修改正文，确认无误后完成人工确认。"
    },
    {
      id: "Q-B-002",
      documentId: "business",
      page: 2,
      type: "confirm",
      title: "确认最终报价与税率",
      location: "商务标 · 报价表 · P2",
      description: "总报价 597,600.00 元、分项报价合计及 6% 税率属于正式报价关键信息。",
      advice: "请与最终报价审批结果核对，确认总价、分项合计和税率一致后完成人工确认。"
    },
    {
      id: "Q-B-001",
      documentId: "business",
      page: 7,
      type: "supplement",
      title: "补充业绩证明索引信息",
      location: "商务标 · 业绩证明 · P7",
      description: "业绩证明章节标题已存在，但项目名称、合同页码和对应证明材料索引尚未填写。",
      advice: "请补充业绩清单及后续合同扫描页的对应关系后标记已补充。"
    },
    {
      id: "Q-B-003",
      documentId: "business",
      page: 23,
      type: "supplement",
      title: "补充资质证明有效期材料",
      location: "商务标 · ISO 20000 信息技术服务管理体系认证 · P23",
      description: "当前资质证明扫描页缺少可核验的证书有效期信息，需要补充最新有效证明。",
      advice: "请补充有效期证明或发证机构查询记录后标记已补充。"
    }
  ];

  function one(selector, root) { return (root || document).querySelector(selector); }
  function all(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }
  function toast(message, type, target) { if (window.showToast) window.showToast(message, type, target); }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function currentDocument() { return data[state.activeId]; }
  function pagesRoot() { return one("#bidDocumentPages"); }

  const hiddenBusinessFigureByPage = {
    1: "page-001-signature.webp",
    2: "page-002-signature.webp",
    3: "page-003-id.webp",
    4: "page-004-signatures-id.webp"
  };

  function pageHtmlForRender(documentId, page, html) {
    if (documentId !== "business") return html;

    const hiddenFigure = hiddenBusinessFigureByPage[page.number] || "";
    const hasExtraNumberHeading = page.number === 7;
    if (!hiddenFigure && !hasExtraNumberHeading) return html;

    const template = document.createElement("template");
    template.innerHTML = html;
    if (hiddenFigure) {
      all(".doc-figure", template.content).forEach(function (figure) {
        const image = one("img", figure);
        const source = image ? image.getAttribute("src") || "" : "";
        if (source.endsWith("/" + hiddenFigure)) figure.remove();
      });
    }
    if (hasExtraNumberHeading) {
      all("h3", template.content).forEach(function (heading) {
        if ((heading.textContent || "").trim() === "4.") heading.remove();
      });
    }
    return template.innerHTML;
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

  function saveProjectPatch(patch) {
    const next = Object.assign({}, project, patch || {});
    Object.assign(project, next);
    try { window.sessionStorage.setItem("biddingPendingProject", JSON.stringify(next)); } catch (error) { /* storage unavailable */ }
    if (window.projectPrototype) window.projectPrototype.currentProject = next;
    return next;
  }

  function baseIssueStatus(value) {
    return qualityIssues.reduce(function (result, issue) {
      result[issue.id] = value;
      return result;
    }, {});
  }

  function defaultQualityState() {
    const stage = String(project.stage || "");
    if (stage.indexOf("交付") !== -1) return { status: "complete", batch: 2, score: 98, startedAt: 0, reviewWillComplete: true, issues: baseIssueStatus("passed") };
    if (stage.indexOf("质量") !== -1 || stage.indexOf("审核") !== -1) return { status: "result", batch: 1, score: 82, startedAt: 0, reviewWillComplete: false, issues: baseIssueStatus("pending") };
    return { status: "idle", batch: 0, score: 0, startedAt: 0, reviewWillComplete: false, issues: baseIssueStatus("pending") };
  }

  function loadQualityState() {
    const stored = safeStorageGet(qualityStorageKey);
    if (!stored) return defaultQualityState();
    try {
      const parsed = JSON.parse(stored);
      if (!parsed || ["idle", "reviewing", "result", "complete"].indexOf(parsed.status) === -1) return defaultQualityState();
      parsed.issues = Object.assign(baseIssueStatus(parsed.status === "complete" ? "passed" : "pending"), parsed.issues || {});
      return parsed;
    } catch (error) {
      return defaultQualityState();
    }
  }

  function saveQualityState() {
    safeStorageSet(qualityStorageKey, JSON.stringify(state.quality));
  }

  function issueById(issueId) {
    return qualityIssues.find(function (issue) { return issue.id === issueId; }) || null;
  }

  function issueStatus(issue) {
    return (state.quality && state.quality.issues && state.quality.issues[issue.id]) || "pending";
  }

  function qualityCounts() {
    return qualityIssues.reduce(function (counts, issue) {
      const value = issueStatus(issue);
      counts[value] = (counts[value] || 0) + 1;
      counts[issue.documentId] = counts[issue.documentId] || { pending: 0, done: 0, passed: 0 };
      counts[issue.documentId][value] = (counts[issue.documentId][value] || 0) + 1;
      return counts;
    }, { pending: 0, done: 0, passed: 0 });
  }

  function pageMarkup(page, html) {
    const scanClass = state.activeId === "business" && page.number >= 8 ? " scan-page" : "";
    return '<section class="bid-doc-page word-doc-page' + scanClass + '" id="bid-page-' + state.activeId + "-" + page.number + '" data-page-number="' + page.number + '">' +
      '<div class="bid-page-content">' + html + "</div>" +
      '<footer class="bid-page-number" contenteditable="false">' + page.number + "</footer>" +
      "</section>";
  }

  function storedPageHtml(documentId) {
    const stored = safeStorageGet(storagePrefix + documentId);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed.pages) ? parsed.pages : null;
    } catch (error) {
      return null;
    }
  }

  function cleanDocumentClone(content) {
    const clone = content.cloneNode(true);
    all(".doc-image-tools, .ai-inline-candidate", clone).forEach(function (element) { element.remove(); });
    all(".quality-edit-slot", clone).forEach(function (element) {
      if (!(element.textContent || "").trim()) element.remove();
    });
    all("[data-quality-issue-id]", clone).forEach(function (element) {
      element.classList.remove("quality-content-mark", "quality-supplement-mark", "quality-confirm-mark", "quality-recheck-mark", "quality-active-mark", "quality-edit-slot");
      element.removeAttribute("data-quality-issue-id");
      element.removeAttribute("data-quality-primary");
      element.removeAttribute("data-quality-generated");
      element.removeAttribute("data-placeholder");
    });
    all("mark.bid-find-hit", clone).forEach(function (element) { element.replaceWith(document.createTextNode(element.textContent || "")); });
    all(".selected, .ai-source-active", clone).forEach(function (element) {
      element.classList.remove("selected", "ai-source-active");
    });
    return clone.innerHTML;
  }

  function saveCurrentDocument(showMessage) {
    window.clearTimeout(state.saveTimer);
    const pageContent = all(".bid-page-content", pagesRoot()).map(cleanDocumentClone);
    const saved = safeStorageSet(storagePrefix + state.activeId, JSON.stringify({ pages: pageContent, savedAt: Date.now() }));
    if (!saved) {
      setSaveState("dirty", "保存空间不足");
      return false;
    }
    state.dirty = false;
    setSaveState("saved", "已保存");
    if (showMessage) toast(currentDocument().name + "已保存");
    return true;
  }

  function setSaveState(type, label) {
    const element = one("#bidSaveState");
    if (!element) return;
    element.className = "bid-save-state" + (type === "saved" ? "" : " " + type);
    element.innerHTML = type === "saved"
      ? '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>' + label
      : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4M12 16h.01"/></svg>' + label;
  }

  function markDirty() {
    state.dirty = true;
    setSaveState("dirty", "有未保存修改");
    updateWordCount();
    window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(function () {
      setSaveState("saving", "正在保存");
      window.setTimeout(function () { saveCurrentDocument(false); }, 260);
    }, 1600);
  }

  function issuesForOutlineItem(documentId, item, nextItem) {
    const nextPage = nextItem ? Number(nextItem.page) : Infinity;
    return qualityIssues.filter(function (issue) {
      if (issue.documentId !== documentId) return false;
      if (Number(issue.page) < Number(item.page)) return false;
      if (Number(issue.page) > nextPage) return false;
      if (Number(issue.page) === nextPage && nextItem) return false;
      return true;
    });
  }

  function outlineIssueMeta(issues) {
    if (!issues.length) return null;
    const statuses = issues.map(issueStatus);
    if (statuses.every(function (value) { return value === "passed"; })) return { className: "quality-passed", label: "已通过" };
    if (statuses.some(function (value) { return value === "pending"; })) {
      const hasConfirm = issues.some(function (issue) { return issueStatus(issue) === "pending" && issue.type === "confirm"; });
      return { className: hasConfirm ? "quality-confirm" : "quality-supplement", label: "待处理 " + statuses.filter(function (value) { return value === "pending"; }).length };
    }
    return { className: "quality-recheck", label: "待复检 " + statuses.filter(function (value) { return value === "done"; }).length };
  }

  function renderOutline() {
    const doc = currentDocument();
    one("#bidOutlineList").innerHTML = doc.outline.map(function (item, index) {
      const issues = issuesForOutlineItem(doc.id, item, doc.outline[index + 1]);
      const issueMeta = outlineIssueMeta(issues);
      const issueIds = issues.map(function (issue) { return issue.id; }).join(",");
      return '<button class="bid-outline-item level-' + (item.level || 1) + (issueMeta ? " has-quality " + issueMeta.className : "") + (index === 0 ? " active" : "") + '" type="button" data-page="' + item.page + '"' + (issueIds ? ' data-quality-issues="' + issueIds + '"' : "") + '><i></i><span>' + escapeHtml(item.title) + "</span>" + (issueMeta ? "<em>" + issueMeta.label + "</em>" : "") + "<small>P" + item.page + "</small></button>";
    }).join("");
  }

  function renderDocument() {
    const doc = currentDocument();
    const stored = storedPageHtml(state.activeId);
    pagesRoot().innerHTML = doc.pages.map(function (page, index) {
      const html = stored && stored[index] != null ? stored[index] : page.html;
      return pageMarkup(page, pageHtmlForRender(doc.id, page, html));
    }).join("");
    pagesRoot().setAttribute("aria-label", doc.name + " Word 编辑区");
    one("#currentPageStatus").textContent = "第 1 / " + doc.pageCount + " 页";
    state.activePage = 1;
    state.selection = null;
    state.caretRange = null;
    state.candidate = null;
    state.dirty = false;
    setSaveState("saved", "已保存");
    decorateFigures();
    decorateQualityContent();
    applyZoom();
    updateWordCount();
    updateAiTarget();
    if (one("#bidAiComposer")) resetAiComposer(true);
    one("#bidDocumentCanvas").scrollTop = 0;
  }

  function switchDocument(documentId) {
    if (!data[documentId] || documentId === state.activeId) return;
    if (state.dirty) saveCurrentDocument(false);
    removeCandidate();
    state.activeId = documentId;
    all(".bid-document-tab").forEach(function (button) {
      const active = button.getAttribute("data-document-id") === documentId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    renderOutline();
    renderDocument();
    if (state.quality && state.quality.status === "reviewing") setEditorQualityLocked(true);
  }

  function updateWordCount() {
    const clone = pagesRoot().cloneNode(true);
    all(".bid-page-number, .doc-image-tools, .ai-inline-candidate", clone).forEach(function (element) { element.remove(); });
    const count = (clone.innerText || clone.textContent || "").replace(/\s+/g, "").length;
    one("#currentWordCount").textContent = count.toLocaleString("zh-CN") + " 字";
  }

  function scrollToPage(pageNumber) {
    const page = one("#bid-page-" + state.activeId + "-" + pageNumber);
    if (!page) return;
    const canvas = one("#bidDocumentCanvas");
    const canvasRect = canvas.getBoundingClientRect();
    const pageRect = page.getBoundingClientRect();
    const top = canvas.scrollTop + pageRect.top - canvasRect.top - 10;
    canvas.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    setActivePage(pageNumber);
  }

  function setActivePage(pageNumber) {
    const doc = currentDocument();
    const nextPage = Math.max(1, Math.min(doc.pageCount, Number(pageNumber) || 1));
    state.activePage = nextPage;
    one("#currentPageStatus").textContent = "第 " + nextPage + " / " + doc.pageCount + " 页";
    let activeOutline = null;
    all(".bid-outline-item").forEach(function (button) {
      if (Number(button.getAttribute("data-page")) <= nextPage) activeOutline = button;
      button.classList.remove("active");
    });
    if (activeOutline) activeOutline.classList.add("active");
  }

  function updateActivePageFromScroll() {
    const canvas = one("#bidDocumentCanvas");
    const canvasTop = canvas.getBoundingClientRect().top + 110;
    let closest = 1;
    let distance = Infinity;
    all(".bid-doc-page", pagesRoot()).forEach(function (page) {
      const value = Math.abs(page.getBoundingClientRect().top - canvasTop);
      if (value < distance) {
        distance = value;
        closest = Number(page.getAttribute("data-page-number"));
      }
    });
    setActivePage(closest);
  }

  function applyZoom() {
    pagesRoot().style.zoom = String(state.zoom / 100);
    one("#zoomRange").value = String(state.zoom);
    one("#zoomValue").textContent = state.zoom + "%";
    one("#zoomOut").disabled = state.zoom <= 60;
    one("#zoomIn").disabled = state.zoom >= 160;
    window.setTimeout(positionFocusedQualityComment, 20);
  }

  function setZoom(value) {
    state.zoom = Math.max(60, Math.min(160, Number(value) || 100));
    applyZoom();
    window.setTimeout(updateActivePageFromScroll, 20);
  }

  function setQualityMetric(id, value, hint) {
    const element = one(id);
    if (!element) return;
    element.textContent = value;
    const small = element.nextElementSibling;
    if (small && hint) small.textContent = hint;
  }

  function qualityTypeLabel(issue) {
    return issue.type === "supplement" ? "人工补充" : "人工确认";
  }

  function qualityStatusLabel(issue) {
    const value = issueStatus(issue);
    if (value === "done") return "待复检";
    if (value === "passed") return "已通过";
    return qualityTypeLabel(issue);
  }

  function removeQualityMarkAttributes(element) {
    element.classList.remove("quality-content-mark", "quality-supplement-mark", "quality-confirm-mark", "quality-recheck-mark", "quality-active-mark", "quality-edit-slot");
    element.removeAttribute("data-quality-issue-id");
    element.removeAttribute("data-quality-primary");
    element.removeAttribute("data-quality-generated");
    element.removeAttribute("data-placeholder");
  }

  function clearQualityContentDecorations() {
    const root = pagesRoot();
    if (!root) return;
    all(".quality-edit-slot", root).forEach(function (slot) {
      const shouldRemove = slot.getAttribute("data-quality-generated") === "true" && !(slot.textContent || "").trim();
      if (shouldRemove) slot.remove();
      else removeQualityMarkAttributes(slot);
    });
    all("[data-quality-issue-id]", root).forEach(removeQualityMarkAttributes);
  }

  function qualityMarkTone(issue) {
    if (issueStatus(issue) === "done") return "quality-recheck-mark";
    return issue.type === "supplement" ? "quality-supplement-mark" : "quality-confirm-mark";
  }

  function registerQualityContent(issue, targets) {
    const elements = targets.filter(Boolean);
    if (!elements.length || issueStatus(issue) === "passed") return;
    const tone = qualityMarkTone(issue);
    elements.forEach(function (element, index) {
      element.classList.add("quality-content-mark", tone);
      element.setAttribute("data-quality-issue-id", issue.id);
      if (index === 0) element.setAttribute("data-quality-primary", "true");
    });
  }

  function createQualityEditSlot(anchor, position, placeholder) {
    const slot = document.createElement("p");
    slot.className = "quality-edit-slot";
    slot.setAttribute("data-quality-generated", "true");
    slot.setAttribute("data-placeholder", placeholder);
    anchor.insertAdjacentElement(position, slot);
    return slot;
  }

  function decorateQualityContent() {
    clearQualityContentDecorations();
    if (!state.quality || state.quality.status !== "result") return;

    qualityIssues.filter(function (issue) { return issue.documentId === state.activeId && issueStatus(issue) !== "passed"; }).forEach(function (issue) {
      const page = one("#bid-page-" + issue.documentId + "-" + issue.page);
      if (!page) return;

      if (issue.id === "Q-T-001") {
        const table = one(".doc-table", page);
        if (table) registerQualityContent(issue, [table]);
        return;
      }

      if (issue.id === "Q-T-002") {
        const row = all("tr", page).find(function (element) {
          const firstCell = one("td", element);
          return firstCell && (firstCell.textContent || "").indexOf("远程响应") !== -1;
        });
        if (row) registerQualityContent(issue, [row]);
        return;
      }

      if (issue.id === "Q-B-002") {
        const tables = all(".quote-table", page);
        const cells = [];
        tables.forEach(function (table) {
          all("tbody tr", table).forEach(function (row) {
            cells.push.apply(cells, all("td", row).slice(4, 7));
          });
        });
        if (cells.length) registerQualityContent(issue, cells);
        return;
      }

      if (issue.id === "Q-B-001") {
        const heading = all("h3", page).find(function (element) { return (element.textContent || "").trim() === "3.业绩证明"; });
        if (!heading) return;
        let slot = heading.nextElementSibling;
        if (!slot || /^(H[1-6]|FIGURE|TABLE)$/.test(slot.tagName)) {
          slot = createQualityEditSlot(heading, "afterend", "请在此处补充业绩清单、合同页码及证明材料索引");
        } else {
          slot.classList.add("quality-edit-slot");
          slot.setAttribute("data-placeholder", "请在此处补充业绩清单、合同页码及证明材料索引");
        }
        registerQualityContent(issue, [slot]);
        return;
      }

      if (issue.id === "Q-B-003") {
        const figure = one(".doc-figure", page);
        if (!figure) return;
        let slot = figure.previousElementSibling;
        if (!slot || slot.tagName !== "P") {
          slot = createQualityEditSlot(figure, "beforebegin", "请在此处补充资质证明有效期材料或发证机构查询记录");
        } else {
          slot.classList.add("quality-edit-slot");
          slot.setAttribute("data-placeholder", "请在此处补充资质证明有效期材料或发证机构查询记录");
        }
        registerQualityContent(issue, [slot]);
      }
    });
  }

  function qualityCommentTone(issue) {
    if (issueStatus(issue) === "done") return "recheck";
    return issue.type === "supplement" ? "supplement" : "confirm";
  }

  function hideQualityComment(clearFocus) {
    const rail = one("#qualityCommentRail");
    const workspace = one("#bidDocumentWorkspace");
    const connector = one("#qualityCommentConnector");
    if (rail) rail.classList.add("hidden");
    if (workspace) workspace.classList.remove("has-quality-comment");
    if (connector) connector.classList.add("hidden");
    all(".quality-active-mark", pagesRoot()).forEach(function (element) { element.classList.remove("quality-active-mark"); });
    if (clearFocus) state.focusedIssueId = "";
    syncQualityToolbarNavigation();
  }

  function showQualityComment(issue) {
    const status = issueStatus(issue);
    const rail = one("#qualityCommentRail");
    const workspace = one("#bidDocumentWorkspace");
    const card = one("#qualityCommentCard");
    one("#qualityCommentConnector").classList.add("hidden");
    rail.classList.remove("hidden");
    workspace.classList.add("has-quality-comment");
    card.setAttribute("data-tone", qualityCommentTone(issue));
    one("#qualityFocusType").textContent = qualityStatusLabel(issue);
    one("#qualityFocusTitle").textContent = issue.title;
    one("#qualityFocusTitle").setAttribute("aria-label", "定位到正文：" + issue.title);
    one("#qualityCommentLocation").textContent = issue.location;
    one("#qualityFocusDescription").textContent = issue.description + " " + issue.advice;
    const complete = one("#completeQualityIssue");
    complete.disabled = status !== "pending";
    one("span:last-child", complete).textContent = status === "done" ? "等待复检" : status === "passed" ? "已通过" : issue.type === "supplement" ? "标记已补充" : "确认无误";
    updateQualityIssueNavigation(issue);
  }

  function positionQualityComment(issue, target) {
    const rail = one("#qualityCommentRail");
    if (!rail || rail.classList.contains("hidden")) return;
    const element = target || one('[data-quality-issue-id="' + issue.id + '"][data-quality-primary="true"]', pagesRoot());
    if (!element) return;
    const card = one("#qualityCommentCard");
    const railRect = rail.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    const top = Math.max(12, targetRect.top - railRect.top + Math.min(targetRect.height / 2, 42) - 29);
    card.style.top = Math.round(top) + "px";
    const workspace = one("#bidDocumentWorkspace");
    const workspaceRect = workspace.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const targets = all('[data-quality-issue-id="' + issue.id + '"]', pagesRoot());
    const targetRects = (targets.length ? targets : [element]).map(function (item) { return item.getBoundingClientRect(); });
    const startX = Math.max.apply(null, targetRects.map(function (rect) { return rect.right; })) - workspaceRect.left;
    const startY = targetRect.top + Math.min(targetRect.height / 2, 42) - workspaceRect.top;
    const endX = cardRect.left - workspaceRect.left;
    const endY = cardRect.top + 29 - workspaceRect.top;
    const padding = 2;
    const left = Math.min(startX, endX) - padding;
    const connectorTop = Math.min(startY, endY) - padding;
    const width = Math.max(4, Math.abs(endX - startX) + padding * 2);
    const height = Math.max(4, Math.abs(endY - startY) + padding * 2);
    const connector = one("#qualityCommentConnector");
    const path = one("#qualityCommentConnectorPath");
    connector.style.left = Math.round(left) + "px";
    connector.style.top = Math.round(connectorTop) + "px";
    connector.style.width = Math.round(width) + "px";
    connector.style.height = Math.round(height) + "px";
    connector.setAttribute("viewBox", "0 0 " + width + " " + height);
    connector.setAttribute("data-tone", qualityCommentTone(issue));
    const startLocalX = startX - left;
    const startLocalY = startY - connectorTop;
    const endLocalX = endX - left;
    const endLocalY = endY - connectorTop;
    const available = Math.max(0, endLocalX - startLocalX);
    const firstBendX = startLocalX + Math.min(36, available * .35);
    const secondBendX = Math.max(firstBendX, endLocalX - 18);
    path.setAttribute("d", "M " + startLocalX + " " + startLocalY + " L " + firstBendX + " " + startLocalY + " L " + secondBendX + " " + endLocalY + " L " + endLocalX + " " + endLocalY);
    connector.classList.remove("hidden");
  }

  function positionFocusedQualityComment() {
    const issue = issueById(state.focusedIssueId);
    if (!issue || issue.documentId !== state.activeId) return;
    positionQualityComment(issue);
  }

  function scrollToQualityContent(issue) {
    const page = one("#bid-page-" + issue.documentId + "-" + issue.page);
    if (!page) return;
    all(".quality-active-mark", pagesRoot()).forEach(function (element) { element.classList.remove("quality-active-mark"); });
    const target = one('[data-quality-issue-id="' + issue.id + '"][data-quality-primary="true"]', page) || page;
    target.classList.add("quality-active-mark");
    positionQualityComment(issue, target);
    const canvas = one("#bidDocumentCanvas");
    const canvasRect = canvas.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = canvas.scrollTop + targetRect.top - canvasRect.top - 72;
    canvas.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    setActivePage(issue.page);
  }

  function qualityNavigationIssues() {
    if (!state.quality || state.quality.status !== "result") return [];
    return qualityIssues.filter(function (issue) { return issueStatus(issue) !== "passed"; });
  }

  function updateQualityIssueNavigation(issue) {
    const issues = qualityNavigationIssues();
    const index = issues.findIndex(function (item) { return item.id === issue.id; });
    one("#qualityIssueNavigation").classList.remove("hidden");
    one("#qualityToolbarProgress").textContent = index >= 0 ? index + 1 + " / " + issues.length : "共 " + issues.length + " 条";
    const previous = one("#previousQualityIssue");
    const next = one("#nextQualityIssue");
    previous.disabled = index <= 0;
    next.disabled = index >= issues.length - 1;
    previous.title = previous.disabled ? "已经是第一条问题" : "切换到上一条问题";
    next.title = next.disabled ? "已经是最后一条问题" : "切换到下一条问题";
  }

  function syncQualityToolbarNavigation() {
    const issues = qualityNavigationIssues();
    const navigation = one("#qualityIssueNavigation");
    navigation.classList.toggle("hidden", !issues.length);
    if (!issues.length) return;
    const current = issueById(state.focusedIssueId);
    const index = current ? issues.findIndex(function (issue) { return issue.id === current.id; }) : -1;
    if (index >= 0) {
      updateQualityIssueNavigation(current);
      return;
    }
    one("#qualityToolbarProgress").textContent = "共 " + issues.length + " 条";
    const previous = one("#previousQualityIssue");
    const next = one("#nextQualityIssue");
    previous.disabled = true;
    next.disabled = false;
    previous.title = "请先定位第一条问题";
    next.title = "定位第一条问题";
  }

  function moveFocusedQualityIssue(offset) {
    const issues = qualityNavigationIssues();
    const index = issues.findIndex(function (issue) { return issue.id === state.focusedIssueId; });
    const target = issues[index + offset];
    if (target) focusQualityIssue(target.id);
  }

  function renderQualityCategories(mode) {
    const container = one("#qualityCategorySummary");
    if (!container) return;
    if (mode === "idle") {
      container.innerHTML = '<div><span>资格与否决项</span><strong>待检查</strong></div><div><span>评分与响应覆盖</span><strong>待检查</strong></div><div><span>一致性与格式</span><strong>待检查</strong></div>';
      return;
    }
    if (mode === "reviewing") {
      container.innerHTML = '<div><span>资格与否决项</span><strong>检查中</strong></div><div><span>评分与响应覆盖</span><strong>排队中</strong></div><div><span>一致性与格式</span><strong>排队中</strong></div>';
      return;
    }
    const complete = mode === "complete";
    container.innerHTML = '<div><span>资格与否决项</span><strong>' + (complete ? "100 · 通过" : "100 · 通过") + '</strong></div><div><span>评分与响应覆盖</span><strong>' + (complete ? "98 · 通过" : "84 · 待完善") + '</strong></div><div><span>一致性与格式</span><strong>' + (complete ? "96 · 通过" : "76 · 待确认") + '</strong></div>';
  }

  function renderQualityIssueList(mode) {
    const list = one("#qualityIssueList");
    const passed = one("#qualityAllPassed");
    if (!list || !passed) return;
    passed.classList.toggle("hidden", mode !== "complete");
    if (mode === "complete") {
      list.innerHTML = "";
      return;
    }
    if (mode === "idle" || mode === "reviewing") {
      list.innerHTML = '<div class="quality-empty"><strong>' + (mode === "idle" ? "尚未生成审核结果" : "正在执行检查并归并问题") + '</strong><span>' + (mode === "idle" ? "提交质量审核后，问题将关联到技术标、商务标的具体目录。" : "审核结束后，将在这里展示需要人工补充或确认的事项。") + '</span></div>';
      return;
    }
    list.innerHTML = qualityIssues.map(function (issue) {
      const status = issueStatus(issue);
      const tone = status === "done" ? "recheck" : status === "passed" ? "passed" : issue.type;
      const actionLabel = status === "pending" ? "定位处理" : "查看位置";
      return '<div class="quality-issue-item ' + tone + '"><i></i><div><strong>' + escapeHtml(issue.title) + '</strong><span>' + escapeHtml(issue.description) + '</span><div class="quality-issue-meta"><b>' + escapeHtml(qualityStatusLabel(issue)) + '</b><b>' + escapeHtml(issue.location) + '</b><b>' + issue.id + '</b></div></div><button class="text-btn compact-btn" type="button" data-quality-locate="' + issue.id + '"><span class="btn-icon"><svg viewBox="0 0 24 24"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z"/><circle cx="12" cy="10" r="2"/></svg></span><span>' + actionLabel + '</span></button></div>';
    }).join("");
  }

  function renderQualitySteps(mode, activeStep, progress) {
    const rows = all("[data-quality-step]", one("#qualityReviewSteps"));
    rows.forEach(function (row) {
      const step = Number(row.getAttribute("data-quality-step"));
      const status = one("em", row);
      row.classList.remove("current", "completed");
      if (mode === "result" || mode === "complete" || (mode === "reviewing" && step < activeStep)) {
        row.classList.add("completed");
        status.className = "status-tag green";
        status.textContent = "已完成";
      } else if (mode === "reviewing" && step === activeStep) {
        row.classList.add("current");
        status.className = "status-tag blue";
        status.textContent = "进行中";
      } else {
        status.className = "status-tag gray";
        status.textContent = "等待中";
      }
    });
    one("#qualityReviewProgressBar").style.width = progress + "%";
    one("#qualityReviewProgressText").textContent = progress + "%";
  }

  function renderQualityTabStatus(documentId, mode, documentCounts) {
    const element = one("#" + documentId + "QualityCount");
    if (!element) return;
    if (mode === "idle") {
      element.className = "status-tag green bid-quality-count";
      element.textContent = "已载入";
      return;
    }
    if (mode === "reviewing") {
      element.className = "status-tag blue bid-quality-count";
      element.textContent = "审核中";
      return;
    }
    if (mode === "complete") {
      element.className = "status-tag green bid-quality-count";
      element.textContent = "已通过";
      return;
    }
    const pending = documentCounts.pending || 0;
    const recheck = documentCounts.done || 0;
    element.className = "status-tag " + (pending ? "orange" : "blue") + " bid-quality-count";
    element.textContent = pending ? "待处理 " + pending : "待复检 " + recheck;
  }

  function refreshQualityNavigation() {
    renderOutline();
    setActivePage(state.activePage);
  }

  function updateQualityReviewUI() {
    const quality = state.quality;
    const mode = quality.status;
    const counts = qualityCounts();
    const pending = counts.pending || 0;
    const recheck = counts.done || 0;
    const pendingSupplement = qualityIssues.filter(function (issue) { return issue.type === "supplement" && issueStatus(issue) === "pending"; }).length;
    const pendingConfirm = qualityIssues.filter(function (issue) { return issue.type === "confirm" && issueStatus(issue) === "pending"; }).length;
    const resolved = qualityIssues.length - pending;
    const card = one("#qualityReviewStatusCard");
    const icon = one("#qualityReviewStatusIcon");
    const tag = one("#qualityReviewStatusTag");
    const submit = one("#submitQualityReview");
    const submitLabel = one("span:last-child", submit);
    const delivery = one("#enterDeliveryArchive");
    card.setAttribute("data-quality-state", mode);
    delivery.href = "project-delivery.html?id=" + encodeURIComponent(project.id || "BID-202601-001");
    submit.classList.toggle("hidden", mode === "complete");
    delivery.classList.toggle("hidden", mode !== "complete");
    submit.disabled = mode === "reviewing" || (mode === "result" && pending > 0);
    submit.title = mode === "result" && pending > 0 ? "请先完成全部人工补充和人工确认" : "";

    if (mode === "idle") {
      icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V7l-8-4z"/><path d="M12 8v5M12 17h.01"/></svg>';
      one("#qualityReviewStatusTitle").textContent = "当前标书尚未提交质量审核";
      one("#qualityReviewStatusDescription").textContent = "保存技术标、商务标后提交审核，系统将在本页面展示过程和结果。";
      tag.className = "status-tag gray";
      tag.textContent = "未审核";
      submitLabel.textContent = "提交质量审核";
      setQualityMetric("#qualityMetricScore", "--", "等待首次审核");
      setQualityMetric("#qualityMetricRules", "248", "待执行检查规则");
      setQualityMetric("#qualityMetricPassed", "--", "尚未生成结果");
      setQualityMetric("#qualityMetricAutoFixed", "--", "尚未生成结果");
      setQualityMetric("#qualityMetricManual", "--", "尚未生成结果");
      setQualityMetric("#qualityMetricBlocking", "--", "尚未生成结果");
      one("#qualityProcessDescription").textContent = "提交后将按 6 个步骤执行质量审核";
      one("#qualityProcessTag").className = "status-tag gray";
      one("#qualityProcessTag").textContent = "未开始";
      one("#qualityResultBatchTag").className = "status-tag gray";
      one("#qualityResultBatchTag").textContent = "等待审核";
      renderQualitySteps(mode, 0, 0);
    } else if (mode === "reviewing") {
      icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v6h-6"/></svg>';
      one("#qualityReviewStatusTitle").textContent = "第 " + quality.batch + " 次质量审核中";
      one("#qualityReviewStatusDescription").textContent = "正在建立审核任务，编辑区已锁定本次送审快照；点击展开可查看实时步骤。";
      tag.className = "status-tag blue";
      tag.textContent = "审核中 8%";
      submitLabel.textContent = "质量审核中";
      setQualityMetric("#qualityMetricScore", "--", "审核完成后生成");
      setQualityMetric("#qualityMetricRules", "248", "正在逐项执行");
      setQualityMetric("#qualityMetricPassed", "--", "结果归并中");
      setQualityMetric("#qualityMetricAutoFixed", "--", "结果归并中");
      setQualityMetric("#qualityMetricManual", "--", "结果归并中");
      setQualityMetric("#qualityMetricBlocking", "--", "结果归并中");
      one("#qualityProcessDescription").textContent = "本次送审版本 V1.0." + (quality.batch + 2) + " · 正在执行 6 个检查步骤";
      one("#qualityProcessTag").className = "status-tag blue";
      one("#qualityProcessTag").textContent = "进行中";
      one("#qualityResultBatchTag").className = "status-tag blue";
      one("#qualityResultBatchTag").textContent = "第 " + quality.batch + " 次审核";
      renderQualitySteps(mode, 1, 8);
    } else if (mode === "result") {
      icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
      one("#qualityReviewStatusTitle").textContent = "第 " + quality.batch + " 次质量审核已完成";
      one("#qualityReviewStatusDescription").textContent = pending ? "248 项规则已检查，" + pending + " 项需要人工补充或确认；处理后可再次提交审核。" : "本轮人工事项均已处理，" + recheck + " 项等待再次质量审核。";
      tag.className = "status-tag " + (pending ? "orange" : "blue");
      tag.textContent = pending ? "待人工处理 " + pending + " 项" : "待复检 " + recheck + " 项";
      submitLabel.textContent = pending ? "处理后再次审核" : "再次提交质量审核";
      setQualityMetric("#qualityMetricScore", String(Math.min(90, 82 + recheck * 2)), "当前送审版本");
      setQualityMetric("#qualityMetricRules", "248", "全部执行完成");
      setQualityMetric("#qualityMetricPassed", "240", "无需人工处理");
      setQualityMetric("#qualityMetricAutoFixed", "3", "已自动复核通过");
      setQualityMetric("#qualityMetricManual", String(pending), recheck ? "待复检 " + recheck + " 项" : "补充 " + pendingSupplement + " · 确认 " + pendingConfirm);
      setQualityMetric("#qualityMetricBlocking", "0", "暂无资格阻断问题");
      one("#qualityProcessDescription").textContent = "本次送审版本 V1.0." + (quality.batch + 2) + " · 已完成全部 6 个检查步骤";
      one("#qualityProcessTag").className = "status-tag green";
      one("#qualityProcessTag").textContent = "已完成";
      one("#qualityResultBatchTag").className = "status-tag " + (pending ? "orange" : "blue");
      one("#qualityResultBatchTag").textContent = "第 " + quality.batch + " 次审核";
      renderQualitySteps(mode, 6, 100);
    } else {
      icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></svg>';
      one("#qualityReviewStatusTitle").textContent = "质量审核全部完成";
      one("#qualityReviewStatusDescription").textContent = "第 " + quality.batch + " 次审核已通过，248 项规则全部完成，当前版本可以进入交付归档。";
      tag.className = "status-tag green";
      tag.textContent = "全部通过";
      setQualityMetric("#qualityMetricScore", "98", "最终送审版本");
      setQualityMetric("#qualityMetricRules", "248", "全部执行完成");
      setQualityMetric("#qualityMetricPassed", "248", "全部复检通过");
      setQualityMetric("#qualityMetricAutoFixed", "3", "已保留修改记录");
      setQualityMetric("#qualityMetricManual", "0", "人工事项已清零");
      setQualityMetric("#qualityMetricBlocking", "0", "满足交付条件");
      one("#qualityProcessDescription").textContent = "最终送审版本 V1.0." + (quality.batch + 2) + " · 已完成全部 6 个检查步骤";
      one("#qualityProcessTag").className = "status-tag green";
      one("#qualityProcessTag").textContent = "已完成";
      one("#qualityResultBatchTag").className = "status-tag green";
      one("#qualityResultBatchTag").textContent = "第 " + quality.batch + " 次审核通过";
      renderQualitySteps(mode, 6, 100);
    }

    renderQualityCategories(mode);
    renderQualityIssueList(mode);
    renderQualityTabStatus("technical", mode, counts.technical || {});
    renderQualityTabStatus("business", mode, counts.business || {});
    refreshQualityNavigation();
    decorateQualityContent();
    if (mode !== "result") {
      hideQualityComment(true);
    } else {
      const focused = issueById(state.focusedIssueId);
      if (focused && focused.documentId === state.activeId) showQualityComment(focused);
    }
    syncQualityToolbarNavigation();
  }

  function setEditorQualityLocked(locked) {
    const shell = one(".bid-editor-shell");
    shell.classList.toggle("quality-review-locked", locked);
    pagesRoot().setAttribute("contenteditable", locked ? "false" : "true");
    all("button, select, input", one("#bidRichToolbar")).forEach(function (control) { control.disabled = locked; });
    ["#saveBidDocument", "#insertImageButton", "#bidAiLauncher"].forEach(function (selector) {
      const control = one(selector);
      if (control) control.disabled = locked;
    });
    if (locked) {
      setSaveState("saving", "送审版本已锁定");
      setAiPanel(false);
    } else if (!state.dirty) {
      setSaveState("saved", "已保存");
    }
  }

  function updateReviewProgress(progress, activeStep) {
    const stepNames = ["保存版本与建立审核快照", "资格条件与否决项检查", "评分点与响应覆盖检查", "技术与商务一致性检查", "目录、页码与格式检查", "结果归并与人工任务生成"];
    one("#qualityReviewStatusDescription").textContent = "当前执行第 " + activeStep + " / 6 步：" + stepNames[activeStep - 1] + "。编辑区已锁定本次送审快照。";
    one("#qualityReviewStatusTag").textContent = "审核中 " + progress + "%";
    renderQualitySteps("reviewing", activeStep, progress);
  }

  function finishQualityReview() {
    window.cancelAnimationFrame(state.qualityFrame);
    const quality = state.quality;
    if (quality.reviewWillComplete) {
      quality.status = "complete";
      quality.score = 98;
      qualityIssues.forEach(function (issue) { quality.issues[issue.id] = "passed"; });
      saveProjectPatch({ stage: "交付归档", stageDetail: "质量审核通过，待交付确认", progress: 96 });
      toast("第 " + quality.batch + " 次质量审核完成，全部问题已通过复检");
    } else {
      quality.status = "result";
      quality.score = 82;
      qualityIssues.forEach(function (issue) { quality.issues[issue.id] = "pending"; });
      saveProjectPatch({ stage: "质量审核", stageDetail: "待人工补充与确认", progress: 88 });
    }
    quality.startedAt = 0;
    quality.reviewWillComplete = false;
    saveQualityState();
    setEditorQualityLocked(false);
    updateQualityReviewUI();
  }

  function runQualityReview() {
    if (state.quality.status !== "reviewing") return;
    const elapsed = Date.now() - Number(state.quality.startedAt || Date.now());
    const ratio = Math.max(0, Math.min(1, elapsed / qualityReviewDuration));
    const progress = Math.round(8 + ratio * 92);
    const activeStep = Math.min(6, Math.floor(ratio * 6) + 1);
    updateReviewProgress(progress, activeStep);
    if (ratio >= 1) {
      finishQualityReview();
      return;
    }
    state.qualityFrame = window.requestAnimationFrame(runQualityReview);
  }

  function startQualityReview() {
    const counts = qualityCounts();
    const isRecheck = state.quality.status === "result";
    hideQualityComment(true);
    state.quality.status = "reviewing";
    state.quality.batch = isRecheck ? state.quality.batch + 1 : 1;
    state.quality.startedAt = Date.now();
    state.quality.reviewWillComplete = isRecheck && counts.pending === 0 && counts.done > 0;
    saveQualityState();
    saveProjectPatch({ stage: "质量审核", stageDetail: "第 " + state.quality.batch + " 次审核中", progress: 88 });
    setEditorQualityLocked(true);
    updateQualityReviewUI();
    one("#qualityReviewStatusCard").scrollIntoView({ behavior: "smooth", block: "start" });
    state.qualityFrame = window.requestAnimationFrame(runQualityReview);
  }

  function openQualityDetails() {
    const details = one("#qualityReviewStatusDetails");
    const toggle = one("#toggleQualityReviewDetails");
    details.removeAttribute("hidden");
    toggle.setAttribute("aria-expanded", "true");
    toggle.classList.add("active");
    one("span:last-child", toggle).textContent = "收起详情";
  }

  function focusQualityIssue(issueId) {
    const issue = issueById(issueId);
    if (!issue) return;
    state.focusedIssueId = issue.id;
    if (state.activeId !== issue.documentId) switchDocument(issue.documentId);
    showQualityComment(issue);
    window.setTimeout(function () {
      scrollToQualityContent(issue);
    }, 60);
  }

  function completeFocusedQualityIssue() {
    const issue = issueById(state.focusedIssueId);
    if (!issue || issueStatus(issue) !== "pending") return;
    state.quality.issues[issue.id] = "done";
    saveQualityState();
    updateQualityReviewUI();
    focusQualityIssue(issue.id);
    toast(issue.type === "supplement" ? "已标记为人工补充完成，等待再次质量审核" : "已完成人工确认，等待再次质量审核");
  }

  function nodeElement(node) {
    return node && node.nodeType === Node.ELEMENT_NODE ? node : node && node.parentElement;
  }

  function rangeInsideEditor(range) {
    const element = nodeElement(range.commonAncestorContainer);
    return Boolean(element && pagesRoot().contains(element));
  }

  function captureEditorSelection() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!rangeInsideEditor(range)) return;
    state.caretRange = range.cloneRange();
    const selectedText = selection.toString().trim();
    if (selectedText) {
      const page = nodeElement(range.startContainer).closest(".bid-doc-page");
      state.selection = {
        documentId: state.activeId,
        range: range.cloneRange(),
        text: selectedText,
        pageNumber: page ? Number(page.getAttribute("data-page-number")) : state.activePage
      };
      updateAiTarget();
    }
    updateToolbarState();
  }

  function restoreRange(range) {
    if (!range) return false;
    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch (error) {
      return false;
    }
  }

  function executeCommand(command, value) {
    if (state.caretRange) restoreRange(state.caretRange);
    pagesRoot().focus();
    document.execCommand(command, false, value == null ? null : value);
    captureEditorSelection();
    markDirty();
  }

  function updateToolbarState() {
    all("[data-command]", one("#bidRichToolbar")).forEach(function (button) {
      const command = button.getAttribute("data-command");
      if (["bold", "italic", "underline", "strikeThrough", "insertOrderedList", "insertUnorderedList", "justifyLeft", "justifyCenter", "justifyRight"].indexOf(command) === -1) return;
      try { button.classList.toggle("active", document.queryCommandState(command)); } catch (error) { button.classList.remove("active"); }
    });
  }

  function selectionIsReady() {
    return Boolean(state.selection && state.selection.documentId === state.activeId && state.selection.text);
  }

  function setAiPanel(open) {
    const panel = one("#bidAiPanel");
    syncAiPanelTop();
    panel.classList.toggle("open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    one("#bidAiLauncher").classList.toggle("hidden", open);
    document.body.classList.toggle("bid-ai-open", open && !panel.classList.contains("maximized"));
    if (open && !one("#bidAiMessages").children.length && !state.aiAction) one("#bidAiWelcome").classList.remove("hidden");
  }

  function syncAiPanelTop() {
    const topbar = one(".topbar");
    const visibleBottom = topbar ? Math.max(0, Math.min(topbar.offsetHeight, topbar.getBoundingClientRect().bottom)) : 0;
    const value = Math.round(visibleBottom) + "px";
    if (document.body.style.getPropertyValue("--bid-ai-top") !== value) document.body.style.setProperty("--bid-ai-top", value);
  }

  function updateAiTarget() {
    const target = one("#bidAiTarget");
    if (!selectionIsReady()) {
      target.classList.add("hidden");
      return;
    }
    one("#bidAiTargetTitle").textContent = currentDocument().name + " · 第 " + state.selection.pageNumber + " 页 · 已选择 " + state.selection.text.length + " 字";
    one("#bidAiTargetText").textContent = state.selection.text.slice(0, 180);
    target.classList.toggle("hidden", !state.aiAction);
    if (state.aiAction) one("#bidAiWelcome").classList.add("hidden");
  }

  function openAiForSelection() {
    setAiPanel(true);
  }

  function normalizeCandidateText(text) {
    return text.replace(/\s+/g, " ").replace(/\s+([，。；：！？])/g, "$1").trim();
  }

  function candidateText(action, source, request) {
    const value = normalizeCandidateText(source);
    if (action === "shorten") {
      const sentences = value.split(/(?<=[。！？；])/).filter(Boolean);
      return sentences.slice(0, Math.max(1, Math.min(3, sentences.length))).join("");
    }
    if (action === "expand") {
      return value + " 执行过程中，将以采购文件和经人工确认的项目资料为依据，明确责任边界、过程记录与验收凭证；涉及人员、资质、业绩、报价、时效及量化指标的内容，均以最终确认结果为准。";
    }
    if (action === "polish") {
      const polished = value.replace(/我公司/g, "本公司").replace(/进行/g, "开展").replace(/保证/g, "确保").replace(/可以/g, "可");
      return polished + " 相关内容将以采购文件及经人工确认的项目资料为准，确保表述严谨、口径一致且可追溯。";
    }
    if (action === "imitate") {
      return "围绕本章节既定目标，本公司将延续原文的专业表达与结构层次，系统说明" + value.replace(/[。！？]+$/, "") + "。相关事实、材料与承诺均以采购文件及人工确认内容为准。";
    }
    if (action === "continue") {
      return value + " 在后续实施中，将按计划、执行、检查和改进的闭环推进，形成可追踪的过程记录，并在关键节点组织人工复核。";
    }
    if (action === "deep") {
      return "本章节以采购要求为基线，从目标理解、实施路径、过程控制和成果验收四个层面展开。" + value + " 同时建立责任到人、节点可查、材料可追溯的执行机制；涉及资质、人员、业绩、报价及量化承诺的内容，必须引用已确认材料，不由 AI 自动补造。";
    }
    if (action === "custom" && request) {
      return "根据“" + request.replace(/\s+/g, " ").slice(0, 48) + "”的处理要求，本段调整为：" + value + " 所涉事实、参数与承诺均保持原口径，并以原始材料及人工确认结果为准。";
    }
    const rewritten = value.replace(/我公司/g, "本公司").replace(/愿意/g, "同意").replace(/明白/g, "已充分知悉").replace(/进行/g, "开展");
    return "本公司已充分理解本章节相关要求，将在保持原有事实、参数及承诺不变的前提下，按照采购文件约定有序落实。" + rewritten;
  }

  function candidateAnchor(range) {
    const element = nodeElement(range.endContainer);
    if (!element) return null;
    const cell = element.closest("td, th");
    if (cell) return cell.closest("table");
    return element.closest("p, h1, h2, h3, h4, h5, h6, ul, ol, table, figure") || element.closest(".bid-page-content");
  }

  function clearSourceHighlight() {
    all(".ai-source-active", pagesRoot()).forEach(function (element) { element.classList.remove("ai-source-active"); });
  }

  function markSelectedBlocks(range) {
    clearSourceHighlight();
    all("p, h1, h2, h3, h4, h5, h6, li, td, th", pagesRoot()).forEach(function (block) {
      try {
        if (range.intersectsNode(block)) block.classList.add("ai-source-active");
      } catch (error) { /* ignore detached nodes */ }
    });
  }

  function removeCandidate() {
    state.generationToken += 1;
    state.aiThinking = false;
    window.clearInterval(state.aiElapsedTimer);
    window.clearInterval(state.aiTypingTimer);
    state.aiElapsedTimer = 0;
    state.aiTypingTimer = 0;
    if (state.candidate && state.candidate.element) state.candidate.element.remove();
    state.candidate = null;
    clearSourceHighlight();
  }

  function candidateMarkup(text, action) {
    return '<div class="ai-candidate-head"><span class="ai-tag">' + escapeHtml((aiOperations[action] || aiOperations.custom).label) + '</span><span>AI 候选内容</span><span class="ai-note">采纳前不会改动正文</span></div>' +
      '<div class="ai-candidate-body">' + escapeHtml(text) + "</div>" +
      '<div class="ai-candidate-actions"><button type="button" data-candidate-action="regenerate"><svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5"/><path d="M6 9a7 7 0 0 1 11-3l3 3M18 15a7 7 0 0 1-11 3l-3-3"/></svg>重新生成</button><button class="danger" type="button" data-candidate-action="discard"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>弃用</button><button class="primary" type="button" data-candidate-action="replace"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>采纳</button></div>';
  }

  function appendAiProcess(action) {
    const messages = one("#bidAiMessages");
    one("#bidAiWelcome").classList.add("hidden");
    const message = document.createElement("div");
    message.className = "bid-ai-message assistant ai-process";
    message.innerHTML = '<span class="bid-ai-message-avatar"><svg viewBox="0 0 24 24"><path d="M12 3 9.8 8.8 4 11l5.8 2.2L12 19l2.2-5.8L20 11l-5.8-2.2L12 3z"/></svg></span>' +
      '<div class="bid-ai-process-content"><section class="bid-thinking-box">' +
        '<button class="bid-thinking-head" type="button" aria-expanded="true">' +
          '<span class="bid-thinking-spinner"></span><strong>思考过程</strong><em class="bid-thinking-time">用时 0s</em>' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>' +
        '</button>' +
        '<div class="bid-ai-process-list">' +
          '<div class="bid-ai-process-step active"><span class="bid-ai-process-dot">·</span><div><strong>解析写作意图</strong><small>识别“' + escapeHtml((aiOperations[action] || aiOperations.custom).label) + '”能力、用户要求与目标文本。</small></div></div>' +
          '<div class="bid-ai-process-step"><span class="bid-ai-process-dot"></span><div><strong>理解章节上下文</strong><small>关联当前标书、页码及选区前后内容，确认表达位置。</small></div></div>' +
          '<div class="bid-ai-process-step"><span class="bid-ai-process-dot"></span><div><strong>核对事实边界</strong><small>检查企业资质、人员、业绩、报价、参数和承诺不被虚构。</small></div></div>' +
          '<div class="bid-ai-process-step"><span class="bid-ai-process-dot"></span><div><strong>组织并校验候选内容</strong><small>按投标文件语气生成文本，复核术语、结构和可采纳性。</small></div></div>' +
        '</div>' +
      '</section></div>';
    messages.appendChild(message);
    const box = one(".bid-thinking-box", message);
    const head = one(".bid-thinking-head", message);
    head.addEventListener("click", function () {
      const collapsed = box.classList.toggle("collapsed");
      head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
    scrollAiChatToBottom();
    return message;
  }

  function updateAiProcess(message, step) {
    const rows = all(".bid-ai-process-step", message);
    rows.forEach(function (row, index) {
      row.classList.toggle("done", index < step);
      row.classList.toggle("active", index === step);
      const dot = one(".bid-ai-process-dot", row);
      dot.textContent = index < step ? "✓" : index === step ? "·" : "";
    });
    if (step >= rows.length) {
      const box = one(".bid-thinking-box", message);
      const head = one(".bid-thinking-head", message);
      message.classList.add("complete");
      box.classList.add("collapsed");
      head.setAttribute("aria-expanded", "false");
      one(".bid-thinking-spinner", message).classList.add("done");
    }
    scrollAiChatToBottom();
  }

  function generateCandidate(action, request, attachments) {
    if (!selectionIsReady()) {
      toast("请先在正文中选择需要处理的章节或文字", "warning", "#bidAiPanel");
      return;
    }
    if (state.aiThinking || state.aiTypingTimer) return;
    removeCandidate();
    const attachmentList = Array.isArray(attachments) ? attachments.slice() : [];
    const sourceRange = state.selection.range.cloneRange();
    const anchor = candidateAnchor(sourceRange);
    if (!anchor) return;
    markSelectedBlocks(sourceRange);
    const sourceText = state.selection.text;
    const text = candidateText(action, sourceText, request || "");
    setAiPanel(true);
    state.aiThinking = true;
    const token = ++state.generationToken;
    showAiInlineStatus("正在生成...", "AI 正在理解选区并组织候选内容", false);
    const process = appendAiProcess(action);
    const startedAt = Date.now();
    window.clearInterval(state.aiElapsedTimer);
    state.aiElapsedTimer = window.setInterval(function () {
      if (token !== state.generationToken) return;
      one(".bid-thinking-time", process).textContent = "用时 " + Math.max(1, Math.ceil((Date.now() - startedAt) / 1000)) + "s";
    }, 250);
    window.setTimeout(function () { if (token === state.generationToken) updateAiProcess(process, 1); }, 340);
    window.setTimeout(function () { if (token === state.generationToken) updateAiProcess(process, 2); }, 680);
    window.setTimeout(function () { if (token === state.generationToken) updateAiProcess(process, 3); }, 1020);
    window.setTimeout(function () {
      if (token !== state.generationToken) return;
      updateAiProcess(process, 4);
      const element = document.createElement("aside");
      element.className = "ai-inline-candidate generating";
      element.setAttribute("contenteditable", "false");
      element.innerHTML = candidateMarkup(text, action);
      anchor.insertAdjacentElement("afterend", element);
      state.candidate = { element: element, text: text, action: action, range: sourceRange, anchor: anchor, request: request || "", attachments: attachmentList };
      window.clearInterval(state.aiElapsedTimer);
      state.aiElapsedTimer = 0;
      one(".bid-thinking-time", process).textContent = "用时 " + Math.max(1, Math.ceil((Date.now() - startedAt) / 1000)) + "s";
      showAiInlineStatus("AI 已生成候选内容", "请在正文或聊天窗口确认采纳、弃用或继续调整", true);
      appendAiResult(action, request || "", sourceText, text, attachmentList, token, function () {
        if (token !== state.generationToken) return;
        state.aiThinking = false;
        element.classList.remove("generating");
      });
      const canvas = one("#bidDocumentCanvas");
      const canvasRect = canvas.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      canvas.scrollTo({ top: Math.max(0, canvas.scrollTop + elementRect.top - canvasRect.top - (canvas.clientHeight / 2)), behavior: "smooth" });
    }, 1420);
  }

  function replaceWithCandidate() {
    if (!state.candidate) return;
    const candidate = state.candidate;
    try {
      const range = candidate.range;
      range.deleteContents();
      const node = document.createTextNode(candidate.text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      state.caretRange = range.cloneRange();
      restoreRange(range);
      removeCandidate();
      markDirty();
      updateLatestAiResult("已采纳", "accepted");
      appendAiMessage("assistant", "已采纳候选内容并替换原选区。", "正文已进入自动保存队列");
      showAiInlineStatus("已采纳到正文", "AI 候选内容已写入当前标书", true, true);
      resetAiComposer(true);
      toast("AI 候选已采纳并替换选中内容");
    } catch (error) {
      toast("原选区已发生变化，请重新选择正文", "warning", "#bidAiTarget");
      removeCandidate();
    }
  }

  function insertCandidateAfter() {
    if (!state.candidate) return;
    const paragraph = document.createElement("p");
    paragraph.textContent = state.candidate.text;
    state.candidate.anchor.insertAdjacentElement("afterend", paragraph);
    removeCandidate();
    markDirty();
    updateLatestAiResult("已采纳", "accepted");
    appendAiMessage("assistant", "已采纳候选内容并插入为新段落。", "正文已进入自动保存队列");
    showAiInlineStatus("已采纳到正文", "AI 候选内容已写入当前标书", true, true);
    resetAiComposer(true);
    toast("AI 候选已采纳并插入正文");
  }

  function handleCandidateAction(type) {
    if (state.aiThinking || state.aiTypingTimer) {
      toast("候选内容仍在输出，请稍候");
      return;
    }
    if (type === "accept" || type === "replace") {
      replaceWithCandidate();
      return;
    }
    if (type === "insert") {
      insertCandidateAfter();
      return;
    }
    if (type === "discard") {
      removeCandidate();
      updateLatestAiResult("已弃用", "discarded");
      appendAiMessage("assistant", "已弃用本次候选内容，正文保持不变。", "可以调整要求后重新发起生成");
      showAiInlineStatus("已弃用候选内容", "正文内容保持不变", true, true);
      toast("已弃用 AI 候选内容");
      return;
    }
    if (type === "regenerate" && state.candidate) {
      const candidate = state.candidate;
      updateLatestAiResult("已重新生成", "superseded");
      generateCandidate(candidate.action, candidate.request || "", candidate.attachments || []);
      toast("正在重新生成候选内容");
    }
  }

  function updateLatestAiResult(status, className) {
    const cards = all(".bid-ai-result-card", one("#bidAiMessages"));
    const card = cards[cards.length - 1];
    if (!card) return;
    card.classList.remove("accepted", "discarded", "superseded");
    if (className) card.classList.add(className);
    const statusElement = one("header > em", card);
    if (statusElement) statusElement.textContent = status;
    const footerState = one("footer > span", card);
    if (footerState) footerState.innerHTML = "<i></i>" + escapeHtml(status === "已采纳" ? "已写入正文" : status === "已弃用" ? "正文保持不变" : "已生成新候选");
    all("[data-ai-result-action]", card).forEach(function (button) { button.disabled = true; });
  }

  function appendAiMessage(role, text, note) {
    one("#bidAiWelcome").classList.add("hidden");
    const messages = one("#bidAiMessages");
    const message = document.createElement("div");
    message.className = "bid-ai-message " + role;
    message.innerHTML = role === "assistant"
      ? '<span class="bid-ai-message-avatar"><svg viewBox="0 0 24 24"><path d="M12 3 9.8 8.8 4 11l5.8 2.2L12 19l2.2-5.8L20 11l-5.8-2.2L12 3z"/></svg></span><div><p>' + escapeHtml(text) + "</p>" + (note ? "<small>" + escapeHtml(note) + "</small>" : "") + "</div>"
      : "<div><p>" + escapeHtml(text) + "</p></div>";
    messages.appendChild(message);
    scrollAiChatToBottom();
    return message;
  }

  function appendAiUserMessage(text, attachments) {
    one("#bidAiWelcome").classList.add("hidden");
    const message = document.createElement("div");
    message.className = "bid-ai-message user";
    const items = (attachments || []).map(function (attachment) {
      const name = attachment.file && attachment.file.name ? attachment.file.name : "附件";
      const extension = (name.split(".").pop() || "文件").toUpperCase().slice(0, 4);
      return '<span class="bid-ai-user-attachment">' + (attachment.type === "image"
        ? '<img src="' + escapeHtml(attachment.previewUrl) + '" alt="已上传图片"/>'
        : '<i>' + escapeHtml(extension) + '</i>') + '<span title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</span></span>';
    }).join("");
    message.innerHTML = '<div><p>' + escapeHtml(text) + '</p>' + (items ? '<div class="bid-ai-user-attachments">' + items + '</div>' : '') + '</div>';
    one("#bidAiMessages").appendChild(message);
    scrollAiChatToBottom();
    return message;
  }

  function appendAiResult(action, request, sourceText, generatedText, attachments, token, onDone) {
    one("#bidAiWelcome").classList.add("hidden");
    const operation = aiOperations[action] || aiOperations.custom;
    const strategyMap = {
      rewrite: "调整语序和书面表达，保留原有事实、参数与承诺",
      expand: "补充实施路径、过程记录与验收依据，不新增企业事实",
      imitate: "沿用当前章节的语气和结构，保持投标业务语境一致",
      polish: "优化措辞、逻辑衔接与专业表达，统一上下文口径",
      shorten: "压缩重复内容，保留核心要求、数据与结论",
      continue: "承接原文结尾继续展开，补充后续执行与复核动作",
      deep: "按目标、路径、控制和验收重组内容，强化完整性",
      custom: "按用户要求调整表达，并保留原始事实边界"
    };
    const requirement = request || "保持事实、参数和承诺不变，按当前章节语境优化表达";
    const sourcePreview = sourceText.length > 260 ? sourceText.slice(0, 260) + "…" : sourceText;
    const attachmentNames = (attachments || []).map(function (attachment) { return attachment.file && attachment.file.name ? attachment.file.name : "附件"; });
    const messages = one("#bidAiMessages");
    const message = document.createElement("div");
    message.className = "bid-ai-message assistant bid-ai-result-message";
    message.innerHTML = '<span class="bid-ai-message-avatar"><svg viewBox="0 0 24 24"><path d="M12 3 9.8 8.8 4 11l5.8 2.2L12 19l2.2-5.8L20 11l-5.8-2.2L12 3z"/></svg></span>' +
      '<div class="bid-ai-result-card">' +
        '<header><div><span class="bid-ai-result-tag">' + escapeHtml(operation.label) + '结果</span><strong>候选内容已生成</strong></div><em>待确认</em></header>' +
        '<section><span>处理要求</span><p>' + escapeHtml(requirement) + '</p></section>' +
        '<section><span>处理策略</span><p>' + escapeHtml(strategyMap[action] || strategyMap.custom) + '</p></section>' +
        (attachmentNames.length ? '<section class="attachments"><span>参考附件</span><p>' + escapeHtml(attachmentNames.join("、")) + '</p></section>' : '') +
        '<section class="source"><span>已选原文</span><p>' + escapeHtml(sourcePreview) + '</p></section>' +
        '<section class="generated"><span>候选内容 · 正在输出</span><p class="typing"></p></section>' +
        '<div class="bid-ai-result-actions">' +
          '<button type="button" data-ai-result-action="regenerate" disabled><svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5"/><path d="M6 9a7 7 0 0 1 11-3l3 3M18 15a7 7 0 0 1-11 3l-3-3"/></svg>重新生成</button>' +
          '<button class="danger" type="button" data-ai-result-action="discard" disabled><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>弃用</button>' +
          '<button class="primary" type="button" data-ai-result-action="accept" disabled><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>采纳</button>' +
        '</div>' +
        '<footer><span><i></i>已同步到正文旁</span><em>采纳前不会改动原文</em></footer>' +
      '</div>';
    messages.appendChild(message);
    scrollAiChatToBottom();
    const output = one("section.generated p", message);
    const outputLabel = one("section.generated > span", message);
    let index = 0;
    function finishTyping() {
      window.clearInterval(state.aiTypingTimer);
      state.aiTypingTimer = 0;
      output.classList.remove("typing");
      outputLabel.textContent = "候选内容";
      all("[data-ai-result-action]", message).forEach(function (button) { button.disabled = false; });
      scrollAiChatToBottom();
      if (onDone) onDone();
    }
    if (!generatedText) {
      finishTyping();
      return message;
    }
    window.clearInterval(state.aiTypingTimer);
    state.aiTypingTimer = window.setInterval(function () {
      if (token !== state.generationToken) {
        window.clearInterval(state.aiTypingTimer);
        state.aiTypingTimer = 0;
        return;
      }
      const nextIndex = Math.min(generatedText.length, index + 2);
      output.textContent += generatedText.slice(index, nextIndex);
      index = nextIndex;
      if (index % 12 === 0) scrollAiChatToBottom();
      if (index >= generatedText.length) finishTyping();
    }, 22);
    return message;
  }

  function formatAiFileSize(size) {
    if (!size) return "0 KB";
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + " KB";
    return (size / 1024 / 1024).toFixed(1) + " MB";
  }

  function renderAiAttachments() {
    const preview = one("#bidAiAttachmentPreview");
    preview.innerHTML = "";
    preview.classList.toggle("hidden", !state.aiAttachments.length);
    state.aiAttachments.forEach(function (attachment) {
      const chip = document.createElement("div");
      chip.className = "bid-ai-attachment-chip";
      const name = attachment.file.name;
      const extension = (name.split(".").pop() || "文件").toUpperCase().slice(0, 4);
      chip.innerHTML = (attachment.type === "image"
        ? '<img src="' + escapeHtml(attachment.previewUrl) + '" alt="图片附件"/>'
        : '<span class="bid-ai-attachment-file-icon">' + escapeHtml(extension) + '</span>') +
        '<span class="bid-ai-attachment-info"><strong title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</strong><span>' + formatAiFileSize(attachment.file.size) + '</span></span>' +
        '<button class="bid-ai-attachment-remove" type="button" title="移除附件" aria-label="移除附件"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button>';
      one(".bid-ai-attachment-remove", chip).addEventListener("click", function () { removeAiAttachment(attachment.id); });
      preview.appendChild(chip);
    });
    one("#bidAiInputHint").textContent = state.aiAttachments.length
      ? "已添加 " + state.aiAttachments.length + " 个附件 · Enter 发送"
      : selectionIsReady() ? "已带入选区 · Enter 发送" : "选择正文后右键发起 · Enter 发送";
  }

  function addAiAttachment(type, file) {
    if (!file) return;
    if (state.aiAttachments.length >= 6) {
      toast("最多上传 6 个图片或附件", "warning", "#bidAiComposer");
      return;
    }
    state.aiAttachments.push({
      id: "bid-ai-attachment-" + Date.now() + "-" + Math.random().toString(16).slice(2, 6),
      type: type,
      file: file,
      previewUrl: type === "image" ? URL.createObjectURL(file) : ""
    });
    renderAiAttachments();
  }

  function removeAiAttachment(id) {
    const index = state.aiAttachments.findIndex(function (attachment) { return attachment.id === id; });
    if (index < 0) return;
    const attachment = state.aiAttachments[index];
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    state.aiAttachments.splice(index, 1);
    renderAiAttachments();
  }

  function clearAiAttachments(revokeUrls) {
    if (revokeUrls) {
      state.aiAttachments.forEach(function (attachment) {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
    }
    state.aiAttachments = [];
    renderAiAttachments();
  }

  function showAiInlineStatus(title, description, done, autoDismiss) {
    const status = one("#bidAiInlineStatus");
    const action = one("#bidAiInlineStatusAction");
    window.clearTimeout(state.aiStatusTimer);
    state.aiStatusTimer = 0;
    status.classList.remove("hidden");
    status.classList.toggle("done", Boolean(done));
    one("#bidAiInlineStatusTitle").textContent = title;
    one("#bidAiInlineStatusDescription").textContent = description || "";
    action.textContent = done ? "知道了" : "停止 Esc";
    action.classList.toggle("hidden", Boolean(autoDismiss));
    if (autoDismiss) state.aiStatusTimer = window.setTimeout(hideAiInlineStatus, 3200);
  }

  function hideAiInlineStatus() {
    const status = one("#bidAiInlineStatus");
    window.clearTimeout(state.aiStatusTimer);
    state.aiStatusTimer = 0;
    status.classList.add("hidden");
    status.classList.remove("done");
  }

  function scrollAiChatToBottom() {
    const body = one("#bidAiChatBody");
    window.requestAnimationFrame(function () { body.scrollTop = body.scrollHeight; });
  }

  function cancelAiGeneration() {
    if (!state.aiThinking && !state.aiTypingTimer) return;
    state.generationToken += 1;
    state.aiThinking = false;
    window.clearInterval(state.aiElapsedTimer);
    window.clearInterval(state.aiTypingTimer);
    state.aiElapsedTimer = 0;
    state.aiTypingTimer = 0;
    if (state.candidate && state.candidate.element) state.candidate.element.remove();
    state.candidate = null;
    clearSourceHighlight();
    all(".bid-ai-message.ai-process:not(.complete)", one("#bidAiMessages")).forEach(function (message) {
      message.classList.add("complete", "stopped");
      one(".bid-thinking-box", message).classList.add("collapsed");
      one(".bid-thinking-head", message).setAttribute("aria-expanded", "false");
      one(".bid-thinking-spinner", message).classList.add("done");
      one(".bid-thinking-time", message).textContent = "已停止";
    });
    showAiInlineStatus("已停止生成", "本次 AI 编辑已停止，正文内容保持不变", true, true);
  }

  function resetAiComposer(clearSelection) {
    state.aiAction = "";
    const composer = one("#bidAiComposer");
    composer.classList.remove("has-action");
    one("#bidAiActionPrefix").classList.add("hidden");
    one("#bidAiInput").value = "";
    one("#bidAiInput").placeholder = "向 AI 编辑助手提问，或先在正文中选择内容并右键发起 AI 写作";
    one("#bidAiInputHint").textContent = "选择正文后右键发起 · Enter 发送";
    one("#bidAiSubtitle").innerHTML = "<i></i>内容由 AI 生成";
    all(".bid-ai-chip-row button").forEach(function (button) { button.classList.remove("active"); });
    if (clearSelection) {
      clearAiAttachments(true);
      state.selection = null;
      clearSourceHighlight();
    }
    updateAiTarget();
    if (!one("#bidAiMessages").children.length) one("#bidAiWelcome").classList.remove("hidden");
  }

  function setAiAction(action, focusInput) {
    const operation = aiOperations[action] || aiOperations.custom;
    state.aiAction = action || "custom";
    setAiPanel(true);
    updateAiTarget();
    const composer = one("#bidAiComposer");
    composer.classList.add("has-action");
    one("#bidAiActionPrefix").textContent = operation.label + "：";
    one("#bidAiActionPrefix").classList.remove("hidden");
    one("#bidAiTargetBadge").textContent = operation.label;
    one("#bidAiSubtitle").innerHTML = "<i></i>当前操作：" + escapeHtml(operation.label);
    all(".bid-ai-chip-row button").forEach(function (button) { button.classList.toggle("active", button.getAttribute("data-ai-action") === action); });
    const input = one("#bidAiInput");
    input.placeholder = operation.placeholder;
    one("#bidAiInputHint").textContent = selectionIsReady() ? "已带入选区 · Enter 发送" : "请先在正文中选择内容";
    if (selectionIsReady()) {
      one("#bidAiWelcome").classList.add("hidden");
      markSelectedBlocks(state.selection.range);
    } else {
      one("#bidAiWelcome").classList.remove("hidden");
      toast("请先在正文中选择需要处理的章节或文字", "warning", "#bidAiPanel");
    }
    if (focusInput) window.setTimeout(function () { input.focus(); }, 40);
  }

  function sendAiMessage() {
    const input = one("#bidAiInput");
    const request = input.value.trim();
    if (state.aiThinking || state.aiTypingTimer) {
      toast("AI 正在处理当前要求，请稍候");
      return;
    }
    if (!selectionIsReady()) {
      toast("请先选择需要处理的章节或文字", "warning", "#bidAiPanel");
      return;
    }
    const action = state.aiAction || "rewrite";
    const operation = aiOperations[action] || aiOperations.custom;
    const attachments = state.aiAttachments.slice();
    appendAiUserMessage(operation.label + "：" + (request || "保持事实、参数和承诺不变，按当前章节语境优化表达"), attachments);
    input.value = "";
    clearAiAttachments(false);
    one("#bidAiInputHint").textContent = "已带入选区 · Enter 发送";
    generateCandidate(action, request, attachments);
  }

  function showAiMenu(event) {
    captureEditorSelection();
    if (!selectionIsReady()) return;
    event.preventDefault();
    const menu = one("#aiWriteMenu");
    menu.classList.remove("hidden");
    one("#aiMenuSelectionPreview").textContent = "已选择 " + state.selection.text.length + " 字 · " + state.selection.text.slice(0, 20) + (state.selection.text.length > 20 ? "…" : "");
    const left = Math.min(event.clientX, window.innerWidth - 260);
    const top = Math.min(event.clientY, window.innerHeight - 470);
    menu.style.left = Math.max(10, left) + "px";
    menu.style.top = Math.max(10, top) + "px";
  }

  function decorateFigures() {
    all(".doc-figure", pagesRoot()).forEach(function (figure) {
      figure.setAttribute("contenteditable", "false");
      if (one(".doc-image-tools", figure)) return;
      const tools = document.createElement("span");
      tools.className = "doc-image-tools";
      tools.setAttribute("contenteditable", "false");
      tools.innerHTML = '<button type="button" data-image-size="small">窄版</button><button type="button" data-image-size="medium">适中</button><button type="button" data-image-size="wide">通栏</button><button type="button" data-image-action="delete">删除</button>';
      figure.appendChild(tools);
    });
  }

  function clearSelectedFigures(except) {
    all(".doc-figure.selected", pagesRoot()).forEach(function (figure) {
      if (figure !== except) figure.classList.remove("selected");
    });
  }

  function handleFigureAction(event) {
    const sizeButton = event.target.closest("[data-image-size]");
    const deleteButton = event.target.closest("[data-image-action='delete']");
    const figure = event.target.closest(".doc-figure");
    if (!figure) return false;
    clearSelectedFigures(figure);
    figure.classList.add("selected");
    if (sizeButton) {
      figure.classList.remove("size-small", "size-medium", "size-wide");
      figure.classList.add("size-" + sizeButton.getAttribute("data-image-size"));
      markDirty();
    }
    if (deleteButton) {
      figure.remove();
      markDirty();
    }
    return true;
  }

  function insertImageFile(file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) return;
    const reader = new FileReader();
    reader.addEventListener("load", function () {
      const range = state.caretRange && rangeInsideEditor(state.caretRange) ? state.caretRange : null;
      const figure = document.createElement("figure");
      figure.className = "doc-figure inserted-image size-medium";
      figure.setAttribute("contenteditable", "false");
      figure.innerHTML = '<img src="' + String(reader.result) + '" alt="' + escapeHtml(file.name) + '" contenteditable="false"><figcaption contenteditable="false">' + escapeHtml(file.name) + "</figcaption>";
      if (range) {
        const anchor = candidateAnchor(range);
        if (anchor) anchor.insertAdjacentElement("afterend", figure);
      } else {
        const page = one("#bid-page-" + state.activeId + "-" + state.activePage + " .bid-page-content");
        page.appendChild(figure);
      }
      decorateFigures();
      clearSelectedFigures(figure);
      figure.classList.add("selected");
      figure.scrollIntoView({ behavior: "smooth", block: "center" });
      markDirty();
    });
    reader.readAsDataURL(file);
  }

  function applyLineHeight(value) {
    if (!value) return;
    const range = state.caretRange && rangeInsideEditor(state.caretRange) ? state.caretRange : null;
    if (!range) return;
    const blocks = all("p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th", pagesRoot()).filter(function (block) {
      try { return range.intersectsNode(block); } catch (error) { return false; }
    });
    if (!blocks.length) {
      const block = nodeElement(range.commonAncestorContainer).closest("p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th");
      if (block) blocks.push(block);
    }
    blocks.forEach(function (block) { block.style.lineHeight = value; });
    markDirty();
  }

  function insertTableAtCaret() {
    if (state.caretRange) restoreRange(state.caretRange);
    pagesRoot().focus();
    const rows = 3;
    const columns = 3;
    let html = '<table><tbody>';
    for (let row = 0; row < rows; row += 1) {
      html += "<tr>";
      for (let column = 0; column < columns; column += 1) html += row === 0 ? "<th>标题</th>" : "<td>内容</td>";
      html += "</tr>";
    }
    html += "</tbody></table><p><br></p>";
    document.execCommand("insertHTML", false, html);
    captureEditorSelection();
    markDirty();
  }

  function clearFindHighlights() {
    all("mark.bid-find-hit", pagesRoot()).forEach(function (mark) {
      mark.replaceWith(document.createTextNode(mark.textContent || ""));
    });
    pagesRoot().normalize();
  }

  function findHits() { return all("mark.bid-find-hit", pagesRoot()); }

  function updateFindCount(index) {
    const hits = findHits();
    one("#bidFindCount").textContent = hits.length ? (index + 1) + "/" + hits.length : "0/0";
  }

  function moveFindResult(offset) {
    const hits = findHits();
    if (!hits.length) { updateFindCount(0); return; }
    let current = hits.findIndex(function (hit) { return hit.classList.contains("current"); });
    current = (current + offset + hits.length) % hits.length;
    hits.forEach(function (hit, index) { hit.classList.toggle("current", index === current); });
    hits[current].scrollIntoView({ behavior: "smooth", block: "center" });
    updateFindCount(current);
  }

  function runFind() {
    clearFindHighlights();
    const query = one("#bidFindInput").value.trim();
    if (!query) { updateFindCount(0); return; }
    const walker = document.createTreeWalker(pagesRoot(), NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("[contenteditable='false'], .ai-inline-candidate, .doc-image-tools")) return NodeFilter.FILTER_REJECT;
        return node.nodeValue && node.nodeValue.toLocaleLowerCase("zh-CN").indexOf(query.toLocaleLowerCase("zh-CN")) !== -1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      const text = node.nodeValue;
      const lower = text.toLocaleLowerCase("zh-CN");
      const needle = query.toLocaleLowerCase("zh-CN");
      const fragment = document.createDocumentFragment();
      let start = 0;
      let index = lower.indexOf(needle, start);
      while (index !== -1) {
        fragment.appendChild(document.createTextNode(text.slice(start, index)));
        const mark = document.createElement("mark");
        mark.className = "bid-find-hit";
        mark.textContent = text.slice(index, index + query.length);
        fragment.appendChild(mark);
        start = index + query.length;
        index = lower.indexOf(needle, start);
      }
      fragment.appendChild(document.createTextNode(text.slice(start)));
      node.replaceWith(fragment);
    });
    const hits = findHits();
    if (hits.length) {
      hits[0].classList.add("current");
      hits[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
    updateFindCount(0);
  }

  function setFindOpen(open) {
    const bar = one("#bidEditorFind");
    bar.classList.toggle("hidden", !open);
    if (open) {
      window.setTimeout(function () { one("#bidFindInput").focus(); one("#bidFindInput").select(); }, 20);
    } else {
      clearFindHighlights();
      updateFindCount(0);
    }
  }

  function bindToolbar() {
    one("#bidRichToolbar").addEventListener("mousedown", function (event) {
      if (event.target.closest("button")) event.preventDefault();
    });
    all("[data-command]", one("#bidRichToolbar")).forEach(function (button) {
      button.addEventListener("click", function () { executeCommand(button.getAttribute("data-command"), button.getAttribute("data-command-value")); });
    });
    one("#formatBlockSelect").addEventListener("change", function (event) { executeCommand("formatBlock", "<" + event.target.value + ">"); });
    one("#fontNameSelect").addEventListener("change", function (event) { executeCommand("fontName", event.target.value); });
    one("#fontSizeSelect").addEventListener("change", function (event) { executeCommand("fontSize", event.target.value); });
    one("#foreColorInput").addEventListener("input", function (event) {
      one(".toolbar-color").style.setProperty("--toolbar-color", event.target.value);
      executeCommand("foreColor", event.target.value);
    });
    one("#backColorInput").addEventListener("input", function (event) {
      one(".toolbar-highlight").style.setProperty("--toolbar-highlight", event.target.value);
      executeCommand("hiliteColor", event.target.value);
    });
    one("#lineHeightSelect").addEventListener("change", function (event) { applyLineHeight(event.target.value); });
    one("#insertLinkButton").addEventListener("click", function () {
      const url = window.prompt("请输入链接地址", "https://");
      if (url) executeCommand("createLink", url);
    });
    one("#insertHorizontalRuleButton").addEventListener("click", function () { executeCommand("insertHorizontalRule"); });
    one("#insertTableButton").addEventListener("click", insertTableAtCaret);
    one("#findInDocumentButton").addEventListener("click", function () { setFindOpen(true); });
    one("#bidFindInput").addEventListener("input", runFind);
    one("#bidFindPrevious").addEventListener("click", function () { moveFindResult(-1); });
    one("#bidFindNext").addEventListener("click", function () { moveFindResult(1); });
    one("#bidFindClose").addEventListener("click", function () { setFindOpen(false); });
  }

  function bindAiPanelResize() {
    const handle = one("#bidAiResizeHandle");
    handle.addEventListener("mousedown", function (event) {
      if (one("#bidAiPanel").classList.contains("maximized")) return;
      event.preventDefault();
      document.body.classList.add("bid-ai-resizing");
      function move(moveEvent) {
        state.aiWidth = Math.max(330, Math.min(620, window.innerWidth - moveEvent.clientX));
        one("#bidAiPanel").style.width = state.aiWidth + "px";
        document.body.style.setProperty("--bid-ai-width", state.aiWidth + "px");
      }
      function stop() {
        document.body.classList.remove("bid-ai-resizing");
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", stop);
      }
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    });
  }

  function bindEvents() {
    window.addEventListener("scroll", syncAiPanelTop, { passive: true });
    window.addEventListener("resize", syncAiPanelTop);
    window.addEventListener("resize", positionFocusedQualityComment);
    all(".bid-document-tab").forEach(function (button) {
      button.addEventListener("click", function () {
        const documentId = button.getAttribute("data-document-id");
        if (documentId !== state.activeId) hideQualityComment(true);
        switchDocument(documentId);
      });
    });
    one("#bidOutlineList").addEventListener("click", function (event) {
      const button = event.target.closest("[data-page]");
      if (!button) return;
      const issueIds = String(button.getAttribute("data-quality-issues") || "").split(",").filter(Boolean);
      if (issueIds.length) {
        const targetId = issueIds.find(function (issueId) { const issue = issueById(issueId); return issue && issueStatus(issue) === "pending"; }) || issueIds.find(function (issueId) { const issue = issueById(issueId); return issue && issueStatus(issue) === "done"; }) || issueIds[0];
        focusQualityIssue(targetId);
        return;
      }
      scrollToPage(Number(button.getAttribute("data-page")));
    });
    pagesRoot().addEventListener("input", markDirty);
    pagesRoot().addEventListener("input", function () { window.requestAnimationFrame(positionFocusedQualityComment); });
    pagesRoot().addEventListener("contextmenu", showAiMenu);
    pagesRoot().addEventListener("click", function (event) {
      const qualityMark = event.target.closest("[data-quality-issue-id]");
      if (qualityMark) {
        focusQualityIssue(qualityMark.getAttribute("data-quality-issue-id"));
        return;
      }
      const toc = event.target.closest("[data-go-page]");
      if (toc) {
        event.preventDefault();
        scrollToPage(Number(toc.getAttribute("data-go-page")));
        return;
      }
      if (handleFigureAction(event)) return;
      clearSelectedFigures(null);
    });
    pagesRoot().addEventListener("keyup", captureEditorSelection);
    pagesRoot().addEventListener("mouseup", captureEditorSelection);
    document.addEventListener("selectionchange", captureEditorSelection);
    document.addEventListener("click", function (event) {
      if (!event.target.closest("#aiWriteMenu")) one("#aiWriteMenu").classList.add("hidden");
    });
    one("#bidDocumentCanvas").addEventListener("scroll", function () { window.requestAnimationFrame(updateActivePageFromScroll); });

    one("#saveBidDocument").addEventListener("click", function () { saveCurrentDocument(true); });
    one("#insertImageButton").addEventListener("click", function () { one("#insertImageInput").click(); });
    one("#insertImageInput").addEventListener("change", function (event) {
      insertImageFile(event.target.files && event.target.files[0]);
      event.target.value = "";
    });

    one("#zoomOut").addEventListener("click", function () { setZoom(state.zoom - 10); });
    one("#zoomIn").addEventListener("click", function () { setZoom(state.zoom + 10); });
    one("#zoomRange").addEventListener("input", function (event) { setZoom(event.target.value); });
    one("#zoomReset").addEventListener("click", function () { setZoom(100); });

    one("#bidAiLauncher").addEventListener("click", openAiForSelection);
    one("#closeBidAi").addEventListener("click", function () { cancelAiGeneration(); hideAiInlineStatus(); setAiPanel(false); resetAiComposer(true); });
    one("#minimizeBidAi").addEventListener("click", function () { setAiPanel(false); });
    one("#maximizeBidAi").addEventListener("click", function () {
      const panel = one("#bidAiPanel");
      panel.classList.toggle("maximized");
      document.body.classList.toggle("bid-ai-open", panel.classList.contains("open") && !panel.classList.contains("maximized"));
    });
    all("[data-ai-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        const action = button.getAttribute("data-ai-action");
        one("#aiWriteMenu").classList.add("hidden");
        setAiAction(action, true);
      });
    });
    one("#clearBidAiTarget").addEventListener("click", function () { resetAiComposer(true); });
    one("#sendBidAiMessage").addEventListener("click", sendAiMessage);
    one("#bidAiUploadImage").addEventListener("click", function () { one("#bidAiImageInput").click(); });
    one("#bidAiUploadFile").addEventListener("click", function () { one("#bidAiFileInput").click(); });
    one("#bidAiImageInput").addEventListener("change", function (event) {
      Array.from(event.target.files || []).forEach(function (file) { addAiAttachment("image", file); });
      event.target.value = "";
    });
    one("#bidAiFileInput").addEventListener("change", function (event) {
      Array.from(event.target.files || []).forEach(function (file) { addAiAttachment("file", file); });
      event.target.value = "";
    });
    one("#bidAiInlineStatusAction").addEventListener("click", function () {
      if (one("#bidAiInlineStatus").classList.contains("done")) hideAiInlineStatus();
      else cancelAiGeneration();
    });
    one("#bidAiInput").addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendAiMessage();
      }
    });
    pagesRoot().addEventListener("click", function (event) {
      const action = event.target.closest("[data-candidate-action]");
      if (!action) return;
      handleCandidateAction(action.getAttribute("data-candidate-action"));
    });
    one("#bidAiMessages").addEventListener("click", function (event) {
      const action = event.target.closest("[data-ai-result-action]");
      if (!action || action.disabled) return;
      handleCandidateAction(action.getAttribute("data-ai-result-action"));
    });

    one("#toggleQualityReviewDetails").addEventListener("click", function () {
      const details = one("#qualityReviewStatusDetails");
      const willOpen = details.hasAttribute("hidden");
      if (willOpen) details.removeAttribute("hidden");
      else details.setAttribute("hidden", "");
      this.setAttribute("aria-expanded", String(willOpen));
      this.classList.toggle("active", willOpen);
      one("span:last-child", this).textContent = willOpen ? "收起详情" : "展开详情";
    });
    one("#qualityIssueList").addEventListener("click", function (event) {
      const trigger = event.target.closest("[data-quality-locate]");
      if (trigger) focusQualityIssue(trigger.getAttribute("data-quality-locate"));
    });
    one("#qualityFocusTitle").addEventListener("click", function () {
      if (state.focusedIssueId) focusQualityIssue(state.focusedIssueId);
    });
    one("#previousQualityIssue").addEventListener("click", function () { moveFocusedQualityIssue(-1); });
    one("#nextQualityIssue").addEventListener("click", function () { moveFocusedQualityIssue(1); });
    one("#completeQualityIssue").addEventListener("click", completeFocusedQualityIssue);

    one("#submitQualityReview").addEventListener("click", function () {
      if (state.quality.status === "reviewing" || state.quality.status === "complete") return;
      const counts = qualityCounts();
      if (state.quality.status === "result" && counts.pending > 0) {
        openQualityDetails();
        return;
      }
      if (state.dirty) saveCurrentDocument(false);
      const nextBatch = state.quality.status === "result" ? state.quality.batch + 1 : 1;
      one("#submitQualityModalTitle").textContent = state.quality.status === "result" ? "再次提交 AI 质量审核" : "提交 AI 质量审核";
      one("#submitQualityModalDescription").textContent = "技术标和商务标将以当前保存版本建立第 " + nextBatch + " 次审核快照，并在本页面展示审核过程和结果。";
      one("#qualitySubmitVersionText").textContent = "当前保存版本 V1.0." + (nextBatch + 2);
      if (window.projectPrototype) window.projectPrototype.openLayer("submitQualityModal");
    });
    one("#enterDeliveryArchive").addEventListener("click", function (event) {
      event.preventDefault();
      if (window.projectPrototype) window.projectPrototype.openLayer("enterDeliveryModal");
    });
    one("#confirmEnterDelivery").addEventListener("click", function () {
      const deliveryProject = saveProjectPatch({
        stage: "交付归档",
        stageDetail: "质量审核通过，待交付确认",
        progress: 96,
        status: project.status === "archived" ? "archived" : "ongoing"
      });
      if (window.projectPrototype) window.projectPrototype.closeLayers();
      window.location.href = "project-delivery.html?id=" + encodeURIComponent(deliveryProject.id || "BID-202601-001");
    });
    one("#confirmSubmitQuality").addEventListener("click", function () {
      if (window.projectPrototype) window.projectPrototype.closeLayers();
      toast("当前保存版本已提交质量审核");
      startQualityReview();
    });

    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveCurrentDocument(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindOpen(true);
      }
      if (event.key === "Escape" && state.aiThinking && !one("#bidAiInlineStatus").classList.contains("done")) cancelAiGeneration();
      if (event.key === "Escape" && !one("#bidEditorFind").classList.contains("hidden")) setFindOpen(false);
    });
    window.addEventListener("beforeunload", function (event) {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  state.quality = loadQualityState();
  syncAiPanelTop();
  renderOutline();
  renderDocument();
  bindToolbar();
  bindAiPanelResize();
  bindEvents();
  updateQualityReviewUI();
  if (state.quality.status === "reviewing") {
    setEditorQualityLocked(true);
    if (Date.now() - Number(state.quality.startedAt || 0) >= qualityReviewDuration) finishQualityReview();
    else state.qualityFrame = window.requestAnimationFrame(runQualityReview);
  }
})();
