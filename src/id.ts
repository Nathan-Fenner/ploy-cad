// eslint-disable-next-line @typescript-eslint/no-explicit-any
const idMap = new WeakMap<any, Map<string, ID>>();

export class ID {
  constructor(public readonly id: string) {
    if (!idMap.has(this.constructor)) {
      idMap.set(this.constructor, new Map());
    }
    if (idMap.get(this.constructor)!.has(id)) {
      return idMap.get(this.constructor)!.get(id)!;
    }
    idMap.get(this.constructor)!.set(id, this);
  }
  public static uniqueID(): string {
    return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, "0")}`;
  }
  public toString(): string {
    return this.id;
  }
}
