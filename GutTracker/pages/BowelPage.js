// =============================================
// 排便紀錄頁面
// =============================================
const BowelPage = () => {
    const { bowelRecords, saveBowel, deleteBowel, config } = useGut();
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
    const [amount, setAmount] = useState('適中');
    const [status, setStatus] = useState('正常');
    const [note, setNote] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const statusIcons = { '正常':'🟢','多':'🌊','少':'🌑','硬':'🪨','軟':'☁️','稀':'💧','便祕':'⏳','拉肚子':'🔥','適中':'⚖️' };
    const getIcon = (s) => statusIcons[s] || '❓';

    const handleAdd = () => {
        saveBowel({ date, time, amount, status, note, timestamp: Date.now() });
        setNote('');
        setTime(new Date().toTimeString().slice(0, 5));
        setCurrentPage(1); 
    };

    const sortedRecords = useMemo(() => [...bowelRecords].sort((a, b) => {
        const timeA = new Date(a.date + 'T' + a.time).getTime();
        const timeB = new Date(b.date + 'T' + b.time).getTime();
        return timeB - timeA;
    }), [bowelRecords]);

    const totalPages = Math.ceil(sortedRecords.length / pageSize);
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedRecords.slice(start, start + pageSize);
    }, [sortedRecords, currentPage]);

    return (
        <div className="p-4 animate-fade-in">
            <style>{`
                @media (max-width: 380px) {
                    .date-text { font-size: 10px !important; }
                    .time-tag { font-size: 10px !important; padding: 1px 4px !important; }
                }
            `}</style>
            <div className="glass-card rounded-2xl p-5 shadow-sm mb-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-gray-200">📋 新增排便紀錄</h3>
                <div className="grid grid-cols-5 gap-3 mb-4">
                    <div className="col-span-3">
                        <label className="text-xs text-gray-400 mb-1 block font-semibold">日期</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-2.5 w-full font-medium text-sm dark:text-gray-200 focus:outline-none focus:ring-2 ring-rose-400" />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs text-gray-400 mb-1 block font-semibold">時間</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)}
                            className="bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-2.5 w-full font-medium text-sm dark:text-gray-200 focus:outline-none focus:ring-2 ring-rose-400" />
                    </div>
                </div>

                <label className="text-xs text-gray-400 mb-2 block font-semibold">量</label>
                <div className="flex gap-2 mb-4">
                    {(config.bowelAmounts || ['多', '適中', '少']).map(a => (
                        <button key={a} onClick={() => setAmount(a)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${amount === a ? 'bg-rose-500 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>
                            {a}
                        </button>
                    ))}
                </div>

                <label className="text-xs text-gray-400 mb-2 block font-semibold">狀況</label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {config.bowelStatuses.map(s => (
                        <button key={s} onClick={() => setStatus(s)}
                            className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all min-h-[60px] ${status === s ? 'bg-rose-500 text-white shadow-lg scale-105 ring-2 ring-rose-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>
                            <span className="text-xl">{getIcon(s)}</span>{s}
                        </button>
                    ))}
                </div>

                <input type="text" placeholder="補充說明 (選填)..." value={note} onChange={e => setNote(e.target.value)}
                    className="bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-3 w-full mb-4 focus:ring-2 ring-rose-400 focus:outline-none text-sm dark:text-gray-200" />
                <button onClick={handleAdd}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl font-bold text-base shadow-lg hover:brightness-110 active:scale-[0.98] transition-all min-h-[48px]">💾 儲存紀錄</button>
            </div>
            
            <div className="flex items-center justify-between mb-3 px-1">
                <h4 className="text-sm font-bold text-gray-400 flex items-center gap-1">📜 歷史紀錄 ({bowelRecords.length})</h4>
            </div>

            <div className="space-y-2">
                {paginatedRecords.map(record => (
                    <div key={record.id} className="glass-card rounded-2xl p-3 flex items-center justify-between animate-slide-up">
                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xl flex-shrink-0">{getIcon(record.status)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm dark:text-gray-200 truncate mb-0.5">
                                    {record.amount || '適中'} / {record.status}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="date-text text-[11px] text-gray-400 font-medium whitespace-nowrap">
                                        {record.date} ({formatDateStr(record.date)})
                                    </div>
                                    <span className="time-tag text-[10px] bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-rose-500 font-bold shrink-0">{record.time}</span>
                                </div>
                                {record.note && <div className="text-[11px] text-gray-500 mt-1 italic truncate opacity-70">💬 {record.note}</div>}
                            </div>
                        </div>
                        <button onClick={() => { if(confirm('確定刪除此紀錄？')) deleteBowel(record.id); }}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 flex-shrink-0 ml-1">✕</button>
                    </div>
                ))}
                
                {totalPages > 1 && (
                    <div className="flex gap-2 pt-4">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(v => v - 1)}
                            className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm font-bold text-gray-500 disabled:opacity-30 transition-all">← 上一頁</button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(v => v + 1)}
                            className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm font-bold text-gray-500 disabled:opacity-30 transition-all">下一頁 →</button>
                    </div>
                )}

                {sortedRecords.length === 0 && (
                    <div className="py-10 text-center text-gray-300"><p className="text-sm">尚未有紀錄</p></div>
                )}
            </div>
        </div>
    );
};
