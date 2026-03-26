import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

const SUPABASE_URL = "https://zpdmkejxwcysbfahudkw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZG1rZWp4d2N5c2JmYWh1ZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjExNzEsImV4cCI6MjA5MDA5NzE3MX0.hPy39hHUMFXom-aBfexB-N0VO8o_TQKKpanEfWw_bxQ";
const VEHICLE_ID = "c7f656ef-fcd6-4ea5-8a59-deba47fe369a";

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { ...headers, ...(opts.headers || {}) }, ...opts });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const t = await res.text();
  return t ? JSON.parse(t) : [];
}

const PURPOSE_OPTIONS = [
  { id: "business", label: "업무", icon: "💼" },
  { id: "commute", label: "출퇴근", icon: "🏢" },
  { id: "personal", label: "개인", icon: "🏠" },
  { id: "other", label: "기타", icon: "📌" },
];
const FUEL_TYPE_OPTIONS = [
  { id: "gasoline", label: "휘발유" }, { id: "diesel", label: "경유" },
  { id: "lpg", label: "LPG" }, { id: "electric", label: "전기충전" }, { id: "hydrogen", label: "수소" },
];

function formatDate(d) {
  const dt = new Date(d); const w = ["일","월","화","수","목","금","토"];
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")} (${w[dt.getDay()]})`;
}
function fmtNum(n) { return n == null || n === "" ? "-" : Number(n).toLocaleString(); }
function fmtKm(n) { return n == null ? "0.0" : Number(n).toFixed(1); }
function today() { return new Date().toISOString().split("T")[0]; }
function monthOf(d) { return d.substring(0, 7); }
function fmtDur(s) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  if (h>0) return `${h}시간 ${String(m).padStart(2,"0")}분`;
  if (m>0) return `${m}분 ${String(sec).padStart(2,"0")}초`;
  return `${sec}초`;
}
function haversine(lat1,lon1,lat2,lon2) {
  const R=6371,dLat=((lat2-lat1)*Math.PI)/180,dLon=((lon2-lon1)*Math.PI)/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function dateToKr(d) {
  const dt = new Date(d); const w = ["일","월","화","수","목","금","토"];
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}(${w[dt.getDay()]})`;
}

// =================== EXCEL EXPORT ===================
function exportToExcel(vehicle, drivingRecs, fuelRecs, selectedMonth) {
  const wb = XLSX.utils.book_new();

  // Filter by month
  const recs = drivingRecs
    .filter(r => monthOf(r.drive_date) === selectedMonth)
    .sort((a, b) => new Date(a.drive_date) - new Date(b.drive_date));

  const yearMonth = selectedMonth.replace("-", ".");
  const fy_start = vehicle?.fiscal_year_start || "2025-01-01";
  const fy_end = vehicle?.fiscal_year_end || "2025-12-31";

  // Build data array matching official format
  const data = [];

  // Row 1: Title
  data.push(["【업무용승용차 운행기록부에 관한 별지 서식】 (2016. 4. 1. 제정)"]);
  // Row 2: Fiscal year + title + company
  data.push(["사업연도", "", "", "", "", "", "", fy_start, "", "", "", "", "", "", "", "업무용승용차 운행기록부", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "법인명", "", "", "", "", "", vehicle?.company_name || ""]);
  // Row 3: ~
  data.push(["", "", "", "", "", "", "", "～", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  // Row 4: business number
  data.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "사업자등록번호", "", "", "", "", "", vehicle?.business_number || ""]);
  // Row 5: fiscal year end
  data.push(["", "", "", "", "", "", "", fy_end, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  // Row 6: blank
  data.push([]);
  // Row 7: 1. 기본정보
  data.push(["1. 기본정보"]);
  // Row 8: headers
  data.push(["①차 종", "", "", "", "", "", "", "", "", "", "②자동차등록번호"]);
  // Row 9: vehicle info
  data.push([vehicle?.vehicle_type || "", "", "", "", "", "", "", "", "", "", vehicle?.registration_number || ""]);
  // Row 10: blank
  data.push([]);
  // Row 11: 2. 업무용 사용비율 계산
  data.push(["2. 업무용 사용비율 계산"]);

  // Row 12: Main header row
  data.push([
    "③사용일자(요일)", "", "", "", "",
    "④사용자", "",
    "", "", "",
    "", "", "",
    "운 행 내 역", "",
    "", "", "", "",
    "", "", "", "", "",
    "",
    "⑦주행거리(㎞)", "", "", "", "", "",
    "업무용 사용거리(㎞)", "", "", "", "",
    "", "", "", "", "", "",
    "⑩비 고"
  ]);

  // Row 13: Sub-header
  data.push([
    "", "", "", "", "",
    "부서", "",
    "", "", "성명",
    "", "", "",
    "⑤주행 전\n계기판의 거리(㎞)", "",
    "", "", "", "",
    "⑥주행 후\n계기판의 거리(㎞)", "", "", "", "",
    "",
    "", "", "", "", "", "",
    "⑧출ㆍ퇴근용(㎞)", "", "", "", "",
    "", "⑨일반 업무용(㎞)", "", "", "", "",
    "",
    ""
  ]);

  // Row 14: blank sub header
  data.push([]);

  // Data rows
  let totalDistance = 0;
  let totalCommute = 0;
  let totalBusiness = 0;

  recs.forEach(r => {
    const dist = r.distance || (r.end_odometer - r.start_odometer);
    totalDistance += dist;
    totalCommute += (r.commute_distance || 0);
    totalBusiness += (r.business_distance || 0);

    const row = new Array(44).fill("");
    row[0] = dateToKr(r.drive_date);     // 사용일자
    row[5] = r.driver_department || "";   // 부서
    row[9] = r.driver_name || "";         // 성명
    row[13] = r.start_odometer;           // 주행 전 거리
    row[19] = r.end_odometer;             // 주행 후 거리
    row[25] = dist;                       // 주행거리
    row[31] = r.commute_distance || 0;    // 출퇴근용
    row[37] = r.business_distance || 0;   // 일반 업무용
    row[43] = r.memo || "";               // 비고
    if (r.gps_tracked) row[43] = `[GPS] ${r.memo || ""}`;
    // 출발지/목적지 info
    if (r.origin || r.destination) {
      row[43] = `${r.origin || ""} → ${r.destination || ""} ${row[43]}`.trim();
    }
    data.push(row);
  });

  // Fill empty rows to match template (at least ~30 rows of data area)
  const minRows = 30;
  for (let i = recs.length; i < minRows; i++) {
    const row = new Array(44).fill("");
    row[25] = 0;
    data.push(row);
  }

  // Summary row
  const sumRow = new Array(44).fill("");
  sumRow[13] = `⑪사업연도 총주행 거리(㎞)`;
  sumRow[31] = `⑫사업연도 업무용 사용거리(㎞)`;
  sumRow[43] = "⑬업무사용비율\n(⑫/⑪)";
  data.push(sumRow);

  const totalRow = new Array(44).fill("");
  totalRow[13] = totalDistance;
  totalRow[31] = totalCommute + totalBusiness;
  totalRow[43] = totalDistance > 0 ? ((totalCommute + totalBusiness) / totalDistance).toFixed(4) : 0;
  data.push(totalRow);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws["!cols"] = [
    { wch: 16 }, // A - 날짜
    { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 },
    { wch: 8 },  // F - 부서
    { wch: 3 },
    { wch: 6 }, { wch: 3 },
    { wch: 8 },  // J - 성명
    { wch: 3 }, { wch: 3 }, { wch: 3 },
    { wch: 12 }, // N - 주행전
    { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 },
    { wch: 12 }, // T - 주행후
    { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 },
    { wch: 3 },
    { wch: 10 }, // Z - 주행거리
    { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 },
    { wch: 10 }, // AF - 출퇴근
    { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 },
    { wch: 3 },
    { wch: 10 }, // AL - 업무용
    { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 },
    { wch: 3 },
    { wch: 20 }, // AR - 비고
  ];

  XLSX.utils.book_append_sheet(wb, ws, "운행기록부");

  // Also add fuel records sheet if any
  const fRecs = fuelRecs
    .filter(r => monthOf(r.fuel_date) === selectedMonth)
    .sort((a, b) => new Date(a.fuel_date) - new Date(b.fuel_date));

  if (fRecs.length > 0) {
    const fuelData = [
      ["주유/충전 기록부", "", "", "", "", vehicle?.vehicle_type || "", vehicle?.registration_number || ""],
      [],
      ["날짜", "주행거리(km)", "연료종류", "주유량(L/kWh)", "금액(원)", "단가(원)", "메모"],
    ];
    fRecs.forEach(r => {
      const unitPrice = r.amount > 0 ? Math.round(Number(r.cost) / Number(r.amount)) : 0;
      const ftLabel = FUEL_TYPE_OPTIONS.find(f => f.id === r.fuel_type)?.label || "";
      fuelData.push([dateToKr(r.fuel_date), r.odometer, ftLabel, Number(r.amount), Number(r.cost), unitPrice, r.memo || ""]);
    });
    // Totals
    const totalAmount = fRecs.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalCost = fRecs.reduce((s, r) => s + Number(r.cost || 0), 0);
    fuelData.push([]);
    fuelData.push(["합계", "", "", totalAmount, totalCost, totalCost > 0 && totalAmount > 0 ? Math.round(totalCost / totalAmount) : 0, ""]);

    const ws2 = XLSX.utils.aoa_to_sheet(fuelData);
    ws2["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, "주유기록");
  }

  // Download
  const fileName = `운행기록부_${vehicle?.company_name || ""}_(${yearMonth}).xlsx`;
  XLSX.writeFile(wb, fileName);
}

// =================== MAIN COMPONENT ===================
export default function DrivingLog() {
  const [vehicle, setVehicle] = useState(null);
  const [drivingRecs, setDrivingRecs] = useState([]);
  const [fuelRecs, setFuelRecs] = useState([]);
  const [view, setView] = useState("home");
  const [editRec, setEditRec] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [filterMonth, setFilterMonth] = useState(monthOf(today()));
  const [detailRec, setDetailRec] = useState(null);
  const [detailType, setDetailType] = useState("driving");
  const [toast, setToast] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // GPS
  const [tracking, setTracking] = useState(false);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [gpsSpeed, setGpsSpeed] = useState(0);
  const [gpsDuration, setGpsDuration] = useState(0);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [gpsError, setGpsError] = useState(null);
  const watchRef = useRef(null); const lastPosRef = useRef(null); const startRef = useRef(null);
  const timerRef = useRef(null); const distRef = useRef(0); const ptsRef = useRef([]); const durRef = useRef(0);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const loadData = useCallback(async () => {
    try {
      const [v, dr, fr] = await Promise.all([
        sb(`vehicles?id=eq.${VEHICLE_ID}&select=*`),
        sb(`driving_records?vehicle_id=eq.${VEHICLE_ID}&select=*&order=drive_date.desc,created_at.desc`),
        sb(`fuel_records?vehicle_id=eq.${VEHICLE_ID}&select=*&order=fuel_date.desc,created_at.desc`),
      ]);
      if (v.length > 0) setVehicle(v[0]);
      setDrivingRecs(dr); setFuelRecs(fr);
    } catch (e) { showToast("데이터 로드 실패"); }
    setLoaded(true);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const lastOdo = vehicle?.current_odometer || 0;
  const allRecords = [
    ...drivingRecs.map(r => ({ ...r, _type: "driving", _date: r.drive_date, _st: r.created_at })),
    ...fuelRecs.map(r => ({ ...r, _type: "fuel", _date: r.fuel_date, _st: r.created_at })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date) || new Date(b._st) - new Date(a._st));

  const updateOdo = async (odo) => {
    try { await sb(`vehicles?id=eq.${VEHICLE_ID}`, { method: "PATCH", body: JSON.stringify({ current_odometer: odo }) }); setVehicle(p => ({ ...p, current_odometer: odo })); } catch {}
  };

  // GPS
  const startTracking = () => {
    if (!navigator.geolocation) { setGpsError("GPS 미지원"); return; }
    setGpsError(null); setGpsDistance(0); setGpsSpeed(0); setGpsDuration(0); setGpsPoints([]);
    distRef.current=0; ptsRef.current=[]; lastPosRef.current=null; startRef.current=Date.now(); durRef.current=0;
    const wId = navigator.geolocation.watchPosition(
      (pos) => {
        const {latitude:lat,longitude:lng,speed,accuracy} = pos.coords;
        if (accuracy>50) return;
        ptsRef.current=[...ptsRef.current,{lat,lng,time:Date.now()}]; setGpsPoints([...ptsRef.current]);
        if (lastPosRef.current) { const d=haversine(lastPosRef.current.lat,lastPosRef.current.lng,lat,lng); if(d>0.005){distRef.current+=d;setGpsDistance(distRef.current);lastPosRef.current={lat,lng};} } else { lastPosRef.current={lat,lng}; }
        if (speed!=null&&speed>=0) setGpsSpeed(speed*3.6);
      },
      (err) => setGpsError(err.code===1?"위치 권한을 허용해주세요.":"GPS 신호 없음"),
      {enableHighAccuracy:true,maximumAge:3000,timeout:10000}
    );
    watchRef.current=wId; setTracking(true); setView("tracking");
    timerRef.current=setInterval(()=>{durRef.current=Math.floor((Date.now()-startRef.current)/1000);setGpsDuration(durRef.current);},1000);
  };
  const stopTracking = () => {
    if(watchRef.current!=null){navigator.geolocation.clearWatch(watchRef.current);watchRef.current=null;}
    if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}
    setTracking(false);
    const km=Math.round(distRef.current*10)/10;
    setEditRec({_mode:"gps",drive_date:today(),start_odometer:lastOdo,end_odometer:Math.round(lastOdo+km),origin:"",destination:"",purpose:"business",driver_department:"",driver_name:"",memo:"",gps_tracked:true,gps_distance:km,gps_duration:durRef.current,commute_distance:0,business_distance:Math.round(km)});
    setView("gps-save");
  };
  useEffect(()=>()=>{if(watchRef.current!=null)navigator.geolocation.clearWatch(watchRef.current);if(timerRef.current)clearInterval(timerRef.current);},[]);

  // Save
  const saveDriving = async (rec, isEdit) => {
    const {_mode,...data}=rec;
    if(!data.end_odometer||Number(data.end_odometer)<=Number(data.start_odometer)){showToast("도착 주행거리를 확인해주세요");return;}
    setSyncing(true);
    try {
      const dist=Number(data.end_odometer)-Number(data.start_odometer);
      if(data.purpose==="commute"){data.commute_distance=dist;data.business_distance=0;}
      else if(data.purpose==="business"){data.business_distance=dist;data.commute_distance=0;}
      else{data.commute_distance=0;data.business_distance=0;}
      data.vehicle_id=VEHICLE_ID;
      if(isEdit&&data.id){const{id,distance,created_at,updated_at,...upd}=data;await sb(`driving_records?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(upd)});}
      else{const{id,distance,created_at,updated_at,...ins}=data;await sb("driving_records",{method:"POST",body:JSON.stringify(ins)});}
      await updateOdo(Number(data.end_odometer)); await loadData();
      showToast("운행 기록 저장 완료 ✓");
    } catch(e){showToast("저장 실패");}
    setSyncing(false);setView("home");setEditRec(null);setGpsDistance(0);setGpsDuration(0);setGpsSpeed(0);setGpsPoints([]);
  };
  const saveFuel = async (rec, isEdit) => {
    if(!rec.amount||!rec.cost){showToast("주유량과 금액을 입력해주세요");return;}
    setSyncing(true);
    try {
      rec.vehicle_id=VEHICLE_ID;
      if(isEdit&&rec.id){const{id,created_at,updated_at,...upd}=rec;await sb(`fuel_records?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(upd)});}
      else{const{id,created_at,updated_at,...ins}=rec;await sb("fuel_records",{method:"POST",body:JSON.stringify(ins)});}
      await loadData(); showToast("주유 기록 저장 완료 ✓");
    } catch{showToast("저장 실패");}
    setSyncing(false);setView("home");setEditRec(null);
  };
  const deleteRec = async (id, type) => {
    setSyncing(true);
    try { await sb(`${type==="driving"?"driving_records":"fuel_records"}?id=eq.${id}`,{method:"DELETE"}); await loadData(); showToast("삭제 완료"); }
    catch{showToast("삭제 실패");}
    setSyncing(false);setView("history");setDetailRec(null);
  };

  const goNewDriving = () => { setEditRec({_mode:"manual",drive_date:today(),start_odometer:lastOdo,end_odometer:"",origin:"",destination:"",purpose:"business",driver_department:"",driver_name:"",memo:"",gps_tracked:false,commute_distance:0,business_distance:0}); setView("new"); };
  const goNewFuel = () => { setEditRec({fuel_date:today(),odometer:lastOdo,fuel_type:"electric",amount:"",cost:"",memo:""}); setView("fuel"); };

  // Handle export
  const handleExport = () => {
    try {
      exportToExcel(vehicle, drivingRecs, fuelRecs, filterMonth);
      showToast("엑셀 파일이 다운로드됩니다 📥");
    } catch (e) {
      console.error(e);
      showToast("내보내기 실패");
    }
  };

  // Stats
  const monthRecs = allRecords.filter(r => monthOf(r._date) === filterMonth);
  const mDriving = monthRecs.filter(r => r._type==="driving");
  const mFuel = monthRecs.filter(r => r._type==="fuel");
  const totDist = mDriving.reduce((s,r)=>s+(r.distance||0),0);
  const totFuelCost = mFuel.reduce((s,r)=>s+Number(r.cost||0),0);
  const bizDist = mDriving.filter(r=>r.purpose==="business"||r.purpose==="commute").reduce((s,r)=>s+(r.distance||0),0);
  const persDist = totDist-bizDist;
  const allMonths = [...new Set(allRecords.map(r=>monthOf(r._date)))].sort().reverse();
  if (!allMonths.includes(filterMonth)) allMonths.unshift(filterMonth);

  if (!loaded) return (
    <div style={S.loadWrap}><div style={S.spinner}/><p style={{color:"#8896A6",marginTop:16}}>서버에서 데이터를 불러오는 중...</p>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
  );

  return (
    <div style={S.app}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes ripple{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.5);opacity:0}}
        input:focus,textarea:focus{border-color:rgba(59,130,246,0.5)!important;outline:none}
      `}</style>
      {toast && <div style={S.toast}>{toast}</div>}
      {syncing && <div style={S.syncBar}/>}

      {/* HOME */}
      {view === "home" && (
        <div style={S.page}>
          <header style={S.header}>
            <div style={S.headerTop}>
              <h1 style={S.logo}>🚗 운행일지</h1>
              <div style={{display:"flex",gap:8}}>
                <button style={S.iconBtn} onClick={loadData} title="새로고침">🔄</button>
                <button style={S.iconBtn} onClick={() => setView("stats")}>📊</button>
                <button style={S.iconBtn} onClick={() => setView("export")} title="내보내기">📥</button>
              </div>
            </div>
            <div style={S.odoCard}>
              <div style={S.dbBadge}>🔗 Supabase 연결됨</div>
              <div style={S.odoLabel}>현재 주행거리</div>
              <div><span style={S.odoNum}>{fmtNum(lastOdo)}</span><span style={S.odoUnit}> km</span></div>
              <div style={S.vehName}>{vehicle?.vehicle_type||"차량"} · {vehicle?.registration_number||""}</div>
              <div style={S.compName}>{vehicle?.company_name||""}</div>
            </div>
          </header>

          <button style={S.gpsBtn} onClick={startTracking}>
            <div style={S.gpsBtnInner}><div style={S.gpsPulse}/><span style={{fontSize:24,zIndex:1}}>📍</span></div>
            <div style={{flex:1}}><span style={S.gpsBtnLabel}>GPS 운행 시작</span><span style={S.gpsBtnSub}>실시간 주행거리 자동 측정</span></div>
            <span style={{fontSize:14,color:"rgba(255,255,255,.5)"}}>▶</span>
          </button>

          <div style={S.quickActs}>
            <button style={S.actBtn} onClick={goNewDriving}><span style={S.actIcon}>✏️</span><span style={S.actLabel}>수동 기록</span><span style={S.actSub}>직접 입력하기</span></button>
            <button style={S.actBtn} onClick={goNewFuel}><span style={S.actIcon}>⛽</span><span style={S.actLabel}>주유 기록</span><span style={S.actSub}>주유/충전 기록</span></button>
          </div>

          <div style={S.secHead}><h2 style={S.secTitle}>최근 기록</h2><button style={S.linkBtn} onClick={() => setView("history")}>전체보기 →</button></div>
          <div style={S.recList}>
            {allRecords.length === 0 ? <div style={S.empty}><div style={{fontSize:40,marginBottom:12}}>📋</div><p style={{color:"#8896A6"}}>아직 기록이 없습니다</p></div>
            : allRecords.slice(0, 5).map(r => <RecordCard key={r.id} r={r} onClick={() => {setDetailRec(r);setDetailType(r._type);setView("detail");}} />)}
          </div>
        </div>
      )}

      {/* EXPORT */}
      {view === "export" && (
        <div style={S.page}>
          <header style={S.fHead}><button style={S.backBtn} onClick={() => setView("home")}>← 뒤로</button><h2 style={S.fTitle}>📥 엑셀 내보내기</h2></header>

          <div style={S.exportCard}>
            <div style={S.exportIcon}>📄</div>
            <h3 style={S.exportTitle}>업무용승용차 운행기록부</h3>
            <p style={S.exportDesc}>국세청 공식 양식에 맞춰 엑셀 파일로 내보냅니다</p>

            <div style={S.exportInfo}>
              <div style={S.exportInfoRow}><span style={S.exportInfoLabel}>법인명</span><span style={S.exportInfoVal}>{vehicle?.company_name || "-"}</span></div>
              <div style={S.exportInfoRow}><span style={S.exportInfoLabel}>차량</span><span style={S.exportInfoVal}>{vehicle?.vehicle_type || "-"} ({vehicle?.registration_number || ""})</span></div>
              <div style={S.exportInfoRow}><span style={S.exportInfoLabel}>사업자번호</span><span style={S.exportInfoVal}>{vehicle?.business_number || "-"}</span></div>
            </div>
          </div>

          <div style={S.fCard}>
            <FG label="내보낼 월 선택">
              <MonthSel months={allMonths} cur={filterMonth} set={setFilterMonth} />
            </FG>

            <div style={S.exportPreview}>
              <div style={S.exportPreviewRow}>
                <span style={S.exportPreviewIcon}>🛣️</span>
                <span style={S.exportPreviewLabel}>운행 기록</span>
                <span style={S.exportPreviewVal}>{drivingRecs.filter(r=>monthOf(r.drive_date)===filterMonth).length}건</span>
              </div>
              <div style={S.exportPreviewRow}>
                <span style={S.exportPreviewIcon}>⛽</span>
                <span style={S.exportPreviewLabel}>주유 기록</span>
                <span style={S.exportPreviewVal}>{fuelRecs.filter(r=>monthOf(r.fuel_date)===filterMonth).length}건</span>
              </div>
              <div style={S.exportPreviewRow}>
                <span style={S.exportPreviewIcon}>📏</span>
                <span style={S.exportPreviewLabel}>총 주행거리</span>
                <span style={S.exportPreviewVal}>{fmtNum(totDist)} km</span>
              </div>
            </div>
          </div>

          <button style={S.exportBtn} onClick={handleExport}>
            <span style={{fontSize:20}}>📥</span> 엑셀 파일 다운로드
          </button>

          <p style={S.exportNote}>* 운행기록부 시트와 주유기록 시트가 포함됩니다<br/>* 국세청 업무용승용차 운행기록부 별지 서식 기준</p>
        </div>
      )}

      {/* GPS TRACKING */}
      {view === "tracking" && (
        <div style={S.page}>
          <div style={S.trackPage}>
            <div style={S.trackStatus}>
              <div style={{position:"relative",width:16,height:16}}><div style={{width:16,height:16,borderRadius:"50%",background:"#10B981",animation:"pulse 1.5s ease-in-out infinite"}}/><div style={{position:"absolute",top:0,left:0,width:16,height:16,borderRadius:"50%",background:"#10B981",animation:"ripple 2s ease-out infinite"}}/></div>
              <span style={{fontSize:15,fontWeight:700,color:"#10B981"}}>운행 추적 중</span>
            </div>
            <div style={{marginBottom:32}}>
              <div style={{fontSize:13,color:"#64748B",fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>주행 거리</div>
              <span style={{fontSize:64,fontWeight:900,color:"#F8FAFC",letterSpacing:-2,fontVariantNumeric:"tabular-nums"}}>{fmtKm(gpsDistance)}</span>
              <span style={{fontSize:22,color:"#64748B"}}> km</span>
            </div>
            <div style={S.tGrid}>
              <div style={S.tCard}><div style={{fontSize:20,marginBottom:4}}>⏱️</div><div style={S.tVal}>{fmtDur(gpsDuration)}</div><div style={S.tLbl}>주행 시간</div></div>
              <div style={S.tCard}><div style={{fontSize:20,marginBottom:4}}>🚀</div><div style={S.tVal}>{Math.round(gpsSpeed)}<span style={{fontSize:13,color:"#64748B"}}> km/h</span></div><div style={S.tLbl}>현재 속도</div></div>
              <div style={S.tCard}><div style={{fontSize:20,marginBottom:4}}>📍</div><div style={S.tVal}>{gpsPoints.length}</div><div style={S.tLbl}>GPS 포인트</div></div>
              <div style={S.tCard}><div style={{fontSize:20,marginBottom:4}}>🏁</div><div style={S.tVal}>{gpsDuration>0?fmtKm((gpsDistance/gpsDuration)*3600):"0.0"}<span style={{fontSize:13,color:"#64748B"}}> km/h</span></div><div style={S.tLbl}>평균 속도</div></div>
            </div>
            {gpsError && <div style={S.gpsErr}>⚠️ {gpsError}</div>}
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><button style={S.stopBtn} onClick={stopTracking}><span style={{fontSize:20}}>⏹</span> 운행 종료</button></div>
            <p style={{fontSize:12,color:"#475569"}}>💡 화면을 켜둔 상태에서 가장 정확합니다</p>
          </div>
        </div>
      )}

      {/* GPS SAVE */}
      {view === "gps-save" && editRec && (
        <div style={S.page}>
          <header style={S.fHead}><button style={S.backBtn} onClick={()=>{setView("home");setEditRec(null);}}>← 취소</button><h2 style={S.fTitle}>📍 GPS 운행 기록 저장</h2></header>
          <div style={S.gpsSumCard}><div style={{display:"flex",gap:16}}>
            <div style={{flex:1,textAlign:"center"}}><span style={{display:"block",fontSize:11,color:"#10B981",fontWeight:600,marginBottom:4}}>GPS 측정거리</span><span style={{display:"block",fontSize:20,fontWeight:800,color:"#F8FAFC"}}>{fmtKm(editRec.gps_distance)} km</span></div>
            <div style={{flex:1,textAlign:"center"}}><span style={{display:"block",fontSize:11,color:"#10B981",fontWeight:600,marginBottom:4}}>주행 시간</span><span style={{display:"block",fontSize:20,fontWeight:800,color:"#F8FAFC"}}>{fmtDur(editRec.gps_duration)}</span></div>
          </div></div>
          <DrivingForm rec={editRec} setRec={setEditRec} />
          <button style={S.saveBtn} disabled={syncing} onClick={()=>saveDriving(editRec,false)}>{syncing?"저장 중...":"저장하기"}</button>
        </div>
      )}

      {/* MANUAL */}
      {view === "new" && editRec && (
        <div style={S.page}>
          <header style={S.fHead}><button style={S.backBtn} onClick={()=>{setView("home");setEditRec(null);}}>← 뒤로</button><h2 style={S.fTitle}>✏️ {editRec.id?"수정":"수동 운행 기록"}</h2></header>
          <DrivingForm rec={editRec} setRec={setEditRec} />
          <button style={S.saveBtn} disabled={syncing} onClick={()=>saveDriving(editRec,!!editRec.id)}>{syncing?"저장 중...":"저장하기"}</button>
        </div>
      )}

      {/* FUEL */}
      {view === "fuel" && editRec && (
        <div style={S.page}>
          <header style={S.fHead}><button style={S.backBtn} onClick={()=>{setView("home");setEditRec(null);}}>← 뒤로</button><h2 style={S.fTitle}>⛽ {editRec.id?"수정":"주유/충전 기록"}</h2></header>
          <FuelForm rec={editRec} setRec={setEditRec} />
          <button style={S.saveBtn} disabled={syncing} onClick={()=>saveFuel(editRec,!!editRec.id)}>{syncing?"저장 중...":"저장하기"}</button>
        </div>
      )}

      {/* HISTORY */}
      {view === "history" && (
        <div style={S.page}>
          <header style={S.fHead}><button style={S.backBtn} onClick={()=>setView("home")}>← 뒤로</button><h2 style={S.fTitle}>📋 전체 기록</h2></header>
          <MonthSel months={allMonths} cur={filterMonth} set={setFilterMonth} />
          <div style={S.recList}>
            {monthRecs.length===0?<div style={S.empty}><p style={{color:"#8896A6"}}>이 달에는 기록이 없습니다</p></div>
            :monthRecs.map(r=><RecordCard key={r.id} r={r} onClick={()=>{setDetailRec(r);setDetailType(r._type);setView("detail");}} />)}
          </div>
        </div>
      )}

      {/* DETAIL */}
      {view === "detail" && detailRec && (
        <div style={S.page}>
          <header style={S.fHead}><button style={S.backBtn} onClick={()=>{setView("history");setDetailRec(null);}}>← 뒤로</button><h2 style={S.fTitle}>{detailType==="driving"?"🛣️ 운행 상세":"⛽ 주유 상세"}</h2></header>
          <div style={S.dtCard}>
            <div style={S.dtDate}>{formatDate(detailRec._date)}</div>
            {detailRec.gps_tracked && <div style={S.gpsTag}>📍 GPS 추적</div>}
            {detailType==="driving" ? (
              <>
                <div style={S.dtSec}>
                  <DRow l="출발 거리" v={`${fmtNum(detailRec.start_odometer)} km`}/>
                  <DRow l="도착 거리" v={`${fmtNum(detailRec.end_odometer)} km`}/>
                  <DRow l="주행 거리" v={`${fmtNum(detailRec.distance)} km`} bold hl/>
                  {detailRec.gps_distance>0&&<DRow l="GPS 측정" v={`${fmtKm(detailRec.gps_distance)} km`}/>}
                  {detailRec.gps_duration>0&&<DRow l="주행 시간" v={fmtDur(detailRec.gps_duration)}/>}
                </div>
                <div style={S.dtSec}>
                  <DRow l="경로" v={`${detailRec.origin||"-"} → ${detailRec.destination||"-"}`}/>
                  <DRow l="목적" v={`${PURPOSE_OPTIONS.find(p=>p.id===detailRec.purpose)?.icon||""} ${PURPOSE_OPTIONS.find(p=>p.id===detailRec.purpose)?.label||""}`}/>
                  {detailRec.driver_name&&<DRow l="사용자" v={`${detailRec.driver_department||""} ${detailRec.driver_name}`}/>}
                </div>
              </>
            ) : (
              <div style={S.dtSec}>
                <DRow l="주행거리" v={`${fmtNum(detailRec.odometer)} km`}/>
                <DRow l="연료" v={FUEL_TYPE_OPTIONS.find(f=>f.id===detailRec.fuel_type)?.label||""}/>
                <DRow l="주유량" v={`${fmtNum(detailRec.amount)} L`}/>
                <DRow l="금액" v={`${fmtNum(detailRec.cost)} 원`} bold/>
              </div>
            )}
            {detailRec.memo && <div style={S.dtMemo}>💬 {detailRec.memo}</div>}
          </div>
          <div style={S.dtActs}>
            <button style={S.editBtn} onClick={()=>{if(detailType==="driving"){setEditRec({...detailRec,_mode:"manual"});setView("new");}else{setEditRec({...detailRec});setView("fuel");}}}>✏️ 수정</button>
            <button style={S.delBtn} onClick={()=>{if(confirm("정말 삭제하시겠습니까?"))deleteRec(detailRec.id,detailType);}}>🗑️ 삭제</button>
          </div>
        </div>
      )}

      {/* STATS */}
      {view === "stats" && (
        <div style={S.page}>
          <header style={S.fHead}><button style={S.backBtn} onClick={()=>setView("home")}>← 뒤로</button><h2 style={S.fTitle}>📊 월간 통계</h2></header>
          <MonthSel months={allMonths} cur={filterMonth} set={setFilterMonth} />
          <div style={S.statsGrid}>
            <StatBox icon="📏" val={fmtNum(totDist)} unit=" km" label="총 주행거리"/>
            <StatBox icon="🔢" val={mDriving.length} unit=" 회" label="운행 횟수"/>
            <StatBox icon="⛽" val={fmtNum(totFuelCost)} unit=" 원" label="주유 비용"/>
            <StatBox icon="⚡" val={mFuel.length} unit=" 회" label="주유 횟수"/>
          </div>
          {totDist>0&&(
            <div style={S.fCard}>
              <h3 style={{fontSize:14,fontWeight:700,color:"#CBD5E1",margin:"0 0 12px 0"}}>업무 / 개인 비율</h3>
              <div style={S.barW}>
                <div style={{...S.barB,width:`${(bizDist/totDist)*100}%`}}>{bizDist>0&&<span style={S.barLbl}>업무 {Math.round((bizDist/totDist)*100)}%</span>}</div>
                <div style={{...S.barP,width:`${(persDist/totDist)*100}%`}}>{persDist>0&&<span style={S.barLbl}>개인 {Math.round((persDist/totDist)*100)}%</span>}</div>
              </div>
              <div style={S.barLeg}><span>💼 업무 {fmtNum(bizDist)} km</span><span>🏠 개인 {fmtNum(persDist)} km</span></div>
            </div>
          )}
          <button style={{...S.exportBtn,marginTop:16}} onClick={()=>setView("export")}>
            <span style={{fontSize:18}}>📥</span> 엑셀로 내보내기
          </button>
        </div>
      )}
    </div>
  );
}

// ========= Sub Components =========
function DrivingForm({rec,setRec}){return(
  <div style={S.fCard}>
    <FG label="날짜"><input style={S.inp} type="date" value={rec.drive_date} onChange={e=>setRec({...rec,drive_date:e.target.value})}/></FG>
    <div style={S.fRow}><FG label="사용자 부서"><input style={S.inp} value={rec.driver_department||""} placeholder="예: 대표이사" onChange={e=>setRec({...rec,driver_department:e.target.value})}/></FG><div style={{width:12}}/><FG label="사용자 성명"><input style={S.inp} value={rec.driver_name||""} placeholder="예: 이동욱" onChange={e=>setRec({...rec,driver_name:e.target.value})}/></FG></div>
    <div style={S.fRow}><FG label="출발 거리 (km)"><input style={S.inp} type="number" value={rec.start_odometer} onChange={e=>setRec({...rec,start_odometer:Number(e.target.value)})}/></FG><div style={S.fArrow}>→</div><FG label="도착 거리 (km)"><input style={{...S.inp,borderColor:"rgba(59,130,246,.4)"}} type="number" value={rec.end_odometer} placeholder="도착 시" onChange={e=>setRec({...rec,end_odometer:e.target.value?Number(e.target.value):""})}/></FG></div>
    {rec.end_odometer&&Number(rec.end_odometer)>Number(rec.start_odometer)&&<div style={S.distBadge}>주행거리: {fmtNum(Number(rec.end_odometer)-Number(rec.start_odometer))} km</div>}
    <div style={S.fRow}><FG label="출발지"><input style={S.inp} value={rec.origin} placeholder="예: 회사" onChange={e=>setRec({...rec,origin:e.target.value})}/></FG><div style={S.fArrow}>→</div><FG label="목적지"><input style={S.inp} value={rec.destination} placeholder="예: 거래처" onChange={e=>setRec({...rec,destination:e.target.value})}/></FG></div>
    <FG label="운행 목적"><div style={S.purGrid}>{PURPOSE_OPTIONS.map(p=><button key={p.id} style={rec.purpose===p.id?S.purOn:S.purOff} onClick={()=>setRec({...rec,purpose:p.id})}><span>{p.icon}</span> {p.label}</button>)}</div></FG>
    <FG label="메모"><textarea style={S.ta} value={rec.memo} placeholder="추가 메모 (선택)" rows={2} onChange={e=>setRec({...rec,memo:e.target.value})}/></FG>
  </div>
);}
function FuelForm({rec,setRec}){return(
  <div style={S.fCard}>
    <FG label="날짜"><input style={S.inp} type="date" value={rec.fuel_date} onChange={e=>setRec({...rec,fuel_date:e.target.value})}/></FG>
    <FG label="주행거리 (km)"><input style={S.inp} type="number" value={rec.odometer} onChange={e=>setRec({...rec,odometer:Number(e.target.value)})}/></FG>
    <FG label="연료 종류"><div style={S.fuelGrid}>{FUEL_TYPE_OPTIONS.map(f=><button key={f.id} style={rec.fuel_type===f.id?S.purOn:S.purOff} onClick={()=>setRec({...rec,fuel_type:f.id})}>{f.label}</button>)}</div></FG>
    <div style={S.fRow}><FG label="주유량 (L/kWh)"><input style={S.inp} type="number" value={rec.amount} placeholder="0" onChange={e=>setRec({...rec,amount:e.target.value})}/></FG><div style={{width:12}}/><FG label="금액 (원)"><input style={S.inp} type="number" value={rec.cost} placeholder="0" onChange={e=>setRec({...rec,cost:e.target.value})}/></FG></div>
    {rec.amount&&rec.cost&&Number(rec.amount)>0&&<div style={S.distBadge}>단가: {fmtNum(Math.round(Number(rec.cost)/Number(rec.amount)))} 원/L</div>}
    <FG label="메모"><textarea style={S.ta} value={rec.memo} placeholder="주유소명 등 (선택)" rows={2} onChange={e=>setRec({...rec,memo:e.target.value})}/></FG>
  </div>
);}
function FG({label,children}){return <div style={S.fg}><label style={S.label}>{label}</label>{children}</div>;}
function RecordCard({r,onClick}){return(
  <div style={S.recCard} onClick={onClick}>
    <div style={S.recL}><div style={{fontSize:22,flexShrink:0}}>{r._type==="driving"?(r.gps_tracked?"📍":"🛣️"):"⛽"}</div>
      <div><div style={S.recDate}>{formatDate(r._date)}</div>
        {r._type==="driving"?<div style={S.recRoute}>{r.origin||"출발지"} → {r.destination||"목적지"} <span style={{fontSize:12,color:"#64748B",marginLeft:8}}>{PURPOSE_OPTIONS.find(p=>p.id===r.purpose)?.icon} {PURPOSE_OPTIONS.find(p=>p.id===r.purpose)?.label}</span></div>
        :<div style={S.recRoute}>{FUEL_TYPE_OPTIONS.find(f=>f.id===r.fuel_type)?.label} {fmtNum(r.amount)}L</div>}
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
      {r._type==="driving"?<div style={{fontSize:15,fontWeight:700,color:"#3B82F6"}}>{fmtNum(r.distance)} km</div>:<div style={{fontSize:15,fontWeight:700,color:"#F59E0B"}}>{fmtNum(r.cost)} 원</div>}
      <div style={{fontSize:18,color:"#475569"}}>›</div>
    </div>
  </div>
);}
function DRow({l,v,bold,hl}){return <div style={{...S.dRow,...(hl?S.dHL:{})}}><span style={S.dLabel}>{l}</span><span style={bold?S.dValB:S.dVal}>{v}</span></div>;}
function MonthSel({months,cur,set}){return <div style={S.mSel}>{months.map(m=><button key={m} style={cur===m?S.mOn:S.mOff} onClick={()=>set(m)}>{m.replace("-",".")}</button>)}</div>;}
function StatBox({icon,val,unit,label}){return <div style={S.statCard}><div style={{fontSize:28,marginBottom:6}}>{icon}</div><div style={{fontSize:22,fontWeight:800,color:"#F8FAFC"}}>{val}<span style={{fontSize:13,fontWeight:500,color:"#64748B"}}>{unit}</span></div><div style={{fontSize:12,color:"#94A3B8",marginTop:4}}>{label}</div></div>;}

const S = {
  app:{fontFamily:"'Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Noto Sans KR',sans-serif",maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"linear-gradient(180deg,#0B1120 0%,#131C2E 50%,#0F172A 100%)",color:"#E2E8F0",position:"relative",paddingBottom:40},
  loadWrap:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0B1120"},
  spinner:{width:36,height:36,border:"3px solid #1E293B",borderTop:"3px solid #3B82F6",borderRadius:"50%",animation:"spin .8s linear infinite"},
  toast:{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#3B82F6",color:"#fff",padding:"10px 24px",borderRadius:12,fontSize:14,fontWeight:600,zIndex:9999,boxShadow:"0 4px 20px rgba(59,130,246,.4)"},
  syncBar:{position:"fixed",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#3B82F6,#10B981,#3B82F6)",backgroundSize:"200% 100%",animation:"spin 1s linear infinite",zIndex:9998},
  page:{padding:"0 16px"},
  header:{paddingTop:20},headerTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16},
  logo:{fontSize:22,fontWeight:800,color:"#F8FAFC",margin:0,letterSpacing:-.5},
  iconBtn:{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"8px 12px",fontSize:18,cursor:"pointer"},
  odoCard:{background:"linear-gradient(135deg,#1E3A5F,#1E293B)",borderRadius:20,padding:24,textAlign:"center",border:"1px solid rgba(59,130,246,.2)",marginBottom:16,boxShadow:"0 8px 32px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05)"},
  dbBadge:{display:"inline-block",fontSize:10,color:"#10B981",background:"rgba(16,185,129,.1)",padding:"3px 10px",borderRadius:20,fontWeight:600,marginBottom:8,border:"1px solid rgba(16,185,129,.2)"},
  odoLabel:{fontSize:11,color:"#64748B",fontWeight:600,textTransform:"uppercase",letterSpacing:1.5},
  odoNum:{fontSize:40,fontWeight:800,color:"#F8FAFC",letterSpacing:-1,fontVariantNumeric:"tabular-nums"},
  odoUnit:{fontSize:15,color:"#64748B",fontWeight:500},
  vehName:{fontSize:13,color:"#94A3B8",marginTop:6,fontWeight:500},compName:{fontSize:11,color:"#64748B",marginTop:2},
  gpsBtn:{width:"100%",display:"flex",alignItems:"center",gap:14,background:"linear-gradient(135deg,#059669,#047857)",border:"none",borderRadius:16,padding:"16px 18px",cursor:"pointer",marginBottom:12,boxShadow:"0 4px 20px rgba(5,150,105,.35)",color:"#fff",textAlign:"left"},
  gpsBtnInner:{position:"relative",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"},
  gpsPulse:{position:"absolute",width:44,height:44,borderRadius:"50%",border:"2px solid rgba(255,255,255,.3)",animation:"ripple 2s ease-out infinite"},
  gpsBtnLabel:{fontSize:16,fontWeight:700,display:"block"},gpsBtnSub:{fontSize:12,color:"rgba(255,255,255,.6)",display:"block",marginTop:2},
  quickActs:{display:"flex",gap:10,marginBottom:24},
  actBtn:{flex:1,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:"16px 14px",cursor:"pointer",textAlign:"left",color:"#E2E8F0"},
  actIcon:{fontSize:22,display:"block",marginBottom:6},actLabel:{fontSize:14,fontWeight:700,display:"block"},actSub:{fontSize:11,color:"rgba(255,255,255,.4)",display:"block",marginTop:2},
  secHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},
  secTitle:{fontSize:16,fontWeight:700,color:"#CBD5E1",margin:0},linkBtn:{background:"none",border:"none",color:"#3B82F6",fontSize:13,fontWeight:600,cursor:"pointer"},
  recList:{display:"flex",flexDirection:"column",gap:8},
  recCard:{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,.04)",borderRadius:14,padding:"14px 16px",border:"1px solid rgba(255,255,255,.06)",cursor:"pointer"},
  recL:{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0},recDate:{fontSize:13,color:"#94A3B8",fontWeight:500},
  recRoute:{fontSize:14,fontWeight:600,color:"#E2E8F0",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  empty:{textAlign:"center",padding:"36px 0"},
  trackPage:{paddingTop:40,textAlign:"center"},trackStatus:{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:32},
  tGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:28},
  tCard:{background:"rgba(255,255,255,.04)",borderRadius:14,padding:"14px 10px",border:"1px solid rgba(255,255,255,.06)"},
  tVal:{fontSize:18,fontWeight:800,color:"#F8FAFC"},tLbl:{fontSize:11,color:"#94A3B8",marginTop:2},
  gpsErr:{background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",borderRadius:12,padding:"12px 16px",color:"#F87171",fontSize:13,fontWeight:600,marginBottom:16},
  stopBtn:{display:"flex",alignItems:"center",gap:10,background:"linear-gradient(135deg,#EF4444,#DC2626)",border:"none",borderRadius:16,padding:"16px 40px",color:"#fff",fontSize:17,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(239,68,68,.35)"},
  gpsSumCard:{background:"linear-gradient(135deg,rgba(16,185,129,.15),rgba(5,150,105,.1))",border:"1px solid rgba(16,185,129,.25)",borderRadius:16,padding:18,marginBottom:16},
  fHead:{paddingTop:20,marginBottom:16},backBtn:{background:"none",border:"none",color:"#3B82F6",fontSize:14,fontWeight:600,cursor:"pointer",padding:0,marginBottom:8,display:"block"},
  fTitle:{fontSize:20,fontWeight:800,color:"#F8FAFC",margin:0},
  fCard:{background:"rgba(255,255,255,.04)",borderRadius:18,padding:20,border:"1px solid rgba(255,255,255,.06)",marginBottom:16},
  fg:{marginBottom:16,flex:1},fRow:{display:"flex",alignItems:"flex-end",gap:0},fArrow:{color:"#475569",fontSize:18,padding:"0 6px",paddingBottom:12},
  label:{display:"block",fontSize:11,fontWeight:600,color:"#94A3B8",marginBottom:6,textTransform:"uppercase",letterSpacing:.5},
  inp:{width:"100%",padding:"12px 14px",background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#F8FAFC",fontSize:15,outline:"none",boxSizing:"border-box"},
  ta:{width:"100%",padding:"12px 14px",background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#F8FAFC",fontSize:15,outline:"none",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"},
  distBadge:{background:"rgba(59,130,246,.15)",color:"#60A5FA",padding:"8px 14px",borderRadius:10,fontSize:14,fontWeight:700,textAlign:"center",marginBottom:16,border:"1px solid rgba(59,130,246,.2)"},
  purGrid:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8},fuelGrid:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8},
  purOff:{background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:"10px 8px",color:"#94A3B8",fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"center"},
  purOn:{background:"rgba(59,130,246,.2)",border:"1px solid rgba(59,130,246,.5)",borderRadius:10,padding:"10px 8px",color:"#60A5FA",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"center"},
  saveBtn:{width:"100%",padding:"16px",background:"linear-gradient(135deg,#3B82F6,#2563EB)",border:"none",borderRadius:14,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(59,130,246,.3)"},
  dtCard:{background:"rgba(255,255,255,.04)",borderRadius:18,padding:20,border:"1px solid rgba(255,255,255,.06)"},
  dtDate:{fontSize:16,fontWeight:700,color:"#CBD5E1",marginBottom:8,textAlign:"center"},
  gpsTag:{textAlign:"center",fontSize:12,color:"#10B981",fontWeight:600,marginBottom:12,background:"rgba(16,185,129,.1)",padding:"4px 12px",borderRadius:8,display:"block",width:"fit-content",margin:"0 auto 12px auto"},
  dtSec:{marginBottom:16,paddingBottom:16,borderBottom:"1px solid rgba(255,255,255,.06)"},
  dRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0"},
  dHL:{background:"rgba(59,130,246,.1)",marginLeft:-12,marginRight:-12,paddingLeft:12,paddingRight:12,borderRadius:8},
  dLabel:{fontSize:14,color:"#94A3B8"},dVal:{fontSize:14,color:"#E2E8F0",fontWeight:500},dValB:{fontSize:16,color:"#3B82F6",fontWeight:700},
  dtMemo:{background:"rgba(255,255,255,.03)",padding:"12px 14px",borderRadius:10,fontSize:13,color:"#94A3B8",marginTop:8},
  dtActs:{display:"flex",gap:10,marginTop:16},
  editBtn:{flex:1,padding:"12px",background:"rgba(59,130,246,.15)",border:"1px solid rgba(59,130,246,.3)",borderRadius:12,color:"#60A5FA",fontSize:14,fontWeight:600,cursor:"pointer"},
  delBtn:{flex:1,padding:"12px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",borderRadius:12,color:"#F87171",fontSize:14,fontWeight:600,cursor:"pointer"},
  mSel:{display:"flex",gap:6,overflowX:"auto",marginBottom:16,paddingBottom:4},
  mOff:{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.06)",borderRadius:10,padding:"8px 14px",color:"#94A3B8",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},
  mOn:{background:"rgba(59,130,246,.2)",border:"1px solid rgba(59,130,246,.5)",borderRadius:10,padding:"8px 14px",color:"#60A5FA",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},
  statsGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16},
  statCard:{background:"rgba(255,255,255,.04)",borderRadius:16,padding:"18px 16px",border:"1px solid rgba(255,255,255,.06)",textAlign:"center"},
  barW:{display:"flex",height:32,borderRadius:8,overflow:"hidden"},
  barB:{background:"#3B82F6",display:"flex",alignItems:"center",justifyContent:"center",transition:"width .5s"},
  barP:{background:"#F59E0B",display:"flex",alignItems:"center",justifyContent:"center",transition:"width .5s"},
  barLbl:{fontSize:11,fontWeight:700,color:"#fff"},barLeg:{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12,color:"#94A3B8"},
  // Export styles
  exportCard:{background:"linear-gradient(135deg,rgba(99,102,241,.12),rgba(59,130,246,.08))",borderRadius:20,padding:28,textAlign:"center",border:"1px solid rgba(99,102,241,.2)",marginBottom:16},
  exportIcon:{fontSize:48,marginBottom:12},
  exportTitle:{fontSize:18,fontWeight:800,color:"#F8FAFC",margin:"0 0 8px 0"},
  exportDesc:{fontSize:13,color:"#94A3B8",margin:0},
  exportInfo:{marginTop:16,textAlign:"left"},
  exportInfoRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)"},
  exportInfoLabel:{fontSize:12,color:"#64748B",fontWeight:600},exportInfoVal:{fontSize:13,color:"#E2E8F0",fontWeight:500},
  exportPreview:{marginTop:8,background:"rgba(0,0,0,.2)",borderRadius:12,padding:14},
  exportPreviewRow:{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.04)"},
  exportPreviewIcon:{fontSize:18},exportPreviewLabel:{flex:1,fontSize:13,color:"#94A3B8"},exportPreviewVal:{fontSize:14,fontWeight:700,color:"#F8FAFC"},
  exportBtn:{width:"100%",padding:"16px",background:"linear-gradient(135deg,#6366F1,#4F46E5)",border:"none",borderRadius:14,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(99,102,241,.3)",display:"flex",alignItems:"center",justifyContent:"center",gap:10},
  exportNote:{fontSize:11,color:"#64748B",textAlign:"center",marginTop:12,lineHeight:1.6},
};
