const themes = [
    { name: "沉靜藍", bg: "#eff6ff", accent: "#1d4ed8" },
    { name: "焙茶棕", bg: "#fffaf3", accent: "#92400e" },
    { name: "雲朵白藍", bg: "#f8fafc", accent: "#64748b" },
    { name: "抹茶青草", bg: "#f7fee7", accent: "#65a30d" },
    { name: "莫蘭迪紫", bg: "#f8fafc", accent: "#818cf8" },
    { name: "鼠尾草綠", bg: "#f0fdf4", accent: "#16a34a" },
    { name: "灰湖綠", bg: "#f0f9ff", accent: "#0891b2" },
    { name: "丁香灰", bg: "#faf5ff", accent: "#a855f7" },
    { name: "霧霾藍", bg: "#f1f5f9", accent: "#475569" },
    { name: "燕麥奶", bg: "#fafaf9", accent: "#a8a29e" },
    { name: "暖陽杏", bg: "#fffbeb", accent: "#d97706" },
    { name: "煙燻玫瑰", bg: "#fff1f2", accent: "#be123c" },
    { name: "亞麻灰", bg: "#f9fafb", accent: "#6b7280" },
    { name: "珊瑚砂", bg: "#fff7ed", accent: "#ea580c" },
    { name: "森林深處", bg: "#f0fdf4", accent: "#166534" },
    { name: "冰川灰", bg: "#f1f5f9", accent: "#1e293b" },
    { name: "炭灰藍", bg: "#f8fafc", accent: "#334155" },
    { name: "橄欖綠", bg: "#f7fee7", accent: "#4d7c0f" },
    { name: "紫蘇灰", bg: "#fdf4ff", accent: "#701a75" },
    { name: "晨曦灰", bg: "#f9fafb", accent: "#111827" }
];

const defaultConfig = {
    grade: "1", 
    wordCount: "150", 
    students: "姓名1\n姓名2\n姓名3\n姓名4\n姓名5\n姓名6\n姓名7\n姓名8\n姓名9\n姓名10\n姓名11\n姓名12\n姓名13\n姓名14\n姓名15\n姓名16\n姓名17\n姓名18\n姓名19\n姓名20\n姓名21\n姓名22\n姓名23\n姓名24\n姓名25\n姓名26\n姓名27\n姓名28\n姓名29\n姓名30",
    traitsRaw: "班級幹部類\n班長\n副班長\n風紀\n事務長\n開門長\n學藝\n衛生長\n國語小老師\n數學小老師\n生活常規類\n自理有序\n作息穩定\n生活自律\n整潔到位\n守時守序\n習慣未定\n偶有鬆散\n作息不穩\n自理待練\n需再提醒\n作業態度類\n準時繳交\n用心書寫\n作業確實\n態度認真\n品質穩定\n偶有拖延\n書寫潦草\n完成不足\n需人督促\n細節待強\n學習態度類\n主動求知\n學習投入\n態度積極\n樂於嘗試\n專注認真\n被動學習\n專注不穩\n投入不足\n動機待強\n易受分心\n課堂表現類\n積極參與\n專心聆聽\n回應得宜\n表現穩定\n勇於發言\n參與不足\n發言保守\n注意力弱\n互動被動\n需多投入\n行為表現類\n守規有禮\n行止得體\n態度端正\n表現穩重\n自我約束\n偶有違規\n行為衝動\n情緒外顯\n規範待強\n需再提醒\n責任感類\n勇於承擔\n負責盡職\n使命必達\n值得信賴\n交辦到位\n責任感弱\n容易推託\n任務延宕\n依賴提醒\n自覺不足\n合作互動類\n合作順暢\n樂於配合\n溝通良好\n互動自然\n團隊意識\n配合不足\n互動保守\n溝通待強\n合作被動\n團隊意識弱\n友誼人際類\n友善體貼\n相處融洽\n關懷同學\n待人和善\n人緣良好\n表達直接\n易生誤會\n互動衝突\n情緒影響\n需學體諒\n情緒管理類\n情緒穩定\n冷靜應對\n能自調節\n表現理性\n情緒成熟\n情緒起伏\n外顯明顯\n易受影響\n調適不足\n需人安撫\n自我管理類\n自我要求\n行事自律\n目標明確\n安排得宜\n自我掌控\n自控不足\n依賴提醒\n計畫鬆散\n目標不清\n執行待強",
    tones: "正向\n溫暖\n鼓勵\n關懷\n期許\n肯定\n真誠\n包容\n感性\n讚賞\n活潑\n俏皮\n親切",
    prePrompt: "我是一名專業的導師，",
    promptTemplate: "請給 {grade}年級 的 {name} 寫一段期末的話。希望從學生的特質「{traits}」出發，用 {tone} 的語氣來描述，內容長度約 {wordCount} 字。",
    fontSize: "1.4",
    studentFontSize: "1.4",
    includeCatName: true,
    themeIdx: 0, gridCount: 7, traitCols: 4, lastTones: []
};
