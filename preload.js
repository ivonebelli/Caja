const { contextBridge, ipcRenderer } = require("electron");

// ===================================
// UTILS & DB API (INVOKE/HANDLE)
// ===================================
contextBridge.exposeInMainWorld("dbApi", {
  // Connection
  connect: (credentials) => ipcRenderer.invoke("db:connect", credentials),

  // Stores
  getStores: () => ipcRenderer.invoke("db:get-stores"),
  deleteStore: (id) => ipcRenderer.invoke("db:delete-store", id),

  // Profiles
  getProfiles: (store_id) => ipcRenderer.invoke("db:get-profiles", store_id),
  getProfile: (profile_id) => ipcRenderer.invoke("db:get-profile", profile_id),
  createProfile: (newProfile) =>
    ipcRenderer.invoke("db:create-profile", newProfile),

  // Netflow & Sales
  getProfileAndDailyNetflowData: (profile_id) =>
    ipcRenderer.invoke("db:get-profile-and-daily-netflow-data", profile_id),
  createNetflow: (newNetflow) =>
    ipcRenderer.invoke("db:create-netflow", newNetflow),
  closeNetflow: (final_amount, final_description) =>
    ipcRenderer.invoke("db:close-netflow", final_amount, final_description),
  reopenNetflow: (netflow_id) =>
    ipcRenderer.invoke("db:reopen-netflow", netflow_id),
  getSales: (netflow_id) => ipcRenderer.invoke("db:get-sales", netflow_id),
});

// ===================================
// PROFILE & CASBIN API (INVOKE/HANDLE)
// ===================================
contextBridge.exposeInMainWorld("profileApi", {
  getRole: () => ipcRenderer.invoke("profile:get-active-role"),
  setActiveUser: (profileData) =>
    ipcRenderer.invoke("profile:set-active-user", profileData),
});

// ===================================
// NAVIGATION API (INVOKE/HANDLE)
// ===================================
contextBridge.exposeInMainWorld("navApi", {
  // Sends the request to the Main Process, where Casbin enforcement happens
  navigateTo: (pageName) => ipcRenderer.invoke("navigate-to", pageName),
});

// ===================================
// SESSION STORAGE API (SEND/INVOKE)
// ===================================
contextBridge.exposeInMainWorld("storageApi", {
  // Fire-and-forget to set data in Main Process memory
  setItem: (key, value) => ipcRenderer.send("storage-set-item", { key, value }),

  // Request/response to get data from Main Process memory
  getItem: (key) => ipcRenderer.invoke("storage-get-item", key),
});
