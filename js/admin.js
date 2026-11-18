/* Διαχειριστικό γραμματείας — Πληροφορική Κουφόπουλου.
   Οθόνες: Επισκόπηση · Μαθητές · Καρτέλα μαθητή · Άδειες · Τμήματα · Εξετάσεις · Αδύναμα σημεία · Ανακοινώσεις · Ρυθμίσεις.
   Όλα τα δεδομένα περνούν από το window.CenterAPI (σήμερα τοπικά, στο βήμα 3 από τη βάση). */
(function(){
'use strict';
const API=window.CenterAPI,LIVE=window.CenterAPI.backend==='supabase',KP=window.KP,CAT=window.SKILLS_CATALOG||{},PASS=KP.PASS;
const root=document.getElementById('root');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY=864e5;
const pd=s=>/^\d{4}-\d\d-\d\d$/.test(String(s))?new Date(s+'T12:00:00'):new Date(s);
const fmtD=v=>{if(!v) return '—';const d=pd(v);return isNaN(d)?'—':d.toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit',year:'numeric'});};
const fmtLong=v=>{const d=pd(v);return isNaN(d)?'':d.toLocaleDateString('el-GR',{day:'numeric',month:'long',year:'numeric'});};
const fmtDT=v=>{if(!v) return '—';const d=new Date(v);return d.toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('el-GR',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});};
const dstr=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>dstr(new Date());
const daysTo=v=>Math.round((pd(v)-pd(today()))/DAY);
function addMonths(v,n){const d=pd(v);const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return dstr(d);}
function rel(iso){if(!iso) return 'ποτέ';const n=-daysTo(dstr(new Date(iso)));if(n<=0) return 'σήμερα';if(n===1) return 'χθες';if(n<7) return `πριν ${n} ημέρες`;if(n<14) return 'πριν 1 εβδομάδα';if(n<60) return `πριν ${Math.floor(n/7)} εβδομάδες`;return fmtD(iso);}
const daysSince=iso=>iso?(Date.now()-new Date(iso).getTime())/DAY:Infinity;
const fullName=s=>`${s.last} ${s.first}`.trim();
const KIND={diag:'Διαγνωστικό',practice:'Εξατομικευμένη εξάσκηση',retry:'Εξάσκηση στα λάθη',exam:'Λειτουργία εξέτασης',adv:'Προχωρημένο test',test:'Test'};
function lv(score){if(score==null) return {k:'none',t:'Δεν ξεκίνησε'};if(score>=100) return {k:'ready',t:'Έτοιμος για εξέταση'};if(score>=PASS) return {k:'almost',t:'Σχεδόν έτοιμος'};if(score>=40) return {k:'good',t:'Σε καλό δρόμο'};return {k:'start',t:'Στην αρχή'};}
const pill=score=>{const l=lv(score);return `<span class="pill lv-${l.k}">${l.t}</span>`;};
const btag=bid=>{const b=KP.body(bid);return `<span class="btag">${esc(b?b.name:bid)}</span>`;};
const EXST={booked:'Κλείστηκε θέση',passed:'Πέρασε',failed:'Δεν πέρασε'};
const GST={active:'Ενεργή',expiring:'Λήγει σύντομα',expired:'Έληξε',suspended:'Σε αναστολή',future:'Δεν έχει ξεκινήσει'};

/* ---------- modal, toast, αντιγραφή ---------- */
function modal(title,body,foot,opts){const ov=document.createElement('div');ov.className='ov';
  ov.innerHTML=`<div class="modal ${opts&&opts.wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2><button class="x" aria-label="Κλείσιμο">×</button></header><div class="mb">${body}</div>${foot?`<footer>${foot}</footer>`:''}</div>`;
  document.body.appendChild(ov);
  const k=e=>{if(e.key==='Escape') close();};
  const close=()=>{ov.remove();document.removeEventListener('keydown',k);};
  document.addEventListener('keydown',k);
  ov.querySelector('.x').onclick=close;/* το κλικ έξω από το παράθυρο ΔΕΝ το κλείνει (17/11): μόνο Άκυρο, × ή Esc */
  const f=ov.querySelector('input:not([type=checkbox]),select,textarea');if(f&&!(opts&&opts.nofocus)) setTimeout(()=>f.focus(),30);
  return {el:ov,close,$:s=>ov.querySelector(s),$$:s=>[...ov.querySelectorAll(s)]};}
let tt=null;
function toast(msg){document.querySelectorAll('.toast').forEach(e=>e.remove());const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;document.body.appendChild(t);clearTimeout(tt);tt=setTimeout(()=>t.remove(),2800);}
function copy(text,okMsg){
  const fallback=()=>{const m=modal('Αντιγραφή',`<p class="muted" style="margin:0">Η αυτόματη αντιγραφή δεν επιτρέπεται εδώ. Το κείμενο είναι ήδη επιλεγμένο: πατήστε Ctrl+C.</p><textarea class="inp" id="cp-t" readonly></textarea>`,'<button class="btn" data-x>Κλείσιμο</button>');
    const ta=m.$('#cp-t');ta.value=text;setTimeout(()=>{ta.focus();ta.select();},40);m.$('[data-x]').onclick=m.close;};
  try{navigator.clipboard.writeText(text).then(()=>toast(okMsg||'Αντιγράφηκε'),fallback);}catch(e){fallback();}}
function confirmBox(title,text,okLabel,danger){return new Promise(res=>{const m=modal(title,`<p style="margin:0">${text}</p>`,`<button class="btn" data-no>Άκυρο</button><button class="btn ${danger?'danger solid':'pri'}" data-yes>${esc(okLabel)}</button>`);
  m.$('[data-no]').onclick=()=>{m.close();res(false);};m.$('[data-yes]').onclick=()=>{m.close();res(true);};});}

/* ---------- δεδομένα ---------- */
let S=[],G=[],GR=[],EV=[],NEWS=[],SET={};
async function loadAll(){[S,G,GR,EV,NEWS,SET]=await Promise.all([API.listStudents(),API.listGroups(),API.listGrants(),API.listEvents({limit:500}),API.listNews(),API.getSettings()]);}
const groupName=id=>{const g=G.find(x=>x.id===id);return g?g.name:'';};
const studentById=id=>S.find(x=>x.id===id);
const grantsOf=id=>GR.filter(g=>g.studentId===id);
/* συνολική κατάσταση πρόσβασης του μαθητή */
function access(s){const gs=grantsOf(s.id);
  if(!s.active) return {k:'suspended',t:'Απενεργοποιημένος'};
  if(!gs.length) return {k:'none',t:'Χωρίς άδεια'};
  const live=gs.filter(API.grantLive);
  if(live.length){const to=live.map(g=>g.to).sort()[0];const d=daysTo(to);
    return d<=14?{k:'expiring',t:d<=0?'Λήγει σήμερα':d===1?'Λήγει αύριο':`Λήγει σε ${d} ημέρες`,to,d}:{k:'active',t:'Ενεργή έως '+fmtD(to),to,d};}
  if(gs.some(g=>API.grantStatus(g)==='suspended')) return {k:'suspended',t:'Σε αναστολή'};
  const fut=gs.filter(g=>API.grantStatus(g)==='future');
  if(fut.length) return {k:'future',t:'Ξεκινά '+fmtD(fut.map(g=>g.from).sort()[0])};
  const to=gs.map(g=>g.to).sort().pop();return {k:'expired',t:'Έληξε '+fmtD(to),to,d:daysTo(to)};}
const stPill=a=>`<span class="st st-${a.k}">${esc(a.t)}</span>`;
/* τι καλύπτουν όλες οι άδειες του μαθητή, ανά φορέα (και οι ληγμένες: η πρόοδος μένει) */
function cover(s){return KP.bodies.map(b=>{const gs=grantsOf(s.id).filter(g=>g.body===b.id);if(!gs.length) return null;
  const units=b.units.map(u=>u.id).filter(u=>gs.some(g=>KP.expand(b.id,g.units).includes(u)));
  const targets=b.targets.map(t=>t.id).filter(t=>gs.some(g=>KP.targets(b.id,g.units).includes(t))||b.targets.find(x=>x.id===t).units.every(u=>units.includes(u)));
  return {b,grants:gs,units,targets,live:gs.some(API.grantLive)};}).filter(Boolean);}
const uSum=(s,bid,uid)=>(((s.summary||{})[bid]||{}).units||{})[uid]||null;
const uScore=(s,bid,uid)=>{const x=uSum(s,bid,uid);return x?x.score:null;};
const tSum=(s,bid,tid)=>(((s.summary||{})[bid]||{}).exams||{})[tid]||null;
function tScore(s,bid,tid){const t=KP.target(bid,tid);const v=t.units.map(u=>uScore(s,bid,u));if(v.every(x=>x==null)) return null;return Math.round(v.reduce((a,x)=>a+(x||0),0)/v.length);}
function overall(s){const v=[];cover(s).forEach(c=>c.units.forEach(u=>v.push(uScore(s,c.b.id,u))));if(!v.length||v.every(x=>x==null)) return null;return Math.round(v.reduce((a,x)=>a+(x||0),0)/v.length);}
/* γραμμές «μαθητής × στόχος εξέτασης» */
function examRows(){const out=[];S.filter(s=>s.active).forEach(s=>cover(s).forEach(c=>c.targets.forEach(tid=>{const t=KP.target(c.b.id,tid);
  out.push({s,b:c.b,t,score:tScore(s,c.b.id,tid),x:tSum(s,c.b.id,tid),ex:(s.exams||{})[c.b.id+':'+tid]||null,live:c.live});})));return out;}
function attention(){const out=[];S.filter(s=>s.active).forEach(s=>{const a=access(s);
  if(a.k==='expiring') out.push({s,why:a.t.replace('Λήγει','Η πρόσβαση λήγει'),sev:a.d<=3?4:3,k:'expiring'});
  else if(a.k==='expired'&&a.d>=-14) out.push({s,why:'Η πρόσβαση έληξε στις '+fmtD(a.to),sev:3,k:'expired'});
  else if(a.k==='none') out.push({s,why:'Δεν έχει δοθεί άδεια πρόσβασης',sev:2,k:'none'});
  if(a.k!=='active'&&a.k!=='expiring') return;
  if(!s.lastSeen){if(daysSince(s.created)>=3) out.push({s,why:'Δεν έχει μπει ακόμα στην πλατφόρμα',sev:2,k:'never'});return;}
  const d=daysSince(s.lastSeen);if(d>=10) out.push({s,why:`Καμία δραστηριότητα εδώ και ${Math.floor(d)} ημέρες`,sev:d>=20?3:2,k:'idle'});
  cover(s).forEach(c=>c.targets.forEach(tid=>{const x=tSum(s,c.b.id,tid);if(x&&x.n>=2&&x.passed===0) out.push({s,why:`${c.b.name} ${KP.target(c.b.id,tid).short}: ${x.n} δοκιμές εξέτασης χωρίς επιτυχία`,sev:2,k:'fail'});}));});
  return out.sort((a,b)=>b.sev-a.sev);}
const platformBase=()=>String(SET.platformUrl||'').trim().replace(/\/+$/,'');
const linkOf=s=>(platformBase()||'https://ΔΙΕΥΘΥΝΣΗ-ΠΛΑΤΦΟΡΜΑΣ')+'/?m='+s.linkId;

/* ---------- κέλυφος και δρομολόγηση ---------- */
const NAV=[['overview','Επισκόπηση'],['students','Μαθητές'],['licenses','Άδειες'],['groups','Τμήματα'],['exams','Εξετάσεις'],['skills','Αδύναμα σημεία'],['news','Ανακοινώσεις'],['config','Ρυθμίσεις'],['guide','Οδηγός χρήσης']];
function route(){const h=(location.hash||'').replace('#','')||'overview';const m=h.match(/^(student|group|guide)-(.+)$/);return m?{v:m[1],id:m[2]}:{v:NAV.some(n=>n[0]===h)?h:'overview'};}
function shell(active,html){
  const exp=GR.filter(g=>API.grantStatus(g)==='expiring').length;
  const ready=examRows().filter(r=>r.score!=null&&r.score>=100&&!(r.ex&&r.ex.status)).length;
  const cnt={students:S.length,licenses:exp||'',groups:G.length,exams:ready||''};
  root.innerHTML=`<div class="app"><aside class="side"><div class="brand"><img src="img/kp-k.png" alt="" width="39" height="44"><span><b>${esc(SET.center||'Κέντρο')}</b><small>Γνώση. Τεχνολογία. Μέλλον.</small></span></div>
    <div class="role">Γραμματεία</div>
    <nav class="nav" aria-label="Ενότητες">${NAV.map(([k,t])=>`<a href="#${k}" ${active===k?'aria-current="page"':''}><span>${t}</span><span class="cnt" ${k==='licenses'&&cnt[k]?'title="άδειες που λήγουν σε 14 ημέρες"':''}>${cnt[k]!=null?cnt[k]:''}</span></a>`).join('')}</nav>
    <div class="foot"><span>ACTA · GlobalCert · UCERT</span><button class="btn sm" id="logout">Αποσύνδεση</button></div></aside>
    <main class="main"><div class="wrap">${API.volatile?'<div class="banner"><span><b>Η αποθήκευση του browser δεν είναι διαθέσιμη.</b> Οι αλλαγές θα χαθούν όταν κλείσει η σελίδα.</span></div>':''}${html}</div></main></div>`;
  root.querySelector('#logout').onclick=async()=>{await API.adminLogout();boot();};}
let authed=false;
async function render(){await loadAll();const r=route();
  try{await ({overview:vOverview,students:vStudents,student:vStudent,licenses:vLicenses,groups:vGroups,group:vGroup,exams:vExams,skills:vSkills,news:vNews,config:vConfig,guide:vGuide})[r.v](r.id);}
  catch(e){console.error(e);shell('',`<div class="card empty"><b>Κάτι πήγε στραβά</b><span>${esc(e.message)}</span><a class="btn" href="#overview">Επιστροφή στην επισκόπηση</a></div>`);}
  window.scrollTo(0,0);}
window.addEventListener('hashchange',()=>{if(authed) render();});
const demoBanner=()=>S.some(s=>s.demo)?`<div class="banner"><span><b>Δεδομένα παραδείγματος.</b> Οι μαθητές με την ετικέτα «Παράδειγμα» είναι φανταστικοί, για να δείτε πώς δουλεύει το διαχειριστικό.</span><button class="btn sm" id="rm-demo">Διαγραφή παραδειγμάτων</button></div>`:'';
function wireDemo(){const b=root.querySelector('#rm-demo');if(b) b.onclick=async()=>{if(await confirmBox('Διαγραφή παραδειγμάτων','Θα διαγραφούν όλοι οι μαθητές, τα τμήματα και οι ανακοινώσεις παραδείγματος. Οι δικές σας καταχωρίσεις δεν επηρεάζονται.','Διαγραφή',true)){await API.removeDemo();toast('Τα παραδείγματα διαγράφηκαν');render();}};}
const rowNav=(sel,prefix)=>root.querySelectorAll(sel).forEach(tr=>{const go=()=>{location.hash=prefix+tr.dataset.id;};tr.onclick=e=>{if(e.target.closest('button,a')) return;go();};tr.onkeydown=e=>{if(e.key==='Enter') go();};});

/* ---------- Επισκόπηση ---------- */
function vOverview(){
  if(!S.length){shell('overview',`<div class="head"><div><h1>Επισκόπηση</h1><p>Οι μαθητές, οι άδειες και η πρόοδός τους στην πλατφόρμα.</p></div></div>
    <div class="card empty"><b>Δεν υπάρχουν ακόμα μαθητές</b><span>Προσθέστε έναν μαθητή και δώστε του άδεια πρόσβασης. Μόλις μπει στην πλατφόρμα, η πρόοδός του εμφανίζεται εδώ.</span>
    <div class="row" style="justify-content:center"><button class="btn pri" id="o-new">Νέος μαθητής</button>${LIVE?'':'<button class="btn" id="o-demo">Φόρτωση παραδειγμάτων</button>'}</div></div>`);
    root.querySelector('#o-new').onclick=()=>studentForm();
    if(!LIVE) root.querySelector('#o-demo').onclick=async()=>{await API.seedDemo();toast('Φορτώθηκαν δεδομένα παραδείγματος');render();};return;}
  const acc=S.map(s=>({s,a:access(s)}));
  const live=acc.filter(x=>x.a.k==='active'||x.a.k==='expiring');
  const wk=live.filter(x=>daysSince(x.s.lastSeen)<7).length;
  const expiring=GR.filter(g=>API.grantStatus(g)==='expiring');
  const rr=examRows();const readyNo=rr.filter(r=>r.score!=null&&r.score>=100&&!(r.ex&&r.ex.status));
  const att=attention();
  const bodyCard=b=>{const cs=S.filter(s=>s.active).map(s=>({s,c:cover(s).find(c=>c.b.id===b.id)})).filter(x=>x.c);if(!cs.length) return '';
    const liveN=cs.filter(x=>x.c.live).length;
    const rows=b.units.map(u=>{const L=cs.filter(x=>x.c.units.includes(u.id));if(!L.length) return '';const c={ready:0,almost:0,good:0,start:0,none:0};const sc=[];
      L.forEach(x=>{const v=uScore(x.s,b.id,u.id);c[lv(v).k]++;if(v!=null) sc.push(v);});const avg=sc.length?Math.round(sc.reduce((a,v)=>a+v,0)/sc.length):null;
      return `<div class="urow"><span>${esc(u.short)}</span><div class="stack" role="img" aria-label="${esc(u.short)}: ${c.ready} έτοιμοι, ${c.almost} σχεδόν έτοιμοι, ${c.good} σε καλό δρόμο, ${c.start} στην αρχή, ${c.none} δεν ξεκίνησαν">${['ready','almost','good','start','none'].map(k=>c[k]?`<i class="c-${k}" style="width:${c[k]/L.length*100}%" title="${c[k]} μαθητές"></i>`:'').join('')}</div><span class="num t-${lv(avg).k}">${avg==null?'—':avg+'%'}</span></div>`;}).join('');
    return `<section class="card"><div class="bh"><span><span class="cn">${esc(b.name)}</span></span><small>${cs.length} μαθητές · ${liveN} με ενεργή πρόσβαση</small></div><div class="pad">${rows}</div></section>`;};
  const feed=EV.filter(e=>e.type==='result'||e.type==='exam'||e.type==='grant').slice(0,12);
  shell('overview',`${demoBanner()}<div class="head"><div><h1>Επισκόπηση</h1><p>${new Date().toLocaleDateString('el-GR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div>
    <div class="row"><button class="btn pri" id="o-new">Νέος μαθητής</button></div></div>
   <div class="grid g4">
    <div class="card kpi"><span class="v">${live.length}</span><span class="l">Μαθητές με ενεργή πρόσβαση</span><span class="s">από ${S.length} συνολικά</span></div>
    <div class="card kpi"><span class="v">${wk}</span><span class="l">Δούλεψαν τις τελευταίες 7 ημέρες</span><span class="s">${live.length?Math.round(wk/live.length*100):0}% όσων έχουν πρόσβαση</span></div>
    <div class="card kpi"><span class="v ${expiring.length?'t-good':''}">${expiring.length}</span><span class="l">Άδειες που λήγουν σε 14 ημέρες</span><span class="s"><a href="#licenses">προβολή και παράταση</a></span></div>
    <div class="card kpi ${readyNo.length?'hl':''}"><span class="v">${readyNo.length}</span><span class="l">Έτοιμοι χωρίς θέση εξέτασης</span><span class="s"><a href="#exams">κλείσιμο θέσεων</a></span></div>
   </div>
   <section class="sec"><div class="sh"><h2>Ετοιμότητα ανά φορέα και ενότητα</h2><div class="legend"><span><i class="c-ready"></i>Έτοιμοι</span><span><i class="c-almost"></i>Σχεδόν έτοιμοι</span><span><i class="c-good"></i>Σε καλό δρόμο</span><span><i class="c-start"></i>Στην αρχή</span><span><i class="c-none"></i>Δεν ξεκίνησαν</span></div></div>
    <div class="grid g3">${KP.bodies.map(bodyCard).join('')}</div></section>
   <div class="grid g2">
    <section class="card pad sec"><div class="sh"><h2>Χρειάζονται προσοχή</h2><small>${att.length||''}</small></div>
     ${att.length?`<div class="feed">${att.slice(0,9).map(a=>`<div class="it"><span><a href="#student-${a.s.id}">${esc(fullName(a.s))}</a> <span class="muted">· ${esc(a.why)}</span></span><span class="when">${esc(groupName(a.s.groupId))}</span></div>`).join('')}</div>`:'<p class="muted" style="margin:0">Όλοι οι μαθητές με πρόσβαση δουλεύουν κανονικά.</p>'}</section>
    <section class="card pad sec"><div class="sh"><h2>Πρόσφατη δραστηριότητα</h2><small>αποτελέσματα και αλλαγές πρόσβασης</small></div>
     ${feed.length?`<div class="feed">${feed.map(e=>{const s=studentById(e.studentId);if(!s) return '';return `<div class="it"><span><a href="#student-${s.id}">${esc(fullName(s))}</a> <span class="muted">·</span> ${evText(e)}</span><span class="when">${fmtDT(e.at)}</span></div>`;}).join('')}</div>`:'<p class="muted" style="margin:0">Δεν υπάρχει ακόμα δραστηριότητα.</p>'}</section>
   </div>`);
  wireDemo();root.querySelector('#o-new').onclick=()=>studentForm();}
function evText(e){const b=KP.body(e.body);const bn=b?b.name:'';
  if(e.type==='exam'){const t=b&&KP.target(e.body,e.target);return `${EXST[e.status]||'Ακύρωση θέσης'}: εξέταση ${esc(bn)} ${esc(t?t.short:'')}${e.date?' · '+fmtD(e.date):''}`;}
  if(e.type==='grant'){const d=e.units?KP.describe(e.body,e.units):'';return ({new:`Νέα άδεια ${esc(bn)} (${esc(d)}) έως ${fmtD(e.to)}`,extend:`Παράταση ${esc(bn)} έως ${fmtD(e.to)}`,units:`Αλλαγή ενοτήτων ${esc(bn)}: ${esc(d)}`,edit:`Διόρθωση άδειας ${esc(bn)}`,suspend:`Αναστολή πρόσβασης ${esc(bn)}`,resume:`Επαναφορά πρόσβασης ${esc(bn)}`,delete:`Διαγραφή άδειας ${esc(bn)}`})[e.action]||'Αλλαγή άδειας';}
  if(e.type==='access') return e.action==='link'?'Νέο προσωπικό link και κωδικός':'Νέος κωδικός';
  const where=e.unit?(KP.unit(e.body,e.unit)||{}).short:(KP.target(e.body,e.target)||{}).short;
  return `${esc(bn)} ${esc(where||'')} · ${esc(e.kind==='test'?e.title:KIND[e.kind]||e.title)}: <b class="num ${e.pct>=PASS?'t-ready':'t-start'}">${e.pct}%</b>`;}

/* ---------- Μαθητές ---------- */
const F={q:'',g:'',b:'',st:''};
function filterStudents(){const q=F.q.trim().toLowerCase();return S.filter(s=>{
  if(q&&!(fullName(s).toLowerCase().includes(q)||`${s.first} ${s.last}`.toLowerCase().includes(q)||s.code.toLowerCase().includes(q.replace(/\s/g,''))||s.phone.includes(q)||s.email.toLowerCase().includes(q))) return false;
  if(F.g&&(F.g==='_none'?s.groupId:s.groupId!==F.g)) return false;
  if(F.b&&!grantsOf(s.id).some(g=>g.body===F.b)) return false;
  const a=access(s).k;
  if(['active','expiring','expired','suspended','none','future'].includes(F.st)&&(F.st==='active'?!(a==='active'||a==='expiring'):a!==F.st)) return false;
  if(F.st==='idle'&&(daysSince(s.lastSeen)<10||!s.lastSeen)) return false;
  if(F.st==='never'&&s.lastSeen) return false;
  return true;}).sort((a,b)=>fullName(a).localeCompare(fullName(b),'el'));}
function vStudents(){
  shell('students',`${demoBanner()}<div class="head"><div><h1>Μαθητές</h1><p>${S.length} μαθητές · ${S.filter(s=>['active','expiring'].includes(access(s).k)).length} με ενεργή πρόσβαση</p></div>
    <div class="row"><button class="btn" id="s-copy">Αντιγραφή λίστας</button><button class="btn pri" id="s-new">Νέος μαθητής</button></div></div>
   <div class="tools"><input class="inp search" id="f-q" type="search" placeholder="Αναζήτηση ονόματος, κωδικού, τηλεφώνου" aria-label="Αναζήτηση" value="${esc(F.q)}">
    <select class="inp" id="f-b" aria-label="Φορέας"><option value="">Όλοι οι φορείς</option>${KP.bodies.map(b=>`<option value="${b.id}" ${F.b===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select>
    <select class="inp" id="f-g" aria-label="Τμήμα"><option value="">Όλα τα τμήματα</option>${G.map(g=>`<option value="${g.id}" ${F.g===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}<option value="_none" ${F.g==='_none'?'selected':''}>Χωρίς τμήμα</option></select>
    <select class="inp" id="f-st" aria-label="Κατάσταση">${[['','Όλες οι καταστάσεις'],['active','Με ενεργή πρόσβαση'],['expiring','Λήγει σε 14 ημέρες'],['expired','Έληξε η πρόσβαση'],['suspended','Σε αναστολή'],['future','Δεν έχει ξεκινήσει'],['none','Χωρίς άδεια'],['idle','Χωρίς δραστηριότητα 10+ ημέρες'],['never','Δεν έχουν μπει ποτέ']].map(([v,t])=>`<option value="${v}" ${F.st===v?'selected':''}>${t}</option>`).join('')}</select></div>
   <div class="card tw" id="s-table"></div>`);
  const draw=()=>{const L=filterStudents();const box=root.querySelector('#s-table');
    if(!L.length){box.innerHTML=`<div class="empty"><b>${S.length?'Κανένας μαθητής δεν ταιριάζει στα φίλτρα':'Δεν υπάρχουν ακόμα μαθητές'}</b><span>${S.length?'Αλλάξτε την αναζήτηση ή τα φίλτρα.':'Πατήστε «Νέος μαθητής».'}</span></div>`;return;}
    box.innerHTML=`<table><thead><tr><th>Μαθητής</th><th>Κωδικός</th><th>Φορέας</th><th>Πρόσβαση</th><th>Ετοιμότητα</th><th>Τελευταία φορά</th></tr></thead><tbody>${L.map(s=>{const o=overall(s);const l=lv(o);const bs=[...new Set(grantsOf(s.id).map(g=>g.body))];
      return `<tr class="click" data-id="${s.id}" tabindex="0"><td><span class="nm">${esc(fullName(s))}</span> ${s.demo?'<span class="tag demo">Παράδειγμα</span>':''}<div class="small muted">${esc(groupName(s.groupId))}</div></td>
      <td class="mono">${esc(s.code)}</td><td><div class="row" style="gap:4px">${bs.map(btag).join('')||'<span class="muted">—</span>'}</div></td><td>${stPill(access(s))}</td>
      <td><span class="mchip" title="μέσος δείκτης ετοιμότητας στις ενότητές του: ${l.t}"><span class="bar"><i class="c-${l.k}" style="width:${o==null?0:Math.min(o,100)}%"></i></span><b class="t-${l.k}">${o==null?'—':o+'%'}</b></span></td>
      <td class="muted">${rel(s.lastSeen)}</td></tr>`;}).join('')}</tbody></table>`;
    rowNav('#s-table tr[data-id]','student-');};
  draw();
  root.querySelector('#f-q').oninput=e=>{F.q=e.target.value;draw();};
  [['#f-g','g'],['#f-b','b'],['#f-st','st']].forEach(([id,k])=>root.querySelector(id).onchange=e=>{F[k]=e.target.value;draw();});
  root.querySelector('#s-new').onclick=()=>studentForm(null,F.g&&F.g!=='_none'?F.g:null);
  root.querySelector('#s-copy').onclick=()=>copy(tsv(filterStudents()),'Η λίστα αντιγράφηκε· επικολλήστε τη στο Excel');wireDemo();}
function tsv(L){return ['Επώνυμο\tΌνομα\tΚωδικός\tΣύνδεσμος\tΤμήμα\tΤηλέφωνο\tEmail\tΦορείς\tΠρόσβαση\tΛήξη\tΕτοιμότητα\tΤελευταία φορά']
  .concat(L.map(s=>{const a=access(s);const o=overall(s);return [s.last,s.first,s.code,linkOf(s),groupName(s.groupId),s.phone,s.email,[...new Set(grantsOf(s.id).map(g=>KP.body(g.body).name))].join(', '),a.t,a.to?fmtD(a.to):'',o==null?'':o+'%',s.lastSeen?fmtD(s.lastSeen):''].join('\t');})).join('\n');}

/* ---------- επιλογή ενοτήτων ανά φορέα ---------- */
function unitsUI(bid,sel){const b=KP.body(bid);sel=sel||[];
  if(b.id==='gc') return `<div class="packs">${b.packs.map(p=>`<label class="pack"><input type="checkbox" name="gu" value="${p.id}" ${sel.includes(p.id)||p.units.every(u=>sel.includes(u))?'checked':''}><span><b>${esc(p.title)}</b><small>${p.units.map(u=>KP.unit(bid,u).short).join(', ')}</small></span></label>`).join('')}</div>
    <p class="hint">Κάθε πακέτο ανοίγει τις τρεις εφαρμογές του και τα διαθεματικά tests του.</p>`;
  const ex=KP.expand(bid,sel.length?sel:null);const all=!sel.length;
  return `<div class="checks">${b.units.map(u=>`<label><input type="checkbox" name="gu" value="${u.id}" ${all||ex.includes(u.id)?'checked':''}> ${esc(u.title)}</label>`).join('')}</div>
    ${b.id==='uc'?'<p class="hint">Τα μικτά tests προστίθενται αυτόματα: «Μικτά 1» όταν δοθούν Word, Excel και Internet, «Μικτά 2» όταν δοθούν Windows, Access και PowerPoint.</p>':''}`;}
const readUnits=m=>m.$$('input[name=gu]:checked').map(x=>x.value);
function datesUI(from,to){return `<div class="fld"><label for="gf-from">Από</label><input class="inp" type="date" id="gf-from" value="${esc(from)}"></div>
  <div class="fld"><label for="gf-to">Έως (και την ημέρα αυτή)</label><input class="inp" type="date" id="gf-to" value="${esc(to)}"></div>
  <div class="fld full"><span class="lb">Γρήγορη επιλογή διάρκειας</span><div class="quick">${[1,2,3,6,12].map(n=>`<button type="button" class="btn sm" data-mon="${n}">${n} ${n===1?'μήνας':'μήνες'}</button>`).join('')}</div></div>`;}
function wireDates(m){m.$$('[data-mon]').forEach(b=>b.onclick=()=>{const f=m.$('#gf-from').value||today();m.$('#gf-to').value=addMonths(f,+b.dataset.mon);});}

/* ---------- φόρμα μαθητή ---------- */
function studentForm(s,presetGroup){const ed=!!s;s=s||{first:'',last:'',phone:'',email:'',groupId:presetGroup||null,notes:'',active:true};
  const pg=G.find(g=>g.id===s.groupId);const b0=(pg&&pg.body)||'acta';
  const m=modal(ed?'Επεξεργασία στοιχείων':'Νέος μαθητής',`<form class="form" id="sf" novalidate>
    <div class="fld"><label for="sf-last">Επώνυμο</label><input class="inp" id="sf-last" value="${esc(s.last)}" autocomplete="off"></div>
    <div class="fld"><label for="sf-first">Όνομα</label><input class="inp" id="sf-first" value="${esc(s.first)}" autocomplete="off"></div>
    <div class="fld"><label for="sf-phone">Κινητό</label><input class="inp" id="sf-phone" value="${esc(s.phone)}" inputmode="tel" autocomplete="off"></div>
    <div class="fld"><label for="sf-email">Email</label><input class="inp" id="sf-email" type="email" value="${esc(s.email)}" autocomplete="off"></div>
    <div class="fld full"><label for="sf-group">Τμήμα</label><select class="inp" id="sf-group"><option value="">Χωρίς τμήμα</option>${G.map(g=>`<option value="${g.id}" ${s.groupId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></div>
    <div class="fld full"><label for="sf-notes">Σημειώσεις γραμματείας</label><textarea class="inp" id="sf-notes" style="min-height:64px;font-family:var(--f-ui)">${esc(s.notes)}</textarea></div>
    ${ed?'':`<label class="switch full"><input type="checkbox" id="sf-grant" checked> Να δοθεί τώρα άδεια πρόσβασης (έχει γίνει η πληρωμή)</label>
    <div class="form full" id="sf-gbox" style="padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--sunk)">
      <div class="fld full"><label for="gf-body">Φορέας πιστοποίησης</label><select class="inp" id="gf-body">${KP.bodies.map(b=>`<option value="${b.id}" ${b.id===b0?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
      <div class="fld full"><span class="lb">Ενότητες που θα βλέπει</span><div id="gf-units">${unitsUI(b0,[])}</div></div>${datesUI(today(),addMonths(today(),3))}</div>`}
    <div class="err full" id="sf-err" role="alert"></div></form>`,`<button class="btn" data-x>Άκυρο</button><button class="btn pri" data-save>${ed?'Αποθήκευση':'Δημιουργία μαθητή'}</button>`,{wide:!ed});
  m.$('[data-x]').onclick=m.close;
  if(!ed){wireDates(m);m.$('#gf-body').onchange=e=>{m.$('#gf-units').innerHTML=unitsUI(e.target.value,[]);};m.$('#sf-grant').onchange=e=>{m.$('#sf-gbox').hidden=!e.target.checked;};
    m.$('#sf-group').onchange=e=>{const g=G.find(x=>x.id===e.target.value);if(g&&g.body){m.$('#gf-body').value=g.body;m.$('#gf-units').innerHTML=unitsUI(g.body,[]);}};}
  const go=async()=>{const err=m.$('#sf-err');
    const data=Object.assign({},s,{first:m.$('#sf-first').value,last:m.$('#sf-last').value,phone:m.$('#sf-phone').value,email:m.$('#sf-email').value,groupId:m.$('#sf-group').value||null,notes:m.$('#sf-notes').value});
    delete data.summary;
    const want=!ed&&m.$('#sf-grant').checked;let gdata=null;
    if(want){gdata={body:m.$('#gf-body').value,units:readUnits(m),from:m.$('#gf-from').value,to:m.$('#gf-to').value};
      if(!gdata.units.length){err.textContent='Επιλέξτε τουλάχιστον μία ενότητα.';return;}
      if(!gdata.from||!gdata.to){err.textContent='Ορίστε ημερομηνία έναρξης και λήξης.';return;}
      if(gdata.to<gdata.from){err.textContent='Η λήξη δεν μπορεί να είναι πριν από την έναρξη.';return;}}
    try{const o=await API.saveStudent(data);if(gdata) await API.saveGrant(Object.assign(gdata,{studentId:o.id}));
      m.close();toast(ed?'Οι αλλαγές αποθηκεύτηκαν':'Ο μαθητής δημιουργήθηκε');
      if(!ed){pendingMsg=gdata?o.id:null;if(location.hash==='#student-'+o.id) render();else location.hash='student-'+o.id;}else render();}
    catch(e){err.textContent=e.message;}};
  m.$('[data-save]').onclick=go;m.$('#sf').addEventListener('submit',e=>{e.preventDefault();go();});}
let pendingMsg=null;

/* ---------- άδειες: φόρμες ---------- */
function grantForm(s,g){const ed=!!g;const b0=ed?g.body:((G.find(x=>x.id===s.groupId)||{}).body||'acta');
  const has=bid=>grantsOf(s.id).some(x=>x.body===bid&&API.grantStatus(x)!=='expired');
  const m=modal(ed?`Ενότητες άδειας ${KP.body(g.body).name}: ${fullName(s)}`:`Νέα άδεια: ${fullName(s)}`,`<form class="form" id="gf" novalidate>
    ${ed?'':`<div class="fld full"><label for="gf-body">Φορέας πιστοποίησης</label><select class="inp" id="gf-body">${KP.bodies.map(b=>`<option value="${b.id}" ${b.id===b0?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
     <div class="banner info full" id="gf-dup" hidden><span>Ο μαθητής έχει ήδη άδεια για αυτόν τον φορέα. Για περισσότερες ενότητες ή περισσότερο χρόνο, προτιμήστε «Ενότητες» ή «Παράταση» στην υπάρχουσα άδεια.</span></div>`}
    <div class="fld full"><span class="lb">Ενότητες που θα βλέπει</span><div id="gf-units">${unitsUI(b0,ed?g.units:[])}</div></div>
    ${ed?`<div class="fld"><label for="gf-from">Από</label><input class="inp" type="date" id="gf-from" value="${esc(g.from)}"></div><div class="fld"><label for="gf-to">Έως (και την ημέρα αυτή)</label><input class="inp" type="date" id="gf-to" value="${esc(g.to)}"></div>`:datesUI(today(),addMonths(today(),3))}
    <div class="fld full"><label for="gf-note">Σημείωση (π.χ. αριθμός απόδειξης)</label><input class="inp" id="gf-note" value="${esc(ed?g.note:'')}"></div>
    ${ed?'<p class="hint full">Ο σύνδεσμος και ο κωδικός του μαθητή δεν αλλάζουν. Οι νέες ενότητες εμφανίζονται στην επόμενη είσοδό του.</p>':''}
    <div class="err full" id="gf-err" role="alert"></div></form>`,`<button class="btn" data-x>Άκυρο</button><button class="btn pri" data-save>${ed?'Αποθήκευση':'Δημιουργία άδειας'}</button>`,{wide:true,nofocus:true});
  m.$('[data-x]').onclick=m.close;
  if(!ed){wireDates(m);const dup=()=>{m.$('#gf-dup').hidden=!has(m.$('#gf-body').value);};dup();m.$('#gf-body').onchange=e=>{m.$('#gf-units').innerHTML=unitsUI(e.target.value,[]);dup();};}
  const go=async()=>{try{await API.saveGrant(Object.assign({},g||{},{studentId:s.id,body:ed?g.body:m.$('#gf-body').value,units:readUnits(m),from:m.$('#gf-from').value,to:m.$('#gf-to').value,note:m.$('#gf-note').value}));
      m.close();toast(ed?'Η άδεια ενημερώθηκε':'Η άδεια δημιουργήθηκε');if(!ed) pendingMsg=s.id;await afterGrant(s);}
    catch(e){m.$('#gf-err').textContent=e.message;}};
  m.$('[data-save]').onclick=go;m.$('#gf').addEventListener('submit',e=>{e.preventDefault();go();});}
async function afterGrant(s){if(route().v==='student') return render();await render();if(pendingMsg===s.id){pendingMsg=null;msgDialog(studentById(s.id)||s,'welcome');}}
function extendForm(s,g){const base=g.to>today()?g.to:today();const st=API.grantStatus(g);
  const m=modal(`Παράταση ${KP.body(g.body).name}: ${fullName(s)}`,`<div class="banner info" style="justify-content:flex-start"><span>${st==='expired'?'Η άδεια έληξε στις':'Η άδεια ισχύει έως'} <b>${fmtD(g.to)}</b> · ${esc(KP.describe(g.body,g.units))}</span></div>
    <div class="fld"><span class="lb">Παράταση κατά</span><div class="quick">${[[.5,'15 ημέρες'],[1,'1 μήνα'],[2,'2 μήνες'],[3,'3 μήνες'],[6,'6 μήνες']].map(([n,t])=>`<button type="button" class="btn sm" data-ext="${n}">${t}</button>`).join('')}</div></div>
    <div class="fld" style="max-width:240px"><label for="ex-to">Νέα ημερομηνία λήξης</label><input class="inp" type="date" id="ex-to" value="${addMonths(base,1)}" min="${today()}"></div>
    <p class="hint">${st==='expired'?'Η παράταση μετρά από σήμερα. ':''}Ο σύνδεσμος και ο κωδικός του μαθητή παραμένουν οι ίδιοι· η πρόοδός του διατηρείται.</p><div class="err" id="ex-err" role="alert"></div>`,
    `<button class="btn" data-x>Άκυρο</button><button class="btn pri" data-save>Παράταση</button>`,{nofocus:true});
  m.$('[data-x]').onclick=m.close;
  m.$$('[data-ext]').forEach(b=>b.onclick=()=>{const n=+b.dataset.ext;m.$('#ex-to').value=n===.5?dstr(new Date(pd(base).getTime()+15*DAY)):addMonths(base,n);});
  m.$('[data-save]').onclick=async()=>{const to=m.$('#ex-to').value;if(!to||to<today()){m.$('#ex-err').textContent='Η νέα λήξη πρέπει να είναι σημερινή ή μεταγενέστερη ημερομηνία.';return;}
    try{await API.saveGrant(Object.assign({},g,{to,from:g.from>to?today():g.from}));m.close();toast('Η άδεια παρατάθηκε έως '+fmtD(to));await render();msgDialog(studentById(s.id)||s,'extend');}
    catch(e){m.$('#ex-err').textContent=e.message;}};}
async function toggleSuspend(s,g){const on=!g.suspended;
  if(on&&!await confirmBox('Αναστολή πρόσβασης',`Ο/Η ${esc(fullName(s))} δεν θα βλέπει τις ενότητες ${esc(KP.body(g.body).name)} μέχρι να γίνει επαναφορά. Η πρόοδος και η ημερομηνία λήξης δεν αλλάζουν.`,'Αναστολή')) return;
  await API.suspendGrant(g.id,on);toast(on?'Η πρόσβαση μπήκε σε αναστολή':'Η πρόσβαση επανήλθε');render();}

/* ---------- μηνύματα προς τον μαθητή ---------- */
function accessLines(s){const gs=grantsOf(s.id).filter(g=>API.grantStatus(g)!=='expired'&&!g.suspended);
  return gs.map(g=>`${KP.body(g.body).name} (${KP.describe(g.body,g.units)}): ${g.from>today()?'από '+fmtD(g.from)+' ':''}έως ${fmtD(g.to)}`);}
const MSG={
  welcome:{t:'Νέα πρόσβαση',subject:()=>`Η πρόσβασή σας στην πλατφόρμα προετοιμασίας — ${SET.center}`,
    short:s=>`Γεια σας ${s.first}! Η πρόσβασή σας στην πλατφόρμα προετοιμασίας του κέντρου ${SET.center} είναι έτοιμη.\nΣύνδεσμος: ${linkOf(s)}\nΚωδικός: ${s.code}\n${accessLines(s).join('\n')}\nΚαλή επιτυχία!`,
    long:s=>`Γεια σας ${s.first},\n\nη πρόσβασή σας στην πλατφόρμα προετοιμασίας του κέντρου ${SET.center} είναι έτοιμη.\n\nΠροσωπικός σύνδεσμος: ${linkOf(s)}\nΚωδικός εισόδου: ${s.code}\n\nΗ πρόσβασή σας:\n${accessLines(s).map(l=>'• '+l).join('\n')}\n\nΑνοίξτε τον σύνδεσμο, πληκτρολογήστε τον κωδικό σας και ξεκινήστε από το διαγνωστικό. Η πρόοδός σας αποθηκεύεται αυτόματα. Ο σύνδεσμος και ο κωδικός είναι προσωπικοί· μην τους δίνετε σε άλλους.\n\nΓια οποιαδήποτε απορία, η γραμματεία είναι στη διάθεσή σας.\n\nΚαλή επιτυχία!\n${SET.center}`},
  extend:{t:'Παράταση',subject:()=>`Παράταση πρόσβασης στην πλατφόρμα — ${SET.center}`,
    short:s=>`Γεια σας ${s.first}! Η πρόσβασή σας στην πλατφόρμα προετοιμασίας παρατάθηκε.\n${accessLines(s).join('\n')}\nΟ σύνδεσμος και ο κωδικός σας παραμένουν οι ίδιοι.\n${SET.center}`,
    long:s=>`Γεια σας ${s.first},\n\nη πρόσβασή σας στην πλατφόρμα προετοιμασίας παρατάθηκε:\n${accessLines(s).map(l=>'• '+l).join('\n')}\n\nΟ σύνδεσμος και ο κωδικός σας παραμένουν οι ίδιοι και η πρόοδός σας έχει διατηρηθεί.\n\nΣύνδεσμος: ${linkOf(s)}\n\n${SET.center}`},
  remind:{t:'Υπενθύμιση λήξης',subject:()=>`Η πρόσβασή σας στην πλατφόρμα λήγει σύντομα — ${SET.center}`,
    short:s=>{const a=access(s);return `Γεια σας ${s.first}! Η πρόσβασή σας στην πλατφόρμα προετοιμασίας ${a.k==='expired'?'έληξε':'λήγει'} στις ${fmtD(a.to)}. Για ανανέωση, επικοινωνήστε με τη γραμματεία.\n${SET.center}`;},
    long:s=>{const a=access(s);return `Γεια σας ${s.first},\n\nσας ενημερώνουμε ότι η πρόσβασή σας στην πλατφόρμα προετοιμασίας ${a.k==='expired'?'έληξε':'λήγει'} στις ${fmtLong(a.to)}. Η πρόοδός σας διατηρείται.\n\nΑν θέλετε να συνεχίσετε την προετοιμασία σας, επικοινωνήστε με τη γραμματεία για ανανέωση.\n\n${SET.center}`;}}
};
function msgDialog(s,kind){let k=kind||'welcome',ch='short';
  const m=modal(`Μήνυμα προς: ${fullName(s)}`,`<div class="tabs" role="tablist" id="mg-k">${Object.keys(MSG).map(x=>`<button role="tab" data-k="${x}">${MSG[x].t}</button>`).join('')}</div>
    <div class="row" style="justify-content:space-between"><div class="row" role="radiogroup" aria-label="Μέσο αποστολής"><label class="switch"><input type="radio" name="mg-ch" value="short" checked> Viber / SMS</label><label class="switch"><input type="radio" name="mg-ch" value="long"> Email</label></div><span class="small muted" id="mg-to"></span></div>
    <div id="mg-sub" class="fld" hidden><span class="lb">Θέμα</span><div class="linkbox"><span class="mono" id="mg-subt" style="font-family:var(--f-ui)"></span><button class="btn sm" id="mg-csub">Αντιγραφή</button></div></div>
    <div class="msg" id="mg-body"></div>
    ${platformBase()?'':'<p class="hint">Η διεύθυνση της πλατφόρμας δεν έχει οριστεί ακόμα (Ρυθμίσεις). Θα συμπληρωθεί όταν η πλατφόρμα ανέβει στη διεύθυνσή της.</p>'}`,
    `<button class="btn" data-x>Κλείσιμο</button><button class="btn pri" data-copy>Αντιγραφή μηνύματος</button>`,{wide:true,nofocus:true});
  const draw=()=>{m.$$('#mg-k button').forEach(b=>b.setAttribute('aria-selected',b.dataset.k===k?'true':'false'));
    m.$('#mg-body').textContent=MSG[k][ch](s);m.$('#mg-sub').hidden=ch!=='long';m.$('#mg-subt').textContent=MSG[k].subject();
    m.$('#mg-to').textContent=ch==='long'?(s.email?'Προς: '+s.email:'Δεν έχει καταχωριστεί email'):(s.phone?'Κινητό: '+s.phone:'Δεν έχει καταχωριστεί κινητό');};
  m.$$('#mg-k button').forEach(b=>b.onclick=()=>{k=b.dataset.k;draw();});
  m.$$('input[name=mg-ch]').forEach(r=>r.onchange=()=>{ch=r.value;draw();});
  m.$('#mg-csub').onclick=()=>copy(MSG[k].subject(),'Το θέμα αντιγράφηκε');
  m.$('[data-copy]').onclick=()=>copy(MSG[k][ch](s),'Το μήνυμα αντιγράφηκε· επικολλήστε το σε '+(ch==='long'?'email':'Viber ή SMS'));
  m.$('[data-x]').onclick=m.close;draw();}

/* ---------- Καρτέλα μαθητή ---------- */
async function vStudent(id){const s=await API.getStudent(id);
  if(!s){shell('students',`<div class="card empty"><b>Ο μαθητής δεν βρέθηκε</b><span>Ίσως διαγράφηκε.</span><a class="btn" href="#students">Όλοι οι μαθητές</a></div>`);return;}
  const a=access(s);const cov=cover(s);const gs=s.grants.slice().sort((x,y)=>(x.body+x.from).localeCompare(y.body+y.from));
  const order={expiring:0,active:1,future:2,suspended:3,expired:4};gs.sort((x,y)=>order[API.grantStatus(x)]-order[API.grantStatus(y)]);
  const licRow=g=>{const st=API.grantStatus(g);const d=daysTo(g.to);
    const extra=st==='expiring'?(d<=0?'λήγει σήμερα':d===1?'λήγει αύριο':`λήγει σε ${d} ημέρες`):st==='expired'?`πριν ${-d} ${-d===1?'ημέρα':'ημέρες'}`:st==='future'?`ξεκινά σε ${daysTo(g.from)} ${daysTo(g.from)===1?'ημέρα':'ημέρες'}`:'';
    return `<div class="lic ${st==='expired'||st==='suspended'?'off':''}"><div><div class="l1">${btag(g.body)}<b>${esc(KP.describe(g.body,g.units))}</b><span class="st st-${st}">${GST[st]}</span></div>
      <div class="l2"><span class="num">${fmtD(g.from)} – ${fmtD(g.to)}</span>${extra?' · '+extra:''}${g.note?' · '+esc(g.note):''}</div></div>
      <div class="acts"><button class="btn sm ${st==='expiring'||st==='expired'?'pri':''}" data-ext="${g.id}">Παράταση</button><button class="btn sm" data-units="${g.id}">Ενότητες</button><button class="btn sm" data-sus="${g.id}">${g.suspended?'Επαναφορά':'Αναστολή'}</button><button class="btn sm danger" data-gdel="${g.id}" aria-label="Διαγραφή άδειας">Διαγραφή</button></div></div>`;};
  const unitCard=(b,uid)=>{const u=KP.unit(b.id,uid);const x=uSum(s,b.id,uid);const sc=x?x.score:null;const l=lv(sc);const cat=(CAT[u.app]||{}).skills||[];
    const weak=x?cat.filter(k=>x.skills&&x.skills[k.id]==='weak'):[];const tests=x&&x.tests?x.tests:b.tests.map(t=>({title:t,best:null}));
    const solo=!b.packs.length;const ex=(s.exams||{})[b.id+':'+uid];const xs=solo?tSum(s,b.id,uid):null;
    return `<section class="card pad mod" style="box-shadow:none"><div class="top"><div><h3>${esc(u.title)}</h3><span class="small muted">${x&&x.lastAt?'τελευταία προσπάθεια '+rel(x.lastAt):'δεν έχει ξεκινήσει'}</span></div><div style="text-align:right"><div class="big t-${l.k}">${sc==null?'—':sc+'%'}</div>${pill(sc)}</div></div>
      <div class="meter" role="img" aria-label="Δείκτης ετοιμότητας ${sc==null?0:sc}%"><i class="c-${l.k}" style="width:${sc||0}%"></i></div>
      <div><div class="small muted" style="margin-bottom:4px">Tests (καλύτερη βαθμολογία· βάση ${PASS}%)</div><div class="tests n${tests.length}">${tests.map((t,i)=>{const v=t.best;return `<div class="tc ${v==null?'':v>=PASS?'ok':'lo'}" title="${esc(t.title||'')}">${esc(b.tshort[i]||'')}<b>${v==null?'—':v+'%'}</b></div>`;}).join('')}</div></div>
      <div class="facts"><div><span class="muted">${solo?'Δοκιμές εξέτασης':'Προχωρημένα'}</span><b>${solo?(xs?`${xs.n} · ${xs.passed} επιτυχ.`:'0'):(x&&x.adv?x.adv.done+'/'+x.adv.tot:'—')}</b></div><div><span class="muted">${solo?'Προχωρημένα':'Διαγνωστικό'}</span><b>${solo?(x&&x.adv?x.adv.done+'/'+x.adv.tot:'—'):(x&&x.diag?x.diag.pct+'%':'—')}</b></div><div><span class="muted">Δεξιότητες</span><b>${x&&x.mastery?x.mastery.n+'/'+x.mastery.tot:'—'}</b></div></div>
      ${weak.length?`<div><div class="small muted" style="margin-bottom:5px">Χρειάζεται εξάσκηση σε:</div><div class="chips">${weak.slice(0,6).map(k=>`<span class="chip">${esc(k.t)}</span>`).join('')}${weak.length>6?`<span class="small muted">+${weak.length-6}</span>`:''}</div></div>`:''}
      ${solo?`<div class="exambox"><span>${ex&&ex.status?`<b>${EXST[ex.status]}</b>${ex.date?' · '+fmtD(ex.date):''}`:'<span class="muted">Δεν έχει κλειστεί θέση εξέτασης</span>'}</span><button class="btn sm" data-exam="${b.id}|${uid}">${ex&&ex.status?'Αλλαγή':'Κλείσιμο θέσης'}</button></div>`:''}</section>`;};
  const bodySec=c=>{const b=c.b;const tg=b.packs.length?c.targets.map(tid=>{const t=KP.target(b.id,tid);const sc=tScore(s,b.id,tid);const x=tSum(s,b.id,tid);const ex=(s.exams||{})[b.id+':'+tid];
      return `<div class="tgt"><span><b>${esc(t.title)}</b> <span class="muted">· ${t.units.map(u=>KP.unit(b.id,u).short).join(', ')}</span></span><span class="row"><span class="num">Δείκτης <b class="t-${lv(sc).k}">${sc==null?'—':sc+'%'}</b></span><span class="muted num">δοκιμές εξέτασης: ${x?`${x.n} · ${x.passed} επιτυχ. · καλύτερη ${x.best}%`:'0'}</span>
        <span>${ex&&ex.status?`<b>${EXST[ex.status]}</b>${ex.date?' · '+fmtD(ex.date):''}`:''}</span><button class="btn sm" data-exam="${b.id}|${tid}">${ex&&ex.status?'Αλλαγή':'Κλείσιμο θέσης'}</button></span></div>`;}).join(''):'';
    return `<section class="card"><div class="bh"><span>${esc(b.title).replace(esc(b.name),`<span class="cn">${esc(b.name)}</span>`)}</span><small>${esc(b.examNote)}${c.live?'':' · χωρίς ενεργή πρόσβαση'}</small></div>
      <div class="pad"><div class="mods">${c.units.map(u=>unitCard(b,u)).join('')}</div></div>${tg}</section>`;};
  const hist=s.hist||[];const aev=(await API.listEvents({studentId:id,types:['grant','access','exam'],limit:30}));
  shell('students',`<div><div class="crumbs"><a href="#students">Μαθητές</a>${s.groupId?` · <a href="#group-${s.groupId}">${esc(groupName(s.groupId))}</a>`:''}</div>
    <div class="prof"><div class="who"><h1>${esc(fullName(s))} ${s.demo?'<span class="tag demo">Παράδειγμα</span>':''}</h1><div class="row">${stPill(a)}<span class="muted small">Εγγραφή ${fmtD(s.created)} · τελευταία είσοδος ${s.lastSeen?rel(s.lastSeen):'ποτέ'}</span></div></div>
      <div class="row"><button class="btn" id="st-edit">Επεξεργασία στοιχείων</button><button class="btn" id="st-more" aria-haspopup="dialog">Περισσότερα…</button></div></div></div>
   <div class="access">
    <section class="card pad sec"><div class="sh"><h2>Προσωπικός σύνδεσμος και κωδικός</h2><button class="btn sm pri" id="st-msg">Έτοιμο μήνυμα</button></div>
      <div class="linkbox"><span class="lb">Σύνδεσμος</span><span class="mono" title="${esc(linkOf(s))}">${esc(linkOf(s))}</span><button class="btn sm" id="st-clink">Αντιγραφή</button></div>
      <div class="linkbox code"><span class="lb">Κωδικός</span><span class="mono">${esc(s.code)}</span><button class="btn sm" id="st-ccode">Αντιγραφή</button></div>
      <p class="hint">Ο μαθητής ανοίγει τον σύνδεσμο και γράφει τον κωδικό. Βλέπει μόνο όσα ορίζουν οι άδειές του· παράταση, αναστολή ή νέες ενότητες δεν αλλάζουν τον σύνδεσμο.</p></section>
    <section class="card pad"><dl class="kv"><dt>Τμήμα</dt><dd>${esc(groupName(s.groupId))||'—'}</dd><dt>Κινητό</dt><dd>${esc(s.phone)||'—'}</dd><dt>Email</dt><dd>${esc(s.email)||'—'}</dd><dt>Προσπάθειες</dt><dd class="num">${hist.length}</dd><dt>Σημειώσεις</dt><dd style="white-space:pre-wrap">${esc(s.notes)||'—'}</dd></dl></section>
   </div>
   <section class="card sec" style="gap:0"><div class="sh pad" style="padding-bottom:10px"><h2>Άδειες πρόσβασης</h2><button class="btn sm pri" id="st-grant">Νέα άδεια</button></div>
     ${gs.length?gs.map(licRow).join(''):'<div class="empty"><b>Δεν έχει δοθεί άδεια</b><span>Ο μαθητής δεν βλέπει καμία ενότητα μέχρι να καταχωρίσετε άδεια (φορέας, ενότητες, από–έως).</span></div>'}</section>
   ${cov.map(bodySec).join('')}
   <div class="grid g2" style="align-items:start">
   <section class="card sec"><div class="sh pad" style="padding-bottom:0"><h2>Ιστορικό προσπαθειών</h2><small>${hist.length} συνολικά</small></div>
    ${hist.length?`<div class="tw"><table><thead><tr><th>Ημερομηνία</th><th>Ενότητα</th><th>Είδος</th><th class="r">Βαθμός</th></tr></thead><tbody>${hist.map((h,i)=>{const b=KP.body(h.body);const w=h.unit?(KP.unit(h.body,h.unit)||{}).short:(KP.target(h.body,h.target)||{}).short;
      return `<tr ${i>=15?'class="hx" hidden':''}><td class="num">${fmtDT(h.at)}</td><td>${esc(b?b.name:'')} ${esc(w||'')}</td><td>${esc(h.kind==='test'?h.title:KIND[h.kind]||h.title)}</td><td class="r num"><b class="${h.pct>=PASS?'t-ready':'t-start'}">${h.pct}%</b></td></tr>`;}).join('')}</tbody></table></div>${hist.length>15?`<div class="pad" style="padding-top:6px"><button class="btn sm" id="st-all">Εμφάνιση όλων (${hist.length})</button></div>`:''}`:'<div class="empty">Δεν υπάρχουν ακόμα προσπάθειες.</div>'}</section>
   <section class="card pad sec"><div class="sh"><h2>Ιστορικό πρόσβασης</h2><small>άδειες, κωδικοί, θέσεις εξέτασης</small></div>
    ${aev.length?`<div class="feed">${aev.map(e=>`<div class="it"><span>${evText(e)}</span><span class="when">${fmtDT(e.at)}</span></div>`).join('')}</div>`:'<p class="muted" style="margin:0">Καμία καταχώριση.</p>'}</section></div>`);
  const $=x=>root.querySelector(x);const gById=gid=>s.grants.find(g=>g.id===gid);
  const sa=$('#st-all');if(sa) sa.onclick=()=>{root.querySelectorAll('tr.hx').forEach(t=>t.hidden=false);sa.remove();};
  $('#st-clink').onclick=()=>copy(linkOf(s),'Ο σύνδεσμος αντιγράφηκε');$('#st-ccode').onclick=()=>copy(s.code,'Ο κωδικός αντιγράφηκε');
  $('#st-msg').onclick=()=>msgDialog(s,a.k==='expiring'||a.k==='expired'?'remind':'welcome');
  $('#st-edit').onclick=()=>studentForm(s);$('#st-grant').onclick=()=>grantForm(s);
  root.querySelectorAll('[data-ext]').forEach(b=>b.onclick=()=>extendForm(s,gById(b.dataset.ext)));
  root.querySelectorAll('[data-units]').forEach(b=>b.onclick=()=>grantForm(s,gById(b.dataset.units)));
  root.querySelectorAll('[data-sus]').forEach(b=>b.onclick=()=>toggleSuspend(s,gById(b.dataset.sus)));
  root.querySelectorAll('[data-gdel]').forEach(b=>b.onclick=async()=>{const g=gById(b.dataset.gdel);if(await confirmBox('Διαγραφή άδειας',`Θα διαγραφεί η άδεια ${esc(KP.body(g.body).name)} (${esc(KP.describe(g.body,g.units))}). Η πρόοδος του μαθητή δεν διαγράφεται. Για προσωρινή διακοπή προτιμήστε την «Αναστολή».`,'Διαγραφή',true)){await API.deleteGrant(g.id);toast('Η άδεια διαγράφηκε');render();}});
  root.querySelectorAll('[data-exam]').forEach(b=>b.onclick=()=>{const [bid,tid]=b.dataset.exam.split('|');examForm(s,bid,tid);});
  $('#st-more').onclick=()=>{const m=modal('Ενέργειες για τον μαθητή',`<div class="sec">
     <div class="row" style="justify-content:space-between"><span><b>Νέος κωδικός</b><br><span class="small muted">Ο παλιός κωδικός σταματά να λειτουργεί. Ο σύνδεσμος μένει ίδιος.</span></span><button class="btn" data-a="code">Νέος κωδικός</button></div>
     <div class="row" style="justify-content:space-between"><span><b>Νέος σύνδεσμος και κωδικός</b><br><span class="small muted">Αν ο σύνδεσμος δόθηκε σε τρίτους. Ο παλιός σύνδεσμος παύει να ισχύει.</span></span><button class="btn" data-a="link">Νέος σύνδεσμος</button></div>
     <div class="row" style="justify-content:space-between"><span><b>${s.active?'Απενεργοποίηση λογαριασμού':'Ενεργοποίηση λογαριασμού'}</b><br><span class="small muted">${s.active?'Κλείνει η είσοδος ανεξάρτητα από τις άδειες. Η πρόοδος διατηρείται.':'Θα μπορεί ξανά να μπει, εφόσον έχει άδεια σε ισχύ.'}</span></span><button class="btn" data-a="act">${s.active?'Απενεργοποίηση':'Ενεργοποίηση'}</button></div>
     <div class="row" style="justify-content:space-between"><span><b>Μηδενισμός προόδου</b><br><span class="small muted">Σβήνει όλες τις προσπάθειες και τους δείκτες ετοιμότητας.</span></span><button class="btn danger" data-a="reset">Μηδενισμός</button></div>
     <div class="row" style="justify-content:space-between"><span><b>Διαγραφή μαθητή</b><br><span class="small muted">Διαγράφονται ο μαθητής, οι άδειες και όλη η πρόοδός του.</span></span><button class="btn danger" data-a="del">Διαγραφή</button></div></div>`,'<button class="btn" data-x>Κλείσιμο</button>',{nofocus:true});
    m.$('[data-x]').onclick=m.close;
    m.$('[data-a=code]').onclick=async()=>{m.close();if(await confirmBox('Νέος κωδικός',`Ο κωδικός <b class="mono">${esc(s.code)}</b> θα σταματήσει να λειτουργεί και ο μαθητής θα χρειαστεί τον νέο.`,'Δημιουργία νέου κωδικού')){const c=await API.regenCode(s.id);toast('Νέος κωδικός: '+c);render();}};
    m.$('[data-a=link]').onclick=async()=>{m.close();if(await confirmBox('Νέος σύνδεσμος και κωδικός','Ο παλιός σύνδεσμος και ο παλιός κωδικός θα σταματήσουν να λειτουργούν. Θα χρειαστεί να στείλετε στον μαθητή τα νέα στοιχεία.','Δημιουργία νέων στοιχείων')){await API.regenLink(s.id);toast('Δημιουργήθηκαν νέος σύνδεσμος και κωδικός');pendingMsg=s.id;render();}};
    m.$('[data-a=act]').onclick=async()=>{m.close();const o=Object.assign({},s,{active:!s.active});delete o.summary;delete o.hist;delete o.grants;await API.saveStudent(o);toast(s.active?'Ο λογαριασμός απενεργοποιήθηκε':'Ο λογαριασμός ενεργοποιήθηκε');render();};
    m.$('[data-a=reset]').onclick=async()=>{m.close();if(await confirmBox('Μηδενισμός προόδου',`Θα σβηστούν όλες οι προσπάθειες του/της ${esc(fullName(s))}. Δεν αναιρείται.`,'Μηδενισμός',true)){await API.resetProgress(s.id);toast('Η πρόοδος μηδενίστηκε');render();}};
    m.$('[data-a=del]').onclick=async()=>{m.close();if(await confirmBox('Διαγραφή μαθητή',`Θα διαγραφεί ο/η ${esc(fullName(s))} μαζί με τις άδειες και όλη την πρόοδο. Δεν αναιρείται.`,'Διαγραφή',true)){await API.deleteStudent(s.id);toast('Ο μαθητής διαγράφηκε');location.hash='students';}};};
  if(pendingMsg===s.id){pendingMsg=null;msgDialog(s,'welcome');}}

/* ---------- θέση εξέτασης ---------- */
function examForm(s,bid,tid){const b=KP.body(bid),t=KP.target(bid,tid);const ex=(s.exams||{})[bid+':'+tid]||{};const td=today();const sc=tScore(s,bid,tid);
  const m=modal(`Εξέταση ${b.name} ${t.short}: ${fullName(s)}`,`<div class="banner info" style="justify-content:flex-start"><span>Δείκτης ετοιμότητας: <b>${sc==null?'—':sc+'%'}</b> ${pill(sc)}</span></div>
    <div class="form"><div class="fld"><label for="ex-st">Κατάσταση</label><select class="inp" id="ex-st">${[['booked','Κλείστηκε θέση'],['passed','Πέρασε'],['failed','Δεν πέρασε']].map(([v,x])=>`<option value="${v}" ${(ex.status||'booked')===v?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="fld"><label for="ex-d">Ημερομηνία εξέτασης</label><input class="inp" type="date" id="ex-d" value="${esc(ex.date||'')}"></div>
    <div class="fld full"><label for="ex-n">Σημείωση</label><input class="inp" id="ex-n" value="${esc(ex.note||'')}" placeholder="π.χ. ώρα, αίθουσα"></div></div><div class="err" id="ex-err" role="alert"></div>`,
    `${ex.status?'<button class="btn danger" data-clear style="margin-right:auto">Ακύρωση θέσης</button>':''}<button class="btn" data-x>Άκυρο</button><button class="btn pri" data-save>Αποθήκευση</button>`,{nofocus:true});
  m.$('[data-x]').onclick=m.close;
  m.$('[data-save]').onclick=async()=>{const st=m.$('#ex-st').value,d=m.$('#ex-d').value;if(st==='booked'&&!d){m.$('#ex-err').textContent='Ορίστε την ημερομηνία της εξέτασης.';return;}
    if(st==='booked'&&d<td&&d!==ex.date){m.$('#ex-err').textContent='Η θέση πρέπει να είναι σε σημερινή ή μελλοντική ημερομηνία.';return;}
    await API.setExam(s.id,bid,tid,{status:st,date:d||null,note:m.$('#ex-n').value});m.close();toast('Αποθηκεύτηκε');render();};
  const c=m.$('[data-clear]');if(c) c.onclick=async()=>{await API.setExam(s.id,bid,tid,null);m.close();toast('Η θέση ακυρώθηκε');render();};}

/* ---------- Άδειες ---------- */
const LF={st:'expiring',b:''};
function vLicenses(){const cnt=k=>GR.filter(g=>API.grantStatus(g)===k).length;
  const recentExp=GR.filter(g=>API.grantStatus(g)==='expired'&&daysTo(g.to)>=-30).length;
  shell('licenses',`${demoBanner()}<div class="head"><div><h1>Άδειες πρόσβασης</h1><p>Κάθε άδεια ορίζει φορέα, ενότητες και διάστημα. Όταν λήξει, οι ενότητες κλείνουν αυτόματα· η πρόοδος μένει.</p></div><button class="btn" id="l-copy">Αντιγραφή λίστας</button></div>
   <div class="grid g4">
    <div class="card kpi"><span class="v">${cnt('active')+cnt('expiring')}</span><span class="l">Άδειες σε ισχύ</span><span class="s">${cnt('future')?cnt('future')+' ξεκινούν αργότερα':'&nbsp;'}</span></div>
    <div class="card kpi"><span class="v ${cnt('expiring')?'t-good':''}">${cnt('expiring')}</span><span class="l">Λήγουν σε 14 ημέρες</span><span class="s">για υπενθύμιση ή παράταση</span></div>
    <div class="card kpi"><span class="v">${recentExp}</span><span class="l">Έληξαν τις τελευταίες 30 ημέρες</span><span class="s">${cnt('expired')} ληγμένες συνολικά</span></div>
    <div class="card kpi"><span class="v">${cnt('suspended')}</span><span class="l">Σε αναστολή</span><span class="s">&nbsp;</span></div></div>
   <div class="tools"><select class="inp" id="l-st" aria-label="Κατάσταση">${[['expiring','Λήγουν σε 14 ημέρες'],['live','Σε ισχύ'],['expired','Έληξαν'],['suspended','Σε αναστολή'],['future','Δεν έχουν ξεκινήσει'],['','Όλες οι άδειες']].map(([v,t])=>`<option value="${v}" ${LF.st===v?'selected':''}>${t}</option>`).join('')}</select>
    <select class="inp" id="l-b" aria-label="Φορέας"><option value="">Όλοι οι φορείς</option>${KP.bodies.map(b=>`<option value="${b.id}" ${LF.b===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
   <div class="card tw" id="l-table"></div>`);
  const list=()=>GR.filter(g=>{const st=API.grantStatus(g);if(LF.b&&g.body!==LF.b) return false;if(!LF.st) return true;return LF.st==='live'?(st==='active'||st==='expiring'):st===LF.st;})
    .map(g=>({g,s:studentById(g.studentId)})).filter(x=>x.s).sort((a,b)=>LF.st==='expired'?b.g.to.localeCompare(a.g.to):a.g.to.localeCompare(b.g.to));
  const draw=()=>{const L=list();const box=root.querySelector('#l-table');
    if(!L.length){box.innerHTML=`<div class="empty"><b>Καμία άδεια σε αυτή την κατηγορία</b><span>${LF.st==='expiring'?'Δεν λήγει καμία άδεια τις επόμενες 14 ημέρες.':'Αλλάξτε τα φίλτρα.'}</span></div>`;return;}
    box.innerHTML=`<table><thead><tr><th>Μαθητής</th><th>Φορέας</th><th>Ενότητες</th><th>Από</th><th>Έως</th><th>Κατάσταση</th><th></th></tr></thead><tbody>${L.map(({g,s})=>{const st=API.grantStatus(g);const d=daysTo(g.to);
      return `<tr class="click" data-id="${s.id}" tabindex="0"><td><span class="nm">${esc(fullName(s))}</span><div class="small muted">${esc(groupName(s.groupId))}</div></td><td>${btag(g.body)}</td><td>${esc(KP.describe(g.body,g.units))}</td><td class="num">${fmtD(g.from)}</td><td class="num">${fmtD(g.to)}</td>
        <td><span class="st st-${st}">${st==='expiring'?(d<=0?'Λήγει σήμερα':d===1?'Λήγει αύριο':`Λήγει σε ${d} ημέρες`):GST[st]}</span></td>
        <td class="r"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap"><button class="btn sm" data-msg="${s.id}">Μήνυμα</button><button class="btn sm ${st==='expiring'||st==='expired'?'pri':''}" data-ext="${g.id}">Παράταση</button></div></td></tr>`;}).join('')}</tbody></table>`;
    rowNav('#l-table tr[data-id]','student-');
    box.querySelectorAll('[data-ext]').forEach(b=>b.onclick=()=>{const g=GR.find(x=>x.id===b.dataset.ext);extendForm(studentById(g.studentId),g);});
    box.querySelectorAll('[data-msg]').forEach(b=>b.onclick=()=>{const s=studentById(b.dataset.msg);const k=access(s).k;msgDialog(s,k==='expiring'||k==='expired'?'remind':'welcome');});};
  draw();
  root.querySelector('#l-st').onchange=e=>{LF.st=e.target.value;draw();};root.querySelector('#l-b').onchange=e=>{LF.b=e.target.value;draw();};
  root.querySelector('#l-copy').onclick=()=>copy(['Επώνυμο\tΌνομα\tΚινητό\tEmail\tΦορέας\tΕνότητες\tΑπό\tΈως\tΚατάσταση'].concat(list().map(({g,s})=>[s.last,s.first,s.phone,s.email,KP.body(g.body).name,KP.describe(g.body,g.units),fmtD(g.from),fmtD(g.to),GST[API.grantStatus(g)]].join('\t'))).join('\n'),'Η λίστα αντιγράφηκε· επικολλήστε τη στο Excel');
  wireDemo();}

/* ---------- Τμήματα ---------- */
function groupBody(g,L){if(g.body) return KP.body(g.body);const c={};L.forEach(s=>grantsOf(s.id).forEach(x=>{c[x.body]=(c[x.body]||0)+1;}));const k=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];return KP.body(k||'acta');}
function groupStats(g){const L=S.filter(s=>s.groupId===g.id);const b=groupBody(g,L);const byU={};
  b.units.forEach(u=>{const r=L.filter(s=>{const c=cover(s).find(x=>x.b.id===b.id);return c&&c.units.includes(u.id);});if(!r.length) return;const sc=r.map(s=>uScore(s,b.id,u.id)).filter(x=>x!=null);
    byU[u.id]={n:r.length,avg:sc.length?Math.round(sc.reduce((a,v)=>a+v,0)/sc.length):null,ready:r.filter(s=>(uScore(s,b.id,u.id)||0)>=100).length};});
  return {L,b,byU};}
const uchip=(u,score)=>{const l=lv(score);return `<span class="mchip" title="${esc(u.title)}: ${l.t}">${esc(u.short)}<span class="bar"><i class="c-${l.k}" style="width:${score==null?0:Math.min(score,100)}%"></i></span><b class="t-${l.k}">${score==null?'—':score+'%'}</b></span>`;};
function vGroups(){
  shell('groups',`${demoBanner()}<div class="head"><div><h1>Τμήματα</h1><p>${G.length} τμήματα · ${S.filter(s=>!s.groupId).length} μαθητές χωρίς τμήμα</p></div><button class="btn pri" id="g-new">Νέο τμήμα</button></div>
   ${G.length?`<div class="card tw"><table><thead><tr><th>Τμήμα</th><th>Φορέας</th><th>Εκπαιδευτής</th><th class="r">Μαθητές</th><th>Μέσος δείκτης ανά ενότητα</th></tr></thead><tbody>${G.map(g=>{const st=groupStats(g);
     return `<tr class="click" data-id="${g.id}" tabindex="0"><td><span class="nm">${esc(g.name)}</span> ${g.demo?'<span class="tag demo">Παράδειγμα</span>':''}<div class="small muted">${esc(g.schedule)}</div></td><td>${btag(st.b.id)}</td><td>${esc(g.teacher)||'<span class="muted">—</span>'}</td><td class="r num">${st.L.length}</td>
       <td><div class="row" style="gap:5px">${st.b.units.filter(u=>st.byU[u.id]).map(u=>uchip(u,st.byU[u.id].avg)).join('')||'<span class="muted">—</span>'}</div></td></tr>`;}).join('')}</tbody></table></div>`
   :`<div class="card empty"><b>Δεν υπάρχουν τμήματα</b><span>Τα τμήματα βοηθούν να βλέπετε την πρόοδο κάθε ομάδας μαζί.</span></div>`}`);
  rowNav('tr[data-id]','group-');root.querySelector('#g-new').onclick=()=>groupForm();wireDemo();}
function groupForm(g){const ed=!!g;g=g||{name:'',body:'acta',teacher:'',schedule:'',start:''};
  const m=modal(ed?'Επεξεργασία τμήματος':'Νέο τμήμα',`<form class="form" id="gf" novalidate><div class="fld full"><label for="gf-n">Όνομα τμήματος</label><input class="inp" id="gf-n" value="${esc(g.name)}" placeholder="π.χ. ACTA Δευτέρα–Τετάρτη 18:00"></div>
    <div class="fld"><label for="gf-b">Φορέας πιστοποίησης</label><select class="inp" id="gf-b">${KP.bodies.map(b=>`<option value="${b.id}" ${g.body===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
    <div class="fld"><label for="gf-t">Εκπαιδευτής</label><input class="inp" id="gf-t" value="${esc(g.teacher)}"></div>
    <div class="fld"><label for="gf-p">Πρόγραμμα μαθημάτων</label><input class="inp" id="gf-p" value="${esc(g.schedule)}" placeholder="π.χ. Δευτέρα και Τετάρτη 18:00–20:00"></div><div class="fld"><label for="gf-s">Έναρξη</label><input class="inp" type="date" id="gf-s" value="${esc(g.start)}"></div>
    <div class="err full" id="gf-err" role="alert"></div></form>`,`<button class="btn" data-x>Άκυρο</button><button class="btn pri" data-save>${ed?'Αποθήκευση':'Δημιουργία'}</button>`);
  m.$('[data-x]').onclick=m.close;
  const go=async()=>{try{const o=await API.saveGroup(Object.assign({},g,{name:m.$('#gf-n').value,body:m.$('#gf-b').value,teacher:m.$('#gf-t').value,start:m.$('#gf-s').value,schedule:m.$('#gf-p').value}));m.close();toast('Αποθηκεύτηκε');if(!ed) location.hash='group-'+o.id;else render();}catch(e){m.$('#gf-err').textContent=e.message;}};
  m.$('[data-save]').onclick=go;m.$('#gf').addEventListener('submit',e=>{e.preventDefault();go();});}
function vGroup(id){const g=G.find(x=>x.id===id);if(!g){shell('groups',`<div class="card empty"><b>Το τμήμα δεν βρέθηκε</b><a class="btn" href="#groups">Όλα τα τμήματα</a></div>`);return;}
  const st=groupStats(g);const b=st.b;const units=b.units.filter(u=>st.byU[u.id]);const L=st.L.sort((a,c)=>fullName(a).localeCompare(fullName(c),'el'));
  const weak=[];units.forEach(u=>((CAT[u.app]||{}).skills||[]).forEach(k=>{const tried=L.filter(s=>{const x=uSum(s,b.id,u.id);return x&&x.skills&&x.skills[k.id]&&x.skills[k.id]!=='new';});const w=tried.filter(s=>uSum(s,b.id,u.id).skills[k.id]==='weak').length;if(w) weak.push({u,k,w,n:tried.length});}));
  weak.sort((a,c)=>c.w/c.n-a.w/a.n||c.w-a.w);
  shell('groups',`<div><div class="crumbs"><a href="#groups">Τμήματα</a></div><div class="head"><div><h1>${esc(g.name)} ${g.demo?'<span class="tag demo">Παράδειγμα</span>':''}</h1><p>${[b.name,g.teacher&&'Εκπαιδευτής: '+esc(g.teacher),g.schedule&&esc(g.schedule),g.start&&'Έναρξη '+fmtD(g.start)].filter(Boolean).join(' · ')}</p></div>
    <div class="row"><button class="btn" id="gr-edit">Επεξεργασία</button><button class="btn" id="gr-copy">Αντιγραφή λίστας</button><button class="btn pri" id="gr-new">Νέος μαθητής</button></div></div></div>
   ${units.length?`<div class="grid g3">${units.map(u=>`<div class="card kpi"><span class="v t-${lv(st.byU[u.id].avg).k}">${st.byU[u.id].avg==null?'—':st.byU[u.id].avg+'%'}</span><span class="l">${esc(u.title)}</span><span class="s">μέσος δείκτης · ${st.byU[u.id].ready}/${st.byU[u.id].n} έτοιμοι</span></div>`).join('')}</div>`:''}
   <section class="card sec"><div class="sh pad" style="padding-bottom:0"><h2>Μαθητές του τμήματος</h2><small>${L.length}</small></div>
    ${L.length?`<div class="tw"><table class="matrix"><thead><tr><th>Μαθητής</th><th>Πρόσβαση</th>${units.map(u=>`<th style="text-align:center">${esc(u.short)}</th>`).join('')}<th>Τελευταία φορά</th></tr></thead><tbody>${L.map(s=>{const c=cover(s).find(x=>x.b.id===b.id);
      return `<tr class="click" data-id="${s.id}" tabindex="0"><td><span class="nm">${esc(fullName(s))}</span></td><td>${stPill(access(s))}</td>${units.map(u=>{if(!c||!c.units.includes(u.id)) return '<td class="cell muted">·</td>';const sc=uScore(s,b.id,u.id);const l=lv(sc);return `<td class="cell"><span class="lv-${l.k}" title="${l.t}">${sc==null?'—':sc+'%'}</span></td>`;}).join('')}<td class="muted">${rel(s.lastSeen)}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty">Δεν υπάρχουν μαθητές σε αυτό το τμήμα.</div>'}</section>
   <section class="card pad sec"><div class="sh"><h2>Τι δυσκολεύει το τμήμα</h2><small>δεξιότητες όπου η τελευταία προσπάθεια ήταν λάθος</small></div>
    ${weak.length?weak.slice(0,10).map(x=>`<div class="sk"><div><div class="t">${esc(x.k.t)}</div><div class="g">${esc(x.u.short)} · ${esc(x.k.g)}</div></div><div class="meter"><i class="c-start" style="width:${x.w/x.n*100}%"></i></div><div class="num small" style="text-align:right">${x.w}/${x.n}</div></div>`).join(''):'<p class="muted" style="margin:0">Δεν υπάρχουν ακόμα αρκετά δεδομένα.</p>'}</section>
   <div class="row"><button class="btn danger" id="gr-del">Διαγραφή τμήματος</button></div>`);
  rowNav('tr[data-id]','student-');
  root.querySelector('#gr-edit').onclick=()=>groupForm(g);root.querySelector('#gr-new').onclick=()=>studentForm(null,g.id);
  root.querySelector('#gr-copy').onclick=()=>copy(tsv(L),'Η λίστα αντιγράφηκε· επικολλήστε τη στο Excel');
  root.querySelector('#gr-del').onclick=async()=>{if(await confirmBox('Διαγραφή τμήματος',`Θα διαγραφεί το τμήμα «${esc(g.name)}». Οι ${L.length} μαθητές του δεν διαγράφονται· μένουν χωρίς τμήμα.`,'Διαγραφή',true)){await API.deleteGroup(g.id);toast('Το τμήμα διαγράφηκε');location.hash='groups';}};}

/* ---------- Εξετάσεις ---------- */
const XF={b:''};
function vExams(){const rr=examRows().filter(r=>!XF.b||r.b.id===XF.b);const td=today();const byName=(a,b)=>fullName(a.s).localeCompare(fullName(b.s),'el');
  const free=r=>!(r.ex&&r.ex.status);
  const ready=rr.filter(r=>r.score!=null&&r.score>=100&&free(r)).sort(byName);
  const almost=rr.filter(r=>r.score!=null&&r.score>=PASS&&r.score<100&&free(r)).sort((a,b)=>b.score-a.score);
  const booked=rr.filter(r=>r.ex&&r.ex.status==='booked').sort((a,b)=>(a.ex.date||'').localeCompare(b.ex.date||''));
  const done=rr.filter(r=>r.ex&&(r.ex.status==='passed'||r.ex.status==='failed')).sort((a,b)=>(b.ex.date||'').localeCompare(a.ex.date||''));
  const row=(r,act)=>`<tr><td><a href="#student-${r.s.id}" class="nm">${esc(fullName(r.s))}</a><div class="small muted">${esc(groupName(r.s.groupId))}</div></td><td>${btag(r.b.id)} ${esc(r.t.title)}</td>
    <td class="num">${r.score==null?'—':r.score+'%'}</td><td class="num">${r.x&&r.x.best!=null?r.x.best+'%':'—'}</td>${act(r)}</tr>`;
  const tbl=(rows,head,act,empty)=>rows.length?`<div class="tw"><table><thead><tr><th>Μαθητής</th><th>Εξέταση</th><th>Δείκτης</th><th>Καλύτερη δοκιμή</th>${head}</tr></thead><tbody>${rows.map(r=>row(r,act)).join('')}</tbody></table></div>`:`<div class="empty">${empty}</div>`;
  const key=r=>`${r.s.id}|${r.b.id}|${r.t.id}`;
  shell('exams',`${demoBanner()}<div class="head"><div><h1>Εξετάσεις</h1><p>Ποιοι είναι έτοιμοι, ποιοι έχουν κλεισμένη θέση και τα αποτελέσματα. ACTA: εξέταση ανά ενότητα· GlobalCert: ανά πακέτο Express· UCERT: ανά ομάδα τριών ενοτήτων. Έτοιμος σημαίνει δείκτη 100%.</p></div>
    <select class="inp" id="x-b" aria-label="Φορέας"><option value="">Όλοι οι φορείς</option>${KP.bodies.map(b=>`<option value="${b.id}" ${XF.b===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
   <section class="card sec"><div class="sh pad" style="padding-bottom:0"><h2>Έτοιμοι, χωρίς θέση εξέτασης</h2><small>${ready.length}</small></div>${tbl(ready,'<th></th>',r=>`<td class="r"><button class="btn sm pri" data-book="${key(r)}">Κλείσιμο θέσης</button></td>`,'Κανένας μαθητής δεν περιμένει θέση εξέτασης.')}</section>
   <section class="card sec"><div class="sh pad" style="padding-bottom:0"><h2>Κλεισμένες θέσεις</h2><small>${booked.length}</small></div>${tbl(booked,'<th>Ημερομηνία</th><th></th>',r=>{const past=r.ex.date&&r.ex.date<td;return `<td class="num ${past?'t-good':''}">${fmtD(r.ex.date)}${past?' · καταχωρίστε αποτέλεσμα':''}</td><td class="r"><button class="btn sm" data-book="${key(r)}">${past?'Αποτέλεσμα':'Αλλαγή'}</button></td>`;},'Δεν υπάρχουν κλεισμένες θέσεις.')}</section>
   <section class="card sec"><div class="sh pad" style="padding-bottom:0"><h2>Σχεδόν έτοιμοι</h2><small>δείκτης ${PASS}–99%</small></div>${tbl(almost,'<th></th>',r=>`<td class="r"><button class="btn sm" data-book="${key(r)}">Κλείσιμο θέσης</button></td>`,'Κανένας μαθητής σε αυτό το στάδιο.')}</section>
   <section class="card sec"><div class="sh pad" style="padding-bottom:0"><h2>Αποτελέσματα εξετάσεων</h2><small>${done.filter(r=>r.ex.status==='passed').length} επιτυχίες · ${done.filter(r=>r.ex.status==='failed').length} αποτυχίες</small></div>${tbl(done,'<th>Ημερομηνία</th><th>Αποτέλεσμα</th>',r=>`<td class="num">${fmtD(r.ex.date)}</td><td><span class="pill ${r.ex.status==='passed'?'lv-ready':'lv-start'}">${EXST[r.ex.status]}</span></td>`,'Δεν έχουν καταχωριστεί αποτελέσματα.')}</section>`);
  root.querySelector('#x-b').onchange=e=>{XF.b=e.target.value;vExams();};
  root.querySelectorAll('[data-book]').forEach(b=>b.onclick=()=>{const [id,bid,tid]=b.dataset.book.split('|');examForm(studentById(id),bid,tid);});wireDemo();}

/* ---------- Αδύναμα σημεία ---------- */
const SK={b:'',u:'',g:''};
function vSkills(){
  if(!SK.b) SK.b=(KP.bodies.find(b=>S.some(s=>s.summary&&s.summary[b.id]))||KP.bodies[0]).id;
  const b=KP.body(SK.b);if(!b.units.some(u=>u.id===SK.u)) SK.u=(b.units.find(u=>S.some(s=>uSum(s,b.id,u.id)))||b.units[0]).id;
  const u=KP.unit(b.id,SK.u);
  const L=S.filter(s=>s.active&&(!SK.g||s.groupId===SK.g)&&cover(s).some(c=>c.b.id===b.id&&c.units.includes(u.id)));
  const cat=(CAT[u.app]||{}).skills||[];const n=L.length;
  const rows=cat.map(k=>{const c={weak:0,learning:0,mastered:0,new:0};L.forEach(s=>{const x=uSum(s,b.id,u.id);const st=(x&&x.skills&&x.skills[k.id])||'new';c[st]=(c[st]||0)+1;});const tried=c.weak+c.learning+c.mastered;return {k,c,tried,rate:tried?c.weak/tried:0};})
    .sort((a,c)=>c.rate-a.rate||c.c.weak-a.c.weak);
  shell('skills',`${demoBanner()}<div class="head"><div><h1>Αδύναμα σημεία</h1><p>Σε ποιες δεξιότητες δυσκολεύονται οι μαθητές, για να ξέρει ο εκπαιδευτής τι να επαναλάβει στην τάξη.</p></div></div>
   <div class="tools"><select class="inp" id="k-b" aria-label="Φορέας">${KP.bodies.map(x=>`<option value="${x.id}" ${SK.b===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>
    <select class="inp" id="k-u" aria-label="Ενότητα">${b.units.map(x=>`<option value="${x.id}" ${SK.u===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select>
    <select class="inp" id="k-g" aria-label="Τμήμα"><option value="">Όλα τα τμήματα</option>${G.map(g=>`<option value="${g.id}" ${SK.g===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select><span class="muted small">${n} μαθητές</span></div>
   <section class="card pad sec"><div class="legend"><span><i class="c-start"></i>Χρειάζεται εξάσκηση</span><span><i class="c-good"></i>Σε εξέλιξη</span><span><i class="c-ready"></i>Κατακτήθηκε</span><span><i class="c-none"></i>Δεν έχει ελεγχθεί</span></div>
    ${n?rows.map(r=>`<div class="sk"><div><div class="t">${esc(r.k.t)}</div><div class="g">${esc(r.k.g)}</div></div>
      <div class="stack" role="img" aria-label="${esc(r.k.t)}: ${r.c.weak} χρειάζονται εξάσκηση, ${r.c.learning} σε εξέλιξη, ${r.c.mastered} κατέκτησαν, ${r.c.new} δεν ελέγχθηκαν">${[['weak','start'],['learning','good'],['mastered','ready'],['new','none']].map(([k,c])=>r.c[k]?`<i class="c-${c}" style="width:${r.c[k]/n*100}%"></i>`:'').join('')}</div>
      <div class="num small" style="text-align:right" title="ποσοστό λαθών σε όσους δοκίμασαν">${r.tried?Math.round(r.rate*100)+'%':'—'}</div></div>`).join(''):'<div class="empty">Κανένας μαθητής σε αυτή την ενότητα.</div>'}</section>`);
  root.querySelector('#k-b').onchange=e=>{SK.b=e.target.value;SK.u='';vSkills();};root.querySelector('#k-u').onchange=e=>{SK.u=e.target.value;vSkills();};root.querySelector('#k-g').onchange=e=>{SK.g=e.target.value;vSkills();};wireDemo();}

/* ---------- Ανακοινώσεις ---------- */
function newsState(n){const t=today();if(!n.active) return {k:'suspended',t:'Κρυφή'};if(n.from&&t<n.from) return {k:'future',t:'Από '+fmtD(n.from)};if(n.to&&t>n.to) return {k:'expired',t:'Έληξε '+fmtD(n.to)};return {k:'active',t:n.to?'Εμφανίζεται έως '+fmtD(n.to):'Εμφανίζεται'};}
async function vNews(){const pub=await API.publicNews();
  shell('news',`${demoBanner()}<div class="head"><div><h1>Ανακοινώσεις</h1><p>Εμφανίζονται στην αρχική σελίδα της πλατφόρμας, ίδιες για όλους τους μαθητές.</p></div><button class="btn pri" id="n-new">Νέα ανακοίνωση</button></div>
   <div class="grid g2" style="align-items:start">
    <section class="card sec" style="gap:0"><div class="sh pad" style="padding-bottom:10px"><h2>Όλες οι ανακοινώσεις</h2><small>${NEWS.length}</small></div>
     ${NEWS.length?NEWS.map(n=>{const st=newsState(n);return `<div class="news-it"><div><time>${fmtD(n.date)} ${n.demo?'<span class="tag demo">Παράδειγμα</span>':''}</time><div style="overflow-wrap:anywhere">${esc(n.text)}</div><div style="margin-top:6px"><span class="st st-${st.k}">${esc(st.t)}</span></div></div>
       <div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-ned="${n.id}">Αλλαγή</button><button class="btn sm danger" data-ndel="${n.id}">Διαγραφή</button></div></div>`;}).join(''):'<div class="empty"><b>Καμία ανακοίνωση</b><span>Οι μαθητές βλέπουν «Δεν υπάρχουν νέες ανακοινώσεις».</span></div>'}</section>
    <div class="sec">
     <section class="card pad sec"><div class="sh"><h2>Όπως φαίνεται στους μαθητές σήμερα</h2></div>
      <div class="preview"><div class="pc"><h3>Ανακοινώσεις</h3>${pub.length?`<ul>${pub.map(n=>`<li><time>${esc(fmtLong(n.date))}</time>${esc(n.text)}</li>`).join('')}</ul>`:'<p class="muted" style="margin:8px 0 0">Δεν υπάρχουν νέες ανακοινώσεις.</p>'}</div>
       <div class="pc" style="margin-top:10px"><h3>Γραμματεία</h3><p style="margin:8px 0 0;font-size:14.5px">${esc(SET.contact)||'Για απορίες ή για πρόβλημα με τον κωδικό σας, απευθυνθείτε στη γραμματεία του κέντρου.'}</p></div></div></section>
     <section class="card pad sec"><h2>Κείμενο «Γραμματεία» στην αρχική σελίδα</h2><div class="fld"><label for="n-contact">Ωράριο και τρόπος επικοινωνίας</label><textarea class="inp" id="n-contact" style="min-height:80px;font-family:var(--f-ui);font-size:14px">${esc(SET.contact)}</textarea></div><div><button class="btn" id="n-csave">Αποθήκευση κειμένου</button></div></section>
    </div></div>`);
  root.querySelector('#n-new').onclick=()=>newsForm();
  root.querySelectorAll('[data-ned]').forEach(b=>b.onclick=()=>newsForm(NEWS.find(n=>n.id===b.dataset.ned)));
  root.querySelectorAll('[data-ndel]').forEach(b=>b.onclick=async()=>{if(await confirmBox('Διαγραφή ανακοίνωσης','Η ανακοίνωση θα πάψει να εμφανίζεται στους μαθητές και θα διαγραφεί.','Διαγραφή',true)){await API.deleteNews(b.dataset.ndel);toast('Η ανακοίνωση διαγράφηκε');render();}});
  root.querySelector('#n-csave').onclick=async()=>{await API.saveSettings({contact:root.querySelector('#n-contact').value.trim()});toast('Το κείμενο αποθηκεύτηκε');render();};wireDemo();}
function newsForm(n){const ed=!!n;n=n||{text:'',date:today(),from:'',to:'',active:true};
  const m=modal(ed?'Αλλαγή ανακοίνωσης':'Νέα ανακοίνωση',`<form class="form" id="nf" novalidate>
    <div class="fld full"><label for="nf-t">Κείμενο</label><textarea class="inp" id="nf-t" maxlength="400" style="min-height:96px;font-family:var(--f-ui);font-size:14px">${esc(n.text)}</textarea><span class="hint">Σύντομα και συγκεκριμένα· έως 400 χαρακτήρες.</span></div>
    <div class="fld"><label for="nf-d">Ημερομηνία ανακοίνωσης</label><input class="inp" type="date" id="nf-d" value="${esc(n.date)}"></div><div></div>
    <div class="fld"><label for="nf-from">Εμφάνιση από (προαιρετικό)</label><input class="inp" type="date" id="nf-from" value="${esc(n.from)}"></div>
    <div class="fld"><label for="nf-to">Εμφάνιση έως (προαιρετικό)</label><input class="inp" type="date" id="nf-to" value="${esc(n.to)}"></div>
    <label class="switch full"><input type="checkbox" id="nf-a" ${n.active?'checked':''}> Ορατή στους μαθητές</label>
    <div class="err full" id="nf-err" role="alert"></div></form>`,`<button class="btn" data-x>Άκυρο</button><button class="btn pri" data-save>${ed?'Αποθήκευση':'Δημοσίευση'}</button>`);
  m.$('[data-x]').onclick=m.close;
  const go=async()=>{try{await API.saveNews(Object.assign({},n,{text:m.$('#nf-t').value,date:m.$('#nf-d').value,from:m.$('#nf-from').value,to:m.$('#nf-to').value,active:m.$('#nf-a').checked}));m.close();toast('Η ανακοίνωση αποθηκεύτηκε');render();}catch(e){m.$('#nf-err').textContent=e.message;}};
  m.$('[data-save]').onclick=go;m.$('#nf').addEventListener('submit',e=>{e.preventDefault();go();});}

/* ---------- Ρυθμίσεις ---------- */
function vConfig(){
  shell('config',`<div class="head"><div><h1>Ρυθμίσεις</h1></div></div>
   ${LIVE?'<div class="banner info"><span><b>Συνδεδεμένο με τη βάση δεδομένων του κέντρου.</b> Ό,τι καταχωρείτε αποθηκεύεται στη βάση και φαίνεται από κάθε υπολογιστή της γραμματείας.</span></div>':'<div class="banner info"><span><b>Δοκιμαστική έκδοση με δεδομένα παραδείγματος.</b> Προς το παρόν όλα αποθηκεύονται μόνο σε αυτόν τον browser. Όταν συνδεθεί η βάση δεδομένων, οι ίδιες οθόνες θα δουλεύουν με τους πραγματικούς μαθητές, από κάθε υπολογιστή της γραμματείας.</span></div>'}
   <div class="grid g2">
    <section class="card pad sec"><h2>Κέντρο και πλατφόρμα</h2><div class="fld"><label for="c-name">Όνομα κέντρου</label><input class="inp" id="c-name" value="${esc(SET.center)}"></div>
     <div class="fld"><label for="c-url">Διεύθυνση της πλατφόρμας μαθητή</label><input class="inp" id="c-url" type="url" inputmode="url" placeholder="https://…" value="${esc(SET.platformUrl)}"><span class="hint">Με αυτή σχηματίζεται ο προσωπικός σύνδεσμος κάθε μαθητή. Θα οριστεί όταν η πλατφόρμα ανέβει στη διεύθυνσή της.</span></div>
     <label class="switch"><input type="checkbox" id="c-guest" ${SET.allowGuest?'checked':''}> Επιτρέπεται δοκιμαστική είσοδος χωρίς κωδικό</label>
     <div class="err" id="c-err" role="alert"></div><div><button class="btn pri" id="c-save">Αποθήκευση</button></div></section>
    <section class="card pad sec"><h2>Κωδικός γραμματείας</h2><div class="fld"><label for="c-old">Τρέχων κωδικός</label><input class="inp" type="password" id="c-old" autocomplete="current-password"></div>
     <div class="fld"><label for="c-new">Νέος κωδικός (τουλάχιστον 6 χαρακτήρες)</label><input class="inp" type="password" id="c-new" autocomplete="new-password"></div><div class="err" id="c-perr" role="alert"></div><div><button class="btn" id="c-pass">Αλλαγή κωδικού</button></div></section>
    <section class="card pad sec"><h2>Αντίγραφο ασφαλείας</h2><p class="small muted" style="margin:0">Αντιγράψτε όλα τα δεδομένα (μαθητές, άδειες, τμήματα, πρόοδο, ανακοινώσεις) και φυλάξτε τα σε ένα αρχείο κειμένου. ${LIVE?'Κάντε το τακτικά: το δωρεάν πλάνο της βάσης δεν κρατά αυτόματα αντίγραφα.':'Για επαναφορά, επικολλήστε το κείμενο εδώ.'}</p>
     <div class="row"><button class="btn" id="c-exp">Αντιγραφή όλων των δεδομένων</button>${LIVE?'':'<button class="btn" id="c-imp">Επαναφορά…</button>'}</div></section>
    <section class="card pad sec" ${LIVE?'hidden':''}><h2>Δεδομένα παραδείγματος</h2><p class="small muted" style="margin:0">Φανταστικοί μαθητές, άδειες και πρόοδος και για τους τρεις φορείς, για επίδειξη και εκπαίδευση της γραμματείας. Σημειώνονται ως «Παράδειγμα».</p>
     <div class="row"><button class="btn" id="c-demo">${S.some(s=>s.demo)?'Επαναφόρτωση παραδειγμάτων':'Φόρτωση παραδειγμάτων'}</button>${S.some(s=>s.demo)?'<button class="btn danger" id="c-undemo">Διαγραφή παραδειγμάτων</button>':''}</div></section></div>`);
  const $=x=>root.querySelector(x);
  $('#c-save').onclick=async()=>{const url=$('#c-url').value.trim();if(url&&!/^https:\/\/[^\s]+\.[^\s]+/.test(url)){$('#c-err').textContent='Η διεύθυνση πρέπει να ξεκινά με https:// (π.χ. https://onoma.github.io/platforma).';return;}
    await API.saveSettings({center:$('#c-name').value.trim()||'Κέντρο',platformUrl:url,allowGuest:$('#c-guest').checked});toast('Οι ρυθμίσεις αποθηκεύτηκαν');render();};
  $('#c-pass').onclick=async()=>{try{await API.adminChangePass($('#c-old').value,$('#c-new').value);toast('Ο κωδικός άλλαξε');render();}catch(e){$('#c-perr').textContent=e.message;}};
  $('#c-exp').onclick=async()=>copy(JSON.stringify(await API.exportAll()),'Τα δεδομένα αντιγράφηκαν· επικολλήστε τα σε ένα αρχείο κειμένου');
  if(!LIVE) $('#c-imp').onclick=()=>{const m=modal('Επαναφορά από αντίγραφο',`<p class="muted" style="margin:0">Τα τρέχοντα δεδομένα θα αντικατασταθούν από το αντίγραφο. Ο κωδικός γραμματείας δεν αλλάζει.</p><textarea class="inp" id="im-t" placeholder="Επικολλήστε εδώ το αντίγραφο ασφαλείας"></textarea><div class="err" id="im-err" role="alert"></div>`,'<button class="btn" data-x>Άκυρο</button><button class="btn danger solid" data-go>Αντικατάσταση δεδομένων</button>');
    m.$('[data-x]').onclick=m.close;m.$('[data-go]').onclick=async()=>{try{await API.importAll(JSON.parse(m.$('#im-t').value));m.close();toast('Τα δεδομένα επαναφέρθηκαν');render();}catch(e){m.$('#im-err').textContent=e instanceof SyntaxError?'Το κείμενο δεν είναι έγκυρο αντίγραφο ασφαλείας.':e.message;}};};
  if(!LIVE) $('#c-demo').onclick=async()=>{await API.seedDemo();toast('Φορτώθηκαν δεδομένα παραδείγματος');render();};
  const u=$('#c-undemo');if(u) u.onclick=async()=>{await API.removeDemo();toast('Τα παραδείγματα διαγράφηκαν');render();};}


/* ---------- Οδηγός χρήσης (το κείμενο βρίσκεται στο js/guide.js) ---------- */
let GQ='';
const fold=t=>String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function vGuide(sec){const GD=window.KP_GUIDE;
  if(!GD){shell('guide','<div class="card empty"><b>Ο οδηγός δεν φορτώθηκε</b><span>Ανανεώστε τη σελίδα.</span></div>');return;}
  const secs=GD.sections;
  shell('guide',`<div class="head"><div><h1>Οδηγός χρήσης</h1><p>Διαχειριστικό γραμματείας · ${esc(SET.center||'')}</p></div>
     <div class="row"><input class="inp search" id="g-q" type="search" placeholder="Αναζήτηση στον οδηγό" aria-label="Αναζήτηση στον οδηγό" value="${esc(GQ)}"><button class="btn" id="g-copy">Αντιγραφή οδηγού</button></div></div>
   <div class="gmeta"><span><b>Έκδοση οδηγού ${esc(GD.version)}</b></span><span>Τελευταία ενημέρωση: <b>${esc(fmtLong(GD.date))}</b></span><span>${esc(GD.stage)}</span></div>
   <div class="guide"><nav class="gtoc card" aria-label="Περιεχόμενα οδηγού"><b>Περιεχόμενα</b><ol>${secs.map(x=>`<li><a href="#guide-${x.id}" data-g="${x.id}">${esc(x.title)}</a></li>`).join('')}</ol></nav>
    <div class="gbody" id="g-body">${secs.map((x,i)=>`<section class="card pad gsec" id="g-${x.id}"><h2><span class="gn">${i+1}</span>${esc(x.title)}</h2>${x.html}</section>`).join('')}<div class="card empty" id="g-none" hidden><b>Δεν βρέθηκε τίποτα</b><span>Δοκιμάστε άλλη λέξη, π.χ. «παράταση», «κωδικός», «δείκτης».</span></div></div></div>`);
  const body=root.querySelector('#g-body');
  const go=(id,smooth)=>{const el=document.getElementById('g-'+id);if(!el||el.hidden) return false;el.scrollIntoView({block:'start',behavior:smooth?'smooth':'auto'});
    root.querySelectorAll('.gtoc a').forEach(a=>a.toggleAttribute('aria-current',a.dataset.g===id));return true;};
  root.querySelectorAll('a[href^="#guide-"]').forEach(a=>{if(a.closest('.nav')) return;a.onclick=e=>{const id=a.getAttribute('href').slice(7);if(!document.getElementById('g-'+id)) return;e.preventDefault();
    if(document.getElementById('g-'+id).hidden){GQ='';root.querySelector('#g-q').value='';filter();}
    go(id,false);try{history.replaceState(null,'','#guide-'+id);}catch(x){}};});
  const filter=()=>{const q=fold(GQ.trim());let n=0;body.querySelectorAll('.gsec').forEach(el=>{const ok=!q||fold(el.textContent).includes(q);el.hidden=!ok;if(ok) n++;
      const li=root.querySelector(`.gtoc a[data-g="${el.id.slice(2)}"]`);if(li) li.parentElement.hidden=!ok;});root.querySelector('#g-none').hidden=n>0;};
  root.querySelector('#g-q').oninput=e=>{GQ=e.target.value;filter();};
  root.querySelector('#g-copy').onclick=()=>{const txt=`ΟΔΗΓΟΣ ΧΡΗΣΗΣ · Διαχειριστικό γραμματείας · ${SET.center||''}\nΈκδοση ${GD.version} · Τελευταία ενημέρωση ${fmtLong(GD.date)}\n${GD.stage}\n\n`+[...body.querySelectorAll('.gsec')].filter(el=>!el.hidden).map(el=>el.innerText.trim()).join('\n\n────────────\n\n');
    copy(txt,'Ο οδηγός αντιγράφηκε· επικολλήστε τον σε Word για εκτύπωση');};
  filter();if(sec) setTimeout(()=>go(sec,false),60);}

/* ---------- είσοδος γραμματείας ---------- */
if(API.onSessionExpired) API.onSessionExpired(()=>{authed=false;document.querySelectorAll('.ov').forEach(e=>e.remove());boot();});
async function boot(){await API.firstRun();const st=await API.adminStatus();SET=await API.getSettings();authed=st.loggedIn;if(authed) return render();
  const setup=!st.configured&&!LIVE;
  root.innerHTML=`<div class="login"><form class="card" id="lf" novalidate><div class="brand"><img src="img/kp-k.png" alt="" width="39" height="44"><span style="display:block"><b>${esc(SET.center)}</b><small>Γνώση. Τεχνολογία. Μέλλον.</small></span></div>
    <h1 style="font-size:1.25rem">${setup?'Ορισμός κωδικού γραμματείας':'Είσοδος γραμματείας'}</h1>
    <p class="muted" style="margin:0">${setup?'Πρώτη χρήση: ορίστε τον κωδικό με τον οποίο θα μπαίνει η γραμματεία στο διαχειριστικό. Τουλάχιστον 6 χαρακτήρες.':LIVE?'Συνδεθείτε με το email και τον κωδικό της γραμματείας.':'Πληκτρολογήστε τον κωδικό της γραμματείας.'}</p>
    ${LIVE?'<div class="fld"><label for="lf-e">Email</label><input class="inp" type="email" id="lf-e" autocomplete="username" inputmode="email"></div>':''}
    <div class="fld"><label for="lf-p">Κωδικός</label><input class="inp" type="password" id="lf-p" autocomplete="${setup?'new-password':'current-password'}"></div>
    ${setup?'<div class="fld"><label for="lf-p2">Επανάληψη κωδικού</label><input class="inp" type="password" id="lf-p2" autocomplete="new-password"></div>':''}
    <div class="err" id="lf-err" role="alert"></div><button class="btn pri" type="submit" style="justify-content:center">${setup?'Ορισμός και είσοδος':'Είσοδος'}</button>
    ${setup?'<p class="hint" style="text-align:center">Δοκιμαστική έκδοση: έχουν φορτωθεί φανταστικοί μαθητές για να δείτε όλες τις οθόνες.</p>':''}</form></div>`;
  const f=root.querySelector('#lf');setTimeout(()=>{const p=root.querySelector(LIVE?'#lf-e':'#lf-p');if(p) p.focus();},30);
  f.addEventListener('submit',async e=>{e.preventDefault();const p=root.querySelector('#lf-p').value;const err=root.querySelector('#lf-err');
    try{if(setup){if(p!==root.querySelector('#lf-p2').value) throw new Error('Οι δύο κωδικοί δεν ταιριάζουν.');await API.adminSetup(p);}else await API.adminLogin(p,LIVE?root.querySelector('#lf-e').value:undefined);authed=true;render();}
    catch(x){err.textContent=x.message;}});}
boot();
})();
