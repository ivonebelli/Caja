// ============================================
// UTILIDADES GLOBALES - MODO LOCAL (SIN SERVIDOR)
// ============================================

const { ipcRenderer } = require('electron');

// MODO LOCAL: Deshabilitado temporalmente el servidor
// Se reactivarÃ¡ cuando configuremos la red entre mÃºltiples PC
console.log('ðŸ“ Modo Local Activo - Trabajando sin servidor');

let isOnline = false; // Siempre false en modo local

// Funciones de servidor deshabilitadas temporalmente
function connectToServer() {
  console.log('âš ï¸ Modo local: servidor deshabilitado temporalmente');
}

function setServerURL(url) {
  console.log('âš ï¸ Modo local: configuraciÃ³n de servidor deshabilitada');
}

function getServerURL() {
  return null;
}

// ============================================
// FUNCIONES DE LECTURA/ESCRITURA DE DATOS
// ============================================

async function readData(filename) {
  try {
    console.log(`ðŸ“– Leyendo localmente: ${filename}`);
    const data = await ipcRenderer.invoke('read-json', filename);
    return data;
  } catch (error) {
    console.error(`Error leyendo ${filename}:`, error);
    return null;
  }
}

async function writeData(filename, data) {
  try {
    await ipcRenderer.invoke('write-json', filename, data);
    console.log(`ðŸ’¾ Guardado localmente: ${filename}`);
    return true;
  } catch (error) {
    console.error(`Error guardando ${filename}:`, error);
    return false;
  }
}

async function saveExcelReport(filename, arrayBuffer) {
  try {
    console.log('Intentando guardar reporte:', filename);
    const localResult = await ipcRenderer.invoke('save-excel-report', filename, arrayBuffer);
    
    if (localResult.success) {
      console.log('âœ… Reporte guardado localmente en:', localResult.path);
    }
    
    return localResult.success;
  } catch (error) {
    console.error('âŒ Error guardando reporte:', error);
    return false;
  }
}

// ============================================
// GESTIÃ“N DE SESIONES DE CAJERO
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

    return true;
  } catch (error) {
    console.error('Error en checkAndSetCashierSession:', error);
    return false;
  }
}

async function clearCashierSession(localId) {
  try {
    const sessions = await readData('active_sessions.json');
    const localKey = `local_${localId}`;
    
    if (sessions[localKey]) {
      sessions[localKey].activeCashier = null;
      sessions[localKey].lastUpdated = new Date().toISOString();
      await writeData('active_sessions.json', sessions);
    }

    return true;
  } catch (error) {
    console.error('Error en clearCashierSession:', error);
    return false;
  }
}

// ============================================
// SISTEMA DE AUTORIZACIONES
// ============================================

async function createAuthorization(authData) {
  try {
    const data = await readData('authorizations.json') || [];
    data.push(authData);
    await writeData('authorizations.json', data);
    
    return true;
  } catch (error) {
    console.error('Error creando autorizaciÃ³n:', error);
    return false;
  }
}

async function getPendingAuthorizations(localId = null) {
  try {
    const data = await readData('authorizations.json') || [];
    
    // Si no hay localId (gerencia), devolver todas las pendientes
    if (!localId) {
      return data.filter(a => a.status === 'pending');
    }
    
    // Si hay localId, filtrar por ese local
    return data.filter(a => a.status === 'pending' && a.data.localId === localId);
  } catch (error) {
    console.error('Error obteniendo autorizaciones:', error);
    return [];
  }
}

async function approveAuthorization(authId) {
  try {
    const data = await readData('authorizations.json') || [];
    const auth = data.find(a => a.id === authId);
    
    if (!auth) return false;
    
    auth.status = 'approved';
    auth.approvedAt = new Date().toISOString();
    
    // Aplicar el cambio segÃºn el tipo de autorizaciÃ³n
    if (auth.type === 'change_pin') {
      const profiles = await readData('profiles.json');
      const local = profiles.locales.find(l => l.id === auth.data.localId);
      
      if (local) {
        const profile = local.perfiles[auth.data.role].find(p => p.id === auth.data.profileId);
        if (profile) {
          profile.pin = auth.data.newPin;
          await writeData('profiles.json', profiles);
        }
      }
    }
    
    await writeData('authorizations.json', data);
    
    return true;
  } catch (error) {
    console.error('Error aprobando autorizaciÃ³n:', error);
    return false;
  }
}

