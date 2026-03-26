import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

const SUPABASE_URL = "https://zpdmkejxwcysbfahudkw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZG1rZWp4d2N5c2JmYWh1ZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjExNzEsImV4cCI6MjA5MDA5NzE3MX0.hPy39hHUMFXom-aBfexB-N0VO8o_TQKKpanEfWw_bxQ";
const VEHICLE_ID = "c7f656ef-fcd6-4ea5-8a59-deba47fe369a";
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function sb(p, o = {}) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: { ...H, ...(o.headers||{}) }, ...o }); if (!r.ok) throw new Error(r.status); const t = await r.text(); return t ? JSON.parse(t) : []; }

const PURP = [{ id:"business",label:"업무",icon:"B" },{ id:"commute",label:"출퇴근",icon:"C" },{ id:"personal",label:"개인",icon:"P" },{ id:"other",label:"기타",icon:"E" }];
const FUEL = [{ id:"gasoline",label:"휘발유" },{ id:"diesel",label:"경유" },{ id:"lpg",label:"LPG" },{ id:"electric",label:"전기" },{ id:"hydrogen",label:"수소" }];
const fD = d => { const t=new Date(d),w=["일","월","화","수","목","금","토"]; return `${t.getFullYear()}.${String(t.getMonth()+1).padStart(2,"0")}.${String(t.getDate()).padStart(2,"0")} (${w[t.getDay()]})`; };
const fN = n => n==null||n===""?"-":Number(n).toLocaleString();
const fK = n => n==null?"0.0":Number(n).toFixed(1);
const td = () => new Date().toISOString().split("T")[0];
const mo = d => d.substring(0,7);
const fDu = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h>0?`${h}h ${String(m).padStart(2,"0")}m`:m>0?`${m}m ${String(sec).padStart(2,"0")}s`:`${sec}s`; };
const hav = (a,b,c,d) => { const R=6371,dL=((c-a)*Math.PI)/180,dN=((d-b)*Math.PI)/180,x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); };
const dKr = d => { const t=new Date(d),w=["일","월","화","수","목","금","토"]; return `${t.getFullYear()}.${String(t.getMonth()+1).padStart(2,"0")}.${String(t.getDate()).padStart(2,"0")}(${w[t.getDay()]})`; };

function exportExcel(v, dr, fr, sm) {
  const wb = XLSX.utils.book_new();
  const recs = dr.filter(r=>mo(r.drive_date)===sm).sort((a,b)=>new Date(a.drive_date)-new Date(b.drive_date));
  const data = [];
  data.push(["【업무용승용차 운행기록부에 관한 별지 서식】 (2016. 4. 1. 제정)"]);
  data.push(["사업연도","","","","","","",v?.fiscal_year_start||"2025-01-01","","","","","","","","업무용승용차 운행기록부","","","","","","","","","","","","","","","","","","","","","법인명","","","","","",v?.company_name||""]);
  data.push(["","","","","","","","～"]);
  data.push(["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","사업자등록번호","","","","","",v?.business_number||""]);
  data.push(["","","","","","","",v?.fiscal_year_end||"2025-12-31"]);
  data.push([]); data.push(["1. 기본정보"]);
  data.push(["①차 종","","","","","","","","","","②자동차등록번호"]);
  data.push([v?.vehicle_type||"","","","","","","","","","",v?.registration_number||""]);
  data.push([]); data.push(["2. 업무용 사용비율 계산"]);
  data.push(["③사용일자(요일)","","","","","④사용자","","","","","","","","운 행 내 역","","","","","","","","","","","","⑦주행거리(㎞)","","","","","","업무용 사용거리(㎞)","","","","","","","","","","","⑩비 고"]);
  data.push(["","","","","","부서","","","","성명","","","","⑤주행 전\n계기판의 거리(㎞)","","","","","","⑥주행 후\n계기판의 거리(㎞)","","","","","","","","","","","","⑧출ㆍ퇴근용(㎞)","","","","","","⑨일반 업무용(㎞)","","","","",""]);
  data.push([]);
  let tD=0,tC=0,tB=0;
  recs.forEach(r=>{const dist=r.distance||(r.end_odometer-r.start_odometer);tD+=dist;tC+=(r.commute_distance||0);tB+=(r.business_distance||0);const row=new Array(44).fill("");row[0]=dKr(r.drive_date);row[5]=r.driver_department||"";row[9]=r.driver_name||"";row[13]=r.start_odometer;row[19]=r.end_odometer;row[25]=dist;row[31]=r.commute_distance||0;row[37]=r.business_distance||0;row[43]=`${r.origin||""} → ${r.destination||""} ${r.gps_tracked?"[GPS] ":""}${r.memo||""}`.trim();data.push(row);});
  for(let i=recs.length;i<30;i++){const row=new Array(44).fill("");row[25]=0;data.push(row);}
  const sr=new Array(44).fill("");sr[13]="⑪사업연도 총주행 거리(㎞)";sr[31]="⑫사업연도 업무용 사용거리(㎞)";sr[43]="⑬업무사용비율\n(⑫/⑪)";data.push(sr);
  const tr=new Array(44).fill("");tr[13]=tD;tr[31]=tC+tB;tr[43]=tD>0?((tC+tB)/tD).toFixed(4):0;data.push(tr);
  const ws=XLSX.utils.aoa_to_sheet(data);XLSX.utils.book_append_sheet(wb,ws,"운행기록부");
  const fRecs=fr.filter(r=>mo(r.fuel_date)===sm).sort((a,b)=>new Date(a.fuel_date)-new Date(b.fuel_date));
  if(fRecs.length>0){const fd=[["주유/충전 기록부","","","","",v?.vehicle_type||"",v?.registration_number||""],[],["날짜","주행거리(km)","연료종류","주유량","금액(원)","단가","메모"]];fRecs.forEach(r=>{fd.push([dKr(r.fuel_date),r.odometer,FUEL.find(f=>f.id===r.fuel_type)?.label||"",Number(r.amount),Number(r.cost),r.amount>0?Math.round(Number(r.cost)/Number(r.amount)):0,r.memo||""]);});fd.push([]);const ta=fRecs.reduce((s,r)=>s+Number(r.amount||0),0),tc=fRecs.reduce((s,r)=>s+Number(r.cost||0),0);fd.push(["합계","","",ta,tc,ta>0?Math.round(tc/ta):0,""]);const ws2=XLSX.utils.aoa_to_sheet(fd);XLSX.utils.book_append_sheet(wb,ws2,"주유기록");}
  XLSX.writeFile(wb,`운행기록부_${v?.company_name||""}_(${sm.replace("-",".")}).xlsx`);
}

