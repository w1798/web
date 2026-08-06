/**
 * ClassKudox - Cloud Synchronization Logic
 */

const _upstashResp = async (cmdArr) => {
    const baseUrl = cloudBinId.replace(/\/$/,'');
    const resp = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudApiKey}` },
        body: JSON.stringify(cmdArr)
    });
    try { const j = await resp.json(); return j; }
    catch(e) { return { error: 'parse_failed', status: resp.status }; }
};

const pushOp = (action, data, isGlobal = false) => {
    const o = { t: StampTool.encode(), a: action, d: data };
    if (isGlobal) {
        sysOps.push(o);
        localStorage.setItem('CD_SysOps', JSON.stringify(sysOps));
        L(`[CloudSync] + 紀錄全域 Ops: Action ${action}`, data);
    } else {
        ops.push(o);
        if (currentClassId) {
            localStorage.setItem(`CD_${currentClassId}_Ops`, JSON.stringify(ops));
            L(`[CloudSync] + 紀錄班級 Ops (${currentClassId}): Action ${action}`, data);
        }
    }
    setDirty(1);
};

const getFullBackupData = (includeOps = false) => { 
    const b = {}; 
    const validClassIds = new Set(classes.map(c => c.id));
    
    for (let i = localStorage.length - 1; i >= 0; i--) { 
        const k = localStorage.key(i); 
        if (!k.startsWith('CD_') && k !== 'aSyn' && k !== 'drty') continue; 
        
        const match = k.match(/^CD_(.+)_(Stus|Gs|Ls|DLs|DL_Res|DL_ResData|itm|cItm|tDef|set|Ops|meta|cPref|gSet)$/);
        if (match) {
            const cid = match[1];
            if (!validClassIds.has(cid)) {
                L(`[System] 清除殭屍資料: ${k}`);
                localStorage.removeItem(k);
                continue;
            }
        }

        // 排除雲端不參與同步的項目：金鑰、Ops、設定、同步頻率、本機還原資料
        const isCloudExclusion = (!includeOps && (k === 'BId' || k === 'Key' || k === 'aSyn' || k === 'drty' || k.endsWith('_Ops') || k.endsWith('_set') || k.endsWith('_DL_ResData')));
        if (!isCloudExclusion) { 
            try { b[k] = JSON.parse(localStorage.getItem(k)); } catch(e) { b[k] = localStorage.getItem(k); } 
        } 
    } 
    b.sVer = localSyncVersion; 
    return b; 
};

const restoreFromBackup = (data, reload = true) => {
    // 1. 清理本地舊資料，但保留「顯示與聲音」設定 (_set) 與 裝置特定設定 (BId, Key, aSyn)
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k.startsWith('CD_')) {
            if (k.endsWith('_Ops') || k.endsWith('_set') || k === 'CD_CustomUIState') continue;
            localStorage.removeItem(k);
        } else if (k === 'sVer' || k === 'drty') {
            localStorage.removeItem(k);
        }
    }

    // 2. 寫入下載的資料，但同樣要確保不覆蓋本地的 _set 與 裝置金鑰
    Object.keys(data).forEach(k => { 
        if (k.endsWith('_set') || k === 'aSyn' || k === 'BId' || k === 'Key') return;
        localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k])); 
    });
    localStorage.setItem('BId', cloudBinId); 
    localStorage.setItem('Key', cloudApiKey); 
    localStorage.setItem('aSyn', String(autoSyncInterval));
    if (reload) location.reload();
    else { 
        localSyncVersion = data.sVer || data.v || data.syncVersion || '000000000000';
        classes = safeLoad('CD_Cls', []);
        currentClassId = localStorage.getItem('CD_cCId');
        loadClassData(); 
        isDirty = 3; 
        if (typeof applySettings === 'function') applySettings(); 
        
        // 交由 React 接管重繪，不直接呼叫 renderXxx，避免 DOMException
        if (typeof window.refreshProxy === 'function') setTimeout(() => window.refreshProxy(), 0);
        
        if (typeof updateSyncStatus === 'function') updateSyncStatus(); 
        L(`[System] 已還原版本 ${localSyncVersion}，且不重整頁面`);
    }
};

const getCloudProvider = () => {
    if (cloudBinId.includes('firebaseio.com')) return 'firebase';
    if (cloudBinId.includes('upstash.io')) return 'upstash';
    return null;
};
const getCloudRequest = (method = 'PUT') => {
    const provider = getCloudProvider();
    if (!provider) return null;
    let url = cloudBinId;
    let headers = { 'Content-Type': 'application/json' };
    if (provider === 'firebase') {
        let baseUrl = cloudBinId.split('?')[0].replace(/\/$/,'');
        if (!baseUrl.endsWith('.json')) baseUrl += '/' + cloudApiKey + '/classKudox_backup.json';
        url = baseUrl;
    } else {
        const suffix = method === 'PUT' ? 'SET' : 'GET';
        url = `${cloudBinId.replace(/\/$/,'')}/${suffix}/classKudox_backup`;
        headers['Authorization'] = `Bearer ${cloudApiKey}`;
    }
    return { url, headers, provider };
};
const performCloudUpload = async (manual = false) => {
    if (!cloudBinId || !cloudApiKey) return false;
    if (typeof updateSyncStatus === 'function') updateSyncStatus();

    const provider = getCloudProvider();
    if (!provider) return false;

    // === CAS Phase 1: 讀取雲端版本 ===
    let cloudVer = null, etag = null, backupEtag = null;
    if (provider === 'firebase') {
        let baseUrl = cloudBinId.split('?')[0].replace(/\/$/,'');
        if (!baseUrl.endsWith('.json')) baseUrl += '/' + cloudApiKey;
        const backupUrl = baseUrl + '/classKudox_backup.json';
        const verUrl = baseUrl + '/classKudox_ver.json';
        try {
            const [backupResp, verResp] = await Promise.all([
                fetch(backupUrl, { headers: { 'X-Firebase-ETag': 'true' } }),
                fetch(verUrl, { headers: { 'X-Firebase-ETag': 'true' } })
            ]);
            if (backupResp.ok) backupEtag = backupResp.headers.get('ETag');
            if (verResp.ok) { etag = verResp.headers.get('ETag'); const d = await verResp.json(); cloudVer = d?.ver || null; }
        } catch(e) {}
    } else if (provider === 'upstash') {
        try {
            const gr = getCloudRequest('GET');
            if (gr) {
                const resp = await fetch(gr.url, { headers: gr.headers });
                if (resp.ok) {
                    const r = await resp.json();
                    // URL path GET 回傳原始 JSON 字串，需解析
                    const p = (r.result && typeof r.result === 'object') ? r.result : (r.result ? JSON.parse(r.result) : {});
                    cloudVer = p.ver || null;
                }
            }
        } catch(e) {}
    }

    if (!manual && cloudVer && cloudVer !== localSyncVersion) {
        L(`[CloudSync CAS] 衝突: 雲端 v${cloudVer} ≠ 本地 v${localSyncVersion}，拒絕上傳`);
        setDirty(2);
        alert('上傳衝突：雲端資料已被更新，請稍後再試');
        return false;
    }

    try {
        const newVer = StampTool.encode();
        const oldVer = localSyncVersion;
        localSyncVersion = newVer;
        L(`[CloudSync連線] CAS 準備上傳 v${oldVer}→v${newVer} (${provider})`);
        const toPush = getFullBackupData(false);
        const compressed = await compressJSON(toPush);
        if (!compressed) {
            LE('[CloudSync] 壓縮失敗，中止上傳');
            localSyncVersion = oldVer;
            return false;
        }

        if (provider === 'firebase') {
            const req = getCloudRequest('PUT');
            if (!req) throw new Error('不支援的雲端服務');

            let baseUrl = cloudBinId.split('?')[0].replace(/\/$/,'');
            if (!baseUrl.endsWith('.json')) baseUrl += '/' + cloudApiKey;
            const verUrl = baseUrl + '/classKudox_ver.json';

            // Step 1: 寫入備份資料 (If-Match 條件寫入，防止 backup 被汙染；手動模式 blind write)
            const backupHeaders = { 'Content-Type': 'application/json' };
            if (!manual && backupEtag) backupHeaders['If-Match'] = backupEtag;
            const backResp = await fetch(req.url, {
                method: 'PUT',
                headers: backupHeaders,
                body: JSON.stringify({ d: compressed })
            });
            if (!backResp.ok) {
                L(`[CloudSync] ⚠️ backup 衝突 (狀態 ${backResp.status}) — 雲端備份已被其他裝置更新`);
                localSyncVersion = oldVer;
                setDirty(2);
                if (manual) alert('上傳衝突：備份資料已被其他裝置修改');
                return false;
            }

            // Step 2: CAS 寫入版本節點 (If-Match；手動模式 blind write)
            const verHeaders = { 'Content-Type': 'application/json' };
            if (!manual && etag) verHeaders['If-Match'] = etag;
            const casResp = await fetch(verUrl, {
                method: 'PUT',
                headers: verHeaders,
                body: JSON.stringify({ ver: newVer })
            });

            if (!casResp.ok) {
                L(`[CloudSync] ⚠️ CAS 衝突 (Firebase ver 狀態 ${casResp.status})`);
                localSyncVersion = oldVer;
                setDirty(2);
                if (manual) alert('上傳衝突：雲端資料已被更新，請稍後再試');
                return false;
            }

            L(`[CloudSync] ✅ 同步成功 v${localSyncVersion}`);
            localStorage.setItem('sVer', localSyncVersion);
            saveData(true); setDirty(3);
            if (manual) alert('已成功上傳至雲端');
            return true;
        } else {
            // Upstash: Lock + 原子寫入 (手動模式跳過 CAS 直接寫)
            if (manual) {
                const wd = await _upstashResp(['SET', 'classKudox_backup', JSON.stringify({ d: compressed, ver: newVer })]);
                if (wd.result !== 'OK') throw new Error('Upstash 寫入失敗');
                L(`[CloudSync] ✅ 手動同步成功 v${localSyncVersion}`);
                localStorage.setItem('sVer', localSyncVersion);
                saveData(true); setDirty(3);
                if (manual) alert('已成功上傳至雲端');
                return true;
            }

            const lockId = Math.random().toString(36).slice(2) + Date.now().toString(36);
            let lockHeld = false;

            try {
                const lk = await _upstashResp(['SET', 'classKudox_lock', lockId, 'NX', 'EX', '10']);
                if (lk.result !== 'OK') {
                    L('[CloudSync] ⚠️ 鎖競爭，稍後重試');
                    localSyncVersion = oldVer;
                    setDirty(2);
                    if (manual) alert('上傳衝突：其他裝置正在同步，請稍後再試');
                    return false;
                }
                lockHeld = true;

                // 二次確認版本（鎖內重讀）
                const re = await _upstashResp(['GET', 'classKudox_backup']);
                const reParsed = (re.result && typeof re.result === 'object') ? re.result : (re.result ? JSON.parse(re.result) : {});
                if (reParsed.ver && reParsed.ver !== cloudVer) {
                    L(`[CloudSync] ⚠️ CAS 衝突 (cloud=${reParsed.ver}, expected=${cloudVer})`);
                    localSyncVersion = oldVer; setDirty(2);
                    if (manual) alert('上傳衝突：雲端資料已被更新，請稍後再試');
                    return false;
                }

                const wd = await _upstashResp(['SET', 'classKudox_backup', JSON.stringify({ d: compressed, ver: newVer })]);
                if (wd.result !== 'OK') throw new Error('Upstash 寫入失敗');

                L(`[CloudSync] ✅ CAS 同步成功 v${localSyncVersion}`);
                localStorage.setItem('sVer', localSyncVersion);
                saveData(true); setDirty(3);
                if (manual) alert('已成功上傳至雲端');
                return true;

            } finally {
                if (lockHeld) await _upstashResp(['DEL', 'classKudox_lock']);
            }
        }
    } catch(e) {
        LE('[CloudSync] 上傳錯誤:', e);
        setDirty(2);
        if (manual) alert('上傳失敗: ' + e.message);
        return false;
    }
};

const performCloudDownload = async (manual = false) => {
    if (!cloudBinId || !cloudApiKey) return;
    isSyncing = true; setDirty(4); 
    try {
        const req = getCloudRequest('GET');
        if (!req) throw new Error('不支援的雲端服務');
        const resp = await fetch(req.url, { headers: req.headers });
        if (resp.ok) {
            let raw = null;
            if (req.provider === 'firebase') {
                const text = await resp.text();
                raw = text && text !== 'null' ? JSON.parse(text) : null;
            } else {
                const r = await resp.json();
                raw = r.result;
            }
            if (!raw) {
                if(manual) alert('雲端尚無資料，請先上傳');
                isSyncing = false; return;
            }
            const cloudData = await parseCloudData(raw);
            if (cloudData) {

                restoreFromBackup(cloudData, true);
                setDirty(3); 
                if(manual) alert('從雲端下載並還原成功');
            } else {
                throw new Error('解析雲端數據失敗');
            }
        } else {
            throw new Error('雲端讀取失敗');
        }
    } catch(e) { 
        LE('[CloudSync] 下載錯誤:', e); 
        setDirty(2); 
        if(manual) alert('下載失敗: ' + e.message);
    } finally {
        isSyncing = false;
    }
};

const parseCloudData = async (raw) => {
    let data = null;
    try {
        if (typeof raw === 'string') {
            const tr = raw.trim();
            if (tr.length > 50 && !tr.startsWith('{')) data = await decompressJSON(tr);
            else if (tr.startsWith('{')) {
                const parsed = JSON.parse(tr);
                if (parsed.d && typeof parsed.d === 'string') data = await decompressJSON(parsed.d);
                else data = parsed;
            }
        } else if (typeof raw === 'object' && raw !== null) {
            if (raw.d && typeof raw.d === 'string') data = await decompressJSON(raw.d);
            else data = raw;
        }
        if (data) {
            if (!data.sVer) data.sVer = data.v || data.syncVersion || '000000000000';
        }
    } catch(e) { LE('[CloudSync] 解析失敗:', e); }
    return data;
};

let _syncDepth = 0;

const checkCloudSyncState = async () => {
    if (isSyncing || !cloudBinId || !cloudApiKey) return;
    _syncDepth++;
    if (_syncDepth > 2) { _syncDepth--; return; }
    try {
    const hadChanges = (isDirty === 1);
    isSyncing = true; setDirty(4); 

    let cloudVer = '000000000000';
    let cloudData = null;
    let skipDownload = false;
    let verNodeValue = null;

    L(`[CloudSync連線] Step 1 開始預檢及下載雲端版本...`);

    // Firebase 專屬：先快速檢查版本節點，減少下載流量
    if (getCloudProvider() === 'firebase') {
        try {
            let baseUrl = cloudBinId.split('?')[0].replace(/\/$/,'');
            if (!baseUrl.endsWith('.json')) baseUrl += '/' + cloudApiKey + '/classKudox_ver.json';
            const verUrl = baseUrl;
            const verResp = await fetch(verUrl);
            if (verResp.ok) {
                const text = await verResp.text();
                const verSize = text ? text.length : 0;
                L(`[CloudSync] Firebase _ver 回應大小: ${verSize} bytes`);
                const verData = text && text !== 'null' ? JSON.parse(text) : null;
                if (verData && verData.ver) {
                    verNodeValue = verData.ver;
                    L(`[CloudSync] Firebase 版本節點: ${verData.ver}`);
                    if (verData.ver === localSyncVersion) {
                        if (!hadChanges && ops.length === 0 && sysOps.length === 0) {
                            L(`[CloudSync] 版本相同 (${verData.ver})，且無待上傳項目，無需動作`);
                            isSyncing = false;
                            setDirty(3);
                            return;
                        }
                        L(`[CloudSync] 版本相同 (${verData.ver})，有 ${ops.length + sysOps.length} 筆待上傳，略過下載直接上傳`);
                        cloudVer = localSyncVersion;
                        skipDownload = true;
                    }
                } else {
                    L(`[CloudSync] Firebase 版本節點為空，將下載完整備份`);
                }
            } else {
                L(`[CloudSync] Firebase 版本節點不存在，向後相容完整下載`);
            }
        } catch(e) {
            L(`[CloudSync] 版本檢查異常，fallback 完整下載:`, e);
        }
    }

    if (!skipDownload) {
        L(`[CloudSync] ⬇️ 開始下載完整備份 (classKudox_backup)...`);
        try {
            const req = getCloudRequest('GET');
            if (!req) throw new Error('不支援的雲端服務');
            const resp = await fetch(req.url, { headers: req.headers });
            if (resp.ok) {
                const backupSize = (await resp.clone().text()).length;
                L(`[CloudSync] ✅ 完整備份下載成功 (${backupSize} bytes)`);
                let raw = null;
                if (req.provider === 'firebase') {
                    const text = await resp.text();
                    raw = text && text !== 'null' ? JSON.parse(text) : null;
                } else {
                    const r = await resp.json();
                    raw = r.result;
                    // 擷取外層 wrapper ver (Upstash 存的是 { d, ver })
                    if (raw) {
                        try {
                            const wrapper = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            if (wrapper && wrapper.ver) {
                                if (!verNodeValue) verNodeValue = wrapper.ver;
                            }
                        } catch(_) {}
                    }
                }
                
                L(`[CloudSync] Step 2a 準備解析雲端數據...`);
                cloudData = null;
                if (raw) {
                    cloudData = await parseCloudData(raw);
                }
                if (!cloudData) {
                    L(`[CloudSync] 雲端尚無資料或為空，視為全新開始`);
                }

                cloudVer = cloudData ? (cloudData.sVer || '000000000000') : '000000000000';
                if (verNodeValue && cloudVer !== verNodeValue) {
                    L(`[CloudSync] ⚠️ backup sVer (${cloudVer}) ≠ ver node (${verNodeValue})，信任 ver node`);
                    cloudVer = verNodeValue;
                    if (cloudData) cloudData.sVer = cloudVer;
                }
                L(`[CloudSync] Step 2b 取得雲端版本: ${cloudVer}`);
            } else throw new Error('預檢連線失敗');
        } catch (e) { 
            LE("[CloudSync] 預檢報錯:", e); setDirty(2);
            isSyncing = false;
            return;
        }
    }

    L(`[CloudSync] Step 3 進行紀錄清理與版本比對...`);
    // --- Ops 清理：時間錨點判斷 ---
    const preSysLen = sysOps.length;
    sysOps = sysOps.filter(o => o.t > localSyncVersion);
    if (sysOps.length < preSysLen) {
        L(`[CloudSync] 清除已過期全域 Ops: ${preSysLen - sysOps.length} 筆 (剩餘 ${sysOps.length} 筆)`);
        localStorage.setItem('CD_SysOps', JSON.stringify(sysOps));
    }

    const preOpsLen = ops.length;
    ops = ops.filter(o => o.t > localSyncVersion);
    if (ops.length < preOpsLen) {
        L(`[CloudSync] 清除已過期班級 Ops: ${preOpsLen - ops.length} 筆 (剩餘 ${ops.length} 筆)`);
        localStorage.setItem(`CD_${currentClassId}_Ops`, JSON.stringify(ops));
    }

    const vComp = localSyncVersion.localeCompare(cloudVer);
    let modified = false;

    if (vComp !== 0 && (cloudData || cloudVer !== '000000000000')) {
        // 資料版本不同時，先偵測程式碼是否也有更新
        try {
            const vRes = await fetch('version.json?t=' + Date.now());
            if (vRes.ok) {
                const vData = await vRes.json();
                if (vData.ver && vData.ver !== APP_VER) {
                    L(`[CloudSync] 偵測到程式更新 (${APP_VER} → ${vData.ver})，強制重載頁面...`);
                    localStorage.setItem('APP_VER', vData.ver);
                    location.reload(true);
                    return;
                }
            }
        } catch(e) { /* 離線或讀取失敗時忽略，繼續正常同步 */ }

        L(`[CloudSync] Step 4 版本不同，以雲端為基底覆蓋並重播 Ops (本地: ${localSyncVersion}, 雲端: ${cloudVer})...`);

        // 覆蓋前詢問使用者是否先匯出備份 (如果設定沒關閉的話)
        const shouldPromptBackup = !settings || settings.sBkup !== 0;
        if (shouldPromptBackup && confirm('雲端資料和本地資料不同，是否先匯出資料做備份？')) {
            try {
                const backupData = getFullBackupData(true);
                const compressed = await compressJSON(backupData, true);
                if (compressed) {
                    const raw = atob(compressed);
                    const bytes = new Uint8Array(raw.length);
                    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
                    const blo = new Blob([bytes], { type: 'application/gzip' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blo);
                    a.download = `ClassKudox_${new Date().toLocaleDateString().replace(/\//g, '')}.json.gz`;
                    a.click();
                }
                L('[CloudSync] 使用者已匯出本地備份，繼續同步...');
            } catch (exportErr) {
                LE('[CloudSync] 匯出備份失敗:', exportErr);
            }
        }

        const oldClassId = currentClassId;
        const oldOps = [...ops];
        const oldSysOps = [...sysOps];
        let mergeChanged = false;
        
        // 儲存本地 delLogs 與 delLogRestored（所有班級），避免被 restoreFromBackup 覆蓋
        const savedDelLogs = {};
        const savedDelLogRestored = {};
        const savedResData = {};
        if (currentClassId) {
            savedDelLogs[currentClassId] = [...delLogs];
            savedDelLogRestored[currentClassId] = [...delLogRestored];
            savedResData[currentClassId] = { ...delLogResData };
        }
        classes.forEach(c => {
            if (!savedDelLogs[c.id]) {
                try { const raw = localStorage.getItem(`CD_${c.id}_DLs`); if (raw) savedDelLogs[c.id] = JSON.parse(raw); } catch(e) {}
            }
            if (!savedDelLogRestored[c.id]) {
                try { const raw = localStorage.getItem(`CD_${c.id}_DL_Res`); if (raw) savedDelLogRestored[c.id] = JSON.parse(raw); } catch(e) {}
            }
            if (!savedResData[c.id]) {
                try { const raw = localStorage.getItem(`CD_${c.id}_DL_ResData`); if (raw) savedResData[c.id] = JSON.parse(raw); } catch(e) {}
            }
        });
        
        restoreFromBackup(cloudData, false);
        localSyncVersion = cloudVer;

        L(`[CloudSync] Merge restore 完成: cloudVer=${cloudVer}, oldOps=${oldOps.length}筆`);
        ops = oldOps;
        sysOps = oldSysOps;

        if (currentClassId === oldClassId) {
            if (sysOps.length > 0 || ops.length > 0) {
                sysOps.forEach(o => {
                    if (o.a === ACT.CLS_REN) { const c = classes.find(x => x.id === o.d.old); if (c) c.id = o.d.new; }
                    else if (o.a === ACT.CLS_ARC) { const c = classes.find(x => x.id === o.d.id); if (c) c.arc = o.d.arc; }
                    else if (o.a === ACT.CLS_DEL) { classes = classes.filter(x => x.id !== o.d.id); }
                    else if (o.a === ACT.CLS_NEW) { 
                        const cid = o.d.id;
                        if (!classes.some(x => x.id === cid)) {
                            classes.push({ id: cid });
                            localStorage.setItem(`CD_${cid}_Stus`, JSON.stringify(o.d.s || []));
                            localStorage.setItem(`CD_${cid}_Gs`, JSON.stringify(o.d.g || []));
                            localStorage.setItem(`CD_${cid}_itm`, JSON.stringify(o.d.itm || {}));
                            localStorage.setItem(`CD_${cid}_Ls`, '[]');
                        }
                    }
                    else if (o.a === ACT.SYS_RESET) { 
                        classes.forEach(c => {
                            localStorage.setItem(`CD_${c.id}_Ls`, '[]');
                            localStorage.setItem(`CD_${c.id}_DLs`, '[]');
                            localStorage.setItem(`CD_${c.id}_DL_Res`, '[]');
                            localStorage.setItem(`CD_${c.id}_DL_ResData`, '{}');
                        });
                        logs = []; delLogs = []; delLogRestored = []; delLogResData = {};
                    }
                    else if (o.a === ACT.SET_CUSTOM_ITEMS) { customItems = o.d; }
                    modified = true;
                });
                ops.forEach(o => {
                    if (o.a === ACT.STU_AWD) { 
                        const sid = o.d.s, s = students.find(x => x.id === sid);
                        if (s) {
                            if (o.d.is === 1 && !o.d.ti) s.iP = (s.iP || 0) + o.d.p;
                            else if (!o.d.ti) s.cP = (s.cP || 0) + o.d.p;
                            logs.push({ id: o.d.l, sID: sid, lb: o.d.lb, pt: o.d.p, TS: o.t, iSum: o.d.is === 1 ? 1 : undefined, trId: o.d.ti, trQty: o.d.tq });
                            if (o.d.ti && o.d.tq) { if (!s.tr) s.tr = {}; s.tr[o.d.ti] = (s.tr[o.d.ti] || 0) + o.d.tq; }
                            modified = true;
                        }
                    } else if (o.a === ACT.STU_AWD_REV) { 
                        const logIdx = logs.findIndex(l => l.id === o.d);
                        if (logIdx > -1) {
                            const l = logs[logIdx], s = students.find(x => x.id === l.sID);
                            if (s) { if (l.trId && l.trQty) { if (s.tr) s.tr[l.trId] = (s.tr[l.trId] || 0) - l.trQty; } else { if (l.iSum === 1) s.iP = (s.iP || 0) - l.pt; else s.cP = (s.cP || 0) - l.pt; } }
                            logs.splice(logIdx, 1); modified = true;
                        }
                    } else if (o.a === ACT.ITEM_UPD) {
                        const cat = o.d.c, target = pointItems[cat];
                        if (target) { const idx = target.findIndex(i => i.id === o.d.i.id); if (idx > -1) target[idx] = o.d.i; else target.push(o.d.i); modified = true; }
                    } else if (o.a === ACT.STU_UPD) { const idx = students.findIndex(s => s.id === o.d.id); if (idx > -1) students[idx] = o.d; else students.push(o.d); modified = true; }
                    else if (o.a === ACT.ITEM_DEL) { const cat = o.d.c; if (pointItems[cat]) { pointItems[cat] = pointItems[cat].filter(i => i.id !== o.d.id); modified = true; } }
                    else if (o.a === ACT.STU_DEL) { students = students.filter(s => s.id !== o.d); logs = logs.filter(l => l.sID !== o.d); modified = true; }
                    else if (o.a === ACT.GRP_UPD) { const idx = groups.findIndex(g => g.id === o.d.id); if (idx > -1) groups[idx] = o.d; else groups.push(o.d); modified = true; }
                    else if (o.a === ACT.GRP_DEL) { groups = groups.filter(g => g.id !== o.d); modified = true; }
                    else if (o.a === ACT.TR_DEF_UPD) { const idx = treasureDefs.findIndex(i => i.id === o.d.id); if (idx > -1) treasureDefs[idx] = o.d; else treasureDefs.push(o.d); modified = true; }
                    else if (o.a === ACT.TR_DEF_DEL) { treasureDefs = treasureDefs.filter(i => i.id !== o.d); students.forEach(s => { if(s.tr) delete s.tr[o.d]; }); modified = true; }
                    else if (o.a === ACT.LOG_CLR) {
                        localStorage.setItem(`CD_${currentClassId}_DL_Res`, '[]');
                        localStorage.setItem(`CD_${currentClassId}_DL_ResData`, '{}');
                        logs = []; delLogs = []; delLogRestored = []; delLogResData = {}; modified = true;
                    }
                    else if (o.a === ACT.SET_PT_ITEMS) { pointItems = o.d; modified = true; }
                    else if (o.a === ACT.SET_AVATAR_STYLE) { students.forEach(s => s.aS = o.d); modified = true; }
                });
            } else {
                localStorage.setItem(`CD_${currentClassId}_Ops`, '[]');
            }
            
            // 儲存合併前的雲端 DL_Res ID 集合（供重新套用判斷用）
            const cloudResIdsByCid = {};
            Object.keys(savedDelLogRestored).forEach(cid => {
                const key = `CD_${cid}_DL_Res`;
                try { const raw = localStorage.getItem(key); if (raw) cloudResIdsByCid[cid] = new Set(JSON.parse(raw)); } catch(e) {}
                if (!cloudResIdsByCid[cid]) cloudResIdsByCid[cid] = new Set();
            });
            
            // === 合併（不受有無 Ops 影響，確保 delLogRestored 跨裝置同步） ===
            Object.keys(savedDelLogs).forEach(cid => {
                const key = `CD_${cid}_DLs`;
                let cloudDLs = [];
                try { const raw = localStorage.getItem(key); if (raw) cloudDLs = JSON.parse(raw); } catch(e) {}
                const existingIds = new Set(cloudDLs.map(dl => dl.id));
                let merged = false;
                savedDelLogs[cid].forEach(dl => {
                    if (!existingIds.has(dl.id)) { cloudDLs.push(dl); existingIds.add(dl.id); merged = true; }
                });
                if (merged) { localStorage.setItem(key, JSON.stringify(cloudDLs)); mergeChanged = true; }
            });
            Object.keys(savedDelLogRestored).forEach(cid => {
                const key = `CD_${cid}_DL_Res`;
                let cloudRes = [];
                try { const raw = localStorage.getItem(key); if (raw) cloudRes = JSON.parse(raw); } catch(e) {}
                const existingIds = new Set(cloudRes);
                let merged = false;
                savedDelLogRestored[cid].forEach(id => {
                    if (!existingIds.has(id)) { cloudRes.push(id); existingIds.add(id); merged = true; }
                });
                if (merged) { localStorage.setItem(key, JSON.stringify(cloudRes)); mergeChanged = true; }
            });
            try { const raw = localStorage.getItem(`CD_${currentClassId}_DL_Res`); if (raw) delLogRestored = JSON.parse(raw); } catch(e) {}
            try { const raw = localStorage.getItem(`CD_${currentClassId}_DLs`); if (raw) delLogs = JSON.parse(raw); } catch(e) {}
            delLogs = delLogs.filter(dl => !delLogRestored.includes(dl.id));
            
            // 重新套用本機還原（被 restoreFromBackup 覆蓋的點數與 log 條目）
            Object.keys(savedDelLogRestored).forEach(cid => {
                const cloudIds = cloudResIdsByCid[cid] || new Set();
                const resData = savedResData[cid] || {};
                savedDelLogRestored[cid].forEach(rid => {
                    if (!cloudIds.has(rid) && resData[rid]) {
                        const d = resData[rid];
                        const s = students.find(x => x.id === d.sID);
                        if (s) {
                            if (d.trId && d.trQty) {
                                if (s.tr) s.tr[d.trId] = (s.tr[d.trId] || 0) + d.trQty;
                                else s.tr = { [d.trId]: d.trQty };
                            } else {
                                if (d.iSum === 1) s.iP = (s.iP || 0) + d.pt;
                                else s.cP = (s.cP || 0) + d.pt;
                            }
                            const logEntry = { id: Math.random().toString(36).substring(2, 8), sID: d.sID, lb: d.lb, pt: d.pt, TS: d.originalTS };
                            if (d.iSum) logEntry.iSum = 1;
                            if (d.trId) { logEntry.trId = d.trId; logEntry.trQty = d.trQty; logEntry.iSum = 1; }
                            logs.push(logEntry);
                            delLogResData[rid] = d;
                            mergeChanged = true;
                        }
                    }
                });
            });
            if (modified || mergeChanged) {
                saveData();
                if (typeof window.refreshProxy === 'function') window.refreshProxy();
            } else {
                localStorage.setItem(`CD_${currentClassId}_Ops`, JSON.stringify(ops));
            }
        } else {
            L(`[CloudSync] ⚠️ cCId 從 ${oldClassId} 變為 ${currentClassId}，跳過 Ops 套用`);
            if (oldOps.length > 0) {
                localStorage.setItem(`CD_${oldClassId}_Ops`, JSON.stringify(oldOps));
            }
        }

        if (modified || mergeChanged) {
            if (!await performCloudUpload()) { isSyncing = false; await checkCloudSyncState(); return; }
        } else {
            if (isDirty === 4) setDirty(3); 
        }
    } else if (hadChanges || vComp > 0 || sysOps.length > 0) {
        L(`[CloudSync] Step 4 版本相同，但資料變動或系統變動，執行上傳...`);
        if (!await performCloudUpload()) { isSyncing = false; await checkCloudSyncState(); return; }
    } else if (ops.length > 0) {
        // 如果版本相同 (vComp=0) 且僅有班級 Ops
        // 必須確認這些 Ops 的時間戳確實比目前雲端版本還要新才上傳
        const hasNewerOps = ops.some(o => o.t > localSyncVersion);
        if (hasNewerOps) {
            L(`[CloudSync] Step 5 檢測到 ${ops.length} 筆新產生的 Ops，執行上傳...`);
            if (!await performCloudUpload()) { isSyncing = false; await checkCloudSyncState(); return; }
        } else {
            L(`[CloudSync] Step 5 剩餘 ${ops.length} 筆 Ops 已包含在版本 ${localSyncVersion} 中，不予重複上傳。`);
            setDirty(3);
        }
    } else {
        L(`[CloudSync] 雲端版本(${cloudVer})與本地相同，且無本地 Ops，無需操作`);
        setDirty(3); 
    }

    isSyncing = false;
    } finally { _syncDepth--; }
};

window.pushOp = pushOp;
window.getFullBackupData = getFullBackupData;
window.restoreFromBackup = restoreFromBackup;
window.performCloudUpload = performCloudUpload;
window.performCloudDownload = performCloudDownload;
window.parseCloudData = parseCloudData;
window.checkCloudSyncState = checkCloudSyncState;
