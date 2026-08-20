# BellaCap CR — web

Archivo principal: `BellaCap.dc.html`. Las fotos viven en `assets/img/`.
El sitio vive en Netlify: **bellacapcr.netlify.app**. Ver “Publicar” más abajo.

## Pendientes antes de publicar

1. **Próximo drop** en el bloque “Coming soon”. Es lo único que queda con `[PENDIENTE]`.

Ya está puesto: precios, correo (`bellacapcr@gmail.com`) y horario.

## Precios

Están en el array `CATALOGO`, en colones y sin puntos (`precio: 18000`). Son los
precios vigentes, los que van **sin tachar** en las promos de Instagram:

| Gorra | Precio |
|---|---|
| Guy Fieri Philadelphia Stitch 59FIFTY | ₡24.000 |
| Golden State Warriors 59FIFTY | ₡24.000 |
| Boston Red Sox Shadow Stitch 59FIFTY | ₡18.000 |
| Brooklyn Nets 59FIFTY | ₡18.000 |
| Atlanta Braves Player's 59FIFTY | ₡17.500 |
| Baltimore Orioles Vintage Retro 9FIFTY | ₡16.500 |
| Chicago White Sox Logo Essentials 9FORTY | ₡16.500 |
| Day of the Dead 59FIFTY | ₡15.000 |
| Los Angeles Lakers 59FIFTY | ₡15.000 |

La web calcula sola el abono del 50% y lo mete en el mensaje de WhatsApp.

El detalle, junto con los precios viejos y las gorras que tenés pero no están en
el sitio, está en `Claude Cowork/Cotizaciones/historial.md`.

## Cambiar el número de WhatsApp

Está en dos lugares:
- Panel de Tweaks → campo **whatsapp** (solo los 8 dígitos, sin el 506).
- En el código: `whatsapp` en la sección de props, y `+50663969157` en el bloque JSON-LD.

## Agregar una gorra

En la lógica, al inicio, está el array `CATALOGO`. Agregá un objeto y una foto en `assets/img/`:

```js
{ id: "yankees-5950", nombre: "New York Yankees 59FIFTY", marca: "New Era",
  liga: "MLB", equipo: "New York Yankees", color: "Negro", talla: "7 1/2",
  precio: 32000, imagen: "assets/img/yankees.png",
  estado: "disponible", destacado: false }
```

- `estado`: `"disponible"` | `"ultimas"` (badge rojo) | `"agotado"` (badge gris).
- `destacado: true` → aparece también en el carrusel “Recién llegadas”.
- Los filtros de marca, liga y color se generan solos desde el array. No hay que tocar nada más.
- Las fotos: cuadradas, fondo blanco, ~760×760 px.

## Apartado

`abonoPct` (50) y `plazoDias` (15) están en el panel de Tweaks. Cambiarlos actualiza el hero, la barra de confianza, los 3 pasos y el mensaje de WhatsApp de una sola vez.

## Nota legal

El footer aclara que BellaCap es revendedor independiente, sin afiliación con New Era, MLB o NBA. No borres ese texto.

## Publicar

El sitio está en Netlify (bellacapcr.netlify.app). Se sube arrastrando una
carpeta a [Netlify Drop](https://app.netlify.com/drop), no un archivo suelto.

```bash
python herramientas/publicar.py
```

Eso arma la carpeta `publicar/` (3,7 MB, 14 archivos):

```
publicar/
  index.html          <- la página (copia de BellaCap.dc.html)
  support.js          <- sin esto la página sale en blanco
  assets/img/*.png    <- las 9 fotos
  assets/3d/*         <- la gorra 3D
```

Arrastrá la **carpeta `publicar` entera**. No arrastres `BellaCap.dc.html` solo:
esa página se arma con `support.js` en el navegador, y sin él no se ve nada.

Tiene que llamarse `index.html` o Netlify muestra “Página no encontrada”. El
script ya lo renombra, así que si Netlify te pregunta si querés renombrar algo,
es señal de que subiste el archivo equivocado.

Correr el script después de **cualquier** cambio en `BellaCap.dc.html` o en las
fotos, o lo que se sube queda viejo.


## La gorra 3D de la portada

En el hero gira una gorra real en 3D: el modelo sale de `Cap01.blend` (New York
Yankees 59FIFTY). Vive en `assets/3d/`:

| Archivo | Qué es | Peso |
| --- | --- | --- |
| `cap.glb` | El modelo con sus texturas (color, normales, rugosidad) | 669 KB |
| `cap-viewer.js` | El visor ya compilado (three.js + la lógica del giro) | 561 KB |
| `cap-viewer.src.js` | El mismo visor sin comprimir, para poder leerlo y tocarlo | 9 KB |
| `cap-poster.webp` | Una foto del modelo en la pose exacta con la que arranca | 15 KB |

Cómo se comporta:

- Gira sola, una vuelta cada 26 segundos.
- Si la arrastrás, la seguís 1 a 1. Al soltarla se queda con tu velocidad y
  vuelve sola al giro base, sin cortes. Se puede agarrar en cualquier momento.
- El póster se ve al instante y el modelo lo reemplaza cuando termina de cargar.
  Como los dos usan la misma cámara y la misma pose, no hay salto.
- Deja de dibujar cuando el hero sale de pantalla o cambiás de pestaña.
- Con "reducir movimiento" activado no gira sola, pero se sigue pudiendo arrastrar.
- Sin WebGL se queda el póster.

### Cambiar la gorra del hero

Hace falta Python con `numpy` y `Pillow`. Los scripts están en `herramientas/`:

```bash
python herramientas/extract.py    # lee el .blend y saca la malla
python herramientas/mkglb.py      # arma cap.glb con las texturas
python herramientas/poster.py     # renderiza cap-poster.webp
```

Ajustá las rutas al `.blend` y a la carpeta de texturas dentro de `extract.py`,
`mkglb.py` y `poster.py`. Después copiá los tres archivos a `assets/3d/`.

Para tocar cómo se ve o cómo gira, editá `assets/3d/cap-viewer.src.js`
(velocidad de giro, luces, cámara) y recompilá:

```bash
npx esbuild assets/3d/cap-viewer.src.js --bundle --minify --format=iife --target=es2019 --outfile=assets/3d/cap-viewer.js --banner:js="if(!window.__BC_VISOR__){window.__BC_VISOR__=1;" --footer:js="}"
```

