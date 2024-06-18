import {
  useState,
  useLayoutEffect,
  SetStateAction,
  useContext,
  useEffect,
} from "react";
import type { Converter, PersistentStateTuple, SafeStorage } from "./types";
import isUndefined from "lodash.isundefined";
import {
  PersistStorageHydrationContext,
  HydrationContext,
} from "./PersistStorageHydrationProvider";
import noop from "lodash.noop";

export interface PersistentStorageFields {}

type Fields = {} extends PersistentStorageFields
  ? Record<string, any>
  : PersistentStorageFields;

type StringifiedFields = {
  [key in keyof Fields]: undefined extends Extract<Fields[key], undefined>
    ? string | undefined
    : string;
};

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
  ): StringifiedFields[T];

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
    stringifiedValue: StringifiedFields[T]
  ): PersistentStorage;

  /**
   * Overrides the current values in the persistent storage with the provided values and stringifiedValues.
   * It updates both regular values and their corresponding stringified representations in the storage.
   *
   * Retrieves the server-side rendered data for the configured fields in the `PersistentStorage`.
   * This data should be passed to the `PersistStorageHydrationProvider` to hydrate the client-side state.
   *
   * @param values - An object containing new values for override.
   * @param stringifiedValues - An object containing new stringified values for override.
   * @returns The persistence storage hydration context.
   *
   * @example
   * ```jsx
   * import usePersistentState, {
   *   PersistentStorage,
   *   safeLocalStorage,
   *   PersistStorageHydrationProvider,
   * } from "use-persistent-state";
   *
   * PersistentStorage({
   *   myCounter: {
   *     defaultValue: 0,
   *     storage: safeLocalStorage,
   *   },
   * });
   *
   * const MyComponent = () => {
   *   const [counter, setCounter] = usePersistentState("myCounter");
   *
   *   return (
   *     <div>
   *       <div>{counter}</div>
   *       <button
   *         onClick={() => {
   *           setCounter((prevValue) => prevValue + 1);
   *         }}
   *       >
   *         Increment
   *       </button>
   *     </div>
   *   );
   * };
   *
   * const Page = ({ serverData }) => (
   *   <PersistStorageHydrationProvider value={serverData}>
   *     <MyComponent />
   *   </PersistStorageHydrationProvider>
   * );
   *
   * export const getServerSideProps = async () => {
   *   return {
   *     props: {
   *       serverData: PersistentStorage.ssr(),
   *     },
   *   };
   * };
   * ```
   */
  static ssr(
    values?: Partial<Fields>,
    stringifiedValues?: Partial<StringifiedFields>
  ): PersistStorageHydrationContext;
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
    /**
     * Check is current storage value is valid, if not use `defaultValue` instead
     */
    isValid?(value: Exclude<Fields[key], undefined>): boolean;
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
  <T extends keyof Fields & string>(
    key: T
  ): Readonly<PersistentStateTuple<Fields[T]>>;
};

type StoreItem = [
  persistStateTuple: PersistentStateTuple<any>,
  register: () => void,
  setStringifiedValue: (value: string | undefined) => void,
];

const [_PersistentStorage, usePersistentState] = ((): [
  PersistentStorage,
  UsePersistentState,
] => {
  const store = new Map<string, StoreItem>();

  const hydrationCtx: PersistStorageHydrationContext = {};

  const PersistentStorage = ((config) => {
    const IS_CLIENT = typeof window != "undefined";

    for (const key in config) {
      const forceRerenderSet = new Set<(value: {}) => void>();

      const { converter = JSON, storage, defaultValue, isValid } = config[key];

      const storageItem = storage.getItem(key);

      let initialValue: unknown | undefined;

      let initialStringifiedValue: string | undefined;

      try {
        if (storageItem == null) {
          throw null;
        }

        initialValue = converter.parse(storageItem);

        if (isValid && !isValid(initialValue)) {
          throw null;
        }

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

      const storeItem: StoreItem = [
        persistStateTuple,
        IS_CLIENT
          ? () => {
              const hydrationCtx = useContext(HydrationContext);

              const forceRerender = useState<{}>()[1];

              useLayoutEffect(() => {
                forceRerenderSet.add(forceRerender);

                return () => {
                  forceRerenderSet.delete(forceRerender);
                };
              }, [key]);

              if (hydrationCtx) {
                if (key in hydrationCtx) {
                  const clientValue = persistStateTuple[0];

                  const clientStringifiedValue = persistStateTuple[2];

                  const serverStringifiedValue = hydrationCtx[key];

                  if (clientStringifiedValue != serverStringifiedValue) {
                    persistStateTuple[0] = isUndefined(serverStringifiedValue)
                      ? serverStringifiedValue
                      : converter.parse(serverStringifiedValue);

                    persistStateTuple[2] = serverStringifiedValue;
                  }

                  delete hydrationCtx[key];

                  useEffect(() => {
                    setValue(clientValue, clientStringifiedValue);
                  }, []);
                } else {
                  useEffect(noop, []);
                }
              }
            }
          : () => {
              storeItem[1] = noop;

              hydrationCtx[key] = persistStateTuple[2];
            },
        (stringifiedValue) => {
          setValue(
            isUndefined(stringifiedValue)
              ? stringifiedValue
              : converter.parse(stringifiedValue),
            stringifiedValue
          );
        },
      ];

      store.set(key, storeItem);
    }
  }) as PersistentStorage;

  PersistentStorage.ssr = (values, stringifiedValues) => {
    if (values) {
      for (const key in values) {
        PersistentStorage.set(key, values[key]);
      }
    }

    if (stringifiedValues) {
      for (const key in stringifiedValues) {
        PersistentStorage.set(key, stringifiedValues[key]);
      }
    }

    return hydrationCtx;
  };

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
      const tuple = store.get(key)!;

      tuple[1]();

      return tuple[0];
    },
  ];
})();

export { default as fakeStorage } from "./fakeStorage";
export { default as safeLocalStorage } from "./safeLocalStorage";
export { default as safeSessionStorage } from "./safeSessionStorage";
export {
  default as PersistStorageHydrationProvider,
  type PersistStorageHydrationContext,
} from "./PersistStorageHydrationProvider";

export { _PersistentStorage as PersistentStorage };

export default usePersistentState;

export type { SafeStorage, Converter };
