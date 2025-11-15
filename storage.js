const appSessionStore = {};
function getStoredValue(key) {
  return JSON.parse(appSessionStore[key]);
}

function setStoredValue({ key, value }) {
  appSessionStore[key] = JSON.stringify(value);
}

module.exports = { setStoredValue, getStoredValue };
