// ============================================
// UTILIDADES GLOBALES - MODO SERVIDOR EN LA NUBE
// ============================================

// Validación de Electron - CORREGIDO
let ipcRenderer = null;
if (typeof window !== 'undefined' && window.require) {
  try {
    const electron = window.require('electron');
    ipcRenderer = electron.ipcRenderer;
  } catch (error) {
    console.warn('⚠️ Electron no disponible:', error.message);
  }
}

// CONFIGURACIÓN DEL SERVIDOR
let serverURL = localStorage.getItem('serverURL') || null;
let isOnline = false;
let syncQueue = []; // Cola de operaciones pendientes

// Verificar conexión al servidor
async function checkServerConnection() {
  if (!serverURL) {
    console.log('⚠️ No hay URL de servidor configurada');
    return false;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${serverURL}/health`, { 
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    isOnline = data.status === 'ok';
    console.log(isOnline ? '✅ Conectado al servidor' : '⚠️ Servidor no disponible');
    
    // Si volvemos a estar online, procesar cola de sincronización
    if (isOnline && syncQueue.length > 0) {
      await processSyncQueue();
    }
    
    return isOnline;
  } catch (error) {
    console.error('❌ Error conectando al servidor:', error.message);
    isOnline = false;
    return false;
  }
}

// Procesar cola de sincronización pendiente
async function processSyncQueue() {
  console.log(`📤 Procesando ${syncQueue.length} operaciones pendientes...`);
  
  const queue = [...syncQueue];
  syncQueue = [];
  
  for (const operation of queue) {
    try {
      await writeData(operation.filename, operation.data);
      console.log(`✅ Sincronizada operación pendiente: ${operation.filename}`);
    } catch (error) {
      console.error(`❌ Error sincronizando ${operation.filename}:`, error);
      // Volver a encolar si falla
      syncQueue.push(operation);
    }
  }
}

// Conectar al servidor
async function connectToServer() {
  if (!serverURL) {
    console.log('⚠️ Por favor configura la URL del servidor primero');
    return false;
  }
  
  const connected = await checkServerConnection();
  if (connected) {
    console.log('✅ Conexión establecida con el servidor');
    
    // Guardar en localStorage para persistir
    localStorage.setItem('serverURL', serverURL);
    
    // Sincronizar datos iniciales
    await syncInitialData();
    
    // Inicializar Socket.IO
    if (typeof initSocketConnection === 'function') {
      initSocketConnection(serverURL);
    }
  }
  return connected;
}

// Configurar URL del servidor
function setServerURL(url) {
  if (!url) {
    console.error('❌ URL inválida');
    return false;
  }
  
  // Asegurarse de que la URL tenga el protocolo
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  // Quitar trailing slash
  url = url.replace(/\/$/, '');
  
  serverURL = url;
  localStorage.setItem('serverURL', url);
  console.log('📡 URL del servidor configurada:', url);
  return true;
}

// Obtener URL del servidor
function getServerURL() {
  return serverURL;
}

// Sincronizar datos iniciales
async function syncInitialData() {
  try {
    console.log('🔄 Sincronizando datos iniciales...');
    const response = await fetch(`${serverURL}/api/sync`);
    
    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Respuesta del servidor inválida');
    }
    
    // Valores por defecto para archivos que vengan como null
    const defaults = {
      'products.json': [],
      'orders.json': [],
      'categories.json': [],
      'authorizations.json': [],
      'change_history.json': [],
      'active_sessions.json': {},
      'cash_register.json': { sessions: [] }
    };
    
    // Guardar todos los archivos localmente
    for (const [filename, data] of Object.entries(result.data)) {
      // Usar valor por defecto si el dato es null
      let finalData = data !== null ? data : (defaults[filename] || null);
      
      // Normalizar datos (convertir {} a [] si es necesario)
      if (finalData !== null) {
        finalData = normalizeData(filename, finalData);
      }
      
      if (finalData !== null && ipcRenderer) {
        await ipcRenderer.invoke('write-json', filename, finalData);
        console.log(`  ✓ ${filename}`);
      } else if (!ipcRenderer) {
        console.warn(`  ⚠️ IPC no disponible, saltando ${filename}`);
      } else {
        console.warn(`  ⚠️ ${filename} es null y no tiene valor por defecto`);
      }
    }
    
    console.log('✅ Sincronización inicial completada');
    return true;
  } catch (error) {
    console.error('❌ Error en sincronización inicial:', error);
    return false;
  }
}

// ============================================
// FUNCIONES DE LECTURA/ESCRITURA DE DATOS
// ============================================

// Función auxiliar para convertir {} vacíos en [] para archivos que deben ser arrays
function normalizeData(filename, data) {
  // Lista de archivos que DEBEN ser arrays
  const arrayFiles = [
    'products.json',
    'orders.json',
    'categories.json',
    'authorizations.json',
    'change_history.json'
  ];
  
  // Si el archivo debe ser array pero es un objeto vacío {}, convertir a []
  if (arrayFiles.includes(filename)) {
    if (!data || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)) {
      console.warn(`⚠️ Convirtiendo ${filename} de {} a []`);
      return [];
    }
    // Si no es array, intentar convertir
    if (!Array.isArray(data)) {
      console.error(`❌ ${filename} no es un array:`, data);
      return [];
    }
  }
  
  return data;
}

async function readData(filename) {
  try {
    // Intentar primero del servidor si está online
    if (isOnline && serverURL) {
      try {
        console.log(`📡 Leyendo desde servidor: ${filename}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${serverURL}/api/data/${filename}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error('Error en la respuesta del servidor');
        }
        
        // Normalizar datos antes de guardar y devolver
        const normalizedData = normalizeData(filename, result.data);
        
        // Guardar copia local si IPC está disponible
        if (ipcRenderer) {
          await ipcRenderer.invoke('write-json', filename, normalizedData);
        }
        
        return normalizedData;
      } catch (serverError) {
        console.warn(`⚠️ Error leyendo del servidor, intentando local:`, serverError.message);
        isOnline = false; // Marcar como offline temporalmente
      }
    }
    
    // Leer desde archivo local
    if (ipcRenderer) {
      console.log(`📂 Leyendo localmente: ${filename}`);
      const data = await ipcRenderer.invoke('read-json', filename);
      
      // Normalizar datos antes de devolver
      return normalizeData(filename, data);
    } else {
      throw new Error('IPC no disponible y servidor offline');
    }
    
  } catch (error) {
    console.error(`Error leyendo ${filename}:`, error);
    
    // Devolver valores por defecto en lugar de null
    const defaults = {
      'products.json': [],
      'orders.json': [],
      'categories.json': [],
      'authorizations.json': [],
      'change_history.json': [],
      'active_sessions.json': {},
      'cash_register.json': { sessions: [] }
    };
    
    const defaultValue = defaults[filename] || null;
    if (defaultValue !== null) {
      console.warn(`⚠️ Usando valor por defecto para ${filename}`);
    }
    return defaultValue;
  }
}

