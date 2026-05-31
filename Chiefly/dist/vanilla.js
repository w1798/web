const STORAGE_KEY="everyone_is_leader_data",DEFAULT_SHEET_CONTENT={settings:{jobsText:`\u73ED\u9577
\u526F\u73ED\u9577
\u51B7\u6C23\u9577
\u98A8\u7D00\u80A1\u9577,2
\u885B\u751F\u80A1\u9577
\u5B78\u85DD\u80A1\u9577
\u9AD4\u80B2\u80A1\u9577
\u8CC7\u8A0A\u9577
\u74B0\u4FDD\u6AA2\u67E5\u54E1
\u5716\u66F8\u7BA1\u7406\u54E1`,studentsText:Array.from({length:30},(n,e)=>(e+1).toString().padStart(2,"0")).join(`
`)},activeJobs:[],assignments:{},hiddenJobIds:[],gridCols:6,jobTitleSize:1.2,tagSize:1.25,assignmentTagSize:.85,isMultiSelect:!0,theme:"theme-dark"},ChieflyLogic={STORAGE_KEY,initState(){const n=localStorage.getItem(STORAGE_KEY);if(!n){const e={...DEFAULT_SHEET_CONTENT,id:"sheet_"+Date.now(),name:"\u9810\u8A2D\u5DE5\u4F5C\u8868"};return e.activeJobs=this.parseJobs(e.settings.jobsText),{currentSheetId:e.id,sheets:[e]}}try{const e=JSON.parse(n);if(e.settings&&!e.sheets){const r={...DEFAULT_SHEET_CONTENT,...e,id:"sheet_migrated",name:"\u820A\u7248\u5DE5\u4F5C\u8868"};return{currentSheetId:r.id,sheets:[r]}}const t={currentSheetId:e.currentSheetId||"",sheets:e.sheets||[]};if(t.sheets.length===0){const r={...DEFAULT_SHEET_CONTENT,id:"sheet_"+Date.now(),name:"\u9810\u8A2D\u5DE5\u4F5C\u8868"};r.activeJobs=this.parseJobs(r.settings.jobsText),t.sheets.push(r),t.currentSheetId=r.id}else(!t.currentSheetId||!t.sheets.find(r=>r.id===t.currentSheetId))&&(t.currentSheetId=t.sheets[0].id);return t}catch(e){console.error("Failed to parse saved data",e);const t={...DEFAULT_SHEET_CONTENT,id:"sheet_err_"+Date.now(),name:"\u4FEE\u5FA9\u5F8C\u5DE5\u4F5C\u8868"};return{currentSheetId:t.id,sheets:[t]}}},saveState(n){localStorage.setItem(STORAGE_KEY,JSON.stringify(n))},resetStorage(){localStorage.removeItem(STORAGE_KEY),location.reload()},async exportData(n){const e=JSON.stringify(n,null,4);try{if(typeof CompressionStream<"u"){const t=new Blob([e]).stream().pipeThrough(new CompressionStream("gzip"));return await new Response(t).arrayBuffer()}else if(window.pako)return window.pako.gzip(e).buffer}catch(t){return console.error("Export failed",t),new TextEncoder().encode(e).buffer}},async importData(n){let e;typeof n=="string"?e=this.fromBase64(n):e=n;const t=new Uint8Array(e),r=t[0]===31&&t[1]===139;let i="";if(r)if(typeof DecompressionStream<"u"){const o=new Blob([e]).stream().pipeThrough(new DecompressionStream("gzip"));i=await new Response(o).text()}else if(window.pako)i=window.pako.ungzip(t,{to:"string"});else throw new Error("\u6B64\u74B0\u5883\u4E0D\u652F\u63F4 GZIP\uFF0C\u8ACB\u4F7F\u7528\u73FE\u4EE3\u700F\u89BD\u5668");else i=new TextDecoder().decode(t);try{return JSON.parse(i)}catch(o){throw new Error("JSON \u89E3\u6790\u5931\u6557: "+o.message)}},toBase64(n){let e="";const t=new Uint8Array(n);for(let r=0;r<t.byteLength;r++)e+=String.fromCharCode(t[r]);return btoa(e)},fromBase64(n){const e=atob(n),t=e.length,r=new Uint8Array(t);for(let i=0;i<t;i++)r[i]=e.charCodeAt(i);return r.buffer},parseJobs(n){return n.split(`
`).map(e=>e.trim()).filter(e=>e.length>0).map((e,t)=>{const r=e.match(/^(.+?)(?:[,:*]\s*(\d+))?$/);return r?{id:`job_${Date.now()}_${t}`,name:r[1].trim(),maxQuota:parseInt(r[2]||"1",10)}:{id:`job_${Date.now()}_${t}`,name:e,maxQuota:1}})},parseStudents(n){return n.split(`
`).map(e=>e.trim()).filter(e=>e.length>0)},shuffle(n){const e=[...n];for(let t=e.length-1;t>0;t--){const r=Math.floor(Math.random()*(t+1));[e[t],e[r]]=[e[r],e[t]]}return e},smartAllocate(n,e,t={}){const r=Object.values(t).flat(),i=e.filter(s=>!r.includes(s));let o=this.shuffle(i),d=JSON.parse(JSON.stringify(t));n.forEach(s=>{d[s.id]||(d[s.id]=[])});let l=n.reduce((s,a)=>{const h=(d[a.id]||[]).length;return s+Math.max(0,a.maxQuota-h)},0),c=n.map(s=>{const a=(d[s.id]||[]).length;return{...s,remaining:Math.max(0,s.maxQuota-a)}});if(l<o.length){let s=o.length-l;for(let a=0;a<s;a++)c[a%c.length].remaining+=1}let f=[];return c.forEach(s=>{for(let a=0;a<s.remaining;a++)f.push(s.id)}),f=this.shuffle(f),o.forEach((s,a)=>{f[a]&&d[f[a]].push(s)}),d},generateWordDoc(n){const e=n.activeJobs.filter(o=>!n.hiddenJobIds.includes(o.id)),t=n.gridCols||6;let r=`
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>${n.name}</title>
            <style>
                table { border-collapse: collapse; width: 100%; border: 1px solid black; table-layout: fixed; }
                th, td { border: 1px solid black; padding: 10px; text-align: center; vertical-align: top; word-wrap: break-word; }
                .job-name { font-weight: bold; background-color: #f2f2f2; font-size: 14pt; }
                .students { font-size: 12pt; }
                h1 { text-align: center; font-family: "Microsoft JhengHei", "PMingLiU", sans-serif; }
            </style>
            </head>
            <body>
                <h1>\u5404\u53F8\u5176\u8077 \u5206\u914D\u8868 - ${n.name}</h1>
                <table>
        `;for(let o=0;o<e.length;o+=t){const d=e.slice(o,o+t);r+="<tr>",d.forEach(l=>{r+=`<td class="job-name">${l.name}</td>`});for(let l=d.length;l<t;l++)r+="<td></td>";r+="</tr>",r+="<tr>",d.forEach(l=>{const c=(n.assignments[l.id]||[]).join(", ");r+=`<td class="students">${c}</td>`});for(let l=d.length;l<t;l++)r+="<td></td>";r+="</tr>",r+="<tr style='height: 15px;'><td colspan='"+t+"' style='border:none;'></td></tr>"}return r+=`
                </table>
            </body>
            </html>
        `,new Blob(["\uFEFF",r],{type:"application/msword"})}};window.ChieflyLogic=ChieflyLogic;
