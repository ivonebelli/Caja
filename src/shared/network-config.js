// Configuración de red
document.addEventListener('DOMContentLoaded', async () => {
  const serverURLInput = document.getElementById('serverURL');
  const statusBox = document.getElementById('statusBox');

  // Cargar URL actual
  const currentURL = getServerURL();
  serverURLInput.value = currentURL;

  // Verificar estado de conexión
  updateStatus();
});

function updateStatus() {
  const statusBox = document.getElementById('statusBox');
  
  if (typeof io !== 'undefined' && socket && socket.connected) {
    statusBox.style.background = 'rgba(16, 185, 129, 0.3)';
    statusBox.style.border = '2px solid #10b981';
    statusBox.innerHTML = '🟢 Conectado al servidor';
  } else {
    statusBox.style.background = 'rgba(239, 68, 68, 0.3)';
    statusBox.style.border = '2px solid #ef4444';
    statusBox.innerHTML = '🔴 Sin conexión - Trabajando en modo local';
  }
}

function saveConfig() {
  const serverURL = document.getElementById('serverURL').value.trim();
  
  if (!serverURL) {
    showNotification('Ingresa una URL válida', 'error');
    return;
  }

  // Validar formato básico de URL
  try {
    new URL(serverURL);
  } catch {
    showNotification('URL inválida. Usa el formato: http://ip:puerto', 'error');
    return;
  }

  setServerURL(serverURL);
  showNotification('Configuración guardada. Reconectando...', 'success');
  
  setTimeout(() => {
    updateStatus();
  }, 2000);
}

function goBack() {
  window.location.href = './index.html';
}

// Actualizar estado cada 5 segundos
setInterval(updateStatus, 5000);
