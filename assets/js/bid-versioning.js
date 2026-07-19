(function () {
  "use strict";

  const VERSION_STORAGE_PREFIX = "biddingBidVersions:v1:";
  const SNAPSHOT_STORAGE_PREFIX = "biddingBidVersionSnapshot:v1:";
  const DRAFT_STORAGE_PREFIX = "biddingBidDraft:v1:";

  function projectId(project) {
    if (typeof project === "string") return project || "BID-202601-001";
    return project && project.id ? project.id : "BID-202601-001";
  }

  function safeGet(key) {
    try { return window.sessionStorage.getItem(key) || ""; } catch (error) { return ""; }
  }

  function safeSet(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function versionStorageKey(project) {
    return VERSION_STORAGE_PREFIX + projectId(project);
  }

  function snapshotStorageKey(project, versionId, documentId) {
    return SNAPSHOT_STORAGE_PREFIX + projectId(project) + ":" + versionId + ":" + documentId;
  }

  function draftStorageKey(project) {
    return DRAFT_STORAGE_PREFIX + projectId(project);
  }

  function documentMeta(snapshotStored) {
    return {
      technical: { fileName: "技术标.docx", pageCount: 73, snapshotStored: Boolean(snapshotStored && snapshotStored.technical) },
      business: { fileName: "商务标.docx", pageCount: 23, snapshotStored: Boolean(snapshotStored && snapshotStored.business) }
    };
  }

  function createSeedVersion(project, sequence, createdAt, note, check, review) {
    const id = projectId(project) + "-VER-" + String(sequence).padStart(3, "0");
    return {
      id: id,
      sequence: sequence,
      number: "V1.0." + sequence,
      createdAt: createdAt,
      createdBy: project.owner || "李明远",
      note: note,
      documents: documentMeta(),
      check: Object.assign({ status: "not_checked", batch: 0, score: 0, updatedAt: 0 }, check || {}),
      review: Object.assign({ status: "not_submitted", submittedAt: 0, submittedBy: "", approvedAt: 0, approvedBy: "", returnedAt: 0, returnedBy: "", returnReason: "" }, review || {}),
      isDeliveryVersion: false,
      archiveStatus: "not_archived"
    };
  }

  function seedVersions(project) {
    const now = Date.now();
    const stage = String(project.stage || "");
    const advanced = stage.indexOf("质量审核") !== -1 || stage.indexOf("交付") !== -1 || project.status === "archived";
    if (!advanced) {
      return [
        createSeedVersion(project, 1, now - 70 * 60 * 1000, "完成技术标与商务标初稿，建立首次人工版本。")
      ];
    }

    const delivered = stage.indexOf("交付") !== -1 || project.status === "archived";
    const latestReview = delivered
      ? { status: "approved", submittedAt: now - 32 * 60 * 1000, submittedBy: project.owner || "李明远", approvedAt: now - 12 * 60 * 1000, approvedBy: project.owner || "李明远" }
      : { status: "pending", submittedAt: now - 18 * 60 * 1000, submittedBy: project.owner || "李明远" };
    const versions = [
      createSeedVersion(project, 1, now - 4 * 60 * 60 * 1000, "完成技术标与商务标初稿。"),
      createSeedVersion(project, 2, now - 3 * 60 * 60 * 1000, "补充项目团队、业绩证明和资格材料索引。", { status: "result", batch: 1, score: 82, updatedAt: now - 170 * 60 * 1000 }),
      createSeedVersion(project, 3, now - 95 * 60 * 1000, "修订服务响应、量化承诺和商务报价。", { status: "result", batch: 1, score: 90, updatedAt: now - 82 * 60 * 1000 }),
      createSeedVersion(project, 4, now - 38 * 60 * 1000, "完成全部智能检查问题整改，形成当前送审版本。", { status: "passed", batch: 2, score: 98, updatedAt: now - 24 * 60 * 1000 }, latestReview)
    ];
    if (delivered) versions[versions.length - 1].isDeliveryVersion = true;
    if (project.status === "archived") versions.forEach(function (version) { version.archiveStatus = "archived"; });
    return versions;
  }

  function normalizeVersion(version, index, project) {
    const sequence = Number(version.sequence || index + 1);
    return Object.assign({
      id: projectId(project) + "-VER-" + String(sequence).padStart(3, "0"),
      sequence: sequence,
      number: "V1.0." + sequence,
      createdAt: Date.now(),
      createdBy: project.owner || "李明远",
      note: "人工保存版本",
      documents: documentMeta(),
      check: { status: "not_checked", batch: 0, score: 0, updatedAt: 0 },
      review: { status: "not_submitted", submittedAt: 0, submittedBy: "", approvedAt: 0, approvedBy: "", returnedAt: 0, returnedBy: "", returnReason: "" },
      isDeliveryVersion: false,
      archiveStatus: "not_archived"
    }, version, {
      sequence: sequence,
      documents: Object.assign(documentMeta(), version.documents || {}),
      check: Object.assign({ status: "not_checked", batch: 0, score: 0, updatedAt: 0 }, version.check || {}),
      review: Object.assign({ status: "not_submitted", submittedAt: 0, submittedBy: "", approvedAt: 0, approvedBy: "", returnedAt: 0, returnedBy: "", returnReason: "" }, version.review || {})
    });
  }

  function save(project, versions) {
    return safeSet(versionStorageKey(project), JSON.stringify(versions || []));
  }

  function load(project) {
    const stored = safeGet(versionStorageKey(project));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map(function (version, index) { return normalizeVersion(version, index, project); })
            .sort(function (left, right) { return left.sequence - right.sequence; });
        }
      } catch (error) {
        /* fall through to seeded prototype data */
      }
    }
    const seeded = seedVersions(project || {});
    save(project, seeded);
    setDraftBase(project, seeded[seeded.length - 1].id);
    return seeded;
  }

  function latest(versions) {
    if (!Array.isArray(versions) || !versions.length) return null;
    return versions.slice().sort(function (left, right) { return Number(left.sequence) - Number(right.sequence); }).pop();
  }

  function find(versions, versionId) {
    return (versions || []).find(function (version) { return version.id === versionId || version.number === versionId; }) || null;
  }

  function nextNumber(versions) {
    const last = latest(versions);
    return "V1.0." + (last ? Number(last.sequence || 0) + 1 : 1);
  }

  function saveSnapshot(project, versionId, documentId, pages) {
    if (!Array.isArray(pages)) return false;
    return safeSet(snapshotStorageKey(project, versionId, documentId), JSON.stringify({ pages: pages, savedAt: Date.now() }));
  }

  function loadSnapshot(project, versionId, documentId) {
    const stored = safeGet(snapshotStorageKey(project, versionId, documentId));
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return parsed && Array.isArray(parsed.pages) ? parsed.pages : null;
    } catch (error) {
      return null;
    }
  }

  function create(project, payload) {
    const versions = load(project);
    const sequence = latest(versions) ? Number(latest(versions).sequence) + 1 : 1;
    const id = projectId(project) + "-VER-" + String(sequence).padStart(3, "0");
    const snapshots = payload && payload.snapshots ? payload.snapshots : {};
    const snapshotStored = {
      technical: saveSnapshot(project, id, "technical", snapshots.technical),
      business: saveSnapshot(project, id, "business", snapshots.business)
    };
    const version = {
      id: id,
      sequence: sequence,
      number: "V1.0." + sequence,
      createdAt: Date.now(),
      createdBy: payload.createdBy || project.owner || "李明远",
      note: payload.note || "人工保存版本",
      documents: documentMeta(snapshotStored),
      check: { status: "not_checked", batch: 0, score: 0, updatedAt: 0 },
      review: { status: "not_submitted", submittedAt: 0, submittedBy: "", approvedAt: 0, approvedBy: "", returnedAt: 0, returnedBy: "", returnReason: "" },
      isDeliveryVersion: false,
      archiveStatus: "not_archived"
    };
    versions.push(version);
    const metadataSaved = save(project, versions);
    setDraftBase(project, version.id);
    return { versions: versions, version: version, saved: metadataSaved, snapshotStored: snapshotStored };
  }

  function update(project, versionId, patch) {
    let updated = null;
    const versions = load(project).map(function (version) {
      if (version.id !== versionId && version.number !== versionId) return version;
      updated = Object.assign({}, version, patch || {});
      return updated;
    });
    save(project, versions);
    return updated;
  }

  function setDeliveryVersion(project, versionId) {
    let selected = null;
    const versions = load(project).map(function (version) {
      const active = version.id === versionId || version.number === versionId;
      const next = Object.assign({}, version, { isDeliveryVersion: active });
      if (active) selected = next;
      return next;
    });
    save(project, versions);
    return selected;
  }

  function archiveAll(project, deliveryVersionId) {
    const versions = load(project).map(function (version) {
      return Object.assign({}, version, {
        isDeliveryVersion: version.id === deliveryVersionId || version.number === deliveryVersionId,
        archiveStatus: "archived"
      });
    });
    save(project, versions);
    return versions;
  }

  function setDraftBase(project, versionId) {
    return safeSet(draftStorageKey(project), JSON.stringify({ versionId: versionId || "", updatedAt: Date.now() }));
  }

  function getDraftBase(project, versions) {
    const stored = safeGet(draftStorageKey(project));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && find(versions || load(project), parsed.versionId)) return parsed.versionId;
      } catch (error) {
        /* use latest version */
      }
    }
    const current = latest(versions || load(project));
    return current ? current.id : "";
  }

  function formatDateTime(value) {
    const date = new Date(Number(value || Date.now()));
    const pad = function (number) { return String(number).padStart(2, "0"); };
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function statusMeta(version) {
    if (version.isDeliveryVersion && version.archiveStatus === "archived") return { label: "正式交付", tone: "green" };
    if (version.review.status === "approved") return { label: "审核通过", tone: "green" };
    if (version.review.status === "pending") return { label: "人工审核中", tone: "orange" };
    if (version.review.status === "returned") return { label: "审核退回", tone: "orange" };
    if (version.check.status === "passed") return { label: "检查通过", tone: "green" };
    if (version.check.status === "checking") return { label: "检查中", tone: "blue" };
    if (version.check.status === "result") return { label: "待整改", tone: "orange" };
    return { label: "已保存", tone: "gray" };
  }

  window.BiddingBidVersions = {
    load: load,
    save: save,
    latest: latest,
    find: find,
    nextNumber: nextNumber,
    create: create,
    update: update,
    setDeliveryVersion: setDeliveryVersion,
    archiveAll: archiveAll,
    saveSnapshot: saveSnapshot,
    loadSnapshot: loadSnapshot,
    setDraftBase: setDraftBase,
    getDraftBase: getDraftBase,
    formatDateTime: formatDateTime,
    statusMeta: statusMeta
  };
})();
