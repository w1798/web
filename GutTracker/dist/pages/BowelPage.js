const BowelPage = () => {
  const { bowelRecords, saveBowel, deleteBowel, config } = useGut();
  const [date, setDate] = useState((/* @__PURE__ */ new Date()).toLocaleDateString("en-CA"));
  const [time, setTime] = useState((/* @__PURE__ */ new Date()).toTimeString().slice(0, 5));
  const [amount, setAmount] = useState("\u9069\u4E2D");
  const [status, setStatus] = useState("\u6B63\u5E38");
  const [note, setNote] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const statusIcons = { "\u6B63\u5E38": "\u{1F7E2}", "\u591A": "\u{1F30A}", "\u5C11": "\u{1F311}", "\u786C": "\u{1FAA8}", "\u8EDF": "\u2601\uFE0F", "\u7A00": "\u{1F4A7}", "\u4FBF\u7955": "\u23F3", "\u62C9\u809A\u5B50": "\u{1F525}", "\u9069\u4E2D": "\u2696\uFE0F" };
  const getIcon = (s) => statusIcons[s] || "\u2753";
  const handleAdd = () => {
    saveBowel({ date, time, amount, status, note, timestamp: Date.now() });
    setNote("");
    setTime((/* @__PURE__ */ new Date()).toTimeString().slice(0, 5));
    setCurrentPage(1);
  };
  const sortedRecords = useMemo(() => [...bowelRecords].sort((a, b) => {
    const timeA = (/* @__PURE__ */ new Date(a.date + "T" + a.time)).getTime();
    const timeB = (/* @__PURE__ */ new Date(b.date + "T" + b.time)).getTime();
    return timeB - timeA;
  }), [bowelRecords]);
  const totalPages = Math.ceil(sortedRecords.length / pageSize);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage]);
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("style", null, `
                @media (max-width: 380px) {
                    .date-text { font-size: 10px !important; }
                    .time-tag { font-size: 10px !important; padding: 1px 4px !important; }
                }
            `), /* @__PURE__ */ React.createElement("div", { className: "glass-card rounded-2xl p-5 shadow-sm mb-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold mb-4 flex items-center gap-2 dark:text-gray-200" }, "\u{1F4CB} \u65B0\u589E\u6392\u4FBF\u7D00\u9304"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-5 gap-3 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "col-span-3" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs text-gray-400 mb-1 block font-semibold" }, "\u65E5\u671F"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: date,
      onChange: (e) => setDate(e.target.value),
      className: "bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-2.5 w-full font-medium text-sm dark:text-gray-200 focus:outline-none focus:ring-2 ring-rose-400"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "col-span-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs text-gray-400 mb-1 block font-semibold" }, "\u6642\u9593"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "time",
      value: time,
      onChange: (e) => setTime(e.target.value),
      className: "bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-2.5 w-full font-medium text-sm dark:text-gray-200 focus:outline-none focus:ring-2 ring-rose-400"
    }
  ))), /* @__PURE__ */ React.createElement("label", { className: "text-xs text-gray-400 mb-2 block font-semibold" }, "\u91CF"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-4" }, (config.bowelAmounts || ["\u591A", "\u9069\u4E2D", "\u5C11"]).map((a) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: a,
      onClick: () => setAmount(a),
      className: `flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${amount === a ? "bg-rose-500 text-white shadow-md" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300"}`
    },
    a
  ))), /* @__PURE__ */ React.createElement("label", { className: "text-xs text-gray-400 mb-2 block font-semibold" }, "\u72C0\u6CC1"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-4" }, config.bowelStatuses.map((s) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: s,
      onClick: () => setStatus(s),
      className: `py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all min-h-[60px] ${status === s ? "bg-rose-500 text-white shadow-lg scale-105 ring-2 ring-rose-300" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-xl" }, getIcon(s)),
    s
  ))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "\u88DC\u5145\u8AAA\u660E (\u9078\u586B)...",
      value: note,
      onChange: (e) => setNote(e.target.value),
      className: "bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-3 w-full mb-4 focus:ring-2 ring-rose-400 focus:outline-none text-sm dark:text-gray-200"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleAdd,
      className: "w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl font-bold text-base shadow-lg hover:brightness-110 active:scale-[0.98] transition-all min-h-[48px]"
    },
    "\u{1F4BE} \u5132\u5B58\u7D00\u9304"
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3 px-1" }, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-bold text-gray-400 flex items-center gap-1" }, "\u{1F4DC} \u6B77\u53F2\u7D00\u9304 (", bowelRecords.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, paginatedRecords.map((record) => /* @__PURE__ */ React.createElement("div", { key: record.id, className: "glass-card rounded-2xl p-3 flex items-center justify-between animate-slide-up" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 flex-1 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xl flex-shrink-0" }, getIcon(record.status)), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-sm dark:text-gray-200 truncate mb-0.5" }, record.amount || "\u9069\u4E2D", " / ", record.status), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "date-text text-xs text-gray-400 font-medium whitespace-nowrap" }, record.date, " (", formatDateStr(record.date), ")"), /* @__PURE__ */ React.createElement("span", { className: "time-tag text-[10px] bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-rose-500 font-bold shrink-0" }, record.time)), record.note && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-gray-500 mt-1 italic truncate opacity-70" }, "\u{1F4AC} ", record.note))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        if (confirm("\u78BA\u5B9A\u522A\u9664\u6B64\u7D00\u9304\uFF1F")) deleteBowel(record.id);
      },
      className: "w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 flex-shrink-0 ml-1"
    },
    "\u2715"
  ))), totalPages > 1 && /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 pt-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      disabled: currentPage === 1,
      onClick: () => setCurrentPage((v) => v - 1),
      className: "flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm font-bold text-gray-500 disabled:opacity-30 transition-all"
    },
    "\u2190 \u4E0A\u4E00\u9801"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      disabled: currentPage === totalPages,
      onClick: () => setCurrentPage((v) => v + 1),
      className: "flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm font-bold text-gray-500 disabled:opacity-30 transition-all"
    },
    "\u4E0B\u4E00\u9801 \u2192"
  )), sortedRecords.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "py-10 text-center text-gray-300" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm" }, "\u5C1A\u672A\u6709\u7D00\u9304"))));
};
