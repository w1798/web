---
name: git-auto-commit
description: Automatically git commit after every code modification in projects under D:\dl\src. Use this skill when modifying code to ensure git backup.
---

# Git 自動備份

## 環境設定
- Git 路徑：`D:\portable\Git\bin\git.exe`
- 已 git 初始化的專案：
  - `D:\dl\src\Sanguo-TD`
  - `D:\dl\src\ClassKudox`

## 規則
每次完成程式修改（包括新增、編輯、刪除檔案）後，根據修改的專案路徑執行對應的 commit：

```powershell
Set-Location -LiteralPath "D:\dl\src\【專案資料夾】"; & "D:\portable\Git\bin\git.exe" add .; & "D:\portable\Git\bin\git.exe" commit -m "描述此次修改重點"
```

### 注意事項
1. 先確認語法檢查通過後再 commit
2. commit message 必須用繁體中文，簡潔描述修改內容
3. 多個不相關的修改應分次 commit
4. 若 commit 失敗（如 hooks 拒絕），應解決問題再重新 commit
5. 同時修改多個專案時，每個專案分別 commit
6. 遇到尚未 git init 的專案，先執行 `git init` 再加入規則
