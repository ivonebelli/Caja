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

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
if (typeof window !== "undefined") {
  window.showNotification = showNotification;
  window.formatCurrency = formatCurrency;
  window.formatDateTime = formatDateTime;
}
