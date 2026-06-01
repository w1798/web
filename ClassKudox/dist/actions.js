const awardPoints = (iID, lb, pt, forcedIgnore = null) => {
  if (!awardContextIds.length) return;
  const count = awardContextIds.length;
  const now = Date.now();
  const tsHex = StampTool.encode(now);
  let newIds = [];
  const isIgnore = !!forcedIgnore;
  awardContextIds.forEach((sid) => {
    const logId = Math.random().toString(36).substring(2, 8);
    const logEntry = { id: logId, sID: sid, lb, pt: Number(pt), TS: tsHex };
    if (isIgnore) logEntry.iSum = 1;
    logs.push(logEntry);
    newIds.push(logId);
    const s = students.find((x) => x.id === sid);
    if (s) {
      if (isIgnore) s.iP = (s.iP || 0) + Number(pt);
      else s.cP = (s.cP || 0) + Number(pt);
    }
    const opData = { s: sid, lb, p: Number(pt), l: logId };
    if (isIgnore) opData.is = 1;
    pushOp(ACT.STU_AWD, opData);
  });
  saveData();
  if (typeof createPointAnimation === "function") createPointAnimation(pt, count);
  if (typeof renderStudents === "function") renderStudents();
  if (currentView === "groups" && typeof renderGroups === "function") renderGroups();
  lastActionLogIds = newIds;
  if (isMultiSelectMode && typeof toggleMultiSelectMode === "function") toggleMultiSelectMode();
  showUndoToast(`${pt > 0 ? "+" : ""}${pt} \u7D66\u4E88 ${count} \u4F4D\u5B78\u751F`);
  setTimeout(() => {
    closeModal(document.getElementById("studentProfileModal"));
    closeModal(document.getElementById("groupDetailModal"));
  }, 400);
};
const awardTreasure = (treasureId, qty, silent = false) => {
  const td = treasureDefs.find((t) => t.id === treasureId);
  if (!td) return [];
  let newIds = [];
  awardContextIds.forEach((sid) => {
    const s = students.find((x) => x.id === sid);
    if (!s) return;
    if (!s.tr) s.tr = {};
    s.tr[treasureId] = (s.tr[treasureId] || 0) + qty;
    const logId = Math.random().toString(36).substring(2, 8);
    const tsHex = StampTool.encode();
    const qtyText = qty > 0 ? `+${qty}` : `${qty}`;
    const logLabel = `${td.ic}${td.lb} ${qtyText}`;
    const logEntry = { id: logId, sID: sid, lb: logLabel, pt: 0, TS: tsHex, iSum: 1, trId: treasureId, trQty: qty };
    logs.push(logEntry);
    newIds.push(logId);
    pushOp(ACT.STU_AWD, { s: sid, lb: logLabel, p: 0, l: logId, is: 1, ti: treasureId, tq: qty });
  });
  saveData();
  if (!silent) {
    if (window.refreshProxy) window.refreshProxy();
    if (typeof createPointAnimation === "function") createPointAnimation(qty, awardContextIds.length);
    lastActionLogIds = newIds;
    showUndoToast(`${qty > 0 ? "+" : ""}${qty} ${td.lb} \u7D66\u4E88 ${awardContextIds.length} \u4F4D\u5B78\u751F`);
  }
  return newIds;
};
const undoAction = () => {
  if (!lastActionLogIds.length) return;
  if (!confirm("\u78BA\u5B9A\u8981\u5FA9\u539F\u4E0A\u4E00\u6B21\u7684\u64CD\u4F5C\u55CE\uFF1F")) return;
  const set = new Set(lastActionLogIds);
  logs.filter((l) => set.has(l.id)).forEach((l) => {
    const s = students.find((x) => x.id === l.sID);
    if (s) {
      if (l.trId && l.trQty) {
        if (s.tr) s.tr[l.trId] = (s.tr[l.trId] || 0) - l.trQty;
      } else {
        if (l.iSum === 1) s.iP = (s.iP || 0) - l.pt;
        else s.cP = (s.cP || 0) - l.pt;
      }
    }
  });
  logs = logs.filter((l) => !set.has(l.id));
  lastActionLogIds.forEach((lid) => pushOp(ACT.STU_AWD_REV, lid));
  lastActionLogIds = [];
  saveData();
  hideUndoToast();
  if (typeof renderStudents === "function") renderStudents();
  if (currentView === "groups" && typeof renderGroups === "function") renderGroups();
};
const openAwardModal = (ids, title, groupId = null) => {
  hideUndoToast();
  awardContextIds = ids;
  currentGroupIdForAward = groupId;
  pendingTreasures = {};
  if (ids.length === 1) currentProfileId = ids[0];
  window._openReactAwardModal(ids, title, groupId);
};
const openManageGroupModal = (groupId = null) => {
  hideUndoToast();
  editingGroupId = groupId;
  window._openReactManageGroupModal(groupId);
};
const openGroupDetailModal = (g) => {
  awardContextIds = g.sIds;
  currentGroupIdForAward = g.id;
  window._openReactGroupDetailModal(g);
};
const openEditPointItemModal = (cat, itemId) => {
  editingPointItemCat = cat;
  editingPointItemId = itemId;
  window._openReactEditPointItemModal(cat, itemId);
};
const toggleMultiSelectMode = () => {
  hideUndoToast();
  isMultiSelectMode = !isMultiSelectMode;
  window.isMultiSelectMode = isMultiSelectMode;
  selectedStudentIds.length = 0;
  selectedGroupIds.clear();
  const fbtn = document.getElementById("floatingMultiSelectBtn");
  if (fbtn) {
    if (isMultiSelectMode) {
      fbtn.classList.add("hidden");
      hideUndoToast();
    } else {
      window.dispatchEvent(new Event("scroll"));
    }
  }
  const countEl = document.getElementById("multiSelectCount");
  if (countEl) countEl.textContent = `\u5DF2\u9078\u64C7 0 \u4F4D\u5B78\u751F`;
  if (typeof renderStudents === "function") renderStudents();
  if (currentView === "groups" && typeof renderGroups === "function") renderGroups();
};
const toggleStudentSelection = (id) => {
  if (selectedStudentIds.includes(id)) {
    selectedStudentIds = selectedStudentIds.filter((x) => x !== id);
  } else {
    selectedStudentIds.push(id);
  }
  window.selectedStudentIds = selectedStudentIds;
  const el = document.getElementById("multiSelectCount");
  if (el) el.textContent = `\u5DF2\u9078\u64C7 ${selectedStudentIds.length} \u4F4D\u5B78\u751F`;
  if (typeof renderStudents === "function") renderStudents();
};
const showUndoToast = (m) => {
  if (isMultiSelectMode) return;
  if (m) lastUndoMessage = m;
  const el = document.getElementById("undoMessage");
  if (el) el.textContent = lastUndoMessage;
  const toast = document.getElementById("undoToast");
  if (toast) toast.classList.remove("hidden");
  if (undoTimeout) clearTimeout(undoTimeout);
};
window.removePointItem = (cat, id) => {
  if (!confirm("\u522A\u9664\u6B64\u9805\u76EE\uFF1F")) return;
  pointItems[cat] = pointItems[cat].filter((i) => i.id !== id);
  pushOp(ACT.ITEM_DEL, { c: cat, id });
  saveData();
  if (typeof renderPointItems === "function") renderPointItems();
};
window.removeTreasureDef = (id) => {
  if (!confirm("\u522A\u9664\u6B64\u5BF6\u7269\uFF1F\u5B78\u751F\u5DF2\u6301\u6709\u7684\u8A72\u7A2E\u5BF6\u7269\u4E5F\u6703\u6E05\u9664\u3002")) return;
  treasureDefs = treasureDefs.filter((i) => i.id !== id);
  students.forEach((s) => {
    if (s.tr) delete s.tr[id];
  });
  pushOp(ACT.TR_DEF_DEL, id);
  saveData();
  if (typeof renderPointItems === "function") renderPointItems();
};
window.deleteLog = (id) => {
  if (!confirm("\u522A\u9664\u6B64\u7D00\u9304\uFF1F")) return;
  const l = logs.find((x) => x.id == id);
  if (l) {
    const s = students.find((x) => x.id === l.sID);
    if (s) {
      if (l.trId && l.trQty) {
        if (s.tr) s.tr[l.trId] = (s.tr[l.trId] || 0) - l.trQty;
      } else {
        if (l.iSum === 1) s.iP = (s.iP || 0) - l.pt;
        else s.cP = (s.cP || 0) - l.pt;
      }
    }
  }
  logs = logs.filter((x) => x.id != id);
  pushOp(ACT.STU_AWD_REV, id);
  saveData();
  if (window.refreshProxy) window.refreshProxy();
};
const scrollToReportLogs = () => {
  const el = document.getElementById("reportActivityTitle");
  if (el) el.scrollIntoView({ behavior: "smooth" });
};
const applyClassAvatarStyle = (style) => {
  students.forEach((s) => s.aS = style);
  pushOp(ACT.SET_AVATAR_STYLE, style);
  saveData();
};
const renameStudent = (oldId, newName, newStyle) => {
  const s = students.find((x) => x.id === oldId);
  if (!s) return { success: false, error: "\u627E\u4E0D\u5230\u5B78\u751F" };
  if (!newName.trim()) return { success: false, error: "\u8ACB\u8F38\u5165\u59D3\u540D" };
  if (newName !== oldId && students.some((x) => x.id === newName)) return { success: false, error: "\u59D3\u540D\u5DF2\u5B58\u5728" };
  if (newName !== oldId) {
    logs.filter((l) => l.sID === s.id).forEach((l) => l.sID = newName);
    groups.forEach((g) => {
      const idx = g.sIds.indexOf(s.id);
      if (idx > -1) g.sIds[idx] = newName;
    });
    if (currentProfileId === s.id) currentProfileId = newName;
    const selIdx = selectedStudentIds.indexOf(s.id);
    if (selIdx > -1) selectedStudentIds[selIdx] = newName;
    s.id = newName;
  }
  s.aS = newStyle;
  pushOp(ACT.STU_UPD, s);
  saveData();
  return { success: true };
};
const deleteStudent = (id) => {
  pushOp(ACT.STU_DEL, id);
  students = students.filter((x) => x.id !== id);
  logs = logs.filter((x) => x.sID !== id);
  saveData();
};
const addStudents = (names) => {
  names.forEach((n) => {
    const name = n.trim();
    if (!name) return;
    if (students.some((s) => s.id === name)) {
      console.warn("\u8DF3\u904E\u91CD\u8907\u59D3\u540D:", name);
      return;
    }
    const newStu = { id: name, cP: 0, iP: 0, aS: "fe", aU: getRandomSeed(), tr: {} };
    students.push(newStu);
    pushOp(ACT.STU_UPD, newStu);
  });
  saveData();
};
const saveGroup = (name, sids, editingId) => {
  if (!name.trim()) return { success: false, error: "\u8ACB\u8F38\u5165\u540D\u7A31" };
  if (!sids.length) return { success: false, error: "\u8ACB\u9078\u64C7\u6210\u54E1" };
  let g;
  if (editingId) {
    if (editingId !== name && groups.some((x) => x.id === name)) return { success: false, error: "\u7FA4\u7D44\u540D\u7A31\u5DF2\u5B58\u5728" };
    g = groups.find((x) => x.id === editingId);
    g.id = name;
    g.sIds = sids;
  } else {
    if (groups.some((x) => x.id === name)) return { success: false, error: "\u7FA4\u7D44\u540D\u7A31\u5DF2\u5B58\u5728" };
    g = { id: name, sIds: sids };
    groups.push(g);
  }
  pushOp(ACT.GRP_UPD, g);
  saveData();
  return { success: true };
};
const deleteGroup = (id) => {
  pushOp(ACT.GRP_DEL, id);
  groups = groups.filter((x) => x.id !== id);
  saveData();
};
const processGift = (donorId, amount, recipients, interval, step, ign) => {
  if (amount <= 0) return { success: false, error: "\u8ACB\u8F38\u5165\u6709\u6548\u6578\u91CF" };
  if (!recipients.length) return { success: false, error: "\u8ACB\u9078\u64C7\u81F3\u5C11\u4E00\u500B\u5C0D\u8C61" };
  const fee = interval > 0 && step > 0 ? Math.ceil(amount / interval) * step : 0;
  const totalPerRecipient = amount + fee;
  const totalDeduction = totalPerRecipient * recipients.length;
  const tsHex = StampTool.encode(Date.now());
  let donorLogId = null;
  const donor = students.find((s) => s.id === donorId);
  if (donor) {
    donorLogId = Math.random().toString(36).substring(2, 8);
    donor.cP -= totalDeduction;
    logs.push({ id: donorLogId, sID: donor.id, lb: "\u8D08\u8207\u9EDE\u6578", pt: -totalDeduction, TS: tsHex, iSum: ign ? 1 : 0 });
    pushOp(ACT.STU_AWD, { s: donor.id, lb: "\u8D08\u8207\u9EDE\u6578", p: -totalDeduction, l: donorLogId, is: ign ? 1 : 0 });
  }
  let currentIds = [];
  recipients.forEach((rid) => {
    const r = students.find((s) => s.id === rid);
    if (r) {
      const logId = Math.random().toString(36).substring(2, 8);
      r.cP += amount;
      logs.push({ id: logId, sID: r.id, lb: "\u7372\u5F97\u9EDE\u6578", pt: amount, TS: tsHex, iSum: ign ? 1 : 0 });
      pushOp(ACT.STU_AWD, { s: r.id, lb: "\u7372\u5F97\u9EDE\u6578", p: amount, l: logId, is: ign ? 1 : 0 });
      currentIds.push(logId);
    }
  });
  if (donorLogId) currentIds.push(donorLogId);
  lastActionLogIds = currentIds;
  saveData();
  return { success: true, amount, count: recipients.length };
};
const saveCustomItems = (items) => {
  customItems = items;
  pushOp(ACT.SET_CUSTOM_ITEMS, customItems, true);
  saveData();
};
const addPointItem = (cat, label, value, icon, ignore) => {
  if (!label.trim()) return;
  const itemId = Math.random().toString(36).substring(2, 8);
  const item = { id: itemId, lb: label.trim(), vl: value, ic: icon };
  if (ignore) item.iSum = 1;
  pointItems[cat].push(item);
  pushOp(3, { c: cat, i: item });
  saveData();
};
const addTreasureItem = (label, icon) => {
  if (!label.trim()) return;
  const itemId = Math.random().toString(36).substring(2, 8);
  const item = { id: itemId, lb: label.trim(), ic: icon };
  treasureDefs.push(item);
  pushOp(ACT.TR_DEF_UPD, item);
  saveData();
};
const saveEditItem = (cat, id, label, icon, value, ignore) => {
  if (cat === "treasure") {
    const item = treasureDefs.find((i) => i.id === id);
    if (item) {
      item.lb = label;
      item.ic = icon;
      pushOp(ACT.TR_DEF_UPD, item);
      saveData();
    }
  } else {
    const item = pointItems[cat].find((i) => i.id === id);
    if (item) {
      item.lb = label;
      item.vl = value;
      item.ic = icon;
      if (ignore) item.iSum = 1;
      else delete item.iSum;
      pushOp(ACT.ITEM_UPD, { c: cat, i: item });
      saveData();
    }
  }
};
const createClass = (name, copyFrom, copyItems, copyStudents) => {
  if (!name.trim()) return { success: false, error: "\u8ACB\u8F38\u5165\u73ED\u7D1A\u540D\u7A31" };
  if (classes.some((c) => c.id === name)) return { success: false, error: "\u73ED\u7D1A\u540D\u7A31\u5DF2\u5B58\u5728" };
  let items = JSON.parse(JSON.stringify(defaultItems));
  let s = [], g = [];
  if (copyFrom) {
    if (copyItems) {
      const siValue = localStorage.getItem(`CD_${copyFrom}_itm`);
      const si = siValue ? JSON.parse(siValue) : null;
      if (si) {
        items.pos = (si.pos || []).sort((a, b) => a.lb.localeCompare(b.lb, "zh-TW")).map((x) => ({ ...x, id: Math.random().toString(36).substring(2, 8) }));
        items.neg = (si.neg || []).sort((a, b) => a.lb.localeCompare(b.lb, "zh-TW")).map((x) => ({ ...x, id: Math.random().toString(36).substring(2, 8) }));
      }
    }
    if (copyStudents) {
      const oldSData = JSON.parse(localStorage.getItem(`CD_${copyFrom}_Stus`) || "[]");
      s = oldSData.map((x) => ({ id: x.id, cP: 0, iP: 0, aS: "fe", aU: getRandomSeed(), tr: {} }));
      g = JSON.parse(localStorage.getItem(`CD_${copyFrom}_Gs`) || "[]");
    }
  }
  classes.push({ id: name });
  pushOp(ACT.CLS_NEW, { id: name, s, itm: items, g }, true);
  students = s;
  pointItems = items;
  groups = g;
  logs = [];
  currentClassId = name;
  saveData();
  return { success: true };
};
const classSetStudents = (clazz) => {
  if (clazz && clazz !== currentClassId) {
    students = JSON.parse(localStorage.getItem(`CD_${clazz}_Stus`) || "[]").map((x) => ({ ...x, tr: x.tr || {} }));
    groups = JSON.parse(localStorage.getItem(`CD_${clazz}_Gs`) || "[]");
    logs = JSON.parse(localStorage.getItem(`CD_${clazz}_Ls`) || "[]");
    pointItems = JSON.parse(localStorage.getItem(`CD_${clazz}_itm`) || "null");
    if (!pointItems) {
      pointItems = JSON.parse(JSON.stringify(defaultItems));
      localStorage.setItem(`CD_${clazz}_itm`, JSON.stringify(pointItems));
    }
    currentClassId = clazz;
    localStorage.setItem("CD_cCId", currentClassId);
  }
};
const syncBehaviors = (srcClass) => {
  const siVal = localStorage.getItem(`CD_${srcClass}_itm`);
  const si = siVal ? JSON.parse(siVal) : null;
  if (si) {
    pointItems.pos = [...si.pos || []].sort((a, b) => a.lb.localeCompare(b.lb, "zh-TW")).map((x, i) => ({ ...x, id: "p" + (i + 1) }));
    pointItems.neg = [...si.neg || []].sort((a, b) => a.lb.localeCompare(b.lb, "zh-TW")).map((x, i) => ({ ...x, id: "n" + (i + 1) }));
    pushOp(ACT.SET_PT_ITEMS, pointItems);
    saveData();
  }
};
const resetAllClassesPoints = () => {
  classes.forEach((c) => {
    localStorage.setItem(`CD_${c.id}_Ls`, "[]");
    const stus = JSON.parse(localStorage.getItem(`CD_${c.id}_Stus`) || "[]");
    stus.forEach((s) => {
      s.cP = 0;
      s.iP = 0;
      s.tr = {};
    });
    localStorage.setItem(`CD_${c.id}_Stus`, JSON.stringify(stus));
  });
  logs = [];
  students.forEach((s) => {
    s.cP = 0;
    s.iP = 0;
    s.tr = {};
  });
  pushOp(18, null, true);
  saveData();
};
const resetCurrentClassPoints = () => {
  logs = [];
  students.forEach((s) => {
    s.cP = 0;
    s.iP = 0;
    s.tr = {};
  });
  pushOp(16, null);
  saveData();
};
window.awardPoints = awardPoints;
window.awardTreasure = awardTreasure;
window.undoAction = undoAction;
window.openAwardModal = openAwardModal;
window.openManageGroupModal = openManageGroupModal;
window.openGroupDetailModal = openGroupDetailModal;
window.openEditPointItemModal = openEditPointItemModal;
window.toggleMultiSelectMode = toggleMultiSelectMode;
window.toggleStudentSelection = toggleStudentSelection;
window.showUndoToast = showUndoToast;
window.hideUndoToast = hideUndoToast;
window.scrollToReportLogs = scrollToReportLogs;
window.applyClassAvatarStyle = applyClassAvatarStyle;
window.renameStudent = renameStudent;
window.deleteStudent = deleteStudent;
window.addStudents = addStudents;
window.saveGroup = saveGroup;
window.deleteGroup = deleteGroup;
window.processGift = processGift;
window.saveCustomItems = saveCustomItems;
window.addPointItem = addPointItem;
window.addTreasureItem = addTreasureItem;
window.saveEditItem = saveEditItem;
window.createClass = createClass;
window.classSetStudents = classSetStudents;
window.syncBehaviors = syncBehaviors;
window.resetAllClassesPoints = resetAllClassesPoints;
window.resetCurrentClassPoints = resetCurrentClassPoints;
