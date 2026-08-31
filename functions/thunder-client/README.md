# Pruebas manuales con Thunder Client

1. Inicia los emuladores desde la raíz del repositorio:

   ```powershell
   npx -y firebase-tools@latest emulators:start --project jardines-de-minerva --only auth,firestore,functions
   ```

2. En Thunder Client, importa
   `functions/thunder-client/jardines-emulator.postman_collection.json` como
   colección Postman v2.1.
3. Ejecuta las solicitudes 01 y 02. Copia `localId` de la respuesta de la
   solicitud 02 a la variable `residentUid`.
4. Asigna el rol inicial de administrador al usuario creado. En otra terminal
   de PowerShell, desde `functions/`, ejecuta:

   ```powershell
   $env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9100"
   $env:INITIAL_ADMIN_EMAIL="admin@example.test"
   $env:INITIAL_ADMIN_PASSWORD="correct-horse-battery-staple"
   npm run bootstrap:admin
   ```

5. Ejecuta la solicitud 03 y copia `idToken` a `adminToken`. Ejecuta 04 y
   copia su `idToken` a `residentToken`.
6. Corre 05 a 10 en orden. La solicitud 10 ejecuta localmente el trigger
   programado; en el emulador no espera al calendario real.
7. En la solicitud 11 reemplaza `resident-1_YYYY-MM` por el período devuelto
   por la solicitud 10, por ejemplo `resident-1_2026-08`. Ejecuta 11 a 15.
8. Ejecuta 16 y 17 para validar autorización y esquema: deben devolver 403 y
   400, respectivamente.

Las Callable Functions requieren `POST`, `Content-Type: application/json`, el
encabezado `Authorization: Bearer <Firebase ID token>` cuando aplique y un
cuerpo envuelto en `{"data": ...}`. El archivo usa ese protocolo.

Para reiniciar totalmente los datos, detén los emuladores y vuelve a iniciarlos
sin importar datos persistidos.
