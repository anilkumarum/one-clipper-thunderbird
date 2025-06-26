import { getSync, setSync } from "../js/constant.js";
import { addUserAccount } from "../../background/util.js";
import { ConnectOnenote } from "./connect-onenote.js";
import { ProgressDialog } from "./progress-dialog.js";

export class AccountSwitch extends HTMLElement {
	constructor() {
		super();
	}

	async addAccount() {
		await addUserAccount(crypto.randomUUID());
		ConnectOnenote.oneNoteRedirect();
	}

	async updateAccountName(accountId, event) {
		event.target.setAttribute("contenteditable", "false");
		const name = event.target.textContent.trim();
		const { oneAccounts } = await getSync("oneAccounts");
		oneAccounts[accountId].name = name;
		setSync({ oneAccounts });
		this.lastElementChild["togglePopover"]();
		this.selectedElem.contains(event.target) && (this.firstElementChild["value"] = name);
	}

	actions = {
		edit: (/** @type {HTMLLIElement} */ liElem) => {
			const titleInput = liElem.firstElementChild;
			titleInput.setAttribute("contenteditable", "true");
			titleInput["focus"]();
			getSelection().getRangeAt(0).selectNodeContents(titleInput);

			const updateNameFn = this.updateAccountName.bind(this, liElem.id);
			const onInput = (event) => {
				if (event.inputType === "insertParagraph") {
					this.updateAccountName(liElem.id, event);
					titleInput.removeEventListener("beforeinput", onInput);
					titleInput.removeEventListener("blur", updateNameFn);
					event.preventDefault();
				}
			};
			titleInput.addEventListener("beforeinput", onInput);
			titleInput.addEventListener("blur", updateNameFn, { once: true });
		},

		delete: async (/** @type {HTMLLIElement} */ liElem) => {
			const { oneAccounts } = await getSync("oneAccounts");
			delete oneAccounts[liElem.id];
			setSync({ oneAccounts });
			liElem.hasAttribute("selected") && this.switchAccount(this.lastElementChild.firstElementChild);
			liElem.remove();
			this.lastElementChild["togglePopover"]();
			toast(i18n("account_removed"));
		},
	};

	async switchAccount(liElem) {
		const name = liElem.firstElementChild.textContent.trim();
		this.firstElementChild["value"] = name;
		this.selectedElem = liElem;
		this.selectedElem.setAttribute("selected", "");
		await setSync({ openAccountId: liElem.id });
		toast(`Fetching ${name} notebooks...`);
		setTimeout(() => document.body.appendChild(new ProgressDialog()), 3000);
		browser.runtime.sendMessage("closeSidePanel").catch(() => {});
		await browser.runtime.sendMessage({ msg: "switchAccount" });
		location.reload();
	}

	onClick({ target }) {
		const liElem = target.closest("li");
		const svg = target.closest("svg");
		if (svg) return this.actions[svg.getAttribute("class")](liElem);

		if (liElem.id === "add-account") return this.addAccount();
		if (liElem === this.selectedElem) return;
		this.selectedElem.removeAttribute("selected");
		this.lastElementChild["togglePopover"]();
		this.switchAccount(liElem);
	}

	render(oneAccounts, openAccountName) {
		const ids = Object.keys(oneAccounts);
		const accountElem = (account, index) => `<li id=${ids[index]}>
					<span>${account.name}</span>
					<svg class="edit" viewBox="0 0 24 24"><path /></svg>
					<svg class="delete" viewBox="0 0 24 24"><path /></svg>
				</li>`;

		return `<input type="button" popovertarget="switch-account" value="${openAccountName}" /><svg class="chev-down" viewBox="0 0 24 24"><path /></svg>
			<menu id="switch-account" popover>
                ${Object.values(oneAccounts).map(accountElem).join("")}
                <li id="add-account">➕ ${i18n("add_account")}</li>
			</menu>`;
	}

	async connectedCallback() {
		const { oneAccounts, openAccountId } = await getSync(["oneAccounts", "openAccountId"]);
		this.innerHTML = this.render(oneAccounts, oneAccounts[openAccountId].name);
		this.selectedElem = document.getElementById(openAccountId);
		this.selectedElem.setAttribute("selected", "");
		$on(this.children[1], "click", () => this.lastElementChild["showPopover"]());
		$on(this.lastElementChild, "click", this.onClick.bind(this));
	}
}

customElements.define("account-switch", AccountSwitch);
