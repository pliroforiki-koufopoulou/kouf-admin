/* CenterAPI v2 — στρώμα δεδομένων του κέντρου για το διαχειριστικό γραμματείας.
   Συλλογές (αντιστοιχούν 1:1 στους πίνακες της βάσης του βήματος 2):
     settings · groups · students · grants (άδειες) · progress (σύνοψη ανά μαθητή) · events (ιστορικό) · news (ανακοινώσεις)
   ΤΩΡΑ: αποθήκευση στον browser (localStorage, κλειδί kp-admin-db-v2) — δεδομένα παραδείγματος.
   ΒΗΜΑ 3: οι ίδιες async μέθοδοι θα υλοποιηθούν πάνω στο Supabase· οι οθόνες δεν αλλάζουν. */
(function(){
'use strict';
const KP=window.KP;
const KEY='kp-admin-db-v2',AKEY='kp-admin-session';
const fresh=()=>({v:2,settings:{center:'Πληροφορική Κουφόπουλου',platformUrl:'',contact:'',allowGuest:false,adminHash:null,seeded:false},
  groups:[],students:[],grants:[],progress:{},events:[],news:[]});
let DB=null,volatile=false;
function load(){if(DB) return DB;let raw=null;try{raw=localStorage.getItem(KEY);}catch(e){volatile=true;}
  try{DB=raw?JSON.parse(raw):null;}catch(e){DB=null;}
  if(!DB||typeof DB!=='object'||!Array.isArray(DB.students)) DB=fresh();
  const f=fresh();Object.keys(f).forEach(k=>{if(DB[k]==null) DB[k]=f[k];});DB.settings=Object.assign(f.settings,DB.settings||{});return DB;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(DB));}catch(e){volatile=true;}}
const db=load;
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const nowISO=()=>new Date().toISOString();
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const ss={get(k){try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch(e){return ss.mem[k]||null;}},set(k,v){ss.mem[k]=v;try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}},mem:{}};

