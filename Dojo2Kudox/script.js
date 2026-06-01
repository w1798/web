/**
 * Dojo2Kudox - Parsing and Transformation logic
 */


// 負責載入多個外部套件的函式
function initLibraries() {
    const libraries = [
        {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js',
            // 只有這項需要特殊條件，其餘沒寫的都會是 undefined (後面會補預設值)
            condition: typeof DecompressionStream === 'undefined'
        }
    ];

    libraries.forEach(lib => {
        // 1. 自動從 URL 提取檔名
        const fileName = new URL(lib.url).pathname.split('/').pop();

        // 2. 處理 shouldLoad 邏輯：
        // 如果 lib.condition 有定義，就用它的結果；如果沒定義(undefined)，則預設為 true
        const shouldLoad = (lib.condition !== undefined) ? lib.condition : true;

        if (!shouldLoad) {
            console.log(`%c[跳過] 環境支援原生功能，不載入: ${fileName}`, 'color: #9E9E9E;');
            return;
        }

        const script = document.createElement('script');
        script.src = lib.url;
        script.async = false;

        script.onload = function() {
            console.log(`%c[成功] 外部庫已載入: ${fileName}`, 'color: #4CAF50; font-weight: bold;');
        };

        script.onerror = function() {
            const fallbackPath = `libs/${fileName}`;
            console.warn(`[失敗] 載入失敗，嘗試本地備援: ${fallbackPath}`);
            
            const fallbackScript = document.createElement('script');
            fallbackScript.src = fallbackPath;
            fallbackScript.onload = () => console.log(`%c[備援成功] 已從本地載入: ${fileName}`, 'color: #FF9800; font-weight: bold;');
            fallbackScript.onerror = () => console.error(`[重大錯誤] 本地檔案不存在: ${fallbackPath}`);

            document.head.appendChild(fallbackScript);
        };

        document.head.appendChild(script);
    });
}

// 啟動
initLibraries();

function getIconForSkill(name) {
    name = name.toLowerCase();
    
    // 客製化比對詞語給予適合的 emoji
    if (name.includes('重置')) return '🔄';
    if (name.includes('獎勵') || name.includes('換獎')) return '🎁';
    if (name.includes('專心') || name.includes('認真')) return '🎯';
    if (name.includes('參與') || name.includes('發言')) return '🙋';
    if (name.includes('幫助') || name.includes('助人') || name.includes('合作')) return '🤝';
    if (name.includes('努力') || name.includes('積極')) return '💪';
    if (name.includes('作業') || name.includes('功課') || name.includes('筆記')) return '📝';
    if (name.includes('進步')) return '📈';
    if (name.includes('閱讀') || name.includes('讀書')) return '📚';
    if (name.includes('安靜')) return '🤫';
    
    // 負面
    if (name.includes('不專心') || name.includes('分心')) return '📵';
    if (name.includes('講話') || name.includes('吵鬧') || name.includes('聊天')) return '🗣️';
    if (name.includes('帶') && name.includes('未')) return '🤷';
    if (name.includes('遲到') || name.includes('時間')) return '⏰';
    if (name.includes('打斷')) return '🛑';
    if (name.includes('不合群') || name.includes('搗亂')) return '🌪️';
    if (name.includes('功課沒交') || name.includes('未交')) return '❌';
    
    // 預設加分扣分圖示
    if (name.includes('-') || name.includes('扣')) return '⚠️';
    return '🌟';
}

function parseStudents(text) {
    if (!text.trim()) return [];
    
    let startIdx = text.indexOf("全班");
    let endIdx = text.indexOf("添加学生");
    
    let content = text;
    if (startIdx !== -1) {
        if (endIdx !== -1) content = text.substring(startIdx + "全班".length, endIdx);
        else content = text.substring(startIdx + "全班".length);
    }
    
    let lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    
    if (lines.length > 0 && !isNaN(lines[0]) && isNaN(lines[1])) {
        // 第一行可能是班級總分，若是純數字則濾掉
        lines.shift();
    }
    
    let students = [];
    for (let i = 0; i < lines.length; i++) {
        let current = lines[i];
        let next = lines[i+1];
        
        // 如果 current 包含文字，而 next 是一個數字，視為一對
        // 需要注意：ClassDojo 的點數可能是負數，但在 parseInt 下都能過
        if (isNaN(current) && !isNaN(next) && next !== undefined) {
            students.push({
                id: current,
                aS: "fe", // 預設使用 fun-emoji 頭像
                cP: parseInt(next, 10),
                iP: 0
            });
            i++; // 跳過點數
        } else if (isNaN(current)) {
            // 如果只有名字沒有點數，預設 0
            students.push({
                id: current,
                aS: "fe",
                cP: 0,
                iP: 0
            });
        }
    }
    return students;
}

