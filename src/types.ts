import { Dispatch, SetStateAction } from "react";

export type Converter<T> = {
  /**
   * Serializes the specified value into a string.
   *
   * @param value - The value to be serialized.
   * @returns The serialized value as a string.
   */
  stringify(value: T): string;
  /**
   * Parses the specified string and returns the deserialized value.
   *
   * @param value - The string to be parsed.
   * @returns The deserialized value.
   */
  parse(value: string): T;
};

export type SafeStorage = {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null | undefined | void;
  removeItem(key: string): void;
};

export type PersistentStateTuple<T> = [
  value: T,
  setValue: Dispatch<SetStateAction<T>>,
  stringifiedValue: undefined extends Extract<T, undefined>
    ? string | undefined
    : string
];
