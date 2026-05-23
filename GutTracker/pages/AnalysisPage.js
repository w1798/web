// =============================================
// 排便頻率計算工具
// =============================================
const calcBowelFrequency = (bowelRecords) => {
    if (bowelRecords.length < 2) return { avgDays: 1, label: '資料不足', description: '需要至少 2 筆紀錄來計算頻率' };
    // 取得所有不重複日期，按日期排序
    const uniqueDates = [...new Set(bowelRecords.map(b => b.date))].sort();
    if (uniqueDates.length < 2) return { avgDays: 1, label: '每天', description: '每天排便 1 次以上' };

    // 計算每筆排便之間的間隔天數
    const gaps = [];
    for (let i = 1; i < uniqueDates.length; i++) {
        const d1 = new Date(uniqueDates[i - 1]);
        const d2 = new Date(uniqueDates[i]);
        const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) gaps.push(diffDays);
    }

    if (gaps.length === 0) return { avgDays: 1, label: '每天', description: '每天排便 1 次以上' };

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    // 同一天多次排便的比例
    const sameDayCount = bowelRecords.length - uniqueDates.length;
    const multiPerDay = sameDayCount / uniqueDates.length;

    let avgDays, label, description;
    if (multiPerDay >= 0.5) {
        // 有超過一半的天數是一天多次
        avgDays = 0.5;
        label = '一天多次';
        description = `平均一天約 ${(1 + multiPerDay).toFixed(1)} 次`;
    } else if (avgGap <= 1.2) {
        avgDays = 1;
        label = '每天';
        description = '大約每天排便 1 次';
    } else if (avgGap <= 2.2) {
        avgDays = 2;
        label = '兩天一次';
        description = `平均間隔 ${avgGap.toFixed(1)} 天`;
    } else if (avgGap <= 3.5) {
        avgDays = 3;
        label = '三天一次';
        description = `平均間隔 ${avgGap.toFixed(1)} 天`;
    } else {
        avgDays = Math.round(avgGap);
        label = `${avgDays} 天一次`;
        description = `平均間隔 ${avgGap.toFixed(1)} 天`;
    }

    return { avgDays, label, description };
};

