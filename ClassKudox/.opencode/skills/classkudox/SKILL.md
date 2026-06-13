---
name: classkudox
description: Use for ClassKudox 專案（ClassKudox/）。涵蓋 React 遷移（Vanilla→JSX）、Firebase/Upstash 雲端同步、esbuild 建置系統、../loader_engine.js 三模式載入、架構分離（邏輯/UI）、以及所有已知執行時期錯誤模式。當任務涉及 ClassKudox/ 目錄、config.js、../loadapp.js、build.bat 時觸發。
---

# ClassKudox 開發指引

## 架構金律

- **邏輯/UI 分離**：純 JS 邏輯放在 `actions.js`、`state.js`、`utils.js`、`sync.js` — 零 DOM 操作。UI 渲染透過 React JSX 放在 `components/`。兩者透過 `window` 全域橋接函數和 React Context API 通訊。
- **源碼/產物分離**：建置產出到 `dist/`。源碼在專案根目錄和 `components/`。**禁止直接編輯 `dist/` 檔案**。
- **Modal 堆疊**：Escape 鍵一次關閉一個 modal，使用 React state（`window._openModalStack`），不使用 DOM class 查詢。

## 載入系統（loader_engine.js + config.js）

### 三種模式（透過 index.html `<head>` 中的 `APP_JSX` 設定）

| 模式 | `APP_JSX` | 載入方式 | 用途 |
|---|---|---|---|
| Vanilla | 未設定或 `'vanilla'` | 直接載入源碼 `.js` | 微型工具，無 React |
| Babel | `'babel'` 或 `'bb'` 或 `'test'` | 載入源碼 + Babel 即時轉換 JSX | 開發模式 |
| esbuild | `'es'` 或 `'esbuild'` 或 `'1'` | 載入 `dist/` 預編譯產物 | 正式環境 |

### config.js 結構

```js
scripts: [
    { url: 'utils.js', type: 'js' },  // type: 'js' → 永遠從源目錄載入
    'context.js',                       // 無 type → esbuild 模式時變 dist/context.js
    'components/Modals.js',
    ...
]
```

規則：
- `type: 'js'` 的項目跳過 `dist/` 前綴（用於不需 esbuild 的 Vanilla JS）
- 純字串項目（無 type）在 esbuild 模式下自動加上 `dist/` 前綴（loadapp.js line 142-161）
- Babel 模式下，無 type 的項目預設 `type='text/babel'`，Babel 會編譯
- 正式環境將所有 Vanilla 檔案打包成單一 `dist/vanilla.js`

### 建置系統（build.bat）

使用 `D:\portable\esbuild.exe` 搭配旗標：
- `--jsx=transform` — JSX 轉換成 `React.createElement`
- `--minify` — 壓縮
- `--loader:.js=jsx` — 僅用於含 JSX 的檔案

Vanilla kernel bundle：
```
Get-Content utils.js,state.js,sync.js,actions.js,ui.js,init-ui.js,updater.js -Raw | Set-Content dist/vanilla_raw.js
esbuild dist/vanilla_raw.js --minify --outfile=dist/vanilla.js
del dist/vanilla_raw.js
```

### Vanilla.js 捆包

esbuild 模式下，config.js 將所有 `type: 'js'` 取代為單一 `dist/vanilla.js`：
```js
if (window.APP_ENV && window.APP_ENV.isEsbuild) {
    var filtered = [];
    for (var i = 0; i < resources.scripts.length; i++) {
        var item = resources.scripts[i];
        if (typeof item !== 'object' || item.type !== 'js') filtered.push(item);
    }
    filtered.unshift('dist/vanilla.js');
    resources.scripts = filtered;
}
```

## 雲端同步

### 支援的服務
- **Firebase Realtime Database**（REST API，路徑式認證）
- **Upstash Redis**（REST API，Bearer token）

### 認證方式

