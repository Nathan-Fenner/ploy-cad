/* eslint-disable @typescript-eslint/no-explicit-any */
export function saveToJson(value: any): any {
  if (value === undefined) {
    return { $undefined: value };
  }
  if (value === null) {
    return value;
  }
  if (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(saveToJson);
  }
  const valueConstructor = "constructor" in value ? value.constructor : null;

  const proto = Object.getPrototypeOf(value);
  if (
    proto === null ||
    proto === undefined ||
    proto === Object ||
    proto === Object.getPrototypeOf({})
  ) {
    // TODO: If there is a single key with '$' as a prefix, this is ambiguous.
    return Object.fromEntries(
      Object.entries(value).map(([key, value]) => [key, saveToJson(value)]),
    );
  }

  if (
    valueConstructor !== null &&
    globalRegisteredConstructors.has(valueConstructor)
  ) {
    const f = globalRegisteredConstructors.get(valueConstructor)!;
    return { ["$" + valueConstructor.name]: f.serialize(value) };
  }

  console.error({ value, proto });
  throw new Error(`object has unexpected proto ${proto}`);
}

export function loadFromJson(value: any): any {
  if (value === null) {
    return value;
  }
  if (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(loadFromJson);
  }

  const objectKeys = Object.keys(value);
  if (objectKeys.length === 1 && objectKeys[0].startsWith("$")) {
    const constructorName = objectKeys[0].slice(1);
    if (constructorName === "undefined") {
      return undefined;
    }

    const constructorFunction =
      globalRegisteredConstructorsByName.get(constructorName);
    if (!constructorFunction) {
      throw new Error(
        `unknown constructor name ${JSON.stringify(
          objectKeys[0],
        )} for deserialization`,
      );
    }

    return globalRegisteredConstructors
      .get(constructorFunction)!
      .deserialize(value[objectKeys[0]]);
  }

  // Otherwise, it's an ordinary object.
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, loadFromJson(v)]),
  );
}

const globalRegisteredConstructors = new Map<
  any,
  {
    serialize: (value: any) => object;
    deserialize: (value: any) => any;
  }
>();

const globalRegisteredConstructorsByName = new Map<string, any>();

export function registerConstructor<C>(
  c: new (...args: any[]) => C,
  s: {
    serialize: (value: C) => any;
    deserialize: (value: any) => C;
  },
): void {
  globalRegisteredConstructors.set(c, s);
  globalRegisteredConstructorsByName.set(c.name, c);
}

registerConstructor(Map, {
  serialize: (value: Map<any, any>): object => {
    return [...value].map(([key, value]) => [
      saveToJson(key),
      saveToJson(value),
    ]);
  },
  deserialize: (value: any): Map<any, any> => {
    return new Map(
      value.map(([k, v]: any) => [loadFromJson(k), loadFromJson(v)]),
    );
  },
});

registerConstructor(Set, {
  serialize: (value: Set<any>): object => {
    return [...value].map((key) => saveToJson(key));
  },
  deserialize: (value: any): Set<any> => {
    return new Set(value.map((v: any) => loadFromJson(v)));
  },
});
