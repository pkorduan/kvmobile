export class AttributeGroup {
  name: string;
  collapsed: boolean;
  attributeIds: number[] = [];
  div: HTMLElement;

  constructor(name: string, collapsed = false) {
    this.name = name;
    this.collapsed = collapsed;
  }
}