function parseSkills(text, isPositive) {
    if (!text.trim()) return [];
    
    let startIdx = text.indexOf("有待改进");
    let endIdx = text.indexOf("添加技能");
    
    let content = text;
    if (startIdx !== -1) {
        if (endIdx !== -1) content = text.substring(startIdx + "有待改进".length, endIdx);
        else content = text.substring(startIdx + "有待改进".length);
    }
    
    let lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    
    let skills = [];
    let idCounter = 1;
    for (let i = 0; i < lines.length; i++) {
        let current = lines[i];
        let next = lines[i+1];
        
        // 避開如果使用者整包連選單 "积极向上", "有待改进" 複製進來的情況
        if (current === "积极向上" || current === "有待改进") continue;
        
        if (isNaN(current) && !isNaN(next) && next !== undefined) {
            skills.push({
                id: (isPositive ? 'pos_' : 'neg_') + idCounter++,
                lb: current,
                vl: parseInt(next, 10),
                ic: getIconForSkill(current)
            });
            i++; 
        } else if (isNaN(current)) {
            skills.push({
                id: (isPositive ? 'pos_' : 'neg_') + idCounter++,
                lb: current,
                vl: isPositive ? 1 : -1,
                ic: getIconForSkill(current)
            });
        }
    }
    return skills;
}

document.getElementById('convertBtn').addEventListener('click', () => {
    let className = document.getElementById('className').value.trim() || '匯入班級';
    let studentsText = document.getElementById('studentsData').value;
    let posText = document.getElementById('posSkillsData').value;
    let negText = document.getElementById('negSkillsData').value;
    
    let statusMsg = document.getElementById('statusMsg');
    
    try {
        let students = parseStudents(studentsText);
        let posSkills = parseSkills(posText, true);
        let negSkills = parseSkills(negText, false);
        
        if (students.length === 0) {
            statusMsg.className = 'status error';
            statusMsg.textContent = '未解析到任何學生資料，請確認輸入的資料格式。';
            return;
        }

        // 建立符合 ClassKudox 匯入格式的物件
        let backupData = {};
        
        backupData[`CD_${className}_set`] = {
            ftS: 16, col: 10, gCol: 5, iCol: 5, itmS: 0,
            eS: 0, sCH: 0, gCH: 0, lRet: 0, avS: 0,
            sAv: 1, sTR: 1, cGV: 25, cGH: 25, iGV: 15, iGH: 15
        };
        backupData['CD_SysOps'] = [];
        backupData[`CD_${className}_itm`] = {
            pos: posSkills,
            neg: negSkills
        };
        backupData['CD_Cls'] = [{ "id": className }];
        backupData['CD_cCId'] = className;
        backupData[`CD_${className}_cItm`] = [];
        backupData[`CD_${className}_Stus`] = students;
        backupData[`CD_${className}_tDef`] = [];
        backupData['aSyn'] = 0;
        backupData['drty'] = 0;
        backupData[`CD_${className}_Ls`] = [];
        backupData[`CD_${className}_Gs`] = [];
        backupData['sVer'] = "000000";
        
        // 透過 pako 進行 gzip 壓縮 JSON
        let jsonString = JSON.stringify(backupData);
        let compressed = pako.gzip(jsonString);
        
        let blob = new Blob([compressed], { type: 'application/gzip' });
        let url = URL.createObjectURL(blob);
        
        let a = document.createElement('a');
        a.href = url;
        a.download = `ClassKudox_Import_${className.replace(/\s+/g, '_')}.json.gz`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        statusMsg.className = 'status success';
        statusMsg.textContent = `轉換成功！共解析出 ${students.length} 位學生、${posSkills.length} 個加分項、${negSkills.length} 個扣分項，並已開始下載匯入檔。`;
        
    } catch (e) {
        statusMsg.className = 'status error';
        statusMsg.textContent = '轉換失敗：' + e.message;
        console.error(e);
    }
});
