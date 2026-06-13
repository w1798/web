var A=Object.defineProperty;var $=Object.getOwnPropertySymbols;var I=Object.prototype.hasOwnProperty,S=Object.prototype.propertyIsEnumerable;var y=(a,e,n)=>e in a?A(a,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):a[e]=n,N=(a,e)=>{for(var n in e||(e={}))I.call(e,n)&&y(a,n,e[n]);if($)for(var n of $(e))S.call(e,n)&&y(a,n,e[n]);return a};const E_MAG_STORAGE_KEY="e_magazine_app_data",DefaultData={classInfo:"305",teacherName:"許美麗",poetryTeacher:"",studentNames:"",batchSeats:"",workTitles:"",modeOption:"C",modeB_Prefix:"生活花絮",modeB_Digits:3,manualInput:""},Logic={initData(){const a=localStorage.getItem(E_MAG_STORAGE_KEY);if(!a)return N({},DefaultData);try{const e=JSON.parse(a);return N(N({},DefaultData),e)}catch(e){return N({},DefaultData)}},saveData(a){localStorage.setItem(E_MAG_STORAGE_KEY,JSON.stringify(a))},resetData(){return localStorage.removeItem(E_MAG_STORAGE_KEY),N({},DefaultData)},padNumber(a,e){let n=a+"";for(;n.length<e;)n="0"+n;return n},processModeB(a,e,n){const u=[];for(let r=1;r<=e;r++)u.push(`${a}${this.padNumber(r,n)}`);return u},getStudentMap(a){const e=a.split(`
`),n={};return e.forEach((u,r)=>{const f=r+1,l=u.trim();l&&(n[f]=l)}),n},generateFinalFilenames(a){const{classInfo:e,teacherName:n,studentNames:u,workTitles:r,batchSeats:f}=a,l=this.getStudentMap(u),p=(f||"").split(`
`).map(o=>o.trim()).filter(o=>o!==""),d=(r||"").split(`
`).map(o=>o.trim()).filter(o=>o!=="");return p.length===0?Object.keys(l).map((o,g)=>{const w=this.padNumber(o,2),i=l[o],_=d.length===1?d[0]:d[g]||"未具名作品";return`${e}-${w}-${i}-${_}-指導老師-${n}`}):p.map((o,g)=>{const w=o.split(/[,\s_]+/).map(h=>h.trim()).filter(h=>h!==""),i=[],_=[];w.forEach(h=>{const E=parseInt(h);isNaN(E)||(i.push(this.padNumber(E,2)),_.push(l[E]||"未知姓名"))});const b=i.join("_"),x=_.join("_"),c=d.length===1?d[0]:d[g]||"未具名作品";return`${e}-${b}-${x}-${c}-指導老師-${n}`})},downloadTxt(a,e){const n=document.createElement("a");n.setAttribute("href","data:text/plain;charset=utf-8,"+encodeURIComponent(e)),n.setAttribute("download",a),n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n)},generateRenameBat(a){if(a.length===0)return;let e=`@echo off\r
`;e+=`:: 重新用乾淨模式呼叫自身，斬斷迴圈雜訊\r
`,e+=`if "%~1"==":main" goto :main\r
`,e+=`cmd /c "%~f0" :main\r
`,e+=`pause >nul\r
`,e+=`goto :eof\r
\r
`,e+=`:main\r
`,e+=`chcp 65001 >nul\r
`,e+=`setlocal enabledelayedexpansion\r
\r
`,e+=`echo @echo off > undo_rename.bat\r
`,e+=`echo if "%%~1"==":main" goto :main >> undo_rename.bat\r
`,e+=`echo cmd /c "%%~f0" :main >> undo_rename.bat\r
`,e+=`echo pause ^>nul >> undo_rename.bat\r
`,e+=`echo goto :eof >> undo_rename.bat\r
\r
`,e+=`echo :main >> undo_rename.bat\r
`,e+=`echo chcp 65001 ^>nul >> undo_rename.bat\r
\r
`,a.forEach((f,l)=>{let p=f.replace(/([&|<>^])/g,"^$1");e+=`set "name_${l+1}=${p}"\r
`}),e+=`\r
set "idx=1"\r
`,e+=`for /f "delims=" %%F in ('dir /b /o:d *.*') do (\r
`,e+=`    if /i "%%~xF" NEQ ".bat" (\r
`,e+=`        set "current_idx=!idx!"\r
`,e+=`        for /f "delims=" %%A in ("!current_idx!") do (\r
`,e+=`            if defined name_%%A (\r
`,e+=`                set "newname=!name_%%A!"\r
`,e+=`                echo [%%F] 已變更為 [!newname!%%~xF]\r
`,e+=`                echo echo [!newname!%%~xF] 已還原為 [%%~nxF] >> undo_rename.bat\r
`,e+=`                echo ren "!newname!%%~xF" "%%~nxF" ^>nul 2^>^&1 >> undo_rename.bat\r
`,e+=`                ren "%%F" "!newname!%%~xF"\r
`,e+=`            )\r
`,e+=`        )\r
`,e+=`        set /a idx+=1\r
`,e+=`    )\r
`,e+=`)\r
\r
`,e+=`echo echo.\r
`,e+=`echo echo 修改完畢。按任意鍵結束...\r
`,e+=`echo echo. >> undo_rename.bat\r
`,e+=`echo echo 還原完畢。按任意鍵結束... >> undo_rename.bat\r
`;const n=new Uint8Array([239,187,191]),u=new Blob([n,e],{type:"text/plain;charset=utf-8"}),r=document.createElement("a");r.href=URL.createObjectURL(u),r.download="run_rename.bat",r.click(),URL.revokeObjectURL(r.href)},generatePoetryWord(a,e=""){if(!a.trim())return;const{Document:n,Packer:u,Paragraph:r,TextRun:f,AlignmentType:l}=docx,p="標楷體",d=24,o=360,g=1134,w=" ".repeat(65),i=a.split(`
`).map(t=>t.trim()),_=t=>/^\d+$/.test(t),b=new Array(i.length).fill(0);for(let t=0;t<i.length;t++)if(_(i[t])){b[t]=2,t-1>=0&&(b[t-1]=1);let m=t+1;m<i.length&&i[m]!==""&&(b[m]=3);let s=t+2;s<i.length&&i[s]!==""&&(b[s]=4)}const x=[];let c=null;for(let t=0;t<i.length;t++){let m=i[t],s=b[t];if(s===1){c&&x.push(c),c={title:m,classNum:"",author:"",teacher:"",lines:[]};continue}c||(c={title:"",classNum:"",author:"",teacher:"",lines:[]}),s===2?c.classNum=m:s===3?c.author=m:s===4?c.teacher=m:c.lines.push(m)}c&&x.push(c);const h=[];x.forEach((t,m)=>{if(!t.title&&!t.classNum&&!t.author&&!t.teacher&&t.lines.length===0)return;!t.teacher&&e&&(t.teacher=`指導 ${e} 老師`),t.title&&h.push(new r({alignment:l.CENTER,spacing:{line:o,before:m===0?120:480,after:120},children:[new f({text:t.title,font:p,size:d,bold:!0})]})),[t.classNum,t.author,t.teacher].forEach(F=>{F&&h.push(new r({alignment:l.LEFT,children:[new f({text:w+F,font:p,size:d})]}))}),h.push(new r({spacing:{line:o}}));let s=t.lines;for(;s.length>0&&s[0]==="";)s.shift();for(;s.length>0&&s[s.length-1]==="";)s.pop();s.forEach(F=>{F===""?h.push(new r({spacing:{line:o}})):h.push(new r({alignment:l.LEFT,spacing:{line:o,before:60,after:60},children:[new f({text:"  "+F.replace(/^[  ]+/,""),font:p,size:d})]}))})});const E=new n({sections:[{properties:{page:{margin:{top:g,bottom:g,left:g,right:g}}},children:h}]});u.toBlob(E).then(t=>window.saveAs(t,"精準規格排版_童詩合輯.docx"))}};window.EMagLogic=Logic;