Firebase 使用**路徑密碼**取代 `?auth=`：
```
https://<project>.firebaseio.com/<apiKey>/classKudox_backup.json
https://<project>.firebaseio.com/<apiKey>/classKudox_ver.json
```

- `cloudBinId`（設定中的 Key ID）= Firebase 基礎 URL
- `cloudApiKey`（設定中的 API Key）= 密碼路徑元件
- 資料包裝在 `{ "d": compressed }` 中，兩種服務通用

### 版本檢查優化（僅 Firebase）
- 下載前快速 GET `classKudox_ver.json` 比對版本（16-18 bytes vs 完整備份數十 KB）
- 版本相符且無待處理變更 → 提前回傳
- 版本相符但有待處理變更 → `skipDownload=true`，僅執行上傳

### 同步防覆蓋機制

Firebase 和 Upstash 使用不同方式防止同步衝突導致資料遺失。

#### Firebase（雙節點條件寫入）

```
classKudox_backup.json (資料)    classKudox_ver.json (版本)
```

上傳流程（`performCloudUpload`）：

```
Phase 1: 平行 GET backup + ver，分別記錄 ETag
         若 ver.ver ≠ localSyncVersion → 衝突，直接 abort

Phase 2: ① PUT backup (If-Match: backupETag)
         ② PUT ver (If-Match: verETag)，body: { ver: newVer }
         任一步驟 412 → abort（localSyncVersion 復原），
         CCS re-entry 自動下載最新狀態後合併重試
```

關鍵保護：
- **backup 寫入也有 If-Match**：不再是盲寫，兩台裝置同時上傳時只有第一台能通過 backup 條件寫入，第二台 412 abort → 第二台 CCS re-entry 下載第一台的 backup → 合併 → 重試上傳
- **ver 寫入 If-Match**（CAS 原本就有）：防止版本被覆蓋
- **任一步驟失敗就 abort**：不留下 backup/ver 不一致的半殘狀態
- 全新上傳（節點不存在時）不帶 If-Match，無條件寫入

#### Upstash（Lock-based CAS，單節點）

```
classKudox_backup (單一 key，資料 + ver 在同一 JSON)
```

上傳流程（`performCloudUpload`）：

```
Phase 1: GET classKudox_backup → 解析 ver
         若 ver ≠ localSyncVersion → 衝突，直接 abort

Phase 2: ① SET classKudox_lock <id> NX EX 10（取得鎖）
         ② 鎖內重讀 classKudox_backup，二次確認版本
         ③ SET classKudox_backup { d: compressed, ver: newVer }
         ④ DEL classKudox_lock（釋放鎖）
```

關鍵保護：
- `SET NX EX 10`：原子性鎖取得 + 10 秒 TTL 防止死鎖
- **鎖內二次確認版本**：防止等鎖期間雲端已被更新
- **鎖保護整段寫入**：確保只有一台裝置能寫入（`NX`），其他裝置等候

#### 衝突後的復原鏈

兩者共用同一套 CCS re-entry 機制：

```
upload fail (412/lock fail)
  → isSyncing = false
  → checkCloudSyncState (_syncDepth +1, max 2 層)
    → 下載最新 backup
    → 合併（restoreFromBackup + 重播 ops）
    → 重新上傳
```

### 核心函數

| 函數 | 位置 | 用途 |
|---|---|---|
| `performCloudUpload(manual)` | sync.js:107 | 上傳，`manual=true` 時顯示 alert |
| `performCloudDownload(manual)` | sync.js:145 | 下載 |
| `checkCloudSyncState()` | sync.js:210 | 智慧同步含版本檢查 |
| `getCloudProvider()` | sync.js:86 | 回傳 `'firebase'`、`'upstash'` 或 `null` |
| `getCloudRequest(method)` | sync.js:91 | 建構 API 請求 URL + headers |
| `restoreFromBackup(data, reload)` | sync.js:49 | 還原資料，可選重整頁面 |

### 版本檢查邏輯
```
版本相符 + 無待處理變更 → 提前回傳（不下載不上傳）
版本相符 + 有待處理變更 → skipDownload=true，執行上傳
版本不符 → 完整下載 + 正常流程
```

