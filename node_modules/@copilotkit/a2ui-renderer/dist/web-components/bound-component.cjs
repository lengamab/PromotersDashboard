let lit = require("lit");
let _a2ui_web_core_v0_9 = require("@a2ui/web_core/v0_9");

//#region src/web-components/bound-component.ts
var CpkA2uiBoundComponent = class extends lit.LitElement {
	constructor(..._args) {
		super(..._args);
		this.binder = null;
		this.binderContext = null;
		this.propsSnapshot = {};
		this.stateInitialized = false;
	}
	static {
		this.properties = {
			api: { attribute: false },
			context: { attribute: false },
			buildChild: { attribute: false },
			renderFn: { attribute: false },
			setupState: { attribute: false }
		};
	}
	createRenderRoot() {
		return this;
	}
	connectedCallback() {
		super.connectedCallback();
		this.style.display = "contents";
	}
	disconnectedCallback() {
		this.disposeBinder();
		super.disconnectedCallback();
	}
	disposeBinder() {
		this.binder?.dispose();
		this.binder = null;
		this.binderContext = null;
	}
	ensureBinder() {
		if (!this.api || !this.context) return;
		if (this.binder && this.binderContext === this.context) return;
		this.disposeBinder();
		this.binderContext = this.context;
		this.binder = new _a2ui_web_core_v0_9.GenericBinder(this.context, this.api.schema);
		this.propsSnapshot = this.binder.snapshot ?? {};
		this.binder.subscribe((props) => {
			this.propsSnapshot = props ?? {};
			this.requestUpdate();
		});
	}
	ensureState() {
		if (this.stateInitialized) return;
		this.stateInitialized = true;
		this.state = this.setupState?.();
	}
	render() {
		this.ensureBinder();
		this.ensureState();
		if (!this.renderFn || !this.context || !this.buildChild) return lit.nothing;
		return this.renderFn({
			props: this.propsSnapshot,
			buildChild: this.buildChild,
			context: this.context,
			state: this.state,
			requestUpdate: () => this.requestUpdate()
		});
	}
};

//#endregion
exports.CpkA2uiBoundComponent = CpkA2uiBoundComponent;
//# sourceMappingURL=bound-component.cjs.map