export function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      const error = chrome.runtime.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(result[key] as T | undefined)
    })
  })
}

export function storageSet(value: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(value, () => {
      const error = chrome.runtime.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve()
    })
  })
}

export function storageRemove(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(key, () => {
      const error = chrome.runtime.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve()
    })
  })
}

export function runtimeSendMessage<TResponse>(message: unknown): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(response as TResponse)
    })
  })
}

export function tabsSendMessage<TResponse>(
  tabId: number,
  message: unknown,
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(response as TResponse)
    })
  })
}

export function queryActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const error = chrome.runtime.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(tabs[0])
    })
  })
}

export function permissionsContains(origins: string[]): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.contains({ origins }, (granted) => {
      const error = chrome.runtime.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(granted)
    })
  })
}

export function permissionsRequest(origins: string[]): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.request({ origins }, (granted) => {
      const error = chrome.runtime.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(granted)
    })
  })
}
