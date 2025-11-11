// init-data.js - Script para inicializar datos de ejemplo
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data');

// Crear carpeta data si no existe
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
  console.log('✅ Carpeta /data creada');
}

// Datos de ejemplo
const exampleData = {
  'profiles.json': {
    cajero: [
      {
        id: 'cajero1',
        name: 'Jorge García',
        createdAt: new Date().toISOString()
      },
      {
        id: 'cajero2',
        name: 'María López',
        createdAt: new Date().toISOString()
      }
    ],
    administrativo: [
      {
        id: 'admin1',
        name: 'Carlos Ruiz',
        createdAt: new Date().toISOString()
      }
    ],
    gerencia: [
      {
        id: 'gerencia1',
        name: 'Ana Martínez',
        createdAt: new Date().toISOString()
      }
    ]
  },

  'products.json': [
    {
      id: 'prod1',
      name: 'Impresión 10x15',
      price: 1500,
      description: 'Impresión fotográfica 10x15 cm en papel premium',
      icon: '📷',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod2',
      name: 'Impresión 15x20',
      price: 2500,
      description: 'Impresión fotográfica 15x20 cm en papel premium',
      icon: '🖼️',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod3',
      name: 'Impresión 20x30',
      price: 3500,
      description: 'Impresión fotográfica 20x30 cm en papel premium',
      icon: '📄',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod4',
      name: 'Marco Digital',
      price: 500,
      description: 'Marco digital decorativo para fotos',
      icon: '🎁',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod5',
      name: 'Pack 10 Fotos',
      price: 12000,
      description: 'Pack de 10 impresiones 10x15 con descuento',
      icon: '📦',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod6',
      name: 'Álbum Premium',
      price: 8000,
      description: 'Álbum fotográfico con 20 páginas',
      icon: '📚',
      createdAt: new Date().toISOString()
    }
  ],

  'orders.json': [],

  'cash_register.json': {
    sessions: []
  },

  'config.json': {
    lastOrderNumber: 0,
    lastPIN: 100000
  }
};

// Escribir archivos
Object.entries(exampleData).forEach(([filename, data]) => {
  const filePath = path.join(dataPath, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ ${filename} creado con datos de ejemplo`);
});

console.log('\n🎉 ¡Datos de ejemplo inicializados correctamente!');
console.log('\n📋 Perfiles creados:');
console.log('   Cajeros: Jorge García, María López');
console.log('   Administrativos: Carlos Ruiz');
console.log('   Gerencia: Ana Martínez');
console.log('\n📦 Productos creados:');
console.log('   - Impresión 10x15 ($1500)');
console.log('   - Impresión 15x20 ($2500)');
console.log('   - Impresión 20x30 ($3500)');
console.log('   - Marco Digital ($500)');
console.log('   - Pack 10 Fotos ($12000)');
console.log('   - Álbum Premium ($8000)');
console.log('\n🚀 Ahora ejecuta: npm install');
console.log('   Luego ejecuta: npm start'); 
