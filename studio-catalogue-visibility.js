import { getApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const OWNER_EMAIL = "plotlab29@gmail.com";
const app = getApp("plotlab-studio-auth");
const auth = getAuth(app);
const db = getFirestore(app);
const toggle = document.getElementById("catalogueVisibilityToggle");
const badge = document.getElementById("catalogueVisibilityBadge");
const status = document.getElementById("catalogueVisibilityStatus");

function setStatus(message) {
  if (status) status.textContent = message;
}
function showState(hidden) {
  if (toggle) toggle.checked = hidden;
  if (badge) {
    badge.textContent = hidden ? "Movies hidden" : "Movies visible";
    badge.className = "pill " + (hidden ? "red" : "green");
  }
  setStatus(hidden
    ? "The public movie catalogue is hidden. Your movie records are preserved."
    : "The public movie catalogue is visible. Turn this on to hide all published movies.");
}
async function readSetting() {
  setStatus("Checking the current public setting…");
  try {
    const snap = await getDoc(doc(db, "siteSettings", "public"));
    showState(snap.exists() && snap.data().catalogueHidden === true);
  } catch (error) {
    setStatus("Could not read the setting (" + (error.code || error.message) + "). Check Firestore permissions.");
    if (badge) { badge.textContent = "Connection issue"; badge.className = "pill red"; }
  }
}
onAuthStateChanged(auth, async user => {
  if (!user || user.email !== OWNER_EMAIL) {
    if (toggle) { toggle.disabled = true; toggle.checked = false; }
    if (badge) { badge.textContent = "Owner sign-in required"; badge.className = "pill orange"; }
    setStatus("Sign in to PlotLab Studio with the authorised owner Google account to manage public visibility.");
    return;
  }
  if (toggle) toggle.disabled = false;
  await readSetting();
});
toggle?.addEventListener("change", async () => {
  const user = auth.currentUser;
  if (!user || user.email !== OWNER_EMAIL) {
    toggle.checked = !toggle.checked;
    setStatus("Owner access is required.");
    return;
  }
  const hide = toggle.checked;
  if (hide && !window.confirm("Hide every published movie from the public PlotLab website? Movie records will not be deleted.")) {
    toggle.checked = false;
    return;
  }
  toggle.disabled = true;
  setStatus("Saving the public visibility setting…");
  try {
    const settingRef = doc(db, "siteSettings", "public");
    const previous = await getDoc(settingRef);
    const wasHidden = previous.exists() && previous.data().catalogueHidden === true;
    await setDoc(settingRef, {
      catalogueHidden: hide,
      catalogueVisibilityUpdatedAt: serverTimestamp(),
      catalogueVisibilityUpdatedBy: user.email
    }, { merge: true });
    await addDoc(collection(db, "adminActivity"), {
      action: hide ? "All movies hidden from public site" : "Public movie catalogue restored",
      target: "Public movie catalogue",
      changes: { catalogueHidden: { before: wasHidden, after: hide } },
      actor: user.email,
      createdAt: serverTimestamp()
    });
    showState(hide);
    if (window.toast) window.toast(hide ? "Public movies hidden." : "Public movies restored.");
  } catch (error) {
    toggle.checked = !hide;
    setStatus("Could not save the setting (" + (error.code || error.message) + "). Check Firestore permissions.");
    if (badge) { badge.textContent = "Save failed"; badge.className = "pill red"; }
  } finally {
    toggle.disabled = false;
  }
});
