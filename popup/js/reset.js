globalThis.eId = document.getElementById.bind(document);

globalThis.$on = (target, type, callback) => target.addEventListener(type, callback);

// Get element by CSS selector:
globalThis.$ = (selector, scope) => (scope || document).querySelector(selector);

//dispatch new event
globalThis.fireEvent = (/** @type {HTMLElement} */ target, /** @type {string} */ eventName, detail) =>
	target.dispatchEvent(detail ? new CustomEvent(eventName, { detail }) : new CustomEvent(eventName));

/**@type {browser.i18n.getMessage} */
globalThis.i18n = browser.i18n.getMessage.bind(this);
globalThis.setLang = (/** @type {string} */ key) => (eId(key).textContent = browser.i18n.getMessage(key));

/**@type {browser.storage.StorageArea['get']} */
globalThis.getStore = browser.storage.local.get.bind(browser.storage.local);
/**@type {browser.storage.StorageArea['set']} */
globalThis.setStore = browser.storage.local.set.bind(browser.storage.local);

const snackbar = eId("snackbar");
globalThis.toast = (msg, isErr) => {
	snackbar.className = isErr ? "error" : "";
	snackbar.hidden = false;
	snackbar.innerText = msg;
	setTimeout(() => (snackbar.hidden = true), 5100);
};