async function rejectAuthorization(authId) {
  try {
    const data = await readData('authorizations.json') || [];
    const auth = data.find(a => a.id === authId);
    
    if (!auth) return false;
    
    auth.status = 'rejected';
    auth.rejectedAt = new Date().toISOString();
    
    await writeData('authorizations.json', data);
    
    return true;
  } catch (error) {
    console.error('Error rechazando autorizaciÃ³n:', error);
    return false;
  }
}

// ============================================
// FUNCIONES DE FORMATO
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
    second: '2-digit'
  }).format(date);
}

function getCurrentDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// SISTEMA DE NOTIFICACIONES
// ============================================

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
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

  if (type === 'success') {
    notification.style.background = '#10b981';
    notification.style.color = 'white';
  } else if (type === 'error') {
    notification.style.background = '#ef4444';
    notification.style.color = 'white';
  } else if (type === 'warning') {
    notification.style.background = '#f59e0b';
    notification.style.color = 'white';
  } else {
    notification.style.background = '#3b82f6';
    notification.style.color = 'white';
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================
// LIMPIEZA DE ESTADO
// ============================================

function clearAppState() {
  console.log('Limpiando estado de la aplicaciÃ³n...');
  
  // Cerrar todos los modales
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });

  // NO remover event listeners, solo limpiar valores
  setTimeout(() => {
    document.querySelectorAll('input:not([type="hidden"]), textarea').forEach(input => {
      if (input.type !== 'checkbox' && input.type !== 'radio') {
        input.value = '';
      }
      // CRÃTICO: NUNCA desactivar inputs permanentemente
      input.disabled = false;
      input.readOnly = false;
    });
  }, 50);

  // Resetear scroll y foco
  window.scrollTo(0, 0);
  
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }

  console.log('âœ… Estado limpiado completamente');
}

// ============================================
// FUNCIONES DE IMPRESIÃ“N
// ============================================

async function getPrinters() {
  try {
    const printers = await ipcRenderer.invoke('get-printers');
    return printers;
  } catch (error) {
    console.error('Error obteniendo impresoras:', error);
    return [];
  }
}

async function printTicket(orderData) {
  try {
    const ticketData = {
      storeName: 'MI NEGOCIO',
      orderNumber: orderData.orderNumber,
      date: orderData.date,
      time: orderData.time,
      cashier: orderData.cashier,
      items: orderData.items,
      total: orderData.total,
      paymentMethod: getPaymentMethodName(orderData.paymentMethod),
      pin: orderData.pin,
      qrCode: orderData.qrCode
    };

    const result = await ipcRenderer.invoke('print-ticket', ticketData);
    
    if (result.success) {
      showNotification('Ticket impreso correctamente', 'success');
      return true;
    } else {
      showNotification('Error al imprimir: ' + result.error, 'error');
      return false;
    }
  } catch (error) {
    console.error('Error imprimiendo ticket:', error);
    showNotification('Error al imprimir ticket', 'error');
    return false;
  }
}

function getPaymentMethodName(method) {
  const methods = {
    'efectivo': 'Efectivo',
    'mercadopago': 'Mercado Pago',
    'debito': 'DÃ©bito',
    'credito': 'CrÃ©dito',
    'transferencia': 'Transferencia',
    'mixto': 'Mixto'
  };
  return methods[method] || method;
}

// ============================================
// FUNCIONES DE AISLAMIENTO POR LOCAL
// ============================================

// Asegura que todos los datos incluyan localId
function ensureLocalId(data, localId) {
  if (localId) {
    data.localId = localId;
  }
  return data;
}

// Lee datos filtrados por localId (excepto para gerencia)
async function readLocalData(filename, localId) {
  const data = await readData(filename);
  if (!data || !localId || filename === 'profiles.json') return data;
  
  // Filtrar array por localId
  if (Array.isArray(data)) {
    return data.filter(item => item.localId === localId);
  }
  
  return data;
}

// Obtener perfil de usuario actual con su localId
function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  if (!userStr) return null;
  return JSON.parse(userStr);
}

