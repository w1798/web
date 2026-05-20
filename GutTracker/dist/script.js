const Layout = ({ children, activeTab, setActiveTab }) => {
  const { darkMode, setDarkMode } = useGut();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const mainRef = React.useRef(null);
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
      setShowBackToTop(false);
    }
  }, [activeTab]);
  const handleScroll = (e) => {
    const container = e.target;
    setShowBackToTop(container.scrollTop > 100);
  };
  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const tabs = [
    { id: "diet", icon: "\u{1F37D}\uFE0F", label: "\u98F2\u98DF" },
    { id: "bowel", icon: "\u{1F6BD}", label: "\u6392\u4FBF" },
    { id: "analysis", icon: "\u26A1", label: "\u5206\u6790" },
    { id: "settings", icon: "\u2699\uFE0F", label: "\u8A2D\u5B9A" }
  ];
  return /* @__PURE__ */ React.createElement("div", { className: "h-[100dvh] flex flex-col max-w-md mx-auto relative bg-slate-100 dark:bg-slate-900 transition-colors shadow-2xl overflow-hidden" }, /* @__PURE__ */ React.createElement("header", { className: "px-4 py-2 flex justify-between items-center sticky top-0 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md z-40 border-b border-gray-200 dark:border-slate-700" }, /* @__PURE__ */ React.createElement("h1", { className: "text-xl font-bold bg-gradient-to-r from-indigo-500 to-rose-500 bg-clip-text text-transparent flex items-center gap-2" }, "\u9806\u66A2\u65E5\u8A18"), /* @__PURE__ */ React.createElement("button", { onClick: () => setDarkMode(!darkMode), className: "w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-lg" }, darkMode ? "\u2600\uFE0F" : "\u{1F319}")), /* @__PURE__ */ React.createElement("main", { ref: mainRef, onScroll: handleScroll, className: "flex-1 overflow-y-auto pb-24" }, children), /* @__PURE__ */ React.createElement("nav", { className: "fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[calc(448px-2rem)] bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-lg border border-gray-200 dark:border-slate-700 px-4 py-1 flex justify-around items-center z-50 rounded-2xl shadow-xl" }, tabs.map((tab) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: tab.id,
      onClick: () => setActiveTab(tab.id),
      className: `flex flex-col items-center gap-0 px-3 py-1 rounded-xl transition-all ${activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 scale-105" : "text-gray-400 dark:text-gray-500"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-xl" }, tab.icon),
    /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold" }, tab.label)
  ))), showBackToTop && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: scrollToTop,
      className: "absolute bottom-16 right-6 w-10 h-10 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm z-[60] transition-all hover:scale-110 active:scale-95 text-xl cursor-pointer"
    },
    "\u2191"
  ), /* @__PURE__ */ React.createElement("footer", null));
};
const App = () => {
  const [activeTab, setActiveTab] = useState("diet");
  const { loading } = useGut();
  useEffect(() => {
    if (!loading && window.updateLoading) {
      window.updateLoading(100, "\u5C31\u7DD2");
    }
  }, [loading]);
  if (loading) {
    return /* @__PURE__ */ React.createElement("div", { className: "h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" }), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-400" }, "\u8F09\u5165\u4E2D..."));
  }
  return /* @__PURE__ */ React.createElement(Layout, { activeTab, setActiveTab }, activeTab === "diet" && /* @__PURE__ */ React.createElement(DietPage, null), activeTab === "bowel" && /* @__PURE__ */ React.createElement(BowelPage, null), activeTab === "analysis" && /* @__PURE__ */ React.createElement(AnalysisPage, null), activeTab === "settings" && /* @__PURE__ */ React.createElement(SettingsPage, null));
};
const mountApp = () => {
  const rootElement = document.getElementById("root");
  if (rootElement && typeof ReactDOM !== "undefined") {
    const root = ReactDOM.createRoot(rootElement);
    root.render(/* @__PURE__ */ React.createElement(GutProvider, null, /* @__PURE__ */ React.createElement(App, null)));
  }
};
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountApp);
} else {
  mountApp();
}
