// ============================================
// CLIENTE SOCKET.IO - SINCRONIZACIÓN EN TIEMPO REAL
// ============================================

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;

// Inicializar conexión Socket.IO
function initSocketConnection(serverURL) {
  if (!serverURL || typeof io === 'undefined') {
    console.warn('⚠️ Socket.IO no disponible o URL no configurada');
    return;
  }

  try {
    // Cerrar conexión existente si hay
    if (socket && socket.connected) {
      socket.disconnect();
    }

    // Crear nueva conexión
    socket = io(serverURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS
    });

    // Eventos de conexión
    socket.on('connect', () => {
      console.log('✅ Conectado al servidor en tiempo real');
      reconnectAttempts = 0;
      updateConnectionStatus(true);
      
      // Enviar login del cajero si está activo
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.role === 'cajero' && currentUser.localId) {
        socket.emit('cashier-login', {
          cashierName: currentUser.profile.name,
          localId: currentUser.localId
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del servidor:', reason);
      updateConnectionStatus(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Error de conexión:', error.message);
      reconnectAttempts++;
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('❌ Máximo de intentos de reconexión alcanzado');
        updateConnectionStatus(false);
      }
    });

    // Eventos de sincronización de datos
    socket.on('data-updated', async (data) => {
      console.log('📡 Datos actualizados desde servidor:', data.filename);
      
      // Actualizar archivo local con datos del servidor
      try {
        if (typeof ipcRenderer !== 'undefined') {
          await ipcRenderer.invoke('write-json', data.filename, data.data);
        }
        
        // Disparar evento personalizado para que las páginas se actualicen
        window.dispatchEvent(new CustomEvent('server-data-updated', { 
          detail: { filename: data.filename, data: data.data }
        }));
        
        console.log('✅ Datos locales actualizados:', data.filename);
      } catch (error) {
        console.error('Error actualizando datos locales:', error);
      }
    });

    // Eventos de negocio
    socket.on('order-created', (order) => {
      console.log('📦 Nueva orden recibida:', order.orderNumber);
      window.dispatchEvent(new CustomEvent('order-created', { detail: order }));
      showNotification(`Nueva orden #${order.orderNumber}`, 'info');
    });

    socket.on('cash-register-closed', (data) => {
      console.log('💰 Caja cerrada:', data.cashier);
      window.dispatchEvent(new CustomEvent('cash-closed', { detail: data }));
    });

    socket.on('authorization-created', (auth) => {
      console.log('⚠️ Nueva solicitud de autorización:', auth.type);
      window.dispatchEvent(new CustomEvent('auth-created', { detail: auth }));
      
      const currentUser = getCurrentUser();
      if (currentUser && (currentUser.role === 'gerencia' || currentUser.role === 'subgerente')) {
        showNotification('Nueva solicitud de autorización pendiente', 'warning');
      }
    });

    socket.on('authorization-approved', (auth) => {
      console.log('✅ Autorización aprobada:', auth.id);
      window.dispatchEvent(new CustomEvent('auth-approved', { detail: auth }));
      showNotification('Autorización aprobada', 'success');
    });

    socket.on('authorization-rejected', (auth) => {
      console.log('❌ Autorización rechazada:', auth.id);
      window.dispatchEvent(new CustomEvent('auth-rejected', { detail: auth }));
      showNotification('Autorización rechazada', 'error');
    });

    socket.on('cashier-status-change', (data) => {
      console.log('👤 Estado de cajero actualizado:', data.cashierName, data.status);
      window.dispatchEvent(new CustomEvent('cashier-status', { detail: data }));
    });

  } catch (error) {
    console.error('Error inicializando Socket.IO:', error);
  }
}

// Emitir eventos al servidor
function emitSocketEvent(eventName, data) {
  if (socket && socket.connected) {
    socket.emit(eventName, data);
    console.log(`📤 Evento emitido: ${eventName}`, data);
    return true;
  } else {
    console.warn(`⚠️ No se pudo emitir evento ${eventName}: socket desconectado`);
    return false;
  }
}

// Actualizar indicador visual de conexión
function updateConnectionStatus(isConnected) {
  const statusIndicators = document.querySelectorAll('.connection-status');
  statusIndicators.forEach(indicator => {
    if (isConnected) {
      indicator.className = 'connection-status connected';
      indicator.innerHTML = '🟢 Conectado';
    } else {
      indicator.className = 'connection-status disconnected';
      indicator.innerHTML = '🔴 Sin conexión';
    }
  });

  // Actualizar variable global
  if (typeof window !== 'undefined') {
    window.isSocketConnected = isConnected;
  }
}

// Cerrar conexión Socket.IO
function disconnectSocket() {
  if (socket && socket.connected) {
    // Enviar logout del cajero si está activo
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.role === 'cajero' && currentUser.localId) {
      socket.emit('cashier-logout', {
        cashierName: currentUser.profile.name,
        localId: currentUser.localId
      });
    }
    
    socket.disconnect();
    console.log('🔌 Socket.IO desconectado');
  }
}

// Reconectar manualmente
function reconnectSocket() {
  if (socket && !socket.connected) {
    reconnectAttempts = 0;
    socket.connect();
    console.log('🔄 Intentando reconectar Socket.IO...');
  }
}

// Obtener estado de conexión
function isSocketConnected() {
  return socket && socket.connected;
}

// Exponer funciones globalmente
if (typeof window !== 'undefined') {
  window.initSocketConnection = initSocketConnection;
  window.emitSocketEvent = emitSocketEvent;
  window.disconnectSocket = disconnectSocket;
  window.reconnectSocket = reconnectSocket;
  window.isSocketConnected = isSocketConnected;
  window.socket = socket;
}
