const E_MAG_STORAGE_KEY="e_magazine_app_data",DefaultData={classInfo:"305",teacherName:"許美麗",poetryTeacher:"指導 許美麗 師",studentNames:"",batchNos:"",workTitles:"",modeOption:"C",modeB_Prefix:"生活花絮",modeB_Digits:3,modeB_Count:10,sortOrder:"time_asc",manualInput:"",nameTemplate:"{class}-{no}-{student}-{work}-指導老師-{teacher}",authorSpaces:60},Logic={initData(){const a=localStorage.getItem(E_MAG_STORAGE_KEY);if(!a)return{...DefaultData};try{const n=JSON.parse(a);return{...DefaultData,...n}}catch{return{...DefaultData}}},saveData(a){localStorage.setItem(E_MAG_STORAGE_KEY,JSON.stringify(a))},resetData(){return localStorage.removeItem(E_MAG_STORAGE_KEY),{...DefaultData}},padNumber(a,n){let r=a+"";for(;r.length<n;)r="0"+r;return r},processModeB(a,n,r){const m=[];for(let f=1;f<=n;f++)m.push(`${a}${this.padNumber(f,r)}`);return m},getStudentMap(a){const n=a.split(`
`),r={};return n.forEach((m,f)=>{const _=f+1,i=m.trim();i&&(r[_]=i)}),r},applyTemplate(a,n){return a.replace(/\{class\}/g,n.class||"").replace(/\{no\}/g,n.no||"").replace(/\{student\}/g,n.student||"").replace(/\{work\}/g,n.work||"").replace(/\{teacher\}/g,n.teacher||"")},generateFinalFilenames(a){const{classInfo:n,teacherName:r,studentNames:m,workTitles:f,batchNos:_,nameTemplate:i}=a,t=i||"{class}-{no}-{student}-{work}-指導老師-{teacher}",h=this.getStudentMap(m),N=(_||"").split(`
`).map(s=>s.trim()).filter(s=>s!==""),c=(f||"").split(`
`).map(s=>s.trim()).filter(s=>s!=="");return N.length===0?Object.keys(h).map((s,g)=>this.applyTemplate(t,{class:n,no:this.padNumber(s,2),student:h[s],work:c.length===1?c[0]:c[g]||"未具名作品",teacher:r})):N.map((s,g)=>{const x=s.split(/[,\s_]+/).map(d=>d.trim()).filter(d=>d!==""),u=[],O=[];return x.forEach(d=>{const b=parseInt(d);isNaN(b)||(u.push(this.padNumber(b,2)),O.push(h[b]||"未知姓名"))}),this.applyTemplate(t,{class:n,no:u.join("_"),student:O.join("_"),work:c.length===1?c[0]:c[g]||"未具名作品",teacher:r})})},downloadTxt(a,n){const r=document.createElement("a");r.setAttribute("href","data:text/plain;charset=utf-8,"+encodeURIComponent(n)),r.setAttribute("download",a),r.style.display="none",document.body.appendChild(r),r.click(),document.body.removeChild(r)},generateRenameBat(a,n,r,m="time_asc"){if(a.length===0)return;const _={time_asc:"/o:d",time_desc:"/o:-d",name_asc:"/o:n",name_desc:"/o:-n"}[m]||"/o:d",i="undo_還原.bat";let t=`@echo off\r
`;t+=`chcp 65001 >nul\r
`,t+=`setlocal enabledelayedexpansion\r
`,t+=`set "UNDO=${i}"\r
`,t+=`echo @echo off > !UNDO!\r
`,t+=`echo chcp 65001 ^>nul >> !UNDO!\r
`,a.forEach((s,g)=>{let x=s.replace(/([&|<>^])/g,"^$1");t+=`set "name_${g+1}=${x}"\r
`}),t+=`set "idx=1"\r
`,t+=`for /f "delims=" %%F in ('dir /b ${_} *.*') do (\r
`,t+=`if /i "%%~xF" NEQ ".bat" (\r
`,t+=`set "current_idx=!idx!"\r
`,t+=`for /f "delims=" %%A in ("!current_idx!") do (\r
`,t+=`if defined name_%%A (\r
`,t+=`set "newname=!name_%%A!"\r
`,t+=`echo [%%F] 已變更為 [!newname!%%~xF]\r
`,t+=`echo ren "!newname!%%~xF" "%%~nxF" ^>nul >> !UNDO!\r
`,t+=`ren "%%F" "!newname!%%~xF"\r
`,t+=`set /a idx+=1\r
`,t+=`)\r
)\r
)\r
)\r
`,t+=`echo echo. >> !UNDO!\r
`,t+=`echo echo 還原完畢。按任意鍵結束... >> !UNDO!\r
`,t+=`echo pause ^>nul >> !UNDO!\r
`,t+=`echo.\r
`,t+=`echo 修改完畢。按任意鍵結束...\r
`,t+=`pause >nul\r
`;let h="run_rename.bat";n==="A"?h="run_rename_全手動.bat":n==="B"?h="run_rename_流水號.bat":n==="C"&&(h=`run_rename_${r||""}格式化.bat`);const N=new Blob([t],{type:"text/plain;charset=utf-8"}),c=document.createElement("a");c.href=URL.createObjectURL(N),c.download=h,c.click(),URL.revokeObjectURL(c.href)},generatePoetryWord(a,n="",r="",m=60){if(!a.trim())return;const{Document:f,Packer:_,Paragraph:i,TextRun:t,AlignmentType:h}=docx,N="標楷體",c=24,s=360,g=1134,x=" ".repeat(Math.max(0,m)),u=a.split(`
`).map(e=>e.trim()),O=e=>/^\d+$/.test(e),d=new Array(u.length).fill(0);for(let e=0;e<u.length;e++)if(O(u[e])){d[e]=2,e-1>=0&&(d[e-1]=1);let l=e+1;l<u.length&&u[l]!==""&&(d[l]=3);let o=e+2;o<u.length&&u[o]!==""&&(d[o]=4)}const b=[];let p=null;for(let e=0;e<u.length;e++){let l=u[e],o=d[e];if(o===1){p&&b.push(p),p={title:l,classNum:"",author:"",teacher:"",lines:[]};continue}p||(p={title:"",classNum:"",author:"",teacher:"",lines:[]}),o===2?p.classNum=l:o===3?p.author=l:o===4?p.teacher=l:p.lines.push(l)}p&&b.push(p);const w=[];b.forEach((e,l)=>{if(!e.title&&!e.classNum&&!e.author&&!e.teacher&&e.lines.length===0)return;!e.teacher&&n&&(e.teacher=`${n}`),e.title&&w.push(new i({alignment:h.CENTER,spacing:{line:s,before:l===0?120:480,after:120},children:[new t({text:e.title,font:N,size:c,bold:!0})]})),[e.classNum,e.author,e.teacher].forEach(E=>{E&&w.push(new i({alignment:h.LEFT,children:[new t({text:x+E,font:N,size:c})]}))}),w.push(new i({spacing:{line:s}}));let o=e.lines;for(;o.length>0&&o[0]==="";)o.shift();for(;o.length>0&&o[o.length-1]==="";)o.pop();o.forEach(E=>{E===""?w.push(new i({spacing:{line:s}})):w.push(new i({alignment:h.LEFT,spacing:{line:s,before:60,after:60},children:[new t({text:"  "+E.replace(/^[  ]+/,""),font:N,size:c})]}))})});const y=new f({sections:[{properties:{page:{margin:{top:g,bottom:g,left:g,right:g}}},children:w}]});_.toBlob(y).then(e=>{const l=r?r.replace(/\.docx$/i,""):"童詩合輯";window.saveAs(e,`${l}_完成.docx`)})}};window.EMagLogic=Logic;
