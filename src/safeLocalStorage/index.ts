import type fakeStorage from "../fakeStorage";
import { getStorage } from "../utils";

/**
 * Safe localStorage object.
 * If the actual {@link localStorage} is not available, it falls back to the {@link fakeStorage} object.
 */
const safeLocalStorage = getStorage("local");

export default safeLocalStorage;
