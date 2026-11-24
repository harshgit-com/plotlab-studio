import {getApp} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {getFirestore,collection,doc,getDocs,getDoc,setDoc,addDoc,serverTimestamp,onSnapshot,query,orderBy} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
const app=getApp("plotlab-studio-auth"),auth=getAuth(app),db=getFirestore(app),OWNER="plotlab29@gmail.com";
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let owner=null,currentUser=null,movies=[],settings={},events=[],unsubscribe=null,trendOrder=[],featuredIds=[];
function note(id,msg){const el=$(id);if(el)el.textContent=msg}
function toast(s){const el=$("toast");if(el){el.textContent=s;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2500)}}
function eventDate(e){const v=e.createdAt;return v?.toDate?v.toDate():v?.seconds?new Date(v.seconds*1000):v?new Date(v):null}
async function loadSettingsAndMovies(){
 const [ms,ss]=await Promise.all([getDocs(collection(db,"movies")),getDoc(doc(db,"siteSettings","public"))]);
 movies=ms.docs.map(d=>({id:d.id,...d.data()}));settings=ss.exists()?ss.data():{};
 const published=movies.filter(m=>m.published);
 const ids=Array.isArray(settings.trendingIds)?settings.trendingIds:[];
 trendOrder=ids.map(id=>published.find(m=>m.id===id||String(m.title||"").toLowerCase()===String(id).toLowerCase())).filter(Boolean);
 published.forEach(m=>{if(!trendOrder.some(x=>x.id===m.id))trendOrder.push(m)});
 const fids=Array.isArray(settings.featuredIds)?settings.featuredIds:[];
 featuredIds=fids.map(id=>published.find(m=>m.id===id||String(m.title||"").toLowerCase()===String(id).toLowerCase())?.id).filter(Boolean);
 renderTrend();
}
function renderTrend(){
 const host=$("studioTrendingOrder");if(!host)return;
 host.innerHTML=trendOrder.length?trendOrder.map((m,i)=>'<div class="trend-row" draggable="true" data-id="'+esc(m.id)+'" style="display:grid;grid-template-columns:24px 48px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px;border:1px solid #292929;border-radius:10px;margin:7px 0;background:#111"><span style="color:#aaa">⠿ '+(i+1)+'</span><img src="'+esc(m.posterUrl||"")+'" alt="" style="width:42px;height:58px;object-fit:cover;border-radius:5px" onerror="this.style.visibility=\'hidden\'"><div style="min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.title||m.id)+'</b><small style="color:#999">'+esc([m.year,m.genre,m.id].filter(Boolean).join(" · "))+'</small></div><div style="display:flex;gap:4px"><button class="btn" data-up="'+i+'" '+(i===0?"disabled":"")+' aria-label="Move up">↑</button><button class="btn" data-down="'+i+'" '+(i===trendOrder.length-1?"disabled":"")+' aria-label="Move down">↓</button><button class="btn" data-feature="'+esc(m.id)+'">'+(featuredIds.includes(m.id)?"★":"☆")+'</button></div></div>').join(""):'<div class="empty">No published movies available to arrange.</div>';
 const preview=$("studioTrendingPreview");if(preview)preview.innerHTML=trendOrder.slice(0,10).map((m,i)=>'<div style="width:105px;flex:none"><img src="'+esc(m.posterUrl||"")+'" alt="" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:8px" onerror="this.style.visibility=\'hidden\'"><small style="display:block;margin-top:5px;color:#ddd">'+(i+1)+'. '+esc(m.title||"Untitled")+'</small></div>').join("");
 note("studioTrendingCount",trendOrder.length+" published titles · "+Math.min(10,trendOrder.length)+" shown in preview");
}
function moveTrend(from,to){if(to<0||to>=trendOrder.length)return;const [item]=trendOrder.splice(from,1);trendOrder.splice(to,0,item);renderTrend()}
$("studioTrendingOrder")?.addEventListener("click",e=>{const up=e.target.closest("[data-up]"),down=e.target.closest("[data-down]"),feat=e.target.closest("[data-feature]");if(up)moveTrend(Number(up.dataset.up),Number(up.dataset.up)-1);if(down)moveTrend(Number(down.dataset.down),Number(down.dataset.down)+1);if(feat){const id=feat.dataset.feature;featuredIds=featuredIds.includes(id)?featuredIds.filter(x=>x!==id):[...featuredIds,id];renderTrend()}});
let dragId=null;
$("studioTrendingOrder")?.addEventListener("dragstart",e=>{const row=e.target.closest("[data-id]");if(row){dragId=row.dataset.id;e.dataTransfer.setData("text/plain",dragId);e.dataTransfer.effectAllowed="move"}});
$("studioTrendingOrder")?.addEventListener("dragover",e=>{if(e.target.closest("[data-id]"))e.preventDefault()});
$("studioTrendingOrder")?.addEventListener("drop",e=>{e.preventDefault();const row=e.target.closest("[data-id]");if(!row||!dragId||row.dataset.id===dragId)return;const from=trendOrder.findIndex(x=>x.id===dragId),to=trendOrder.findIndex(x=>x.id===row.dataset.id);moveTrend(from,to);dragId=null});
$("saveStudioTrending")?.addEventListener("click",async()=>{if(!owner)return;const btn=$("saveStudioTrending");btn.disabled=true;note("studioTrendingStatus","Saving slide order and featured titles…");try{const next={...settings,trendingIds:trendOrder.map(m=>m.id),featuredIds,updatedAt:serverTimestamp()};await setDoc(doc(db,"siteSettings","public"),next,{merge:true});await addDoc(collection(db,"adminActivity"),{action:"Trending and featured order updated",target:"Public homepage",changes:{trendingIds:{after:next.trendingIds},featuredIds:{after:featuredIds}},actor:owner.email,createdAt:serverTimestamp()});settings=next;note("studioTrendingStatus","Saved. The public PlotLab homepage will use this order.");toast("Trending order saved.");}catch(e){note("studioTrendingStatus","Save failed: "+(e.code||e.message));}finally{btn.disabled=false}});
$("refreshStudioTrending")?.addEventListener("click",async()=>{try{await loadSettingsAndMovies();note("studioTrendingStatus","Latest catalogue and saved order loaded.")}catch(e){note("studioTrendingStatus","Refresh failed: "+(e.code||e.message))}});
const fmtNum=n=>Number(n||0).toLocaleString();
const fmtDuration=seconds=>{const n=Math.max(0,Math.round(seconds||0));if(n<60)return n+"s";const m=Math.floor(n/60),h=Math.floor(m/60);return h?h+"h "+(m%60)+"m":m+"m"};
let analyticsUnsubscribe=null,analyticsEventsCache=[],analyticsUsersCache=[],analyticsUsersUnsubscribe=null,analyticsPage=0,analyticsFilterTimer=null;
const anPalette=["#ff8068","#F5B942","#55B6E8","#A3D977","#FF8A50","#E78AC3","#FF6B6B","#B7C7D8"];
const anEsc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function anCategory(name){
 if(name==="playback_error")return "errors";
 if(String(name||"").startsWith("ad_"))return "ads";
 if(["movie_play","movie_complete","movie_progress","movie_pause","movie_open","trailer_play"].includes(name))return "movie";
 if(["creator_profile_view","creator_search","connection_request","message_sent"].includes(name))return "creator";
 if(["review_submitted","watchlist_add","watchlist_remove"].includes(name))return "community";
 if(["search_used","genre_selected"].includes(name))return "discovery";
 if(["page_view","login","signup","logout","session_start"].includes(name))return "site";
 if(name==="playback_error")return "errors";
 return "other";
}
function anCategoryLabel(name){return ({movie:"Movies & playback",creator:"Creator Lab",community:"Community",discovery:"Discovery",site:"Account & site",errors:"Playback errors",ads:"Video ads",other:"Other"})[name]||"Other"}
function anDate(e){return e.createdAt?.toDate?e.createdAt.toDate():e.createdAt?.seconds?new Date(e.createdAt.seconds*1000):null}
function anContext(e){const p=e.props||{};return p.movieTitle||p.movieId||p.genre||p.section||e.page||"—"}
function anFiltered(){
 const range=$("anRange").value,category=$("anCategoryFilter").value,event=$("anEventFilter").value,device=$("anDeviceFilter").value,browser=$("anBrowserFilter").value,term=$("anMovieFilter").value.trim().toLowerCase();
 const from=$("anFrom").value,to=$("anTo").value,now=new Date();let start=null,end=null;
 if(range==="custom"){if(from)start=new Date(from+"T00:00:00");if(to)end=new Date(to+"T23:59:59.999")}
 else if(range!=="all")start=new Date(now.getTime()-Number(range)*86400000);
 return analyticsEventsCache.filter(e=>{
  const d=anDate(e),p=e.props||{},cat=anCategory(e.eventName);
  if(start&&(!d||d<start))return false;if(end&&(!d||d>end))return false;
  if(category==="errors"&&e.eventName!=="playback_error")return false;
  if(category!=="all"&&category!=="errors"&&cat!==category)return false;
  if(event!=="all"&&e.eventName!==event)return false;
  if(device!=="all"&&(e.deviceType||"unknown")!==device)return false;
  if(browser!=="all"&&(e.browser||"Other")!==browser)return false;
  if(term&&!([p.movieTitle,p.movieId,p.section,p.genre,e.page,e.eventName].filter(Boolean).join(" ").toLowerCase().includes(term)))return false;
  return true;
 });
}
function anBars(id,items,empty){
 const host=$(id),max=Math.max(1,...items.map(x=>x.value));
 host.innerHTML=items.length?items.map((x,i)=>'<div style="display:grid;grid-template-columns:minmax(85px,1fr) minmax(65px,2fr) 42px;gap:9px;align-items:center;margin:13px 0"><span style="font-size:12px;overflow-wrap:anywhere">'+anEsc(x.name)+'</span><div class="an-progress"><span style="width:'+Math.max(2,x.value/max*100)+'%;background:'+anPalette[i%anPalette.length]+'"></span></div><b style="font-size:12px;text-align:right">'+fmtNum(x.value)+'</b></div>').join(""):'<div class="an-empty">'+anEsc(empty)+'</div>';
}
function anDonut(id,items,empty){
 const host=$(id),total=items.reduce((a,x)=>a+x.value,0);if(!total){host.innerHTML='<div class="an-empty">'+anEsc(empty)+'</div>';return}
 let cursor=0;const stops=items.map((x,i)=>{const a=cursor;cursor+=x.value/total*100;return anPalette[i%anPalette.length]+' '+a+'% '+cursor+'%'}).join(",");
 host.innerHTML='<div style="display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;padding:12px"><div style="width:142px;height:142px;border-radius:50%;background:conic-gradient('+stops+');position:relative;flex:none"><div style="position:absolute;inset:27px;border-radius:50%;background:#141920;display:grid;place-items:center;text-align:center"><div><b style="font-size:22px">'+fmtNum(total)+'</b><div style="font-size:10px;color:#aab3bf">EVENTS</div></div></div></div><div style="display:grid;gap:8px;min-width:120px">'+items.map((x,i)=>'<div style="display:flex;gap:7px;align-items:center;font-size:11px"><i style="width:9px;height:9px;border-radius:50%;background:'+anPalette[i%anPalette.length]+'"></i><span>'+anEsc(x.name)+'</span><b style="margin-left:auto">'+fmtNum(x.value)+'</b></div>').join("")+'</div></div>';
}
function anSessionKey(e){const p=e.props||{};return [e.userId||"anonymous",p.playbackId||e.sessionId||e.id||"",p.movieId||p.movieTitle||"unknown"].join("|")}
function renderBusinessAnalytics(){
 const events=anFiltered(),plays=events.filter(e=>e.eventName==="movie_play"),active=new Set(events.map(e=>e.userId).filter(Boolean));
 const range=$("bizRange")?.value||"30",from="",to="",now=new Date();$("anRange").value=range;let start=null,end=null;
 if(range==="custom"){if(from)start=new Date(from+"T00:00:00");if(to)end=new Date(to+"T23:59:59.999")}else if(range!=="all")start=new Date(now.getTime()-Number(range)*86400000);
 const users=analyticsUsersCache||[],created=u=>u.createdAt?.toDate?u.createdAt.toDate():u.createdAt?.seconds?new Date(u.createdAt.seconds*1000):u.createdAt?new Date(u.createdAt):null;
 const newUsers=users.filter(u=>{const d=created(u);return d&&(!start||d>=start)&&(!end||d<=end)}).length;
 const sessions=new Map(),movieNames=new Map(),genres=new Map(),devices=new Map();
 for(const e of events){const p=e.props||{},key=anSessionKey(e),movieKey=p.movieId||p.movieTitle||"unknown",movieName=p.movieTitle||p.movieId||"Unknown movie";
  if(e.eventName==="movie_play"){const v=sessions.get(key)||{movieKey,movieName,completed:false};sessions.set(key,v);movieNames.set(movieKey,{name:movieName,value:(movieNames.get(movieKey)?.value||0)+1})}
  if(e.eventName==="movie_complete"){const v=sessions.get(key)||{movieKey,movieName,completed:false};v.completed=true;sessions.set(key,v)}
  if(e.eventName==="genre_selected"&&p.genre)genres.set(String(p.genre),(genres.get(String(p.genre))||0)+1);
  if(e.deviceType)devices.set(e.deviceType,(devices.get(e.deviceType)||0)+1);
 }
 const played=[...sessions.values()],completed=played.filter(s=>s.completed).length,incomplete=played.filter(s=>!s.completed),unfinished=new Map();
 incomplete.forEach(s=>unfinished.set(s.movieKey,{name:s.movieName,value:(unfinished.get(s.movieKey)?.value||0)+1}));
 const count=name=>events.filter(e=>e.eventName===name).length,requests=count("ad_request"),impressions=count("ad_impression");
 const set=(id,value)=>{const el=$(id);if(el)el.textContent=value};
 set("bizTotalUsers",fmtNum(users.length));set("bizNewUsers",fmtNum(newUsers));set("bizSignIns",fmtNum(count("login")));set("bizActiveViewers",fmtNum(active.size));set("bizMovieStarts",fmtNum(played.length));set("bizIncomplete",fmtNum(incomplete.length));set("bizCompletionRate",played.length?(completed/played.length*100).toFixed(1)+"%":"—");set("bizAdImpressions",fmtNum(impressions));set("bizAdRequests",fmtNum(requests));set("bizAdFill",requests?(impressions/requests*100).toFixed(1)+"%":"—");
 const ageLabels={"under_18":"Under 18","18_24":"18–24","25_34":"25–34","35_44":"35–44","45_plus":"45+"};const ageMap=new Map();users.filter(u=>u.ageInsightsConsent===true&&ageLabels[u.ageRange]).forEach(u=>ageMap.set(ageLabels[u.ageRange],(ageMap.get(ageLabels[u.ageRange])||0)+1));const ageConsented=users.filter(u=>u.ageInsightsConsent===true&&ageLabels[u.ageRange]).length;const ageRecorded=users.filter(u=>ageLabels[u.ageRange]).length;const ageSummary=$("bizAgeSummary");if(ageSummary)ageSummary.textContent=ageConsented+" opted-in profiles · "+ageRecorded+" profiles with an age range recorded";
 const growth=new Map();users.forEach(u=>{const d=created(u);if(!d||start&&d<start||end&&d>end)return;const key=range==="all"||range==="365"?d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"):d.toISOString().slice(0,10);growth.set(key,(growth.get(key)||0)+1)});
 anBars("bizUserGrowth",[...growth.entries()].sort((x,y)=>x[0].localeCompare(y[0])).slice(-12).map(([name,value])=>({name,value})),"No new user profiles in this period.");
 anBars("bizTopMovies",[...movieNames.values()].sort((x,y)=>y.value-x.value).slice(0,6),"No movie starts recorded for this period.");
 anBars("bizUnfinishedMovies",[...unfinished.values()].sort((x,y)=>y.value-x.value).slice(0,6),"No unfinished movie sessions recorded.");
 anDonut("bizAgeRanges",[...ageMap.entries()].map(([name,value])=>({name,value})),"No users have opted in to anonymous age insights yet. Age range selection is required at sign-up; the separate analytics opt-in remains optional.");
 anBars("bizGenres",[...genres.entries()].sort((x,y)=>y[1]-x[1]).slice(0,6).map(([name,value])=>({name,value})),"No genre selections recorded yet.");
 anDonut("bizDevices",[...devices.entries()].map(([name,value])=>({name,value})),"No device information recorded yet.");
}
function renderAnalytics(){
 renderBusinessAnalytics();
 const events=anFiltered(),plays=events.filter(e=>e.eventName==="movie_play"),active=new Set(events.map(e=>e.userId).filter(Boolean)),viewers=new Set(plays.map(e=>e.userId).filter(Boolean));
 const watch=new Map(),completed=new Set(),movieMap=new Map(),deviceMap=new Map(),browserMap=new Map(),dayMap=new Map(),dayUsers=new Map(),creatorMap=new Map(),featureMap=new Map(),genreMap=new Map(),areaMap=new Map();
 for(const e of events){
  const p=e.props||{},key=anSessionKey(e),cat=anCategory(e.eventName);
  if(["movie_progress","movie_pause","movie_complete"].includes(e.eventName))watch.set(key,Math.max(watch.get(key)||0,Number(p.watchSeconds)||0));
  if(e.eventName==="movie_complete")completed.add(key);
  const d=anDate(e);if(d){const day=d.toISOString().slice(0,10);dayMap.set(day,(dayMap.get(day)||0)+1);if(e.userId){if(!dayUsers.has(day))dayUsers.set(day,new Set());dayUsers.get(day).add(e.userId)}}
  const dev=e.deviceType||"unknown";deviceMap.set(dev,(deviceMap.get(dev)||0)+1);
  const br=e.browser||"Other";browserMap.set(br,(browserMap.get(br)||0)+1);
  featureMap.set(e.eventName,(featureMap.get(e.eventName)||0)+1);
  areaMap.set(cat,(areaMap.get(cat)||0)+1);
  if(cat==="creator")creatorMap.set(e.eventName,(creatorMap.get(e.eventName)||0)+1);
  if(e.eventName==="genre_selected"&&p.genre)genreMap.set(String(p.genre),(genreMap.get(String(p.genre))||0)+1);
 }
 for(const e of plays){const p=e.props||{},name=p.movieTitle||p.movieId||"Unknown title",key=p.movieId||name;const x=movieMap.get(key)||{name,value:0};x.value++;movieMap.set(key,x)}
 const playSessions=new Set(plays.map(anSessionKey)),completionCount=[...completed].filter(k=>playSessions.has(k)).length,completionRate=playSessions.size?completionCount/playSessions.size*100:0;
 const watchSeconds=[...watch.values()].reduce((a,b)=>a+b,0),errors=events.filter(e=>e.eventName==="playback_error").length;
 const community=events.filter(e=>["review_submitted","watchlist_add","watchlist_remove"].includes(e.eventName)).length;
 const adCount=name=>events.filter(e=>e.eventName===name).length,adRequests=adCount("ad_request"),adImpressions=adCount("ad_impression"),adCompleted=adCount("ad_completed"),adSkipped=adCount("ad_skipped"),adErrors=adCount("ad_error");
 $("anAdRequests").textContent=fmtNum(adRequests);$("anAdImpressions").textContent=fmtNum(adImpressions);$("anAdFill").textContent=adRequests?(adImpressions/adRequests*100).toFixed(1)+"%":"—";$("anAdCompleted").textContent=fmtNum(adCompleted);$("anAdSkipped").textContent=fmtNum(adSkipped);$("anAdErrors").textContent=fmtNum(adErrors);
 anBars("anAdChart",[{name:"Requests",value:adRequests},{name:"Impressions",value:adImpressions},{name:"Completed",value:adCompleted},{name:"Skipped",value:adSkipped},{name:"Errors",value:adErrors}],"No video ad events recorded in this date range.");
 $("anEvents").textContent=fmtNum(events.length);$("anActiveUsers").textContent=fmtNum(active.size);$("anPlays").textContent=fmtNum(plays.length);$("anViewers").textContent=fmtNum(viewers.size);
 $("anCompletionRate").textContent=playSessions.size?completionRate.toFixed(1)+"%":"—";$("anWatch").textContent=fmtDuration(watchSeconds);$("anErrors").textContent=fmtNum(errors);$("anCommunity").textContent=fmtNum(community);
 $("anResultCount").textContent=fmtNum(events.length)+" matching events";
 anBars("anMovieChart",[...movieMap.values()].sort((a,b)=>b.value-a.value).slice(0,10),"No movie starts in this report.");
 anDonut("anAreaPie",[...areaMap.entries()].map(([name,value])=>({name:anCategoryLabel(name),value})),"No product-area events.");
 anDonut("anDevicePie",[...deviceMap.entries()].map(([name,value])=>({name,value})),"No device data.");
 anDonut("anBrowserPie",[...browserMap.entries()].map(([name,value])=>({name,value})),"No browser data.");
 anBars("anCreatorChart",[...creatorMap.entries()].sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name:name.replaceAll("_"," "),value})),"No Creator Lab events.");
 anBars("anFeatureChart",[...featureMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,value])=>({name:name.replaceAll("_"," "),value})),"No feature events.");
 anBars("anGenreChart",[...genreMap.entries()].sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value})),"No explicit genre selections.");
 const completionItems=[{name:"Completed",value:completionCount},{name:"Not completed",value:Math.max(0,playSessions.size-completionCount)}].filter(x=>x.value>0);
 anDonut("anCompletionChart",completionItems,"No movie play sessions to calculate completion.");
 anBars("anHealthChart",[{name:"Movie starts",value:plays.length},{name:"Playback errors",value:errors}],events.length?"No playback starts or errors in this selection.":"No data for this selection.");
 const days=[...dayMap.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-30),max=Math.max(1,...days.map(x=>x[1]));
 if(days.length){
  const w=660,h=220,pad=30,pts=days.map(([day,n],i)=>({x:pad+(days.length===1?0:i*(w-2*pad)/(days.length-1)),y:h-pad-n/max*(h-2*pad),day,n,users:(dayUsers.get(day)||new Set()).size}));
  const path=pts.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" ");
  $("anTrendChart").innerHTML='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Daily event activity chart"><path d="M'+pad+' '+pad+'V'+(h-pad)+'H'+(w-pad)+'" fill="none" stroke="#46505d"/><path d="'+path+'" fill="none" stroke="#ff8068" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+pts.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="#ff8068"><title>'+p.day+': '+p.n+' events; '+p.users+' active users</title></circle>').join("")+pts.filter((p,i)=>i===0||i===pts.length-1||i%Math.max(1,Math.floor(pts.length/6))===0).map(p=>'<text x="'+p.x+'" y="'+(h-7)+'" fill="#aab3bf" font-size="10" text-anchor="middle">'+p.day.slice(5)+'</text>').join("")+'</svg>';
 }else $("anTrendChart").innerHTML='<div class="an-empty">No dated events in this selection.</div>';
 renderAnalyticsTable(events);
}
function renderAnalyticsTable(events){
 const sort=$("anSort").value,rows=[...events];rows.sort((a,b)=>{
  if(sort==="newest"||sort==="oldest"){const d=(anDate(a)?.getTime()||0)-(anDate(b)?.getTime()||0);return sort==="newest"?-d:d}
  const val=e=>sort==="event"?(e.eventName||""):sort==="device"?(e.deviceType||"unknown"):anContext(e);
  return val(a).localeCompare(val(b));
 });
 const size=Number($("anRows").value)||25,pages=Math.max(1,Math.ceil(rows.length/size));analyticsPage=Math.min(analyticsPage,pages-1);const start=analyticsPage*size,shown=rows.slice(start,start+size);
 $("anRecent").innerHTML=shown.length?shown.map(e=>{const d=anDate(e);return '<tr><td style="white-space:nowrap">'+anEsc(d?d.toLocaleString():"Pending")+'</td><td><span class="an-chip">'+anEsc((e.eventName||"event").replaceAll("_"," "))+'</span></td><td>'+anEsc(anContext(e))+'</td><td>'+anEsc(anCategoryLabel(anCategory(e.eventName)))+'</td><td>'+anEsc(e.deviceType||"unknown")+'</td><td>'+anEsc(e.browser||"Other")+'</td></tr>'}).join(""):'<tr><td colspan="6"><div class="an-empty">No events match these filters.</div></td></tr>';
 $("anPageInfo").textContent=rows.length?"Showing "+(start+1)+"–"+Math.min(start+size,rows.length)+" of "+rows.length+" events":"Showing 0 rows";
 $("anPrev").disabled=analyticsPage<=0;$("anNext").disabled=analyticsPage>=pages-1;
}
async function loadAnalytics(){
 const statusEl=$("analyticsStatus");if(!db||!currentUser){statusEl.textContent="Sign in with the verified PlotLab owner account to view analytics.";return}
 if(analyticsUnsubscribe){analyticsUnsubscribe();analyticsUnsubscribe=null}if(analyticsUsersUnsubscribe){analyticsUsersUnsubscribe();analyticsUsersUnsubscribe=null}
 statusEl.textContent="Connecting securely to Firestore…";
 try{
  const q=query(collection(db,"analyticsEvents"),orderBy("createdAt","desc"));
  analyticsUnsubscribe=onSnapshot(q,snap=>{analyticsEventsCache=snap.docs.map(d=>({id:d.id,...d.data()}));renderAnalytics();statusEl.textContent="LIVE · audience and viewing metrics update when Firebase records change."},err=>{statusEl.textContent="Analytics could not load ("+(err.code||"error")+"): "+err.message+" · Check that deployed Firestore rules allow the owner to read analyticsEvents.";analyticsUnsubscribe=null});
  analyticsUsersUnsubscribe=onSnapshot(collection(db,"users"),snap=>{analyticsUsersCache=snap.docs.map(d=>({id:d.id,...d.data()}));renderBusinessAnalytics();},err=>{statusEl.textContent+=" User summary unavailable ("+(err.code||"error")+").";analyticsUsersUnsubscribe=null});
 }catch(e){statusEl.textContent="Analytics connection failed: "+e.message;analyticsUnsubscribe=null}
}
function resetAnalyticsFilters(){
 $("anRange").value="30";$("anFrom").value="";$("anTo").value="";$("anFrom").disabled=true;$("anTo").disabled=true;
 ["anCategoryFilter","anEventFilter","anDeviceFilter","anBrowserFilter"].forEach(id=>$(id).value="all");
 $("anMovieFilter").value="";$("anSort").value="newest";$("anRows").value="25";analyticsPage=0;renderAnalytics();
}
function exportAnalyticsCSV(){
 const rows=anFiltered(),headers=["createdAt","eventName","category","userId","sessionId","deviceType","browser","page","movieTitle","movieId","genre","section","watchSeconds","percent"];
 const quote=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
 const lines=[headers.join(","),...rows.map(e=>{const p=e.props||{},d=anDate(e);const vals=[d?d.toISOString():"",e.eventName,anCategoryLabel(anCategory(e.eventName)),e.userId,e.sessionId,e.deviceType,e.browser,e.page,p.movieTitle,p.movieId,p.genre,p.section,p.watchSeconds,p.percent];return vals.map(quote).join(",")})];
 const blob=new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="plotlab-analytics-"+new Date().toISOString().slice(0,10)+".csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
$("bizRange")?.addEventListener("change",()=>{if($("anRange"))$("anRange").value=$("bizRange").value;renderAnalytics()});
$("refreshAnalytics").addEventListener("click",loadAnalytics);
$("exportAnalytics").addEventListener("click",exportAnalyticsCSV);
$("clearAnalyticsFilters").addEventListener("click",resetAnalyticsFilters);
["anRange","anFrom","anTo","anCategoryFilter","anEventFilter","anDeviceFilter","anBrowserFilter","anSort","anRows"].forEach(id=>$(id).addEventListener("change",()=>{
 if(id==="anRange"){const custom=$("anRange").value==="custom";$("anFrom").disabled=!custom;$("anTo").disabled=!custom}
 analyticsPage=0;renderAnalytics();
}));
$("anMovieFilter").addEventListener("input",()=>{clearTimeout(analyticsFilterTimer);analyticsFilterTimer=setTimeout(()=>{analyticsPage=0;renderAnalytics()},220)});
$("anPrev").addEventListener("click",()=>{analyticsPage=Math.max(0,analyticsPage-1);renderAnalyticsTable(anFiltered())});
$("anNext").addEventListener("click",()=>{analyticsPage++;renderAnalyticsTable(anFiltered())});

onAuthStateChanged(auth,async u=>{if(!u||u.email!==OWNER){owner=null;currentUser=null;if(unsubscribe)unsubscribe();if(analyticsUnsubscribe)analyticsUnsubscribe();if(analyticsUsersUnsubscribe)analyticsUsersUnsubscribe();return}owner=u;currentUser=u;try{await loadSettingsAndMovies();await loadAnalytics()}catch(e){note("studioTrendingStatus","Could not load settings: "+(e.code||e.message))}});
