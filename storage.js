const appSessionStore = {};
function getStoredValue(key) {
  let value = appSessionStore[key];
  return value !== undefined ? JSON.parse(value) : value;
}

function setStoredValue({ key, value }) {
  appSessionStore[key] = JSON.stringify(value);
}

module.exports = { setStoredValue, getStoredValue };
