import { createHtmlElement } from "../Util";
interface TestType {
  name: string;
  value: number;
}

const tesdtPObject: TestType = {
  name: "string",
  value: 12,
};

function getValue<K extends keyof TestType>(o: TestType, attName: K): TestType[K] {
  return o[attName];
}

const n = getValue(tesdtPObject, "value");
