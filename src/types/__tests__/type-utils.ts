/**
 * Type testing utilities for compile-time type assertions.
 * Used to ensure Zod schemas align with Supabase generated types.
 */

/**
 * Checks if two types are exactly equal.
 * Returns true if A and B are the same type.
 */
export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
  ? true
  : false

/**
 * Returns true if A extends B (A is assignable to B).
 */
export type Extends<A, B> = A extends B ? true : false

/**
 * Asserts that a type is true.
 * Used with Equal<> or Extends<> for compile-time type tests.
 * 
 * @example
 * type _test = Expect<Equal<string, string>> // ok
 * type _test = Expect<Equal<string, number>> // error: Type 'false' does not satisfy the constraint 'true'
 */
export type Expect<T extends true> = T

/**
 * ExpectNot - asserts that a type is false.
 */
export type ExpectNot<T extends false> = T

/**
 * Makes all properties of T required and non-nullable (deep).
 * Useful for comparing base shapes ignoring optionality.
 */
export type DeepRequired<T> = {
  [K in keyof T]-?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<DeepRequired<U>>
      : DeepRequired<T[K]>
    : NonNullable<T[K]>
}

/**
 * Extracts keys that are required in T.
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: Record<PropertyKey, never> extends Pick<T, K> ? never : K
}[keyof T]

/**
 * Extracts keys that are optional in T.
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: Record<PropertyKey, never> extends Pick<T, K> ? K : never
}[keyof T]

/**
 * Check if two types have the same required keys.
 */
export type SameRequiredKeys<A, B> = Equal<RequiredKeys<A>, RequiredKeys<B>>

/**
 * Creates a type that only includes properties present in both A and B.
 * Useful for checking common fields between Supabase row and Zod schema.
 */
export type CommonKeys<A, B> = Extract<keyof A, keyof B>

/**
 * Differing keys between A and B (keys in A but not B, or vice versa).
 */
export type DifferingKeys<A, B> = Exclude<keyof A, keyof B> | Exclude<keyof B, keyof A>

/**
 * Type-level assertion that field types match for common keys.
 */
export type FieldTypesMatch<A, B, K extends CommonKeys<A, B>> = Equal<A[K], B[K]>
