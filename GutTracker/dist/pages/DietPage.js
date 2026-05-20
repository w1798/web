const DietPage = () => {
  const { dietRecords, saveDiet, config } = useGut();
  const [selectedDate, setSelectedDate] = useState((/* @__PURE__ */ new Date()).toLocaleDateString("en-CA"));
  const currentData = useMemo(() => dietRecords[selectedDate] || { meals: {} }, [dietRecords, selectedDate]);
  const { mealNames, foodTypes, amounts, cookMethods } = config;
  const getEntry = (meal, food) => currentData.meals?.[meal]?.entries?.[food] || null;
  const toggleFood = (meal, food) => {
    if (food === "\u2795 \u81EA\u8A02") {
      const custom = prompt("\u8ACB\u8F38\u5165\u81EA\u8A02\u98DF\u7269\u540D\u7A31\uFF1A");
      if (!custom) return;
      food = custom;
    }
    const newMeals = JSON.parse(JSON.stringify(currentData.meals));
    if (!newMeals[meal]) newMeals[meal] = { entries: {} };
    if (!newMeals[meal].entries) newMeals[meal].entries = {};
    if (newMeals[meal].entries[food]) {
      delete newMeals[meal].entries[food];
    } else {
      newMeals[meal].entries[food] = { amount: amounts[Math.floor(amounts.length / 2)] || "\u9069\u4E2D", cook: "" };
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
      newMeals[meal].entries[food].cook = cur === cook ? "" : cook;
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
  const activeMealNames = Array.from(/* @__PURE__ */ new Set([...mealNames, ...Object.keys(currentData.meals || {})]));
  const getActiveFoods = (meal) => Array.from(/* @__PURE__ */ new Set([...foodTypes, ...getSelectedFoods(meal)]));
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4 glass-card p-3 rounded-2xl shadow-sm" }, /* @__PURE__ */ React.createElement("button", { onClick: () => shiftDate(-1), className: "w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-2xl" }, "\u25C0"), /* @__PURE__ */ React.createElement("div", { className: "text-center flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-400 mb-0.5" }, "\u65E5\u671F"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: selectedDate,
      onChange: (e) => setSelectedDate(e.target.value),
      className: "font-bold text-lg text-gray-800 dark:text-gray-100 bg-transparent border-none text-center w-full focus:outline-none"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-400 mt-0.5" }, formatDateStr(selectedDate))), /* @__PURE__ */ React.createElement("button", { onClick: () => shiftDate(1), className: "w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-2xl" }, "\u25B6")), /* @__PURE__ */ React.createElement("div", { className: "space-y-5" }, activeMealNames.map((meal, idx) => {
    const parsedMeal = parseMealStr(meal);
    const selectedFoods = getSelectedFoods(meal);
    return /* @__PURE__ */ React.createElement("div", { key: meal, className: "glass-card rounded-2xl p-4 shadow-sm animate-slide-up", style: { animationDelay: `${idx * 0.05}s` } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3 border-b border-gray-100 dark:border-slate-700/50 pb-2.5" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold flex items-center gap-2 text-gray-700 dark:text-gray-200" }, /* @__PURE__ */ React.createElement("span", { className: "w-2 h-6 bg-indigo-500 rounded-full" }), parsedMeal.name), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "time",
        value: currentData.meals?.[meal]?.timeOverride || `${String(parsedMeal.hour || 12).padStart(2, "0")}:00`,
        onChange: (e) => setMealTime(meal, e.target.value),
        className: "text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg px-2.5 py-1 font-bold text-indigo-500 dark:text-indigo-400 focus:outline-none focus:ring-2 ring-indigo-400"
      }
    ), selectedFoods.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full" }, selectedFoods.length, " \u9805"))), /* @__PURE__ */ React.createElement("label", { className: "text-xs text-gray-400 uppercase mb-2 block tracking-wider font-semibold" }, "\u9EDE\u9078\u98DF\u7269\u7A2E\u985E"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" }, [...getActiveFoods(meal), "\u2795 \u81EA\u8A02"].map((t) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: t,
        onClick: () => toggleFood(meal, t),
        className: `px-4 py-2.5 rounded-xl text-base font-medium transition-all min-h-[48px] ${getEntry(meal, t) ? "bg-indigo-500 text-white shadow-md scale-105" : "bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600"}`
      },
      t
    ))), selectedFoods.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-3 space-y-3 border-t border-gray-100 dark:border-slate-600 pt-3" }, selectedFoods.map((food) => {
      const entry = getEntry(meal, food) || { amount: "\u9069\u4E2D", cook: "" };
      return /* @__PURE__ */ React.createElement("div", { key: food, className: "bg-gray-50 dark:bg-slate-800 rounded-xl p-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-base dark:text-gray-200" }, food), /* @__PURE__ */ React.createElement("button", { onClick: () => toggleFood(meal, food), className: "text-gray-300 hover:text-red-500 text-sm px-2" }, "\u2715 \u79FB\u9664")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 font-semibold w-8 flex-shrink-0" }, "\u91CF"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1.5 flex-1" }, amounts.map((a) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: a,
          onClick: () => setAmount(meal, food, a),
          className: `flex-1 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] ${entry.amount === a ? "bg-emerald-500 text-white shadow-md" : "bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600"}`
        },
        a
      )))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 font-semibold w-8 flex-shrink-0" }, "\u6CD5"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1.5 flex-wrap flex-1" }, cookMethods.map((c) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: c,
          onClick: () => setCook(meal, food, c),
          className: `px-3 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] ${entry.cook === c ? "bg-amber-500 text-white shadow-md" : "bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600"}`
        },
        c
      )))));
    })));
  })));
};
