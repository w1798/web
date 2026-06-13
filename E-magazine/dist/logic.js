const E_MAG_STORAGE_KEY="e_magazine_app_data",DefaultData={classInfo:"305",teacherName:"許美麗",poetryTeacher:"指導 許美麗 師",studentNames:"",batchNos:"",workTitles:"",modeOption:"C",modeB_Prefix:"生活花絮",modeB_Digits:3,modeB_Count:10,sortOrder:"time_asc",manualInput:"",nameTemplate:"{class}-{no}-{student}-{work}-指導老師-{teacher}"},Logic={initData(){const a=localStorage.getItem(E_MAG_STORAGE_KEY);if(!a)return{...DefaultData};try{const n=JSON.parse(a);return{...DefaultData,...n}}catch{return{...DefaultData}}},saveData(a){localStorage.setItem(E_MAG_STORAGE_KEY,JSON.stringify(a))},resetData(){return localStorage.removeItem(E_MAG_STORAGE_KEY),{...DefaultData}},padNumber(a,n){let r=a+"";for(;r.length<n;)r="0"+r;return r},processModeB(a,n,r){const p=[];for(let m=1;m<=n;m++)p.push(`${a}${this.padNumber(m,r)}`);return p},getStudentMap(a){const n=a.split(`
`),r={};return n.forEach((p,m)=>{const d=m+1,f=p.trim();f&&(r[d]=f)}),r},applyTemplate(a,n){return a.replace(/\{class\}/g,n.class||"").replace(/\{no\}/g,n.no||"").replace(/\{student\}/g,n.student||"").replace(/\{work\}/g,n.work||"").replace(/\{teacher\}/g,n.teacher||"")},generateFinalFilenames(a){const{classInfo:n,teacherName:r,studentNames:p,workTitles:m,batchNos:d,nameTemplate:f}=a,t=f||"{class}-{no}-{student}-{work}-指導老師-{teacher}",u=this.getStudentMap(p),N=(d||"").split(`
`).map(s=>s.trim()).filter(s=>s!==""),c=(m||"").split(`
`).map(s=>s.trim()).filter(s=>s!=="");return N.length===0?Object.keys(u).map((s,b)=>this.applyTemplate(t,{class:n,no:this.padNumber(s,2),student:u[s],work:c.length===1?c[0]:c[b]||"未具名作品",teacher:r})):N.map((s,b)=>{const i=s.split(/[,\s_]+/).map(g=>g.trim()).filter(g=>g!==""),E=[],_=[];return i.forEach(g=>{const l=parseInt(g);isNaN(l)||(E.push(this.padNumber(l,2)),_.push(u[l]||"未知姓名"))}),this.applyTemplate(t,{class:n,no:E.join("_"),student:_.join("_"),work:c.length===1?c[0]:c[b]||"未具名作品",teacher:r})})},downloadTxt(a,n){const r=document.createElement("a");r.setAttribute("href","data:text/plain;charset=utf-8,"+encodeURIComponent(n)),r.setAttribute("download",a),r.style.display="none",document.body.appendChild(r),r.click(),document.body.removeChild(r)},generateRenameBat(a,n,r,p="time_asc"){if(a.length===0)return;const d={time_asc:"/o:d",time_desc:"/o:-d",name_asc:"/o:n",name_desc:"/o:-n"}[p]||"/o:d",f="undo_還原.bat";let t=`@echo off\r
`;t+=`@chcp 65001 >nul\r
`,t+=`@setlocal enabledelayedexpansion\r
`,t+=`@set "UNDO=${f}"\r
`,t+=`@echo @echo off > !UNDO!\r
`,t+=`@echo chcp 65001 ^>nul >> !UNDO!\r
`,a.forEach((s,b)=>{let i=s.replace(/([&|<>^])/g,"^$1");t+=`@set "name_${b+1}=${i}"\r
`}),t+=`@set "idx=1"\r
`,t+=`@for /f "delims=" %%F in ('dir /b ${d} *.*') do (\r
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
`;let u="run_rename.bat";n==="A"?u="run_rename_全手動.bat":n==="B"?u="run_rename_流水號.bat":n==="C"&&(u=`run_rename_${r||""}格式化.bat`);const N=new Blob([t],{type:"text/plain;charset=utf-8"}),c=document.createElement("a");c.href=URL.createObjectURL(N),c.download=u,c.click(),URL.revokeObjectURL(c.href)},generatePoetryWord(a,n="",r=""){if(!a.trim())return;const{Document:p,Packer:m,Paragraph:d,TextRun:f,AlignmentType:t}=docx,u="標楷體",N=24,c=360,s=1134,b=" ".repeat(60),i=a.split(`
`).map(e=>e.trim()),E=e=>/^\d+$/.test(e),_=new Array(i.length).fill(0);for(let e=0;e<i.length;e++)if(E(i[e])){_[e]=2,e-1>=0&&(_[e-1]=1);let h=e+1;h<i.length&&i[h]!==""&&(_[h]=3);let o=e+2;o<i.length&&i[o]!==""&&(_[o]=4)}const g=[];let l=null;for(let e=0;e<i.length;e++){let h=i[e],o=_[e];if(o===1){l&&g.push(l),l={title:h,classNum:"",author:"",teacher:"",lines:[]};continue}l||(l={title:"",classNum:"",author:"",teacher:"",lines:[]}),o===2?l.classNum=h:o===3?l.author=h:o===4?l.teacher=h:l.lines.push(h)}l&&g.push(l);const w=[];g.forEach((e,h)=>{if(!e.title&&!e.classNum&&!e.author&&!e.teacher&&e.lines.length===0)return;!e.teacher&&n&&(e.teacher=`${n}`),e.title&&w.push(new d({alignment:t.CENTER,spacing:{line:c,before:h===0?120:480,after:120},children:[new f({text:e.title,font:u,size:N,bold:!0})]})),[e.classNum,e.author,e.teacher].forEach(x=>{x&&w.push(new d({alignment:t.LEFT,children:[new f({text:b+x,font:u,size:N})]}))}),w.push(new d({spacing:{line:c}}));let o=e.lines;for(;o.length>0&&o[0]==="";)o.shift();for(;o.length>0&&o[o.length-1]==="";)o.pop();o.forEach(x=>{x===""?w.push(new d({spacing:{line:c}})):w.push(new d({alignment:t.LEFT,spacing:{line:c,before:60,after:60},children:[new f({text:"  "+x.replace(/^[  ]+/,""),font:u,size:N})]}))})});const O=new p({sections:[{properties:{page:{margin:{top:s,bottom:s,left:s,right:s}}},children:w}]});m.toBlob(O).then(e=>{const h=r?r.replace(/\.docx$/i,""):"童詩合輯";window.saveAs(e,`${h}_完成.docx`)})}};window.EMagLogic=Logic;
