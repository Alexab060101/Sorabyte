# LZR Coaching

Web premium de coaching para el mercado DACH (Alemania, Austria, Suiza).
Sitio de Luis Zabala Rodriguez — coach para coaches que ayuda a posicionarse y conseguir clientes sin cold calling.

## Stack

- HTML estático puro (sin frameworks)
- CSS inline
- JavaScript vanilla
- Fuentes: Cormorant Garamond + DM Sans
- Paleta: beige / gold / navy

## Estructura

```
.
├── index.html          # Home
├── servicios.html      # Servicios
├── nosotros.html       # Sobre Luis
├── contacto.html       # Formulario de contacto (Formspree)
├── assets/             # Imágenes, vídeo hero, logo
├── .htaccess           # Security headers (CSP, X-Frame-Options, etc.)
├── robots.txt
└── sitemap.xml
```

## Desarrollo local

Al ser HTML estático, basta con abrir `index.html` en el navegador.
Para servir con un servidor local (recomendado por temas de CORS y rutas):

```bash
# Con Python
python -m http.server 8000

# Con Node
npx serve .
```

Luego abrir http://localhost:8000

## Configuración pendiente

- [ ] Reemplazar `YOUR_FORM_ID` en `contacto.html` por el ID real de Formspree
- [ ] Añadir testimonios reales en la sección de testimonios de `index.html`
- [ ] Configurar Plausible Analytics
- [ ] Integrar Calendly embed en `contacto.html`

## Deploy

El sitio se sirve estático. Cualquier hosting compatible con HTML/`.htaccess` (Hostinger, SiteGround, Apache) funciona.
Para hostings sin Apache (Netlify, Vercel, Cloudflare Pages) las cabeceras del `.htaccess` deben portarse a su sistema equivalente.
