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

action("#register", async () => {
  const input = { account: account.value, invite: invite.value };
  const options = await post("/api/register/options", input);
  const credential = await navigator.credentials.create({
    publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
  });
  await post("/api/register/verify", {
    ...input, challenge: options.challenge, response: credential.toJSON(),
  });
  invite.value = "";
  return "Clé ajoutée.";
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
