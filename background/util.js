import { getSync, getTabs, setSync } from "../popup/js/constant.js";
import { getSectionPages } from "./api-get-request.js";

export const crtTab = async () => (await browser.tabs.query({ currentWindow: true, active: true }))[0];

export async function addUserAccount(accountId) {
	const oneAccounts = (await getSync("oneAccounts")).oneAccounts ?? {};
	// @ts-ignore
	const OAT_KTC = btoa(crypto.getRandomValues(new Uint8Array(16)));
	const SUN_RAY = crypto.randomUUID();
	const account1 = { name: "Account " + (Object.keys(oneAccounts).length + 1), SUN_RAY, OAT_KTC };
	oneAccounts[accountId] = account1;
	setSync({ oneAccounts, openAccountId: accountId });
}

export async function updateSectionPages(noteBook) {
	const sections = (await getStore(noteBook))[noteBook];
	if (!sections) return;
	const lastSectionId = (await getStore("lastSectionId")).lastSectionId;
	updateSectionPageList(sections);

	function updateSectionPageList(sections) {
		sections.forEach(async (section) => {
			if (section.sections) return updateSectionPageList(section.sections);
		});
	}
}

export async function getFormatedDate(date) {
	let formatInfo = (await browser.storage.sync.get("dateFormat")).dateFormat;
	if (formatInfo === "yyyy-mm-dd") return new Date(date).toISOString().slice(0, 10);
	formatInfo = formatInfo ? JSON.parse(formatInfo) : { dateStyle: "medium" };
	delete formatInfo.timeStyle;
	return new Date(date).toLocaleDateString("default", formatInfo);
}