### 同步狀態（dirty 0-4）

| 值 | 狀態 | 徽章文字 |
|---|---|---|
| 0 | 乾淨 | 本機儲存 |
| 1 | 等待 | 等待同步 |
| 2 | 錯誤 | 同步錯誤 |
| 3 | 成功 | 同步完成 |
| 4 | 同步中 | 正在同步 |

### 智慧同步計時器
- 頻率設為「無」時（`autoSyncInterval ≤ 0`）完全停用
- 否則：智慧計時 + 固定間隔計時 + 1.5 秒初始檢查
- 間隔：<10m→120s, <30m→300s, <60m→600s, <180m→1800s, ≥180m→3600s

## 元件模式

### Modal 堆疊順序
```js
['addStudent','manageGroup','groupDetail','manageClasses','reports','settings','studentProfile','classSummary','summaryDetail','editStudent','avatarPicker','editPointItem','iconPicker']
```

### Z-index 階層
- studentProfile, classSummary: 2200
- summaryDetail: 2250
- manageGroup, editStudent: 2300
- avatarPicker: 2400
- editPointItem: 2500
- iconPicker: 3000

### Modal 開啟/關閉（React + Vanilla 橋接）
- `window.openModal(el)` → `_setReactModal(name, true)` + 移除 `hidden` class
- `window.closeModal(el)` → `_setReactModal(name, false)` + 加上 `hidden` class
- `MODAL_ID_MAP` in script.js 建立 DOM ID 到 React modal 名稱的對應
- Vanilla 的 `ui.js` `openModal`/`closeModal` 在有 React 版本時自動委派

### 群組卡片流程
- 點卡片 → 直接開啟獎勵 modal（`window.openAwardModal(g.sIds, g.id, g.id)`）
- ⚙️ 編輯 → `window.openManageGroupModal(g.id)`
- 獎勵 modal 中的 ✏️ → `window.openManageGroupModal(awardContext.groupId)`
- 編輯群組後，`window.awardContextIds` 和 React `awardContext.ids` 兩者都必須更新

## 資料變更橋接模式

資料變更邏輯在 Vanilla（`actions.js`）。React 元件透過 `window.*` 橋接呼叫：

### 讀取 → React Context
```js
// context.js refresh()
groups: safeArray(window.groups),
students: safeArray(window.students),
```

### 寫入 → Vanilla
```js
// React 元件
window.addLog(id, label, pt, ignoreRanking);
window.saveData();
window.renderStudents();
window.renderGroups();  // → refreshProxy → _refreshReact
```

### 特定橋接函數
- `window.openAwardModal(ids, title, groupId)` — 設定 `awardContextIds` + 呼叫 `_openReactAwardModal`
- `window.openManageGroupModal(groupId)` — 設定 `editingGroupId` + 呼叫 `_openReactManageGroupModal`
- `window.saveGroup(name, sids, editingGroupId)` — 更新 `window.groups` 陣列
- `window.toggleGroupSelection(id)` — 多選切換
- `window.processGift(fromId, amount, targets, ...)` — 贈與點數
- `window.updateStudentAvatar(...)` — 更新頭像
- `window.addCustomItem(name)` — 自訂獎勵項目
- `window.saveCustomPref(label, { sign, ign })` — 自訂獎勵偏好（不儲存 `val`）

## 已知錯誤模式與解法

1. **`DOMException: removeChild` 還原時**：將 `refreshProxy()` 包在 `setTimeout(() => ..., 0)` 中，讓 React reconciliation 延遲到當前執行上下文之後（sync.js:79）

2. **版本檢查跳過上傳**：僅在版本相符且無待處理變更時提前回傳。否則設 `skipDownload=true` 但繼續上傳流程

3. **`cloudData` 未定義**：宣告在函數層級，不要在 `if (resp.ok)` 區塊內

