function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    max-width: 400px;
  `;

  if (type === "success") {
    notification.style.background = "#10b981";
    notification.style.color = "white";
  } else if (type === "error") {
    notification.style.background = "#ef4444";
    notification.style.color = "white";
  } else if (type === "warning") {
    notification.style.background = "#f59e0b";
    notification.style.color = "white";
  } else {
    notification.style.background = "#3b82f6";
    notification.style.color = "white";
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-in";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

if (typeof window !== "undefined") {
  window.showNotification = showNotification;
}
