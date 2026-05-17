// =============================================
// 飲食紀錄頁面
// =============================================
const DietPage = () => {
    const { dietRecords, saveDiet, config } = useGut();
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const currentData = useMemo(() => dietRecords[selectedDate] || { meals: {} }, [dietRecords, selectedDate]);
    const { mealNames, foodTypes, amounts, cookMethods } = config;

    const getEntry = (meal, food) => currentData.meals?.[meal]?.entries?.[food] || null;

    const toggleFood = (meal, food) => {
        if (food === '➕ 自訂') {
            const custom = prompt('請輸入自訂食物名稱：');
            if (!custom) return;
            food = custom;
        }
        const newMeals = JSON.parse(JSON.stringify(currentData.meals));
        if (!newMeals[meal]) newMeals[meal] = { entries: {} };
        if (!newMeals[meal].entries) newMeals[meal].entries = {};
        if (newMeals[meal].entries[food]) {
            delete newMeals[meal].entries[food];
        } else {
            newMeals[meal].entries[food] = { amount: amounts[Math.floor(amounts.length/2)] || '適中', cook: '' };
        }
        saveDiet(selectedDate, { meals: newMeals });
    };

    const setAmount = (meal, food, amount) => {
        const newMeals = JSON.parse(JSON.stringify(currentData.meals));
        if (newMeals[meal]?.entries?.[food]) {
            newMeals[meal].entries[food].amount = amount;
            saveDiet(selectedDate, { meals: newMeals });
        }
    };

    const setCook = (meal, food, cook) => {
        const newMeals = JSON.parse(JSON.stringify(currentData.meals));
        if (newMeals[meal]?.entries?.[food]) {
            const cur = newMeals[meal].entries[food].cook;
            newMeals[meal].entries[food].cook = (cur === cook) ? '' : cook;
            saveDiet(selectedDate, { meals: newMeals });
        }
    };

    const setMealTime = (meal, timeStr) => {
        const newMeals = JSON.parse(JSON.stringify(currentData.meals));
        if (!newMeals[meal]) newMeals[meal] = { entries: {} };
        newMeals[meal].timeOverride = timeStr;
        saveDiet(selectedDate, { meals: newMeals });
    };

    const shiftDate = (delta) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + delta);
        setSelectedDate(d.toISOString().slice(0, 10));
    };

    const getSelectedFoods = (meal) => Object.keys(currentData.meals?.[meal]?.entries || {});
    const activeMealNames = Array.from(new Set([...mealNames, ...Object.keys(currentData.meals || {})]));
    const getActiveFoods = (meal) => Array.from(new Set([...foodTypes, ...getSelectedFoods(meal)]));

    return (
        <div className="p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4 glass-card p-3 rounded-2xl shadow-sm">
                <button onClick={() => shiftDate(-1)} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-2xl">◀</button>
                <div className="text-center flex-1">
                    <div className="text-sm text-gray-400 mb-0.5">日期</div>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                        className="font-bold text-lg text-gray-800 dark:text-gray-100 bg-transparent border-none text-center w-full focus:outline-none" />
                    <div className="text-sm text-gray-400 mt-0.5">{formatDateStr(selectedDate)}</div>
                </div>
                <button onClick={() => shiftDate(1)} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-2xl">▶</button>
            </div>
            <div className="space-y-5">
                {activeMealNames.map((meal, idx) => {
                    const parsedMeal = parseMealStr(meal);
                    const selectedFoods = getSelectedFoods(meal);
                    return (
                        <div key={meal} className="glass-card rounded-2xl p-4 shadow-sm animate-slide-up" style={{animationDelay:`${idx*0.05}s`}}>
                            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-slate-700/50 pb-2.5">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                    <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>{parsedMeal.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="time" 
                                        value={currentData.meals?.[meal]?.timeOverride || `${String(parsedMeal.hour || 12).padStart(2,'0')}:00`}
                                        onChange={(e) => setMealTime(meal, e.target.value)}
                                        className="text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg px-2.5 py-1 font-bold text-indigo-500 dark:text-indigo-400 focus:outline-none focus:ring-2 ring-indigo-400"
                                    />
                                    {selectedFoods.length > 0 && <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full">{selectedFoods.length} 項</span>}
                                </div>
                            </div>
                            <label className="text-xs text-gray-400 uppercase mb-2 block tracking-wider font-semibold">點選食物種類</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {[...getActiveFoods(meal), '➕ 自訂'].map(t => (
                                    <button key={t} onClick={() => toggleFood(meal, t)}
                                        className={`px-4 py-2.5 rounded-xl text-base font-medium transition-all min-h-[48px] ${getEntry(meal, t) ? 'bg-indigo-500 text-white shadow-md scale-105' : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600'}`}>{t}</button>
                                ))}
                            </div>
                            {selectedFoods.length > 0 && (
                                <div className="mt-3 space-y-3 border-t border-gray-100 dark:border-slate-600 pt-3">
                                    {selectedFoods.map(food => {
                                        const entry = getEntry(meal, food) || { amount: '適中', cook: '' };
                                        return (
                                            <div key={food} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-bold text-base dark:text-gray-200">{food}</span>
                                                    <button onClick={() => toggleFood(meal, food)} className="text-gray-300 hover:text-red-500 text-sm px-2">✕ 移除</button>
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs text-gray-400 font-semibold w-8 flex-shrink-0">量</span>
                                                    <div className="flex gap-1.5 flex-1">
                                                        {amounts.map(a => (
                                                            <button key={a} onClick={() => setAmount(meal, food, a)}
                                                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] ${entry.amount === a ? 'bg-emerald-500 text-white shadow-md' : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600'}`}>{a}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 font-semibold w-8 flex-shrink-0">法</span>
                                                    <div className="flex gap-1.5 flex-wrap flex-1">
                                                        {cookMethods.map(c => (
                                                            <button key={c} onClick={() => setCook(meal, food, c)}
                                                                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] ${entry.cook === c ? 'bg-amber-500 text-white shadow-md' : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600'}`}>{c}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
