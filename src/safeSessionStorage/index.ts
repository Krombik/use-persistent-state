import type fakeStorage from "../fakeStorage";
import { getStorage } from "../utils";

/**
 * Safe sessionStorage object.
 * If the actual {@link sessionStorage} is not available, it falls back to the {@link fakeStorage} object.
 */
const safeSessionStorage = getStorage("session");

export default safeSessionStorage;
