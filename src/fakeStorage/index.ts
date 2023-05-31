import noop from "lodash.noop";
import { SafeStorage } from "../types";

/**
 * Fake storage object that can be used when the real storage is not available.
 */
const fakeStorage: SafeStorage = {
  getItem: noop,
  setItem: noop,
  removeItem: noop,
};

export default fakeStorage;