4. **Modal 可見性競爭**：`window.openModal`/`closeModal` 在呼叫 `_setReactModal` 前立即新增/移除 `hidden` class

5. **編輯群組後獎勵名單未更新**：當 manageGroup 關閉且 studentProfile 仍開啟時，同時更新 `window.awardContextIds = [...g.sIds]` 和 React 的 `awardContext.ids`

6. **React Header 覆蓋 Vanilla 同步徽章**：Header 讀取 `cloudStatus.dirty`，透過 `window.isDirty` getter + `window._refreshReact()` 觸發重繪

7. **`isDirty` 頁面載入未還原**：在 state.js 初始化時從 localStorage `drty` 讀取

8. **自訂獎勵偏好**：只存 `{ sign, ign }` — 不存 `val`，每次使用後清除點數值

## 群組成員徽章的版面

在獎勵 modal 中顯示群組成員時，使用 `flexWrap: 'wrap'`、無頭像、純 ID 文字，`#e8f0fe` 背景、`1rem` 字體、`fontWeight: 500`。

## 時間戳系統（StampTool）

Base62 編碼（0-9 A-Z a-z），7 位元可容納 62^7 ≈ 3.5 兆個唯一值，精度 100ms。字串可直接用 `localeCompare` 排序，無須解碼。

```js
StampTool.encode(Date.now())   // → "0UabcX"
StampTool.decode("0UabcX")     // → Date object
```

## 全局 Log 系統（L / LE）

定義在 `../loader_engine.js`（最早執行的腳本），所有後續模組均可直接用 `L(...)` / `LE(...)`。

### 行為

- `L(...)` = 記錄到 `window._LOGS` + `console.log`（含時間戳）
- `LE(...)` = 記錄到 `window._LOGS` + `console.error`（含時間戳）
- 容量上限 1000 筆，超出時自動 shift 最舊
- Log Viewer overlay 掛在 `counter.js` 的 👁️ 上，點擊開啟全螢幕 log 面板

### 載入順序

```
loader_engine.js  (定義 window.L / window.LE / window._LOGS / window._loadPako)
  └→ config.js
  └→ counter.js   (Log Viewer overlay + 頁尾計數器)
  └→ plugins.js   (內部 const L = window.L)
  └→ loadapp.js   (內部 const L = window.L, LE = window.LE)
       └→ vanilla.js  (init-ui 用 L(), state.js 用 const L = window.L)
       └→ script.js   (用 L() / LE() + 版本號 styled console.log)
```

### 寫入規範

- **來源檔全部用 `L()` / `LE()` 取代原來的 `console.log` / `console.error`**（F12 與 Log Viewer 一致）
- 唯一例外：版本號 badge（保留 `%c` 樣式同時手動 push `_LOGS`）
- `plugins.js` / `loadapp.js` 為獨立 IIFE，內部宣告 `const L = window.L` 後使用
- `state.js` 做 `const L = window.L; const LE = window.LE;` 供整個 bundle 使用
- 不需要 `window.L = window.L || ...` fallback，因為 `loader_engine.js` 保證最早執行

## 壓縮系統（壓縮失敗動態載入 pako）

`compressJSON` / `decompressJSON` / `decompressBinary` 採用三級降級，定義在 `utils.js`。

### 降級流程

```
try CompressionStream / DecompressionStream (原生)
  ├─ success → 回傳 base64 / obj
  └─ 失敗 → console.warn 原因
            → window._loadPako() (定義在 loader_engine.js)
              ├─ CDN pako.min.js → 成功 → pako 壓縮
              └─ CDN 失敗 → ../libs/pako.min.js (本地備份)
                            ├─ 成功 → pako 壓縮
                            └─ 失敗 → return null
```

### 設計原則

- **原生優先**：不預載 pako，只在瀏覽器不支援或執行拋錯時才動態載入
- **雙重備援**：CDN 失敗後自動降級到專案目錄的 `libs/pako.min.js`
- **一次載入永久有效**：載入後 `typeof pako !== 'undefined'` 全域可用
- **plugins.js 獨立判定**：若瀏覽器完全不支援 `DecompressionStream`，`plugins.js` 的 condition 會提前載入 pako，與動態降級不衝突

