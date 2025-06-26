import { ProgressDialog } from "../components/progress-dialog.js";

export async function onNotebookSwitch({ target }) {
	const notebookId = target.value;
	let { [notebookId]: sections } = await getStore([notebookId]);
	if (!sections) {
		document.body.appendChild(new ProgressDialog());
		sections = await browser.runtime.sendMessage({ msg: "switchNotebook", notebookId: notebookId });
		fireEvent(document.body, "progresscompleted");
	} else await setStore({ lastSectionId: sections[0].id, lastSectionName: sections[0].name });
	await setStore({ openNotebook: notebookId });
}

export async function fetchNotebooks() {
	document.body.appendChild(new ProgressDialog());
	const notebooks = await browser.runtime.sendMessage({ msg: "getNoteBookList" });
	notebooks && insertNotebooks(notebooks);
	const notebookId = notebooks[0].id;
	let { [notebookId]: sections } = await getStore([notebookId]);

	fireEvent(document.body, "progresscompleted");
}

export async function refreshNotebooks({ currentTarget }) {
	currentTarget.setAttribute("refreshing", "");
	toast("Refreshing...");
	const notebooks = await browser.runtime.sendMessage({ msg: "getNoteBookList" });
	notebooks && insertNotebooks(notebooks);
	const notebookId = notebooks[0].id;
	let { [notebookId]: sections } = await getStore([notebookId]);
	eId("section-tree")?.onNotebookSwitch(notebookId, sections);
	currentTarget.removeAttribute("refreshing");
}

export async function insertNotebooks(notebooks) {
	const notebookSelect = eId("notebook");
	notebooks?.forEach((notebook) => notebookSelect.add(new Option(notebook.name.slice(0, 39), notebook.id)));
	const { openNotebook } = await getStore("openNotebook");
	notebookSelect.value = openNotebook;
}

export async function setPageList(sectionId, pages) {
	if (pages) insertPages(pages), browser.runtime.sendMessage({ msg: "replacePageCxtMenu", pages });
	else {
		document.body.appendChild(new ProgressDialog());
		const pages = await browser.runtime.sendMessage({ msg: "getSectionPages", sectionId });
		insertPages(pages);
		browser.runtime.sendMessage({ msg: "replacePageCxtMenu", pages });
	}
}

export async function insertPages(pages) {
	if (!Array.isArray(pages)) return;
	const docFrag = new DocumentFragment();
	pages?.forEach((page) => docFrag.appendChild(new Option(page.title.slice(0, 39), page.id)));
	let { lastPageId } = await getStore("lastPageId");
	const pageSelectElem = $('select[name="pages"]');
	pageSelectElem.replaceChildren(new Option(i18n("create_new_page"), "new_page"), docFrag);
	pageSelectElem.value = lastPageId ?? pages[0]?.id ?? "new_page";
}
