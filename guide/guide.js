/* browser.action.getUserSettings(onUserSettingsChanged);
browser.action.onUserSettingsChanged.addListener(onUserSettingsChanged);

function onUserSettingsChanged(obj) {
	const varElem = document.getElementById("pin_ext");
	varElem.textContent = obj.isOnToolbar ? "pinned" : "not pinned";
	varElem.style.color = obj.isOnToolbar ? "limegreen" : "red";
} */

const version = parseInt((await browser.runtime.getBrowserInfo()).version.split(".")[0], 10);

/**@type {HTMLTableElement} */
const keyShortcutTable = document.getElementById("global-keyboard-shortcuts");

for (let index = 1; index < keyShortcutTable.rows.length; index++) {
	const actionBtn = keyShortcutTable.rows[index].lastElementChild;
	actionBtn.addEventListener("click", () =>
		version >= 139
			? browser.commands.openShortcutSettings()
			: alert(`Go to Tools > Add-ons and Themes (or press Ctrl+Shift+A).
Click the gear icon ⚙️ and select Manage Extension Shortcuts.
Edit or delete shortcuts as needed.`)
	);
}

const { missingShortcuts } = await browser.storage.local.get("missingShortcuts");
if (missingShortcuts) {
	for (const gks of missingShortcuts) {
		const cellElem = document.getElementById(gks.name);
		cellElem.style.color = "red";
		cellElem.style.border = "1px solid";
		cellElem.firstElementChild.textContent = `${gks.shortcut} not set`;
		cellElem.nextElementSibling.firstElementChild.textContent = chrome.i18n.getMessage("set_shortcut");
	}
}
