import { useState, useEffect, useCallback, useRef } from "react";

// ─── RESPONSIVE ──────────────────────────────────────────────────────────────
function useBreakpoint() {
  const getW = () => (typeof window !== "undefined" ? window.innerWidth : 1024);
  const [w, setW] = useState(getW);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, w };
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const mem = {};
const store = {
  async get(k) { try { return await window.storage?.get(k) ?? (mem[k] ? { value: mem[k] } : null); } catch { return mem[k] ? { value: mem[k] } : null; } },
  async set(k, v) { mem[k] = v; try { await window.storage?.set(k, v); } catch {} },
};

// ─── SOURCE CONFIG ────────────────────────────────────────────────────────────
const SOURCES = [
  { id: "zillow",       name: "Zillow",         color: "#006aff", icon: "Z", searchUrl: (q) => `https://www.zillow.com/los-angeles-ca/rentals/?searchQueryState=%7B%22usersSearchTerm%22%3A%22${encodeURIComponent(q)}%22%7D` },
  { id: "apartments",   name: "Apartments.com",  color: "#e8392a", icon: "A", searchUrl: (q) => `https://www.apartments.com/los-angeles-ca/?so=price-ascend&min-rent=${q.minPrice}&max-rent=${q.maxPrice}` },
  { id: "craigslist",   name: "Craigslist",      color: "#7b2d8b", icon: "CL", searchUrl: () => `https://losangeles.craigslist.org/search/apa?query=loft+apartment&min_price=1700&max_price=4000` },
  { id: "redfin",       name: "Redfin",          color: "#cc0000", icon: "R", searchUrl: () => `https://www.redfin.com/city/11203/CA/Los-Angeles/apartments-for-rent` },
  { id: "trulia",       name: "Trulia",           color: "#5c7f3f", icon: "T", searchUrl: () => `https://www.trulia.com/for_rent/Los_Angeles,CA/` },
  { id: "hotpads",      name: "HotPads",          color: "#e87722", icon: "H", searchUrl: () => `https://hotpads.com/los-angeles-ca/apartments-for-rent` },
  { id: "facebook",     name: "FB Marketplace",   color: "#1877f2", icon: "FB", searchUrl: () => `https://www.facebook.com/marketplace/los-angeles/propertyrentals` },
  { id: "zillowrentals",name: "Zillow Rentals",   color: "#0068fa", icon: "ZR", searchUrl: () => `https://www.zillow.com/los-angeles-ca/rentals/` },
];

// ─── LEAD STATUSES ────────────────────────────────────────────────────────────
const STATUSES = [
  { key:"new",       label:"New Lead",      color:"#4a9eff", bg:"#0a1a2e" },
  { key:"watching",  label:"Watching",      color:"#f0c040", bg:"#1e1800" },
  { key:"contacted", label:"Contacted",     color:"#c060ff", bg:"#180e24" },
  { key:"scheduled", label:"Sched. Viewing",color:"#40d080", bg:"#081a10" },
  { key:"toured",    label:"Toured",        color:"#ff8040", bg:"#1e0c00" },
  { key:"passed",    label:"Passed",        color:"#888",    bg:"#141414" },
  { key:"hot",       label:"🔥 Top Pick",   color:"#ff4466", bg:"#1e0010" },
];

const TC = { loft:"#c9a84c", apartment:"#4a9eff", home:"#40d080" };
const TI = { loft:"⬛", apartment:"🏢", home:"🏡" };

