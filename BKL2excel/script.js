/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

// 負責載入多個外部套件的函式
function initLibraries() {
    const libs = [
        {
            name: 'exceljs',
            url: 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js'
        }
    ];

    libs.forEach(lib => {
        const script = document.createElement('script');
        script.src = lib.url;
        script.async = false;

        script.onerror = function() {
            // 自動從 url 提取檔名 (例如: exceljs.min.js)
            const fileName = lib.url.split('/').pop();
            const fallbackPath = `libs/${fileName}`;

            console.warn(`${lib.name} 外部載入失敗，嘗試從本地載入: ${fallbackPath}`);
            
            const fallbackScript = document.createElement('script');
            fallbackScript.src = fallbackPath;
            document.head.appendChild(fallbackScript);
        };

        document.head.appendChild(script);
    });
}

// 執行載入
initLibraries();




const STORAGE_KEY = 'books_data_list';
const CONTEXT_KEY = 'last_processed_context';
const mainArea = document.querySelector('.app-main');
const backToTopBtn = document.getElementById('backToTop');
let booksList = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let lastContext = JSON.parse(localStorage.getItem(CONTEXT_KEY)) || [];

// 初始化讀取
window.onload = renderTable;

// 捲動偵測
if (mainArea) {
    mainArea.addEventListener('scroll', () => {
        if (mainArea.scrollTop > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
}

function scrollToTop() {
    mainArea.scrollTo({ top: 0, behavior: 'smooth' });
}

async function pasteAndProcess() {
    try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) { alert("剪貼簿內沒有資料可供讀取！"); return; }
        processData(text);
    } catch (err) {
        alert("瀏覽器不允許自動讀取剪貼簿，請確定網頁有權限或環境支援");
    }
}

function resetAllData() {
    if (confirm("確定要刪除所有已儲存的書籍資料嗎？(這將清空所有紀錄)")) {
        localStorage.removeItem(STORAGE_KEY);
        booksList = [];
        renderTable();
        showStatus("資料已重置");
    }
}

function deleteRow(index) {
    if (confirm("確定要刪除這筆資料嗎？")) {
        booksList.splice(index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(booksList));
        renderTable();
        showStatus("已刪除該筆資料");
    }
}

function processData(raw) {
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l !== "");
    lastContext = lines;
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(lastContext));

    let title = null;

    // 1. 優先處理具有強特徵的標記
    const navIndex = lines.findIndex(l => l.includes("!上頁"));
    const arrowIdx = lines.findIndex(l => l === "左箭右箭");
    const authorSepIdx = lines.findIndex(l => l === "者：");
    const ticketIdx = lines.findIndex(l => l === "售票");
    const authorLineIdx = lines.findIndex(l => l.startsWith("作者：") || l.startsWith("作者:"));

    if (navIndex > 0) {
        title = lines[navIndex - 1];
    } else if (arrowIdx >= 2) {
        title = lines[arrowIdx - 2];
    } else if (authorSepIdx >= 3 && lines[authorSepIdx - 1] === "作") {
        title = lines[authorSepIdx - 3];
        if (title === "誠品獨家" && authorSepIdx >= 2) title = lines[authorSepIdx - 2];
    } else if (authorLineIdx >= 1) {
        let i = authorLineIdx - 1;
        while (i >= 0) {
            const l = lines[i];
            const isRating = l.startsWith("(") && l.endsWith(")") && /^\(\d+(\.\d+)?\)$/.test(l);
            const isVersion = l.startsWith("平裝") || l.startsWith("電子書") || l.startsWith("精裝");
            if (isVersion || l === "看相關系列" || l === "主題活動試閱" ||
                l.includes("優惠價") || l.includes("定價") || 
                l.includes("可購買版本") || isRating ||
                (l.length > 0 && !/[\u4e00-\u9fa5]/.test(l))) {
                i--;
                continue;
            }
            break;
        }
        if (i >= 0) title = lines[i];
    } else if (ticketIdx >= 0 && ticketIdx + 2 < lines.length) {
        title = lines[ticketIdx + 2];
    }

    // 2. 如果都沒有強特徵，再找關鍵字行
    if (!title) {
        const titleLine = lines.find(l => l.startsWith("書名 :") || l.startsWith("書名："));
        if (titleLine) {
            title = titleLine.replace(/^書名[\s:：]+/, "");
        } else {
            const authorLineIdx = lines.findIndex(l => l.startsWith("作者："));
            if (authorLineIdx >= 1) {
                let i = authorLineIdx - 1;
                while (i >= 0) {
                    const l = lines[i];
                    const isRating = l.startsWith("(") && l.endsWith(")") && /^\(\d+(\.\d+)?\)$/.test(l);
                    const isVersion = l.startsWith("平裝") || l.startsWith("電子書") || l.startsWith("精裝");
                    if (isVersion || l === "看相關系列" || l === "主題活動試閱" ||
                        l.includes("優惠價") || l.includes("定價") || 
                        l.includes("可購買版本") || isRating ||
                        (l.length > 0 && !/[\u4e00-\u9fa5]/.test(l))) {
                        i--;
                        continue;
                    }
                    break;
                }
                if (i >= 0) title = lines[i];
            }
        }
    }
    
    title = title || "未知書名";

    let publisher = extract(raw, /出版社：\s*([^\n<]+)/);
    if (!publisher) {
        const idx = lines.findIndex(l => l === "社：");
        if (idx >= 2 && lines[idx - 1] === "版" && lines[idx - 2] === "出") {
            publisher = lines[idx + 1];
        }
    }

    let price = extract(raw, /定價：\s*(\d+)/);
    if (!price) {
        const paperIdx = lines.findIndex(l => l === "紙本書");
        if (paperIdx >= 0 && paperIdx + 2 < lines.length) {
            price = lines[paperIdx + 2];
        } else {
            const idx = lines.findIndex(l => l === "數量");
            if (idx >= 1 && lines[idx - 1] === "回饋" && idx + 3 < lines.length) {
                price = lines[idx + 3];
            } else {
                const kingIdx = lines.findIndex(l => l.includes("金石堂金幣"));
                if (kingIdx >= 1) {
                    for (let j = 1; j <= 4; j++) {
                        if (kingIdx - j >= 0) {
                            const priceLine = lines[kingIdx - j];
                            const numMatches = priceLine.match(/(\d+)(?=元)/g);
                            if (numMatches) {
                                price = numMatches[numMatches.length - 1];
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    let author = extract(raw, /(?:作者|編者)：\s*([^\n<]+)/);
    if (!author) {
        const idx = lines.findIndex(l => l === "者：");
        if (idx >= 1 && (lines[idx - 1] === "作" || lines[idx - 1] === "編")) {
            author = lines[idx + 1];
        }
    }

    let pubDate = extract(raw, /(?:出版日期|出版年份|出版日)：\s*([^\n<]+)/);
    if (!pubDate) {
        const idx = lines.findIndex(l => l === "期：");
        if (idx >= 3 && lines[idx - 1] === "日" && lines[idx - 2] === "版" && lines[idx - 3] === "出") {
            pubDate = lines[idx + 1];
        }
    }

    let isbn = extract(raw, /(?:ISBN13\s*\/|EAN貨碼\s*\/|ISBN[：:]?)\s*([\d\-xX]{9,})/i);
    if (isbn) isbn = isbn.replace(/-/g, '');

    const clean = s => (s || "").replace(/[\s]*追蹤/g, '').trim();

    const book = {
        title: clean(title) || "未知書名",
        publisher: clean(publisher),
        unit: "本",
        count: 1,
        price: clean(price),
        author: clean(author),
        pubDate: clean(pubDate),
        isbn: clean(isbn)
    };

    if (book.isbn && booksList.some(b => b.isbn === book.isbn)) {
        alert(`已跳過！清單中已存在相同 ISBN 的書籍。\n書名：${book.title}\nISBN：${book.isbn}`);
        return;
    }

    booksList.unshift(book);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(booksList));
    
    renderTable();
    showStatus("已解析並加入清單！");
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = booksList.map((data, index) => {
        const isLatest = index === 0;
        return `
            <tr>
                <td class="title-cell" data-label="書名">
                    <div class="editable-content" contenteditable="true" onblur="updateCell(${index}, 'title', this)">${data.title}</div>
                    ${isLatest ? `<button class="assistant-btn" onclick="toggleAssistant(event)">輔助更換</button><div id="asstMenu" class="assistant-menu"></div>` : ''}
                </td>
                <td style="padding:0;" data-label="出版社"><div class="editable-content" contenteditable="true" onblur="updateCell(${index}, 'publisher', this)">${data.publisher}</div></td>
                <td style="padding:0;" data-label="單位"><div class="editable-content" contenteditable="true" onblur="updateCell(${index}, 'unit', this)">${data.unit}</div></td>
                <td style="padding:0;" data-label="數量"><div class="editable-content" contenteditable="true" onblur="updateCell(${index}, 'count', this)">${data.count}</div></td>
                <td style="padding:0;" data-label="售價"><div class="editable-content" contenteditable="true" onblur="updateCell(${index}, 'price', this)">${data.price}</div></td>
                <td style="padding:0;" data-label="著者"><div class="editable-content" contenteditable="true" onblur="updateCell(${index}, 'author', this)">${data.author}</div></td>
                <td style="padding:0;" data-label="出版日期"><div class="editable-content" contenteditable="true" onblur="updateCell(${index}, 'pubDate', this)">${data.pubDate}</div></td>
                <td style="padding:0;" data-label="ISBN"><div class="editable-content" contenteditable="true" onblur="updateCell(${index}, 'isbn', this)">${data.isbn}</div></td>
                <td data-label="操作"><button onclick="deleteRow(${index})" style="padding: 6px 12px; font-size: 13px; background: var(--danger-color); color: white; width: auto;">刪除</button></td>
            </tr>
        `;
    }).join('');
    const countBadge = document.getElementById('count');
    if (countBadge) countBadge.innerText = booksList.length;
}

function updateCell(index, key, element) {
    const newVal = element.innerText.trim();
    if (booksList[index][key] !== newVal) {
        booksList[index][key] = newVal;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(booksList));
        showStatus("已更新欄位內容");
    }
}

function toggleAssistant(event) {
    event.stopPropagation();
    const menu = document.getElementById('asstMenu');
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
        return;
    }

    const currentTitle = booksList[0].title;
    let foundIdx = lastContext.indexOf(currentTitle);
    if (foundIdx === -1) {
        // 模糊搜尋，找包含或相似的
        foundIdx = lastContext.findIndex(l => l.includes(currentTitle) || currentTitle.includes(l));
    }

    const start = Math.max(0, foundIdx - 10);
    const end = Math.min(lastContext.length, (foundIdx === -1 ? 20 : foundIdx + 11));
    
    let html = '';
    for (let i = start; i < end; i++) {
        const line = lastContext[i];
        const isCurrent = (i === foundIdx);
        html += `<div class="assistant-item ${isCurrent ? 'current' : ''}" onclick="selectTitle('${line.replace(/'/g, "\\'")}')">${line}</div>`;
    }
    
    if (!html) html = '<div class="assistant-item">尚無上下文資料，請重新貼上一次</div>';
    
    menu.innerHTML = html;
    menu.style.display = 'block';
    
    // 點擊外面關閉
    const closeMenu = () => { menu.style.display = 'none'; document.removeEventListener('click', closeMenu); };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

function selectTitle(newTitle) {
    booksList[0].title = newTitle;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(booksList));
    renderTable();
    showStatus("書名已修正");
}

function extract(text, regex) {
    const match = text.match(regex);
    return match ? match[1].trim() : "";
}

function copyAllToExcel(forceText) {
    if (booksList.length === 0) return alert("目前清單內沒有資料可複製");
    
    const output = booksList.map(data => {
        if (forceText) {
            const q = (str) => `"${str || ''}"`;
            return `${q(data.title)}\t${q(data.publisher)}\t${q(data.unit)}\t${q(data.count)}\t${q(data.price)}\t${q(data.author)}\t${q(data.pubDate)}\t${q(data.isbn)}`;
        } else {
            return `${data.title}\t${data.publisher}\t${data.unit}\t${data.count}\t${data.price}\t${data.author}\t${data.pubDate}\t${data.isbn}`;
        }
    }).join('\n');

    navigator.clipboard.writeText(output).then(() => {
        showStatus("✅ 已複製全部 " + booksList.length + " 筆資料，請至 Excel 貼上");
    });
}

async function downloadXLSX() {
    if (booksList.length === 0) return alert("目前清單內沒有資料可匯出");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('圖書清單');

    sheet.columns = [
        { header: '優先順序', key: 'idx',       width: 10 },
        { header: '書名',     key: 'title',     width: 25 },
        { header: '出版社',   key: 'publisher', width: 15 },
        { header: '單位',     key: 'unit',      width: 10 },
        { header: '數量',     key: 'count',     width: 10 },
        { header: '售價',     key: 'price',     width: 10 },
        { header: '著者',     key: 'author',    width: 15 },
        { header: '出版日期', key: 'pubDate',   width: 15 },
        { header: 'ISBN',     key: 'isbn',      width: 25 }
    ];

    booksList.forEach((data, index) => {
        sheet.addRow({
            idx: index + 1,
            title: data.title,
            publisher: data.publisher,
            unit: data.unit,
            count: data.count,
            price: data.price,
            author: data.author,
            pubDate: data.pubDate,
            isbn: data.isbn
        });
    });

    sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            if (colNumber === 9 && rowNumber > 1) {
                cell.numFmt = '@';
            }
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "圖書館圖書補充調查表.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showStatus("✅ 已下載 XLSX 檔案");
}

function showStatus(text) {
    const msg = document.getElementById('statusMsg');
    if (!msg) return;
    msg.innerText = text;
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
}


