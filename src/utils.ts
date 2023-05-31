import fakeStorage from "./fakeStorage";

/** @internal */
export const getStorage = (key: "local" | "session") => {
  try {
    const storage = window[`${key}Storage`];

    const testKey = `__${key}Test__`;

    storage.setItem(testKey, "");

    storage.removeItem(testKey);

    return storage;
  } catch (e) {
    return fakeStorage;
  }
};
