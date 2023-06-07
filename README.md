# use-persistent-state

JavaScript library that provides a simple and flexible way to manage persistent storage in web applications. It offers utilities for storing and retrieving data using various storage mechanisms such as local storage or cookies. With built-in support for serialization and deserialization, it ensures seamless storage of complex data structures. Whether you need to persist user preferences, application state, or cached data, this library simplifies the process and ensures data integrity across sessions and devices. Additionally, it provides server-side rendering (SSR) support, allowing you to retrieve and hydrate the stored data during server-side rendering for seamless client-side state initialization.

## Installation

using npm:

```
npm install --save use-persistent-state
```

or yarn:

```
yarn add use-persistent-state
```

---

## Example

```tsx
import PersistentStorage, {
  usePersistentState,
  safeLocalStorage,
  PersistStorageHydrationProvider,
} from "use-persistent-state";

// Type augmentation for the 'use-persistent-state' library
declare module "use-persistent-state" {
  interface PersistentStorageFields {
    myData: string;
    counter: number;
  }
}

// Configure the PersistentStorage with custom fields
PersistentStorage({
  myData: {
    storage: safeLocalStorage,
    defaultValue: "Default Value",
  },
  counter: {
    storage: safeLocalStorage,
    defaultValue: 0,
    converter: { parse: Number, stringify: String },
  },
});

const MyComponent = () => {
  const [data, setData] = usePersistentState("myData");

  return (
    <div>
      <p>Data: {data}</p>
      <button
        onClick={() => {
          setData("New Value");
        }}
      >
        Update Data
      </button>
      <button
        onClick={() => {
          PersistentStorage.set("counter", (prevValue) => prevValue + 1);
        }}
      >
        Increase counter
      </button>
    </div>
  );
};

// code bellow is for server-side rendering, ignore it if you don't use it
const IndexPage: NextPage = ({ serverData }) => (
  <PersistStorageHydrationProvider value={serverData}>
    <MyComponent />
  </PersistStorageHydrationProvider>
);

export const getServerSideProps = async () => {
  return {
    props: {
      serverData: PersistentStorage.ssr(),
    },
  };
};
```

## API

- [PersistentStorage](#persistentstorage)
  - [set](#persistentstorageset)
  - [setStringified](#persistentstoragesetstringified)
  - [get](#persistentstorageget)
  - [getStringified](#persistentstoragegetstringified)
  - [ssr](#persistentstoragessr)
- [SafeStorage](#safestorage)
  - [fakeStorage](#fakestorage)
  - [safeLocalStorage](#safelocalstorage)
  - [safeSessionStorage](#safesessionstorage)
- [usePersistentState](#usepersistentstate)
- [PersistStorageHydrationProvider](#persiststoragehydrationprovider)

> Note: the types in API section are simplified for better understanding

### PersistentStorage

```ts
const PersistentStorage: (config: {
  [key: string]: {
    storage: SafeStorage;
    defaultValue?: any;
    converter?: {
      stringify(value: any): string;
      parse(value: string): any;
    };
  };
}) => void;
```

The `PersistentStorage` provides methods to get and set persistent state values. It allows you to store and retrieve data from a storage medium, such as `localStorage` or `cookies`. The state values can be of various types, including strings, numbers, objects, and arrays.

Before using the `PersistentStorage`, you need to configure it by providing a configuration object, like in [example](#example). The configuration object defines the fields to be stored and their corresponding settings: storage medium, default value and converter (JSON if not provided).

---

### PersistentStorage.set

```ts
set(key: string, value: any): void
```

Sets the `value` associated with the specified `key` in the persistent storage. Provokes a rerender of all components that use the corresponding [usePersistentState](#usepersistentstate) hook with this `key`.

---

### PersistentStorage.setStringified

```ts
setStringified(key: string, stringifiedValue: string | undefined): void
```

Sets the string representation of the value associated with the specified `key` in the persistent storage. Provokes a rerender of all components that use the corresponding [usePersistentState](#usepersistentstate) hook with this `key`.

---

### PersistentStorage.get

```ts
get(key: string): any
```

Retrieves the value associated with the specified `key` from the persistent storage. Useful if you need to access the storage outside of React or perform operations silently.

---

### PersistentStorage.getStringified

```ts
getStringified(key: string): string | undefined
```

Retrieves the string representation of the value associated with the specified `key` from the persistent storage. Useful if you need to access the storage outside of React or perform operations silently.

---

### PersistentStorage.ssr

```ts
ssr(
  overrideValues?: Partial<Record<string, any>>,
  overrideStringifiedValues?: Partial<Record<string, string>>
): PersistStorageHydrationContext;
```

Overrides the current values in the persistent storage with the provided values and stringifiedValues.
It updates both regular values and their corresponding stringified representations in the storage.

Retrieves the server-side rendered data for the configured fields in the [PersistentStorage](#persistentstorage).
This data should be passed to the [PersistStorageHydrationProvider](#persiststoragehydrationprovider) to hydrate the client-side state.

For better understanding of usage see [example](#example)

### SafeStorage

The `SafeStorage` interface represents a safe storage mechanism that can be used for storing data persistently.

```ts
setItem(key: string, value: string): void
```

Sets the value associated with the specified key in the storage.

```ts
getItem(key: string): string | null | undefined | void
```

Retrieves the value associated with the specified key from the storage.

```ts
removeItem(key: string): void
```

Removes the value associated with the specified key from the storage.

---

### fakeStorage

The `fakeStorage` is a simulated storage mechanism that can be used as a fallback when the actual storage is not available or accessible. It provides a safe and consistent interface without persisting data.

---

### safeLocalStorage

The `safeLocalStorage` object provides methods for setting, getting, and removing values from the `localStorage` object. It automatically detects if the `localStorage` is supported and accessible in the current environment. If the `localStorage` is not available (e.g., when running on the server or when the browser has restricted access to `localStorage`), it seamlessly falls back to the [fakeStorage](#fakestorage).

---

### safeSessionStorage

The `safeSessionStorage` object provides methods for setting, getting, and removing values from the `sessionStorage` object. It automatically detects if the `sessionStorage` is supported and accessible in the current environment. If the `sessionStorage` is not available (e.g., when running on the server or when the browser has restricted access to `sessionStorage`), it seamlessly falls back to the [fakeStorage](#fakestorage).

---

### usePersistentState

The usePersistentState hook allows you to create a persistent state variable that automatically synchronizes its value with a designated key in the storage.

```js
const [value, setValue, stringifiedValue] = usePersistentState(key);
```

The `usePersistentState` hook takes a `key` as an argument, which represents the `key` to be used for storing the state value in the storage. It returns a stateful `value` and a function `setValue` to update that value.

Whenever the state value is updated using the `setValue` function, it automatically persists the updated value in the storage using the designated `key`. On subsequent renders or even after a page reload, the state value is retrieved from the storage and restored, ensuring that the value remains persistent across sessions.

This hook simplifies the process of creating persistent state variables, eliminating the need for manual storage management. It provides a seamless integration between the state management and storage mechanism, enabling you to easily create persistent components or store important data in a persistent manner.

---

### PersistStorageHydrationProvider

```ts
type PersistStorageHydrationContext = Record<string, string | undefined>;

const PersistStorageHydrationProvider: Provider<PersistStorageHydrationContext>;
```

Component used to hydrate the client-side state with server-side rendered data

Simply wrap your root component or specific components with this provider, passing the server-side data obtained from [PersistentStorage.ssr()](#persistentstoragessr) as the `value` prop.

## License

MIT © [Krombik](https://github.com/Krombik)
