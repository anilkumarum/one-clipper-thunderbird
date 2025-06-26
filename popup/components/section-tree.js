import { setPageList } from "../js/set-content.js";

const linkElem = document.createElement("link");
linkElem.rel = "stylesheet";
linkElem.href = "./style/section-tree.css";

export class SectionTree extends HTMLElement {
	constructor() {
		super();
		this.popover = "";
		this.id = "section-tree";
		this.attachShadow({ mode: "open" });
		// this.shadowRoot.adoptedStyleSheets = [linkElem.sheet];
	}

	createSection(createGroup) {
		const section = { id: "", name: "section", sections: createGroup ? [] : undefined };
		const sectionItem = new Range().createContextualFragment(this.layerItem(section)).firstElementChild;
		this.parentSectionGroupId
			? this.shadowRoot.getElementById(this.parentSectionGroupId).nextElementSibling.appendChild(sectionItem)
			: this.shadowRoot.firstElementChild.appendChild(sectionItem);

		async function afterNameEdit({ target }) {
			const message = {
				msg: createGroup ? "createSectionGroup" : "createSection",
				name: target.textContent,
				notebookId: this.notebookId,
				parentSectionGroupId: this.parentSectionGroupId,
			};
			const resData = await browser.runtime.sendMessage(message);
			if (typeof resData === "object" && resData?.errCaused) return toast(resData.errCaused, true);
			const sectionData = JSON.parse(resData);
			section.id = sectionData.id;
			(this.parentSectionGroupId ? findSectionGroup(this.sections) : this.sections)?.push(section);
			setStore({ [this.notebookId]: this.sections });
		}

		const sectionGroupId = this.parentSectionGroupId;
		function findSectionGroup(sections) {
			let _sections;
			function getSections(sections) {
				for (const section of sections) {
					if (!section.sections) continue;
					if (section.id === sectionGroupId) return (_sections = section.sections);
					else _sections ?? getSections(section.sections);
				}
			}
			getSections(sections);
			return _sections;
		}
	}

	async onSectionSelect(sectionId, sectionName) {
		setStore({ lastSectionId: sectionId, lastSectionName: sectionName });
		const { [sectionId]: pages } = await getStore([sectionId]);

		setPageList(sectionId, pages);
		this.previousElementSibling.firstElementChild.textContent = sectionName;
		this.hidePopover();
	}

	toggleSectionGroup(sectionGroupId) {
		this.parentSectionGroupId = sectionGroupId;
	}

	selectSection({ target }) {
		$("div.selected", this)?.classList.remove("selected");
		const div = target.closest("div");
		const nxtElem = div.nextElementSibling;
		div.classList.add("selected");

		if (nxtElem?.nodeName === "UL") {
			nxtElem.hidden = !nxtElem.hidden;
			div.firstElementChild.setAttribute("class", nxtElem.hidden ? "folder" : "folder-open");
		}
	}

	layerItem = (section) => `<li class="tree-item">
		<div class="section-item" id="${section.id}"  data-type="${section.sections ? "sectionGroup" : "section"}">
		 	<svg class="${section.sections ? "folder" : "section"}" viewBox="0 0 24 24"> <path /> </svg>
			<span>${section.name.slice(0, 20)}</span>
		</div>
		${section.sections ? this.createLayer(section.sections) : ""}
	</li> `;

	createLayer(entries) {
		return `<ul hidden> ${entries.map(this.layerItem).join("")} </ul>`;
	}

	render() {
		return `${this.createLayer(this.sections)}
			<div class="action-buttons">
				<button style="--btn-clr:dodgerblue">+ Group</button> 
				<button>+ Section</button>
			</div>`;
	}

	async connectedCallback() {
		this.notebookId = (await getStore("openNotebook")).openNotebook;
		this.sections = (await getStore(this.notebookId))[this.notebookId];

		const content = this.shadowRoot;
		content.innerHTML = this.render();
		content.firstElementChild["hidden"] = false;
		content.firstElementChild.after(linkElem);
		this.showPopover();
		$on(content.firstElementChild, "click", this.selectSection.bind(this));
		$on(content.lastElementChild.firstElementChild, "click", this.createSection.bind(this, true));
		$on(content.lastElementChild.lastElementChild, "click", this.createSection.bind(this, false));
	}

	onNotebookSwitch(notebookId, sections) {
		this.notebookId = notebookId;
	}
}

customElements.define("section-tree", SectionTree);
