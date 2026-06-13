---
name: project-conventions
description: Use when working on file structure, component creation, React/JSX, build system, loader_engine config, UI/UX patterns, data fetching, or cloud sync features in the project.
---

# Project Conventions

## 檔案規範
- 標準三檔式 (index/script/style)。
- 程式碼 > 500 行須依「單一職責」拆分。

## 載入與渲染模式
- 強制使用 `../loader_engine.js?ver=...`。
- 透過 `<head>` 定義 `APP_VER` 與 `APP_JSX` 控制模式：
  - `'vanilla'` (或未定義)：純 JS 模式，無 React 依賴。
  - `'babel'`：舊程式轉 React 模式，即時載入 Babel 轉換 JSX。
  - `'es'` 或 `'esbuild'`：React 標準模式，載入 `dist/` 打包產物。
- **config.js 範例**：
  - **純 JS (Vanilla)**：`scripts: ["logic.js", "script.js"]`
  - **React (Babel/Esbuild)**：
    ```javascript
    scripts: [
        { url: "logic.js", type: "js" }, // 強制純 JS，避免被 Babel 誤轉
        "script.js"                      // 自動視為介面層 (JSX)
    ]
    ```

## 架構金律
- 嚴格執行「邏輯與畫面分離」與「源碼/產物分離」。
- **邏輯層**：純 JS 處理數據、API，與 UI 完全解耦。
- **介面層**：React (JSX) 處理呈現，透過 Context API 溝通。
- **編譯產出**：具備 `build.bat`。`ESBUILD` 變數應優先偵測 `PATH`，fallback 再指向 `D:\portable\esbuild.exe`。
- **esbuild 參數**：`--minify`、`--charset=utf8`、`--jsx=transform`、`--loader:.js=jsx`，**禁用** `--bundle` 以保持目錄對應。

## 通用 UI/UX
- 內容超過 200px 自動顯示「↑」回頂按鈕。
- 支援非 HTTPS 環境的 `execCommand('copy')` 備援。

## 雲端資料與壓縮傳輸
- 壓縮字串應包裝為物件格式：`{"v": 1, "d": "壓縮字串"}`（`v` 為版本號，預設 1）。確保擴充性並防範解析錯誤。
