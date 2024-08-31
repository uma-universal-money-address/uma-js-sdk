type LocalStorageKey = "uma" | "connectionUri";

export function getLocalStorage(key: LocalStorageKey) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    throw new Error("localStorage is disabled or not available");
  }
}

export function setLocalStorage(key: LocalStorageKey, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    throw new Error("localStorage is disabled or not available");
  }
}

export const deleteLocalStorageItem = (key: LocalStorageKey) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    throw new Error("localStorage is disabled or not available");
  }
};
