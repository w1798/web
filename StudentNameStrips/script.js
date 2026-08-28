// StudentNameStrips - 學生手冊名條產生器 (vanilla, 邏輯層)
(function () {
  'use strict';

  function start() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const resultDiv = document.getElementById('result');
  let selectedFile = null;

  // ---- UI 事件綁定 ----
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xls' && ext !== 'xlsx') { showResult('error', '僅支援 .xls 或 .xlsx 格式的檔案'); return; }
    selectedFile = file;
    dropZone.querySelector('p').textContent = file.name;
    dropZone.querySelector('.icon').textContent = '✅';
    uploadBtn.disabled = false;
  }

  uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    uploadBtn.disabled = true;
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      let headerIdx = -1;
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] && raw[i].some(h => String(h || '').includes('座號'))) { headerIdx = i; break; }
      }
      if (headerIdx === -1) { showResult('error', '找不到欄位標題列'); uploadBtn.disabled = false; return; }

      const headers = raw[headerIdx].map(h => String(h || '').trim());
      const seatNoIdx = headers.indexOf('座號');
      const nameIdx = headers.indexOf('姓名');
      const genderIdx = headers.indexOf('性別');
      const birthIdx = headers.indexOf('出生日期');

      const students = [];
      for (let i = headerIdx + 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.length === 0) continue;
        const seatNo = seatNoIdx >= 0 ? String(row[seatNoIdx] || '').trim() : '';
        const name = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';
        const gender = genderIdx >= 0 ? String(row[genderIdx] || '').trim() : '';
        const birth = birthIdx >= 0 ? String(row[birthIdx] || '').trim() : '';
        if (!seatNo && !name) continue;
        students.push({ seatNo, name, gender, birth });
      }

      if (students.length === 0) { showResult('error', '未找到有效的學生資料'); uploadBtn.disabled = false; return; }

      const docxBlob = await generateDocx(students);
      const url = URL.createObjectURL(docxBlob);
      const docxBlob2 = await generateDocx2(students);
      const url2 = URL.createObjectURL(docxBlob2);

      let table = '<div class="student-preview"><table><thead><tr><th>座號</th><th>姓名</th><th>性別</th><th>出生日期</th></tr></thead><tbody>';
      students.slice(0, 10).forEach(s => { table += `<tr><td>${s.seatNo}</td><td>${s.name}</td><td>${s.gender}</td><td>${s.birth}</td></tr>`; });
      if (students.length > 10) table += `<tr><td colspan="4">... 共 ${students.length} 筆</td></tr>`;
      table += '</tbody></table></div>';

      showResult('success', `<strong>產生成功！</strong>共 ${students.length} 筆。<a href="${url}" download="手冊名條.docx">下載 手冊名條.docx</a> <a href="${url2}" download="大名條.docx">下載 大名條.docx</a>` + table);
    } catch (err) {
      showResult('error', '處理失敗: ' + err.message);
    } finally {
      uploadBtn.disabled = false;
    }
  });

  function showResult(type, html) {
    resultDiv.className = 'result ' + type;
    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 載入 docx 範本：優先 fetch 外置 template.docx，file:// 時回退 base64
  async function loadTemplate() {
    try {
      const resp = await fetch('template.docx');
      if (resp.ok) return new Uint8Array(await resp.arrayBuffer());
    } catch (e) { /* file:// 環境下 fetch 失敗，改用 base64 回退 */ }
    if (typeof window.TEMPLATE_B64 !== 'undefined') {
      const raw = atob(window.TEMPLATE_B64);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      return arr;
    }
    throw new Error('無法載入 docx 範本');
  }

  // 載入大名條範本：優先 fetch 外置 template2.docx，file:// 時回退 base64
  async function loadTemplate2() {
    try {
      const resp = await fetch('template2.docx');
      if (resp.ok) return new Uint8Array(await resp.arrayBuffer());
    } catch (e) { /* file:// 環境下 fetch 失敗，改用 base64 回退 */ }
    if (typeof window.TEMPLATE2_B64 !== 'undefined') {
      const raw = atob(window.TEMPLATE2_B64);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      return arr;
    }
    throw new Error('無法載入大名條範本');
  }

  async function generateDocx(students) {
    const arr = await loadTemplate();
    const zip = await JSZip.loadAsync(arr);
    let docXml = await zip.file('word/document.xml').async('string');

    const rowField = ['seatNo', 'name', 'gender', 'seatNo', 'name', 'gender', 'seatNo', 'name', 'gender', 'birth'];

    let rowIdx = 0;
    docXml = docXml.replace(/<w:tr ([^>]*)>([\s\S]*?)<\/w:tr>/g, (fullMatch, attrs, rowContent) => {
      const field = rowField[rowIdx++];
      let cellIdx = 0;

      const newRow = rowContent.replace(/<w:tc>([\s\S]*?)<\/w:tc>/g, (cellMatch, cellContent) => {
        const val = (cellIdx < students.length) ? esc(students[cellIdx][field]) : '';
        cellIdx++;

        if (/<w:t[ >]/.test(cellContent)) {
          cellContent = cellContent.replace(/<w:t(?: [^>]*)?>[\s\S]*?<\/w:t>/, '<w:t>' + val + '</w:t>');
        } else {
          const isBirth = (field === 'birth');
          const fontName = isBirth ? 'Times New Roman' : '標楷體';
          const szVal = isBirth ? '24' : '32';
          const rPr = '<w:rPr><w:rFonts w:ascii="' + fontName + '" w:eastAsia="' + fontName + '" w:hAnsi="' + fontName + '"/><w:kern w:val="2"/><w:sz w:val="' + szVal + '"/><w:szCs w:val="' + szVal + '"/></w:rPr>';
          cellContent = cellContent.replace(/<\/w:p>([\s\S]*)$/, '<w:r>' + rPr + '<w:t>' + val + '</w:t></w:r></w:p>$1');
        }
        return '<w:tc>' + cellContent + '</w:tc>';
      });

      return '<w:tr ' + attrs + '>' + newRow + '</w:tr>';
    });

    zip.file('word/document.xml', docXml);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  // 產生大名條 docx：依 template2.docx 的表格結構分開套印
  // template2.docx = 4 個獨立表格，每個表格 1 列 8 格，用段落分隔符連接
  async function generateDocx2(students) {
    const arr = await loadTemplate2();
    const zip = await JSZip.loadAsync(arr);
    let docXml = await zip.file('word/document.xml').async('string');

    // 提取所有獨立表格（<w:tbl>...</w:tbl>）與段落分隔符
    const tblRegex = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
    const origTables = [];
    let tm;
    while ((tm = tblRegex.exec(docXml)) !== null) {
      origTables.push(tm[0]);
    }
    // 段落分隔符（表格之間的 <w:p>...</w:p>）
    const tbl1End = docXml.indexOf('</w:tbl>') + '</w:tbl>'.length;
    const tbl2Start = docXml.indexOf('<w:tbl>', tbl1End);
    const paraSep = (tbl2Start > tbl1End) ? docXml.substring(tbl1End, tbl2Start) : '';
    const beforeTables = docXml.substring(0, docXml.indexOf('<w:tbl>'));
    const afterTables = docXml.substring(docXml.lastIndexOf('</w:tbl>') + '</w:tbl>'.length);

    // 所有學生姓名扁平化（座號直接接姓名，無空格）
    const names = students.map(s => esc(s.seatNo) + esc(s.name));
    const totalCells = names.length;
    const cellsPerRow = 8;

    // 將列內容拆成獨立 cell 陣列（保留每個 cell 的完整 XML）
    function splitCells(rowContent) {
      const cells = [];
      const cellRegex = /<w:tc>([\s\S]*?)<\/w:tc>/g;
      let cm;
      while ((cm = cellRegex.exec(rowContent)) !== null) {
        cells.push(cm[0]); // 保留完整 <w:tc>...</w:tc>
      }
      return cells;
    }

    // 替換 cell 內的 <w:t> 文字，保留所有格式屬性；若無 <w:t> 則插入新 run
    function replaceCellText(cellXml, val) {
      if (/<w:t[ >]/.test(cellXml)) {
        return cellXml.replace(/<w:t(?: [^>]*)?>[\s\S]*?<\/w:t>/, '<w:t>' + val + '</w:t>');
      }
      const pPrMatch = cellXml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
      const rPrMatch = pPrMatch ? pPrMatch[1].match(/<w:rPr>([\s\S]*?)<\/w:rPr>/) : null;
      const rPr = rPrMatch ? '<w:rPr>' + rPrMatch[1] + '</w:rPr>' : '<w:rPr><w:rFonts w:ascii="標楷體" w:eastAsia="標楷體" w:hAnsi="標楷體"/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr>';
      return cellXml.replace(/<\/w:p>/, '<w:r>' + rPr + '<w:t>' + val + '</w:t></w:r></w:p>');
    }

    // 填滿一個表格（1 列 8 格），回傳填好的表格 XML
    function fillTable(tblXml, startIdx) {
      const rowMatch = tblXml.match(/<w:tr ([^>]*)>([\s\S]*?)<\/w:tr>/);
      if (!rowMatch) return tblXml;
      const rowAttrs = rowMatch[1];
      const rowContent = rowMatch[2];
      const origCells = splitCells(rowContent);
      let newCells = '';
      for (let c = 0; c < cellsPerRow; c++) {
        const val = (startIdx + c < totalCells) ? names[startIdx + c] : '';
        if (c < origCells.length) {
          newCells += replaceCellText(origCells[c], val);
        } else {
          newCells += replaceCellText(origCells[origCells.length - 1], val);
        }
      }
      const newRow = '<w:tr ' + rowAttrs + '>' + rowContent.substring(0, rowContent.indexOf('<w:tc>')) + newCells + '</w:tr>';
      return tblXml.replace(/<w:tr [^>]*>[\s\S]*?<\/w:tr>/, newRow);
    }

    // 依序填滿每個表格，超過 32 人時複製整組表格結構接著套印
    let newXml = beforeTables;
    let nameIdx = 0;
    let groupIdx = 0;
    while (nameIdx < totalCells) {
      // 一組 = 4 個表格（每表格 8 格 = 32 格）
      for (let t = 0; t < origTables.length && nameIdx < totalCells; t++) {
        const filledTbl = fillTable(origTables[t], nameIdx);
        nameIdx += cellsPerRow;
        if (groupIdx > 0 || t > 0) newXml += paraSep;
        newXml += filledTbl;
      }
      groupIdx++;
    }

    newXml += afterTables;

    zip.file('word/document.xml', newXml);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
