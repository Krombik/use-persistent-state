import { useState, useLayoutEffect, SetStateAction } from "react";
import type { Converter, PersistentStateTuple, SafeStorage } from "./types";
import isUndefined from "lodash.isundefined";

export interface PersistentStorageFields {}

type Fields = {} extends PersistentStorageFields
  ? Record<string, any>
  : PersistentStorageFields;

declare class PersistentStorage {
  /**
   * Retrieves the value associated with the given key from the persistent storage.
   *
   * @param key - The key to retrieve the value for.
   * @returns The value associated with the key.
   */
  static get<T extends keyof Fields & string>(key: T): Fields[T];

  /**
   * Retrieves the stringified value associated with the given key from the persistent storage.
   *
   * @param key - The key to retrieve the string value for.
   * @returns The string value associated with the key.
   */
  static getStringified<T extends keyof Fields & string>(
    key: T
  ): undefined extends Extract<Fields[T], undefined>
    ? string | undefined
    : string;

  /**
   * Sets the value associated with the given key in the persistent storage.
   *
   * @param key - The key to set the value for.
   * @param value - The new value or a function that receives the previous value and returns the new value.
   */
  static set<T extends keyof Fields & string>(
    key: T,
    value: SetStateAction<Fields[T]>
  ): PersistentStorage;

  /**
   * Sets the stringified value associated with the given key in the persistent storage.
   *
   * @param key - The key to set the string value for.
   * @param stringifiedValue - The new string value.
   */
  static setStringified<T extends keyof Fields & string>(
    key: T,
    stringifiedValue: undefined extends Extract<Fields[T], undefined>
      ? string | undefined
      : string
  ): PersistentStorage;
}

/**
 * Configuration object for the persistent storage.
 */
export type PersistentStorageConfig = {
  [key in keyof Fields & string]: {
    /**
     * The converter for serializing/deserializing the value
     *
     * @default JSON
     */
    converter?: Converter<Exclude<Fields[key], undefined>>;
    /**
     * The storage mechanism to be used for persisting the data.
     */
    storage: SafeStorage;
  } & (undefined extends Extract<Fields[key], undefined>
    ? {
        defaultValue?: Fields[key];
      }
    : { defaultValue: Fields[key] });
};

type Identity<T> = T;

interface PersistentStorage extends Identity<typeof PersistentStorage> {
  /**
   * Initializes the persistent storage system with the provided configuration.
   *
   * @param config - The configuration for the persistent storage.
   */
  (config: PersistentStorageConfig): void;
}

type UsePersistentState = {
  /**
   * Hook for managing persistent state.
   *
   * @param key - The key to retrieve the persistent state for.
   * @returns The persistent state tuple for the specified key.
   */
  <T extends keyof Fields & string>(key: T): Readonly<
    PersistentStateTuple<Fields[T]>
  >;
};

const [_PersistentStorage, usePersistentState] = ((): [
  PersistentStorage,
  UsePersistentState
] => {
  const store = new Map<
    string,
    [
      persistStateTuple: PersistentStateTuple<any>,
      forceRerenderSet: Set<(value: {}) => void>,
      setStringifiedValue: (value: string | undefined) => void
    ]
  >();

  const PersistentStorage = ((config) => {
    const keys = Object.keys(config);

    for (let i = keys.length; i--; ) {
      const forceRerenderSet = new Set<(value: {}) => void>();

      const key = keys[i];

      const { converter = JSON, storage, defaultValue } = config[key];

      const storageItem = storage.getItem(key);

      let initialValue: unknown | undefined;

      let initialStringifiedValue: string | undefined;

      try {
        if (storageItem == null) {
          throw null;
        }

        initialValue = converter.parse(storageItem);

        initialStringifiedValue = storageItem;
      } catch (e) {
        if (isUndefined(defaultValue)) {
          storage.removeItem(key);
        } else {
          initialValue = defaultValue;

          initialStringifiedValue = converter.stringify(initialValue);

          storage.setItem(key, initialStringifiedValue);
        }
      }

      const setValue = (value: any, stringifiedValue: string | undefined) => {
        if (stringifiedValue != persistStateTuple[2]) {
          persistStateTuple[2] = stringifiedValue;

          persistStateTuple[0] = value;

          if (isUndefined(stringifiedValue)) {
            storage.removeItem(key);
          } else {
            storage.setItem(key, stringifiedValue);
          }

          const it = forceRerenderSet.values();

          const next = {};

          for (let i = forceRerenderSet.size; i--; ) {
            it.next().value(next);
          }
        }
      };

      const persistStateTuple: PersistentStateTuple<any> = [
        initialValue,
        (value) => {
          if (typeof value == "function") {
            value = value(persistStateTuple[0]);
          }

          setValue(
            value,
            isUndefined(value) ? value : converter.stringify(value)
          );
        },
        initialStringifiedValue,
      ];

      store.set(key, [
        persistStateTuple,
        forceRerenderSet,
        (stringifiedValue) => {
          setValue(
            isUndefined(stringifiedValue)
              ? stringifiedValue
              : converter.parse(stringifiedValue),
            stringifiedValue
          );
        },
      ]);
    }
  }) as PersistentStorage;

  PersistentStorage.get = (key) => store.get(key)![0][0];

  PersistentStorage.getStringified = (key) => store.get(key)![0][2];

  PersistentStorage.set = (key, value) => {
    store.get(key)![0][1](value);

    return PersistentStorage;
  };

  PersistentStorage.setStringified = (key, stringifiedValue) => {
    store.get(key)![2](stringifiedValue);

    return PersistentStorage;
  };

  return [
    PersistentStorage,
    (key) => {
      const forceRerender = useState<{}>()[1];

      const [tuple, set] = store.get(key)!;

      useLayoutEffect(() => {
        set.add(forceRerender);

        return () => {
          set.delete(forceRerender);
        };
      }, [key]);

      return tuple;
    },
  ];
})();

export { default as fakeStorage } from "./fakeStorage";
export { default as safeLocalStorage } from "./safeLocalStorage";
export { default as safeSessionStorage } from "./safeSessionStorage";

export { _PersistentStorage as PersistentStorage };

export default usePersistentState;

export type { SafeStorage, Converter };