// =============================================
// 對齊分析頁面（核心）
// 6 小時一格，最大 5 天
// 依排便頻率合併多天飲食
// =============================================
const AnalysisPage = () => {
    const { dietRecords, bowelRecords, config } = useGut();
    const [offsetHours, setOffsetHours] = useState(() => {
        return parseInt(localStorage.getItem('gut_offsetHours') || '24');
    });

    useEffect(() => {
        localStorage.setItem('gut_offsetHours', offsetHours);
    }, [offsetHours]);

    const sortedBowel = useMemo(() => [...bowelRecords].sort((a, b) => {
        const timeA = new Date(a.date + 'T' + a.time).getTime();
        const timeB = new Date(b.date + 'T' + b.time).getTime();
        return timeB - timeA;
    }), [bowelRecords]);

    // 計算排便頻率
    const frequency = useMemo(() => calcBowelFrequency(bowelRecords), [bowelRecords]);

    const formatOffset = (hrs) => {
        const days = Math.floor(hrs / 24);
        const rem = hrs % 24;
        if (days > 0 && rem > 0) return `${days} 天 ${rem} 小時`;
        if (days > 0) return `${days} 天`;
        if (rem > 0) return `${rem} 小時`;
        return '即時';
    };

    // 依排便時間與計算頻率動態抓取過去 24*spanDays 小時內的「單一餐點」，精確到小時
    const getMealsInTimeWindow = (bowelDate, bowelTime) => {
        const bowelMs = new Date(bowelDate + 'T' + bowelTime).getTime();
        const offsetMs = offsetHours * 3600 * 1000;
        const endMs = bowelMs - offsetMs;
        const spanDays = Math.max(1, Math.ceil(frequency.avgDays));
        const startMs = endMs - (spanDays * 24 * 3600 * 1000);

        let matchedMeals = [];

        Object.entries(dietRecords).forEach(([dDate, dData]) => {
            if (!dData || !dData.meals) return;
            Object.entries(dData.meals).forEach(([mealStr, mData]) => {
                const parsed = parseMealStr(mealStr);
                let hour = parsed.hour;
                let min = 0;
                
                if (mData.timeOverride) {
                    const parts = mData.timeOverride.split(':');
                    hour = parseInt(parts[0]);
                    min = parseInt(parts[1]) || 0;
                } else {
                    // 如果舊紀錄沒有設定小時，去 config 設定裡面找符合名稱的預設小時
                    if (hour === null) {
                        const matchedCfg = config.mealNames.find(c => parseMealStr(c).name === parsed.name);
                        if (matchedCfg) {
                            const ch = parseMealStr(matchedCfg).hour;
                            if (ch !== null) hour = ch;
                        }
                    }
                    if (hour === null) hour = 12; // 真找不到就預設中午 12 點
                }

                const mealMs = new Date(`${dDate}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`).getTime();
                const marginMs = 4 * 3600 * 1000; // 4 小時軟邊界

                const inWindow = mealMs > startMs && mealMs <= endMs;
                const isSoft = (mealMs > endMs && mealMs <= endMs + marginMs) || (mealMs > startMs - marginMs && mealMs <= startMs);

                if (inWindow || isSoft) {
                    matchedMeals.push({
                        mealStr,
                        name: parsed.name,
                        hour,
                        min,
                        dateStr: dDate,
                        mealMs,
                        data: mData,
                        isSoft: !inWindow // 如果不在主視窗內即為軟性邊界
                    });
                }
            });
        });

        return matchedMeals.sort((a,b) => a.mealMs - b.mealMs);
    };

    const getInsight = (matchedMeals, bowel) => {
        const allEntries = [];
        matchedMeals.forEach(m => {
            if (!m.data) return;
            Object.entries(m.data.entries || {}).forEach(([food, info]) => {
                allEntries.push({ food, ...info });
            });
        });
        if (allEntries.length === 0) return null;
        const insights = [];
        const status = bowel.status;
        const amount = bowel.amount || '適中';

        if (allEntries.some(e => e.cook === '炸') && (status === '軟' || status === '稀' || status === '拉肚子'))
            insights.push('🍟 炸物可能導致軟便/腹瀉');
        if ((status === '便祕' || status === '硬') && !allEntries.some(e => e.food.includes('菜') || e.food.includes('水果')))
            insights.push('🥦 缺乏纖維攝取可能導致便祕');
        if (allEntries.some(e => e.cook === '滷') && status === '硬')
            insights.push('🧂 重口味飲食可能影響排便');
        if (allEntries.some(e => e.amount === '多') && amount === '多')
            insights.push('📏 大量進食可能導致排便增量');
        return insights.length > 0 ? insights : null;
    };

    const formatMealEntries = (mealData) => {
        const entries = mealData?.entries || {};
        return Object.entries(entries).map(([food, info]) => {
            let label = food;
            if (info.amount) label += `(${info.amount})`;
            if (info.cook) label += `[${info.cook}]`;
            return label;
        }).join('、');
    };

    const stats = useMemo(() => {
        const now = new Date();
        const twoWeeksAgo = new Date(now);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const recent = bowelRecords.filter(b => new Date(b.date) >= twoWeeksAgo);
        const counts = {};
        recent.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });
        return { counts, total: recent.length };
    }, [bowelRecords]);

    return (
        <div className="p-4 animate-fade-in">
            {/* 排便頻率資訊 */}
            <div className="glass-card rounded-2xl p-4 shadow-sm mb-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">🔄 排便頻率分析</h4>
                    <span className="text-base font-black text-rose-500">{frequency.label}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{frequency.description}，分析將合併 {Math.max(1, Math.ceil(frequency.avgDays))} 天的飲食</p>
            </div>

            {/* 14天統計摘要 (排在第二區塊) */}
            {stats.total > 0 && (
                <div className="glass-card rounded-2xl p-4 shadow-sm mb-5">
                    <h4 className="text-sm font-bold text-gray-400 mb-3">📊 最近 14 天排便統計 ({stats.total} 筆)</h4>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(stats.counts).sort((a,b) => b[1]-a[1]).map(([st, count]) => (
                            <div key={st} className="bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 border border-gray-100 dark:border-slate-700/50">
                                <span className="text-gray-700 dark:text-gray-200">{st}</span>
                                <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-bold text-xs">{count}</span>
                                <span className="text-gray-400 text-xs">{Math.round(count/stats.total*100)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 位移滑桿 (移到第三區塊) */}
            <div className="glass-card rounded-2xl p-2 shadow-sm mb-2 sticky top-2 z-10">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-extrabold text-[13px] text-gray-700 dark:text-gray-200 flex items-center gap-1.5">⚡ 食物在肚子消化時間</h3>
                    <span className="text-indigo-500 font-black text-sm">{formatOffset(offsetHours)}</span>
                </div>
                <input type="range" min="0" max="120" step="6" value={offsetHours}
                    onChange={e => setOffsetHours(parseInt(e.target.value))} className="mb-1" />
                <div className="flex justify-between text-[10px] text-gray-400 px-0.5 font-medium">
                    <span>0</span><span>1天</span><span>2天</span><span>3天</span><span>4天</span><span>5天</span>
                </div>
            </div>

            {/* 對照列表 */}
            <div className="space-y-5">
                {sortedBowel.length === 0 && (
                    <div className="py-20 text-center text-gray-300 dark:text-gray-600">
                        <div className="text-5xl mb-4 opacity-30">🔍</div>
                        <p className="text-base">尚未有排便紀錄可供分析</p>
                    </div>
                )}
                {sortedBowel.map(bowel => {
                    const matchedMeals = getMealsInTimeWindow(bowel.date, bowel.time);
                    const insights = getInsight(matchedMeals, bowel);
                    const hasAnyDiet = matchedMeals.length > 0;
                    return (
                        <div key={bowel.id} className="space-y-2">
                            <div className="flex gap-2.5">
                                {/* 左：飲食（多天合併） */}
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-indigo-500 mb-1 pl-1">
                                        🍽️ 飲食 {hasAnyDiet ? `(${formatDateStr(matchedMeals[0].dateStr)}~${formatDateStr(matchedMeals[matchedMeals.length-1].dateStr)})` : ''}
                                    </div>
                                    <div className="glass-card rounded-2xl p-3 min-h-[80px] border-l-4 border-l-indigo-400 shadow-sm">
                                        {hasAnyDiet ? (
                                            <div className="space-y-2">
                                                {matchedMeals.map((m, idx) => {
                                                    const text = formatMealEntries(m.data);
                                                    if (!text) return null;
                                                    const showDateHeader = idx === 0 || matchedMeals[idx-1].dateStr !== m.dateStr;
                                                    return (
                                                        <div key={`${m.dateStr}-${m.mealStr}`} className={`border-b border-gray-100 dark:border-slate-700/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0 ${m.isSoft ? 'opacity-60 italic' : ''}`}>
                                                            {showDateHeader && (
                                                                <div className="text-[11px] font-bold text-indigo-400 mb-0.5">{formatDateStr(m.dateStr)}</div>
                                                            )}
                                                            <div className="text-xs leading-relaxed">
                                                                <span className="font-bold text-gray-500 dark:text-gray-400">
                                                                    {m.name} ({String(m.hour).padStart(2,'0')}:{String(m.min).padStart(2,'0')})
                                                                    {m.isSoft && <span className="ml-1 text-[10px] font-normal opacity-70">(鄰近)</span>}:
                                                                </span>{' '}
                                                                <span className="text-gray-600 dark:text-gray-300">{text}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-300 italic py-4 text-center">— 無紀錄 —</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center items-center text-gray-300 dark:text-gray-600 text-xl">→</div>
                                {/* 右：排便 */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-bold text-rose-500 mb-1 pl-1 truncate">🚽 排便 ({formatDateStr(bowel.date)})</div>
                                    <div className="glass-card rounded-2xl p-3 min-h-[80px] border-l-4 border-l-rose-400 shadow-sm relative overflow-hidden">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xl shrink-0">
                                                {bowel.status === '正常' ? '🟢' : bowel.status === '多' ? '🌊' :
                                                 bowel.status === '少' ? '🌑' : bowel.status === '硬' ? '🪨' :
                                                 bowel.status === '軟' ? '☁️' : bowel.status === '稀' ? '💧' :
                                                 bowel.status === '拉肚子' ? '🔥' : '⏳'}
                                            </span>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-sm dark:text-gray-100 leading-tight">{bowel.amount || '適中'}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{bowel.status}</span>
                                            </div>
                                        </div>
                                        <div className="text-[12px] text-gray-400 font-bold bg-gray-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">⏰ {bowel.time}</div>
                                        {bowel.note && <div className="text-[11px] text-gray-500 mt-1 line-clamp-2 italic">💬 {bowel.note}</div>}
                                    </div>
                                </div>
                            </div>
                            {insights && insights.map((insight, i) => (
                                <div key={i} className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-bold px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-700/50 flex items-center gap-2">
                                    ⚠️ {insight}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
