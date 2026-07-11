# 專案通用規則

這些規則在每次對話中自動生效。

## 環境與語言
- 全繁體中文回應。
- 工作區限於 `d:\dl\src`。
- 手動測試（不開瀏覽器工具）。

## 程式開發禁令
- 禁止使用 `document.write()`。

## 資料健全與向後相容
- 讀取資料必須由「預設範本」初始化再行合併。
- **合併深度**：建議使用 `structuredClone` 搭配 `Object.assign` 或深度合併邏輯，避免嵌套物件被覆蓋。
- 確保應用程式升級新增欄位時，舊資料備份依然能安全讀取不崩潰。

## 標準化重置機制
- 系統重置功能必須能將 appData 恢復至初始預設值並刷新內容。
- 務必使用 `localStorage.removeItem('[Key的名稱]')` 來精確清除特定資料，嚴禁清空整個 localStorage 以免影響並存的其他工具。

## Git 自動備份
- 以下路徑已有 git 初始化的專案，每次修改後必須自動 commit：
  - `D:\dl\src\Sanguo-TD`
  - `D:\dl\src\ClassKudox`
- 若未來有其他 `D:\dl\src/` 下的專案未列在此處，應先 `git init` 再加入此規則
- 指令範本（替換 `[專案路徑]`）：
  ```powershell
  Set-Location -LiteralPath "D:\dl\src\[專案資料夾]"; & "D:\portable\Git\bin\git.exe" add .; & "D:\portable\Git\bin\git.exe" commit -m "簡述修改"
  ```
- 先用語法檢查確認無誤再 commit
- commit message 用繁體中文，簡潔描述
- 遇到尚未 git init 的專案，先執行 `git init` 再首次 commit
