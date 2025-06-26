/**@type {browser.tabs.query} */
export const getTabs = browser.tabs.query.bind(browser.tabs),
	/**@type {browser.storage.StorageArea['get']} */
	getSync = browser.storage.sync.get.bind(browser.storage.sync),
	/**@type {browser.storage.StorageArea['set']} */
	setSync = browser.storage.sync.set.bind(browser.storage.sync),
	/**@type {browser.storage.StorageArea['get']} */
	getSession = browser.storage.session.get.bind(browser.storage.session),
	/**@type {browser.storage.StorageArea['set']} */
	setSession = browser.storage.session.set.bind(browser.storage.session);
