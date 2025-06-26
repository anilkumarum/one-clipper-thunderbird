import { BASE_URL, getHeaders, refreshAccessToken } from "./api-request.js";
import { reportBug } from "./util.js";

/** @param {Request} request */
async function getRequest(request) {
	try {
		const response = await fetch(request);
		if (response.ok) return await response.json();
		handleAPIResponseError(response, request.url);
	} catch (error) {
		console.error(error);
		reportBug(error);
	}
}

/**@param {Response} response */
async function handleAPIResponseError(response, url) {
	if (response.status === 401) return refreshAccessToken();
	const contentType = response.headers.get("content-type");
	const resData = contentType === "application/json" ? (await response.json()).error : await response.text();
	if (resData.code === "20102") return url.includes("/sections/") && deleteSection(url.slice(53, 105));
	if (resData.code === "10007") return;
	response.status >= 400 && reportBug(resData);
}

export async function getNoteBookList() {
	const url = `${BASE_URL}/notebooks`;
	const headers = await getHeaders();
	const request = new Request(url, { method: "GET", headers });
	const data = await getRequest(request);
	if (!data) return;
	const notebooks = data.value.map((notebook) => ({ id: notebook.id, name: notebook.displayName }));
	const storeData = { notebooks, openNotebook: notebooks[0]?.id };
	data.value.forEach((notebook) => {
		storeData[notebook.id] = Array.isArray(notebook.sections) ? insertSections(notebook.sections) : [];
		Array.isArray(notebook.sectionGroups) && insertSectionGroups(notebook.sectionGroups, storeData[notebook.id]);
	});

	storeData.lastSectionId = storeData[notebooks[0]?.id]?.[0]?.id;
	storeData.lastSectionName = storeData[notebooks[0]?.id]?.[0]?.name;
	await setStore(storeData);
	return notebooks;
}

function insertSections(sections) {
	return sections.map((section) => ({
		id: section.id,
		name: section.displayName,
		updatedAt: section.lastModifiedDateTime,
	}));
}

function insertSectionGroups(sectionGroups, sections) {
	for (const sectGroup of sectionGroups) {
		const sectionGroup = {
			id: sectGroup.id,
			name: sectGroup.displayName,
			updatedAt: sectGroup.lastModifiedDateTime,
			sections: Array.isArray(sectGroup.sections) ? insertSections(sectGroup.sections) : [],
		};
		sections.push(sectionGroup);
		Array.isArray(sectGroup.sectionGroups) && insertSectionGroups(sectGroup.sectionGroups, sectionGroup.sections);
	}
}

/** @param {string} notebookId */
export async function getNoteBookSections(notebookId) {
	const url = `${BASE_URL}/notebooks/${notebookId}`;
	const headers = await getHeaders();
	const request = new Request(url, { method: "GET", headers });
	const notebook = await getRequest(request);
	if (!notebook) return;

	const sections = Array.isArray(notebook.sections) ? insertSections(notebook.sections) : [];
	Array.isArray(notebook.sectionGroups) && insertSectionGroups(notebook.sectionGroups, sections);
	await setStore({ [notebookId]: sections, lastSectionId: sections[0].id, lastSectionName: sections[0].name });
	return sections;
}

/**@param {string} sectionId*/
export async function getSectionPages(sectionId) {
	if (!sectionId) throw new Error("Section Id is not provided");
	const url = `${BASE_URL}/sections/${sectionId}/pages`;
	const headers = await getHeaders();
	const request = new Request(url, { method: "GET", headers });
	const data = await getRequest(request);
	if (!data) return;
	const pages = data.value;
	setStore({ [sectionId]: pages });
	return pages;
}

export async function onAccountSwitch() {
	try {
		await browser.storage.local.remove(["openNotebook", "lastSectionId", "lastPageId"]);

		const notebooks = await getNoteBookList();
		if (notebooks.length === 0) return;
		const { lastSectionId } = await getStore("lastSectionId");
		if (!lastSectionId) return;
		const pages = await getSectionPages(lastSectionId);
	} catch (error) {
		console.error(error);
		browser.runtime.sendMessage({ msg: "notifyError", error: error.message });
	}
}

// Delete Section
export async function deleteSection(sectionId) {
	function traverseSections(sections) {
		sections.forEach((section, index) => {
			if (!section.sections) return;
			if (section.id === sectionId) return sections.splice(index, 1);
			else traverseSections(section.sections);
		});
	}

	const notebookId = (await getStore("openNotebook")).openNotebook;
	const sections = (await getStore(notebookId))[notebookId];
	traverseSections(sections);
}
