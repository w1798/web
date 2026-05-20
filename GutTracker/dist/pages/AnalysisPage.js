const calcBowelFrequency = (bowelRecords) => {
  if (bowelRecords.length < 2) return { avgDays: 1, label: "\u8CC7\u6599\u4E0D\u8DB3", description: "\u9700\u8981\u81F3\u5C11 2 \u7B46\u7D00\u9304\u4F86\u8A08\u7B97\u983B\u7387" };
  const uniqueDates = [...new Set(bowelRecords.map((b) => b.date))].sort();
  if (uniqueDates.length < 2) return { avgDays: 1, label: "\u6BCF\u5929", description: "\u6BCF\u5929\u6392\u4FBF 1 \u6B21\u4EE5\u4E0A" };
  const gaps = [];
  for (let i = 1; i < uniqueDates.length; i++) {
    const d1 = new Date(uniqueDates[i - 1]);
    const d2 = new Date(uniqueDates[i]);
    const diffDays = Math.round((d2 - d1) / (1e3 * 60 * 60 * 24));
    if (diffDays > 0) gaps.push(diffDays);
  }
  if (gaps.length === 0) return { avgDays: 1, label: "\u6BCF\u5929", description: "\u6BCF\u5929\u6392\u4FBF 1 \u6B21\u4EE5\u4E0A" };
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sameDayCount = bowelRecords.length - uniqueDates.length;
  const multiPerDay = sameDayCount / uniqueDates.length;
  let avgDays, label, description;
  if (multiPerDay >= 0.5) {
    avgDays = 0.5;
    label = "\u4E00\u5929\u591A\u6B21";
    description = `\u5E73\u5747\u4E00\u5929\u7D04 ${(1 + multiPerDay).toFixed(1)} \u6B21`;
  } else if (avgGap <= 1.2) {
    avgDays = 1;
    label = "\u6BCF\u5929";
    description = "\u5927\u7D04\u6BCF\u5929\u6392\u4FBF 1 \u6B21";
  } else if (avgGap <= 2.2) {
    avgDays = 2;
    label = "\u5169\u5929\u4E00\u6B21";
    description = `\u5E73\u5747\u9593\u9694 ${avgGap.toFixed(1)} \u5929`;
  } else if (avgGap <= 3.5) {
    avgDays = 3;
    label = "\u4E09\u5929\u4E00\u6B21";
    description = `\u5E73\u5747\u9593\u9694 ${avgGap.toFixed(1)} \u5929`;
  } else {
    avgDays = Math.round(avgGap);
    label = `${avgDays} \u5929\u4E00\u6B21`;
    description = `\u5E73\u5747\u9593\u9694 ${avgGap.toFixed(1)} \u5929`;
  }
  return { avgDays, label, description };
};
const AnalysisPage = () => {
  const { dietRecords, bowelRecords, config } = useGut();
  const [offsetHours, setOffsetHours] = useState(() => {
    return parseInt(localStorage.getItem("gut_offsetHours") || "24");
  });
  useEffect(() => {
    localStorage.setItem("gut_offsetHours", offsetHours);
  }, [offsetHours]);
  const sortedBowel = useMemo(() => [...bowelRecords].sort((a, b) => {
    const timeA = (/* @__PURE__ */ new Date(a.date + "T" + a.time)).getTime();
    const timeB = (/* @__PURE__ */ new Date(b.date + "T" + b.time)).getTime();
    return timeB - timeA;
  }), [bowelRecords]);
  const frequency = useMemo(() => calcBowelFrequency(bowelRecords), [bowelRecords]);
  const formatOffset = (hrs) => {
    const days = Math.floor(hrs / 24);
    const rem = hrs % 24;
    if (days > 0 && rem > 0) return `${days} \u5929 ${rem} \u5C0F\u6642`;
    if (days > 0) return `${days} \u5929`;
    if (rem > 0) return `${rem} \u5C0F\u6642`;
    return "\u5373\u6642";
  };
  const getMealsInTimeWindow = (bowelDate, bowelTime) => {
    const bowelMs = (/* @__PURE__ */ new Date(bowelDate + "T" + bowelTime)).getTime();
    const offsetMs = offsetHours * 3600 * 1e3;
    const endMs = bowelMs - offsetMs;
    const spanDays = Math.max(1, Math.ceil(frequency.avgDays));
    const startMs = endMs - spanDays * 24 * 3600 * 1e3;
    let matchedMeals = [];
    Object.entries(dietRecords).forEach(([dDate, dData]) => {
      if (!dData || !dData.meals) return;
      Object.entries(dData.meals).forEach(([mealStr, mData]) => {
        const parsed = parseMealStr(mealStr);
        let hour = parsed.hour;
        let min = 0;
        if (mData.timeOverride) {
          const parts = mData.timeOverride.split(":");
          hour = parseInt(parts[0]);
          min = parseInt(parts[1]) || 0;
        } else {
          if (hour === null) {
            const matchedCfg = config.mealNames.find((c) => parseMealStr(c).name === parsed.name);
            if (matchedCfg) {
              const ch = parseMealStr(matchedCfg).hour;
              if (ch !== null) hour = ch;
            }
          }
          if (hour === null) hour = 12;
        }
        const mealMs = (/* @__PURE__ */ new Date(`${dDate}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`)).getTime();
        if (mealMs > startMs && mealMs <= endMs) {
          matchedMeals.push({
            mealStr,
            name: parsed.name,
            hour,
            min,
            dateStr: dDate,
            mealMs,
            data: mData
          });
        }
      });
    });
    return matchedMeals.sort((a, b) => a.mealMs - b.mealMs);
  };
  const getInsight = (matchedMeals, bowel) => {
    const allEntries = [];
    matchedMeals.forEach((m) => {
      if (!m.data) return;
      Object.entries(m.data.entries || {}).forEach(([food, info]) => {
        allEntries.push({ food, ...info });
      });
    });
    if (allEntries.length === 0) return null;
    const insights = [];
    const status = bowel.status;
    const amount = bowel.amount || "\u9069\u4E2D";
    if (allEntries.some((e) => e.cook === "\u70B8") && (status === "\u8EDF" || status === "\u7A00" || status === "\u62C9\u809A\u5B50"))
      insights.push("\u{1F35F} \u70B8\u7269\u53EF\u80FD\u5C0E\u81F4\u8EDF\u4FBF/\u8179\u7009");
    if ((status === "\u4FBF\u7955" || status === "\u786C") && !allEntries.some((e) => e.food.includes("\u83DC") || e.food.includes("\u6C34\u679C")))
      insights.push("\u{1F966} \u7F3A\u4E4F\u7E96\u7DAD\u651D\u53D6\u53EF\u80FD\u5C0E\u81F4\u4FBF\u7955");
    if (allEntries.some((e) => e.cook === "\u6EF7") && status === "\u786C")
      insights.push("\u{1F9C2} \u91CD\u53E3\u5473\u98F2\u98DF\u53EF\u80FD\u5F71\u97FF\u6392\u4FBF");
    if (allEntries.some((e) => e.amount === "\u591A") && amount === "\u591A")
      insights.push("\u{1F4CF} \u5927\u91CF\u9032\u98DF\u53EF\u80FD\u5C0E\u81F4\u6392\u4FBF\u589E\u91CF");
    return insights.length > 0 ? insights : null;
  };
  const formatMealEntries = (mealData) => {
    const entries = mealData?.entries || {};
    return Object.entries(entries).map(([food, info]) => {
      let label = food;
      if (info.amount) label += `(${info.amount})`;
      if (info.cook) label += `[${info.cook}]`;
      return label;
    }).join("\u3001");
  };
  const stats = useMemo(() => {
    const now = /* @__PURE__ */ new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const recent = bowelRecords.filter((b) => new Date(b.date) >= twoWeeksAgo);
    const counts = {};
    recent.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    return { counts, total: recent.length };
  }, [bowelRecords]);
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "glass-card rounded-2xl p-4 shadow-sm mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2" }, "\u{1F504} \u6392\u4FBF\u983B\u7387\u5206\u6790"), /* @__PURE__ */ React.createElement("span", { className: "text-base font-black text-rose-500" }, frequency.label)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, frequency.description, "\uFF0C\u5206\u6790\u5C07\u5408\u4F75 ", Math.max(1, Math.ceil(frequency.avgDays)), " \u5929\u7684\u98F2\u98DF")), stats.total > 0 && /* @__PURE__ */ React.createElement("div", { className: "glass-card rounded-2xl p-4 shadow-sm mb-5" }, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-bold text-gray-400 mb-3" }, "\u{1F4CA} \u6700\u8FD1 14 \u5929\u6392\u4FBF\u7D71\u8A08 (", stats.total, " \u7B46)"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, Object.entries(stats.counts).sort((a, b) => b[1] - a[1]).map(([st, count]) => /* @__PURE__ */ React.createElement("div", { key: st, className: "bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 border border-gray-100 dark:border-slate-700/50" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-200" }, st), /* @__PURE__ */ React.createElement("span", { className: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-bold text-xs" }, count), /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 text-xs" }, Math.round(count / stats.total * 100), "%"))))), /* @__PURE__ */ React.createElement("div", { className: "glass-card rounded-2xl p-2 shadow-sm mb-2 sticky top-2 z-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-1" }, /* @__PURE__ */ React.createElement("h3", { className: "font-extrabold text-[13px] text-gray-700 dark:text-gray-200 flex items-center gap-1.5" }, "\u26A1 \u6642\u9593\u4F4D\u79FB\u5206\u6790"), /* @__PURE__ */ React.createElement("span", { className: "text-indigo-500 font-black text-sm" }, formatOffset(offsetHours))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "0",
      max: "120",
      step: "6",
      value: offsetHours,
      onChange: (e) => setOffsetHours(parseInt(e.target.value)),
      className: "mb-1"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-[10px] text-gray-400 px-0.5 font-medium" }, /* @__PURE__ */ React.createElement("span", null, "0"), /* @__PURE__ */ React.createElement("span", null, "1\u5929"), /* @__PURE__ */ React.createElement("span", null, "2\u5929"), /* @__PURE__ */ React.createElement("span", null, "3\u5929"), /* @__PURE__ */ React.createElement("span", null, "4\u5929"), /* @__PURE__ */ React.createElement("span", null, "5\u5929"))), /* @__PURE__ */ React.createElement("div", { className: "space-y-5" }, sortedBowel.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "py-20 text-center text-gray-300 dark:text-gray-600" }, /* @__PURE__ */ React.createElement("div", { className: "text-5xl mb-4 opacity-30" }, "\u{1F50D}"), /* @__PURE__ */ React.createElement("p", { className: "text-base" }, "\u5C1A\u672A\u6709\u6392\u4FBF\u7D00\u9304\u53EF\u4F9B\u5206\u6790")), sortedBowel.map((bowel) => {
    const matchedMeals = getMealsInTimeWindow(bowel.date, bowel.time);
    const insights = getInsight(matchedMeals, bowel);
    const hasAnyDiet = matchedMeals.length > 0;
    return /* @__PURE__ */ React.createElement("div", { key: bowel.id, className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-indigo-500 mb-1 pl-1" }, "\u{1F37D}\uFE0F \u98F2\u98DF ", hasAnyDiet ? `(${formatDateStr(matchedMeals[0].dateStr)}~${formatDateStr(matchedMeals[matchedMeals.length - 1].dateStr)})` : ""), /* @__PURE__ */ React.createElement("div", { className: "glass-card rounded-2xl p-3 min-h-[80px] border-l-4 border-l-indigo-400 shadow-sm" }, hasAnyDiet ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, matchedMeals.map((m, idx) => {
      const text = formatMealEntries(m.data);
      if (!text) return null;
      const showDateHeader = idx === 0 || matchedMeals[idx - 1].dateStr !== m.dateStr;
      return /* @__PURE__ */ React.createElement("div", { key: `${m.dateStr}-${m.mealStr}`, className: "border-b border-gray-100 dark:border-slate-700/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0" }, showDateHeader && /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold text-indigo-400 mb-0.5" }, formatDateStr(m.dateStr)), /* @__PURE__ */ React.createElement("div", { className: "text-xs leading-relaxed" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-gray-500 dark:text-gray-400" }, m.name, " (", String(m.hour).padStart(2, "0"), ":", String(m.min).padStart(2, "0"), "):"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-300" }, text)));
    })) : /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-300 italic py-4 text-center" }, "\u2014 \u7121\u7D00\u9304 \u2014"))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col justify-center items-center text-gray-300 dark:text-gray-600 text-xl" }, "\u2192"), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-rose-500 mb-1 pl-1 truncate" }, "\u{1F6BD} \u6392\u4FBF (", formatDateStr(bowel.date), ")"), /* @__PURE__ */ React.createElement("div", { className: "glass-card rounded-2xl p-3 min-h-[80px] border-l-4 border-l-rose-400 shadow-sm relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-xl shrink-0" }, bowel.status === "\u6B63\u5E38" ? "\u{1F7E2}" : bowel.status === "\u591A" ? "\u{1F30A}" : bowel.status === "\u5C11" ? "\u{1F311}" : bowel.status === "\u786C" ? "\u{1FAA8}" : bowel.status === "\u8EDF" ? "\u2601\uFE0F" : bowel.status === "\u7A00" ? "\u{1F4A7}" : bowel.status === "\u62C9\u809A\u5B50" ? "\u{1F525}" : "\u23F3"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-sm dark:text-gray-100 truncate" }, bowel.amount || "\u9069\u4E2D", " / ", bowel.status)), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-400 font-bold bg-gray-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block" }, "\u23F0 ", bowel.time), bowel.note && /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-500 mt-1 line-clamp-2 italic" }, "\u{1F4AC} ", bowel.note)))), insights && insights.map((insight, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-bold px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-700/50 flex items-center gap-2" }, "\u26A0\uFE0F ", insight)));
  })));
};
