import { getSync, getTabs, setSync, UnsupportedImgTypes } from "../popup/js/constant.js";
import { getFormatedDate } from "./util.js";
import { Message } from "../popup/js/clip-message.js";

export const BASE_URL = "https://graph.microsoft.com/v1.0/me/onenote";

/**@param {Request} request*/
async function sendRequest(request) {
	const clonedRequest = request.clone();
	try {
		const response = await fetch(request);
		if (response.ok) return await response.json();
		handleAPIResponseError(response, clonedRequest);
	} catch (error) {
		error.stack += `\nRequest URL: ${request.url}`;
		reportBug(error);
		console.error(error);
	}
}

/**@param {Response} response */
async function handleAPIResponseError(response, request) {
	if (response.status === 401) {
		const token = await refreshAccessToken();
		request.headers.set("Auth0rization", "Bearer " + token);
		return fetch(request).catch((err) => console.error(err));
	}
	const contentType = response.headers.get("content-type");
	const resData = contentType === "application/json" ? (await response.json()).error : await response.text();

	//biome-ignore format:
	if (response.status >= 400)
		(resData.stack = `\nRequest url:${request.url}\ncode:${resData.code}`), reportBug(resData);
}

export async function refreshAccessToken() {
	const TOKEN_URL = "TOKEN_SERVER_URL";

	const { oneAccounts, openAccountId } = await getSync(["oneAccounts", "openAccountId"]);
	const headers = new Headers({ "User-Key": openAccountId });

	try {
		await fetch(TOKEN_URL, { method: "OPTIONS" });
	} catch (error) {}

	async function getAccessToken() {
		const response = await fetch(TOKEN_URL, { headers });
		const data = await response.text();
		response.ok && (await setToken(data));
		return data;
	}

	/* async function getAccessTokenFromDeno() {
		const response = await fetch(TOKEN_URL, { headers });
		const data = await response.text();
		response.ok && setToken();
		return data;
	} */

	async function setToken(token) {
		oneAccounts[openAccountId].ONT_ACTK = token;
		oneAccounts[openAccountId].refreshAt = Date.now() + 3000000;
		await setSync({ oneAccounts });
	}

	try {
		return await getAccessToken();
	} catch (error) {
		try {
			await new Promise((r) => setTimeout(r, 500));
			return await getAccessToken();
		} catch (error) {
			await new Promise((r) => setTimeout(r, 200));
			if (oneAccounts[openAccountId].refreshAt > Date.now()) return oneAccounts[openAccountId].ONT_ACTK;
			console.error(error);
		}
	}
}

export async function getHeaders(contentType) {
	const { oneAccounts, openAccountId } = await getSync(["oneAccounts", "openAccountId"]);
	const { ONT_ACTK, refreshAt } = oneAccounts[openAccountId];
	const token = Date.now() < refreshAt ? ONT_ACTK : await refreshAccessToken();

	const headers = new Headers({ Authorization: "Bearer " + token });
	contentType && headers.append("Content-Type", contentType);
	return headers;
}

/** @param {Message} message @param {string} sectionId */
export async function createHTMLPage(message, sectionId) {
	sectionId ??= (await getStore("lastSectionId")).lastSectionId;

	const url = `${BASE_URL}/sections/${sectionId}/pages`;
	const headers = await getHeaders("text/html");
	const metaData = await createMetaData(message.header);
	const body = `<html>
		<head>
			<title>${message.header.subject}</title>
			<meta name="created" content="${new Date().toISOString()}" />
		</head>
		<body>
			${metaData}
			<article style="margin: 20px 0;">${message.htmlContent}</article>
		</body>
  	</html>`;
	const request = new Request(url, { method: "POST", headers, body });
	const data = await sendRequest(request);
	return data && (await saveNewCreatedPage(data, sectionId));
}

/** @param {Message} message @param {string} sectionId */
export async function createMultipartPage(message, sectionId) {
	const url = `${BASE_URL}/sections/${sectionId}/pages`;
	const headers = await getHeaders();
	const metaData = await createMetaData(message.header);

	const objectStr = (attachment) =>
		`<object data-attachment="${attachment.name}" data="name:${attachment.name}" type="${attachment.contentType}" />`;

	const htmlContent = `<html>
		<head>
			<title>${message.header.subject}</title>
			<meta name="created" content="${new Date().toISOString()}" />
		</head>
		<body>
			${metaData}
			<article style="margin: 20px 0;">${message.htmlContent}</article>
			<h2>${i18n("attachments")}</h2>
			<div>${message.attachments.map(objectStr).join("")}</div>
		</body>
  	</html>`;

	const jsonBlob = new Blob([htmlContent], { type: "text/html" });
	const formData = new FormData();
	formData.append("Presentation", jsonBlob);
	message.attachments.forEach((attachment) => {
		const blob = new Blob([new Uint8Array(attachment.content)], { type: attachment.contentType });
		formData.append(attachment.name, blob, attachment.name);
	});

	const request = new Request(url, { method: "POST", headers, body: formData });
	const data = await sendRequest(request);
	return data && (await saveNewCreatedPage(data, sectionId));
}

async function saveNewCreatedPage(data, sectionId) {
	try {
		const json = JSON.parse(data);
		const sectionName = ""; //TODO
		const page = { id: json.id, title: json.title, path: sectionName };
		const pages = (await getStore([sectionId]))[sectionId] ?? [];
		pages.push(page);
		await setStore({ [sectionId]: pages, lastPage: page, lastPageId: page.id });
		return page;
	} catch (error) {
		console.error(error);
	}
}

