export class ProgressDialog extends HTMLDialogElement {
	constructor() {
		super();
	}

	render() {
		return `<svg
			version="1.1"
			id="L2"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
			x="0px"
			y="0px"
			viewBox="0 0 100 100"
			enable-background="new 0 0 100 100"
			xml:space="preserve">
			<circle fill="none" stroke="#ff0000" stroke-width="4" stroke-miterlimit="10" cx="50" cy="50" r="48" />
			<line
				fill="none"
				stroke-linecap="round"
				stroke="#ff0000"
				stroke-width="4"
				stroke-miterlimit="10"
				x1="50"
				y1="50"
				x2="85"
				y2="50.5">
				<animateTransform
					attributeName="transform"
					dur="2s"
					type="rotate"
					from="0 50 50"
					to="360 50 50"
					repeatCount="indefinite" />
			</line>
			<line
				fill="none"
				stroke-linecap="round"
				stroke="#ff0000"
				stroke-width="4"
				stroke-miterlimit="10"
				x1="50"
				y1="50"
				x2="49.5"
				y2="74">
				<animateTransform
					attributeName="transform"
					dur="15s"
					type="rotate"
					from="0 50 50"
					to="360 50 50"
					repeatCount="indefinite" />
			</line>
		</svg>`;
	}

	connectedCallback() {
		if (document.getElementById("connect-onenote")) return;
		this.id = "progress-dialog";
		this.showModal();
		this.innerHTML = this.render();
		$on(document.body, "progresscompleted", () => this.remove());
	}
}

customElements.define("progress-dialog", ProgressDialog, { extends: "dialog" });
