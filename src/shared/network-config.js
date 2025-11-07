// Configuración de red
document.addEventListener('DOMContentLoaded', async () => {
  const serverURLInput = document.getElementById('serverURL');
  const statusBox = document.getElementById('statusBox');

  // Cargar URL actual
  const currentURL = getServerURL();
  if (serverURLInput && currentURL) {
    serverURLInput.value = currentURL;
  }

  // Verificar estado de conexión
  updateStatus();
});

async function updateStatus() {
  const statusBox = document.getElementById('statusBox');
  
  if (!statusBox) {
    return;
  }
  
  // Verificar conexión al servidor
  const serverURL = getServerURL();
  
  if (!serverURL) {
    statusBox.style.background = 'rgba(239, 68, 68, 0.3)';
    statusBox.style.border = '2px solid #ef4444';
    statusBox.innerHTML = '🔴 Sin configurar - Ingresa la URL del servidor';
    return;
  }
  
  // Intentar verificar conexión
  try {
    const isConnected = await checkServerConnection();
    
    if (isConnected) {
      statusBox.style.background = 'rgba(16, 185, 129, 0.3)';
      statusBox.style.border = '2px solid #10b981';
      statusBox.innerHTML = '🟢 Conectado al servidor';
    } else {
      statusBox.style.background = 'rgba(239, 68, 68, 0.3)';
      statusBox.style.border = '2px solid #ef4444';
      statusBox.innerHTML = '🔴 Sin conexión - Trabajando en modo local';
    }
  } catch (error) {
    statusBox.style.background = 'rgba(239, 68, 68, 0.3)';
    statusBox.style.border = '2px solid #ef4444';
    statusBox.innerHTML = '🔴 Error de conexión - Modo local';
  }
}

async function saveConfig() {
  const serverURLInput = document.getElementById('serverURL');
  
  if (!serverURLInput) {
    showNotification('Error: Elemento no encontrado', 'error');
    return;
  }
  
  const serverURL = serverURLInput.value.trim();
  
  if (!serverURL) {
    showNotification('Ingresa una URL válida', 'error');
    return;
  }

  // Validar formato básico de URL
  try {
    new URL(serverURL);
  } catch {
    showNotification('URL inválida. Usa el formato: https://ejemplo.com', 'error');
    return;
  }

  setServerURL(serverURL);
  showNotification('Configuración guardada. Reconectando...', 'success');
  
  // Intentar conectar
  setTimeout(async () => {
    await connectToServer();
    updateStatus();
  }, 1000);
}

function testConnection() {
  showNotification('Probando conexión...', 'info');
  
  setTimeout(async () => {
    const isConnected = await checkServerConnection();
    
    if (isConnected) {
      showNotification('✅ Conexión exitosa al servidor', 'success');
    } else {
      showNotification('❌ No se pudo conectar al servidor', 'error');
    }
    
    updateStatus();
  }, 500);
}

function goBack() {
  window.location.href = './index.html';
}

// Actualizar estado cada 10 segundos
setInterval(updateStatus, 10000);