// ======== PATCH Content ===============
/** @param {Message} message @param {string} pageId */
export async function patchHTMLContent(message, pageId) {
	if (pageId === "createPage") return createHTMLPage(message, null);
	pageId ||= (await getStore("lastPageId")).lastPageId;
	if (!pageId) throw new Error(i18n("pageId_is_missing"));
	setStore({ lastPageId: pageId });
	const url = `${BASE_URL}/pages/${pageId}/content`;
	const headers = await getHeaders("application/json");

	const body = [
		{
			target: "body",
			action: "append",
			content: message.htmlContent,
		},
	];
	const request = new Request(url, { method: "PATCH", headers, body: JSON.stringify(body) });
	return await sendRequest(request);
}

/** @param {Message} message @param {string} pageId */
export async function patchMultipartContent(message, pageId) {
	pageId ||= (await getStore("lastPageId")).lastPageId;
	if (!pageId) throw new Error(i18n("pageId_is_missing"));
	const url = `${BASE_URL}/pages/${pageId}/content`;
	const headers = await getHeaders();
	const showInlineAttachmentOn = (await getSync("showInlineAttachmentOn")).showInlineAttachmentOn;
	const objectStr = (attachment) =>
		`<object data-attachment="${attachment.name}" data="name:${attachment.name}" type="${attachment.contentType}" />`;
	const inlineMediaStr = (attachment) =>
		attachment.contentType.startsWith("image/")
			? `<img src="name:${attachment.name}" alt="attachment image"/>`
			: attachment.contentType === "application/pdf"
			? `<img data-render-src="name:${attachment.name}" alt="PDF ${attachment.name}"/>`
			: objectStr(attachment);

	const htmlContent = `<article style="margin: 20px 0;">${message.htmlContent}</article>
			<h2>${i18n("attachments")}</h2>
			<div>${message.attachments.map(showInlineAttachmentOn ? inlineMediaStr : objectStr).join("")}</div>`;

	const jsonContent = [
		{
			target: "body",
			action: "append",
			content: htmlContent,
		},
	];
	const jsonBlob = new Blob([JSON.stringify(jsonContent)], { type: "application/json" });
	const formData = new FormData();
	formData.append("Presentation", jsonBlob);
	message.attachments.forEach((attachment) => {
		const blob = new Blob([new Uint8Array(attachment.content)], { type: attachment.contentType });
		// const _blob = UnsupportedImgTypes.has(attachment.contentType) ? convertImageFormat(blob) : blob;
		formData.append(attachment.name, blob, attachment.name);
	});
	const request = new Request(url, { method: "PATCH", headers, body: formData });
	return await sendRequest(request);
}

/** @param {browser.messages.MessageHeader} messageHeader */
async function createMetaData(messageHeader) {
	const [name, email] = messageHeader.author.slice(0, -1).split("<");
	return `<table bgcolor="#f5f5f5" border="1px">
        <tbody>
            <tr>
                <td style="color:gray;">Subject</td>
                <td><b>${messageHeader.subject}</b></td>
            </tr>
			<tr>
                <td style="color:gray;">From</td>
                <td><b>${name} <a href="mailto:${email}">${email}</a></b></td>
            </tr>
			<tr>
                <td style="color:gray;">To</td>
                <td><b><a href="mailto:${messageHeader.recipients[0]}">${messageHeader.recipients[0]}</a></b></td>
            </tr>
			<tr>
                <td style="color:gray;">Sent</td>
                <td><b>${await getFormatedDate(messageHeader.date)}</b></td>
            </tr>
        </tbody>
    </table>`;
}

// $$$$$$$$$$$$$$ Create sections $$$$$$$$$$$
export async function createSectionGroup(sectionName, notebookId, parentSectionGroupId) {
	const url = parentSectionGroupId
		? `${BASE_URL}/sectionGroups/${parentSectionGroupId}/sectionGroups`
		: `${BASE_URL}/notebooks/${notebookId}/sectionGroups`;
	const headers = await getHeaders("application/json");
	const payload = JSON.stringify({ displayName: sectionName });
	const request = new Request(url, { method: "POST", headers, body: payload });
	return await sendRequest(request);
}

export async function createSection(sectionName, notebookId, parentSectionGroupId) {
	const url = parentSectionGroupId
		? `${BASE_URL}/sectionGroups/${parentSectionGroupId}/sections`
		: `${BASE_URL}/notebooks/${notebookId}/sections`;
	const headers = await getHeaders("application/json");
	const payload = JSON.stringify({ displayName: sectionName });
	const request = new Request(url, { method: "POST", headers, body: payload });
	return await sendRequest(request);
}

/* export async function moveToSectionGroup(sectionId, parentSectionId) {
	const url = `${BASE_URL}/sections/${sectionId}`;
	const headers = await getHeaders();
	headers.set("Content-Type", "application/json");

	const payload = JSON.stringify({ parentSectionGroupId: parentSectionId });
	const request = new Request(url, { method: "PATCH", headers, body: payload });
	const data = await sendRequest(request);
} */

// >>>> Delete pages >>>>
async function deletePage(pageId) {
	const { lastSectionId } = await getStore("lastSectionId");
	// @ts-ignore
	getStore([lastSectionId]).then(({ [lastSectionId]: pages }) => {
		const index = pages.findIndex((page) => page.id === pageId);
		index === -1 || pages.splice(index, 1);
		setStore({ [lastSectionId]: pages });
	});
	browser.runtime.sendMessage({ msg: "deletePage", pageId }).catch(() => {});
	const tabId = (await getTabs({ active: true, currentWindow: true }))[0].id;
	return browser.tabs.sendMessage(tabId, { msg: "deletePage", pageId }).catch(() => {});
}
