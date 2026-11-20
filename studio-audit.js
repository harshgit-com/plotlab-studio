import {getApp} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {getFirestore,collection,getDocs} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
const OWNER="plotlab29@gmail.com",app=getApp("plotlab-studio-auth"),auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
let events=[],ready=false;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function asDate(v){if(v?.toDate)return v.toDate();if(v?.seconds)return new Date(v.seconds*1000);if(v)return new Date(v);return null}
function render(){
 const q=($("activitySearch")?.value||"").trim().toLowerCase(),rows=events.filter(e=>[e.action,e.target,e.actor,JSON.stringify(e.changes||{})].some(v=>String(v||"").toLowerCase().includes(q)));
 const day=Date.now()-86400000;const latest=events[0],latestDate=asDate(latest?.createdAt);
 $("activityTotal").textContent=events.length.toLocaleString();$("activityToday").textContent=events.filter(e=>(asDate(e.createdAt)?.getTime()||0)>=day).length.toLocaleString();
 $("activityTypes").textContent=new Set(events.map(e=>e.action||"Unknown")).size.toLocaleString();$("activityLatest").textContent=latestDate?latestDate.toLocaleDateString():"—";
 $("activityRows").innerHTML=rows.length?rows.slice(0,500).map(e=>{const d=asDate(e.createdAt),details=e.changes?JSON.stringify(e.changes):"";return "<tr><td>"+esc(d?d.toLocaleString():"—")+"</td><td><b>"+esc(e.action||"Admin action")+"</b></td><td>"+esc(e.target||"—")+"</td><td>"+esc(e.actor||"—")+"</td><td title='"+esc(details)+"'>"+esc(details.length>130?details.slice(0,127)+"…":details||"—")+"</td></tr>"}).join(""):'<tr><td colspan="5" class="empty">'+(events.length?"No matching activity.":"No audit records have been recorded yet.")+'</td></tr>';
 $("activityStatus").textContent="Showing "+Math.min(rows.length,500)+" of "+rows.length+" matching audit records · newest first.";
}
async function load(){if(!ready)return;$("activityStatus").textContent="Loading immutable adminActivity records…";try{const snap=await getDocs(collection(db,"adminActivity"));events=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(asDate(b.createdAt)?.getTime()||0)-(asDate(a.createdAt)?.getTime()||0));render()}catch(e){$("activityStatus").textContent="Could not load audit records: "+(e.code||e.message)+" · Check owner read permission.";console.error("[PlotLab Studio] Audit load failed",e)}}
$("activityRefresh")?.addEventListener("click",load);$("activitySearch")?.addEventListener("input",render);
onAuthStateChanged(auth,async user=>{ready=false;if(!user)return;try{await user.getIdToken(true);const claims=(await user.getIdTokenResult()).claims||{};if(claims.email!==OWNER||claims.email_verified!==true||claims.firebase?.sign_in_provider!=="google.com")return;ready=true;await load()}catch(e){$("activityStatus").textContent="Owner verification failed.";console.error(e)}});
