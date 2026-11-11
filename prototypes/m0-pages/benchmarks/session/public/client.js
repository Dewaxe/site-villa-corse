const account = document.querySelector("#account");
const invite = document.querySelector("#invite");
const status = document.querySelector("#status");

async function post(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

function action(id, run) {
  const button = document.querySelector(id);
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      status.textContent = await run();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

async function registerKey(path, input) {
  const options = await post(path + "/options", input);
  const credential = await navigator.credentials.create({
    publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
  });
  await post(path + "/verify", {
    ...input, challenge: options.challenge, response: credential.toJSON(),
  });
}

action("#register", async () => {
  await registerKey("/api/register", { account: account.value, invite: invite.value });
  invite.value = "";
  return "Clé ajoutée.";
});

action("#backup", async () => {
  await registerKey("/api/keys", {});
  return "Clé de secours ajoutée.";
});

const keys = document.querySelector("#keys");

action("#list", async () => {
  const response = await fetch("/api/keys");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  keys.replaceChildren(...result.map((id) => new Option(id, id)));
  return "Clés chargées.";
});

action("#revoke", async () => {
  if (!keys.value) return "Choisis une clé.";
  await post("/api/keys/revoke", { id: keys.value });
  keys.selectedOptions[0]?.remove();
  return "Clé révoquée.";
});

action("#login", async () => {
  const input = { account: account.value };
  const options = await post("/api/login/options", input);
  const credential = await navigator.credentials.get({
    publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
  });
  const result = await post("/api/login/verify", {
    ...input, challenge: options.challenge, response: credential.toJSON(),
  });
  return `Session ouverte pour ${result.account}.`;
});

action("#logout", async () => {
  await post("/api/logout", {});
  return "Session révoquée.";
});

const draftForm = document.querySelector("#draft-form");
const revisions = document.querySelector("#revisions");
let version;

async function loadRevisions(selected) {
  const response = await fetch("/api/articles");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  version = result.version;
  revisions.replaceChildren(...result.revisions.map(({ id, title }) => new Option(title, id)));
  if (selected ?? result.revision_id) revisions.value = selected ?? result.revision_id;
}

async function simpleWebP(blob) {
  const bytes = await blob.arrayBuffer();
  const view = new DataView(bytes);
  if (view.byteLength < 30 || view.getUint32(12) !== 0x56503858) return blob;

  // Chromium attaches an ICC profile to this opaque sRGB canvas.
  // Normalize only VP8X (ICC flag alone) + ICCP + VP8; reject other layouts server-side.
  if (view.getUint32(16, true) !== 10 || view.getUint8(20) !== 0x20 ||
      view.byteLength < 38 || view.getUint32(30) !== 0x49434350) return blob;
  const profileBytes = view.getUint32(34, true);
  const imageOffset = 38 + profileBytes + profileBytes % 2;
  if (imageOffset + 8 > bytes.byteLength || view.getUint32(imageOffset) !== 0x56503820) return blob;
  const imageBytes = view.getUint32(imageOffset + 4, true);
  if (imageOffset + 8 + imageBytes + imageBytes % 2 !== bytes.byteLength) return blob;

  const header = bytes.slice(0, 12);
  new DataView(header).setUint32(4, 4 + bytes.byteLength - imageOffset, true);
  return new Blob([header, bytes.slice(imageOffset)], { type: "image/webp" });
}

async function optimizeImage(file) {
  if (file.size > 10_000_000) throw new Error("Image source trop volumineuse.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  try {
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
  const image = blob?.type === "image/webp" ? await simpleWebP(blob) : null;
  if (!image || image.size > 250_000) {
    throw new Error("Impossible d’obtenir un WebP de 250 ko maximum.");
  }
  return image;
}

action("#save-draft", async () => {
  if (!draftForm.reportValidity()) return "Complète le brouillon.";
  const draft = new FormData(draftForm);
  draft.set("image", await optimizeImage(draft.get("image")), "image.webp");
  const response = await fetch("/api/articles/draft", { method: "POST", body: draft });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  await loadRevisions(result.id);
  return "Brouillon enregistré.";
});

action("#load-revisions", async () => {
  await loadRevisions();
  return "Révisions chargées.";
});

action("#publish", async () => {
  if (!revisions.value) return "Choisis une révision.";
  const result = await post("/api/articles/publish", { id: revisions.value, version });
  if (result.pending) {
    status.textContent = "Image en cours de validation…";
    const deadline = Date.now() + 5 * 60_000;
    let state;
    do {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await fetch("/api/articles/jobs/" + result.id);
      if (!response.ok) throw new Error("Suivi de validation indisponible.");
      state = await response.json();
      if (state.status === "failed") throw new Error("Image refusée. La version précédente reste en ligne.");
      if (state.status === "stale") throw new Error("Une version plus récente a été publiée.");
    } while (state.status === "pending" && Date.now() < deadline);
    if (state.status !== "published") return "Validation encore en cours. La version précédente reste en ligne.";
  }
  await loadRevisions();
  return "Révision publiée.";
});
