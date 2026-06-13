const E_MAG_STORAGE_KEY="e_magazine_app_data",DefaultData={classInfo:"305",teacherName:"許美麗",poetryTeacher:"指導 許美麗 師",studentNames:"",batchNos:"",workTitles:"",modeOption:"C",modeB_Prefix:"生活花絮",modeB_Digits:3,modeB_Count:10,sortOrder:"time_asc",manualInput:"",nameTemplate:"{class}-{no}-{student}-{work}-指導老師-{teacher}",authorSpaces:60},Logic={initData(){const a=localStorage.getItem(E_MAG_STORAGE_KEY);if(!a)return{...DefaultData};try{const n=JSON.parse(a);return{...DefaultData,...n}}catch{return{...DefaultData}}},saveData(a){localStorage.setItem(E_MAG_STORAGE_KEY,JSON.stringify(a))},resetData(){return localStorage.removeItem(E_MAG_STORAGE_KEY),{...DefaultData}},padNumber(a,n){let r=a+"";for(;r.length<n;)r="0"+r;return r},processModeB(a,n,r){const m=[];for(let f=1;f<=n;f++)m.push(`${a}${this.padNumber(f,r)}`);return m},getStudentMap(a){const n=a.split(`
`),r={};return n.forEach((m,f)=>{const _=f+1,l=m.trim();l&&(r[_]=l)}),r},applyTemplate(a,n){return a.replace(/\{class\}/g,n.class||"").replace(/\{no\}/g,n.no||"").replace(/\{student\}/g,n.student||"").replace(/\{work\}/g,n.work||"").replace(/\{teacher\}/g,n.teacher||"")},generateFinalFilenames(a){const{classInfo:n,teacherName:r,studentNames:m,workTitles:f,batchNos:_,nameTemplate:l}=a,e=l||"{class}-{no}-{student}-{work}-指導老師-{teacher}",h=this.getStudentMap(m),N=(_||"").split(`
`).map(s=>s.trim()).filter(s=>s!==""),c=(f||"").split(`
`).map(s=>s.trim()).filter(s=>s!=="");return N.length===0?Object.keys(h).map((s,g)=>this.applyTemplate(e,{class:n,no:this.padNumber(s,2),student:h[s],work:c.length===1?c[0]:c[g]||"未具名作品",teacher:r})):N.map((s,g)=>{const x=s.split(/[,\s_]+/).map(d=>d.trim()).filter(d=>d!==""),u=[],O=[];return x.forEach(d=>{const b=parseInt(d);isNaN(b)||(u.push(this.padNumber(b,2)),O.push(h[b]||"未知姓名"))}),this.applyTemplate(e,{class:n,no:u.join("_"),student:O.join("_"),work:c.length===1?c[0]:c[g]||"未具名作品",teacher:r})})},downloadTxt(a,n){const r=document.createElement("a");r.setAttribute("href","data:text/plain;charset=utf-8,"+encodeURIComponent(n)),r.setAttribute("download",a),r.style.display="none",document.body.appendChild(r),r.click(),document.body.removeChild(r)},generateRenameBat(a,n,r,m="time_asc"){if(a.length===0)return;const _={time_asc:"/o:d",time_desc:"/o:-d",name_asc:"/o:n",name_desc:"/o:-n"}[m]||"/o:d",l="undo_還原.bat";let e=`@echo off\r
`;e+=`chcp 65001 >nul\r
`,e+=`setlocal enabledelayedexpansion\r
`,e+=`set "UNDO=${l}"\r
`,e+=`if not exist "!UNDO!" goto :START_RENAME\r
`,e+=`echo.\r
`,e+=`echo [錯誤] 偵測到 "!UNDO!" 已存在！\r
`,e+=`echo.\r
`,e+=`echo 這代表您可能已經執行過改名，或此目錄已有改名記錄。\r
`,e+=`echo.\r
`,e+=`echo 為防範重複改名導致原始檔名遺失，請先執行 "!UNDO!" 或手動移除 "!UNDO!" 再繼續。\r
`,e+=`echo.\r
`,e+=`echo 按任意鍵結束...\r
`,e+=`pause >nul\r
`,e+=`exit /b\r
`,e+=`:START_RENAME\r
\r
`,e+=`echo @echo off > !UNDO!\r
`,e+=`echo chcp 65001 ^>nul >> !UNDO!\r
`,a.forEach((s,g)=>{let x=s.replace(/([&|<>^])/g,"^$1");e+=`set "name_${g+1}=${x}"\r
`}),e+=`set "idx=1"\r
`,e+=`for /f "delims=" %%F in ('dir /b ${_} *.*') do (\r
`,e+=`if /i "%%~xF" NEQ ".bat" (\r
`,e+=`set "current_idx=!idx!"\r
`,e+=`for /f "delims=" %%A in ("!current_idx!") do (\r
`,e+=`if defined name_%%A (\r
`,e+=`set "newname=!name_%%A!"\r
`,e+=`echo [%%F] 已變更為 [!newname!%%~xF]\r
`,e+=`echo ren "!newname!%%~xF" "%%~nxF" ^>nul >> !UNDO!\r
`,e+=`ren "%%F" "!newname!%%~xF"\r
`,e+=`set /a idx+=1\r
`,e+=`)\r
)\r
)\r
)\r
`,e+=`echo echo. >> !UNDO!\r
`,e+=`echo echo 還原完畢。按任意鍵結束... >> !UNDO!\r
`,e+=`echo pause ^>nul >> !UNDO!\r
`,e+=`echo.\r
`,e+=`echo 修改完畢。按任意鍵結束...\r
`,e+=`pause >nul\r
`;let h="run_rename.bat";n==="A"?h="run_rename_全手動.bat":n==="B"?h="run_rename_流水號.bat":n==="C"&&(h=`run_rename_${r||""}格式化.bat`);const N=new Blob([e],{type:"text/plain;charset=utf-8"}),c=document.createElement("a");c.href=URL.createObjectURL(N),c.download=h,c.click(),URL.revokeObjectURL(c.href)},generatePoetryWord(a,n="",r="",m=60){if(!a.trim())return;const{Document:f,Packer:_,Paragraph:l,TextRun:e,AlignmentType:h}=docx,N="標楷體",c=24,s=360,g=1134,x=" ".repeat(Math.max(0,m)),u=a.split(`
`).map(t=>t.trim()),O=t=>/^\d+$/.test(t),d=new Array(u.length).fill(0);for(let t=0;t<u.length;t++)if(O(u[t])){d[t]=2,t-1>=0&&(d[t-1]=1);let i=t+1;i<u.length&&u[i]!==""&&(d[i]=3);let o=t+2;o<u.length&&u[o]!==""&&(d[o]=4)}const b=[];let p=null;for(let t=0;t<u.length;t++){let i=u[t],o=d[t];if(o===1){p&&b.push(p),p={title:i,classNum:"",author:"",teacher:"",lines:[]};continue}p||(p={title:"",classNum:"",author:"",teacher:"",lines:[]}),o===2?p.classNum=i:o===3?p.author=i:o===4?p.teacher=i:p.lines.push(i)}p&&b.push(p);const w=[];b.forEach((t,i)=>{if(!t.title&&!t.classNum&&!t.author&&!t.teacher&&t.lines.length===0)return;!t.teacher&&n&&(t.teacher=`${n}`),t.title&&w.push(new l({alignment:h.CENTER,spacing:{line:s,before:i===0?120:480,after:120},children:[new e({text:t.title,font:N,size:c,bold:!0})]})),[t.classNum,t.author,t.teacher].forEach(E=>{E&&w.push(new l({alignment:h.LEFT,children:[new e({text:x+E,font:N,size:c})]}))}),w.push(new l({spacing:{line:s}}));let o=t.lines;for(;o.length>0&&o[0]==="";)o.shift();for(;o.length>0&&o[o.length-1]==="";)o.pop();o.forEach(E=>{E===""?w.push(new l({spacing:{line:s}})):w.push(new l({alignment:h.LEFT,spacing:{line:s,before:60,after:60},children:[new e({text:"  "+E.replace(/^[  ]+/,""),font:N,size:c})]}))})});const D=new f({sections:[{properties:{page:{margin:{top:g,bottom:g,left:g,right:g}}},children:w}]});_.toBlob(D).then(t=>{const i=r?r.replace(/\.docx$/i,""):"童詩合輯";window.saveAs(t,`${i}_完成.docx`)})}};window.EMagLogic=Logic;
