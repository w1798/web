const E_MAG_STORAGE_KEY="e_magazine_app_data",DefaultData={classInfo:"305",teacherName:"許美麗",poetryTeacher:"",studentNames:"",batchSeats:"",workTitles:"",modeOption:"C",modeB_Prefix:"生活花絮",modeB_Digits:3,modeB_Count:10,sortOrder:"time_asc",manualInput:""},Logic={initData(){const r=localStorage.getItem(E_MAG_STORAGE_KEY);if(!r)return{...DefaultData};try{const a=JSON.parse(r);return{...DefaultData,...a}}catch{return{...DefaultData}}},saveData(r){localStorage.setItem(E_MAG_STORAGE_KEY,JSON.stringify(r))},resetData(){return localStorage.removeItem(E_MAG_STORAGE_KEY),{...DefaultData}},padNumber(r,a){let n=r+"";for(;n.length<a;)n="0"+n;return n},processModeB(r,a,n){const f=[];for(let p=1;p<=a;p++)f.push(`${r}${this.padNumber(p,n)}`);return f},getStudentMap(r){const a=r.split(`
`),n={};return a.forEach((f,p)=>{const m=p+1,u=f.trim();u&&(n[m]=u)}),n},generateFinalFilenames(r){const{classInfo:a,teacherName:n,studentNames:f,workTitles:p,batchSeats:m}=r,u=this.getStudentMap(f),t=(m||"").split(`
`).map(s=>s.trim()).filter(s=>s!==""),l=(p||"").split(`
`).map(s=>s.trim()).filter(s=>s!=="");return t.length===0?Object.keys(u).map((s,h)=>{const g=this.padNumber(s,2),_=u[s],c=l.length===1?l[0]:l[h]||"未具名作品";return`${a}-${g}-${_}-${c}-指導老師-${n}`}):t.map((s,h)=>{const g=s.split(/[,\s_]+/).map(i=>i.trim()).filter(i=>i!==""),_=[],c=[];g.forEach(i=>{const N=parseInt(i);isNaN(N)||(_.push(this.padNumber(N,2)),c.push(u[N]||"未知姓名"))});const $=_.join("_"),b=c.join("_"),w=l.length===1?l[0]:l[h]||"未具名作品";return`${a}-${$}-${b}-${w}-指導老師-${n}`})},downloadTxt(r,a){const n=document.createElement("a");n.setAttribute("href","data:text/plain;charset=utf-8,"+encodeURIComponent(a)),n.setAttribute("download",r),n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n)},generateRenameBat(r,a,n,f="time_asc"){if(r.length===0)return;const m={time_asc:"/o:d",time_desc:"/o:-d",name_asc:"/o:n",name_desc:"/o:-n"}[f]||"/o:d",u="undo_還原.bat";let t=`@echo off\r
`;t+=`@chcp 65001 >nul\r
`,t+=`@setlocal enabledelayedexpansion\r
`,t+=`@set "UNDO=${u}"\r
`,t+=`@echo @echo off > !UNDO!\r
`,t+=`@echo chcp 65001 ^>nul >> !UNDO!\r
`,r.forEach((g,_)=>{let c=g.replace(/([&|<>^])/g,"^$1");t+=`@set "name_${_+1}=${c}"\r
`}),t+=`@set "idx=1"\r
`,t+=`@for /f "delims=" %%F in ('dir /b ${m} *.*') do (\r
`,t+=`@if /i "%%~xF" NEQ ".bat" (\r
`,t+=`@set "current_idx=!idx!"\r
`,t+=`@for /f "delims=" %%A in ("!current_idx!") do (\r
`,t+=`@if defined name_%%A (\r
`,t+=`@set "newname=!name_%%A!"\r
`,t+=`@echo [%%F] 已變更為 [!newname!%%~xF]\r
`,t+=`@echo ren "!newname!%%~xF" "%%~nxF" ^>nul >> !UNDO!\r
`,t+=`@ren "%%F" "!newname!%%~xF"\r
`,t+=`@set /a idx+=1\r
`,t+=`)\r
)\r
)\r
)\r
`,t+=`@echo echo. >> !UNDO!\r
`,t+=`@echo echo 還原完畢。按任意鍵結束... >> !UNDO!\r
`,t+=`@echo pause ^>nul >> !UNDO!\r
`,t+=`@echo.\r
`,t+=`@echo 修改完畢。按任意鍵結束...\r
`,t+=`@pause >nul\r
`;let l="run_rename.bat";a==="A"?l="run_rename_全手動.bat":a==="B"?l="run_rename_流水號.bat":a==="C"&&(l=`run_rename_${n||""}格式化.bat`);const s=new Blob([t],{type:"text/plain;charset=utf-8"}),h=document.createElement("a");h.href=URL.createObjectURL(s),h.download=l,h.click(),URL.revokeObjectURL(h.href)},generatePoetryWord(r,a="",n=""){if(!r.trim())return;const{Document:f,Packer:p,Paragraph:m,TextRun:u,AlignmentType:t}=docx,l="標楷體",s=24,h=360,g=1134,_=" ".repeat(60),c=r.split(`
`).map(e=>e.trim()),$=e=>/^\d+$/.test(e),b=new Array(c.length).fill(0);for(let e=0;e<c.length;e++)if($(c[e])){b[e]=2,e-1>=0&&(b[e-1]=1);let d=e+1;d<c.length&&c[d]!==""&&(b[d]=3);let o=e+2;o<c.length&&c[o]!==""&&(b[o]=4)}const w=[];let i=null;for(let e=0;e<c.length;e++){let d=c[e],o=b[e];if(o===1){i&&w.push(i),i={title:d,classNum:"",author:"",teacher:"",lines:[]};continue}i||(i={title:"",classNum:"",author:"",teacher:"",lines:[]}),o===2?i.classNum=d:o===3?i.author=d:o===4?i.teacher=d:i.lines.push(d)}i&&w.push(i);const N=[];w.forEach((e,d)=>{if(!e.title&&!e.classNum&&!e.author&&!e.teacher&&e.lines.length===0)return;!e.teacher&&a&&(e.teacher=`指導 ${a} 老師`),e.title&&N.push(new m({alignment:t.CENTER,spacing:{line:h,before:d===0?120:480,after:120},children:[new u({text:e.title,font:l,size:s,bold:!0})]})),[e.classNum,e.author,e.teacher].forEach(x=>{x&&N.push(new m({alignment:t.LEFT,children:[new u({text:_+x,font:l,size:s})]}))}),N.push(new m({spacing:{line:h}}));let o=e.lines;for(;o.length>0&&o[0]==="";)o.shift();for(;o.length>0&&o[o.length-1]==="";)o.pop();o.forEach(x=>{x===""?N.push(new m({spacing:{line:h}})):N.push(new m({alignment:t.LEFT,spacing:{line:h,before:60,after:60},children:[new u({text:"  "+x.replace(/^[  ]+/,""),font:l,size:s})]}))})});const E=new f({sections:[{properties:{page:{margin:{top:g,bottom:g,left:g,right:g}}},children:N}]});p.toBlob(E).then(e=>{const d=n?n.replace(/\.docx$/i,""):"童詩合輯";window.saveAs(e,`${d}_完成.docx`)})}};window.EMagLogic=Logic;