export default function App() {
  const [veh, setVeh] = useState(null);
  const [drv, setDrv] = useState([]);
  const [fue, setFue] = useState([]);
  const [view, setView] = useState("home");
  const [rec, setRec] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [fm, setFm] = useState(mo(td()));
  const [det, setDet] = useState(null);
  const [dType, setDType] = useState("driving");
  const [toast, setToast] = useState(null);
  const [sync, setSync] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [gDist, setGDist] = useState(0);
  const [gSpd, setGSpd] = useState(0);
  const [gDur, setGDur] = useState(0);
  const [gPts, setGPts] = useState([]);
  const [gErr, setGErr] = useState(null);
  const wRef=useRef(null),lpRef=useRef(null),stRef=useRef(null),tmRef=useRef(null),dstRef=useRef(0),ptRef=useRef([]),duRef=useRef(0);

  const stToast = m => { setToast(m); setTimeout(()=>setToast(null),2500); };
  const load = useCallback(async()=>{try{const[v,d,f]=await Promise.all([sb(`vehicles?id=eq.${VEHICLE_ID}&select=*`),sb(`driving_records?vehicle_id=eq.${VEHICLE_ID}&select=*&order=drive_date.desc,created_at.desc`),sb(`fuel_records?vehicle_id=eq.${VEHICLE_ID}&select=*&order=fuel_date.desc,created_at.desc`)]);if(v.length)setVeh(v[0]);setDrv(d);setFue(f);}catch{stToast("연결 실패");}setLoaded(true);},[]);
  useEffect(()=>{load();},[load]);

  const odo = veh?.current_odometer||0;
  const all = [...drv.map(r=>({...r,_t:"driving",_d:r.drive_date,_c:r.created_at})),...fue.map(r=>({...r,_t:"fuel",_d:r.fuel_date,_c:r.created_at}))].sort((a,b)=>new Date(b._d)-new Date(a._d)||new Date(b._c)-new Date(a._c));
  const updOdo = async o => { try{await sb(`vehicles?id=eq.${VEHICLE_ID}`,{method:"PATCH",body:JSON.stringify({current_odometer:o})});setVeh(p=>({...p,current_odometer:o}));}catch{} };

  const startGPS = () => {
    if(!navigator.geolocation){setGErr("GPS 미지원");return;}
    setGErr(null);setGDist(0);setGSpd(0);setGDur(0);setGPts([]);dstRef.current=0;ptRef.current=[];lpRef.current=null;stRef.current=Date.now();duRef.current=0;
    const w=navigator.geolocation.watchPosition(p=>{const{latitude:la,longitude:lo,speed:sp,accuracy:ac}=p.coords;if(ac>50)return;ptRef.current=[...ptRef.current,{la,lo}];setGPts([...ptRef.current]);if(lpRef.current){const d=hav(lpRef.current.la,lpRef.current.lo,la,lo);if(d>0.005){dstRef.current+=d;setGDist(dstRef.current);lpRef.current={la,lo};}}else lpRef.current={la,lo};if(sp!=null&&sp>=0)setGSpd(sp*3.6);},e=>setGErr(e.code===1?"위치 권한을 허용해주세요":"GPS 신호 없음"),{enableHighAccuracy:true,maximumAge:3000,timeout:10000});
    wRef.current=w;setTracking(true);setView("tracking");
    tmRef.current=setInterval(()=>{duRef.current=Math.floor((Date.now()-stRef.current)/1000);setGDur(duRef.current);},1000);
  };
  const stopGPS = () => {
    if(wRef.current!=null){navigator.geolocation.clearWatch(wRef.current);wRef.current=null;}
    if(tmRef.current){clearInterval(tmRef.current);tmRef.current=null;}
    setTracking(false);const km=Math.round(dstRef.current*10)/10;
    setRec({_m:"gps",drive_date:td(),start_odometer:odo,end_odometer:Math.round(odo+km),origin:"",destination:"",purpose:"business",driver_department:"",driver_name:"",memo:"",gps_tracked:true,gps_distance:km,gps_duration:duRef.current,commute_distance:0,business_distance:Math.round(km)});
    setView("gps-save");
  };
  useEffect(()=>()=>{if(wRef.current!=null)navigator.geolocation.clearWatch(wRef.current);if(tmRef.current)clearInterval(tmRef.current);},[]);

  const saveD = async(r,edit)=>{const{_m,...d}=r;if(!d.end_odometer||+d.end_odometer<=+d.start_odometer){stToast("도착 주행거리 확인");return;}setSync(true);try{const dist=+d.end_odometer-+d.start_odometer;d.commute_distance=d.purpose==="commute"?dist:0;d.business_distance=d.purpose==="business"?dist:0;d.vehicle_id=VEHICLE_ID;if(edit&&d.id){const{id,distance,created_at,updated_at,...u}=d;await sb(`driving_records?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(u)});}else{const{id,distance,created_at,updated_at,...u}=d;await sb("driving_records",{method:"POST",body:JSON.stringify(u)});}await updOdo(+d.end_odometer);await load();stToast("저장 완료");}catch{stToast("저장 실패");}setSync(false);setView("home");setRec(null);setGDist(0);setGDur(0);setGSpd(0);setGPts([]);};
  const saveF = async(r,edit)=>{if(!r.amount||!r.cost){stToast("주유량과 금액 입력");return;}setSync(true);try{r.vehicle_id=VEHICLE_ID;if(edit&&r.id){const{id,created_at,updated_at,...u}=r;await sb(`fuel_records?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(u)});}else{const{id,created_at,updated_at,...u}=r;await sb("fuel_records",{method:"POST",body:JSON.stringify(u)});}await load();stToast("저장 완료");}catch{stToast("저장 실패");}setSync(false);setView("home");setRec(null);};
  const delR = async(id,t)=>{setSync(true);try{await sb(`${t==="driving"?"driving_records":"fuel_records"}?id=eq.${id}`,{method:"DELETE"});await load();stToast("삭제 완료");}catch{stToast("삭제 실패");}setSync(false);setView("history");setDet(null);};

  const mR=all.filter(r=>mo(r._d)===fm),mD=mR.filter(r=>r._t==="driving"),mF=mR.filter(r=>r._t==="fuel");
  const tDist=mD.reduce((s,r)=>s+(r.distance||0),0),tFuel=mF.reduce((s,r)=>s+Number(r.cost||0),0);
  const bDist=mD.filter(r=>r.purpose==="business"||r.purpose==="commute").reduce((s,r)=>s+(r.distance||0),0);
  const aM=[...new Set(all.map(r=>mo(r._d)))].sort().reverse();if(!aM.includes(fm))aM.unshift(fm);

  if(!loaded) return (<div style={T.loadW}><div style={T.ldRing}/><style>{`@keyframes tspin{to{transform:rotate(360deg)}}@keyframes tpulse{0%,100%{opacity:1}50%{opacity:.3}}@keyframes tdash{0%{stroke-dashoffset:200}100%{stroke-dashoffset:0}}`}</style></div>);

  return (
    <div style={T.app}>
      <style>{`
        @keyframes tspin{to{transform:rotate(360deg)}}
        @keyframes tpulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes tripple{0%{box-shadow:0 0 0 0 rgba(232,33,51,.4)}70%{box-shadow:0 0 0 20px rgba(232,33,51,0)}100%{box-shadow:0 0 0 0 rgba(232,33,51,0)}}
        @keyframes tglow{0%,100%{opacity:.6}50%{opacity:1}}
        input:focus,textarea:focus{border-color:rgba(232,33,51,.5)!important;outline:none}
        input,textarea{font-family:inherit}
        ::-webkit-scrollbar{display:none}
      `}</style>
      {toast&&<div style={T.toast}>{toast}</div>}
      {sync&&<div style={T.syncLine}/>}

      {/* ══════ HOME ══════ */}
      {view==="home"&&<div style={T.pg}>
        <header style={T.hdr}>
          <div style={T.hdrRow}>
            <div>
              <div style={T.teslaLogo}>DRIVING LOG</div>
              <div style={T.hdrSub}>{veh?.vehicle_type||""} · {veh?.registration_number||""}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={T.hdrBtn} onClick={load}>↻</button>
              <button style={T.hdrBtn} onClick={()=>setView("stats")}>⊞</button>
              <button style={T.hdrBtn} onClick={()=>setView("export")}>↓</button>
            </div>
          </div>
        </header>

        {/* Hero odometer */}
        <div style={T.hero}>
          <svg viewBox="0 0 320 180" style={{width:"100%",maxWidth:320,margin:"0 auto",display:"block"}}>
            {/* Car silhouette */}
            <defs>
              <linearGradient id="carG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#333"/>
                <stop offset="100%" stopColor="#111"/>
              </linearGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            {/* Ground line */}
            <line x1="20" y1="130" x2="300" y2="130" stroke="#222" strokeWidth="1"/>
            {/* Car body */}
            <path d="M70,115 Q70,100 85,95 L120,80 Q130,75 140,75 L180,75 Q190,75 200,80 L235,95 Q250,100 250,115 Z" fill="url(#carG)" stroke="#333" strokeWidth="1"/>
            {/* Windows */}
            <path d="M125,83 L140,78 L180,78 L195,83 L190,95 L130,95 Z" fill="#1a1a1a" stroke="#444" strokeWidth="0.5"/>
            {/* Wheels */}
            <circle cx="105" cy="125" r="14" fill="#111" stroke="#444" strokeWidth="1.5"/>
            <circle cx="105" cy="125" r="8" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
            <circle cx="215" cy="125" r="14" fill="#111" stroke="#444" strokeWidth="1.5"/>
            <circle cx="215" cy="125" r="8" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
            {/* Headlights */}
            <ellipse cx="248" cy="108" rx="5" ry="3" fill="#E82133" opacity="0.8" filter="url(#glow)"/>
            <ellipse cx="72" cy="108" rx="5" ry="3" fill="rgba(255,255,255,0.6)" filter="url(#glow)"/>
            {/* Odometer text */}
            <text x="160" y="30" textAnchor="middle" fill="#555" fontSize="10" fontFamily="-apple-system,sans-serif" letterSpacing="3" fontWeight="300">ODOMETER</text>
            <text x="160" y="60" textAnchor="middle" fill="#fff" fontSize="32" fontFamily="-apple-system,sans-serif" fontWeight="200" letterSpacing="1">{fN(odo)}</text>
            <text x="195" y="60" textAnchor="start" fill="#555" fontSize="12" fontFamily="-apple-system,sans-serif" fontWeight="300" dx={String(odo).length * 6}>km</text>
          </svg>
          <div style={T.compBadge}>{veh?.company_name||""}</div>
        </div>

        {/* GPS Start */}
        <button style={T.gpsStart} onClick={startGPS}>
          <div style={T.gpsRing}><div style={T.gpsDot}/></div>
          <div style={{flex:1}}>
            <div style={T.gpsLabel}>운행 시작</div>
            <div style={T.gpsSub}>GPS 실시간 추적</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E82133" strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg>
        </button>

        {/* Action row */}
        <div style={T.actRow}>
          <button style={T.actCard} onClick={()=>{setRec({_m:"manual",drive_date:td(),start_odometer:odo,end_odometer:"",origin:"",destination:"",purpose:"business",driver_department:"",driver_name:"",memo:"",gps_tracked:false,commute_distance:0,business_distance:0});setView("new");}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span style={T.actLabel}>수동 기록</span>
          </button>
          <button style={T.actCard} onClick={()=>{setRec({fuel_date:td(),odometer:odo,fuel_type:"electric",amount:"",cost:"",memo:""});setView("fuel");}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/></svg>
            <span style={T.actLabel}>충전 기록</span>
          </button>
          <button style={T.actCard} onClick={()=>setView("history")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
            <span style={T.actLabel}>기록 조회</span>
          </button>
        </div>

        {/* Recent */}
        <div style={T.secHdr}><span style={T.secT}>최근 운행</span></div>
        <div style={T.list}>
          {all.length===0?<div style={T.empty}>기록이 없습니다</div>
          :all.slice(0,5).map(r=><RCard key={r.id} r={r} onClick={()=>{setDet(r);setDType(r._t);setView("detail");}}/>)}
        </div>
      </div>}

      {/* ══════ TRACKING ══════ */}
      {view==="tracking"&&<div style={T.pg}>
        <div style={T.trkPage}>
          <div style={T.trkDotW}><div style={T.trkDotOuter}/><div style={T.trkDotInner}/></div>
          <div style={T.trkStatusTxt}>TRACKING</div>
          <div style={T.trkDistW}>
            <span style={T.trkDistNum}>{fK(gDist)}</span>
            <span style={T.trkDistUnit}>km</span>
          </div>
          <div style={T.trkGrid}>
            <div style={T.trkStat}><div style={T.trkStatVal}>{fDu(gDur)}</div><div style={T.trkStatLbl}>TIME</div></div>
            <div style={T.trkStat}><div style={T.trkStatVal}>{Math.round(gSpd)}<span style={{fontSize:12,color:"#555"}}> km/h</span></div><div style={T.trkStatLbl}>SPEED</div></div>
            <div style={T.trkStat}><div style={T.trkStatVal}>{gPts.length}</div><div style={T.trkStatLbl}>POINTS</div></div>
            <div style={T.trkStat}><div style={T.trkStatVal}>{gDur>0?fK((gDist/gDur)*3600):"0"}<span style={{fontSize:12,color:"#555"}}> km/h</span></div><div style={T.trkStatLbl}>AVG</div></div>
          </div>
          {gErr&&<div style={T.errBox}>{gErr}</div>}
          <button style={T.stopBtn} onClick={stopGPS}>
            <div style={T.stopIcon}/>
            <span>운행 종료</span>
          </button>
        </div>
      </div>}

      {/* ══════ GPS SAVE ══════ */}
      {view==="gps-save"&&rec&&<div style={T.pg}>
        <NavBar title="GPS 운행 저장" onBack={()=>{setView("home");setRec(null);}} />
        <div style={T.gpsSumBar}>
          <div style={T.gpsSumItem}><span style={T.gpsSumVal}>{fK(rec.gps_distance)} km</span><span style={T.gpsSumLbl}>GPS 거리</span></div>
          <div style={T.gpsSumDiv}/>
          <div style={T.gpsSumItem}><span style={T.gpsSumVal}>{fDu(rec.gps_duration)}</span><span style={T.gpsSumLbl}>주행 시간</span></div>
        </div>
        <DForm r={rec} s={setRec}/>
        <button style={T.mainBtn} disabled={sync} onClick={()=>saveD(rec,false)}>{sync?"저장 중...":"저장"}</button>
      </div>}

      {/* ══════ MANUAL ══════ */}
      {view==="new"&&rec&&<div style={T.pg}>
        <NavBar title={rec.id?"운행 기록 수정":"수동 운행 기록"} onBack={()=>{setView("home");setRec(null);}} />
        <DForm r={rec} s={setRec}/>
        <button style={T.mainBtn} disabled={sync} onClick={()=>saveD(rec,!!rec.id)}>{sync?"저장 중...":"저장"}</button>
      </div>}

      {/* ══════ FUEL ══════ */}
      {view==="fuel"&&rec&&<div style={T.pg}>
        <NavBar title={rec.id?"충전 기록 수정":"충전 기록"} onBack={()=>{setView("home");setRec(null);}} />
        <FForm r={rec} s={setRec}/>
        <button style={T.mainBtn} disabled={sync} onClick={()=>saveF(rec,!!rec.id)}>{sync?"저장 중...":"저장"}</button>
      </div>}

      {/* ══════ HISTORY ══════ */}
      {view==="history"&&<div style={T.pg}>
        <NavBar title="운행 기록" onBack={()=>setView("home")} />
        <MSel ms={aM} c={fm} s={setFm}/>
        <div style={T.list}>{mR.length===0?<div style={T.empty}>기록 없음</div>:mR.map(r=><RCard key={r.id} r={r} onClick={()=>{setDet(r);setDType(r._t);setView("detail");}}/>)}</div>
      </div>}

      {/* ══════ DETAIL ══════ */}
      {view==="detail"&&det&&<div style={T.pg}>
        <NavBar title={dType==="driving"?"운행 상세":"충전 상세"} onBack={()=>{setView("history");setDet(null);}} />
        <div style={T.dtCard}>
          <div style={T.dtDate}>{fD(det._d)}</div>
          {det.gps_tracked&&<div style={T.dtGps}>GPS</div>}
          {dType==="driving"?<>
            <DR l="출발" v={`${fN(det.start_odometer)} km`}/><DR l="도착" v={`${fN(det.end_odometer)} km`}/>
            <div style={T.dtHighlight}><span style={T.dtHlLabel}>주행 거리</span><span style={T.dtHlVal}>{fN(det.distance)} km</span></div>
            {det.gps_distance>0&&<DR l="GPS 측정" v={`${fK(det.gps_distance)} km`}/>}
            {det.gps_duration>0&&<DR l="주행 시간" v={fDu(det.gps_duration)}/>}
            <div style={T.dtDiv}/>
            <DR l="경로" v={`${det.origin||"-"} → ${det.destination||"-"}`}/>
            <DR l="목적" v={PURP.find(p=>p.id===det.purpose)?.label||""}/>
            {det.driver_name&&<DR l="사용자" v={`${det.driver_department||""} ${det.driver_name}`}/>}
          </>:<>
            <DR l="주행거리" v={`${fN(det.odometer)} km`}/>
            <DR l="연료" v={FUEL.find(f=>f.id===det.fuel_type)?.label||""}/>
            <DR l="충전량" v={`${fN(det.amount)} L`}/>
            <div style={T.dtHighlight}><span style={T.dtHlLabel}>금액</span><span style={T.dtHlVal}>{fN(det.cost)} 원</span></div>
          </>}
          {det.memo&&<div style={T.dtMemo}>{det.memo}</div>}
        </div>
        <div style={T.dtActs}>
          <button style={T.dtEdit} onClick={()=>{if(dType==="driving"){setRec({...det,_m:"manual"});setView("new");}else{setRec({...det});setView("fuel");}}}>수정</button>
          <button style={T.dtDel} onClick={()=>{if(confirm("삭제하시겠습니까?"))delR(det.id,dType);}}>삭제</button>
        </div>
      </div>}

      {/* ══════ STATS ══════ */}
      {view==="stats"&&<div style={T.pg}>
        <NavBar title="통계" onBack={()=>setView("home")} />
        <MSel ms={aM} c={fm} s={setFm}/>
        <div style={T.statsRow}>
          <SBox v={fN(tDist)} u="km" l="총 주행거리"/>
          <SBox v={mD.length} u="회" l="운행 횟수"/>
        </div>
        <div style={T.statsRow}>
          <SBox v={fN(tFuel)} u="원" l="충전 비용"/>
          <SBox v={mF.length} u="회" l="충전 횟수"/>
        </div>
        {tDist>0&&<div style={T.card}>
          <div style={T.ratioHdr}>업무 사용 비율</div>
          <div style={T.ratioBar}><div style={{...T.ratioBiz,width:`${(bDist/tDist)*100}%`}}/></div>
          <div style={T.ratioLeg}>
            <span><span style={T.rDotR}/> 업무 {fN(bDist)} km ({Math.round((bDist/tDist)*100)}%)</span>
            <span><span style={T.rDotG}/> 개인 {fN(tDist-bDist)} km</span>
          </div>
        </div>}
        <button style={{...T.mainBtn,marginTop:16,background:"transparent",border:"1px solid #333",color:"#aaa"}} onClick={()=>setView("export")}>엑셀 내보내기</button>
      </div>}

      {/* ══════ EXPORT ══════ */}
      {view==="export"&&<div style={T.pg}>
        <NavBar title="엑셀 내보내기" onBack={()=>setView("home")} />
        <div style={T.card}>
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>📄</div>
            <div style={{fontSize:16,fontWeight:600,color:"#fff",marginBottom:4}}>운행기록부 내보내기</div>
            <div style={{fontSize:12,color:"#555"}}>국세청 공식 양식</div>
          </div>
          <div style={T.expInfo}><span style={T.expL}>법인명</span><span style={T.expV}>{veh?.company_name||"-"}</span></div>
          <div style={T.expInfo}><span style={T.expL}>차량</span><span style={T.expV}>{veh?.vehicle_type||""} ({veh?.registration_number||""})</span></div>
        </div>
        <div style={T.card}>
          <div style={{fontSize:11,color:"#555",fontWeight:600,letterSpacing:1,marginBottom:8}}>내보낼 월</div>
          <MSel ms={aM} c={fm} s={setFm}/>
          <div style={T.expInfo}><span style={T.expL}>운행 기록</span><span style={T.expV}>{drv.filter(r=>mo(r.drive_date)===fm).length}건</span></div>
          <div style={T.expInfo}><span style={T.expL}>충전 기록</span><span style={T.expV}>{fue.filter(r=>mo(r.fuel_date)===fm).length}건</span></div>
        </div>
        <button style={T.mainBtn} onClick={()=>{try{exportExcel(veh,drv,fue,fm);stToast("다운로드 시작");}catch{stToast("내보내기 실패");}}}>다운로드</button>
      </div>}
    </div>
  );
}

/* ═══ Sub Components ═══ */
function NavBar({title,onBack}){return<header style={T.nav}><button style={T.navBack} onClick={onBack}>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E82133" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
</button><span style={T.navTitle}>{title}</span><div style={{width:32}}/></header>;}

function DForm({r,s}){return<div style={T.card}>
  <FG l="날짜"><input style={T.inp} type="date" value={r.drive_date} onChange={e=>s({...r,drive_date:e.target.value})}/></FG>
  <div style={T.row2}><FG l="부서"><input style={T.inp} value={r.driver_department||""} placeholder="대표이사" onChange={e=>s({...r,driver_department:e.target.value})}/></FG><FG l="성명"><input style={T.inp} value={r.driver_name||""} placeholder="이동욱" onChange={e=>s({...r,driver_name:e.target.value})}/></FG></div>
  <div style={T.row2}>
    <FG l="출발 거리 (km)"><input style={T.inp} type="number" value={r.start_odometer} onChange={e=>s({...r,start_odometer:+e.target.value})}/></FG>
    <FG l="도착 거리 (km)"><input style={{...T.inp,color:"#E82133"}} type="number" value={r.end_odometer} placeholder="도착 시" onChange={e=>s({...r,end_odometer:e.target.value?+e.target.value:""})}/></FG>
  </div>
  {r.end_odometer&&+r.end_odometer>+r.start_odometer&&<div style={T.distTag}>{fN(+r.end_odometer-+r.start_odometer)} km</div>}
  <div style={T.row2}><FG l="출발지"><input style={T.inp} value={r.origin} placeholder="회사" onChange={e=>s({...r,origin:e.target.value})}/></FG><FG l="목적지"><input style={T.inp} value={r.destination} placeholder="거래처" onChange={e=>s({...r,destination:e.target.value})}/></FG></div>
  <FG l="운행 목적"><div style={T.chipRow}>{PURP.map(p=><button key={p.id} style={r.purpose===p.id?T.chipOn:T.chipOff} onClick={()=>s({...r,purpose:p.id})}>{p.label}</button>)}</div></FG>
  <FG l="메모"><textarea style={T.ta} value={r.memo} placeholder="메모" rows={2} onChange={e=>s({...r,memo:e.target.value})}/></FG>
</div>;}

function FForm({r,s}){return<div style={T.card}>
  <FG l="날짜"><input style={T.inp} type="date" value={r.fuel_date} onChange={e=>s({...r,fuel_date:e.target.value})}/></FG>
  <FG l="주행거리 (km)"><input style={T.inp} type="number" value={r.odometer} onChange={e=>s({...r,odometer:+e.target.value})}/></FG>
  <FG l="연료 종류"><div style={T.chipRow}>{FUEL.map(f=><button key={f.id} style={r.fuel_type===f.id?T.chipOn:T.chipOff} onClick={()=>s({...r,fuel_type:f.id})}>{f.label}</button>)}</div></FG>
  <div style={T.row2}><FG l="충전량 (L/kWh)"><input style={T.inp} type="number" value={r.amount} placeholder="0" onChange={e=>s({...r,amount:e.target.value})}/></FG><FG l="금액 (원)"><input style={T.inp} type="number" value={r.cost} placeholder="0" onChange={e=>s({...r,cost:e.target.value})}/></FG></div>
  {r.amount&&r.cost&&+r.amount>0&&<div style={T.distTag}>{fN(Math.round(+r.cost/+r.amount))} 원/L</div>}
  <FG l="메모"><textarea style={T.ta} value={r.memo} placeholder="충전소명" rows={2} onChange={e=>s({...r,memo:e.target.value})}/></FG>
</div>;}

function FG({l,children}){return<div style={T.fg}><label style={T.fgLabel}>{l}</label>{children}</div>;}
function RCard({r,onClick}){return<div style={T.rCard} onClick={onClick}>
  <div style={T.rLeft}><div style={T.rIcon}>{r._t==="driving"?(r.gps_tracked?"◉":"→"):"⚡"}</div>
    <div><div style={T.rDate}>{fD(r._d)}</div>
      {r._t==="driving"?<div style={T.rRoute}>{r.origin||"출발"} → {r.destination||"도착"}</div>
      :<div style={T.rRoute}>{FUEL.find(f=>f.id===r.fuel_type)?.label||""} {fN(r.amount)}L</div>}
    </div>
  </div>
  <div style={T.rRight}>{r._t==="driving"?<span style={T.rDist}>{fN(r.distance)} km</span>:<span style={T.rCost}>{fN(r.cost)}원</span>}</div>
</div>;}
function DR({l,v}){return<div style={T.drRow}><span style={T.drL}>{l}</span><span style={T.drV}>{v}</span></div>;}
function MSel({ms,c,s}){return<div style={T.mSel}>{ms.map(m=><button key={m} style={c===m?T.mOn:T.mOff} onClick={()=>s(m)}>{m.replace("-",".")}</button>)}</div>;}
function SBox({v,u,l}){return<div style={T.sBox}><div style={T.sVal}>{v}<span style={T.sUnit}>{u}</span></div><div style={T.sLbl}>{l}</div></div>;}

/* ═══ Tesla-inspired Styles ═══ */
const T = {
  app:{fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Pretendard',sans-serif",maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#000",color:"#fff",position:"relative",paddingBottom:40},
  loadW:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#000"},
  ldRing:{width:40,height:40,border:"2px solid #222",borderTop:"2px solid #E82133",borderRadius:"50%",animation:"tspin .8s linear infinite"},
  toast:{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:"#E82133",color:"#fff",padding:"10px 28px",borderRadius:100,fontSize:13,fontWeight:500,zIndex:9999,letterSpacing:.3},
  syncLine:{position:"fixed",top:0,left:0,right:0,height:2,background:"#E82133",zIndex:9998},
  pg:{padding:"0 20px"},

  // Header
  hdr:{paddingTop:20,marginBottom:4},
  hdrRow:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"},
  teslaLogo:{fontSize:11,fontWeight:600,color:"#E82133",letterSpacing:4,marginBottom:2},
  hdrSub:{fontSize:12,color:"#555",fontWeight:400},
  hdrBtn:{background:"none",border:"1px solid #222",borderRadius:8,padding:"6px 10px",color:"#666",fontSize:14,cursor:"pointer",lineHeight:1},

  // Hero
  hero:{paddingTop:8,paddingBottom:8},
  compBadge:{textAlign:"center",fontSize:10,color:"#444",fontWeight:500,letterSpacing:1,marginTop:4},

  // GPS Start
  gpsStart:{width:"100%",display:"flex",alignItems:"center",gap:14,background:"#000",border:"1px solid #222",borderRadius:14,padding:"16px 18px",cursor:"pointer",marginBottom:16,color:"#fff",textAlign:"left"},
  gpsRing:{width:40,height:40,borderRadius:"50%",border:"2px solid #E82133",display:"flex",alignItems:"center",justifyContent:"center",animation:"tripple 2s infinite"},
  gpsDot:{width:12,height:12,borderRadius:"50%",background:"#E82133"},
  gpsLabel:{fontSize:15,fontWeight:600,letterSpacing:.5},
  gpsSub:{fontSize:11,color:"#555",marginTop:2},

  // Actions
  actRow:{display:"flex",gap:10,marginBottom:24},
  actCard:{flex:1,background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:14,padding:"18px 12px",cursor:"pointer",textAlign:"center",color:"#888",display:"flex",flexDirection:"column",alignItems:"center",gap:8},
  actLabel:{fontSize:12,fontWeight:500},

  // Section
  secHdr:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10},
  secT:{fontSize:13,fontWeight:600,color:"#555",letterSpacing:1,textTransform:"uppercase"},

  // List / Records
  list:{display:"flex",flexDirection:"column",gap:1},
  rCard:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid #111",cursor:"pointer"},
  rLeft:{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0},
  rIcon:{width:32,height:32,borderRadius:8,background:"#111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#E82133",fontWeight:700,flexShrink:0},
  rDate:{fontSize:12,color:"#555"},
  rRoute:{fontSize:14,fontWeight:500,color:"#ccc",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  rRight:{flexShrink:0,textAlign:"right"},
  rDist:{fontSize:15,fontWeight:600,color:"#fff"},
  rCost:{fontSize:15,fontWeight:600,color:"#E82133"},
  empty:{textAlign:"center",padding:40,color:"#333",fontSize:13},

  // Tracking
  trkPage:{paddingTop:60,textAlign:"center"},
  trkDotW:{width:60,height:60,margin:"0 auto 24px",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"},
  trkDotOuter:{position:"absolute",width:60,height:60,borderRadius:"50%",border:"2px solid #E82133",animation:"tripple 2s infinite"},
  trkDotInner:{width:20,height:20,borderRadius:"50%",background:"#E82133",animation:"tpulse 1.5s ease-in-out infinite"},
  trkStatusTxt:{fontSize:11,color:"#E82133",fontWeight:600,letterSpacing:4,marginBottom:32},
  trkDistW:{marginBottom:40},
  trkDistNum:{fontSize:72,fontWeight:200,color:"#fff",letterSpacing:-2,fontVariantNumeric:"tabular-nums"},
  trkDistUnit:{fontSize:20,color:"#555",fontWeight:300,marginLeft:4},
  trkGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,marginBottom:40,background:"#111",borderRadius:12,overflow:"hidden"},
  trkStat:{background:"#0a0a0a",padding:"16px 12px",textAlign:"center"},
  trkStatVal:{fontSize:18,fontWeight:500,color:"#fff"},
  trkStatLbl:{fontSize:10,color:"#444",fontWeight:600,letterSpacing:2,marginTop:4},
  errBox:{background:"#1a0000",border:"1px solid #330000",borderRadius:10,padding:"10px 14px",color:"#E82133",fontSize:12,marginBottom:16},
  stopBtn:{display:"flex",alignItems:"center",justifyContent:"center",gap:12,width:"100%",background:"#0a0a0a",border:"1px solid #E82133",borderRadius:14,padding:16,color:"#E82133",fontSize:16,fontWeight:600,cursor:"pointer"},
  stopIcon:{width:16,height:16,borderRadius:3,background:"#E82133"},

  // GPS Save Summary
  gpsSumBar:{display:"flex",alignItems:"center",background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:12,padding:"14px 0",marginBottom:16},
  gpsSumItem:{flex:1,textAlign:"center"},
  gpsSumVal:{display:"block",fontSize:18,fontWeight:600,color:"#fff"},
  gpsSumLbl:{display:"block",fontSize:10,color:"#444",letterSpacing:1,marginTop:2},
  gpsSumDiv:{width:1,height:30,background:"#222"},

  // Nav
  nav:{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:20,marginBottom:16},
  navBack:{background:"none",border:"none",cursor:"pointer",padding:4},
  navTitle:{fontSize:16,fontWeight:600,color:"#fff",letterSpacing:.3},

  // Form
  card:{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:14,padding:20,marginBottom:16},
  fg:{marginBottom:16,flex:1},
  fgLabel:{display:"block",fontSize:10,fontWeight:600,color:"#444",marginBottom:6,letterSpacing:1,textTransform:"uppercase"},
  inp:{width:"100%",padding:"12px 14px",background:"#111",border:"1px solid #222",borderRadius:10,color:"#fff",fontSize:15,boxSizing:"border-box",fontWeight:400},
  ta:{width:"100%",padding:"12px 14px",background:"#111",border:"1px solid #222",borderRadius:10,color:"#fff",fontSize:15,boxSizing:"border-box",resize:"none",fontFamily:"inherit"},
  row2:{display:"flex",gap:10},
  fArrow:{color:"#333",fontSize:18,padding:"0 4px",paddingBottom:12},
  distTag:{background:"#1a0a0a",border:"1px solid #2a1111",borderRadius:10,padding:"8px 14px",textAlign:"center",color:"#E82133",fontSize:15,fontWeight:600,marginBottom:16},
  chipRow:{display:"flex",gap:6,flexWrap:"wrap"},
  chipOff:{background:"#111",border:"1px solid #222",borderRadius:20,padding:"8px 16px",color:"#555",fontSize:13,fontWeight:500,cursor:"pointer"},
  chipOn:{background:"rgba(232,33,51,.1)",border:"1px solid rgba(232,33,51,.4)",borderRadius:20,padding:"8px 16px",color:"#E82133",fontSize:13,fontWeight:600,cursor:"pointer"},
  mainBtn:{width:"100%",padding:16,background:"#E82133",border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",letterSpacing:.5},

  // Detail
  dtCard:{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:14,padding:20},
  dtDate:{fontSize:14,fontWeight:500,color:"#888",marginBottom:12,textAlign:"center"},
  dtGps:{textAlign:"center",fontSize:10,color:"#E82133",fontWeight:600,letterSpacing:2,marginBottom:12},
  dtHighlight:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"#111",borderRadius:10,marginTop:8,marginBottom:8},
  dtHlLabel:{fontSize:13,color:"#888"},
  dtHlVal:{fontSize:18,fontWeight:600,color:"#fff"},
  dtDiv:{height:1,background:"#1a1a1a",margin:"12px 0"},
  dtMemo:{marginTop:12,padding:"10px 14px",background:"#111",borderRadius:8,fontSize:12,color:"#555"},
  dtActs:{display:"flex",gap:10,marginTop:16},
  dtEdit:{flex:1,padding:14,background:"#111",border:"1px solid #222",borderRadius:12,color:"#fff",fontSize:14,fontWeight:500,cursor:"pointer",textAlign:"center"},
  dtDel:{flex:1,padding:14,background:"#0a0a0a",border:"1px solid #2a1111",borderRadius:12,color:"#E82133",fontSize:14,fontWeight:500,cursor:"pointer",textAlign:"center"},
  drRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0"},
  drL:{fontSize:13,color:"#555"},
  drV:{fontSize:14,color:"#ccc",fontWeight:500},

  // Month Selector
  mSel:{display:"flex",gap:6,overflowX:"auto",marginBottom:16,paddingBottom:4},
  mOff:{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:8,padding:"7px 14px",color:"#444",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},
  mOn:{background:"rgba(232,33,51,.1)",border:"1px solid rgba(232,33,51,.3)",borderRadius:8,padding:"7px 14px",color:"#E82133",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},

  // Stats
  statsRow:{display:"flex",gap:10,marginBottom:10},
  sBox:{flex:1,background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:14,padding:"20px 16px",textAlign:"center"},
  sVal:{fontSize:22,fontWeight:600,color:"#fff"},
  sUnit:{fontSize:12,fontWeight:400,color:"#444",marginLeft:2},
  sLbl:{fontSize:10,color:"#444",marginTop:6,letterSpacing:1,fontWeight:500},
  ratioHdr:{fontSize:12,color:"#555",fontWeight:600,marginBottom:10,letterSpacing:.5},
  ratioBar:{height:6,borderRadius:3,background:"#1a1a1a",overflow:"hidden"},
  ratioBiz:{height:6,background:"#E82133",borderRadius:3,transition:"width .5s"},
  ratioLeg:{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11,color:"#555"},
  rDotR:{display:"inline-block",width:6,height:6,borderRadius:3,background:"#E82133",marginRight:4,verticalAlign:"middle"},
  rDotG:{display:"inline-block",width:6,height:6,borderRadius:3,background:"#333",marginRight:4,verticalAlign:"middle"},

  // Export
  expInfo:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #111"},
  expL:{fontSize:12,color:"#555"},
  expV:{fontSize:13,color:"#ccc",fontWeight:500},
};