// ─── REAL LISTING FETCHER via Claude API + web_search ─────────────────────────
async function fetchRealListings(query, budget, batch) {
  const searches = [
    `site:zillow.com ${query} Los Angeles rent 2025 loft apartment`,
    `site:apartments.com ${query} Los Angeles loft rent available 2025`,
    `site:craigslist.org Los Angeles loft apartment rent ${query}`,
    `site:redfin.com Los Angeles apartment loft rent ${query}`,
    `site:trulia.com Los Angeles loft apartment for rent`,
  ];
  const searchQuery = searches[batch % searches.length];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Search for REAL currently available rental listings in Los Angeles, CA. Use web search to find actual active listings from Zillow, Apartments.com, Craigslist, Redfin, Trulia, and HotPads.

Search for: loft apartments, apartments, and homes for rent in Los Angeles area.
Budget: 1BR $1,700-$3,000/mo OR 2BR $2,200-$4,000/mo.
Focus areas: Arts District, Downtown LA, Silver Lake, Echo Park, Koreatown, Culver City, Long Beach, Highland Park, Atwater Village, Glendale, Burbank.

For each listing found, extract:
- Exact property name/title
- Full address (street, city)
- Monthly price (number)
- Bedrooms (1 or 2)
- Square footage if available
- Property type (loft/apartment/home)
- Source website (zillow/apartments/craigslist/redfin/trulia/hotpads)
- Direct URL to the listing
- Photo URL (the actual image URL from the listing, e.g. photos.zillowstatic.com, images.apartments.com, images.craigslist.org, ssl.cdn-redfin.com)
- Key amenities (array)
- One highlight/description
- Availability date
- Phone or contact if shown

Return ONLY a valid JSON array of 8-12 listings. No markdown. Each object must have: id (string "real_${batch}_N"), title, address, neighborhood, beds (1 or 2), price (integer), sqft (integer or null), type ("loft"|"apartment"|"home"), source ("zillow"|"apartments"|"craigslist"|"redfin"|"trulia"|"hotpads"), listingUrl (full URL), photoUrl (actual photo URL from the listing or null), amenities (array), highlight, avail, phone (or null).`
        }]
      })
    });

    const data = await res.json();
    // Extract text from the final assistant message (after tool use)
    let text = "";
    for (const block of data.content || []) {
      if (block.type === "text") text += block.text;
    }
    const clean = text.replace(/```json|```/g, "").trim();
    // Find JSON array in the response
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const arr = JSON.parse(match[0]);
    return Array.isArray(arr) ? arr.filter(l => l.id && l.price && l.listingUrl) : [];
  } catch (e) {
    console.error("Fetch error:", e);
    return [];
  }
}

// ─── PLACEHOLDER when no photo ────────────────────────────────────────────────
function NoPhoto({ source, type, isMobile }) {
  const src = SOURCES.find(s => s.id === source);
  return (
    <div style={{ width:"100%", height: isMobile?175:190, background:"#111", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
      <div style={{ fontSize:28, fontWeight:"bold", color: src?.color || "#555", fontFamily:"sans-serif", width:48, height:48, borderRadius:8, background: (src?.color || "#555")+"22", display:"flex", alignItems:"center", justifyContent:"center" }}>{src?.icon || "?"}</div>
      <div style={{ fontSize:11, color:"#555", textAlign:"center", padding:"0 16px" }}>Photo available on listing site</div>
    </div>
  );
}

// ─── PHOTO with fallback ──────────────────────────────────────────────────────
function ListingPhoto({ photoUrl, source, type, height, isMobile }) {
  const [err, setErr] = useState(false);
  if (!photoUrl || err) return <NoPhoto source={source} type={type} isMobile={isMobile} />;
  return (
    <img
      src={photoUrl}
      alt="listing"
      onError={() => setErr(true)}
      style={{ width:"100%", height: height || (isMobile?175:190), objectFit:"cover", display:"block" }}
      loading="lazy"
    />
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { isMobile, isTablet } = useBreakpoint();
  const C = { bg:"#080810", card:"#0e0e1a", border:"#1e1e30", gold:"#c9a84c", text:"#e8e4dc", muted:"#666" };

  const [listings,   setListings]   = useState([]);
  const [leads,      setLeads]      = useState({});
  const [nav,        setNav]        = useState("discover");
  const [typeFil,    setTypeFil]    = useState("all");
  const [bedFil,     setBedFil]     = useState("all");
  const [sourceFil,  setSourceFil]  = useState("all");
  const [selected,   setSelected]   = useState(null);
  const [pulling,    setPulling]    = useState(false);
  const [initLoading,setInitLoading]= useState(true);
  const [autoOn,     setAutoOn]     = useState(true);
  const [countdown,  setCountdown]  = useState(90);
  const [modal,      setModal]      = useState(null);
  const [sched,      setSched]      = useState({ date:"", time:"", note:"", type:"in-person" });
  const [toast,      setToast]      = useState(null);
  const [editNote,   setEditNote]   = useState(null);
  const [noteText,   setNoteText]   = useState("");
  const [leadsTab,   setLeadsTab]   = useState("all");
  const [showFil,    setShowFil]    = useState(false);
  const [pullLog,    setPullLog]    = useState([]);

  const batch   = useRef(0);
  const ivRef   = useRef(null);
  const listRef = useRef(listings);
  listRef.current = listings;

  const toast$ = (msg, color="#40d080") => { setToast({msg,color}); setTimeout(()=>setToast(null),3200); };

  // Storage
  useEffect(() => {
    (async () => {
      try { const r = await store.get("hf2_leads"); if (r?.value) setLeads(JSON.parse(r.value)); } catch {}
      try { const r = await store.get("hf2_listings"); if (r?.value) { const s=JSON.parse(r.value); if(s?.length>0) { setListings(s); setInitLoading(false); return; } } } catch {}
      // First load — pull real listings
      doPull(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { store.set("hf2_leads",    JSON.stringify(leads)); },    [leads]);
  useEffect(() => { store.set("hf2_listings", JSON.stringify(listings)); }, [listings]);

  // Pull real listings
  const doPull = useCallback(async (isInit = false) => {
    setPulling(true);
    if (isInit) setInitLoading(true);
    const b = batch.current++;
    const fresh = await fetchRealListings("loft apartment home", "1700-4000", b);
    if (fresh.length > 0) {
      const existingIds = new Set(listRef.current.map(l => l.id));
      const newOnes = fresh.filter(l => !existingIds.has(l.id));
      setListings(prev => [...newOnes, ...prev].slice(0, 100));
      const ts = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
      setPullLog(p => [`${ts} — ${newOnes.length} new listings pulled`, ...p].slice(0, 10));
      if (!isInit) toast$(`✦ ${newOnes.length} real listings added`);
    } else {
      if (!isInit) toast$("No new listings found this pull", "#f0c040");
    }
    setCountdown(90);
    setPulling(false);
    setInitLoading(false);
  }, []);

  // Auto-refresh every 90s
  useEffect(() => {
    clearInterval(ivRef.current);
    if (!autoOn) return;
    ivRef.current = setInterval(() => setCountdown(n => { if(n<=1){doPull();return 90;} return n-1; }), 1000);
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
  const onTE = e => { if(!tx.current) return; const dx=e.changedTouches[0].clientX-tx.current; if(Math.abs(dx)>48) setSelected(null); tx.current=null; };

  // Filter
  const visible = listings.filter(l => {
    const tok = typeFil==="all" || l.type===typeFil;
    const sok = sourceFil==="all" || l.source===sourceFil;
    if (bedFil==="1") return tok && sok && l.beds===1 && l.price>=1700 && l.price<=3000;
    if (bedFil==="2") return tok && sok && l.beds===2 && l.price>=2200 && l.price<=4000;
    return tok && sok && l.price<=4000;
  });

  const savedIds = Object.keys(leads);
  const saved    = listings.filter(l=>savedIds.includes(l.id));
  const ledFil   = leadsTab==="scheduled" ? saved.filter(l=>leads[l.id]?.status==="scheduled")
    : leadsTab==="hot"    ? saved.filter(l=>leads[l.id]?.status==="hot")
    : leadsTab==="toured" ? saved.filter(l=>leads[l.id]?.status==="toured")
    : saved;

  const cols = isMobile ? 1 : isTablet ? 2 : 3;
  const pct  = (countdown/90)*100;
  const NAV  = [{k:"discover",icon:"◈",label:"Discover"},{k:"leads",icon:"♥",label:"Leads"},{k:"schedule",icon:"📅",label:"Schedule"},{k:"sources",icon:"⊞",label:"Sources"}];
  const B    = (e={}) => ({border:"none",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",...e});

  const getSourceInfo = (id) => SOURCES.find(s=>s.id===id) || {name:id,color:"#888",icon:"?"};

  // ── LOADING SCREEN ──────────────────────────────────────────────────────────
  if (initLoading) return (
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.text,fontFamily:"Georgia,serif",gap:20}}>
      <div style={{fontSize:28,fontWeight:"bold",letterSpacing:"0.06em"}}>HAUS<span style={{color:C.gold}}>FIND</span></div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:"#c9a84c",animation:"pulse 1s infinite"}}/>
        <div style={{fontSize:14,color:C.muted}}>Searching real listings from Zillow, Apartments.com, Craigslist, Redfin, Trulia…</div>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",maxWidth:480}}>
        {SOURCES.map(s=>(
          <div key={s.id} style={{background:s.color+"18",border:`1px solid ${s.color}44`,color:s.color,padding:"4px 12px",borderRadius:20,fontSize:11,fontFamily:"sans-serif"}}>
            {s.name}
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"Georgia,'Times New Roman',serif",overflowX:"hidden"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* TOAST */}
      {toast && <div style={{position:"fixed",bottom:isMobile?82:24,left:"50%",transform:"translateX(-50%)",background:"#111",border:`1px solid ${toast.color}`,color:toast.color,padding:"9px 20px",borderRadius:28,fontSize:13,zIndex:9999,whiteSpace:"nowrap",pointerEvents:"none",boxShadow:"0 4px 20px #00000099"}}>{toast.msg}</div>}

      {/* HEADER */}
      <div style={{background:"#0b0b18",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:90}}>
        <div style={{maxWidth:1320,margin:"0 auto",padding:isMobile?"11px 14px":"13px 24px",display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
            <div style={{width:32,height:32,background:"linear-gradient(135deg,#c9a84c,#8b5e14)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",color:"#000",fontSize:15}}>H</div>
            <div>
              <div style={{fontSize:isMobile?15:19,fontWeight:"bold",letterSpacing:"0.05em"}}>HAUS<span style={{color:C.gold}}>FIND</span></div>
              {!isMobile && <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginTop:1}}>Live listings · Southern California</div>}
            </div>
          </div>

          {!isMobile && <div style={{display:"flex",gap:3}}>{NAV.map(({k,icon,label})=><button key={k} onClick={()=>setNav(k)} style={B({background:nav===k?"#1a1a2e":"transparent",color:nav===k?C.gold:C.muted,border:`1px solid ${nav===k?"#c9a84c30":"transparent"}`,padding:"7px 14px",borderRadius:8,fontSize:13})}>{icon} {label}</button>)}</div>}

          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            {!isMobile && <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:autoOn?"#40d080":C.muted}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:autoOn?"#40d080":C.muted,boxShadow:autoOn?"0 0 5px #40d080":"",animation:pulling?"pulse 1s infinite":""}}/>
              {pulling ? "Searching..." : autoOn?`${countdown}s`:"Paused"}
            </div>}
            <button onClick={()=>setAutoOn(a=>!a)} style={B({background:autoOn?"#0a1e0e":"#181818",color:autoOn?"#40d080":C.muted,border:`1px solid ${autoOn?"#40d08030":C.border}`,padding:"6px 10px",borderRadius:14,fontSize:11})}>{autoOn?"⏸":"▶"}</button>
            <button onClick={()=>doPull(false)} disabled={pulling} style={B({background:"linear-gradient(135deg,#c9a84c,#8b5e14)",color:"#000",padding:isMobile?"7px 11px":"7px 15px",borderRadius:14,fontSize:12,fontWeight:"bold",opacity:pulling?0.6:1,whiteSpace:"nowrap"})}>{pulling?"⟳ Searching…":isMobile?"⟳":"⟳ Search Now"}</button>
          </div>
        </div>

        {autoOn && <div style={{height:2,background:"#111"}}><div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#c9a84c,#4a9eff)",transition:"width 1s linear"}}/></div>}

        {/* Filters */}
        {(nav==="discover") && <>
          {isMobile && <div style={{padding:"7px 14px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,color:C.muted}}>{visible.length} real listings</span>
            <button onClick={()=>setShowFil(f=>!f)} style={B({background:showFil?"#c9a84c18":"transparent",color:C.gold,border:`1px solid #c9a84c40`,padding:"5px 13px",borderRadius:15,fontSize:12})}>⚙ Filter {showFil?"▲":"▼"}</button>
          </div>}
          {(!isMobile||showFil) && <div style={{maxWidth:1320,margin:"0 auto",padding:isMobile?"10px 14px 13px":"9px 24px",borderTop:`1px solid ${C.border}`,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",background:isMobile?"#0a0a14":"transparent"}}>
            {[["all","All Types"],["loft","⬛ Loft"],["apartment","🏢 Apt"],["home","🏡 Home"]].map(([v,l])=><button key={v} onClick={()=>{setTypeFil(v);if(isMobile)setShowFil(false);}} style={B({background:typeFil===v?"#c9a84c18":"transparent",color:typeFil===v?C.gold:C.muted,border:`1px solid ${typeFil===v?"#c9a84c40":C.border}`,padding:"5px 11px",borderRadius:17,fontSize:12})}>{l}</button>)}
            <div style={{width:1,height:16,background:C.border}}/>
            {[["all","Any Budget"],["1","Solo 1BD"],["2","w/ Bro 2BD"]].map(([v,l])=><button key={v} onClick={()=>{setBedFil(v);if(isMobile)setShowFil(false);}} style={B({background:bedFil===v?"#c9a84c18":"transparent",color:bedFil===v?C.gold:C.muted,border:`1px solid ${bedFil===v?"#c9a84c40":C.border}`,padding:"5px 11px",borderRadius:17,fontSize:12})}>{l}</button>)}
            <div style={{width:1,height:16,background:C.border}}/>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              <button onClick={()=>setSourceFil("all")} style={B({background:sourceFil==="all"?"#c9a84c18":"transparent",color:sourceFil==="all"?C.gold:C.muted,border:`1px solid ${sourceFil==="all"?"#c9a84c40":C.border}`,padding:"5px 10px",borderRadius:15,fontSize:11})}>All Sites</button>
              {SOURCES.map(s=><button key={s.id} onClick={()=>setSourceFil(s.id)} style={B({background:sourceFil===s.id?s.color+"22":"transparent",color:sourceFil===s.id?s.color:C.muted,border:`1px solid ${sourceFil===s.id?s.color+"44":C.border}`,padding:"5px 10px",borderRadius:15,fontSize:11,fontFamily:"sans-serif"})}>{s.name}</button>)}
            </div>
            {!isMobile && <span style={{marginLeft:"auto",fontSize:11,color:"#444"}}>{visible.length} listings · {savedIds.length} saved</span>}
          </div>}
        </>}
      </div>

      {/* PAGE */}
      <div style={{maxWidth:1320,margin:"0 auto",padding:isMobile?"14px 12px":"20px 24px",paddingBottom:isMobile?90:40}}>

        {/* ══ DISCOVER ══ */}
        {nav==="discover" && <>
          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?3:6},1fr)`,gap:isMobile?8:12,marginBottom:18}}>
            {[["◈",visible.length,"Listings"],["⬛",visible.filter(l=>l.type==="loft").length,"Lofts"],["🏢",visible.filter(l=>l.type==="apartment").length,"Apts"],["🏡",visible.filter(l=>l.type==="home").length,"Homes"],["♥",savedIds.length,"Saved"],["📅",Object.values(leads).filter(l=>l.status==="scheduled").length,"Sched."]].map(([ic,v,lb],i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:isMobile?"9px 6px":"13px 14px",textAlign:"center"}}>
                <div style={{fontSize:isMobile?14:17}}>{ic}</div>
                <div style={{fontSize:isMobile?17:21,fontWeight:"bold",color:C.gold}}>{v}</div>
                <div style={{fontSize:isMobile?9:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:1}}>{lb}</div>
              </div>
            ))}
          </div>

          {listings.length === 0 && !pulling && (
            <div style={{textAlign:"center",padding:"60px 20px",color:C.muted,border:`1px dashed ${C.border}`,borderRadius:12}}>
              <div style={{fontSize:30,marginBottom:10}}>◎</div>
              <div>No listings yet.</div>
              <button onClick={()=>doPull(false)} style={B({background:"#c9a84c",color:"#000",padding:"10px 24px",borderRadius:20,fontSize:14,fontWeight:"bold",marginTop:16,display:"inline-block"})}>Search Real Listings Now</button>
            </div>
          )}

          {pulling && listings.length === 0 && (
            <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
              <div style={{fontSize:14,animation:"pulse 1s infinite"}}>⟳ Searching Zillow, Apartments.com, Craigslist, Redfin, Trulia…</div>
            </div>
          )}

          {/* Cards */}
          <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:isMobile?13:17}}>
            {visible.map(l=>{
              const lead=leads[l.id]; const status=STATUSES.find(s=>s.key===lead?.status);
              const src=getSourceInfo(l.source);
              return (
                <div key={l.id} style={{background:C.card,border:`1px solid ${lead?"#c9a84c28":C.border}`,borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"transform 0.16s"}}
                  onClick={()=>setSelected(l)}
                  onMouseEnter={e=>!isMobile&&(e.currentTarget.style.transform="translateY(-2px)")}
                  onMouseLeave={e=>!isMobile&&(e.currentTarget.style.transform="translateY(0)")}>

                  {/* Photo */}
                  <div style={{position:"relative",height:isMobile?175:190,overflow:"hidden"}}>
                    <ListingPhoto photoUrl={l.photoUrl} source={l.source} type={l.type} height={isMobile?175:190} isMobile={isMobile}/>
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,#0e0e1a 100%)"}}/>

                    {/* Source badge */}
                    <div style={{position:"absolute",top:9,left:9,display:"flex",gap:5}}>
                      <span style={{background:src.color,color:"#fff",fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:"bold",fontFamily:"sans-serif"}}>{src.name}</span>
                      <span style={{background:"#000b",color:C.text,fontSize:10,padding:"2px 7px",borderRadius:4}}>{l.beds}BD · {l.type}</span>
                    </div>

                    {/* Save */}
                    <button onClick={e=>{e.stopPropagation();lead?dropLead(l.id):addLead(l.id);}} style={B({position:"absolute",top:9,right:9,background:lead?"#c9a84c":"#000b",color:lead?"#000":"#fff",width:30,height:30,borderRadius:"50%",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"})}>
                      {lead?"♥":"♡"}
                    </button>

                    {status && <div style={{position:"absolute",bottom:8,left:9,background:status.bg,color:status.color,border:`1px solid ${status.color}40`,fontSize:10,padding:"2px 7px",borderRadius:4}}>{status.label}</div>}
                  </div>

                  {/* Info */}
                  <div style={{padding:isMobile?"10px 12px 12px":"12px 14px 14px"}}>
                    <div style={{fontSize:10,color:TC[l.type]||"#aaa",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:3}}>{l.neighborhood || l.address}</div>
                    <div style={{fontSize:isMobile?14:15,fontWeight:"bold",lineHeight:1.3,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{l.title}</div>
                    {l.address && <div style={{fontSize:11,color:"#666",marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📍 {l.address}</div>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <span style={{fontSize:isMobile?19:21,fontWeight:"bold"}}>${l.price.toLocaleString()}</span>
                        <span style={{fontSize:11,color:C.muted}}>/mo</span>
                        {l.sqft && <div style={{fontSize:10,color:C.muted}}>{l.sqft.toLocaleString()} sqft</div>}
                      </div>
                      <div style={{fontSize:10,color:l.avail==="Now"?"#40d080":"#aaa",background:l.avail==="Now"?"#081a10":"#111",padding:"3px 8px",borderRadius:4,border:`1px solid ${l.avail==="Now"?"#40d08030":"#222"}`}}>
                        {l.avail==="Now"?"● Now":"○ "+l.avail}
                      </div>
                    </div>
                    {!isMobile && l.amenities?.length > 0 && (
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:9}}>
                        {l.amenities.slice(0,3).map(a=><span key={a} style={{background:"#111",color:"#666",fontSize:10,padding:"2px 7px",borderRadius:3,border:`1px solid ${C.border}`}}>{a}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pull log */}
          {pullLog.length > 0 && (
            <div style={{marginTop:24,padding:"12px 14px",background:"#0a0a14",border:`1px solid ${C.border}`,borderRadius:8}}>
              <div style={{fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Activity Log</div>
              {pullLog.map((l,i)=><div key={i} style={{fontSize:11,color:"#555",padding:"2px 0"}}>{l}</div>)}
            </div>
          )}
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
              <div style={{color:C.muted}}>No leads yet. Heart a listing in Discover.</div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {ledFil.map(l=>{
                const lead=leads[l.id]||{}; const status=STATUSES.find(s=>s.key===lead.status)||STATUSES[0];
                const src=getSourceInfo(l.source);
                return (
                  <div key={l.id} style={{background:C.card,border:`1px solid ${status.color}20`,borderRadius:12,overflow:"hidden"}}>
                    <div style={{display:"flex",flexDirection:isMobile?"column":"row"}}>
                      <div style={{width:isMobile?"100%":160,position:"relative",flexShrink:0}}>
                        <div style={{height:isMobile?150:130,overflow:"hidden"}}>
                          <ListingPhoto photoUrl={l.photoUrl} source={l.source} type={l.type} height={isMobile?150:130} isMobile={isMobile}/>
                        </div>
                        <span style={{position:"absolute",top:8,left:8,background:src.color,color:"#fff",fontSize:10,padding:"2px 7px",borderRadius:3,fontWeight:"bold",fontFamily:"sans-serif"}}>{src.name}</span>
                      </div>
                      <div style={{flex:1,padding:isMobile?"12px":"15px 18px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:7}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:10,color:TC[l.type]||"#aaa",textTransform:"uppercase"}}>{l.neighborhood}</div>
                            <div style={{fontSize:isMobile?14:16,fontWeight:"bold",marginTop:2,lineHeight:1.2}}>{l.title}</div>
                            {l.address && <div style={{fontSize:11,color:"#666",marginTop:2}}>📍 {l.address}</div>}
                            <div style={{fontSize:isMobile?17:19,color:C.gold,fontWeight:"bold",marginTop:3}}>${l.price.toLocaleString()}<span style={{fontSize:11,color:C.muted,fontWeight:"normal"}}>/mo</span></div>
                          </div>
                          <select value={lead.status||"new"} onChange={e=>setStatus(l.id,e.target.value)} style={{background:status.bg,color:status.color,border:`1px solid ${status.color}40`,padding:"5px 9px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                            {STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>
                        <div style={{fontSize:12,color:C.muted,marginBottom:9,display:"flex",gap:12,flexWrap:"wrap"}}>
                          {l.phone && <span>📞 {l.phone}</span>}
                          {lead.vDate && <span style={{color:"#40d080"}}>📅 {lead.vDate} {lead.vTime}</span>}
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
                          <a href={l.listingUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{background:"#111",color:src.color,border:`1px solid ${src.color}30`,padding:"7px 12px",borderRadius:8,fontSize:12,textDecoration:"none",fontFamily:"sans-serif"}}>View on {src.name}</a>
                          {l.phone && <a href={`tel:${l.phone}`} style={{background:"#0e0e1a",color:C.muted,border:`1px solid ${C.border}`,padding:"7px 10px",borderRadius:8,fontSize:12,textDecoration:"none"}}>📞</a>}
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
          <div style={{fontSize:12,color:C.muted,marginBottom:18}}>Your full pipeline from new lead to decision</div>
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
                    {inS.slice(0,3).map(l=>{
                      const src=getSourceInfo(l.source);
                      return (
                        <div key={l.id} onClick={()=>setSelected(l)} style={{background:"#111",border:`1px solid ${s.color}18`,borderRadius:6,padding:"8px",marginBottom:6,cursor:"pointer"}}>
                          <div style={{fontSize:9,color:src.color,fontFamily:"sans-serif"}}>{src.name}</div>
                          <div style={{fontSize:12,color:C.text,fontWeight:"bold",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
                          <div style={{fontSize:12,color:C.gold}}>${l.price.toLocaleString()}</div>
                          {leads[l.id]?.vDate && <div style={{fontSize:9,color:"#40d080",marginTop:4,background:"#081a10",padding:"1px 5px",borderRadius:3}}>{leads[l.id].vDate}</div>}
                        </div>
                      );
                    })}
                    {inS.length===0 && <div style={{fontSize:10,color:"#2a2a3a",fontStyle:"italic"}}>Empty</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{fontSize:15,fontWeight:"bold",marginBottom:12}}>📅 Upcoming Viewings</div>
          {saved.filter(l=>leads[l.id]?.vDate).length===0 ? (
            <div style={{color:"#333",fontSize:13,fontStyle:"italic",padding:22,border:`1px dashed ${C.border}`,borderRadius:10,textAlign:"center"}}>Save leads and tap "Schedule Viewing" to book a slot.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              {saved.filter(l=>leads[l.id]?.vDate).map(l=>{
                const ld=leads[l.id]; const src=getSourceInfo(l.source);
                return (
                  <div key={l.id} style={{background:C.card,border:"1px solid #40d08020",borderRadius:10,display:"flex",overflow:"hidden"}}>
                    <div style={{width:5,background:"#40d080",flexShrink:0}}/>
                    {!isMobile && <div style={{width:85,flexShrink:0,overflow:"hidden"}}><ListingPhoto photoUrl={l.photoUrl} source={l.source} type={l.type} height={110} isMobile={false}/></div>}
                    <div style={{flex:1,padding:"13px 15px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                        <div>
                          <div style={{fontSize:10,color:src.color,fontFamily:"sans-serif"}}>{src.name}</div>
                          <div style={{fontSize:15,fontWeight:"bold",marginTop:1}}>{l.title}</div>
                          {l.address && <div style={{fontSize:11,color:"#666"}}>📍 {l.address}</div>}
                          <div style={{fontSize:14,color:C.gold,marginTop:2}}>${l.price.toLocaleString()}/mo</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:15,fontWeight:"bold",color:"#40d080"}}>{ld.vDate}</div>
                          <div style={{fontSize:13,color:"#40d08099"}}>⏰ {ld.vTime}</div>
                          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",marginTop:1}}>{ld.vType}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:12,marginTop:9,fontSize:12,flexWrap:"wrap",alignItems:"center"}}>
                        {l.phone && <span style={{color:C.muted}}>📞 {l.phone}</span>}
                        <button onClick={()=>{setModal(l);setSched({date:ld.vDate,time:ld.vTime,note:ld.vNote||"",type:ld.vType||"in-person"});}} style={B({color:C.gold,background:"none",fontSize:12,padding:0})}>✏️ Edit</button>
                        <button onClick={()=>setStatus(l.id,"toured")} style={B({color:"#40d080",background:"none",fontSize:12,padding:0})}>✓ Mark Toured</button>
                        <a href={l.listingUrl} target="_blank" rel="noreferrer" style={{color:src.color,fontSize:12,textDecoration:"none",fontFamily:"sans-serif"}}>View on {src.name} →</a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>}

        {/* ══ SOURCES ══ */}
        {nav==="sources" && <>
          <div style={{fontSize:isMobile?17:21,fontWeight:"bold",marginBottom:3}}>Listing Sources</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:18}}>Open any platform to browse more listings</div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?1:isTablet?2:4},1fr)`,gap:14}}>
            {SOURCES.map(s=>{
              const count=listings.filter(l=>l.source===s.id).length;
              return (
                <div key={s.id} style={{background:C.card,border:`1px solid ${s.color}22`,borderRadius:12,padding:"18px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <div style={{width:38,height:38,background:s.color+"22",border:`1px solid ${s.color}44`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",color:s.color,fontSize:13,fontFamily:"sans-serif"}}>{s.icon}</div>
                    <div>
                      <div style={{fontSize:15,fontWeight:"bold",color:C.text,fontFamily:"sans-serif"}}>{s.name}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:1}}>{count} listing{count!==1?"s":""} pulled</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{setSourceFil(s.id);setNav("discover");}} style={B({flex:1,background:s.color+"18",color:s.color,border:`1px solid ${s.color}44`,padding:"8px",borderRadius:8,fontSize:12,fontFamily:"sans-serif"})}>Filter View</button>
                    <a href={s.searchUrl("loft apartment")} target="_blank" rel="noreferrer" style={{flex:1,background:"#111",color:s.color,border:`1px solid ${s.color}33`,padding:"8px",borderRadius:8,fontSize:12,textDecoration:"none",textAlign:"center",fontFamily:"sans-serif"}}>Open Site →</a>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:24,padding:"16px 18px",background:"#0a0a14",border:`1px solid ${C.border}`,borderRadius:10,fontSize:12,color:"#666",lineHeight:1.8}}>
            <strong style={{color:C.gold}}>How it works:</strong> HAUSFIND uses Claude AI with live web search to find real available listings from these platforms. Photos shown are directly from the listing. Click any listing to open it on the original site to apply, get contact info, or see the full virtual tour.
          </div>
        </>}

      </div>

      {/* MOBILE NAV */}
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

      {/* LISTING DETAIL MODAL */}
      {selected && (
        <div style={{position:"fixed",inset:0,background:"#000000e0",zIndex:200,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20}} onClick={()=>setSelected(null)}>
          <div style={{background:C.card,borderRadius:isMobile?"16px 16px 0 0":14,width:"100%",maxWidth:isMobile?"100%":820,maxHeight:isMobile?"94vh":"90vh",overflow:"auto"}} onClick={e=>e.stopPropagation()} onTouchStart={onTS} onTouchEnd={onTE}>

            {/* Photo */}
            <div style={{position:"relative",height:isMobile?240:340,overflow:"hidden",borderRadius:isMobile?"16px 16px 0 0":"14px 14px 0 0"}}>
              <ListingPhoto photoUrl={selected.photoUrl} source={selected.source} type={selected.type} height={isMobile?240:340} isMobile={isMobile}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,#0e0e1a 100%)"}}/>
              <button onClick={()=>setSelected(null)} style={B({position:"absolute",top:13,right:13,background:"#000b",color:"#fff",width:34,height:34,borderRadius:"50%",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"})}>×</button>
              {(() => { const src=getSourceInfo(selected.source); return (
                <div style={{position:"absolute",top:13,left:13,display:"flex",gap:6}}>
                  <span style={{background:src.color,color:"#fff",fontSize:11,padding:"3px 10px",borderRadius:4,fontWeight:"bold",fontFamily:"sans-serif"}}>{src.name}</span>
                  <span style={{background:"#000b",color:"#fff",fontSize:11,padding:"3px 10px",borderRadius:4}}>{TI[selected.type]||"🏠"} {selected.type}</span>
                </div>
              ); })()}
            </div>

            <div style={{padding:isMobile?"16px 15px 24px":28}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:16}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:TC[selected.type]||"#aaa",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{selected.neighborhood}</div>
                  <div style={{fontSize:isMobile?18:23,fontWeight:"bold",lineHeight:1.2}}>{selected.title}</div>
                  {selected.address && <div style={{fontSize:12,color:"#777",marginTop:5}}>📍 {selected.address}</div>}
                  {selected.highlight && <div style={{fontSize:13,color:"#666",fontStyle:"italic",marginTop:5}}>"{selected.highlight}"</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:isMobile?23:30,fontWeight:"bold"}}>${selected.price.toLocaleString()}<span style={{fontSize:12,color:C.muted,fontWeight:"normal"}}>/mo</span></div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{selected.beds}BD{selected.sqft?` · ${selected.sqft.toLocaleString()} sqft`:""}</div>
                </div>
              </div>

              {selected.amenities?.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:7}}>Amenities</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{selected.amenities.map(a=><span key={a} style={{background:"#111",color:"#aaa",fontSize:12,padding:"4px 11px",borderRadius:17,border:`1px solid ${C.border}`}}>✓ {a}</span>)}</div>
                </div>
              )}

              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                <button onClick={()=>{leads[selected.id]?dropLead(selected.id):addLead(selected.id);}} style={B({flex:1,minWidth:110,background:leads[selected.id]?"#c9a84c":"#111",color:leads[selected.id]?"#000":C.gold,border:"1px solid #c9a84c40",padding:"12px",borderRadius:8,fontSize:13})}>
                  {leads[selected.id]?"♥ In Leads":"♡ Save"}
                </button>
                <button onClick={()=>{addLead(selected.id);setModal(selected);setSched({date:"",time:"",note:"",type:"in-person"});setSelected(null);}} style={B({flex:1,minWidth:130,background:"#0a1e0e",color:"#40d080",border:"1px solid #40d08030",padding:"12px",borderRadius:8,fontSize:13})}>📅 Schedule</button>
                <a href={selected.listingUrl} target="_blank" rel="noreferrer" style={{flex:1,minWidth:120,background:getSourceInfo(selected.source).color+"18",color:getSourceInfo(selected.source).color,border:`1px solid ${getSourceInfo(selected.source).color}44`,padding:"12px",borderRadius:8,fontSize:13,textDecoration:"none",textAlign:"center",fontFamily:"sans-serif"}}>
                  View on {getSourceInfo(selected.source).name} →
                </a>
              </div>

              {selected.phone && <div style={{background:"#0a0a14",border:"1px solid #c9a84c18",borderRadius:8,padding:"11px 13px",fontSize:12,color:"#666"}}>📞 <strong style={{color:"#aaa"}}>{selected.phone}</strong> — Ask about availability and move-in specials.</div>}
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"#000000e0",zIndex:300,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20}} onClick={()=>setModal(null)}>
          <div style={{background:C.card,border:"1px solid #40d08040",borderRadius:isMobile?"16px 16px 0 0":14,width:"100%",maxWidth:isMobile?"100%":510,padding:isMobile?"20px 16px 32px":28}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:isMobile?17:19,fontWeight:"bold",marginBottom:3}}>📅 Schedule a Viewing</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:18}}>{modal.title}</div>
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
            <textarea value={sched.note} onChange={e=>setSched(f=>({...f,note:e.target.value}))} style={{width:"100%",background:"#111",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"9px 11px",fontSize:13,resize:"vertical",minHeight:65,fontFamily:"inherit",boxSizing:"border-box",marginBottom:12}} placeholder="Questions, parking, pet policy, virtual tour link…"/>
            <div style={{background:"#0a1208",border:"1px solid #40d08018",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#666"}}>
              <strong style={{color:"#40d080"}}>Next step:</strong> After confirming here, visit the listing on {getSourceInfo(modal.source)?.name} or call to lock in your slot.
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
