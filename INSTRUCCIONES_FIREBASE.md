# 🔥 INSTRUCCIONES PARA CONFIGURAR FIREBASE

## Pasos para activar el chat:

### 1. Crear cuenta en Firebase (GRATIS)
- Ve a: https://firebase.google.com/
- Click en "Comenzar" o "Go to console"
- Inicia sesión con tu cuenta de Google

### 2. Crear proyecto
- Click en "Agregar proyecto" o "Add project"
- Nombre del proyecto: **fran-music-feed** (o el que prefieras)
- Puedes **deshabilitar Google Analytics** (no es necesario)
- Click en "Crear proyecto"
- Espera a que se cree (30 segundos aprox)

### 3. Configurar app web
- Una vez en el panel del proyecto, busca el ícono **</>** (web)
- Click en ese ícono para agregar una app web
- Nombre de la app: **Music Feed Chat**
- **NO** marcar "Firebase Hosting"
- Click en "Registrar app"

### 4. Copiar configuración
- Firebase te mostrará un código con `firebaseConfig`
- Copia **SOLO** el objeto firebaseConfig que se ve así:

```javascript
const firebaseConfig = {
    apiKey: "AIza...",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### 5. Pegar configuración en el HTML
- Abre el archivo **index.html**
- Busca la línea 68 que dice: `const firebaseConfig = {`
- Reemplaza ese objeto completo con el que copiaste de Firebase
- Guarda el archivo

### 6. Crear base de datos Firestore
- En el menú lateral de Firebase, busca **"Firestore Database"**
- Click en "Crear base de datos"
- Selecciona **"Empezar en modo de prueba"** (permite lectura/escritura por 30 días)
- Elige la ubicación más cercana (ej: us-east1, southamerica-east1)
- Click en "Habilitar"
- Espera unos segundos a que se cree

### 7. ¡LISTO!
- Abre tu **index.html** en el navegador
- El chat debería funcionar inmediatamente
- Escribe tu nick y envía un mensaje
- Abre la página en otra pestaña para ver que funciona en tiempo real

---

## 📝 Notas importantes:

- El modo de prueba dura **30 días**
- Después deberás configurar reglas de seguridad (te aviso cuando se acerque)
- El chat es **en tiempo real** - todos los visitantes lo verán
- Los mensajes se guardan en la base de datos
- El nick se guarda en tu navegador (localStorage)

---

## 🆘 Si algo no funciona:

1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que copiaste bien el firebaseConfig en index.html
4. Asegúrate de haber creado la base de datos Firestore en modo de prueba

---

¡Disfruta tu chat! 🎧
