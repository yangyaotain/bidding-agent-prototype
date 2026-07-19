(function () {
  "use strict";

  const data = window.BidDocumentFlowData || {};
  if (!data.technical || !data.business) return;

  const projectData = window.BiddingProjectData || {};
  const requestedProjectId = new URLSearchParams(window.location.search).get("id");
  let pendingProject = null;
  try {
    const storedPendingProject = window.sessionStorage.getItem("biddingPendingProject");
    if (storedPendingProject) pendingProject = JSON.parse(storedPendingProject);
  } catch (error) {
    pendingProject = null;
  }
  const project = (pendingProject && requestedProjectId && pendingProject.id === requestedProjectId ? pendingProject : null) ||
    (projectData.projects || []).find(function (item) { return item.id === requestedProjectId; }) ||
    projectData.featuredProject ||
    { id: "BID-202601-001", owner: "李明远" };
  const projectId = project.id || "BID-202601-001";
  const versionApi = window.BiddingBidVersions || null;
  let bidVersions = versionApi ? versionApi.load(project) : [];
  const documentStoragePrefix = "biddingWordFlow:v1:" + projectId + ":";
  const manualReviewStorageKey = "biddingManualQualityReview:v1:" + projectId;
  const smartCheckStorageKey = "biddingQualityReview:v2:" + projectId;
  const issueIds = ["Q-T-001", "Q-T-002", "Q-B-001", "Q-B-002", "Q-B-003"];
  const state = {
    activeId: "technical",
    activePage: 1,
    scrollFrame: 0,
    review: null
  };

  function one(selector, root) {
    return (root || document).querySelector(selector);
  }

  function all(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function safeStorageGet(key) {
    try {
      return window.sessionStorage.getItem(key) || "";
    } catch (error) {
      return "";
    }
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
    safeStorageSet("biddingPendingProject", JSON.stringify(next));
    if (window.projectPrototype) window.projectPrototype.currentProject = next;
    return next;
  }

  function defaultReviewState() {
    const delivered = String(project.stage || "").indexOf("交付") !== -1 || project.status === "archived";
    const currentVersion = versionApi
      ? bidVersions.find(function (version) { return version.review && version.review.status === (delivered ? "approved" : "pending"); }) || versionApi.latest(bidVersions)
      : null;
    return {
      status: delivered ? "approved" : "pending",
      versionId: currentVersion ? currentVersion.id : "",
      version: currentVersion ? currentVersion.number : "V1.0.4",
      submittedAt: Date.now() - 18 * 60 * 1000,
      submittedBy: project.owner || "李明远",
      returnReason: ""
    };
  }

  function loadReviewState() {
    const stored = safeStorageGet(manualReviewStorageKey);
    if (!stored) return defaultReviewState();
    try {
      const parsed = JSON.parse(stored);
      if (!parsed || ["pending", "returned", "approved"].indexOf(parsed.status) === -1) return defaultReviewState();
      const review = Object.assign(defaultReviewState(), parsed);
      if (versionApi) {
        const version = versionApi.find(bidVersions, review.versionId || review.version) || versionApi.latest(bidVersions);
        review.versionId = version ? version.id : "";
        review.version = version ? version.number : review.version;
      }
      return review;
    } catch (error) {
      return defaultReviewState();
    }
  }

  function saveReviewState() {
    safeStorageSet(manualReviewStorageKey, JSON.stringify(state.review));
  }

  function storedPageHtml(documentId) {
    if (versionApi && state.review && state.review.versionId) {
      const snapshot = versionApi.loadSnapshot(project, state.review.versionId, documentId);
      if (snapshot) return snapshot;
    }
    const stored = safeStorageGet(documentStoragePrefix + documentId);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed.pages) ? parsed.pages : null;
    } catch (error) {
      return null;
    }
  }

  function formatSubmittedAt(value) {
    const date = new Date(Number(value || Date.now()));
    const pad = function (number) { return String(number).padStart(2, "0"); };
    const today = new Date();
    const sameDay = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
    const prefix = sameDay ? "今天" : pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    return prefix + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + " 提交";
  }

  function currentDocument() {
    return data[state.activeId];
  }

  function pageMarkup(page, html) {
    return '<section class="bid-doc-page word-doc-page" id="manual-review-page-' + state.activeId + "-" + page.number + '" data-page-number="' + page.number + '">' +
      '<div class="bid-page-content">' + html + "</div>" +
      '<footer class="bid-page-number">' + page.number + "</footer>" +
      "</section>";
  }

  function renderOutline() {
    const current = currentDocument();
    one("#manualReviewOutline").innerHTML = current.outline.map(function (item, index) {
      return '<button class="manual-review-outline-item level-' + (item.level || 1) + (index === 0 ? " active" : "") + '" type="button" data-review-page="' + item.page + '">' +
        "<i></i><span>" + escapeHtml(item.title) + "</span><small>P" + item.page + "</small></button>";
    }).join("");
  }

  function renderDocument() {
    const current = currentDocument();
    const stored = storedPageHtml(state.activeId);
    one("#manualReviewPages").innerHTML = current.pages.map(function (page, index) {
      const html = stored && stored[index] != null ? stored[index] : page.html;
      return pageMarkup(page, html);
    }).join("");
    one("#manualReviewPages").setAttribute("aria-label", current.name + "人工审核预览");
    one("#manualReviewPageStatus").textContent = "第 1 / " + current.pageCount + " 页";
    state.activePage = 1;
    one("#manualReviewCanvas").scrollTop = 0;
  }

  function switchDocument(documentId) {
    if (!data[documentId] || documentId === state.activeId) return;
    state.activeId = documentId;
    all("[data-review-document]").forEach(function (button) {
      const active = button.getAttribute("data-review-document") === documentId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    renderOutline();
    renderDocument();
  }

  function setActivePage(pageNumber) {
    const current = currentDocument();
    const nextPage = Math.max(1, Math.min(current.pageCount, Number(pageNumber) || 1));
    state.activePage = nextPage;
    one("#manualReviewPageStatus").textContent = "第 " + nextPage + " / " + current.pageCount + " 页";
    let activeOutline = null;
    all(".manual-review-outline-item").forEach(function (button) {
      if (Number(button.getAttribute("data-review-page")) <= nextPage) activeOutline = button;
      button.classList.remove("active");
    });
    if (activeOutline) activeOutline.classList.add("active");
  }

  function scrollToPage(pageNumber) {
    const page = one("#manual-review-page-" + state.activeId + "-" + pageNumber);
    if (!page) return;
    const canvas = one("#manualReviewCanvas");
    const canvasRect = canvas.getBoundingClientRect();
    const pageRect = page.getBoundingClientRect();
    const top = canvas.scrollTop + pageRect.top - canvasRect.top - 10;
    canvas.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    setActivePage(pageNumber);
  }

  function updateActivePageFromScroll() {
    const canvas = one("#manualReviewCanvas");
    const canvasTop = canvas.getBoundingClientRect().top + 110;
    let closest = 1;
    let distance = Infinity;
    all(".bid-doc-page", one("#manualReviewPages")).forEach(function (page) {
      const value = Math.abs(page.getBoundingClientRect().top - canvasTop);
      if (value < distance) {
        distance = value;
        closest = Number(page.getAttribute("data-page-number"));
      }
    });
    setActivePage(closest);
  }

  function updateReviewHeader() {
    const version = versionApi ? versionApi.find(bidVersions, state.review.versionId || state.review.version) : null;
    one("#manualReviewVersion").textContent = state.review.version;
    one("#manualReviewVersionNote").textContent = version && version.note ? version.note : "技术标与商务标同一人工保存版本";
    one("#manualReviewSubmitter").textContent = state.review.submittedBy || project.owner || "李明远";
    one("#manualReviewSubmittedAt").textContent = formatSubmittedAt(state.review.submittedAt);
    one("#manualReviewApproveVersion").textContent = "送审版本 " + state.review.version;

    if (state.review.status === "approved") {
      one("#manualReviewStatusTitle").textContent = "人工质量审核已通过";
      one("#manualReviewStatusDescription").textContent = "技术标和商务标送审成果已完成人工确认，当前版本已进入交付归档。";
      one("#manualReviewStatusValue").textContent = "审核已通过";
      one("#manualReviewStatusValue").className = "green-text";
      one("#returnForRevision").classList.add("hidden");
      one("#approveManualReview").disabled = true;
      one("#approveManualReview").querySelector("span:last-child").textContent = "已审核通过";
    }
  }

  function markSmartCheckForRecheck() {
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
    issueIds.forEach(function (issueId) { smartCheck.issues[issueId] = "done"; });
    safeStorageSet(smartCheckStorageKey, JSON.stringify(smartCheck));
  }

  function returnForRevision() {
    const reason = (one("#returnRevisionReason").value || "").trim();
    if (!reason) {
      if (window.showToast) window.showToast("请填写退回原因", "warning", one("#returnRevisionReason"));
      one("#returnRevisionReason").focus();
      return;
    }
    state.review.status = "returned";
    state.review.returnReason = reason;
    state.review.returnedAt = Date.now();
    state.review.returnedBy = project.owner || "李明远";
    state.review.returnSource = "quality";
    saveReviewState();
    if (versionApi && state.review.versionId) {
      const version = versionApi.find(bidVersions, state.review.versionId);
      if (version) {
        versionApi.update(project, version.id, {
          review: Object.assign({}, version.review || {}, {
            status: "returned",
            returnedAt: state.review.returnedAt,
            returnedBy: state.review.returnedBy,
            returnReason: reason
          })
        });
        bidVersions = versionApi.load(project);
      }
    }
    markSmartCheckForRecheck();
    const next = saveProjectPatch({
      stage: "标书编制",
      stageDetail: "人工审核退回，待修改并重新智能检查",
      progress: 88,
      status: project.status === "archived" ? "archived" : "ongoing"
    });
    if (window.projectPrototype) window.projectPrototype.closeLayers();
    if (window.showToast) window.showToast("已退回标书编制");
    window.setTimeout(function () {
      window.location.href = "project-writing.html?id=" + encodeURIComponent(next.id || projectId);
    }, 300);
  }

  function approveReview() {
    state.review.status = "approved";
    state.review.approvedAt = Date.now();
    state.review.approvedBy = project.owner || "李明远";
    saveReviewState();
    if (versionApi && state.review.versionId) {
      const version = versionApi.find(bidVersions, state.review.versionId);
      if (version) {
        versionApi.update(project, version.id, {
          review: Object.assign({}, version.review || {}, {
            status: "approved",
            approvedAt: state.review.approvedAt,
            approvedBy: state.review.approvedBy
          })
        });
        versionApi.setDeliveryVersion(project, version.id);
        bidVersions = versionApi.load(project);
      }
    }
    const next = saveProjectPatch({
      stage: "交付归档",
      stageDetail: state.review.version + " 人工质量审核通过，待交付确认",
      progress: 96,
      status: project.status === "archived" ? "archived" : "ongoing"
    });
    if (window.projectPrototype) window.projectPrototype.closeLayers();
    if (window.showToast) window.showToast("人工质量审核已通过，正在进入交付归档");
    window.setTimeout(function () {
      window.location.href = "project-delivery.html?id=" + encodeURIComponent(next.id || projectId);
    }, 300);
  }

  function bindEvents() {
    all("[data-review-document]").forEach(function (button) {
      button.addEventListener("click", function () { switchDocument(button.getAttribute("data-review-document")); });
    });
    one("#manualReviewOutline").addEventListener("click", function (event) {
      const button = event.target.closest("[data-review-page]");
      if (button) scrollToPage(Number(button.getAttribute("data-review-page")));
    });
    one("#manualReviewPages").addEventListener("click", function (event) {
      const target = event.target.closest("[data-go-page]");
      if (target) scrollToPage(Number(target.getAttribute("data-go-page")));
    });
    one("#manualReviewCanvas").addEventListener("scroll", function () {
      window.cancelAnimationFrame(state.scrollFrame);
      state.scrollFrame = window.requestAnimationFrame(updateActivePageFromScroll);
    }, { passive: true });
    one("#returnForRevision").addEventListener("click", function () {
      one("#returnRevisionReason").value = "";
      if (window.projectPrototype) window.projectPrototype.openLayer("returnRevisionModal");
      window.setTimeout(function () { one("#returnRevisionReason").focus(); }, 80);
    });
    one("#approveManualReview").addEventListener("click", function () {
      if (window.projectPrototype) window.projectPrototype.openLayer("approveManualReviewModal");
    });
    one("#confirmReturnRevision").addEventListener("click", returnForRevision);
    one("#confirmApproveManualReview").addEventListener("click", approveReview);
  }

  function init() {
    state.review = loadReviewState();
    updateReviewHeader();
    renderOutline();
    renderDocument();
    bindEvents();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
