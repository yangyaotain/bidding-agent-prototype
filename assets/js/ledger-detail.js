(function () {
  "use strict";

  const STORAGE_KEY = "biddingLedgerRecords";
  let currentRecord = null;
  let noticeTimer = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function resultDefinition(result) {
    const map = {
      pending: { label: "结果待公布", tone: "orange" },
      won: { label: "已中标", tone: "green" },
      lost: { label: "未中标", tone: "gray" }
    };
    return map[result] || map.pending;
  }

  function reviewDefinition(record) {
    if (record.result === "pending") return { label: "待结果", tone: "gray" };
    if (record.reviewStatus === "已完成") return { label: "已完成", tone: "green" };
    if (record.reviewStatus === "复盘中") return { label: "复盘中", tone: "blue" };
    return { label: "待复盘", tone: "orange" };
  }

  function formatAmount(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " 万元";
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value == null || value === "" ? "—" : value;
  }

  function setTag(id, definition) {
    const element = document.getElementById(id);
    if (!element) return;
    element.className = "status-tag " + definition.tone;
    element.textContent = definition.label;
  }

  function fileIcon(name) {
    return window.BiddingFileIcons ? window.BiddingFileIcons.markup(name, "compact-file-icon") : '<span class="file-type-icon compact-file-icon"><span class="file-format-mark">FILE</span></span>';
  }

  function loadRecord() {
    const id = new URLSearchParams(window.location.search).get("id") || "";
    let records = [];
    let selected = null;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(parsed)) records = parsed;
    } catch (error) {
      records = [];
    }
    try { selected = JSON.parse(window.sessionStorage.getItem("biddingLedgerSelectedRecord") || "null"); } catch (error) { selected = null; }
    return records.find(function (record) { return record.id === id; }) || (selected && (!id || selected.id === id) ? selected : null);
  }

  function knownDownloadHref(record, file, scope) {
    if (!record || !file) return "";
    const name = String(file.name || "").toLowerCase();
    if (name.indexOf("技术标") !== -1 && name.endsWith(".docx")) return "../assets/bid-documents/technical.docx";
    if (name.indexOf("商务标") !== -1 && name.endsWith(".docx")) return "../assets/bid-documents/business.docx";
    if (name.indexOf("技术标") !== -1 && name.endsWith(".pdf")) return "../assets/bid-documents/technical.pdf";
    if (name.indexOf("商务标") !== -1 && name.endsWith(".pdf")) return "../assets/bid-documents/business.pdf";
    if (name.indexOf("文件包") !== -1 || name.endsWith(".zip")) return "../assets/bid-documents/packages/某港口集团2026年度集装箱业务平台运维项目_Word文件套.zip";
    if (scope === "archive" && name.endsWith(".docx")) return "../assets/bid-documents/technical.docx";
    if (scope === "archive" && name.indexOf("澄清") !== -1 && name.endsWith(".pdf")) return "../assets/bid-documents/business.pdf";
    if (scope === "archive" && name.endsWith(".pdf")) return "../assets/bid-documents/technical.pdf";
    return "";
  }

  function renderDownloadList(files, containerId, emptyText, scope) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!files.length) {
      container.innerHTML = '<div class="ledger-detail-empty-row">' + escapeHtml(emptyText) + "</div>";
      return;
    }
    container.innerHTML = files.map(function (file, index) {
      const category = file.category || (scope === "result" ? "结果佐证" : "归档文件");
      const tone = file.tone || (scope === "result" ? "blue" : "gray");
      return '<div class="ledger-download-item">' + fileIcon(file.name) + '<div><strong title="' + escapeHtml(file.name) + '">' + escapeHtml(file.name) + '</strong><small>' + escapeHtml(file.description || category) + '</small></div><span class="status-tag ' + escapeHtml(tone) + '">' + escapeHtml(category) + '</span><div class="ledger-file-actions"><button class="ledger-download-btn is-preview" type="button" data-preview-file data-preview-scope="' + escapeHtml(scope) + '" data-preview-index="' + index + '"><svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></svg><span>预览</span></button><button class="ledger-download-btn" type="button" data-download-file data-download-scope="' + escapeHtml(scope) + '" data-download-index="' + index + '"><svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg><span>下载</span></button></div></div>';
    }).join("");
  }

  function previewProfile(file) {
    const name = String(file && file.name || "").toLowerCase();
    if (name.indexOf("商务标") !== -1) return "bid-business";
    if (name.indexOf("技术标") !== -1) return "bid-technical";
    if (name.indexOf("澄清") !== -1) return "clarification";
    if (name.indexOf("采购") !== -1 || name.indexOf("招标") !== -1) return "procurement";
    const format = window.BiddingFileIcons.meta(name);
    if (format.type === "word" || format.type === "pdf") return "bid-technical";
    return window.BiddingFilePreview.profileFromName(name);
  }

  function openLedgerPreview(file, scope) {
    const sizeMatch = String(file.description || "").match(/\d+(?:\.\d+)?\s*(?:KB|MB|GB)/i);
    window.BiddingFilePreview.open({
      profile: previewProfile(file),
      name: file.name,
      size: sizeMatch ? sizeMatch[0] : "—",
      context: scope === "result" ? "投标台账结果佐证" : "投标台账归档文件"
    });
  }

  function renderReviewActions(actions) {
    const container = document.getElementById("reviewResultActionList");
    if (!actions.length) {
      container.innerHTML = '<div class="ledger-detail-empty-row">暂未形成改进事项。</div>';
      return;
    }
    container.innerHTML = actions.map(function (action) {
      return '<div class="ledger-review-action-item"><span class="ledger-action-check' + (action.done ? " done" : "") + '"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><strong>' + escapeHtml(action.task || "未命名事项") + '</strong><span>' + escapeHtml(action.owner || "待分配") + '</span><span>' + escapeHtml(action.dueDate || "日期待定") + '</span><span class="status-tag ' + (action.done ? "green" : "orange") + '">' + (action.done ? "已完成" : "待完成") + "</span></div>";
    }).join("");
  }

  function renderRecord(record) {
    const result = resultDefinition(record.result);
    const review = reviewDefinition(record);
    const archiveFiles = Array.isArray(record.archiveFiles) ? record.archiveFiles : [];
    const resultFiles = Array.isArray(record.resultFiles) ? record.resultFiles : [];
    const reviewData = record.review || {};
    const reviewActions = Array.isArray(reviewData.actions) ? reviewData.actions : [];
    currentRecord = record;
    document.title = record.name + " - 投标台账 - 投标助手";
    setText("ledgerDetailBreadcrumbTitle", record.name);
    setText("ledgerDetailPageTitle", record.name);
    setText("ledgerDetailPageMeta", record.id + " · " + record.purchaser);
    setText("ledgerOverviewProjectName", record.name);
    setText("ledgerOverviewDescription", record.id + " · " + record.purchaser + " · 已完成正式交付归档");
    setTag("ledgerOverviewResult", result);
    setTag("ledgerOverviewReview", review);
    setText("ledgerSummaryBidDate", record.bidDateText);
    setText("ledgerSummaryBidAmount", formatAmount(record.bidAmount));
    setText("ledgerSummaryScore", record.score === "" ? "待公布" : Number(record.score).toFixed(2) + " 分 / 第 " + record.rank + " 名");
    setText("ledgerSummaryOwner", record.owner);

    setText("archiveVersion", record.archiveVersion);
    setText("archiveTime", record.archiveTime);
    setText("archiveOperator", record.archiveOperator);
    setText("archiveFileTotal", archiveFiles.length + " 份");
    setText("archiveFileCount", "共 " + archiveFiles.length + " 份");
    renderDownloadList(archiveFiles, "archiveResultFileList", "暂无归档文件。", "archive");

    setTag("bidResultStatus", result);
    setText("bidResultDate", record.resultDate || "待公布");
    setText("bidResultScore", record.score === "" ? "待公布" : Number(record.score).toFixed(2) + " 分");
    setText("bidResultRank", record.rank === "" ? "待公布" : "第 " + record.rank + " 名");
    setText("bidResultSource", record.source || "待补充");
    setText("bidResultWinner", record.winner || "待公布");
    const hasWinningAmount = record.winningAmount !== "";
    setText("bidResultWinningAmount", hasWinningAmount ? formatAmount(record.winningAmount) : "待公布");
    document.getElementById("bidResultWinningAmount").classList.toggle("amount-text", hasWinningAmount);
    setText("bidResultRemark", record.remark || "暂无结果说明。");
    setText("resultFileCount", "共 " + resultFiles.length + " 份");
    renderDownloadList(resultFiles, "bidResultFileList", record.result === "pending" ? "正式投标结果公布后补充佐证材料。" : "暂未上传结果佐证材料。", "result");

    setTag("reviewResultStatus", review);
    setText("reviewOwner", reviewData.owner || record.owner);
    setText("reviewDueDate", reviewData.dueDate || "待安排");
    setText("reviewCompletedAt", reviewData.completedAt || (record.reviewStatus === "已完成" ? "已完成" : "尚未完成"));
    setText("reviewSummary", reviewData.summary || (record.result === "pending" ? "投标结果公布后开展项目复盘。" : "尚未填写复盘结论。"));
    setText("reviewStrengths", reviewData.strengths || "尚未填写。");
    setText("reviewWeaknesses", reviewData.weaknesses || "尚未填写。");
    setText("reviewExperience", reviewData.experience || "尚未填写。");
    setText("reviewActionCount", "共 " + reviewActions.length + " 项");
    renderReviewActions(reviewActions);
  }

  function showDownloadNotice(message) {
    const notice = document.getElementById("ledgerDownloadNotice");
    notice.querySelector("span").textContent = message;
    notice.classList.remove("hidden");
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(function () { notice.classList.add("hidden"); }, 2600);
  }

  function drawRoundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function fitCanvasText(context, value, maxWidth) {
    const text = String(value == null || value === "" ? "—" : value);
    if (context.measureText(text).width <= maxWidth) return text;
    let shortened = text;
    while (shortened.length > 1 && context.measureText(shortened + "…").width > maxWidth) shortened = shortened.slice(0, -1);
    return shortened + "…";
  }

  function wrapCanvasText(context, value, maxWidth) {
    const lines = [];
    String(value == null ? "" : value).split("\n").forEach(function (paragraph) {
      let line = "";
      Array.from(paragraph).forEach(function (character) {
        const testLine = line + character;
        if (line && context.measureText(testLine).width > maxWidth) {
          lines.push(line);
          line = character;
        } else {
          line = testLine;
        }
      });
      lines.push(line || " ");
    });
    return lines;
  }

  function drawCanvasText(context, value, x, y, maxWidth, lineHeight) {
    const lines = wrapCanvasText(context, value, maxWidth);
    lines.forEach(function (line, index) { context.fillText(line, x, y + index * lineHeight); });
    return y + lines.length * lineHeight;
  }

  function createDocumentCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 1754;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#d9e2ec";
    context.lineWidth = 2;
    context.strokeRect(72, 66, 1096, 1618);
    return canvas;
  }

  function drawDocumentFooter(context, fileName, page, total) {
    context.strokeStyle = "#d9e2ec";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(108, 1616);
    context.lineTo(1132, 1616);
    context.stroke();
    context.fillStyle = "#7b8794";
    context.font = '20px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(fileName, 108, 1653);
    const pageText = "第 " + page + " / " + total + " 页";
    context.fillText(pageText, 1132 - context.measureText(pageText).width, 1653);
  }

  function drawDocumentHeader(context, eyebrow, title, subtitle) {
    context.fillStyle = "#1677ff";
    context.fillRect(72, 66, 1096, 10);
    context.fillStyle = "#64748b";
    context.font = '600 21px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(eyebrow, 108, 130);
    context.fillStyle = "#172b4d";
    context.font = '700 42px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(title, 108, 194);
    context.fillStyle = "#64748b";
    context.font = '23px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(subtitle, 108, 238);
  }

  function drawInfoTable(context, rows, top) {
    const left = 108;
    const width = 1024;
    const labelWidth = 226;
    const rowHeight = 78;
    context.strokeStyle = "#dbe3ed";
    context.lineWidth = 2;
    rows.forEach(function (row, index) {
      const y = top + index * rowHeight;
      context.fillStyle = index % 2 ? "#fff" : "#f8fafc";
      context.fillRect(left, y, width, rowHeight);
      context.strokeRect(left, y, width, rowHeight);
      context.fillStyle = "#52657c";
      context.font = '600 22px "Microsoft YaHei", "PingFang SC", sans-serif';
      context.fillText(row[0], left + 24, y + 50);
      context.fillStyle = "#1f2937";
      context.font = '24px "Microsoft YaHei", "PingFang SC", sans-serif';
      context.fillText(fitCanvasText(context, row[1], width - labelWidth - 54), left + labelWidth, y + 50);
    });
    return top + rows.length * rowHeight;
  }

  function drawSectionTitle(context, number, title, y) {
    context.fillStyle = "#1677ff";
    context.fillRect(108, y - 27, 8, 37);
    context.fillStyle = "#172b4d";
    context.font = '700 29px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(number + "  " + title, 136, y);
  }

  function drawBulletList(context, items, y) {
    context.font = '23px "Microsoft YaHei", "PingFang SC", sans-serif';
    items.forEach(function (item, index) {
      context.fillStyle = "#1677ff";
      context.fillText(String(index + 1).padStart(2, "0"), 112, y);
      context.fillStyle = "#34465b";
      y = drawCanvasText(context, item, 164, y, 938, 39) + 15;
    });
    return y;
  }

  function createTenderDocumentPages(record, fileName) {
    const pages = [createDocumentCanvas(), createDocumentCanvas()];
    const cover = pages[0].getContext("2d");
    cover.fillStyle = "#1677ff";
    cover.fillRect(72, 66, 1096, 12);
    cover.fillStyle = "#6b7c93";
    cover.font = '600 23px "Microsoft YaHei", "PingFang SC", sans-serif';
    cover.fillText("政府采购项目 · 公开招标文件", 108, 146);
    cover.fillStyle = "#172b4d";
    cover.font = '700 66px "Microsoft YaHei", "PingFang SC", sans-serif';
    const mainTitle = "招 标 文 件";
    cover.fillText(mainTitle, (1240 - cover.measureText(mainTitle).width) / 2, 390);
    cover.fillStyle = "#1677ff";
    cover.font = '600 31px "Microsoft YaHei", "PingFang SC", sans-serif';
    const typeTitle = "（招标文件及附件）";
    cover.fillText(typeTitle, (1240 - cover.measureText(typeTitle).width) / 2, 452);
    cover.fillStyle = "#263b56";
    cover.font = '700 37px "Microsoft YaHei", "PingFang SC", sans-serif';
    const projectName = fitCanvasText(cover, record.name || "城市运行管理服务平台运维项目", 930);
    cover.fillText(projectName, (1240 - cover.measureText(projectName).width) / 2, 598);
    drawInfoTable(cover, [
      ["项目编号", record.id || "BID-202606-018"],
      ["采购人", record.purchaser || "市城市运行管理中心"],
      ["采购方式", "公开招标"],
      ["投标截止时间", record.bidDateText || "2026-07-08 16:00"]
    ], 760);
    cover.fillStyle = "#6b7c93";
    cover.font = '22px "Microsoft YaHei", "PingFang SC", sans-serif';
    const archiveDate = String(record.archiveTime || "2026-07-08 18:20").slice(0, 10);
    const dateText = archiveDate + "  编制";
    cover.fillText(dateText, (1240 - cover.measureText(dateText).width) / 2, 1385);
    cover.fillStyle = "#9aa7b5";
    cover.font = '20px "Microsoft YaHei", "PingFang SC", sans-serif';
    drawDocumentFooter(cover, fileName, 1, 2);

    const body = pages[1].getContext("2d");
    drawDocumentHeader(body, "第一章", "招标公告", record.name || "城市运行管理服务平台运维项目");
    drawSectionTitle(body, "一", "项目基本情况", 322);
    const amount = Number(record.bidAmount);
    const ceiling = Number.isFinite(amount) ? (amount * 1.05).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " 万元" : "520.00 万元";
    drawInfoTable(body, [
      ["项目编号", record.id || "BID-202606-018"],
      ["采购人", record.purchaser || "市城市运行管理中心"],
      ["采购预算", ceiling],
      ["服务期限", "合同签订后 12 个月"],
      ["投标截止时间", record.bidDateText || "2026-07-08 16:00"]
    ], 356);
    drawSectionTitle(body, "二", "采购内容", 815);
    body.fillStyle = "#34465b";
    body.font = '23px "Microsoft YaHei", "PingFang SC", sans-serif';
    drawCanvasText(body, "为城市运行管理服务平台提供年度运行维护服务，覆盖平台监控、应用巡检、数据运维、安全保障、故障处置和重大活动技术保障。", 108, 865, 1024, 41);
    drawSectionTitle(body, "三", "供应商资格要求", 1025);
    drawBulletList(body, [
      "具有独立承担民事责任的能力，并提供合法有效的主体资格证明。",
      "近三年内在经营活动中无重大违法记录，信用信息查询结果符合采购要求。",
      "具备同类信息化平台运维服务经验，并配置项目经理及稳定的驻场服务团队。"
    ], 1080);
    drawSectionTitle(body, "四", "投标文件提交", 1430);
    body.fillStyle = "#34465b";
    body.font = '23px "Microsoft YaHei", "PingFang SC", sans-serif';
    body.fillText("投标文件应按招标文件规定完成签章、加密并在截止时间前提交。", 108, 1482);
    drawDocumentFooter(body, fileName, 2, 2);
    return pages;
  }

  function clarificationDate(record) {
    const text = String(record.bidDateText || "2026-07-08").slice(0, 10);
    const date = new Date(text + "T00:00:00");
    if (Number.isNaN(date.getTime())) return "2026-07-03";
    date.setDate(date.getDate() - 5);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function drawQuestionAnswer(context, number, question, answer, top) {
    context.fillStyle = "#f7f9fc";
    drawRoundedRect(context, 108, top, 1024, 235, 14);
    context.fill();
    context.fillStyle = "#1677ff";
    context.font = '700 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText("问题 " + number, 138, top + 48);
    context.fillStyle = "#263b56";
    context.font = '600 22px "Microsoft YaHei", "PingFang SC", sans-serif';
    drawCanvasText(context, question, 258, top + 48, 834, 35);
    context.fillStyle = "#52657c";
    context.font = '22px "Microsoft YaHei", "PingFang SC", sans-serif';
    drawCanvasText(context, "答复：" + answer, 138, top + 128, 954, 36);
  }

  function createClarificationDocumentPages(record, fileName) {
    const pages = [createDocumentCanvas(), createDocumentCanvas()];
    const cover = pages[0].getContext("2d");
    cover.fillStyle = "#1677ff";
    cover.fillRect(72, 66, 1096, 12);
    cover.fillStyle = "#6b7c93";
    cover.font = '600 23px "Microsoft YaHei", "PingFang SC", sans-serif';
    cover.fillText("采购文件补充材料", 108, 146);
    cover.fillStyle = "#172b4d";
    cover.font = '700 63px "Microsoft YaHei", "PingFang SC", sans-serif';
    const title = "澄 清 答 疑 文 件";
    cover.fillText(title, (1240 - cover.measureText(title).width) / 2, 398);
    cover.fillStyle = "#263b56";
    cover.font = '700 37px "Microsoft YaHei", "PingFang SC", sans-serif';
    const projectName = fitCanvasText(cover, record.name || "城市运行管理服务平台运维项目", 930);
    cover.fillText(projectName, (1240 - cover.measureText(projectName).width) / 2, 565);
    drawInfoTable(cover, [
      ["项目编号", record.id || "BID-202606-018"],
      ["澄清编号", (record.id || "BID-202606-018") + "-CQ-01"],
      ["采购人", record.purchaser || "市城市运行管理中心"],
      ["发布日期", clarificationDate(record)]
    ], 730);
    cover.fillStyle = "#52657c";
    cover.font = '23px "Microsoft YaHei", "PingFang SC", sans-serif';
    drawCanvasText(cover, "本文件对招标文件有关事项作出澄清和补充，与原招标文件具有同等效力；如内容不一致，以本澄清答疑文件为准。", 176, 1160, 888, 41);
    cover.fillStyle = "#9aa7b5";
    cover.font = '20px "Microsoft YaHei", "PingFang SC", sans-serif';
    drawDocumentFooter(cover, fileName, 1, 2);

    const body = pages[1].getContext("2d");
    drawDocumentHeader(body, "澄清编号 " + (record.id || "BID-202606-018") + "-CQ-01", "澄清与答疑事项", record.name || "城市运行管理服务平台运维项目");
    drawQuestionAnswer(body, "01", "招标文件中 7×24 小时服务响应的具体时限如何执行？", "一级故障须在 15 分钟内响应、2 小时内到场；其他故障按照服务级别约定执行。", 292);
    drawQuestionAnswer(body, "02", "项目经理及核心成员是否可以兼任，需提供哪些证明材料？", "项目经理不得兼任其他在建项目负责人；须提供身份证明、相关证书及近三个月社保证明。", 555);
    drawQuestionAnswer(body, "03", "电子投标文件中的附件是否需要逐页签章？", "按指定位置加盖电子签章即可；授权委托书、报价表和承诺函仍须按格式单独签章。", 818);
    drawSectionTitle(body, "一", "条款调整", 1140);
    body.fillStyle = "#34465b";
    body.font = '23px "Microsoft YaHei", "PingFang SC", sans-serif';
    drawCanvasText(body, "原招标文件“同类项目业绩”认定时间调整为 2023 年 1 月 1 日至投标截止日，以合同签订时间为准。", 108, 1195, 1024, 40);
    drawSectionTitle(body, "二", "其他说明", 1350);
    body.fillStyle = "#34465b";
    body.font = '23px "Microsoft YaHei", "PingFang SC", sans-serif';
    drawCanvasText(body, "投标截止时间保持不变：" + (record.bidDateText || "2026-07-08 16:00") + "。除上述事项外，原招标文件其他内容不变。", 108, 1405, 1024, 40);
    drawDocumentFooter(body, fileName, 2, 2);
    return pages;
  }

  function createArchiveSummaryPages(record, file) {
    const canvas = createDocumentCanvas();
    const context = canvas.getContext("2d");
    const fileName = file && file.name ? file.name : "归档文件.pdf";
    drawDocumentHeader(context, "投标台账归档文件", "项目归档文件", record.name || "城市运行管理服务平台运维项目");
    drawInfoTable(context, [
      ["项目名称", record.name || "城市运行管理服务平台运维项目"],
      ["项目编号", record.id || "BID-202606-018"],
      ["采购人", record.purchaser || "市城市运行管理中心"],
      ["归档版本", record.archiveVersion || "正式交付 V1.0"],
      ["归档时间", record.archiveTime || "2026-07-08 18:20"],
      ["归档操作人", record.archiveOperator || record.owner || "李明远"],
      ["文件名称", fileName],
      ["文件说明", file && file.description ? file.description : "正式归档材料"],
      ["归档状态", "已完成归档"]
    ], 310);
    drawDocumentFooter(context, fileName, 1, 1);
    return [canvas];
  }

  function canvasImageBytes(canvas) {
    const encodedImage = canvas.toDataURL("image/jpeg", .92).split(",")[1];
    const binaryImage = window.atob(encodedImage);
    const imageBytes = new Uint8Array(binaryImage.length);
    for (let index = 0; index < binaryImage.length; index += 1) imageBytes[index] = binaryImage.charCodeAt(index);
    return imageBytes;
  }

  function createImagePdfBlob(canvases) {
    const images = canvases.map(canvasImageBytes);
    const encoder = new TextEncoder();
    const parts = [];
    const offsets = [0];
    let length = 0;
    const append = function (part) {
      const bytes = typeof part === "string" ? encoder.encode(part) : part;
      parts.push(bytes);
      length += bytes.length;
    };
    const addObject = function (number, objectParts) {
      offsets[number] = length;
      append(number + " 0 obj\n");
      objectParts.forEach(append);
      append("endobj\n");
    };
    const pageObjects = canvases.map(function (_, index) { return 3 + index * 3; });
    const maxObject = 2 + canvases.length * 3;
    append("%PDF-1.4\n");
    addObject(1, ["<< /Type /Catalog /Pages 2 0 R >>\n"]);
    addObject(2, ["<< /Type /Pages /Kids [" + pageObjects.map(function (number) { return number + " 0 R"; }).join(" ") + "] /Count " + canvases.length + " >>\n"]);
    canvases.forEach(function (canvas, index) {
      const pageObject = pageObjects[index];
      const imageObject = pageObject + 1;
      const contentObject = pageObject + 2;
      const imageBytes = images[index];
      addObject(pageObject, ["<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 " + imageObject + " 0 R >> >> /Contents " + contentObject + " 0 R >>\n"]);
      addObject(imageObject, ["<< /Type /XObject /Subtype /Image /Width " + canvas.width + " /Height " + canvas.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + imageBytes.length + " >>\nstream\n", imageBytes, "\nendstream\n"]);
      const pageContent = "q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n";
      addObject(contentObject, ["<< /Length " + pageContent.length + " >>\nstream\n" + pageContent + "endstream\n"]);
    });
    const xrefOffset = length;
    let xref = "xref\n0 " + (maxObject + 1) + "\n0000000000 65535 f \n";
    for (let index = 1; index <= maxObject; index += 1) xref += String(offsets[index]).padStart(10, "0") + " 00000 n \n";
    append(xref + "trailer\n<< /Size " + (maxObject + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF");
    return new Blob(parts, { type: "application/pdf" });
  }

  function createExamplePdfBlob(file) {
    const record = currentRecord || {};
    const fileName = file && file.name ? file.name : "归档文件.pdf";
    let pages;
    if (fileName.indexOf("澄清") !== -1 || fileName.indexOf("答疑") !== -1) pages = createClarificationDocumentPages(record, fileName);
    else if (fileName.indexOf("招标") !== -1) pages = createTenderDocumentPages(record, fileName);
    else pages = createArchiveSummaryPages(record, file);
    return createImagePdfBlob(pages);
  }

  function triggerBlobDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  function downloadPdf(href, file) {
    const complete = function (blob) {
      triggerBlobDownload(blob, file.name);
      showDownloadNotice("已开始浏览器下载：" + file.name);
    };
    if (window.location.protocol === "file:") {
      complete(createExamplePdfBlob(file));
      return;
    }
    window.fetch(href).then(function (response) {
      if (!response.ok) throw new Error("download failed");
      return response.blob();
    }).then(function (blob) {
      complete(blob);
    }).catch(function () {
      complete(createExamplePdfBlob(file));
    });
  }

  function startDownload(file, scope) {
    const href = knownDownloadHref(currentRecord, file, scope);
    if (href && String(file.name || "").toLowerCase().endsWith(".pdf")) {
      downloadPdf(href, file);
      return;
    }
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    showDownloadNotice(href ? "已开始浏览器下载：" + file.name : "当前文件暂未配置下载内容：" + file.name);
  }

  function initEvents() {
    document.addEventListener("click", function (event) {
      const previewButton = event.target.closest("[data-preview-file]");
      if (previewButton && currentRecord) {
        const previewScope = previewButton.getAttribute("data-preview-scope");
        const previewIndex = Number(previewButton.getAttribute("data-preview-index"));
        const previewFiles = previewScope === "result" ? currentRecord.resultFiles : currentRecord.archiveFiles;
        if (Array.isArray(previewFiles) && previewFiles[previewIndex]) openLedgerPreview(previewFiles[previewIndex], previewScope);
        return;
      }
      const button = event.target.closest("[data-download-file]");
      if (!button || !currentRecord) return;
      const scope = button.getAttribute("data-download-scope");
      const index = Number(button.getAttribute("data-download-index"));
      const files = scope === "result" ? currentRecord.resultFiles : currentRecord.archiveFiles;
      if (Array.isArray(files) && files[index]) startDownload(files[index], scope);
    });
  }

  function init() {
    const record = loadRecord();
    if (!record) {
      document.getElementById("ledgerDetailContent").classList.add("hidden");
      document.getElementById("ledgerDetailNotFound").classList.remove("hidden");
      return;
    }
    renderRecord(record);
    initEvents();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
