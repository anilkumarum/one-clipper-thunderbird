export class Message {
	/**
	 * @param {browser.messages.MessageHeader} header
	 * @param {string} htmlContent
	 * @param {Attachment[]} attachments
	 */
	constructor(header, htmlContent, attachments) {
		this.header = header;
		this.htmlContent = htmlContent;
		this.attachments = attachments;
	}
}

export class Attachment {
	/**
	 * @param {string} name
	 * @param {string} contentType
	 * @param {number} size
	 * @param {number[]} content
	 */
	constructor(name, contentType, size, content) {
		this.name = name;
		this.contentType = contentType;
		this.size = size;
		this.content = content;
	}
}

export class MessageClipper {
	constructor() {}

	async clipMessage(event, pageId = "new_page") {
		const svgElem = event.currentTarget.firstElementChild;
		svgElem.setAttribute("loading", "");

		const message = await this.getMessageData();

		try {
			const messageData =
				pageId === "new_page"
					? { message, sectionId: (await getStore("lastSectionId")).lastSectionId }
					: { message, pageId };
			const response = await browser.runtime.sendMessage(messageData);
			svgElem.removeAttribute("loading");
			response?.errCaused ? toast(response?.errCaused, true) : toast(i18n("message_sent_to_one_note"));
			setTimeout(close, 5000);
		} catch (error) {}
	}

	async getMessageData() {
		const tab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
		const messageHeader = await browser.messageDisplay.getDisplayedMessage(tab.id);

		// Get full message content
		const fullMessage = await browser.messages.getFull(messageHeader.id);
		const attachments = await browser.messages.listAttachments(messageHeader.id);
		const processedAttachments = await this.processAttachments(messageHeader.id, attachments);

		return new Message(messageHeader, this.extractHtmlContent(fullMessage), processedAttachments);
	}

	extractHtmlContent(fullMessage) {
		// Extract HTML content from message parts
		const findHtmlPart = (part) => {
			if (part.contentType === "text/html") return part.body;
			if (!part.parts) return null;
			for (const subPart of part.parts) {
				const html = findHtmlPart(subPart);
				if (html) return html;
			}
		};

		return findHtmlPart(fullMessage) || fullMessage.parts?.[0]?.body;
	}

	async processAttachments(messageId, attachments) {
		const processedAttachments = [];

		for (const attachment of attachments) {
			try {
				// Get attachment file content
				const file = await browser.messages.getAttachmentFile(messageId, attachment.partName);
				if (file) {
					// Convert file to base64
					const uint8Buffer = await file.bytes();
					processedAttachments.push(
						new Attachment(attachment.name, attachment.contentType, attachment.size, uint8Buffer)
					);
				}
			} catch (error) {
				console.error(`Error processing attachment ${attachment.name}:`, error);
			}
		}

		return processedAttachments;
	}
}
