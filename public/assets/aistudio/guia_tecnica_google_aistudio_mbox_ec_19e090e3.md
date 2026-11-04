# GUÍA TÉCNICA DE IMPLEMENTACIÓN - BRANDING Y UI MBOX_EC
**Para ser ejecutado en Google AI Studio (System Instructions / Prompt de Actualización)**

---

## 1. OBJETIVO DEL DOCUMENTO
Este documento proporciona las directrices exactas para que el modelo en **Google AI Studio** modifique el código fuente, la identidad gráfica y los recursos multimedia de la plataforma web y PWA **Mbox_Ec** (Servicio de streaming de películas, series y video en vivo).

> **Nota de exclusión:** No aplicar modificaciones ni reemplazos sobre el banner promocional cinemático secundario (Imagen 2 de sesiones anteriores), preservando únicamente la identidad visual de marca y recursos de despliegue aquí indicados.

---

## 2. PARÁMETROS GLOBALES DE IDENTIDAD

| Parámetro | Valor Requerido | Regla Crítica |
| :--- | :--- | :--- |
| **Nombre de Marca** | `Mbox_Ec` | Respetar grafía exacta con guion bajo (`_`) |
| **Idioma obligatorio** | Español (100%) | Ningún texto de interfaz o rótulo en inglés |
| **Paleta de Colores** | • Rojo Neón: `#FF1A24` / `#FF242E`<br>• Rojo Sombra: `#A00007`<br>• Negro Carbón: `#08080A` / `#0E0F14`<br>• Blanco Óptico: `#FFFFFF` | Prohibido usar paletas de colores corporativos de Google (azul, amarillo, verde) |
| **Estilo del Isotipo** | Pantalla/Caja de cine tridimensional (*Cinema Box*) con facetas prismáticas rojas | **SIN botón de play**. **SIN** trazos curvos o tubulares que asemejen el logo de Gmail o Google |

---

## 3. INSTRUCCIONES ESPECÍFICAS: QUÉ CAMBIAR, DÓNDE Y CÓMO

### A. LOGOTIPO PRINCIPAL (Header y Footer)
* **Dónde cambiar:**
  - Archivo de layout principal (e.g. `index.html`, `Navbar.tsx`, `Header.vue` o `_app.tsx`).
  - Buscar la etiqueta `<img>` o el contenedor SVG del logo de la barra de navegación superior.
* **Qué cambiar:**
  - Reemplazar cualquier versión anterior con isotipo de triángulo (*play*) o tipografías en inglés (*"STREAMING PLATFORM"*).
* **Cómo cambiar:**
  - Integrar el isotipo en forma de cubo/caja cinematográfica con prismas verticales angulados en gradiente rojo y línea reflectiva blanca inferior.
  - El texto debe decir exactamente: `MBOX` en blanco, `_EC` en rojo neón `#FF1A24`.
  - Subtítulo o tagline en español: `PLATAFORMA DE STREAMING` con insignias: `PELÍCULAS`, `SERIES`, `EN VIVO`.

---

### B. FAVICON Y APP ICON (Pestaña del Navegador y Dispositivos)
* **Dónde cambiar:**
  - En la sección `<head>` de todas las plantillas HTML:
    ```html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    ```
* **Qué cambiar:**
  - Eliminar favicons por defecto o iconos genéricos con flechas de reproducción.
* **Cómo cambiar:**
  - Generar o enlazar el icono de formato squircle (512x512) con fondo carbón oscuro `#141419`, marco con borde sutil `#252530`, y en el centro el emblema del portal *Cinema Box* con halo neón rojo `#FF1A24` y el rótulo inferior `MBOX_EC`.

---

### C. MANIFIESTO PWA Y PANTALLA SPLASH (Android / iOS / Desktop)
* **Dónde cambiar:**
  - Archivo `manifest.json` (o `site.webmanifest`).
* **Qué cambiar:**
  - Actualizar los campos de texto a español y referenciar los nuevos iconos de alta densidad (*maskable*).
* **Cómo cambiar:**
  - Actualizar el contenido de `manifest.json` con la siguiente estructura:
  ```json
  {
    "name": "Mbox_Ec - Streaming en Español",
    "short_name": "Mbox_Ec",
    "description": "Tu cine en casa: Películas, Series y Contenido Exclusivo en vivo",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#08080A",
    "theme_color": "#FF1A24",
    "lang": "es",
    "icons": [
      {
        "src": "/icons/icon-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }
    ]
  }
  ```
  - **Especificación del Splash PWA:** Imagen centrada con zona de seguridad del 80% (*safe-zone*), monograma prismático *Cinema Box*, texto principal `MBOX_EC`, subtítulo en rojo `STREAMING EN ESPAÑOL` y pie en gris claro `PELÍCULAS · SERIES · EN VIVO`.

---

### D. TEXTOS, MICROCOPY Y NAVEGACIÓN
* **Dónde cambiar:**
  - Todos los botones de llamada a la acción (CTA), menús, modales de suscripción y metadatos SEO.
* **Qué cambiar:**
  - Eliminar términos anglosajones como *"Watch now"*, *"Sign in"*, *"Trending"*, *"Home"*, *"Streaming Platform"*.
* **Cómo cambiar:**
  - Remapear las cadenas de texto a:
    - Botón de reproducción principal: `Comenzar a ver` o `Reproducir ahora`.
    - Catálogo: `Ver catálogo completo`.
    - Secciones del menú: `Inicio`, `Películas`, `Series`, `En Vivo`, `Mi Lista`, `Perfil`.
    - Hero / Título de bienvenida: `Mbox_Ec: Tu cine en casa`.

---

## 4. CHECKLIST DE VERIFICACIÓN PARA GOOGLE AI STUDIO
1. [ ] ¿El isotipo está completamente libre de botones o flechas de reproducción (*play*)?
2. [ ] ¿El isotipo tiene estructura de caja/pantalla de cine y no guarda similitud con Gmail o Google?
3. [ ] ¿El 100% de los textos e interfaces están redactados en español estándar?
4. [ ] ¿El manifest y los favicons apuntan a recursos con contraste optimizado sobre fondo negro `#08080A` y rojo neón `#FF1A24`?
5. [ ] ¿Se omitió cualquier alteración a la imagen cinematográfica secundaria existente?
