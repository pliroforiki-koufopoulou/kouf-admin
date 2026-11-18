/* CenterAPI πάνω στο Supabase — ίδιες μέθοδοι με το js/api.js (τοπική έκδοση παραδειγμάτων).
   Φορτώνεται μετά το api.js και το αντικαθιστά όταν υπάρχει window.KP_CONFIG.supabaseUrl.
   Γραμματεία = χρήστης Supabase Auth που υπάρχει στον πίνακα kp_staff. Χωρίς βιβλιοθήκες: απλά fetch. */
(function(){
'use strict';
const CFG=window.KP_CONFIG||{};if(!CFG.supabaseUrl||!CFG.supabaseKey) return;
const KP=window.KP,LOCAL=window.CenterAPI;
const URL_=CFG.supabaseUrl.replace(/\/+$/,''),KEY=CFG.supabaseKey,SKEY='kp-admin-auth';
const today=LOCAL.today,grantStatus=LOCAL.grantStatus,grantLive=LOCAL.grantLive,normCode=LOCAL.normCode;
const mem={};
const store={get(){try{return JSON.parse(sessionStorage.getItem(SKEY)||'null');}catch(e){return mem.s||null;}},
  set(v){mem.s=v;try{v?sessionStorage.setItem(SKEY,JSON.stringify(v)):sessionStorage.removeItem(SKEY);}catch(e){}}};
let onExpired=null;
function fail(msg,code){const e=new Error(msg);e.code=code;return e;}
function explain(status,j){const code=j&&(j.code||j.error_code||j.error),msg=j&&(j.message||j.msg||j.error_description)||'';
  if(code==='23505'&&/kp_groups_name_uq/.test(msg)) return 'Υπάρχει ήδη τμήμα με αυτό το όνομα.';
  if(code==='23514'&&/kp_grants/.test(msg)) return 'Ελέγξτε τις ενότητες και τις ημερομηνίες της άδειας.';
  if(code==='42501'||status===401||status===403) return 'Δεν έχετε δικαίωμα για αυτή την ενέργεια. Συνδεθείτε ξανά.';
  return 'Η ενέργεια δεν ολοκληρώθηκε'+(msg?' ('+msg+')':'')+'.';}
async function authCall(path,body,token){let r;
  try{r=await fetch(URL_+'/auth/v1/'+path,{method:body===undefined?'GET':(path==='user'&&body?'PUT':'POST'),headers:Object.assign({apikey:KEY,'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:body===undefined?undefined:JSON.stringify(body)});}
  catch(e){throw fail('Δεν υπάρχει σύνδεση με τη βάση. Ελέγξτε το internet και δοκιμάστε ξανά.','network');}
  let j=null;try{j=await r.json();}catch(e){}
  return {ok:r.ok,status:r.status,j};}
function keep(j){store.set({access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000,email:j.user&&j.user.email||(store.get()||{}).email||''});}
let refreshing=null;
async function token(){const s=store.get();if(!s) throw fail('Η σύνδεση έληξε. Συνδεθείτε ξανά.','auth');
  if(s.exp-Date.now()>60000) return s.access;
  if(!refreshing) refreshing=(async()=>{const r=await authCall('token?grant_type=refresh_token',{refresh_token:s.refresh});
    if(!r.ok){store.set(null);if(onExpired) onExpired();throw fail('Η σύνδεση έληξε. Συνδεθείτε ξανά.','auth');}keep(r.j);return r.j.access_token;})().finally(()=>{refreshing=null;});
  return refreshing;}
async function rest(path,opt){opt=opt||{};const t=await token();let r;
  const h={apikey:KEY,Authorization:'Bearer '+t};if(opt.body!==undefined) h['Content-Type']='application/json';if(opt.prefer) h.Prefer=opt.prefer;
  try{r=await fetch(URL_+'/rest/v1/'+path,{method:opt.method||'GET',headers:h,body:opt.body===undefined?undefined:JSON.stringify(opt.body)});}
  catch(e){throw fail('Δεν υπάρχει σύνδεση με τη βάση. Ελέγξτε το internet και δοκιμάστε ξανά.','network');}
  let j=null;const txt=await r.text();if(txt){try{j=JSON.parse(txt);}catch(e){}}
  if(!r.ok){if(r.status===401&&j&&/JWT|token/i.test(j.message||'')){store.set(null);if(onExpired) onExpired();throw fail('Η σύνδεση έληξε. Συνδεθείτε ξανά.','auth');}
    throw fail(explain(r.status,j),j&&j.code);}
  return j;}
const q=v=>encodeURIComponent(v);
const REP='return=representation';
/* όλες οι γραμμές ενός πίνακα, σε σελίδες των 1000 */
async function all(path){const out=[];for(let off=0;;off+=1000){const part=await rest(path+(path.includes('?')?'&':'?')+'limit=1000&offset='+off);out.push(...part);if(part.length<1000) break;}return out;}

/* ---------- αντιστοίχιση γραμμών βάσης ↔ αντικειμένων του διαχειριστικού ---------- */
const exKey=e=>e.body+':'+e.target;
function mStudent(r){const exams={};(r.kp_exam_seats||[]).forEach(e=>{exams[exKey(e)]={status:e.status,date:e.exam_date,note:e.note,updated:e.updated_at};});
  const summary={};(r.kp_progress||[]).forEach(p=>{summary[p.body]=p.summary||{};});
  return {id:r.id,code:r.code,linkId:r.link_id,first:r.first_name,last:r.last_name,phone:r.phone,email:r.email,groupId:r.group_id,notes:r.notes,active:r.active,demo:false,created:r.created_at,lastSeen:r.last_seen,exams,summary};}
const mGrant=g=>({id:g.id,studentId:g.student_id,body:g.body,units:g.units,from:g.date_from,to:g.date_to,suspended:g.suspended,note:g.note,demo:false,created:g.created_at});
const mGroup=g=>({id:g.id,name:g.name,body:g.body,teacher:g.teacher,schedule:g.schedule,start:g.start_date||'',demo:false,created:g.created_at});
const mNews=n=>({id:n.id,text:n.body_text,date:n.news_date,from:n.show_from||'',to:n.show_to||'',active:n.active,demo:false});
const mAttempt=a=>({body:a.body,unit:a.unit,target:a.target,kind:a.kind,title:a.title,pct:a.pct,at:a.done_at});
const mEvent=e=>Object.assign({id:'e'+e.id,studentId:e.student_id,type:e.type,action:e.action,body:e.body,at:e.created_at},e.detail||{});
const logEv=(studentId,type,action,body,detail)=>rest('kp_events',{method:'POST',body:{student_id:studentId,type,action:action||'',body:body||null,detail:detail||{}}}).catch(()=>{});
const SSEL='*,kp_exam_seats(body,target,status,exam_date,note,updated_at),kp_progress(body,summary)';

const API={
  backend:'supabase',volatile:false,normCode,grantStatus,grantLive,today,
  onSessionExpired(fn){onExpired=fn;},
  /* ---------- ρυθμίσεις ---------- */
  async getSettings(){if(!store.get()) return {center:'Πληροφορική Κουφόπουλου',platformUrl:'',contact:'',allowGuest:false,seeded:true};
    const r=(await rest('kp_settings?id=eq.true&select=*'))[0]||{};return {center:r.center||'',platformUrl:r.platform_url||'',contact:r.contact||'',allowGuest:!!r.allow_guest,seeded:true};},
  async saveSettings(p){const b={updated_at:new Date().toISOString()};if('center' in p) b.center=p.center;if('platformUrl' in p) b.platform_url=p.platformUrl;if('contact' in p) b.contact=p.contact;if('allowGuest' in p) b.allow_guest=!!p.allowGuest;
    await rest('kp_settings?id=eq.true',{method:'PATCH',body:b});return this.getSettings();},
  /* ---------- γραμματεία ---------- */
  async adminStatus(){return {configured:true,loggedIn:!!store.get(),email:(store.get()||{}).email||''};},
  async adminSetup(){throw fail('Ο λογαριασμός της γραμματείας δημιουργείται στο Supabase, όχι εδώ.');},
  async adminLogin(pass,email){email=String(email||'').trim();if(!email||!pass) throw fail('Συμπληρώστε email και κωδικό.');
    const r=await authCall('token?grant_type=password',{email,password:pass});
    if(!r.ok) throw fail(r.status===400||r.status===401?'Λάθος email ή κωδικός. Δοκιμάστε ξανά.':r.status===429?'Πολλές προσπάθειες. Περιμένετε λίγο και δοκιμάστε ξανά.':'Η είσοδος δεν ήταν δυνατή. Δοκιμάστε ξανά.');
    keep(r.j);
    let staff=[];try{staff=await rest('kp_staff?select=user_id&user_id=eq.'+q(r.j.user.id));}catch(e){}
    if(!staff.length){store.set(null);throw fail('Ο λογαριασμός αυτός δεν έχει δικαίωμα γραμματείας.');}
    return true;},
  async adminChangePass(oldp,newp){const s=store.get();if(!s) throw fail('Συνδεθείτε ξανά.');if(String(newp||'').length<6) throw fail('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.');
    const chk=await authCall('token?grant_type=password',{email:s.email,password:oldp});if(!chk.ok) throw fail('Ο τρέχων κωδικός δεν είναι σωστός.');keep(chk.j);
    const r=await authCall('user',{password:newp},chk.j.access_token);if(!r.ok) throw fail('Ο κωδικός δεν άλλαξε'+(r.j&&r.j.msg?' ('+r.j.msg+')':'')+'.');return true;},
  async adminLogout(){const s=store.get();store.set(null);if(s){try{await authCall('logout',{},s.access);}catch(e){}}},
  /* ---------- τμήματα ---------- */
  async listGroups(){return (await all('kp_groups?select=*&order=name')).map(mGroup).sort((a,b)=>a.name.localeCompare(b.name,'el'));},
  async saveGroup(g){const name=String(g.name||'').trim();if(!name) throw fail('Δώστε όνομα τμήματος.');
    const b={name,body:KP.body(g.body)?g.body:'',teacher:String(g.teacher||'').trim(),schedule:String(g.schedule||'').trim(),start_date:g.start||null};
    const r=g.id?await rest('kp_groups?id=eq.'+q(g.id),{method:'PATCH',body:b,prefer:REP}):await rest('kp_groups',{method:'POST',body:b,prefer:REP});return mGroup(r[0]);},
  async deleteGroup(id){await rest('kp_groups?id=eq.'+q(id),{method:'DELETE'});},
  /* ---------- μαθητές ---------- */
  async listStudents(){return (await all('kp_students?select='+SSEL+'&order=last_name,first_name')).map(mStudent);},
  async getStudent(id){const r=(await rest('kp_students?id=eq.'+q(id)+'&select='+SSEL+',kp_grants(*)'))[0];if(!r) return null;
    const hist=(await rest('kp_attempts?student_id=eq.'+q(id)+'&select=*&order=done_at.desc&limit=1000')).map(mAttempt);
    return Object.assign(mStudent(r),{hist,grants:(r.kp_grants||[]).map(mGrant)});},
  async saveStudent(s){const first=String(s.first||'').trim(),last=String(s.last||'').trim();if(!first||!last) throw fail('Συμπληρώστε όνομα και επώνυμο.');
    const b={first_name:first,last_name:last,phone:String(s.phone||'').trim(),email:String(s.email||'').trim(),group_id:s.groupId||null,notes:String(s.notes||''),active:s.active!==false};
    const r=s.id?await rest('kp_students?id=eq.'+q(s.id),{method:'PATCH',body:b,prefer:REP}):await rest('kp_students',{method:'POST',body:b,prefer:REP});
    if(!r||!r[0]) throw fail('Ο μαθητής δεν βρέθηκε.');return mStudent(r[0]);},
  async deleteStudent(id){await rest('kp_students?id=eq.'+q(id),{method:'DELETE'});},
  async regenCode(id){return rest('rpc/kp_staff_new_code',{method:'POST',body:{p_student:id}});},
  async regenLink(id){return rest('rpc/kp_staff_new_link',{method:'POST',body:{p_student:id}});},
  async resetProgress(id){await rest('kp_progress?student_id=eq.'+q(id),{method:'DELETE'});await rest('kp_attempts?student_id=eq.'+q(id),{method:'DELETE'});},
  async setExam(id,bodyId,targetId,ex){const f='student_id=eq.'+q(id)+'&body=eq.'+q(bodyId)+'&target=eq.'+q(targetId);
    if(!ex) await rest('kp_exam_seats?'+f,{method:'DELETE'});
    else await rest('kp_exam_seats?on_conflict=student_id,body,target',{method:'POST',prefer:'resolution=merge-duplicates',body:{student_id:id,body:bodyId,target:targetId,status:ex.status,exam_date:ex.date||null,note:String(ex.note||''),updated_at:new Date().toISOString()}});
    await logEv(id,'exam',ex?ex.status:'cleared',bodyId,{target:targetId,status:ex?ex.status:'cleared',date:ex&&ex.date||null});
    const out={};(await rest('kp_exam_seats?student_id=eq.'+q(id)+'&select=*')).forEach(e=>{out[exKey(e)]={status:e.status,date:e.exam_date,note:e.note,updated:e.updated_at};});return out;},
  /* ---------- άδειες ---------- */
  async listGrants(){return (await all('kp_grants?select=*&order=date_to')).map(mGrant);},
  async saveGrant(g){if(!KP.body(g.body)) throw fail('Επιλέξτε φορέα πιστοποίησης.');const units=KP.normalize(g.body,g.units);if(!units.length) throw fail('Επιλέξτε τουλάχιστον μία ενότητα.');
    if(!g.from||!g.to) throw fail('Ορίστε ημερομηνία έναρξης και λήξης.');if(g.to<g.from) throw fail('Η λήξη δεν μπορεί να είναι πριν από την έναρξη.');
    const b={student_id:g.studentId,body:g.body,units,date_from:g.from,date_to:g.to,suspended:!!g.suspended,note:String(g.note||'').trim()};
    if(g.id){const prev=(await rest('kp_grants?id=eq.'+q(g.id)+'&select=*'))[0];if(!prev) throw fail('Η άδεια δεν βρέθηκε.');
      const r=await rest('kp_grants?id=eq.'+q(g.id),{method:'PATCH',body:b,prefer:REP});
      const act=prev.date_to!==b.date_to?'extend':((prev.units||[]).join()!==units.join()?'units':'edit');
      await logEv(g.studentId,'grant',act,g.body,{units,from:g.from,to:g.to,prevTo:prev.date_to});return mGrant(r[0]);}
    const r=await rest('kp_grants',{method:'POST',body:b,prefer:REP});await logEv(g.studentId,'grant','new',g.body,{units,from:g.from,to:g.to});return mGrant(r[0]);},
  async suspendGrant(id,on){const r=await rest('kp_grants?id=eq.'+q(id),{method:'PATCH',body:{suspended:!!on},prefer:REP});if(!r[0]) throw fail('Η άδεια δεν βρέθηκε.');
    await logEv(r[0].student_id,'grant',on?'suspend':'resume',r[0].body,{to:r[0].date_to});return mGrant(r[0]);},
  async deleteGrant(id){const r=await rest('kp_grants?id=eq.'+q(id),{method:'DELETE',prefer:REP});if(r&&r[0]) await logEv(r[0].student_id,'grant','delete',r[0].body,{});},
  /* ---------- ανακοινώσεις ---------- */
  async listNews(){return (await all('kp_news?select=*&order=news_date.desc,created_at.desc')).map(mNews);},
  async saveNews(n){const text=String(n.text||'').trim();if(!text) throw fail('Γράψτε το κείμενο της ανακοίνωσης.');if(text.length>400) throw fail('Το κείμενο ξεπερνά τους 400 χαρακτήρες.');
    if(n.from&&n.to&&n.to<n.from) throw fail('Το «έως» δεν μπορεί να είναι πριν από το «από».');
    const b={body_text:text,news_date:n.date||today(),show_from:n.from||null,show_to:n.to||null,active:n.active!==false};
    const r=n.id?await rest('kp_news?id=eq.'+q(n.id),{method:'PATCH',body:b,prefer:REP}):await rest('kp_news',{method:'POST',body:b,prefer:REP});return mNews(r[0]);},
  async deleteNews(id){await rest('kp_news?id=eq.'+q(id),{method:'DELETE'});},
  async publicNews(){const t=today();return (await this.listNews()).filter(n=>n.active&&(!n.from||t>=n.from)&&(!n.to||t<=n.to)).map(n=>({date:n.date,text:n.text}));},
  /* ---------- ιστορικό: ενέργειες γραμματείας + αποτελέσματα μαθητών ---------- */
  async listEvents(o){o=o||{};const lim=o.limit||300,types=o.types,sf=o.studentId?'&student_id=eq.'+q(o.studentId):'';let out=[];
    const st=types?types.filter(t=>t!=='result'):null;
    if(!st||st.length) out=out.concat((await rest('kp_events?select=*&order=created_at.desc&limit='+lim+sf+(st?'&type=in.('+st.join(',')+')':''))).map(mEvent));
    if(!types||types.includes('result')) out=out.concat((await rest('kp_attempts?select=*&order=done_at.desc&limit='+lim+sf)).map(a=>Object.assign({id:'a'+a.id,studentId:a.student_id,type:'result'},mAttempt(a))));
    return out.sort((a,b)=>a.at<b.at?1:-1).slice(0,lim);},
  /* ---------- αντίγραφο ασφαλείας ---------- */
  async exportAll(){const [settings,groups,students,grants,exam_seats,progress,attempts,events,news]=await Promise.all([rest('kp_settings?select=*'),all('kp_groups?select=*'),all('kp_students?select=*'),all('kp_grants?select=*'),all('kp_exam_seats?select=*'),all('kp_progress?select=*'),all('kp_attempts?select=*&order=id'),all('kp_events?select=*&order=id'),all('kp_news?select=*')]);
    return {format:'kp-supabase-backup',v:1,at:new Date().toISOString(),settings,groups,students,grants,exam_seats,progress,attempts,events,news};},
  async importAll(){throw fail('Η επαναφορά από αντίγραφο δεν γίνεται από το διαχειριστικό στη συνδεδεμένη έκδοση. Απευθυνθείτε στον υπεύθυνο.');},
  /* ---------- δεδομένα παραδείγματος: δεν υπάρχουν στη συνδεδεμένη έκδοση ---------- */
  async hasDemo(){return false;},async removeDemo(){},async seedDemo(){return false;},async firstRun(){return false;}
};
window.CenterAPI=API;
})();
