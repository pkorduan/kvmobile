export class AttributeGroup {
	name: string;
	collapsed: boolean;
	attributeIds: number[] = [];
	div: JQuery<HTMLElement>;

	constructor(name, collapsed = false) {
		this.name = name;
		this.collapsed = collapsed;
		return this;
	}
}