### `_loadPako()` 定義位置

`../loader_engine.js`（最早腳本），所有專案共用：

```js
window._loadPako = () => {
    if (typeof pako !== 'undefined') return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js';
        s.onload = resolve;
        s.onerror = () => {
            const isRoot = typeof APP_ROOT !== 'undefined' && APP_ROOT === 1;
            const prefix = isRoot ? 'libs/' : '../libs/';
            const fb = document.createElement('script');
            fb.src = prefix + 'pako.min.js';
            fb.async = false;
            fb.onload = resolve;
            fb.onerror = () => reject(new Error('pako 載入失敗（CDN + 本地均無法讀取）'));
            document.head.appendChild(fb);
        };
        document.head.appendChild(s);
    });
};
```

## 相關檔案


| 屬性 | 值 |
|---|---|
| 定義位置 | `utils.js:23` `StampTool` |
| 字元集 | `0-9, A-Z, a-z`（62 字元） |
| 紀元（EPOCH） | `1735689600000`（2025-01-01 UTC） |
| 解析度 | **100ms**（`(time - EPOCH) / 100`） |
| 輸出長度 | 6 字元，零補齊（`"000000"` ~ `"1X7H3Q"`） |
| 輔助函數 | `getTS(ts)` → 一律回傳毫秒數（接受 number 或 string） |

### Base62 字串可直接排序

因為高位元先編碼（Big-endian），兩個 Base62 時間戳可直接用字串比對排序，**無須解碼**：

```js
// 順序成立
"000001" < "000002" < "00000A" < "00000a" < "000010"
```

```js
// 實際應用 — 直接字串排序 logs
logs.sort((a, b) => b.TS.localeCompare(a.TS));  // DESC
logs.sort((a, b) => a.TS.localeCompare(b.TS));  // ASC
```

### 效能對比

| 方式 | 耗時 |
|---|---|
| `getTS(b.TS) - getTS(a.TS)` | ~1μs（解碼 + 數字相減） |
| `b.TS.localeCompare(a.TS)` | ~0.05μs（純字串比對） |

當 logs 陣列達到數千筆時，直接字串排序可省 20x 時間。目前 `Reports.js` 使用 `getTS()` 解碼排序而非字串排序，是保留的改進空間。

## 檔案對照表

| 檔案 | 角色 |
|---|---|
| `utils.js` | JS 輔助函數（sortItems, compressJSON 等） |
| `state.js` | 全域狀態變數、`Object.defineProperty` 橋接、`setDirty()` |
| `sync.js` | 雲端同步引擎（Firebase REST + Upstash） |
| `actions.js` | 資料變更橋接、Vanilla 邏輯 |
| `ui.js` | Vanilla UI 函數（可委派時委派給 React） |
| `context.js` | React Context + Provider、`setModal`、`refresh()` |
| `components/Modals.js` | 所有 modal JSX |
| `components/GroupGrid.js` | 群組卡片網格（點擊直接開啟獎勵 modal） |
| `components/Header.js` | 同步徽章（5 種狀態） |
| `components/Settings.js` | 顯示/雲端/自訂分頁 |
| `components/Reports.js` | 排名報表 |
| `script.js` | 事件綁定、`startApp()`、`refreshProxy`、`closeModal` |
| `config.js` | 資源清單供 loader_engine 使用 |
| `../loader_engine.js` | 啟動載入器、三模式分派 |
| `../loadapp.js` | 檔案注入、dist/ 前綴邏輯 |
| `../plugins.js` | 外部套件載入引擎，管理 React、Babel、pako 等 CDN 資源，自動判斷環境支援度 |
| `build.bat` | esbuild 編譯腳本 |
| `index.html` | 進入點、`APP_JSX` + `APP_VER` + 載入畫面 |