/* κωδικοί μαθητών ΧΧΧΧ-ΧΧΧΧ χωρίς 0/O, 1/I/L· αναγνωριστικό προσωπικού link (10 χαρακτήρες) */
const ALPH='ABCDEFGHJKMNPQRSTUVWXYZ23456789',LALPH='abcdefghjkmnpqrstuvwxyz23456789';
function rnd(n,al){const a=new Uint32Array(n);try{crypto.getRandomValues(a);}catch(e){for(let i=0;i<n;i++) a[i]=Math.random()*4294967296;}return [...a].map(x=>al[x%al.length]).join('');}
function newCode(){const used=new Set(db().students.map(s=>s.code));let c;do{c=rnd(8,ALPH);c=c.slice(0,4)+'-'+c.slice(4);}while(used.has(c));return c;}
function newLink(){const used=new Set(db().students.map(s=>s.linkId));let c;do{c=rnd(10,LALPH);}while(used.has(c));return c;}
const normCode=c=>{const x=String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return x.length===8?x.slice(0,4)+'-'+x.slice(4):x;};
async function sha(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('kouf:'+s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  catch(e){let h=0;for(const ch of 'kouf:'+s) h=(h*31+ch.charCodeAt(0))|0;return 'x'+h;}}

/* κατάσταση άδειας: suspended · future · expired · expiring (≤14 ημέρες) · active */
function grantStatus(g,t){t=t||today();if(g.suspended) return 'suspended';if(g.from&&t<g.from) return 'future';if(g.to&&t>g.to) return 'expired';
  if(g.to){const d=Math.round((new Date(g.to+'T00:00:00')-new Date(t+'T00:00:00'))/864e5);if(d<=14) return 'expiring';}return 'active';}
const grantLive=g=>{const s=grantStatus(g);return s==='active'||s==='expiring';};
function logEv(e){const d=db();d.events.push(Object.assign({id:uid('e'),at:nowISO()},e));if(d.events.length>6000) d.events=d.events.slice(-6000);}
function cleanStudent(s){return {id:s.id||uid('s'),code:s.code||newCode(),linkId:s.linkId||newLink(),first:String(s.first||'').trim(),last:String(s.last||'').trim(),
  phone:String(s.phone||'').trim(),email:String(s.email||'').trim(),groupId:s.groupId||null,exams:s.exams||{},notes:String(s.notes||''),
  active:s.active!==false,demo:!!s.demo,created:s.created||nowISO(),lastSeen:s.lastSeen||null};}
function cleanGrant(g){const b=KP.body(g.body);if(!b) throw new Error('Επιλέξτε φορέα πιστοποίησης.');
  const units=KP.normalize(g.body,g.units);if(!units.length) throw new Error('Επιλέξτε τουλάχιστον μία ενότητα.');
  if(!g.from||!g.to) throw new Error('Ορίστε ημερομηνία έναρξης και λήξης.');if(g.to<g.from) throw new Error('Η λήξη δεν μπορεί να είναι πριν από την έναρξη.');
  return {id:g.id||uid('a'),studentId:g.studentId,body:g.body,units,from:g.from,to:g.to,suspended:!!g.suspended,note:String(g.note||'').trim(),demo:!!g.demo,created:g.created||nowISO()};}

const API={
  backend:'local',get volatile(){return volatile;},normCode,grantStatus,grantLive,today,
  /* ---------- ρυθμίσεις ---------- */
  async getSettings(){const s=clone(db().settings);delete s.adminHash;return s;},
  async saveSettings(p){const d=db();Object.keys(p||{}).forEach(k=>{if(k!=='adminHash') d.settings[k]=p[k];});save();return this.getSettings();},
  /* ---------- γραμματεία ---------- */
  async adminStatus(){return {configured:!!db().settings.adminHash,loggedIn:!!ss.get(AKEY)};},
  async adminSetup(pass){if(String(pass||'').length<6) throw new Error('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.');
    const d=db();if(d.settings.adminHash) throw new Error('Έχει ήδη οριστεί κωδικός γραμματείας.');d.settings.adminHash=await sha(pass);save();ss.set(AKEY,{at:nowISO()});return true;},
  async adminLogin(pass){const d=db();if(!d.settings.adminHash) throw new Error('Δεν έχει οριστεί κωδικός.');if(await sha(pass)!==d.settings.adminHash) throw new Error('Λάθος κωδικός. Δοκιμάστε ξανά.');ss.set(AKEY,{at:nowISO()});return true;},
  async adminChangePass(oldp,newp){const d=db();if(await sha(oldp)!==d.settings.adminHash) throw new Error('Ο τρέχων κωδικός δεν είναι σωστός.');if(String(newp||'').length<6) throw new Error('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.');d.settings.adminHash=await sha(newp);save();return true;},
  async adminLogout(){ss.set(AKEY,null);},
  /* ---------- τμήματα ---------- */
  async listGroups(){return clone(db().groups).sort((a,b)=>a.name.localeCompare(b.name,'el'));},
  async saveGroup(g){const d=db();const name=String(g.name||'').trim();if(!name) throw new Error('Δώστε όνομα τμήματος.');
    if(d.groups.some(x=>x.id!==g.id&&x.name.toLowerCase()===name.toLowerCase())) throw new Error('Υπάρχει ήδη τμήμα με αυτό το όνομα.');
    const o={id:g.id||uid('g'),name,body:KP.body(g.body)?g.body:'',teacher:String(g.teacher||'').trim(),schedule:String(g.schedule||'').trim(),start:g.start||'',demo:!!g.demo,created:g.created||nowISO()};
    const i=d.groups.findIndex(x=>x.id===o.id);if(i>=0) d.groups[i]=o;else d.groups.push(o);save();return clone(o);},
  async deleteGroup(id){const d=db();d.groups=d.groups.filter(g=>g.id!==id);d.students.forEach(s=>{if(s.groupId===id) s.groupId=null;});save();},
  /* ---------- μαθητές ---------- */
  async listStudents(){const d=db();return d.students.map(s=>Object.assign(clone(s),{summary:clone((d.progress[s.id]||{}).summary||{})}));},
  async getStudent(id){const d=db();const s=d.students.find(x=>x.id===id);if(!s) return null;const p=d.progress[id]||{};
    return Object.assign(clone(s),{summary:clone(p.summary||{}),hist:clone(p.hist||[]),grants:clone(d.grants.filter(g=>g.studentId===id))});},
  async saveStudent(s){const d=db();if(!String(s.first||'').trim()||!String(s.last||'').trim()) throw new Error('Συμπληρώστε όνομα και επώνυμο.');
    const i=d.students.findIndex(x=>x.id===s.id);const o=cleanStudent(Object.assign({},i>=0?d.students[i]:{},s));
    if(i>=0) d.students[i]=o;else d.students.push(o);save();return clone(o);},
  async deleteStudent(id){const d=db();d.students=d.students.filter(s=>s.id!==id);d.grants=d.grants.filter(g=>g.studentId!==id);delete d.progress[id];d.events=d.events.filter(e=>e.studentId!==id);save();},
  async regenCode(id){const d=db();const s=d.students.find(x=>x.id===id);if(!s) throw new Error('Ο μαθητής δεν βρέθηκε.');s.code=newCode();logEv({studentId:id,type:'access',action:'code'});save();return s.code;},
  async regenLink(id){const d=db();const s=d.students.find(x=>x.id===id);if(!s) throw new Error('Ο μαθητής δεν βρέθηκε.');s.linkId=newLink();s.code=newCode();logEv({studentId:id,type:'access',action:'link'});save();return {linkId:s.linkId,code:s.code};},
  async resetProgress(id){const d=db();delete d.progress[id];d.events=d.events.filter(e=>!(e.studentId===id&&e.type==='result'));save();},
  async setExam(id,bodyId,targetId,ex){const d=db();const s=d.students.find(x=>x.id===id);if(!s) throw new Error('Ο μαθητής δεν βρέθηκε.');s.exams=s.exams||{};const k=bodyId+':'+targetId;
    if(!ex) delete s.exams[k];else s.exams[k]=Object.assign({},s.exams[k]||{},ex,{updated:nowISO()});
    logEv({studentId:id,type:'exam',body:bodyId,target:targetId,status:ex?ex.status:'cleared',date:ex&&ex.date||null});save();return clone(s.exams);},
  /* ---------- άδειες ---------- */
  async listGrants(){return clone(db().grants);},
  async saveGrant(g){const d=db();if(!d.students.some(s=>s.id===g.studentId)) throw new Error('Ο μαθητής δεν βρέθηκε.');
    const i=d.grants.findIndex(x=>x.id===g.id);const o=cleanGrant(Object.assign({},i>=0?d.grants[i]:{},g));
    if(i>=0){const p=d.grants[i];d.grants[i]=o;const act=p.to!==o.to?'extend':(p.units.join()!==o.units.join()?'units':'edit');logEv({studentId:o.studentId,type:'grant',action:act,body:o.body,units:o.units,from:o.from,to:o.to,prevTo:p.to});}
    else{d.grants.push(o);logEv({studentId:o.studentId,type:'grant',action:'new',body:o.body,units:o.units,from:o.from,to:o.to});}
    save();return clone(o);},
  async suspendGrant(id,on){const d=db();const g=d.grants.find(x=>x.id===id);if(!g) throw new Error('Η άδεια δεν βρέθηκε.');g.suspended=!!on;logEv({studentId:g.studentId,type:'grant',action:on?'suspend':'resume',body:g.body,to:g.to});save();return clone(g);},
  async deleteGrant(id){const d=db();const g=d.grants.find(x=>x.id===id);if(!g) return;d.grants=d.grants.filter(x=>x.id!==id);logEv({studentId:g.studentId,type:'grant',action:'delete',body:g.body});save();},
  /* ---------- ανακοινώσεις αρχικής σελίδας πλατφόρμας ---------- */
  async listNews(){return clone(db().news).sort((a,b)=>(b.date||'').localeCompare(a.date||''));},
  async saveNews(n){const d=db();const text=String(n.text||'').trim();if(!text) throw new Error('Γράψτε το κείμενο της ανακοίνωσης.');if(n.from&&n.to&&n.to<n.from) throw new Error('Το «έως» δεν μπορεί να είναι πριν από το «από».');
    const o={id:n.id||uid('n'),text,date:n.date||today(),from:n.from||'',to:n.to||'',active:n.active!==false,demo:!!n.demo};
    const i=d.news.findIndex(x=>x.id===o.id);if(i>=0) d.news[i]=o;else d.news.push(o);save();return clone(o);},
  async deleteNews(id){const d=db();d.news=d.news.filter(n=>n.id!==id);save();},
  /* αυτό που θα διαβάζει η αρχική σελίδα του μαθητή */
  async publicNews(){const t=today();return (await this.listNews()).filter(n=>n.active&&(!n.from||t>=n.from)&&(!n.to||t<=n.to)).map(n=>({date:n.date,text:n.text}));},
  /* αυτό που θα επιστρέφει η βάση στην είσοδο του μαθητή: μόνο οι άδειες που ισχύουν */
  async studentAccess(linkId,code){const d=db();const s=d.students.find(x=>x.linkId===linkId&&x.code===normCode(code)&&x.active);if(!s) return null;
    return {id:s.id,name:(s.first+' '+s.last).trim(),first:s.first,grants:d.grants.filter(g=>g.studentId===s.id&&grantLive(g)).map(g=>({body:g.body,units:g.units.slice(),from:g.from,to:g.to}))};},
  /* ---------- ιστορικό ---------- */
  async listEvents(o){o=o||{};let e=db().events;if(o.studentId) e=e.filter(x=>x.studentId===o.studentId);if(o.types) e=e.filter(x=>o.types.includes(x.type));
    e=e.slice().sort((a,b)=>a.at<b.at?1:-1);return clone(e.slice(0,o.limit||300));},
  /* ---------- αντίγραφο ασφαλείας ---------- */
  async exportAll(){const d=clone(db());delete d.settings.adminHash;return d;},
  async importAll(obj){if(!obj||!Array.isArray(obj.students)||!Array.isArray(obj.groups)||!Array.isArray(obj.grants)) throw new Error('Το κείμενο δεν είναι αντίγραφο ασφαλείας του διαχειριστικού.');
    const keep=db().settings.adminHash;DB=Object.assign(fresh(),obj);DB.settings=Object.assign(fresh().settings,obj.settings||{},{adminHash:keep});save();return true;},
  /* ---------- δεδομένα παραδείγματος ---------- */
  async hasDemo(){const d=db();return d.students.some(s=>s.demo)||d.groups.some(g=>g.demo)||d.news.some(n=>n.demo);},
  async removeDemo(){const d=db();const ids=new Set(d.students.filter(s=>s.demo).map(s=>s.id));d.students=d.students.filter(s=>!s.demo);d.groups=d.groups.filter(g=>!g.demo);d.news=d.news.filter(n=>!n.demo);
    d.grants=d.grants.filter(g=>!ids.has(g.studentId));ids.forEach(id=>delete d.progress[id]);d.events=d.events.filter(e=>!ids.has(e.studentId));d.students.forEach(s=>{if(s.groupId&&!d.groups.some(g=>g.id===s.groupId)) s.groupId=null;});save();},
  async seedDemo(){if(!window.CenterDemo) return false;await this.removeDemo();window.CenterDemo.seed(db(),{newCode,newLink});db().settings.seeded=true;save();return true;},
  async firstRun(){const d=db();if(d.settings.seeded||d.students.length) return false;return this.seedDemo();}
};
window.CenterAPI=API;
})();