// Verificar permisos de gerencia
function isGerencia() {
  const user = getCurrentUser();
  return user && user.role === 'gerencia';
}

// Verificar si el usuario puede modificar perfiles
function canModifyProfiles() {
  return isGerencia();
}

// ============================================
// ESTILOS PARA ANIMACIONES
// ============================================

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// EXPONER FUNCIONES GLOBALMENTE
// ============================================

if (typeof window !== 'undefined') {
  window.readData = readData;
  window.writeData = writeData;
  window.saveExcelReport = saveExcelReport;
  window.formatCurrency = formatCurrency;
  window.formatDateTime = formatDateTime;
  window.getCurrentDate = getCurrentDate;
  window.generateId = generateId;
  window.showNotification = showNotification;
  window.clearAppState = clearAppState;
  window.checkAndSetCashierSession = checkAndSetCashierSession;
  window.clearCashierSession = clearCashierSession;
  window.createAuthorization = createAuthorization;
  window.getPendingAuthorizations = getPendingAuthorizations;
  window.approveAuthorization = approveAuthorization;
  window.rejectAuthorization = rejectAuthorization;
  window.setServerURL = setServerURL;
  window.getServerURL = getServerURL;
  window.connectToServer = connectToServer;
  window.getPrinters = getPrinters;
  window.printTicket = printTicket;
  window.ensureLocalId = ensureLocalId;
  window.readLocalData = readLocalData;
  window.getCurrentUser = getCurrentUser;
  window.isGerencia = isGerencia;
  window.canModifyProfiles = canModifyProfiles;
}

// DelegaciÃ³n global para GARANTIZAR que inputs NUNCA se bloqueen
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    // Observer para detectar nuevos inputs agregados al DOM
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            const inputs = node.querySelectorAll ? node.querySelectorAll('input, textarea, select') : [];
            inputs.forEach(input => {
              // CRÃTICO: Asegurar que nunca estÃ©n bloqueados
              if (input.type !== 'submit' && input.type !== 'button') {
                input.disabled = false;
                input.readOnly = false;
              }
            });
            
            // Si el nodo mismo es un input
            if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') {
              if (node.type !== 'submit' && node.type !== 'button') {
                node.disabled = false;
                node.readOnly = false;
              }
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Verificar periÃ³dicamente todos los inputs
    setInterval(() => {
      document.querySelectorAll('input:not([type="submit"]):not([type="button"]), textarea, select').forEach(input => {
        if (input.disabled || input.readOnly) {
          input.disabled = false;
          input.readOnly = false;
        }
      });
    }, 1000);
  });
}

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

async function getChangeHistory(limit = 50, type = null) {
  try {
    let history = await readData('change_history.json') || [];
    
    if (type) {
      history = history.filter(h => h.type === type);
    }
    
    return history.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, limit);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return [];
  }
}

// ============================================
// FUNCIONES MEJORADAS DE AUTORIZACIONES
// ============================================

async function approveAuthorizationEnhanced(authId, approvedBy) {
  try {
    const data = await readData('authorizations.json') || [];
    const auth = data.find(a => a.id === authId);
    
    if (!auth) return false;
    
    auth.status = 'approved';
    auth.approvedAt = new Date().toISOString();
    auth.approvedBy = approvedBy;
    
    let changeApplied = false;
    
    if (auth.type === 'change_pin') {
      const profiles = await readData('profiles.json');
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
    }
    
    await writeData('authorizations.json', data);
    
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
  }
  
  return true;
}

// ============================================
// EXPONER NUEVAS FUNCIONES GLOBALMENTE
// ============================================

if (typeof window !== 'undefined') {
  window.logChange = logChange;
  window.getChangeHistory = getChangeHistory;
  window.approveAuthorizationEnhanced = approveAuthorizationEnhanced;
  window.rejectAuthorizationEnhanced = rejectAuthorizationEnhanced;
  window.voidSale = voidSale;
  window.getVoidedSales = getVoidedSales;
  window.canUserVoidSale = canUserVoidSale;
  window.canUserApproveAuth = canUserApproveAuth;
  window.validateAuthorizationData = validateAuthorizationData;
}
