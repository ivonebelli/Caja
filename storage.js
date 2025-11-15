const appSessionStore = {};
function getStoredValue(key) {
  return appSessionStore[key];
}

function setStoredValue({ key, value }) {
  appSessionStore[key] = value;
}

module.exports = { setStoredValue, getStoredValue };
