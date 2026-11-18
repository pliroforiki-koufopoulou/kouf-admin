/* Κατάλογος φορέων, ενοτήτων και στόχων εξέτασης — ίδια ids με το js/shell/platform.js της πλατφόρμας μαθητή
   (acta / gc / uc), ώστε μια άδεια {body, units[], from, to} να σημαίνει το ίδιο και στα δύο sites. */
(function(){
'use strict';
const APP={Windows:['Χρήση Η/Υ (Windows)','Windows'],Word:['Επεξεργασία Κειμένου (Word)','Word'],Excel:['Υπολογιστικά Φύλλα (Excel)','Excel'],
  Internet:['Internet (Outlook και Edge)','Internet'],Access:['Βάσεις Δεδομένων (Access)','Access'],PowerPoint:['Παρουσιάσεις (PowerPoint)','PowerPoint']};
const U=(id,app,pack)=>({id,app,pack:pack||null,title:APP[app][0],short:APP[app][1]});
const BODIES=[
 {id:'acta',name:'ACTA',title:'Προετοιμασία για πιστοποίηση ACTA',
  examNote:'Εξέταση ανά ενότητα: 10 ερωτήσεις, 20 λεπτά, βάση 70%',
  tests:['Demo Test 1','Demo Test 2','Demo Test 3','Test εξάσκησης 1','Test εξάσκησης 2','Test εξάσκησης 3'],
  tshort:['Demo 1','Demo 2','Demo 3','Εξ. 1','Εξ. 2','Εξ. 3'],
  units:['Windows','Word','Excel','Internet','Access','PowerPoint'].map(a=>U(a,a)),packs:[]},
 {id:'gc',name:'GlobalCert',title:'Προετοιμασία για πιστοποίηση GlobalCert',
  examNote:'Διαθεματική εξέταση ανά πακέτο: 36 ερωτήσεις, 60 λεπτά, βάση 70%',
  tests:Array.from({length:8},(_,i)=>'Test '+(i+1)),tshort:Array.from({length:8},(_,i)=>'T'+(i+1)),
  units:[U('Word','Word','A'),U('Excel','Excel','A'),U('Internet','Internet','A'),U('Windows','Windows','B'),U('Access','Access','B'),U('PowerPoint','PowerPoint','B')],
  packs:[{id:'A',title:'Intermediate Express A',short:'Express A',units:['Word','Excel','Internet'],implies:true},
         {id:'B',title:'Intermediate Express B',short:'Express B',units:['Windows','Access','PowerPoint'],implies:true}]},
 {id:'uc',name:'UCERT',title:'Προετοιμασία για πιστοποίηση UCERT',
  examNote:'Διαθεματική εξέταση ανά ομάδα: 36 ερωτήσεις, 54 λεπτά, βάση 70%',
  tests:Array.from({length:5},(_,i)=>'Τεστ '+(i+1)),tshort:Array.from({length:5},(_,i)=>'Τ'+(i+1)),
  units:[U('windows','Windows'),U('word','Word'),U('excel','Excel'),U('internet','Internet'),U('access','Access'),U('powerpoint','PowerPoint')],
  packs:[{id:'blended1',title:'Μικτά tests 1',short:'Μικτά 1',units:['word','excel','internet'],implies:false},
         {id:'blended2',title:'Μικτά tests 2',short:'Μικτά 2',units:['windows','access','powerpoint'],implies:false}]}
];
BODIES.forEach(b=>{b.targets=b.packs.length?b.packs.map(p=>({id:p.id,title:p.title,short:p.short,units:p.units})):b.units.map(u=>({id:u.id,title:u.title,short:u.short,units:[u.id]}));});
const body=id=>BODIES.find(b=>b.id===id)||null;
const unit=(bid,uid)=>{const b=body(bid);return b&&b.units.find(u=>u.id===uid)||null;};
const target=(bid,tid)=>{const b=body(bid);return b&&b.targets.find(t=>t.id===tid)||null;};
/* ενότητες (εφαρμογές) που καλύπτει μια λίστα units άδειας */
function expand(bid,ids){const b=body(bid);if(!b) return [];const all=!ids||!ids.length;
  return b.units.filter(u=>all||ids.includes(u.id)||(u.pack&&ids.includes(u.pack))).map(u=>u.id);}
/* στόχοι εξέτασης που καλύπτει */
function targets(bid,ids){const b=body(bid);if(!b) return [];const ex=expand(bid,ids);
  if(!b.packs.length) return ex.slice();
  return b.packs.filter(p=>!ids||!ids.length||ids.includes(p.id)||p.units.every(u=>ex.includes(u))).map(p=>p.id);}
/* σύντομη περιγραφή για λίστες και μηνύματα */
function describe(bid,ids){const b=body(bid);if(!b) return '';const ex=expand(bid,ids);
  if(b.id==='gc'){const p=b.packs.filter(x=>x.units.every(u=>ex.includes(u)));const rest=ex.filter(u=>!p.some(x=>x.units.includes(u)));
    return p.map(x=>x.short).concat(rest.map(u=>unit(bid,u).short)).join(', ');}
  if(ex.length===b.units.length) return 'Όλες οι ενότητες';
  return ex.map(u=>unit(bid,u).short).join(', ');}
/* κανονική μορφή units προς αποθήκευση */
function normalize(bid,ids){const b=body(bid);if(!b) return [];let out=(ids||[]).filter(x=>b.units.some(u=>u.id===x)||b.packs.some(p=>p.id===x));
  if(b.id==='uc'){out=out.filter(x=>!b.packs.some(p=>p.id===x));b.packs.forEach(p=>{if(p.units.every(u=>out.includes(u))) out.push(p.id);});}
  if(b.id==='gc'){b.packs.forEach(p=>{if(out.includes(p.id)) out=out.filter(x=>!p.units.includes(x));});}
  return out;}
window.KP={PASS:70,bodies:BODIES,body,unit,target,expand,targets,describe,normalize};
})();
