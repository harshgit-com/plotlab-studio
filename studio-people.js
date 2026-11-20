import {getApp} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {getFirestore,collection,getDocs} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
const OWNER="plotlab29@gmail.com",app=getApp("plotlab-studio-auth"),auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
let users=[],creators=[],ready=false;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date=v=>v?.toDate?v.toDate().toLocaleDateString():v?.seconds?new Date(v.seconds*1000).toLocaleDateString():v?new Date(v).toLocaleDateString():"Date unavailable";
function filtered(items,fields){const q=($("peopleSearch")?.value||"").trim().toLowerCase();return !q?items:items.filter(x=>fields.some(k=>String(x[k]??"").toLowerCase().includes(q)))}
function render(){
 const userRows=filtered(users,["name","email","role","uid","roles"]);
 const creatorRows=filtered(creators,["name","email","role","city","bio","portfolio"]);
 $("peopleUserCount").textContent=users.length.toLocaleString();$("peopleCreatorCount").textContent=creators.length.toLocaleString();
 $("peopleViewerCount").textContent=users.filter(u=>(u.roles||[u.role||"viewer"]).includes("viewer")).length.toLocaleString();
 $("peopleCreatorAccounts").textContent=users.filter(u=>(u.roles||[u.role||"viewer"]).includes("creator")).length.toLocaleString();
 $("peopleUsersLabel").textContent=userRows.length+" shown";$("peopleCreatorsLabel").textContent=creatorRows.length+" shown";
 $("peopleUsersList").innerHTML=userRows.length?userRows.map(u=>'<article class="catalogue-movie"><div class="activity-icon">♙</div><div><strong>'+esc(u.name||"PlotLab member")+'</strong><small>'+esc(u.email||"Email not recorded")+'</small><div class="catalogue-tags">'+(u.roles||[u.role||"viewer"]).map(r=>'<span>'+esc(r)+'</span>').join("")+'</div></div><span class="pill">'+esc(date(u.createdAt))+'</span></article>').join(""):'<div class="empty">'+(users.length?"No accounts match your search.":"No user records found.")+'</div>';
 $("peopleCreatorsList").innerHTML=creatorRows.length?creatorRows.map(c=>'<article class="card" style="padding:12px;background:#0d0e10"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><strong>'+esc(c.name||"Creator")+'</strong><small class="muted" style="display:block;margin-top:3px">'+esc(c.role||"Creator")+' · '+esc(c.city||"City not added")+'</small></div><span class="pill green">Profile</span></div><p class="muted" style="font-size:11px;line-height:1.5;margin:8px 0">'+esc(c.bio||"No bio added")+'</p><div style="display:flex;gap:10px;flex-wrap:wrap"><small class="muted">'+esc(c.email||"")+'</small>'+(c.portfolio?'<a href="'+esc(c.portfolio)+'" target="_blank" rel="noopener" style="color:#ff9a86;font-size:10px">Portfolio ↗</a>':"")+'</div></article>').join(""):'<div class="empty">'+(creators.length?"No creator profiles match your search.":"No creator profiles found.")+'</div>';
}
async function load(){
 if(!ready)return;$("peopleStatus").textContent="Loading users and creator profiles from Firestore…";
 try{const [u,c]=await Promise.all([getDocs(collection(db,"users")),getDocs(collection(db,"creatorProfiles"))]);users=u.docs.map(d=>({uid:d.id,...d.data()}));creators=c.docs.map(d=>({uid:d.id,...d.data()}));render();$("peopleStatus").textContent="Connected · "+users.length+" user records and "+creators.length+" creator profiles loaded."; }
 catch(e){$("peopleStatus").textContent="Could not load people: "+(e.code||e.message)+" · Verify owner access and Firestore rules.";console.error("[PlotLab Studio] People load failed",e);}
}
$("peopleRefresh")?.addEventListener("click",load);$("peopleSearch")?.addEventListener("input",render);
onAuthStateChanged(auth,async user=>{ready=false;if(!user)return;try{await user.getIdToken(true);const claims=(await user.getIdTokenResult()).claims||{};if(claims.email!==OWNER||claims.email_verified!==true||claims.firebase?.sign_in_provider!=="google.com")return;ready=true;await load()}catch(e){$("peopleStatus").textContent="Owner verification failed. Sign in again.";console.error(e)}});
