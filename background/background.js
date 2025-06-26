import { getSync, setSync } from "../popup/js/constant.js";
import { getNoteBookSections, getSectionPages, getNoteBookList, onAccountSwitch } from "./api-get-request.js";
import {
	createSectionGroup,
	createSection,
	createHTMLPage,
	patchMultipartContent,
	patchHTMLContent,
	refreshAccessToken,
	createMultipartPage,
} from "./api-request.js";
import { addUserAccount, updateSectionPages } from "./util.js";

globalThis.getStore = browser.storage.local.get.bind(browser.storage.local);
globalThis.setStore = browser.storage.local.set.bind(browser.storage.local);
// @ts-ignore
globalThis.i18n = browser.i18n.getMessage.bind(this);

const MessageHandler = {
	switchNotebook: (request, _) =>
		getNoteBookSections(request.notebookId).then((sections) => getSectionPages(sections[0].id)),

	getNoteBookList: () => getNoteBookList(),

	getNoteBookSections: (request) => getNoteBookSections(request.notebookId),

	getSectionPages: (request) => getSectionPages(request.sectionId),

	createSectionGroup: (request) => createSectionGroup(request.name, request.notebookId, request.parentSectionGroupId),

	createSection: (request) => createSection(request.name, request.notebookId, request.parentSectionGroupId),

	switchAccount: () => onAccountSwitch(),
};

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.message) {
		const promise = request.sectionId
			? request.message.attachments?.length > 0
				? createMultipartPage(request.message, request.sectionId)
				: createHTMLPage(request.message, request.sectionId)
			: request.message.attachments?.length > 0
			? patchMultipartContent(request.message, request.pageId, request.images)
			: patchHTMLContent(request.message, request.pageId);
		promise.then(sendResponse).catch((err) => sendResponse({ errCaused: err.message }));
		return true;
	} else if (MessageHandler[request.msg]) {
		MessageHandler[request.msg](request, sender)
			.then(sendResponse)
			.catch((err) => sendResponse({ errCaused: err.message }));
		return true;
	} else if (request.error) {
		request.error.stack += sender.tab.url;
		// sendCollectedBug(request.error);
	} else if (request === "onenote-connected") onOneNoteConnected();
});

//command-handler
const commands = {
	clip_message: () => {},
};
browser.commands.onCommand.addListener((cmd) => commands[cmd]?.());

//On Startup
browser.runtime.onStartup.addListener(async () => {
	const { oneAccounts, openAccountId } = await getSync(["oneAccounts", "openAccountId"]);
	if (oneAccounts[openAccountId].UDI_TKN === undefined) return;

	const { openNotebook } = await getStore("openNotebook");
	if (!openNotebook) return;
	await refreshAccessToken();
	updateSectionPages(openNotebook);
});

//Listen External Message to save oneNote Detail
export async function onOneNoteConnected() {
	const notebooks = await getNoteBookList();
	const sections = await getNoteBookSections(notebooks[0].id);
	setStore({ lastSectionId: sections[0].id });
	getSectionPages(sections[0].id);
}

//onInstall and onUpdate
export const setInstallation = ({ reason }) => {
	async function oneTimeInstall() {
		const extOrigin = location.origin;
		const extUserId = crypto.randomUUID();
		setStore({ extOrigin, extUserId });
		setSync({
			articleClipType: "full_page",
			fileNameFormat: "subject",
			dateFormat: '{ "dateStyle": "full" }',
			showInlineAttachmentOn: false,
			OTA_KI: crypto.randomUUID(),
			VM_CTY: crypto.randomUUID(),
			TAG_ORE: crypto.randomUUID(),
		});
		const accountId = crypto.randomUUID();
	}
	reason === "install" && oneTimeInstall();
	reason === "update" && onUpdate();

	async function onUpdate() {}
};
// installation setup
browser.runtime.onInstalled.addListener(setInstallation);
