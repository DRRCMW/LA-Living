import { useState, useEffect, useCallback, useRef } from "react";

// ─── SAFE RESPONSIVE HOOK ────────────────────────────────────────────────────
function useBreakpoint() {
  const getW = () => (typeof window !== "undefined" ? window.innerWidth : 1024);
  const [w, setW] = useState(getW);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024, w };
}

// ─── SAFE STORAGE (artifact storage → in-memory fallback) ───────────────────
const mem = {};
const store = {
  async get(k) { try { return await window.storage?.get(k) ?? (mem[k] ? { value: mem[k] } : null); } catch { return mem[k] ? { value: mem[k] } : null; } },
  async set(k, v) { mem[k] = v; try { await window.storage?.set(k, v); } catch {} },
};

// ─── DATA ────────────────────────────────────────────────────────────────────
const HOODS = [
  "Arts District","Downtown LA","Silver Lake","Echo Park","Koreatown",
  "Culver City","Long Beach","Pasadena","Glendale","Burbank","Mid-City",
  "Highland Park","Atwater Village","Frogtown","El Segundo","Inglewood",
  "Hawthorne","Torrance","Alhambra","Los Feliz",
];

const IMGS = {
  loft: [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80",
  ],
  apartment: [
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
    "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=800&q=80",
    "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  ],
  home: [
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  ],
};

const GALLERY = [
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&q=80",
  "https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=800&q=80",
  "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80",
];

const STATUSES = [
  { key:"new",       label:"New Lead",       color:"#4a9eff", bg:"#0a1a2e" },
  { key:"watching",  label:"Watching",       color:"#f0c040", bg:"#1e1800" },
  { key:"contacted", label:"Contacted",      color:"#c060ff", bg:"#180e24" },
  { key:"scheduled", label:"Sched. Viewing", color:"#40d080", bg:"#081a10" },
  { key:"toured",    label:"Toured",         color:"#ff8040", bg:"#1e0c00" },
  { key:"passed",    label:"Passed",         color:"#888",    bg:"#141414" },
  { key:"hot",       label:"🔥 Top Pick",    color:"#ff4466", bg:"#1e0010" },
];

const SEED = [
  { id:"s1",  type:"loft",      title:"Raw Concrete Loft — The Bloc",     neighborhood:"Arts District",   beds:1, price:2450, sqft:980,  floor:4,  walk:92, amenities:["Rooftop","Gym","Dog OK","Concierge"],        highlight:"14-ft ceilings, exposed brick & ductwork",  avail:"Now",    phone:"(213) 555-0191", img:0 },
  { id:"s2",  type:"apartment", title:"Modern High-Rise — Grand Ave",      neighborhood:"Downtown LA",     beds:2, price:3400, sqft:1350, floor:18, walk:97, amenities:["Doorman","Pool","EV charge","City views"],    highlight:"Floor-to-ceiling glass, skyline panorama",  avail:"Nov 15", phone:"(213) 555-0342", img:1 },
  { id:"s3",  type:"loft",      title:"Silver Lake Artist Live/Work",      neighborhood:"Silver Lake",     beds:1, price:2100, sqft:750,  floor:2,  walk:88, amenities:["Patio","In-unit W/D","Skylights"],           highlight:"Steps from the reservoir path",             avail:"Now",    phone:"(323) 555-0185", img:2 },
  { id:"s4",  type:"home",      title:"Craftsman Bungalow w/ Yard",        neighborhood:"Highland Park",   beds:2, price:2900, sqft:1100, floor:1,  walk:78, amenities:["Yard","Parking","Laundry","Garage"],         highlight:"Original 1928 details, updated kitchen",    avail:"Dec 1",  phone:"(323) 555-0264", img:3 },
  { id:"s5",  type:"apartment", title:"Echo Park Creative Flat",           neighborhood:"Echo Park",       beds:1, price:1950, sqft:820,  floor:3,  walk:85, amenities:["Balcony","Bike storage","Storage"],          highlight:"Lake views, murals district",               avail:"Now",    phone:"(323) 555-0417", img:4 },
  { id:"s6",  type:"loft",      title:"Koreatown Tower Loft",              neighborhood:"Koreatown",       beds:2, price:2800, sqft:1180, floor:12, walk:95, amenities:["Gym","Rooftop","Metro","Doorman"],            highlight:"Panoramic city views, 24/7 building",       avail:"Now",    phone:"(213) 555-0533", img:0 },
  { id:"s7",  type:"home",      title:"Mid-Century Modern — Culver City",  neighborhood:"Culver City",     beds:2, price:3200, sqft:1400, floor:1,  walk:82, amenities:["Pool","2-car garage","Smart home","Yard"],   highlight:"Designer reno, Expo Line nearby",           avail:"Now",    phone:"(310) 555-0628", img:1 },
  { id:"s8",  type:"apartment", title:"Beachside 2BD — Long Beach",        neighborhood:"Long Beach",      beds:2, price:2500, sqft:1300, floor:5,  walk:79, amenities:["Ocean view","Pool","Gym","Parking"],         highlight:"Partial water views, open plan",            avail:"Now",    phone:"(562) 555-0771", img:2 },
  { id:"s9",  type:"loft",      title:"Frogtown Warehouse Loft",           neighborhood:"Frogtown",        beds:1, price:1850, sqft:900,  floor:1,  walk:72, amenities:["Private entry","Yard","Parking","14ft ceil"],"highlight":"True warehouse conversion on river trail",avail:"Now",    phone:"(323) 555-0844", img:3 },
  { id:"s10", type:"home",      title:"Atwater Village Gem",               neighborhood:"Atwater Village", beds:2, price:2750, sqft:1050, floor:1,  walk:80, amenities:["Backyard","Driveway","Laundry","Quiet"],     highlight:"Tree-lined block, steps to shops",          avail:"Jan 1",  phone:"(323) 555-0912", img:4 },
  { id:"s11", type:"apartment", title:"Old Town Pasadena Flat",            neighborhood:"Pasadena",        beds:1, price:1800, sqft:700,  floor:2,  walk:81, amenities:["Near shops","Parking","Laundry","Balcony"],  highlight:"1920s building, preserved character",       avail:"Now",    phone:"(626) 555-0103", img:0 },
  { id:"s12", type:"loft",      title:"Arts District Penthouse",           neighborhood:"Arts District",   beds:2, price:3850, sqft:1650, floor:10, walk:92, amenities:["Private roof","Chef kitchen","2 parking","Doorman"],"highlight":"Top-floor loft w/ rooftop terrace",      avail:"Dec 15", phone:"(213) 555-0247", img:2 },
];

const TC = { loft:"#c9a84c", apartment:"#4a9eff", home:"#40d080" };
const TI = { loft:"⬛", apartment:"🏢", home:"🏡" };
const getImg  = (type, i) => (IMGS[type] || IMGS.apartment)[i % 5];
const getImgs = (type, i) => [getImg(type, i), ...GALLERY.slice(0, 4)];

async function pullListings(existingIds, batch) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:1400,
        messages:[{ role:"user", content:`Generate 6 LA/SoCal rental listings — mix lofts, apartments, homes. 1BR $1700-$3000, 2BR $2200-$4000. Neighborhoods: ${HOODS.join(", ")}. Return ONLY a raw JSON array, no markdown. Each object: id (string "b${batch}_N"), type ("loft"|"apartment"|"home"), title, neighborhood, beds (1|2), price (int), sqft (int), floor (int), walk (int 60-98), amenities (array 3-4), highlight (string), avail ("Now" or date), phone (fake LA number), img (int 0-4).` }]
      })
    });
    const data = await res.json();
    const txt = data.content?.find(b => b.type==="text")?.text || "[]";
    const arr = JSON.parse(txt.replace(/```json|```/g,"").trim());
    return Array.isArray(arr) ? arr.filter(l => l.id && !existingIds.has(l.id)) : [];
  } catch { return []; }
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { isMobile, isTablet } = useBreakpoint();
  const C = { bg:"#080810", card:"#0e0e1a", border:"#1e1e30", gold:"#c9a84c", text:"#e8e4dc", muted:"#666" };

  const [listings,  setListings]  = useState(SEED);
  const [leads,     setLeads]     = useState({});
  const [nav,       setNav]       = useState("discover");
  const [typeFil,   setTypeFil]   = useState("all");
  const [bedFil,    setBedFil]    = useState("all");
  const [selected,  setSelected]  = useState(null);
  const [photoIdx,  setPhotoIdx]  = useState(0);
  const [pulling,   setPulling]   = useState(false);
  const [autoOn,    setAutoOn]    = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [modal,     setModal]     = useState(null);
  const [sched,     setSched]     = useState({ date:"", time:"", note:"", type:"in-person" });
  const [toast,     setToast]     = useState(null);
  const [editNote,  setEditNote]  = useState(null);
  const [noteText,  setNoteText]  = useState("");
  const [leadsTab,  setLeadsTab]  = useState("all");
  const [showFil,   setShowFil]   = useState(false);

  const batch   = useRef(1);
  const ivRef   = useRef(null);
  const listRef = useRef(listings);
  listRef.current = listings;

  const toast$ = (msg, color="#40d080") => { setToast({msg,color}); setTimeout(()=>setToast(null),3000); };

  // Storage
  useEffect(() => {
    (async () => {
      try { const r = await store.get("hf_leads"); if (r?.value) setLeads(JSON.parse(r.value)); } catch {}
      try { const r = await store.get("hf_listings"); if (r?.value) { const s=JSON.parse(r.value); if(s?.length>0) setListings(s); } } catch {}
    })();
  }, []);
  useEffect(() => { store.set("hf_leads",    JSON.stringify(leads)); },    [leads]);
  useEffect(() => { store.set("hf_listings", JSON.stringify(listings)); }, [listings]);

  // Pull
  const doPull = useCallback(async () => {
    setPulling(true);
    const ids = new Set(listRef.current.map(l=>l.id));
    const fresh = await pullListings(ids, batch.current++);
    if (fresh.length > 0) { setListings(p => [...fresh,...p].slice(0,80)); toast$(`✦ ${fresh.length} new properties`); }
    setCountdown(60);
    setPulling(false);
  }, []);

  // Timer — uses ref to avoid stale closure
  useEffect(() => {
    clearInterval(ivRef.current);
    if (!autoOn) return;
    ivRef.current = setInterval(() => setCountdown(n => { if (n<=1) { doPull(); return 60; } return n-1; }), 1000);
    return () => clearInterval(ivRef.current);
  }, [autoOn, doPull]);

  // Lead actions
  const addLead   = id => { setLeads(p => p[id] ? p : {...p,[id]:{status:"new",notes:"",added:new Date().toISOString()}}); toast$("♥ Saved to Leads"); };
  const dropLead  = id => { setLeads(p => { const n={...p}; delete n[id]; return n; }); toast$("Removed","#ff6666"); };
  const setStatus = (id,s) => { setLeads(p => ({...p,[id]:{...(p[id]||{}),status:s}})); toast$(STATUSES.find(x=>x.key===s)?.label||s); };
  const saveNote  = id => { setLeads(p => ({...p,[id]:{...(p[id]||{}),notes:noteText}})); setEditNote(null); toast$("Note saved"); };

  const confirmSched = () => {
    if (!sched.date||!sched.time) { toast$("Pick a date & time","#ff6666"); return; }
    setLeads(p => ({...p,[modal.id]:{...(p[modal.id]||{}),status:"scheduled",vDate:sched.date,vTime:sched.time,vNote:sched.note,vType:sched.type}}));
    setModal(null); toast$("📅 Viewing Scheduled!");
  };

  // Swipe
  const tx = useRef(null);
  const onTS = e => { tx.current = e.touches[0].clientX; };
  const onTE = e => { if(tx.current===null) return; const dx=e.changedTouches[0].clientX-tx.current; if(Math.abs(dx)>48) setPhotoIdx(p=>dx<0?(p+1)%5:(p-1+5)%5); tx.current=null; };

  // Filters
  const visible = listings.filter(l => {
    const tok = typeFil==="all" || l.type===typeFil;
    if (bedFil==="1") return tok && l.beds===1 && l.price>=1700 && l.price<=3000;
    if (bedFil==="2") return tok && l.beds===2 && l.price>=2200 && l.price<=4000;
    return tok && l.price<=4000;
  });
  const savedIds = Object.keys(leads);
  const saved    = listings.filter(l=>savedIds.includes(l.id));
  const ledFil   = leadsTab==="scheduled" ? saved.filter(l=>leads[l.id]?.status==="scheduled")
    : leadsTab==="hot"    ? saved.filter(l=>leads[l.id]?.status==="hot")
    : leadsTab==="toured" ? saved.filter(l=>leads[l.id]?.status==="toured")
    : saved;

  const cols = isMobile ? 1 : isTablet ? 2 : 3;
  const pct  = (countdown/60)*100;
  const NAV  = [{k:"discover",icon:"◈",label:"Discover"},{k:"leads",icon:"♥",label:"Leads"},{k:"schedule",icon:"📅",label:"Schedule"},{k:"map",icon:"⊙",label:"Map"}];
  const B    = (extra={}) => ({border:"none",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",...extra});

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"Georgia,'Times New Roman',serif",overflowX:"hidden"}}>

      {/* TOAST */}
      {toast && <div style={{position:"fixed",bottom:isMobile?82:24,left:"50%",transform:"translateX(-50%)",background:"#111",border:`1px solid ${toast.color}`,color:toast.color,padding:"9px 20px",borderRadius:28,fontSize:13,zIndex:9999,whiteSpace:"nowrap",pointerEvents:"none",boxShadow:"0 4px 20px #00000099"}}>{toast.msg}</div>}

      {/* HEADER */}
      <div style={{background:"#0b0b18",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:90}}>
        <div style={{maxWidth:1320,margin:"0 auto",padding:isMobile?"11px 14px":"13px 24px",display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
            <div style={{width:32,height:32,background:"linear-gradient(135deg,#c9a84c,#8b5e14)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",color:"#000",fontSize:15}}>H</div>
            <div>
              <div style={{fontSize:isMobile?15:19,fontWeight:"bold",letterSpacing:"0.05em"}}>HAUS<span style={{color:C.gold}}>FIND</span></div>
              {!isMobile && <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginTop:1}}>Southern California</div>}
            </div>
          </div>
          {/* Desktop nav */}
          {!isMobile && <div style={{display:"flex",gap:3}}>{NAV.map(({k,icon,label})=><button key={k} onClick={()=>setNav(k)} style={B({background:nav===k?"#1a1a2e":"transparent",color:nav===k?C.gold:C.muted,border:`1px solid ${nav===k?"#c9a84c30":"transparent"}`,padding:"7px 14px",borderRadius:8,fontSize:13})}>{icon} {label}</button>)}</div>}
          {/* Controls */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            {!isMobile && <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:autoOn?"#40d080":C.muted}}><div style={{width:7,height:7,borderRadius:"50%",background:autoOn?"#40d080":C.muted,boxShadow:autoOn?"0 0 5px #40d080":""}}/>{autoOn?`${countdown}s`:"Paused"}</div>}
            <button onClick={()=>setAutoOn(a=>!a)} style={B({background:autoOn?"#0a1e0e":"#181818",color:autoOn?"#40d080":C.muted,border:`1px solid ${autoOn?"#40d08030":C.border}`,padding:"6px 10px",borderRadius:14,fontSize:11})}>{autoOn?"⏸":"▶"}</button>
            <button onClick={doPull} disabled={pulling} style={B({background:"linear-gradient(135deg,#c9a84c,#8b5e14)",color:"#000",padding:isMobile?"7px 11px":"7px 15px",borderRadius:14,fontSize:12,fontWeight:"bold",opacity:pulling?0.6:1,whiteSpace:"nowrap"})}>{pulling?"⟳…":isMobile?"⟳":"⟳ Pull Now"}</button>
          </div>
        </div>

        {/* Progress bar */}
        {autoOn && <div style={{height:2,background:"#111"}}><div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#c9a84c,#4a9eff)",transition:"width 1s linear"}}/></div>}

        {/* Filters */}
        {(nav==="discover"||nav==="map") && <>
          {isMobile && <div style={{padding:"7px 14px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,color:C.muted}}>{visible.length} listings</span>
            <button onClick={()=>setShowFil(f=>!f)} style={B({background:showFil?"#c9a84c18":"transparent",color:C.gold,border:`1px solid #c9a84c40`,padding:"5px 13px",borderRadius:15,fontSize:12})}>⚙ Filters {showFil?"▲":"▼"}</button>
          </div>}
          {(!isMobile||showFil) && <div style={{maxWidth:1320,margin:"0 auto",padding:isMobile?"10px 14px 13px":"9px 24px",borderTop:`1px solid ${C.border}`,display:"flex",gap:7,flexWrap:"wrap",alignItems:"center",background:isMobile?"#0a0a14":"transparent"}}>
            <span style={{fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.1em"}}>Type</span>
            {[["all","All"],["loft","⬛ Loft"],["apartment","🏢 Apt"],["home","🏡 Home"]].map(([v,l])=><button key={v} onClick={()=>{setTypeFil(v);if(isMobile)setShowFil(false);}} style={B({background:typeFil===v?"#c9a84c18":"transparent",color:typeFil===v?C.gold:C.muted,border:`1px solid ${typeFil===v?"#c9a84c40":C.border}`,padding:"5px 13px",borderRadius:17,fontSize:12})}>{l}</button>)}
            <div style={{width:1,height:18,background:C.border}}/>
            <span style={{fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.1em"}}>Budget</span>
            {[["all","Any"],["1","Solo 1BD"],["2","w/ Bro 2BD"]].map(([v,l])=><button key={v} onClick={()=>{setBedFil(v);if(isMobile)setShowFil(false);}} style={B({background:bedFil===v?"#c9a84c18":"transparent",color:bedFil===v?C.gold:C.muted,border:`1px solid ${bedFil===v?"#c9a84c40":C.border}`,padding:"5px 13px",borderRadius:17,fontSize:12})}>{l}</button>)}
            {!isMobile && <span style={{marginLeft:"auto",fontSize:11,color:"#444"}}>{visible.length} listings · {savedIds.length} saved</span>}
          </div>}
        </>}
      </div>

      {/* PAGE */}
      <div style={{maxWidth:1320,margin:"0 auto",padding:isMobile?"14px 12px":"20px 24px",paddingBottom:isMobile?90:40}}>

        {/* ══ DISCOVER ══ */}
        {nav==="discover" && <>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?3:6},1fr)`,gap:isMobile?8:12,marginBottom:18}}>
            {[["◈",visible.length,"Listings"],["⬛",visible.filter(l=>l.type==="loft").length,"Lofts"],["🏢",visible.filter(l=>l.type==="apartment").length,"Apts"],["🏡",visible.filter(l=>l.type==="home").length,"Homes"],["♥",savedIds.length,"Saved"],["📅",Object.values(leads).filter(l=>l.status==="scheduled").length,"Sched."]].map(([ic,v,lb],i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:isMobile?"9px 6px":"13px 14px",textAlign:"center"}}>
                <div style={{fontSize:isMobile?14:17}}>{ic}</div>
                <div style={{fontSize:isMobile?17:21,fontWeight:"bold",color:C.gold}}>{v}</div>
                <div style={{fontSize:isMobile?9:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:1}}>{lb}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:isMobile?13:17}}>
            {visible.map(l=>{
              const lead=leads[l.id]; const status=STATUSES.find(s=>s.key===lead?.status);
              return (
                <div key={l.id} onClick={()=>{setSelected(l);setPhotoIdx(0);}} style={{background:C.card,border:`1px solid ${lead?"#c9a84c28":C.border}`,borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"transform 0.16s"}}
                  onMouseEnter={e=>!isMobile&&(e.currentTarget.style.transform="translateY(-2px)")}
                  onMouseLeave={e=>!isMobile&&(e.currentTarget.style.transform="translateY(0)")}>
                  <div style={{position:"relative",height:isMobile?175:190}}>
                    <img src={getImg(l.type,l.img)} alt={l.title} style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy"/>
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 38%,#0e0e1a 100%)"}}/>
                    <div style={{position:"absolute",top:9,left:9,display:"flex",gap:5}}>
                      <span style={{background:TC[l.type],color:"#000",fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:"bold"}}>{TI[l.type]} {l.type.toUpperCase()}</span>
                      <span style={{background:"#000b",color:C.text,fontSize:10,padding:"2px 7px",borderRadius:4}}>{l.beds}BD</span>
                    </div>
                    <button onClick={e=>{e.stopPropagation();lead?dropLead(l.id):addLead(l.id);}} style={B({position:"absolute",top:9,right:9,background:lead?"#c9a84c":"#000b",color:lead?"#000":"#fff",width:30,height:30,borderRadius:"50%",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"})}>
                      {lead?"♥":"♡"}
                    </button>
                    {status && <div style={{position:"absolute",bottom:8,left:9,background:status.bg,color:status.color,border:`1px solid ${status.color}40`,fontSize:10,padding:"2px 7px",borderRadius:4}}>{status.label}</div>}
                    <div style={{position:"absolute",bottom:8,right:9,background:"#000b",color:"#bbb",fontSize:10,padding:"2px 7px",borderRadius:4}}>🚶{l.walk}</div>
                  </div>
                  <div style={{padding:isMobile?"10px 12px 12px":"12px 14px 14px"}}>
                    <div style={{fontSize:10,color:TC[l.type],textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:3}}>{l.neighborhood}</div>
                    <div style={{fontSize:isMobile?14:15,fontWeight:"bold",lineHeight:1.3,marginBottom:4}}>{l.title}</div>
                    <div style={{fontSize:11,color:"#666",fontStyle:"italic",marginBottom:9}}>"{l.highlight}"</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <span style={{fontSize:isMobile?19:21,fontWeight:"bold"}}>${l.price.toLocaleString()}</span>
                        <span style={{fontSize:11,color:C.muted}}>/mo</span>
                        <div style={{fontSize:10,color:C.muted}}>{l.sqft.toLocaleString()} sqft</div>
                      </div>
                      <div style={{fontSize:10,color:l.avail==="Now"?"#40d080":"#aaa",background:l.avail==="Now"?"#081a10":"#111",padding:"3px 8px",borderRadius:4,border:`1px solid ${l.avail==="Now"?"#40d08030":"#222"}`}}>
                        {l.avail==="Now"?"● Now":"○ "+l.avail}
                      </div>
                    </div>
                    {!isMobile && <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:9}}>{l.amenities.slice(0,3).map(a=><span key={a} style={{background:"#111",color:"#666",fontSize:10,padding:"2px 7px",borderRadius:3,border:`1px solid ${C.border}`}}>{a}</span>)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {visible.length===0 && <div style={{textAlign:"center",padding:"50px 20px",color:C.muted,border:`1px dashed ${C.border}`,borderRadius:12,marginTop:8}}><div style={{fontSize:30,marginBottom:10}}>◎</div><div>No listings match your filters.</div><div style={{fontSize:12,marginTop:5}}>Try "All Types" or pull fresh listings.</div></div>}
        </>}

        {/* ══ LEADS ══ */}
        {nav==="leads" && <>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:isMobile?17:21,fontWeight:"bold"}}>My Leads</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{savedIds.length} saved · track, note & schedule viewings</div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
            {[["all","All"],["hot","🔥 Hot"],["scheduled","📅 Scheduled"],["toured","Toured"]].map(([k,l])=>(
              <button key={k} onClick={()=>setLeadsTab(k)} style={B({background:leadsTab===k?"#c9a84c18":C.card,color:leadsTab===k?C.gold:C.muted,border:`1px solid ${leadsTab===k?"#c9a84c40":C.border}`,padding:"6px 14px",borderRadius:17,fontSize:12,whiteSpace:"nowrap",flexShrink:0})}>{l}</button>
            ))}
          </div>
          {ledFil.length===0 ? (
            <div style={{textAlign:"center",padding:"60px 20px",color:"#333",border:`1px dashed ${C.border}`,borderRadius:13}}>
              <div style={{fontSize:36,marginBottom:10}}>♡</div>
              <div style={{color:C.muted}}>No leads yet.</div>
              <div style={{fontSize:12,color:"#444",marginTop:5}}>Heart a property in Discover to start tracking.</div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {ledFil.map(l=>{
                const lead=leads[l.id]||{}; const status=STATUSES.find(s=>s.key===lead.status)||STATUSES[0];
                return (
                  <div key={l.id} style={{background:C.card,border:`1px solid ${status.color}20`,borderRadius:12,overflow:"hidden"}}>
                    <div style={{display:"flex",flexDirection:isMobile?"column":"row"}}>
                      <div style={{width:isMobile?"100%":155,position:"relative",flexShrink:0}}>
                        <img src={getImg(l.type,l.img)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",minHeight:isMobile?145:120}}/>
                        <span style={{position:"absolute",top:8,left:8,background:TC[l.type],color:"#000",fontSize:10,padding:"2px 7px",borderRadius:3,fontWeight:"bold"}}>{l.type.toUpperCase()}</span>
                      </div>
                      <div style={{flex:1,padding:isMobile?"12px":"15px 18px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:7}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:10,color:TC[l.type],textTransform:"uppercase"}}>{l.neighborhood}</div>
                            <div style={{fontSize:isMobile?14:16,fontWeight:"bold",marginTop:2,lineHeight:1.2}}>{l.title}</div>
                            <div style={{fontSize:isMobile?17:19,color:C.gold,fontWeight:"bold",marginTop:2}}>${l.price.toLocaleString()}<span style={{fontSize:11,color:C.muted,fontWeight:"normal"}}>/mo</span></div>
                          </div>
                          <select value={lead.status||"new"} onChange={e=>setStatus(l.id,e.target.value)} style={{background:status.bg,color:status.color,border:`1px solid ${status.color}40`,padding:"5px 9px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                            {STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>
                        <div style={{fontSize:12,color:C.muted,marginBottom:9,display:"flex",gap:14,flexWrap:"wrap"}}>
                          <span>📞 {l.phone}</span>
                          {lead.vDate && <span style={{color:"#40d080"}}>📅 {lead.vDate} {lead.vTime}</span>}
                          <span style={{color:l.avail==="Now"?"#40d080":"#999"}}>{l.avail==="Now"?"● Now":"○ "+l.avail}</span>
                        </div>
                        {editNote===l.id ? (
                          <div style={{display:"flex",gap:7,marginBottom:9}}>
                            <textarea defaultValue={lead.notes} onChange={e=>setNoteText(e.target.value)} style={{flex:1,background:"#111",border:`1px solid ${C.border}`,borderRadius:6,color:C.text,padding:"7px 10px",fontSize:12,resize:"vertical",minHeight:52,fontFamily:"inherit"}} placeholder="Notes…" autoFocus/>
                            <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              <button onClick={()=>saveNote(l.id)} style={B({background:C.gold,color:"#000",padding:"6px 10px",borderRadius:6,fontSize:12})}>✓</button>
                              <button onClick={()=>setEditNote(null)} style={B({background:"#181818",color:C.muted,border:`1px solid ${C.border}`,padding:"6px 10px",borderRadius:6,fontSize:12})}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <div onClick={()=>{setEditNote(l.id);setNoteText(lead.notes||"");}} style={{fontSize:12,color:lead.notes?"#999":"#444",background:"#111",border:`1px dashed ${C.border}`,borderRadius:6,padding:"7px 10px",cursor:"text",fontStyle:lead.notes?"normal":"italic",marginBottom:9}}>
                            {lead.notes||"Tap to add notes…"}
                          </div>
                        )}
                        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                          <button onClick={()=>{setModal(l);setSched({date:lead.vDate||"",time:lead.vTime||"",note:lead.vNote||"",type:lead.vType||"in-person"});}} style={B({background:"#0a1e0e",color:"#40d080",border:"1px solid #40d08030",padding:"7px 12px",borderRadius:8,fontSize:12})}>📅 {lead.vDate?"Reschedule":"Schedule"}</button>
                          <button onClick={()=>{setSelected(l);setPhotoIdx(0);}} style={B({background:"#181828",color:C.gold,border:`1px solid #c9a84c30`,padding:"7px 12px",borderRadius:8,fontSize:12})}>Photos</button>
                          <a href={`https://maps.google.com/?q=${encodeURIComponent(l.title+" "+l.neighborhood+" Los Angeles")}`} target="_blank" rel="noreferrer" style={{background:"#0e0e1a",color:"#4a9eff",border:"1px solid #4a9eff30",padding:"7px 12px",borderRadius:8,fontSize:12,textDecoration:"none"}}>📍 Map</a>
                          <a href={`tel:${l.phone}`} style={{background:"#0e0e1a",color:C.muted,border:`1px solid ${C.border}`,padding:"7px 10px",borderRadius:8,fontSize:12,textDecoration:"none"}}>📞</a>
                          <button onClick={()=>dropLead(l.id)} style={B({background:"#1a0808",color:"#ff4444",border:"1px solid #ff444420",padding:"7px 10px",borderRadius:8,fontSize:12})}>✕</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>}

        {/* ══ SCHEDULE ══ */}
        {nav==="schedule" && <>
          <div style={{fontSize:isMobile?17:21,fontWeight:"bold",marginBottom:3}}>Viewing Schedule</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:18}}>Full pipeline — New Lead → Toured</div>
          <div style={{overflowX:"auto",marginBottom:26}}>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?2:7},1fr)`,gap:10,minWidth:isMobile?560:0}}>
              {STATUSES.map(s=>{
                const inS=saved.filter(l=>(leads[l.id]?.status||"new")===s.key);
                return (
                  <div key={s.key} style={{background:"#0a0a12",border:`1px solid ${s.color}20`,borderRadius:10,padding:"12px"}}>
                    <div style={{fontSize:10,color:s.color,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</span>
                      <span style={{background:s.bg,padding:"1px 6px",borderRadius:8,flexShrink:0,marginLeft:4}}>{inS.length}</span>
                    </div>
                    {inS.slice(0,3).map(l=>(
                      <div key={l.id} onClick={()=>{setSelected(l);setPhotoIdx(0);}} style={{background:"#111",border:`1px solid ${s.color}18`,borderRadius:6,padding:"8px 9px",marginBottom:6,cursor:"pointer"}}>
                        <div style={{fontSize:9,color:TC[l.type],textTransform:"uppercase"}}>{l.neighborhood}</div>
                        <div style={{fontSize:12,color:C.text,fontWeight:"bold",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
                        <div style={{fontSize:12,color:C.gold}}>${l.price.toLocaleString()}</div>
                        {leads[l.id]?.vDate && <div style={{fontSize:9,color:"#40d080",marginTop:4,background:"#081a10",padding:"1px 5px",borderRadius:3}}>{leads[l.id].vDate}</div>}
                      </div>
                    ))}
                    {inS.length===0 && <div style={{fontSize:10,color:"#2a2a3a",fontStyle:"italic"}}>Empty</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{fontSize:15,fontWeight:"bold",marginBottom:12}}>📅 Upcoming Viewings</div>
          {saved.filter(l=>leads[l.id]?.vDate).length===0 ? (
            <div style={{color:"#333",fontSize:13,fontStyle:"italic",padding:22,border:`1px dashed ${C.border}`,borderRadius:10,textAlign:"center"}}>No viewings scheduled. Save a lead and tap "Schedule" to book one.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              {saved.filter(l=>leads[l.id]?.vDate).sort((a,b)=>new Date(leads[a.id].vDate)-new Date(leads[b.id].vDate)).map(l=>{
                const ld=leads[l.id];
                return (
                  <div key={l.id} style={{background:C.card,border:"1px solid #40d08020",borderRadius:10,display:"flex",overflow:"hidden"}}>
                    <div style={{width:5,background:"#40d080",flexShrink:0}}/>
                    {!isMobile && <img src={getImg(l.type,l.img)} alt="" style={{width:85,objectFit:"cover"}} loading="lazy"/>}
                    <div style={{flex:1,padding:"13px 15px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                        <div>
                          <div style={{fontSize:10,color:TC[l.type],textTransform:"uppercase"}}>{l.neighborhood}</div>
                          <div style={{fontSize:isMobile?14:15,fontWeight:"bold",marginTop:1}}>{l.title}</div>
                          <div style={{fontSize:14,color:C.gold}}>${l.price.toLocaleString()}/mo</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:15,fontWeight:"bold",color:"#40d080"}}>{ld.vDate}</div>
                          <div style={{fontSize:13,color:"#40d08099"}}>⏰ {ld.vTime}</div>
                          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",marginTop:1}}>{ld.vType}</div>
                        </div>
                      </div>
                      {ld.vNote && <div style={{fontSize:12,color:"#666",marginTop:7,background:"#111",padding:"5px 9px",borderRadius:5,fontStyle:"italic"}}>{ld.vNote}</div>}
                      <div style={{display:"flex",gap:12,marginTop:9,fontSize:12,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{color:C.muted}}>📞 {l.phone}</span>
                        <button onClick={()=>{setModal(l);setSched({date:ld.vDate,time:ld.vTime,note:ld.vNote||"",type:ld.vType||"in-person"});}} style={B({color:C.gold,background:"none",fontSize:12,padding:0})}>✏️ Edit</button>
                        <button onClick={()=>setStatus(l.id,"toured")} style={B({color:"#40d080",background:"none",fontSize:12,padding:0})}>✓ Mark Toured</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>}

        {/* ══ MAP ══ */}
        {nav==="map" && (
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 290px",gap:15}}>
            <div style={{borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
              <iframe title="LA Map" width="100%" height={isMobile?320:520} style={{border:0,display:"block"}} loading="lazy"
                src="https://www.google.com/maps/embed/v1/search?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=loft+apartment+home+for+rent+Los+Angeles+California&center=34.0522,-118.2437&zoom=11"/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,overflowY:"auto",maxHeight:isMobile?"none":540}}>
              <div style={{fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:2}}>By Neighborhood</div>
              {[...new Set(visible.map(l=>l.neighborhood))].map(nbh=>{
                const cnt=visible.filter(l=>l.neighborhood===nbh).length;
                const types=[...new Set(visible.filter(l=>l.neighborhood===nbh).map(l=>l.type))];
                return (
                  <div key={nbh} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <div style={{fontSize:13,fontWeight:"bold"}}>{nbh}</div>
                      <div style={{fontSize:11,color:C.gold,background:"#c9a84c10",padding:"2px 8px",borderRadius:9}}>{cnt}</div>
                    </div>
                    <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>{types.map(t=><span key={t} style={{fontSize:10,color:TC[t],background:TC[t]+"10",padding:"1px 6px",borderRadius:3}}>{TI[t]} {t}</span>)}</div>
                    <a href={`https://maps.google.com/?q=apartments+${encodeURIComponent(nbh)}+Los+Angeles`} target="_blank" rel="noreferrer" style={{display:"inline-block",marginTop:6,fontSize:10,color:"#4a9eff",textDecoration:"none"}}>View on Maps →</a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0d0d1c",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:95}}>
          {NAV.map(({k,icon,label})=>(
            <button key={k} onClick={()=>setNav(k)} style={B({flex:1,padding:"9px 4px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:nav===k?C.gold:C.muted,background:"transparent",position:"relative"})}>
              {k==="leads"&&savedIds.length>0 && <div style={{position:"absolute",top:5,right:"18%",width:15,height:15,background:"#ff4466",borderRadius:"50%",fontSize:8,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>{savedIds.length}</div>}
              <div style={{fontSize:17}}>{icon}</div>
              <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.04em"}}>{label}</div>
              {nav===k && <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,background:C.gold,borderRadius:1}}/>}
            </button>
          ))}
        </div>
      )}

      {/* LISTING MODAL */}
      {selected && (
        <div style={{position:"fixed",inset:0,background:"#000000e0",zIndex:200,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20}} onClick={()=>setSelected(null)}>
          <div style={{background:C.card,borderRadius:isMobile?"16px 16px 0 0":14,width:"100%",maxWidth:isMobile?"100%":800,maxHeight:isMobile?"92vh":"90vh",overflow:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{position:"relative",height:isMobile?230:320}} onTouchStart={onTS} onTouchEnd={onTE}>
              <img src={getImgs(selected.type,selected.img)[photoIdx]} alt={selected.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",borderRadius:isMobile?"16px 16px 0 0":"14px 14px 0 0"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 48%,#0e0e1a 100%)",borderRadius:isMobile?"16px 16px 0 0":"14px 14px 0 0"}}/>
              <button onClick={()=>setSelected(null)} style={B({position:"absolute",top:13,right:13,background:"#000b",color:"#fff",width:33,height:33,borderRadius:"50%",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center"})}>×</button>
              <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5}}>
                {Array.from({length:5}).map((_,i)=><button key={i} onClick={()=>setPhotoIdx(i)} style={B({width:i===photoIdx?20:7,height:7,background:i===photoIdx?"#c9a84c":"#ffffff44",borderRadius:4,transition:"all 0.2s"})}/>)}
              </div>
              {!isMobile && <>
                <button onClick={()=>setPhotoIdx(p=>(p-1+5)%5)} style={B({position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",background:"#000b",color:"#fff",width:34,height:34,borderRadius:"50%",fontSize:19,display:"flex",alignItems:"center",justifyContent:"center"})}>‹</button>
                <button onClick={()=>setPhotoIdx(p=>(p+1)%5)} style={B({position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"#000b",color:"#fff",width:34,height:34,borderRadius:"50%",fontSize:19,display:"flex",alignItems:"center",justifyContent:"center"})}>›</button>
              </>}
              <div style={{position:"absolute",top:13,left:13}}><span style={{background:TC[selected.type],color:"#000",fontSize:11,padding:"3px 9px",borderRadius:4,fontWeight:"bold"}}>{TI[selected.type]} {selected.type.toUpperCase()}</span></div>
            </div>
            <div style={{padding:isMobile?"15px 14px 22px":26}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:16}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:TC[selected.type],textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{selected.neighborhood}</div>
                  <div style={{fontSize:isMobile?17:22,fontWeight:"bold",lineHeight:1.2}}>{selected.title}</div>
                  <div style={{fontSize:12,color:"#666",fontStyle:"italic",marginTop:4}}>"{selected.highlight}"</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:isMobile?22:28,fontWeight:"bold"}}>${selected.price.toLocaleString()}<span style={{fontSize:12,color:C.muted,fontWeight:"normal"}}>/mo</span></div>
                  <div style={{fontSize:11,color:C.muted}}>{selected.beds}BD · {selected.sqft.toLocaleString()} sqft</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
                {[["🛏",selected.beds,"Beds"],["📐",selected.sqft.toLocaleString(),"Sqft"],["🚶",selected.walk,"Walk"],["📅",selected.avail,"Avail"]].map(([ic,v,lb])=>(
                  <div key={lb} style={{background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 5px",textAlign:"center"}}>
                    <div style={{fontSize:15}}>{ic}</div>
                    <div style={{fontSize:isMobile?12:14,fontWeight:"bold",color:C.gold,margin:"2px 0"}}>{v}</div>
                    <div style={{fontSize:9,color:C.muted,textTransform:"uppercase"}}>{lb}</div>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:7}}>Amenities</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{selected.amenities.map(a=><span key={a} style={{background:"#111",color:"#aaa",fontSize:12,padding:"4px 11px",borderRadius:17,border:`1px solid ${C.border}`}}>✓ {a}</span>)}</div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:13}}>
                <button onClick={()=>{leads[selected.id]?dropLead(selected.id):addLead(selected.id);}} style={B({flex:1,minWidth:110,background:leads[selected.id]?"#c9a84c":"#111",color:leads[selected.id]?"#000":C.gold,border:"1px solid #c9a84c40",padding:"11px",borderRadius:8,fontSize:13})}>
                  {leads[selected.id]?"♥ In Leads":"♡ Save"}
                </button>
                <button onClick={()=>{addLead(selected.id);setModal(selected);setSched({date:"",time:"",note:"",type:"in-person"});setSelected(null);}} style={B({flex:1,minWidth:130,background:"#0a1e0e",color:"#40d080",border:"1px solid #40d08030",padding:"11px",borderRadius:8,fontSize:13})}>📅 Schedule</button>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(selected.title+" "+selected.neighborhood+" LA")}`} target="_blank" rel="noreferrer" style={{flex:1,minWidth:90,background:"#111",color:"#4a9eff",border:"1px solid #4a9eff30",padding:"11px",borderRadius:8,fontSize:13,textDecoration:"none",textAlign:"center"}}>📍 Map</a>
              </div>
              <div style={{background:"#0a0a14",border:"1px solid #c9a84c18",borderRadius:8,padding:"11px 13px",fontSize:12,color:"#666"}}>
                📞 <strong style={{color:"#aaa"}}>{selected.phone}</strong> — Ask about move-in specials, parking, and pet policy.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"#000000e0",zIndex:300,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20}} onClick={()=>setModal(null)}>
          <div style={{background:C.card,border:"1px solid #40d08040",borderRadius:isMobile?"16px 16px 0 0":14,width:"100%",maxWidth:isMobile?"100%":510,padding:isMobile?"20px 16px 32px":28}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:isMobile?17:19,fontWeight:"bold",marginBottom:3}}>📅 Schedule a Viewing</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:18}}>{modal.title} · {modal.neighborhood}</div>
            <div style={{display:"flex",gap:7,marginBottom:14}}>
              {[["in-person","🏠 In-Person"],["virtual","💻 Virtual"],["self-tour","🔑 Self-Tour"]].map(([t,l])=>(
                <button key={t} onClick={()=>setSched(f=>({...f,type:t}))} style={B({flex:1,background:sched.type===t?"#0a1e0e":"#111",color:sched.type===t?"#40d080":"#555",border:`1px solid ${sched.type===t?"#40d08040":C.border}`,padding:"9px 3px",borderRadius:8,fontSize:isMobile?11:12,textAlign:"center"})}>{l}</button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <label style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5}}>Date</label>
                <input type="date" value={sched.date} onChange={e=>setSched(f=>({...f,date:e.target.value}))} style={{width:"100%",background:"#111",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"10px 11px",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5}}>Time</label>
                <input type="time" value={sched.time} onChange={e=>setSched(f=>({...f,time:e.target.value}))} style={{width:"100%",background:"#111",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"10px 11px",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5}}>Notes</label>
              <textarea value={sched.note} onChange={e=>setSched(f=>({...f,note:e.target.value}))} style={{width:"100%",background:"#111",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"9px 11px",fontSize:13,resize:"vertical",minHeight:68,fontFamily:"inherit",boxSizing:"border-box"}} placeholder="Questions, parking, pet policy, virtual tour link…"/>
            </div>
            <div style={{background:"#0a1208",border:"1px solid #40d08018",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#666",lineHeight:1.6}}>
              <strong style={{color:"#40d080"}}>After confirming:</strong> Call {modal.phone} to verify the slot and availability.
            </div>
            <div style={{display:"flex",gap:9}}>
              <button onClick={()=>setModal(null)} style={B({flex:1,background:"#111",color:C.muted,border:`1px solid ${C.border}`,padding:"12px",borderRadius:8,fontSize:14})}>Cancel</button>
              <button onClick={confirmSched} style={B({flex:2,background:"linear-gradient(135deg,#40d080,#20a060)",color:"#000",padding:"12px",borderRadius:8,fontSize:14,fontWeight:"bold"})}>✓ Confirm Viewing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
