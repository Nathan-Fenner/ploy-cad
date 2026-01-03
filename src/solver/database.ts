import { XY, distanceBetweenPoints } from "../geometry/vector";
import { ID } from "../id";

const EPSILON = 1e-5;

/**
 * Compares two "fact" objects for approximate equality.
 * Fields must be identical, except for `number` and `XY` fields, which need only be within `EPSILON` of each other.
 * @returns Whether the facts are equal.
 */
export function areFactsEqual(fact1: object, fact2: object): boolean {
  if (fact1 === undefined) {
    throw new Error("fact1 cannot be undefined");
  }
  if (fact2 === undefined) {
    throw new Error("fact2 cannot be undefined");
  }
  if (fact1 === fact2) {
    return true;
  }
  if (fact1 instanceof ID || fact2 instanceof ID) {
    return fact1 === fact2;
  }
  if (typeof fact1 !== typeof fact2) {
    return false;
  }
  if (
    fact1 === null ||
    fact2 === null ||
    typeof fact1 === "string" ||
    typeof fact1 === "boolean"
  ) {
    return fact1 === fact2;
  }
  if (Array.isArray(fact1)) {
    return (
      Array.isArray(fact2) && fact1.every((x, i) => areFactsEqual(x, fact2[i]))
    );
  }

  const keys1 = Object.keys(fact1).sort().join(";");
  const keys2 = Object.keys(fact1).sort().join(";");

  if (keys1 === "x;y" && keys2 === "x;y") {
    // Both are points, so compare them by distance.
    return distanceBetweenPoints(fact1 as XY, fact2 as XY) < EPSILON;
  }
  if (typeof fact1 === "number") {
    return (
      typeof fact2 === "number" &&
      (fact1 === fact2 || Math.abs(fact1 - fact2) < EPSILON)
    );
  }

  if (keys1 !== keys2) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const INDEX_IGNORE: string[] | undefined = (fact1 as any).INDEX_IGNORE?.split(
    ",",
  );

  for (const [key, value1] of Object.entries(fact1)) {
    if (key === "INDEX_IGNORE" || INDEX_IGNORE?.includes(key)) {
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value2 = (fact2 as any)[key];
    if (!areFactsEqual(value1, value2)) {
      return false;
    }
  }

  return true;
}

export const ANY = Symbol("ANY");
export type AnySymbol = typeof ANY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FactMatchingQuery<Query, Fact> = Fact extends any
  ? FactMatchingQuery2<Query, Fact> extends true
    ? Fact
    : never
  : never;

type FactMatchingQuery2<Query, Fact> = keyof Query extends keyof Fact
  ? FactMatchingQuery3<Query, Fact>
  : false;

type FactMatchingQuery3<Query, Fact> = {
  [k in keyof Query]: k extends keyof Fact
    ? FactMatchingQuery4<Query[k], Fact[k]>
    : false;
}[keyof Query];

type FactMatchingQuery4<Query, Fact> = Query extends Fact | AnySymbol
  ? true
  : false;

type QueryForFact<T> = Partial<{
  [k in keyof T]: T[k] | AnySymbol;
}>;

/**
 * Stores a collection of facts which can be queried in a type-safe way.
 */
export class FactDatabase<Fact extends object> {
  // TODO: Add internal indexes to make `getFacts` faster.
  private _facts: Fact[] = [];

  /**
   * Add a fact to the database.
   */
  public addFact(fact: Fact): void {
    for (const existingFact of this._facts) {
      if (areFactsEqual(existingFact, fact)) {
        return;
      }
    }
    this._facts.push(fact);
  }

  /**
   * Get all of the facts in the query that match it.
   */
  public getFacts<const Query extends QueryForFact<Fact>>(
    query: Query,
  ): Array<FactMatchingQuery<Query, Fact>> {
    if (query === null || typeof query !== "object" || Array.isArray(query)) {
      return [];
    }
    const matching: Fact[] = [];

    const queryEntries = Object.entries(query);

    for (const fact of this._facts) {
      if (typeof fact !== "object" || Array.isArray(fact) || fact === null) {
        continue;
      }

      const factMatches = queryEntries.every(([queryKey, queryValue]) => {
        if (queryValue === undefined) {
          return true;
        }
        const actualValue = fact[queryKey as keyof Fact];
        if (actualValue === undefined) {
          return false;
        }
        if (queryValue === ANY) {
          return true;
        }
        if (isXY(queryValue)) {
          if (!isXY(actualValue)) {
            return false;
          }
          return distanceBetweenPoints(queryValue, actualValue) < EPSILON;
        }
        if (typeof queryValue === "number") {
          return (
            typeof actualValue === "number" &&
            Math.abs(queryValue - actualValue) < EPSILON
          );
        }

        return actualValue === queryValue;
      });

      if (factMatches) {
        matching.push(fact);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return matching as any[];
  }

  public countFacts(): number {
    return this._facts.length;
  }

  public allFacts(): Fact[] {
    return this._facts.slice();
  }
}

function isXY(x: unknown): x is XY {
  return (
    typeof x === "object" &&
    x !== null &&
    Object.keys(x).length === 2 &&
    Object.keys(x).sort().join(",") === "x,y" &&
    Object.values(x).every((f) => typeof f === "number")
  );
}
