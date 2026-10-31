/* DOKSUT shared module. Public publishable key only; do NOT put service_role keys here. */
export const SUPABASE_URL='https://wtfzctnurmkgjutzqcvc.supabase.co';
export const SUPABASE_KEY='sb_publishable_HIlbdDLTdVmztMgYMN77lA_zsvvP2by';
export const MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
export const PARAMS=[['lf_tm','LF TM',.61],['lf_trafo','LF Trafo',.45],['lf_tr','LF TR',.42],['lf_sr','LF SR',.42],['pf_tm','PF TM',.99],['pf_trafo','PF Trafo',.90],['pf_tr','PF TR',.82],['pf_sr','PF SR',.81],['fk_sr','Faktor Koreksi SR',1.5],['peak_feeder','Beban Puncak per Penyulang (Amp)',0],['peak_branch','Beban Puncak per Jurusan (Amp)',0],['voltage_tr','Tegangan JTR (kV)',.4],['fk_tm','Faktor Koreksi JTM',.34016142463647],['fk_trafo','Faktor Koreksi Trafo',2.0302160318536],['fk_tr','Faktor Koreksi JTR',.95829171621086]];
export const number=(v)=>{if(typeof v==='number')return Number.isFinite(v)?v:0;if(v==null)return 0;let s=String(v).trim();if(!s)return 0;if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');return Number(s)||0};
export const fmt=(v,d=2)=>new Intl.NumberFormat('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d}).format(number(v));
export const pct=(a,b)=>b?100*a/b:0;
export function createClient(){if(!window.supabase)throw Error('Pustaka Supabase gagal dimuat. Periksa koneksi internet.');return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY)}
export async function currentUser(db){const {data:{user},error}=await db.auth.getUser();if(error||!user){location.href='index.html';throw Error('Silakan login kembali')}const unit=user.email?.split('@')[0];if(!/^144[0-6]0$/.test(unit))throw Error('Username unit tidak dikenal');return {user,unit}}
export async function getPeriods(db,unit,year){const {data,error}=await db.from('doksut_periods').select('*').eq('unit_code',unit).eq('year',year).order('month');if(error)throw error;return data||[]}
export function readCell(sheet,addr){return sheet?.[addr]??null}
export function col(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
export function sheetBy(w,term){const key=Object.keys(w||{}).find(x=>x.toUpperCase().includes(term.toUpperCase()));return w?.[key]||{}}
export function rowVal(sheet,row,month,asset=false){return number(readCell(sheet,`${col((asset?8:4)+month-1)}${row}`))}
export function readInputs(workbook,month){if(!Number.isInteger(+month)||+month<1||+month>12)throw Error('Bulan tidak valid');const a=sheetBy(workbook,'ASSET'),n=sheetBy(workbook,'NERACA'),p=sheetBy(workbook,'DATA LF'),e=sheetBy(workbook,'EMIN');const asset=(r)=>rowVal(a,r,month,true),ner=(r)=>rowVal(n,r,month),em=(r)=>rowVal(e,r,month);const weighted=(start,end)=>{let length=0,resistance=0;for(let r=start;r<=end;r++){let l=asset(r),R=number(a[`C${r}`]);if(l>0&&R>0){length+=l;resistance+=l*R}}return length?resistance/length:0};return {
 penerimaan:ner(5),jual_tt:ner(6),jual_tm:ner(7),jual_tr:ner(8),kirim_ul:ner(9),pemakaian_sendiri:ner(10),p2tl:ner(11),emin_tt:em(5),emin_tm:em(6),emin_tr:em(7),
 feeder:asset(9),jtm_length:asset(10),trafo:asset(57),trafo_kva:asset(58),branch:asset(59),jtr_length:asset(75),sr_length:asset(99),customers:asset(108),
 r_tm:asset(112)||weighted(11,53),r_tr:asset(113)||weighted(78,98),r_sr:asset(114)||weighted(102,107),iron_loss:asset(115),copper_loss:asset(116),
 template_lf_tm:rowVal(p,5,month),template_lf_trafo:rowVal(p,6,month),template_lf_tr:rowVal(p,7,month),template_fk_sr:rowVal(p,8,month),template_voltage_tr:rowVal(p,11,month),
 template_pf_tm:asset(7),template_pf_trafo:asset(55),template_pf_tr:asset(76),template_pf_sr:asset(100)
 }}
export function initialParams(inputs,prev={}){const x=Object.fromEntries(PARAMS.map(([key,,def])=>[key,prev[key]??def]));if(!Object.keys(prev).length){for(const [key,source] of Object.entries({lf_tm:'template_lf_tm',lf_trafo:'template_lf_trafo',lf_tr:'template_lf_tr',pf_tm:'template_pf_tm',pf_trafo:'template_pf_trafo',pf_tr:'template_pf_tr',pf_sr:'template_pf_sr',fk_sr:'template_fk_sr',voltage_tr:'template_voltage_tr'}))if(inputs[source])x[key]=inputs[source]}return x}
const BASE={input:10370748.373,jtm:290312.79018298,trafo:172551.31088627,jtr:650084.63340679,sr:21119.62,feeder:5,jtm_length:312.22,trafo_count:348,trafo_kva:32742,branch:592,jtr_length:403.68,sr_length:3505.04,customers:87627,r_tm:.47577249779002,r_tr:.94500745005945,r_sr:3.3156856595075,lf_tm:.61,lf_trafo:.45,lf_tr:.42,lf_sr:.42,pf_tm:.99,pf_trafo:.90,pf_tr:.82,pf_sr:.81,fk_tm:.34016142463647,fk_trafo:2.0302160318536,fk_tr:.95829171621086,fk_sr:1.5};
const safeRatio=(v,base)=>base>0&&v>0?v/base:1;
const llf=lf=>.3*lf+.7*lf*lf;
export function calculate(i,p){
 // Total distribution loss: E-MIN is excluded from billed sales, matching September FORJOG reference.
 const jual_net=Math.max(0,i.jual_tt-i.emin_tt)+Math.max(0,i.jual_tm-i.emin_tm)+Math.max(0,i.jual_tr-i.emin_tr);
 const total=i.penerimaan-jual_net-i.kirim_ul-i.pemakaian_sendiri;
 const flow=Math.max(0,i.penerimaan-i.kirim_ul)/(BASE.input-40257.62431268);
 // Explicitly calibrated September-14460 estimation, NOT an exact universal FORJOG formula.
 const factor=(lf,pf,fk,lf0,pf0,fk0)=>safeRatio(llf(lf),llf(lf0))*Math.pow(safeRatio(pf0,pf),2)*safeRatio(fk,fk0);
 const peakTM=p.peak_feeder>0?Math.pow(p.peak_feeder/Math.max(1,(i.penerimaan-i.kirim_ul)/(720*Math.max(1,i.feeder)*Math.sqrt(3)*20.6*Math.max(.01,p.pf_tm)*Math.max(.01,p.lf_tm))),2):1;
 const peakTR=p.peak_branch>0?Math.pow(p.peak_branch/Math.max(1,(i.penerimaan-i.kirim_ul)/(720*Math.max(1,i.branch)*Math.sqrt(3)*Math.max(.01,p.voltage_tr)*Math.max(.01,p.pf_tr)*Math.max(.01,p.lf_tr))),2):1;
 const jtm=peakTM*BASE.jtm*Math.pow(flow,2)*safeRatio(i.jtm_length,BASE.jtm_length)*safeRatio(i.r_tm,BASE.r_tm)*safeRatio(BASE.feeder,i.feeder)*factor(p.lf_tm,p.pf_tm,p.fk_tm,BASE.lf_tm,BASE.pf_tm,BASE.fk_tm);
 const trafo=BASE.trafo*Math.pow(flow,2)*safeRatio(i.trafo,BASE.trafo_count)*safeRatio(BASE.trafo_kva,i.trafo_kva)*factor(p.lf_trafo,p.pf_trafo,p.fk_trafo,BASE.lf_trafo,BASE.pf_trafo,BASE.fk_trafo);
 const jtr=peakTR*BASE.jtr*Math.pow(flow,2)*safeRatio(i.jtr_length,BASE.jtr_length)*safeRatio(i.r_tr,BASE.r_tr)*safeRatio(BASE.branch,i.branch)*Math.pow(safeRatio(BASE.pf_tr,p.pf_tr),2)*safeRatio(llf(p.lf_tr),llf(BASE.lf_tr))*safeRatio(p.fk_tr,BASE.fk_tr)*Math.pow(safeRatio(BASE.voltage_tr||.4,p.voltage_tr),2);
 const sr=BASE.sr*Math.pow(flow,2)*safeRatio(i.sr_length,BASE.sr_length)*safeRatio(i.r_sr,BASE.r_sr)*safeRatio(BASE.customers,i.customers)*factor(p.lf_sr,p.pf_sr,p.fk_sr,BASE.lf_sr,BASE.pf_sr,BASE.fk_sr);
 const teknis=jtm+trafo+jtr+sr;return {penerimaan:i.penerimaan,jual_net,total,jtm,trafo,jtr,sr,teknis,nonteknis:total-teknis,method:'Estimasi DOKSUT terkalibrasi dari September 2026 unit 14460; belum divalidasi lintas unit/bulan',components:{jtm,trafo,jtr,sr}};
}
export function aggregate(rows){const keys=['penerimaan','jual_net','total','jtm','trafo','jtr','sr','teknis','nonteknis'];return Object.fromEntries(keys.map(k=>[k,rows.reduce((sum,row)=>sum+number(row.results?.[k]),0)]))}
