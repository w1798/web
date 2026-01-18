// 全域狀態初始化
config = JSON.parse(localStorage.getItem('eval_v6_config')) || { ...defaultConfig };
studentStates = JSON.parse(localStorage.getItem('eval_v6_states')) || {}; 
activeStudent = null;
secondaryColors = [];

function init() {
    // 初始化下拉選單
    const gSelect = document.getElementById('gradeSet');
    for(let i=1; i<=12; i++) gSelect.add(new Option(i + '年級', i));
    const wSelect = document.getElementById('wordCountSet');
    [50, 100, 150, 200, 250, 300].forEach(v => wSelect.add(new Option(v + '字', v)));
    const tSelect = document.getElementById('themeSelect');
    themes.forEach((t, i) => tSelect.add(new Option(t.name, i)));
    const gcSelect = document.getElementById('gridCountSet');
    for(let i=3; i<=10; i++) gcSelect.add(new Option(i + '位', i));
    const tcSelect = document.getElementById('traitColSet');
    for(let i=1; i<=6; i++) tcSelect.add(new Option(i + '組', i));

    const fsSelect = document.getElementById('fontSizeSet');
    fsSelect.innerHTML = '';
    [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0].forEach(v => {
        const opt = new Option(v + 'x', String(v.toFixed(1))); 
        fsSelect.add(opt);
    });

    const sfsSelect = document.getElementById('studentFontSizeSet');
    [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0].forEach(v => {
        sfsSelect.add(new Option(v + 'x', String(v.toFixed(1))));
    });

    // 載入設定並初始化介面
    loadConfigToUI();
    applyTheme(config.themeIdx);
    applyFontSize(config.fontSize || "1.4", config.studentFontSize || "1.2");
    renderStudentGrid();
    
    // 綁定捲動事件
    window.onscroll = function() {
        const btn = document.getElementById("backToTop");
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            btn.style.display = "block";
        } else {
            btn.style.display = "none";
        }
    };
}

function saveSettings() {
    config.grade = document.getElementById('gradeSet').value;
    config.wordCount = document.getElementById('wordCountSet').value;
    config.students = document.getElementById('studentListSet').value;
    config.traitsRaw = document.getElementById('traitsSet').value;
    config.tones = document.getElementById('tonesSet').value;
    config.prePrompt = document.getElementById('prePromptSet').value;
    config.promptTemplate = document.getElementById('promptTemplateSet').value;
    config.gridCount = document.getElementById('gridCountSet').value;
    config.traitCols = document.getElementById('traitColSet').value;
    config.fontSize = document.getElementById('fontSizeSet').value;
    config.studentFontSize = document.getElementById('studentFontSizeSet').value;
    config.themeIdx = document.getElementById('themeSelect').value;
    config.includeCatName = document.getElementById('includeCatNameSet').checked;
    
    applyTheme(config.themeIdx);
    applyFontSize(config.fontSize, config.studentFontSize);
    saveToLocal(); renderStudentGrid(); closeSettings();
}

// 初始化應用程式
init();
