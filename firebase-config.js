// INSTRUCCIONES PARA CONFIGURAR FIREBASE:
//
// 1. Ve a https://firebase.google.com/
// 2. Click en "Comenzar" o "Go to console"
// 3. Click en "Agregar proyecto" o "Add project"
// 4. Nombre del proyecto: "fran-music-feed" (o el que quieras)
// 5. Puedes deshabilitar Google Analytics (no es necesario)
// 6. Click en "Crear proyecto"
//
// 7. Una vez creado, en el panel principal:
//    - Click en el ícono de web "</>" para agregar una app web
//    - Nombre de la app: "Music Feed Chat"
//    - NO marcar "Firebase Hosting"
//    - Click en "Registrar app"
//
// 8. Copia la configuración que te da Firebase y reemplaza el objeto firebaseConfig de abajo
//
// 9. En el menú lateral, ve a "Firestore Database"
//    - Click en "Crear base de datos"
//    - Selecciona "Empezar en modo de prueba" (permite lectura/escritura por 30 días)
//    - Elige la ubicación más cercana
//    - Click en "Habilitar"
//
// 10. ¡Listo! Tu chat funcionará automáticamente

const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// NO MODIFICAR DESDE AQUÍ ABAJO
export default firebaseConfig;
