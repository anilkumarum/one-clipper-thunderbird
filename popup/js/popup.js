import "./reset.js";
import "../components/account-switch.js";
import { getSync } from "./constant.js";
import { MessageClipper } from "./clip-message.js";
import { SectionTree } from "../components/section-tree.js";
import { checkOAuthUserExist, ConnectOnenote } from "../components/connect-onenote.js";
import { insertNotebooks, fetchNotebooks, onNotebookSwitch, refreshNotebooks, insertPages } from "./set-content.js";

import "../style/base.css";
import "../style/popup.css";

const { oneAccounts, openAccountId } = await getSync(["oneAccounts", "openAccountId"]);
const isConnect = oneAccounts[openAccountId]?.UDI_TKN;
isConnect ?? ((await checkOAuthUserExist()) || document.body.appendChild(new ConnectOnenote()));

// Notebooks
const notebookSelect = eId("notebook");
const { notebooks } = await getStore(["notebooks", "openNotebook"]);
notebooks ? insertNotebooks(notebooks) : isConnect && (await fetchNotebooks());

$on(notebookSelect, "change", onNotebookSwitch);
$on(notebookSelect.previousElementSibling, "click", refreshNotebooks);

// Sections
const { lastSectionName } = await getStore("lastSectionName");
const sectionSelect = eId("section-select");
sectionSelect.firstElementChild.textContent = lastSectionName;
$on(sectionSelect, "click", () => {
	sectionSelect.nextElementSibling || sectionSelect.after(new SectionTree());
	sectionSelect.nextElementSibling.togglePopover();
});

const clipBtn = eId("clip-to-onenote");
const pageSelectElem = clipBtn.previousElementSibling;
const { lastSectionId } = await getStore("lastSectionId");
$on(clipBtn, "click", (event) => new MessageClipper().clipMessage(event, pageSelectElem.value));
