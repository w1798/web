const E_MAG_STORAGE_KEY="e_magazine_app_data",Logic={STORAGE_KEY:E_MAG_STORAGE_KEY,PoetryDefaults:{fontSizeTitle:18,fontSizeAuthor:12,fontSizeContent:14,authorSpaces:60,enablePageBreak:!0,emptyLineBetweenParagraphs:!0,spacingEssay:1.5,spacingPoetry:1.5,spacingReview:1.5,poetryTeacher:"指導 許美麗 師"},initData(){const a=localStorage.getItem(this.STORAGE_KEY),s={classInfo:"305",teacherName:"許美麗",studentNames:"",batchNos:"",workTitles:"",modeOption:"C",modeB_Prefix:"生活花絮",modeB_Digits:3,modeB_Count:10,sortOrder:"time_asc",manualInput:"",nameTemplate:"{class}-{no}-{student}-{work}-指導老師-{teacher}",...this.PoetryDefaults};if(!a)return s;try{const n=JSON.parse(a);return{...s,...n}}catch{return s}},saveData(a){localStorage.setItem(this.STORAGE_KEY,JSON.stringify(a))},resetData(){return localStorage.removeItem(this.STORAGE_KEY),this.initData()},padNumber(a,s){let n=a+"";for(;n.length<s;)n="0"+n;return n},processModeB(a,s,n){const o=[];for(let i=1;i<=s;i++)o.push(`${a}${this.padNumber(i,n)}`);return o},getStudentMap(a){const s=a.split(`
`),n={};return s.forEach((o,i)=>{const t=i+1,N=o.trim();N&&(n[t]=N)}),n},applyTemplate(a,s){return a.replace(/\{class\}/g,s.class||"").replace(/\{no\}/g,s.no||"").replace(/\{student\}/g,s.student||"").replace(/\{work\}/g,s.work||"").replace(/\{teacher\}/g,s.teacher||"")},generateFinalFilenames(a){const{classInfo:s,teacherName:n,studentNames:o,workTitles:i,batchNos:t,nameTemplate:N}=a,h=N||"{class}-{no}-{student}-{work}-指導老師-{teacher}",d=this.getStudentMap(o),w=(t||"").split(`
`).map(e=>e.trim()).filter(e=>e!==""),u=(i||"").split(`
`).map(e=>e.trim()).filter(e=>e!=="");if(w.length===0)return Object.keys(d).map(e=>{const c=parseInt(e),E=d[c]||"未知",y=u.length===1?u[0]:u[c-1]||"作品";return this.applyTemplate(h,{class:s,no:this.padNumber(c,2),student:E,work:y,teacher:n})});const f=[];return w.forEach((e,c)=>{const E=(e||"").split(/[,,，]/).map(b=>b.trim()).filter(b=>b!==""),y=u.length===1?u[0]:u[c]||u[u.length-1]||"作品";E.forEach(b=>{const T=parseInt(b),x=d[T]||"請在最左邊「學生姓名」輸入資料";f.push(this.applyTemplate(h,{class:s,no:this.padNumber(T,2),student:x,work:y,teacher:n}))})}),f},generateRenameBat(a,s,n,o){const i="undo_還原.bat";let t=`@echo off\r
`;t+=`chcp 65001 >nul\r
`,t+=`setlocal enabledelayedexpansion\r
`,t+=`set "UNDO=${i}"\r
`,t+=`if not exist "!UNDO!" goto :START_RENAME\r
`,t+=`echo.\r
`,t+=`echo [錯誤] 偵測到 "!UNDO!" 已存在！\r
`,t+=`echo.\r
`,t+=`echo 按任意鍵結束...\r
`,t+=`pause >nul\r
`,t+=`exit /b\r
`,t+=`:START_RENAME\r
\r
`,t+=`echo @echo off > !UNDO!\r
`,t+=`echo chcp 65001 ^>nul >> !UNDO!\r
`;const h=`dir /b ${{time_asc:"/od",time_desc:"/o-d",name_asc:"/on",name_desc:"/o-n"}[o]||"/od"}`;t+=`set "i=0"\r
`,t+=`for /f "delims=" %%f in ('${h}') do (\r
`,t+=`    set "skip=0"\r
`,t+=`    if "%%f"=="run_rename.bat" set "skip=1"\r
`,t+=`    if "%%f"=="!UNDO!" set "skip=1"\r
`,t+=`    if "!skip!"=="0" (\r
`,t+=`        set /a "i+=1"\r
`,a.forEach((w,u)=>{t+=`        if "!i!"=="${u+1}" (\r
`,t+=`            set "ext=%%~xf"\r
`,t+=`            echo ren "${w}!ext!" "%%f" >> !UNDO!\r
`,t+=`            ren "%%f" "${w}!ext!"\r
`,t+=`        )\r
`}),t+=`    )\r
`,t+=`)\r
`,t+=`echo.\r
`,t+=`echo 改名完成！\r
`,t+=`pause\r
`;const d=new Blob([t],{type:"text/plain"});window.saveAs(d,"run_rename.bat")},generatePoetryWord(a,s,n,o,i){const t=Number(i.fontSizeTitle)||18,N=Number(i.fontSizeAuthor)||12,h=Number(i.fontSizeContent)||16,d=!!i.enablePageBreak,w=Number(i.spacingEssay)||1.5,u=Number(i.spacingPoetry)||1.5,f=Number(i.spacingReview)||1.5,e=i.emptyLineBetweenParagraphs!==void 0?!!i.emptyLineBetweenParagraphs:!0,{Document:c,Packer:E,Paragraph:y,TextRun:b,AlignmentType:T,PageBreak:x}=window.docx,O="標楷體",P={作文:1,童詩:2,心得:3},m=a.split(`
`).map(r=>r.trim()),R=[];let $="作文";for(let r=0;r<m.length;r++){const g=m[r];if(g.startsWith("[類型:")){const p=g.match(/\[類型:\s*(.+?)\]/);p&&($=p[1]);continue}if(/^\d{4,5}$/.test(g)&&r>0){const p={type:$,title:m[r-1],id:g,name:m[r+1]||"",teacher:m[r+2]&&m[r+2]!==""?m[r+2]:s||"",contentLines:[]};let l=r+3;for(;l<m.length&&!(m[l+1]&&/^\d{4,5}$/.test(m[l+1]));)m[l]!==""&&!m[l].startsWith("[類型:")&&p.contentLines.push(m[l]),l++;R.push(p),r=l-1}}R.sort((r,g)=>{const p=P[r.type]||99,l=P[g.type]||99;return p!==l?p-l:parseInt(r.id)-parseInt(g.id)});const S=[];R.forEach((r,g)=>{g>0&&d&&S.push(new y({children:[new x]}));let p=r.type;const l=r.title;l.includes("詩")?p="童詩":l.includes("心得")||l.includes("讀後")?p="心得":l.includes("作文")&&(p="作文");let _=1.5;p==="作文"?_=w:p==="童詩"?_=u:p==="心得"&&(_=f);const A=Math.round(h*_*20);S.push(new y({alignment:T.CENTER,spacing:{before:400,after:400},children:[new b({text:r.title,size:t*2,bold:!0,font:O})]}));const L=" ".repeat(Math.max(0,o));[r.id,r.name,r.teacher].forEach(D=>{S.push(new y({alignment:T.LEFT,children:[new b({text:L+D,size:N*2,font:O})]}))}),S.push(new y({spacing:{line:A,lineRule:"exact"}})),r.contentLines.forEach((D,k)=>{const z=k===r.contentLines.length-1;S.push(new y({indent:{firstLine:480},spacing:{line:A,lineRule:"exact"},children:[new b({text:D,size:h*2,font:O})]})),e&&!z&&S.push(new y({spacing:{line:A,lineRule:"exact"}}))})});const B=new c({sections:[{children:S}]});E.toBlob(B).then(r=>{const g=n?n.replace(/\.[^/.]+$/,""):"文選合輯";window.saveAs(r,`${g}_排版完成.docx`)})},async processGoogleFormZip(a){if(!window.JSZip||!a)return null;const s=await window.JSZip.loadAsync(a),n=Object.values(s.files).find(i=>i.name.toLowerCase().endsWith(".csv"));if(!n)return null;const o=await n.async("string");return this.parseGoogleCsv(o)},parseGoogleCsv(a){const s=[];let n=[],o="",i=!1;for(let e=0;e<a.length;e++){const c=a[e],E=a[e+1];i?c==='"'&&E==='"'?(o+='"',e++):c==='"'?i=!1:o+=c:c==='"'?i=!0:c===","?(n.push(o),o=""):c===`
`||c==="\r"?(c==="\r"&&E===`
`&&e++,n.push(o),s.push(n),n=[],o=""):o+=c}if((o||n.length>0)&&(n.push(o),s.push(n)),s.length<2)return"";const t=s[0].map(e=>(e||"").trim()),N=s.slice(1),h=e=>t.findIndex(c=>(c||"").split(/[\s,，\(\（]/)[0]===e),d={type:h("類型"),title:h("題目"),name:h("姓名"),id:h("學號"),content:h("內容")},w={作文:1,童詩:2,心得:3},u=N.map(e=>({type:(e[d.type]||"作文").trim(),title:(e[d.title]||"").trim(),name:(e[d.name]||"").trim(),id:(e[d.id]||"").trim(),content:(e[d.content]||"").trim()})).filter(e=>e.content!==""||e.title!=="").sort((e,c)=>(w[e.type]||99)-(w[c.type]||99));let f="";return u.forEach(e=>{f+=`[類型: ${e.type}]
`,f+=`${e.title||"無題目"}
`,f+=`${e.id||"0000"}
`,f+=`${e.name||"無姓名"}

`,f+=`${e.content}


`}),f}};window.EMagLogic=Logic;