async function writeData(filename, data) {
  try {
    // Guardar localmente primero si IPC está disponible
    if (ipcRenderer) {
      await ipcRenderer.invoke('write-json', filename, data);
      console.log(`💾 Guardado localmente: ${filename}`);
    }
    
    // Intentar sincronizar con servidor
    if (isOnline && serverURL) {
      try {
        console.log(`📡 Sincronizando con servidor: ${filename}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${serverURL}/api/data/${filename}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: data }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success) {
          console.log(`✅ Sincronizado con servidor: ${filename}`);
          
          // Emitir evento Socket.IO si está disponible
          if (typeof emitSocketEvent === 'function') {
            emitSocketEvent('data-updated', { filename, data });
          }
        }
      } catch (syncError) {
        console.warn(`⚠️ No se pudo sincronizar con servidor: ${syncError.message}`);
        
        // Agregar a cola de sincronización para reintentar después
        syncQueue.push({ filename, data, timestamp: new Date().toISOString() });
        console.log(`📝 Operación agregada a cola de sincronización (${syncQueue.length} pendientes)`);
        
        isOnline = false; // Marcar como offline temporalmente
      }
    } else if (!isOnline && serverURL) {
      // Si no hay conexión, agregar a cola
      syncQueue.push({ filename, data, timestamp: new Date().toISOString() });
      console.log(`📝 Sin conexión: operación agregada a cola (${syncQueue.length} pendientes)`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error guardando ${filename}:`, error);
    return false;
  }
}

async function saveExcelReport(filename, arrayBuffer) {
  try {
    console.log('Intentando guardar reporte:', filename);
    
    // Guardar localmente primero si IPC está disponible
    if (ipcRenderer) {
      const localResult = await ipcRenderer.invoke('save-excel-report', filename, arrayBuffer);
      
      if (localResult.success) {
        console.log('✅ Reporte guardado localmente en:', localResult.path);
      }
    }
    
    // Intentar sincronizar con servidor
    if (isOnline && serverURL) {
      try {
        console.log(`📡 Sincronizando reporte con servidor: ${filename}`);
        
        // Convertir ArrayBuffer a Array para JSON
        const bufferArray = Array.from(new Uint8Array(arrayBuffer));
        
        const response = await fetch(`${serverURL}/api/reports/${filename}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ buffer: bufferArray })
        });
        
        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success) {
          console.log(`✅ Reporte sincronizado con servidor: ${filename}`);
        }
      } catch (syncError) {
        console.warn(`⚠️ No se pudo sincronizar reporte con servidor: ${syncError.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error guardando reporte:', error);
    return false;
  }
}

// ============================================
// GESTIÓN DE SESIONES DE CAJERO
// ============================================

async function checkAndSetCashierSession(cashierName, localId) {
  try {
    const sessions = await readData('active_sessions.json');
    
    // Verificar si hay un cajero activo en este local
    const localKey = `local_${localId}`;
    if (!sessions[localKey]) {
      sessions[localKey] = { activeCashier: null, lastUpdated: null };
    }
    
    const activeCashier = sessions[localKey].activeCashier;

    if (activeCashier && activeCashier !== cashierName) {
      return false;
    }

    sessions[localKey].activeCashier = cashierName;
    sessions[localKey].lastUpdated = new Date().toISOString();
    await writeData('active_sessions.json', sessions);
    
    // Emitir evento Socket.IO
    if (typeof emitSocketEvent === 'function') {
      emitSocketEvent('cashier-login', { cashierName, localId });
    }
    
    return true;
  } catch (error) {
    console.error('Error verificando sesión de cajero:', error);
    return false;
  }
}

async function clearCashierSession(cashierName, localId) {
  try {
    const sessions = await readData('active_sessions.json');
    const localKey = `local_${localId}`;
    
    if (sessions[localKey] && sessions[localKey].activeCashier === cashierName) {
      sessions[localKey].activeCashier = null;
      sessions[localKey].lastUpdated = new Date().toISOString();
      await writeData('active_sessions.json', sessions);
      
      // Emitir evento Socket.IO
      if (typeof emitSocketEvent === 'function') {
        emitSocketEvent('cashier-logout', { cashierName, localId });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error limpiando sesión de cajero:', error);
    return false;
  }
}

// ============================================
// FUNCIONES DE FORMATO Y UTILIDADES
// ============================================

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(amount);
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

// ============================================
// SISTEMA DE NOTIFICACIONES
// ============================================

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 400px;
    font-size: 14px;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================
// GESTIÓN DE ESTADO DE USUARIO
// ============================================

function clearAppState() {
  localStorage.removeItem('currentUser');
  console.log('🔄 Estado de la aplicación limpiado');
}

function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

function setCurrentUser(userData) {
  localStorage.setItem('currentUser', JSON.stringify(userData));
}
// ============================================
// PARTE 2 DE UTILS.JS - CONTINÚA DESDE LA PARTE 1
// ============================================

// ============================================
// SISTEMA DE HISTORIAL DE CAMBIOS
// ============================================

async function logChange(changeData) {
  try {
    const history = await readData('change_history.json') || [];
    
    const change = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...changeData
    };
    
    history.push(change);
    await writeData('change_history.json', history);
    
    return true;
  } catch (error) {
    console.error('Error registrando cambio:', error);
    return false;
  }
}

async function getChangeHistory(filters = {}) {
  try {
    let history = await readData('change_history.json') || [];
    
    // Aplicar filtros
    if (filters.type) {
      history = history.filter(h => h.type === filters.type);
    }
    
    if (filters.user) {
      history = history.filter(h => h.user === filters.user);
    }
    
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      history = history.filter(h => new Date(h.timestamp) >= start);
    }
    
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      history = history.filter(h => new Date(h.timestamp) <= end);
    }
    
    // Ordenar por fecha descendente
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limitar resultados
    if (filters.limit) {
      history = history.slice(0, filters.limit);
    }
    
    return history;
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return [];
  }
}

// ============================================
// SISTEMA DE AUTORIZACIONES
// ============================================

async function createAuthorization(authData) {
  try {
    if (!validateAuthorizationData(authData)) {
      console.error('Datos de autorización inválidos');
      return false;
    }
    
    const authorizations = await readData('authorizations.json') || [];
    
    const authorization = {
      id: generateId(),
      ...authData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      approvedBy: null,
      rejectedBy: null,
      approvedAt: null,
      rejectedAt: null
    };
    
    authorizations.push(authorization);
    await writeData('authorizations.json', authorizations);
    
    // Emitir evento Socket.IO
    if (typeof emitSocketEvent === 'function') {
      emitSocketEvent('authorization-created', authorization);
    }
    
    await logChange({
      type: 'authorization_created',
      authType: authData.type,
      description: `Solicitud de autorización: ${authData.type}`,
      user: authData.requestedBy
    });
    
    return authorization.id;
  } catch (error) {
    console.error('Error creando autorización:', error);
    return false;
  }
}

async function getPendingAuthorizations(localId = null) {
  try {
    let authorizations = await readData('authorizations.json') || [];
    
    // Filtrar solo pendientes
    authorizations = authorizations.filter(a => a.status === 'pending');
    
    // Filtrar por local si se especifica
    if (localId) {
      authorizations = authorizations.filter(a => 
        !a.data.localId || a.data.localId === localId
      );
    }
    
    // Ordenar por fecha de creación descendente
    authorizations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return authorizations;
  } catch (error) {
    console.error('Error obteniendo autorizaciones pendientes:', error);
    return [];
  }
}

async function approveAuthorization(authId, approvedBy) {
  try {
    const data = await readData('authorizations.json') || [];
    const auth = data.find(a => a.id === authId);
    
    if (!auth || auth.status !== 'pending') {
      return false;
    }
    
    auth.status = 'approved';
    auth.approvedAt = new Date().toISOString();
    auth.approvedBy = approvedBy;
    
    await writeData('authorizations.json', data);
    
    // Emitir evento Socket.IO
    if (typeof emitSocketEvent === 'function') {
      emitSocketEvent('authorization-approved', auth);
    }
    
    await logChange({
      type: 'authorization_approved',
      authType: auth.type,
      description: `Autorización aprobada: ${auth.type}`,
      requestedBy: auth.requestedBy,
      approvedBy: approvedBy,
      authId: authId
    });
    
    return true;
  } catch (error) {
    console.error('Error aprobando autorización:', error);
    return false;
  }
}

async function rejectAuthorization(authId, rejectedBy) {
  try {
    const data = await readData('authorizations.json') || [];
    const auth = data.find(a => a.id === authId);
    
    if (!auth || auth.status !== 'pending') {
      return false;
    }
    
    auth.status = 'rejected';
    auth.rejectedAt = new Date().toISOString();
    auth.rejectedBy = rejectedBy;
    
    await writeData('authorizations.json', data);
    
    // Emitir evento Socket.IO
    if (typeof emitSocketEvent === 'function') {
      emitSocketEvent('authorization-rejected', auth);
    }
    
    await logChange({
      type: 'authorization_rejected',
      authType: auth.type,
      description: `Autorización rechazada: ${auth.type}`,
      requestedBy: auth.requestedBy,
      rejectedBy: rejectedBy,
      authId: authId
    });
    
    return true;
  } catch (error) {
    console.error('Error rechazando autorización:', error);
    return false;
  }
}

async function approveAuthorizationEnhanced(authId, approvedBy) {
  try {
    const data = await readData('authorizations.json') || [];
    const auth = data.find(a => a.id === authId);
    
    if (!auth || auth.status !== 'pending') {
      return false;
    }
    
    auth.status = 'approved';
    auth.approvedAt = new Date().toISOString();
    auth.approvedBy = approvedBy;
    
    // Aplicar el cambio según el tipo de autorización
    let changeApplied = false;
    
    if (auth.type === 'change_pin') {
      const profiles = await readData('profiles.json');
      
      if (auth.data.role === 'gerencia') {
        profiles.gerencia.pin = auth.data.newPin;
        profiles.gerencia.updatedAt = new Date().toISOString();
        await writeData('profiles.json', profiles);
        changeApplied = true;
      } else {
        const local = profiles.locales.find(l => l.id === auth.data.localId);
        
        if (local) {
          const profile = local.perfiles[auth.data.role].find(p => p.id === auth.data.profileId);
          if (profile) {
            profile.pin = auth.data.newPin;
            profile.updatedAt = new Date().toISOString();
            await writeData('profiles.json', profiles);
            changeApplied = true;
          }
        }
      }
    } else if (auth.type === 'product_change') {
      const products = await readData('products.json') || [];
      const product = products.find(p => p.id === auth.data.productId);
      
      if (product) {
        Object.assign(product, auth.data.changes);
        product.updatedAt = new Date().toISOString();
        await writeData('products.json', products);
        changeApplied = true;
      }
    } else if (auth.type === 'delete_profile') {
      const profiles = await readData('profiles.json');
      const local = profiles.locales.find(l => l.id === auth.data.localId);
      
      if (local) {
        local.perfiles[auth.data.role] = local.perfiles[auth.data.role].filter(
          p => p.id !== auth.data.profileId
        );
        await writeData('profiles.json', profiles);
        changeApplied = true;
      }
    } else if (auth.type === 'delete_product') {
      const products = await readData('products.json') || [];
      const updatedProducts = products.filter(p => p.id !== auth.data.productId);
      await writeData('products.json', updatedProducts);
      changeApplied = true;
    }
    
    await writeData('authorizations.json', data);
    
    // Emitir evento Socket.IO
    if (typeof emitSocketEvent === 'function') {
      emitSocketEvent('authorization-approved', auth);
    }
    
    if (changeApplied) {
      await logChange({
        type: 'authorization_approved',
        authType: auth.type,
        description: `Autorización aprobada: ${auth.type}`,
        requestedBy: auth.requestedBy,
        approvedBy: approvedBy,
        authId: authId
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error aprobando autorización:', error);
    return false;
  }
}

async function rejectAuthorizationEnhanced(authId, rejectedBy) {
  try {
    const data = await readData('authorizations.json') || [];
    const auth = data.find(a => a.id === authId);
    
    if (!auth) return false;
    
    auth.status = 'rejected';
    auth.rejectedAt = new Date().toISOString();
    auth.rejectedBy = rejectedBy;
    
    await writeData('authorizations.json', data);
    
    // Emitir evento Socket.IO
    if (typeof emitSocketEvent === 'function') {
      emitSocketEvent('authorization-rejected', auth);
    }
    
    await logChange({
      type: 'authorization_rejected',
      authType: auth.type,
      description: `Autorización rechazada: ${auth.type}`,
      requestedBy: auth.requestedBy,
      rejectedBy: rejectedBy,
      authId: authId
    });
    
    return true;
  } catch (error) {
    console.error('Error rechazando autorización:', error);
    return false;
  }
}

// ============================================
// FUNCIONES DE ANULACIÓN DE VENTAS
// ============================================

async function voidSale(orderId, voidedBy, reason = '') {
  try {
    const orders = await readData('orders.json') || [];
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      console.error('Orden no encontrada');
      return false;
    }
    
    if (order.status === 'voided') {
      console.error('La orden ya está anulada');
      return false;
    }
    
    order.status = 'voided';
    order.voidedAt = new Date().toISOString();
    order.voidedBy = voidedBy;
    order.voidReason = reason;
    
    await writeData('orders.json', orders);
    
    await logChange({
      type: 'sale_void',
      description: `Venta #${order.orderNumber} anulada. Total: ${formatCurrency(order.total)}`,
      orderId: orderId,
      orderNumber: order.orderNumber,
      amount: order.total,
      user: voidedBy,
      reason: reason
    });
    
    return true;
  } catch (error) {
    console.error('Error anulando venta:', error);
    return false;
  }
}

async function getVoidedSales(localId = null, limit = 20) {
  try {
    let orders = await readData('orders.json') || [];
    
    orders = orders.filter(o => o.status === 'voided');
    
    if (localId) {
      orders = orders.filter(o => o.localId === localId);
    }
    
    return orders.sort((a, b) => 
      new Date(b.voidedAt) - new Date(a.voidedAt)
    ).slice(0, limit);
  } catch (error) {
    console.error('Error obteniendo ventas anuladas:', error);
    return [];
  }
}

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

function canUserVoidSale(userRole) {
  return ['cajero', 'administrativo', 'gerencia', 'subgerente'].includes(userRole);
}

function canUserApproveAuth(userRole) {
  return ['gerencia', 'subgerente'].includes(userRole);
}

function validateAuthorizationData(auth) {
  if (!auth.type || !auth.requestedBy || !auth.data) {
    return false;
  }
  
  if (auth.type === 'change_pin') {
    return auth.data.newPin && auth.data.profileId && auth.data.role;
  } else if (auth.type === 'product_change') {
    return auth.data.productId && auth.data.changes;
  } else if (auth.type === 'delete_profile') {
    return auth.data.profileId && auth.data.role && auth.data.localId;
  } else if (auth.type === 'delete_product') {
    return auth.data.productId;
  }
  
  return true;
}

// ============================================
// EXPONER FUNCIONES GLOBALMENTE
// ============================================

if (typeof window !== 'undefined') {
  // Funciones de servidor
  window.checkServerConnection = checkServerConnection;
  window.connectToServer = connectToServer;
  window.setServerURL = setServerURL;
  window.getServerURL = getServerURL;
  window.processSyncQueue = processSyncQueue;
  
  // Funciones de datos
  window.readData = readData;
  window.writeData = writeData;
  window.saveExcelReport = saveExcelReport;
  
  // Funciones de sesiones
  window.checkAndSetCashierSession = checkAndSetCashierSession;
  window.clearCashierSession = clearCashierSession;
  
  // Funciones de autorizaciones
  window.createAuthorization = createAuthorization;
  window.getPendingAuthorizations = getPendingAuthorizations;
  window.approveAuthorization = approveAuthorization;
  window.rejectAuthorization = rejectAuthorization;
  window.approveAuthorizationEnhanced = approveAuthorizationEnhanced;
  window.rejectAuthorizationEnhanced = rejectAuthorizationEnhanced;
  
  // Funciones de formato
  window.formatCurrency = formatCurrency;
  window.formatDateTime = formatDateTime;
  window.getCurrentDate = getCurrentDate;
  window.generateId = generateId;
  
  // Funciones de notificaciones
  window.showNotification = showNotification;
  
  // Funciones de estado
  window.clearAppState = clearAppState;
  window.getCurrentUser = getCurrentUser;
  window.setCurrentUser = setCurrentUser;
  
  // Funciones de historial
  window.logChange = logChange;
  window.getChangeHistory = getChangeHistory;
  
  // Funciones de anulación
  window.voidSale = voidSale;
  window.getVoidedSales = getVoidedSales;
  
  // Funciones de validación
  window.canUserVoidSale = canUserVoidSale;
  window.canUserApproveAuth = canUserApproveAuth;
  window.validateAuthorizationData = validateAuthorizationData;
  
  // ============================================
  // CONEXIÓN AUTOMÁTICA AL SERVIDOR AL INICIAR
  // ============================================
  
  // Cargar configuración del servidor desde config.json
  async function autoConnectToServer() {
    try {
      const config = await readData('config.json');
      
      if (config && config.serverURL) {
        console.log('🔄 Conectando automáticamente al servidor...');
        setServerURL(config.serverURL);
        const connected = await connectToServer();
        
        if (connected) {
          // Verificar conexión cada 30 segundos
          setInterval(async () => {
            const stillConnected = await checkServerConnection();
            if (!stillConnected && isOnline) {
              console.log('⚠️ Conexión perdida, intentando reconectar...');
              await connectToServer();
            }
          }, 30000);
        }
      } else {
        console.log('⚠️ No hay URL de servidor configurada en config.json');
      }
    } catch (error) {
      console.error('❌ Error en conexión automática:', error);
    }
  }
  
  // Ejecutar conexión automática cuando se cargue la página
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(autoConnectToServer, 1000); // Esperar 1 segundo para que todo se inicialice
  });
  
  // Procesar cola de sincronización cuando se recupere la conexión
  window.addEventListener('online', async () => {
    console.log('🌐 Conexión a internet recuperada');
    if (serverURL) {
      const reconnected = await connectToServer();
      if (reconnected && syncQueue.length > 0) {
        await processSyncQueue();
      }
    }
  });
  
  // Marcar como offline cuando se pierde la conexión a internet
  window.addEventListener('offline', () => {
    console.log('📵 Conexión a internet perdida - trabajando en modo local');
    isOnline = false;
  });
}

// ============================================
// INICIALIZACIÓN DE INPUTS - CORREGIDO
// ============================================

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Inicializando campos de entrada');
    
    // Habilitar inputs una sola vez al cargar
    setTimeout(() => {
      document.querySelectorAll('input:not([type="submit"]):not([type="button"]), textarea, select').forEach(input => {
        if (input.hasAttribute('data-keep-disabled')) {
          // Respetar campos que deben permanecer deshabilitados
          return;
        }
        input.disabled = false;
        input.readOnly = false;
      });
    }, 100);
  });
}
