/*
 * BellaCap — visor 3D de la gorra del hero.
 *
 * La gorra gira sola, despacio. Si la agarrás, la seguís 1:1; al soltarla se
 * queda con tu velocidad y vuelve sola al giro base. Nunca hay que esperar a
 * que termine una animación para volver a tocarla.
 */
import {
  ACESFilmicToneMapping, Color, DirectionalLight, Group, MathUtils, PCFSoftShadowMap,
  PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'three';

const GIRO_BASE = (Math.PI * 2) / 26;   // una vuelta cada 26 s
const TAU_VUELTA = 0.85;                // s — cuánto tarda el impulso en volver al giro base
const SENSIBILIDAD = 0.0085;            // rad por px arrastrado
const DECELERACION = 0.995;             // proyección de momento al soltar

function proyectar(velocidad) {
  return (velocidad * DECELERACION) / (1 - DECELERACION) / 1000;
}

export function montarGorra(host) {
  if (!host || host.dataset.bcMontado) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const url = host.dataset.bcModelo || 'assets/3d/cap.glb';

  let gl;
  try {
    gl = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    host.dataset.bcEstado = 'sin-webgl';
    return;
  }
  host.dataset.bcMontado = '1';

  gl.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  gl.toneMapping = ACESFilmicToneMapping;
  gl.toneMappingExposure = 0.92;
  gl.outputColorSpace = SRGBColorSpace;
  gl.shadowMap.enabled = false;
  gl.shadowMap.type = PCFSoftShadowMap;

  const lienzo = gl.domElement;
  lienzo.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab;opacity:0;transition:opacity 700ms cubic-bezier(0.23,1,0.32,1);';
  lienzo.setAttribute('role', 'img');
  lienzo.setAttribute('aria-label', 'Gorra New York Yankees 59FIFTY negra, girando. Arrastrá para girarla vos.');
  host.appendChild(lienzo);

  const escena = new Scene();
  // Cámara clavada a la misma pose que el póster: cuando el modelo entra,
  // reemplaza la imagen exactamente, sin salto.
  const camara = new PerspectiveCamera(30, 1, 0.1, 100);
  camara.position.set(0, 0.30, 2.30);
  camara.lookAt(0, 0.02, 0);

  // Estudio: entorno suave de base, luz principal, y un contraluz dorado que es
  // lo único que separa una gorra negra de un fondo negro.
  const pmrem = new PMREMGenerator(gl);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.02);
  escena.environment = entorno.texture;

  const principal = new DirectionalLight(0xffffff, 2.2);
  principal.position.set(1.9, 2.5, 2.4);
  escena.add(principal);

  const contraluz = new DirectionalLight(new Color(0xC9A227), 4.2);
  contraluz.position.set(-2.5, 1.1, -3.0);
  escena.add(contraluz);

  const relleno = new DirectionalLight(new Color(0x5B74A8), 0.75);
  relleno.position.set(-3.2, -0.6, 1.8);
  escena.add(relleno);

  const pivote = new Group();     // giro del usuario
  const inclinacion = new Group(); // respuesta al puntero
  inclinacion.add(pivote);
  escena.add(inclinacion);

  let modelo = null;
  let giro = -0.5411;   // -31°, la pose del póster
  let velocidad = reduce ? 0 : GIRO_BASE;
  let arrastrando = false;
  let idPuntero = null;
  let ultimoX = 0;
  let muestras = [];
  let inclinaObjX = 0, inclinaObjY = 0;
  let inclinaX = 0, inclinaY = 0;
  let velInclinaX = 0, velInclinaY = 0;
  let desplazamiento = 0;
  let visible = true;
  let corriendo = false;
  let anim = 0;

  new GLTFLoader().load(url, (gltf) => {
    modelo = gltf.scene;
    modelo.traverse((n) => {
      if (!n.isMesh) return;
      n.frustumCulled = false;
      const m = n.material;
      if (m) {
        // El entorno casi no afecta a la tela negra (rugosidad alta) pero es lo que
        // hace brillar el sticker dorado, que es metal liso.
        m.envMapIntensity = 0.38;
        // La tela reacciona mejor con un punto de brillo apenas por encima del mapa.
        if (m.roughness !== undefined) m.roughness = Math.min(m.roughness, 0.92);
      }
    });
    pivote.add(modelo);
    host.dataset.bcEstado = 'listo';
    lienzo.style.opacity = '1';
    arrancar();
  }, undefined, () => {
    host.dataset.bcEstado = 'error';
  });

  function medir() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    gl.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(medir);
  ro.observe(host);
  medir();

  // ---- gesto -------------------------------------------------------------
  lienzo.addEventListener('pointerdown', (e) => {
    if (idPuntero !== null) return;           // un solo dedo manda
    idPuntero = e.pointerId;
    lienzo.setPointerCapture(idPuntero);
    arrastrando = true;
    ultimoX = e.clientX;
    muestras = [{ x: e.clientX, t: performance.now() }];
    velocidad = 0;
    lienzo.style.cursor = 'grabbing';
    arrancar();
  });

  lienzo.addEventListener('pointermove', (e) => {
    inclinaObjY = ((e.clientX - host.getBoundingClientRect().left) / host.clientWidth - 0.5) * 0.16;
    inclinaObjX = ((e.clientY - host.getBoundingClientRect().top) / host.clientHeight - 0.5) * 0.14;
    if (!arrastrando || e.pointerId !== idPuntero) return;
    giro += (e.clientX - ultimoX) * SENSIBILIDAD;
    ultimoX = e.clientX;
    const ahora = performance.now();
    muestras.push({ x: e.clientX, t: ahora });
    while (muestras.length > 6) muestras.shift();
  });

  function soltar(e) {
    if (e.pointerId !== idPuntero) return;
    arrastrando = false;
    idPuntero = null;
    lienzo.style.cursor = 'grab';
    const a = muestras[0], b = muestras[muestras.length - 1];
    const dt = b && a ? b.t - a.t : 0;
    // px/ms -> rad/s, y de ahí el punto donde el impulso se apagaría solo.
    const vPx = dt > 8 ? (b.x - a.x) / dt : 0;
    velocidad = vPx * SENSIBILIDAD * 1000;
    giro += proyectar(vPx * SENSIBILIDAD) * 0.35;
    muestras = [];
  }
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);
  lienzo.addEventListener('pointerleave', () => { inclinaObjX = 0; inclinaObjY = 0; });

  // ---- bucle -------------------------------------------------------------
  let anterior = performance.now();
  function cuadro(ahora) {
    anim = requestAnimationFrame(cuadro);
    const dt = Math.min((ahora - anterior) / 1000, 0.05);
    anterior = ahora;

    if (!arrastrando) {
      // El impulso se funde con el giro base en vez de cortarse: sin costura.
      const k = 1 - Math.exp(-dt / TAU_VUELTA);
      velocidad += ((reduce ? 0 : GIRO_BASE) - velocidad) * k;
      giro += velocidad * dt;
    }

    // Inclinación con resorte críticamente amortiguado (sin rebote).
    const w = 12;
    velInclinaX += (-w * w * (inclinaX - inclinaObjX) - 2 * w * velInclinaX) * dt;
    velInclinaY += (-w * w * (inclinaY - inclinaObjY) - 2 * w * velInclinaY) * dt;
    inclinaX += velInclinaX * dt;
    inclinaY += velInclinaY * dt;

    pivote.rotation.y = giro;

    if (modelo) {
      inclinacion.rotation.x = inclinaX + desplazamiento * 0.10;
      inclinacion.rotation.z = inclinaY * 0.5;
      inclinacion.position.y = desplazamiento * -0.26;
    }

    gl.render(escena, camara);
  }

  function arrancar() {
    if (corriendo || !visible || document.hidden) return;
    corriendo = true;
    anterior = performance.now();
    anim = requestAnimationFrame(cuadro);
  }
  function parar() {
    corriendo = false;
    cancelAnimationFrame(anim);
  }

  // No gastamos batería girando algo que nadie está viendo.
  new IntersectionObserver((ents) => {
    visible = ents[0].isIntersecting;
    visible ? arrancar() : parar();
  }, { threshold: 0.02 }).observe(host);
  document.addEventListener('visibilitychange', () => (document.hidden ? parar() : arrancar()));

  if (!reduce) {
    addEventListener('scroll', () => {
      const r = host.getBoundingClientRect();
      desplazamiento = MathUtils.clamp(-r.top / Math.max(1, innerHeight), -0.5, 1);
    }, { passive: true });
  }

  // El handle deja mirar la escena desde fuera: sirve para depurar el render.
  return { parar, arrancar, gl, escena, camara, pivote, get modelo() { return modelo; } };
}

function iniciar() {
  document.querySelectorAll('[data-bc-cap]').forEach(montarGorra);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
// La página se pinta con React después del script: reintentamos cuando aparezca.
new MutationObserver(() => {
  if (document.querySelector('[data-bc-cap]:not([data-bc-montado])')) iniciar();
}).observe(document.documentElement, { childList: true, subtree: true });

window.BellaCap3D = { montarGorra };
