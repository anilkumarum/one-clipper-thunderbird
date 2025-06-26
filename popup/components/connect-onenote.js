import { getSync, setSync } from "../js/constant.js";

const DOMAIN = "SERVER_URL";

export class ConnectOnenote extends HTMLDialogElement {
	constructor() {
		super();
	}

	static async oneNoteRedirect() {
		const index = (await browser.tabs.query({ active: true, lastFocusedWindow: true }))[0].index;
		const { oneAccounts, openAccountId } = await getSync(["oneAccounts", "openAccountId"]);
		const s = oneAccounts[openAccountId].SUN_RAY;
		//prettier-ignore
		const REDIRECT_PAGE = `${DOMAIN}/authorize/connect-one-note?r=${crypto.randomUUID()}&s=${s}&u=${openAccountId}&e=${browser.runtime.id}`;
		browser.tabs.create({ url: REDIRECT_PAGE, index: index + 1 });
	}

	render() {
		return `<style>
			#connect-onenote {
				padding: 0;
				scrollbar-width: thin;
			
				& > * {
					padding-inline: 0.5em;
				}

				& img{
					padding-inline: 0;
				}

				& button{
					display: block;
					margin: 0.5em auto;
					padding: 0.5em;
					font-size: 1em;
				}
			}
		</style>
		<img src="https://live.staticflickr.com/65535/53744921859_2b122b4c26.jpg" alt="" style="width:100%"   />
			<h2>🔐 ${i18n("connection_required")}</h2>
			<p>
				${i18n("give_access_to_oneclipper")}
			</p>

			<details>
				<summary>${i18n("privacy_policy")}</summary>
				<ul>
					<li>${i18n("we_dont_read_any_files")}</li>
					<li>${i18n("we_dont_edit_any_files")}</li>
					<li>${i18n("we_dont_save_any_user_personal_info")}</li>
				</ul>
			</details>
			<details>
				<summary>${i18n("one_note_permission")}</summary>
				<ol>
					<li> <b>Create pages in your OneNote notebooks</b></li>
					<li> <b>View and modify your OneNote notebooks</b></li>
					<li> <b>View and modify OneNote notebooks</b> </li>
					<li> <b>Access your info anytime</b>: ${i18n("oAuth_token_expires_in_1hour")}</li>
				</ol>
			</details>
		<button>${i18n("connect_with_onenote")}</button>`;
	}

	connectedCallback() {
		this.id = "connect-onenote";
		this.innerHTML = this.render();
		this.showModal();
		this.lastElementChild.addEventListener("click", ConnectOnenote.oneNoteRedirect);
		this.listenMsg();
	}

	listenMsg() {
		browser.runtime.onMessage.addListener((msg) => {
			if (msg === "onenote-connected") {
				document.addEventListener("visibilitychange", () => toast("onenote connected"), { once: true });
				this.remove();
			}
		});
	}
}

customElements.define("connect-onenote", ConnectOnenote, { extends: "dialog" });

export async function checkOAuthUserExist() {
	const TOKEN_URL = DOMAIN + "/api/get-onenote-token";
	const { oneAccounts, openAccountId } = await getSync(["oneAccounts", "openAccountId"]);

	async function getAccessToken() {
		const response = await fetch(TOKEN_URL, { headers: { "User-Key": openAccountId } });
		const data = await response.text();
		if (response.status === 403 && data === "User doesn't exist") return false;
		oneAccounts[openAccountId].UDI_TKN = crypto.randomUUID();
		await setSync({ oneAccounts });
		toast("Please reopen popup after 1 min");
		browser.runtime.sendMessage("onenote-connected").catch((err) => console.error(err));
		return true;
	}

	try {
		return await getAccessToken();
	} catch (error) {
		try {
			await new Promise((r) => setTimeout(r, 1000));
			return await getAccessToken();
		} catch (error) {
			console.error(error);
		}
	}
}
