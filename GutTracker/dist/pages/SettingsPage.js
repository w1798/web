const ConfigTextarea = ({ label, value, onChange, placeholder }) => /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-bold text-gray-600 dark:text-gray-300 mb-1.5 block" }, label), /* @__PURE__ */ React.createElement(
  "textarea",
  {
    value,
    onChange,
    placeholder,
    rows: 4,
    className: "w-full bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-3 text-sm dark:text-gray-200 focus:outline-none focus:ring-2 ring-indigo-400 resize-y font-mono leading-relaxed"
  }
));
const SettingsPage = () => {
  const { exportData, importData, config, updateConfig, doResetConfig, systemReset, getSnapshot } = useGut();
  const fileRef = useRef(null);
  const [mealText, setMealText] = useState(config.mealNames.join("\n"));
  const [foodText, setFoodText] = useState(config.foodTypes.join("\n"));
  const [amountText, setAmountText] = useState(config.amounts.join("\n"));
  const [cookText, setCookText] = useState(config.cookMethods.join("\n"));
  const [bowelAmountText, setBowelAmountText] = useState((config.bowelAmounts || []).join("\n"));
  const [bowelText, setBowelText] = useState(config.bowelStatuses.join("\n"));
  const [fontSizeZoom, setFontSizeZoom] = useState(config.fontSizeZoom || 100);
  const [binUrl, setBinUrl] = useState(config.binUrl || "");
  const [apiKey, setApiKey] = useState(config.apiKey || "");
  const hasCloud = Boolean(config.binUrl && config.apiKey);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  useEffect(() => {
    setMealText(config.mealNames.join("\n"));
    setFoodText(config.foodTypes.join("\n"));
    setAmountText(config.amounts.join("\n"));
    setCookText(config.cookMethods.join("\n"));
    setBowelAmountText((config.bowelAmounts || []).join("\n"));
    setBowelText(config.bowelStatuses.join("\n"));
    setFontSizeZoom(config.fontSizeZoom || 100);
    setBinUrl(config.binUrl || "");
    setApiKey(config.apiKey || "");
  }, [config]);
  const parseLines = (text) => text.split("\n").map((s) => s.trim()).filter(Boolean);
  const handleSave = () => {
    updateConfig({
      mealNames: parseLines(mealText),
      foodTypes: parseLines(foodText),
      amounts: parseLines(amountText),
      cookMethods: parseLines(cookText),
      bowelAmounts: parseLines(bowelAmountText),
      bowelStatuses: parseLines(bowelText),
      fontSizeZoom: parseInt(fontSizeZoom),
      binUrl: binUrl.trim(),
      apiKey: apiKey.trim()
    });
    alert("\u2705 \u8A2D\u5B9A\u5DF2\u5132\u5B58\uFF01");
  };
  const handleReset = () => {
    if (!confirm("\u78BA\u5B9A\u8981\u91CD\u7F6E\u6240\u6709\u8A2D\u5B9A\u70BA\u9810\u8A2D\u503C\u55CE\uFF1F\n\uFF08\u4E0D\u6703\u6E05\u9664\u98F2\u98DF\u8207\u6392\u4FBF\u7D00\u9304\uFF0C\u4F46\u6240\u6709\u81EA\u8A02\u9805\u76EE\u5C07\u88AB\u5FA9\u539F\uFF09")) return;
    const currentCloud = { binUrl: config.binUrl, apiKey: config.apiKey };
    const newCfg = { ...DEFAULTS, ...currentCloud };
    updateConfig(newCfg);
    alert("\u2705 \u5DF2\u6062\u5FA9\u81EA\u8A02\u9078\u9805\u9810\u8A2D\u503C\uFF08\u5DF2\u4FDD\u7559\u96F2\u7AEF\u8A2D\u5B9A\uFF09\uFF01");
  };
  const handleSystemReset = () => {
    if (!confirm("\u26A0\uFE0F \u7CFB\u7D71\u91CD\u7F6E\u5C07\u6703\u6E05\u9664\u6240\u6709\u8CC7\u6599\uFF01\n\u5305\u62EC\uFF1A\u98F2\u98DF\u7D00\u9304\u3001\u6392\u4FBF\u7D00\u9304\u3001\u81EA\u8A02\u8A2D\u5B9A\n\n\u6B64\u64CD\u4F5C\u7121\u6CD5\u5FA9\u539F\uFF0C\u5EFA\u8B70\u5148\u532F\u51FA\u5099\u4EFD\u3002\n\n\u78BA\u5B9A\u8981\u91CD\u7F6E\u55CE\uFF1F")) return;
    if (!confirm("\u{1F6A8} \u6700\u5F8C\u78BA\u8A8D\uFF1A\u771F\u7684\u8981\u522A\u9664\u6240\u6709\u8CC7\u6599\u55CE\uFF1F")) return;
    systemReset();
  };
  const handleCloudUpload = async () => {
    if (!config.binUrl || !config.apiKey) return alert("\u8ACB\u5148\u7D81\u5B9A\u96F2\u7AEF\uFF01");
    if (!confirm("\u78BA\u5B9A\u8981\u5C07\u5B8C\u6574\u7684\u672C\u5730\u8CC7\u6599\u4E0A\u50B3\u8986\u84CB\u81F3\u96F2\u7AEF\u5099\u4EFD\u5EAB\u55CE\uFF1F")) return;
    try {
      const isUpstash = config.binUrl.includes("upstash.io");
      let endpoint = config.binUrl.startsWith("http") ? config.binUrl : `https://api.jsonbin.io/v3/b/${config.binUrl}`;
      const headers = isUpstash ? { "Authorization": `Bearer ${config.apiKey}`, "Content-Type": "application/json" } : { "X-Access-Key": config.apiKey, "Content-Type": "application/json" };
      const payloadStr = JSON.stringify(getSnapshot());
      const compressed = await gzip(payloadStr);
      let binaryString = "";
      for (let i = 0; i < compressed.length; i++) binaryString += String.fromCharCode(compressed[i]);
      const base64Str = btoa(binaryString);
      const body = isUpstash ? JSON.stringify(["SET", "gut_backup", base64Str]) : JSON.stringify({ payload: base64Str });
      const res = await fetch(endpoint, { method: isUpstash ? "POST" : "PUT", headers, body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("\u2705 \u96F2\u7AEF\u5099\u4EFD\u6210\u529F\uFF01");
      setShowSaveMenu(false);
    } catch (e) {
      alert("\u4E0A\u50B3\u5931\u6557\uFF1A" + e.message);
    }
  };
  const handleCloudDownload = async () => {
    if (!config.binUrl || !config.apiKey) return alert("\u8ACB\u5148\u7D81\u5B9A\u96F2\u7AEF\uFF01");
    if (!confirm("\u26A0\uFE0F \u5371\u96AA\uFF1A\u9019\u6703\u5F9E\u96F2\u7AEF\u4E0B\u8F09\u4E26\u3010\u8986\u5BEB\u3011\u672C\u5730\u540C\u65E5\u7684\u7D00\u9304\uFF0C\u78BA\u5B9A\u57F7\u884C\u55CE\uFF1F")) return;
    try {
      const isUpstash = config.binUrl.includes("upstash.io");
      let endpoint = config.binUrl.startsWith("http") ? config.binUrl : `https://api.jsonbin.io/v3/b/${config.binUrl}/latest`;
      if (isUpstash) {
        endpoint = endpoint.replace(/\/$/, "") + "/get/gut_backup";
      }
      const headers = isUpstash ? { "Authorization": `Bearer ${config.apiKey}` } : { "X-Access-Key": config.apiKey };
      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const base64Str = isUpstash ? data.result : data.record ? data.record.payload : data.payload;
      if (!base64Str) throw new Error("\u96F2\u7AEF\u76EE\u524D\u6C92\u6709\u5099\u4EFD\u8CC7\u6599");
      const binaryStr = atob(base64Str);
      const charArray = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) charArray[i] = binaryStr.charCodeAt(i);
      const decompressed = await ungzip(charArray);
      const parsed = JSON.parse(decompressed);
      if (parsed.config) {
        const newCfg = { ...config, ...parsed.config, binUrl: config.binUrl, apiKey: config.apiKey };
        updateConfig(newCfg);
      }
      await importData(new File([new Blob([decompressed])], "cloud.json"));
    } catch (e) {
      alert("\u4E0B\u8F09\u5931\u6557\uFF1A" + e.message);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "p-5 animate-fade-in space-y-5" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-black text-gray-800 dark:text-gray-100 flex items-center gap-2" }, "\u2699\uFE0F \u7CFB\u7D71\u8A2D\u5B9A"), /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h3", { className: "text-xs font-bold text-gray-400 uppercase tracking-widest mb-3" }, "\u5B58\u6A94\u8207\u8B80\u53D6"), !hasCloud && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mb-2 px-1" }, "\u5C1A\u672A\u7D81\u5B9A\u96F2\u7AEF\uFF0C\u53EA\u6709\u63D0\u4F9B\u672C\u5730 JSON \u64CD\u4F5C\u529F\u80FD\u3002"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "glass-card p-4 rounded-2xl" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => hasCloud ? setShowLoadMenu(!showLoadMenu) : fileRef.current?.click(),
      className: "w-full flex items-center justify-between font-bold text-gray-700 dark:text-gray-200 hover-lift active:scale-[0.98] transition-all"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-xl flex items-center justify-center text-lg" }, "\u{1F4E5}"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-sm" }, "\u8B80\u53D6\u8CC7\u6599")),
    !hasCloud ? /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 text-xs font-normal" }, "\u672C\u5730") : /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, showLoadMenu ? "\u25B2" : "\u25BC")
  ), hasCloud && showLoadMenu && /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex gap-2 border-t border-gray-100 dark:border-slate-700/50 pt-3 animate-fade-in" }, /* @__PURE__ */ React.createElement("button", { onClick: () => fileRef.current?.click(), className: "flex-1 bg-gray-100 dark:bg-slate-700 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300" }, "\u5F9E\u672C\u5730\u532F\u5165"), /* @__PURE__ */ React.createElement("button", { onClick: handleCloudDownload, className: "flex-1 bg-emerald-100 dark:bg-emerald-900/40 py-2.5 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400" }, "\u5F9E\u96F2\u7AEF\u4E0B\u8F09")), /* @__PURE__ */ React.createElement("input", { ref: fileRef, type: "file", accept: ".json,.json.gz,.gz", className: "hidden", onChange: (e) => {
    e.target.files[0] && importData(e.target.files[0]);
    setShowLoadMenu(false);
  } })), /* @__PURE__ */ React.createElement("div", { className: "glass-card p-4 rounded-2xl" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => hasCloud ? setShowSaveMenu(!showSaveMenu) : exportData(),
      className: "w-full flex items-center justify-between font-bold text-gray-700 dark:text-gray-200 hover-lift active:scale-[0.98] transition-all"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-xl flex items-center justify-center text-lg" }, "\u{1F4E4}"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-sm" }, "\u5B58\u6A94\u5099\u4EFD")),
    !hasCloud ? /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 text-xs font-normal" }, "\u672C\u5730") : /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, showSaveMenu ? "\u25B2" : "\u25BC")
  ), hasCloud && showSaveMenu && /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex gap-2 border-t border-gray-100 dark:border-slate-700/50 pt-3 animate-fade-in" }, /* @__PURE__ */ React.createElement("button", { onClick: exportData, className: "flex-1 bg-gray-100 dark:bg-slate-700 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300" }, "\u532F\u51FA\u5230\u672C\u5730"), /* @__PURE__ */ React.createElement("button", { onClick: handleCloudUpload, className: "flex-1 bg-indigo-100 dark:bg-indigo-900/30 py-2.5 rounded-xl text-sm font-bold text-indigo-600 dark:text-indigo-400" }, "\u4E0A\u50B3\u5230\u96F2\u7AEF"))))), /* @__PURE__ */ React.createElement("section", { className: "glass-card rounded-2xl p-4 shadow-sm" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2" }, "\u{1F4DD} \u81EA\u8A02\u9805\u76EE ", /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 font-normal" }, "(\u6BCF\u884C\u4E00\u500B\u503C)")), /* @__PURE__ */ React.createElement(ConfigTextarea, { label: "\u9910\u5225\u540D\u7A31", value: mealText, onChange: (e) => setMealText(e.target.value), placeholder: "\u{1F305} \u65E9\u9910" }), /* @__PURE__ */ React.createElement(ConfigTextarea, { label: "\u98DF\u7269\u7A2E\u985E", value: foodText, onChange: (e) => setFoodText(e.target.value), placeholder: "\u{1F35A} \u98EF" }), /* @__PURE__ */ React.createElement(ConfigTextarea, { label: "\u91CF", value: amountText, onChange: (e) => setAmountText(e.target.value), placeholder: "\u591A" }), /* @__PURE__ */ React.createElement(ConfigTextarea, { label: "\u8ABF\u7406\u65B9\u5F0F", value: cookText, onChange: (e) => setCookText(e.target.value), placeholder: "\u70B8" }), /* @__PURE__ */ React.createElement(ConfigTextarea, { label: "\u6392\u4FBF\u91CF\u9078\u9805", value: bowelAmountText, onChange: (e) => setBowelAmountText(e.target.value), placeholder: "\u591A" }), /* @__PURE__ */ React.createElement(ConfigTextarea, { label: "\u6392\u4FBF\u72C0\u6CC1\u9078\u9805", value: bowelText, onChange: (e) => setBowelText(e.target.value), placeholder: "\u6B63\u5E38" }), /* @__PURE__ */ React.createElement("div", { className: "mb-4 pt-3 border-t border-gray-100 dark:border-slate-600" }, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 flex justify-between" }, /* @__PURE__ */ React.createElement("span", null, "\u5168\u57DF\u5B57\u9AD4\u5927\u5C0F"), /* @__PURE__ */ React.createElement("span", { className: "text-indigo-500" }, fontSizeZoom, "%")), /* @__PURE__ */ React.createElement("input", { type: "range", min: "100", max: "200", step: "5", value: fontSizeZoom, onChange: (e) => setFontSizeZoom(e.target.value), className: "w-full mb-1" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400" }, "\u76EE\u524D\u70BA\u6700\u4F4E 100%\uFF0C\u53EF\u5F80\u4E0A\u8ABF\u5927")), /* @__PURE__ */ React.createElement("div", { className: "mb-4 pt-3 border-t border-gray-100 dark:border-slate-600" }, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2" }, "\u2601\uFE0F \u96F2\u7AEF\u5099\u4EFD\u7D81\u5B9A"), /* @__PURE__ */ React.createElement("a", { href: "https://w1798.github.io/web/JsonCloudGuide", target: "_blank", className: "text-xs text-indigo-500 font-bold hover:underline" }, "\u7533\u8ACB\u8AAA\u660E\u{1F855}")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 mb-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: binUrl,
      onChange: (e) => setBinUrl(e.target.value),
      placeholder: "URL or JSONBin ID",
      className: "w-full bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-2.5 text-sm dark:text-gray-200 focus:outline-none"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "password",
      value: apiKey,
      onChange: (e) => setApiKey(e.target.value),
      placeholder: "Token or X-Access-Key",
      className: "flex-1 bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-2.5 text-sm dark:text-gray-200 focus:outline-none"
    }
  ), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setBinUrl("");
    setApiKey("");
  }, className: "px-3 rounded-xl bg-gray-200 dark:bg-slate-600 text-sm font-bold text-gray-600 dark:text-gray-300 shrink-0" }, "\u91CD\u7F6E")))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 mt-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSave,
      className: "flex-1 bg-indigo-500 text-white py-3 rounded-xl font-bold text-base shadow-lg hover:brightness-110 active:scale-[0.98] transition-all min-h-[48px]"
    },
    "\u{1F4BE} \u5132\u5B58\u8A2D\u5B9A"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleReset,
      className: "flex-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold text-base hover:brightness-95 active:scale-[0.98] transition-all min-h-[48px]"
    },
    "\u{1F504} \u56DE\u5FA9\u9805\u76EE"
  ))), /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h3", { className: "text-xs font-bold text-red-400 uppercase tracking-widest mb-3" }, "\u26A0\uFE0F \u5371\u96AA\u5340\u57DF"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSystemReset,
      className: "w-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700/50 p-4 rounded-2xl flex items-center justify-between hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-[0.98] transition-all"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-red-100 dark:bg-red-900/40 text-red-500 rounded-xl flex items-center justify-center text-lg" }, "\u{1F5D1}\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-sm text-red-600 dark:text-red-400 block" }, "\u7CFB\u7D71\u91CD\u7F6E"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-red-400" }, "\u6E05\u9664\u6240\u6709\u8CC7\u6599\uFF0C\u6062\u5FA9\u539F\u59CB\u72C0\u614B"))),
    /* @__PURE__ */ React.createElement("span", { className: "text-red-300" }, "\u25B6")
  )), /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h3", { className: "text-xs font-bold text-gray-400 uppercase tracking-widest mb-3" }, "\u95DC\u65BC"), /* @__PURE__ */ React.createElement("div", { className: "glass-card p-4 rounded-2xl space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold dark:text-gray-300" }, "\u7A0B\u5F0F\u7248\u672C"), /* @__PURE__ */ React.createElement("span", { className: "text-xs py-0.5 px-3 bg-gray-100 dark:bg-slate-700 rounded-full font-mono font-bold text-gray-500" }, "v", APP_VER)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 leading-relaxed" }, "GutTracker \u5C08\u70BA\u95DC\u5FC3\u8178\u9053\u5065\u5EB7\u7684\u4EBA\u58EB\u8A2D\u8A08\uFF0C\u900F\u904E\u7C21\u6613\u7684\u5716\u50CF\u5316\u7D00\u9304\uFF0C\u627E\u51FA\u98F2\u98DF\u8207\u8EAB\u9AD4\u53CD\u61C9\u7684\u898F\u5F8B\u3002"))));
};
