const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

let contador = 1;
let letraIndex = 0;

let menuAbierto = false;
let opcionSeleccionada = 0;
let rotado = false;
let anguloRotacion = 0;
let timerAnuncio = null;
const STATE_KEY = "turnero_state";

const modos = [
  {
    nombre: "2 cifras (00-99)",
    digitos: 2,
    usaLetra: false,
    maximo: 99,
  },
  {
    nombre: "2 cifras con letra (A00-Z99)",
    digitos: 2,
    usaLetra: true,
    maximo: 99,
  },
  {
    nombre: "3 cifras (000-999)",
    digitos: 3,
    usaLetra: false,
    maximo: 999,
  },
  {
    nombre: "3 cifras con letra (A000-Z999)",
    digitos: 3,
    usaLetra: true,
    maximo: 999,
  },
  {
    nombre: "🔄 Reiniciar contador",
    accion: "reiniciar",
  },
  {
    nombre: "↻ Girar contenido",
    accion: "rotar",
  },
];

let modoActual = 3;

function actualizarFechaHora() {
  const ahora = new Date();

  document.getElementById("fecha").textContent = ahora.toLocaleDateString(
    "es-DO",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  document.getElementById("hora").textContent =
    ahora.toLocaleTimeString("es-DO");
}

setInterval(actualizarFechaHora, 1000);
actualizarFechaHora();

function obtenerTextoTurno() {
  const modo = modos[modoActual];
  const numero = String(contador).padStart(modo.digitos, "0");

  if (!modo.usaLetra) {
    return numero;
  }

  return LETRAS[letraIndex] + numero;
}

function animarTurno() {
  const turno = document.getElementById("turno");

  turno.textContent = obtenerTextoTurno();
  turno.classList.remove("animar-turno");
  void turno.offsetWidth;
  turno.classList.add("animar-turno");
}

function actualizarTurno() {
  animarTurno();
  saveState();
  anunciarTurno();
}

function anunciarTurno() {
  if (timerAnuncio !== null) {
    clearTimeout(timerAnuncio);
    timerAnuncio = null;
  }
  speechSynthesis.cancel();

  const textoTurno = obtenerTextoTurno();
  let reproduccionesRestantes = 3;

  function reproducirVoz() {
    if (reproduccionesRestantes === 0) return;
    animarTurno();
    const utterance = new SpeechSynthesisUtterance(textoTurno);
    utterance.lang = "es-ES";
    utterance.rate = 0.7;
    utterance.pitch = 1;
    utterance.volume = 1;

    speechSynthesis.speak(utterance);
    reproduccionesRestantes--;

    if (reproduccionesRestantes > 0) {
      timerAnuncio = setTimeout(reproducirVoz, 3000);
    }
  }

  reproducirVoz();
}

function siguienteTurno() {
  const modo = modos[modoActual];

  contador++;

  if (contador > modo.maximo) {
    contador = 0;

    if (modo.usaLetra) {
      letraIndex++;

      if (letraIndex >= LETRAS.length) {
        letraIndex = 0;
      }
    }
  }

  actualizarTurno();
}

function turnoAnterior() {
  const modo = modos[modoActual];

  contador--;

  if (contador < 0) {
    contador = modo.maximo;

    if (modo.usaLetra) {
      letraIndex--;

      if (letraIndex < 0) {
        letraIndex = LETRAS.length - 1;
      }
    }
  }

  actualizarTurno();
}

function abrirMenu() {
  menuAbierto = true;
  document.getElementById("modalConfig").classList.remove("oculto");
  renderizarMenu();
}

function cerrarMenu() {
  menuAbierto = false;
  document.getElementById("modalConfig").classList.add("oculto");
}

function renderizarMenu() {
  const lista = document.getElementById("listaModos");

  lista.innerHTML = "";

  modos.forEach((modo, index) => {
    const li = document.createElement("li");
    li.textContent = modo.nombre;

    if (index === opcionSeleccionada) {
      li.classList.add("seleccionado");
    }

    lista.appendChild(li);
  });

  document.getElementById("modoActual").textContent =
    "Modo actual: " + modos[modoActual].nombre;
}

function seleccionarModo() {
  const opcion = modos[opcionSeleccionada];

  if (opcion.accion === "reiniciar") {
    reiniciarContador();
    cerrarMenu();
    return;
  }

  if (opcion.accion === "rotar") {
    girarContenido();
    cerrarMenu();
    return;
  }

  modoActual = opcionSeleccionada;
  contador = 0;
  letraIndex = 0;

  actualizarTurno();
  cerrarMenu();
}

function girarContenido() {
  anguloRotacion = (anguloRotacion + 90) % 360;
  rotado = anguloRotacion !== 0;

  if (rotado) {
    aplicarRotacion();
    document.documentElement.classList.add("rotado");
  } else {
    quitarRotacion();
    document.documentElement.classList.remove("rotado");
  }

  saveState();
}

function aplicarRotacion() {
  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  const turnero = document.querySelector(".turnero");
  const angle = anguloRotacion;

  let left = 0;
  let top = 0;
  let width = ancho;
  let height = alto;

  if (angle === 90) {
    left = ancho;
    width = alto;
    height = ancho;
  } else if (angle === 180) {
    left = ancho;
    top = alto;
    width = ancho;
    height = alto;
  } else if (angle === 270) {
    top = alto;
    width = alto;
    height = ancho;
  }

  document.documentElement.style.cssText =
    `transform: rotate(${angle}deg); transform-origin: 0 0; position: absolute; top: ${top}px; left: ${left}px; width: ${width}px; height: ${height}px; overflow: hidden;`;

  document.body.style.cssText =
    `position: absolute; top: 0; left: 0; width: ${width}px; height: ${height}px; overflow: hidden; margin: 0; padding: 0;`;

  if (turnero) {
    const menor = Math.min(ancho, alto);
    const alturaTurnero = Math.round(menor * 0.23);
    turnero.style.height = `${alturaTurnero}px`;
    turnero.style.maxHeight = `${alturaTurnero}px`;
  }
}

function quitarRotacion() {
  document.documentElement.style.cssText = "";
  document.body.style.cssText = "";

  const turnero = document.querySelector(".turnero");

  if (turnero) {
    turnero.style.height = "";
    turnero.style.maxHeight = "";
  }
}

window.addEventListener("resize", () => {
  aplicarConfiguracionResponsive();

  if (rotado) {
    aplicarRotacion();
  }
});

window.addEventListener("orientationchange", () => {
  aplicarConfiguracionResponsive();
});

function reiniciarContador() {
  contador = 0;
  letraIndex = 0;
  actualizarTurno();
}

function aplicarConfiguracionResponsive() {
  const ancho = window.innerWidth;
  const esPortrait = window.matchMedia("(orientation: portrait)").matches;
  const turnero = document.querySelector(".turnero");
  const numeroTurno = document.querySelector(".numero-turno");
  const fechaHora = document.querySelector(".fecha-hora");
  const identificador = document.querySelector(".identificador");
  const modalContenido = document.querySelector(".modal-contenido");

  if (
    !turnero ||
    !numeroTurno ||
    !fechaHora ||
    !identificador ||
    !modalContenido
  ) {
    return;
  }

  if (esPortrait) {
    turnero.style.height = "28vh";
    numeroTurno.style.fontSize = "clamp(4.5rem, 20vw, 10rem)";
    fechaHora.style.padding = "0.4rem 0.75rem";
    identificador.style.fontSize = "clamp(0.95rem, 2.8vw, 1.2rem)";
    modalContenido.style.maxWidth = "95vw";
  } else if (ancho <= 720) {
    turnero.style.height = "24vh";
    numeroTurno.style.fontSize = "clamp(3.5rem, 18vw, 9.5rem)";
    fechaHora.style.padding = "0.35rem 0.7rem";
    identificador.style.fontSize = "clamp(0.9rem, 2.2vw, 1.1rem)";
    modalContenido.style.maxWidth = "95vw";
  } else if (ancho <= 1024) {
    turnero.style.height = "25vh";
    numeroTurno.style.fontSize = "clamp(5.5rem, 18vw, 12rem)";
    fechaHora.style.padding = "0.4rem 1rem";
    identificador.style.fontSize = "clamp(1rem, 2vw, 1.2rem)";
    modalContenido.style.maxWidth = "90vw";
    numeroTurno.style.marginTop = "1.5rem";
  } else {
    turnero.style.height = "23vh";
    numeroTurno.style.fontSize = "clamp(7.5rem, 28vw, 17rem)";
    fechaHora.style.padding = "0.3rem 0.8rem";
    identificador.style.fontSize = "clamp(1rem, 2vw, 1.3rem)";
    modalContenido.style.maxWidth = "650px";
  }

  if (ancho <= 540 || esPortrait) {
    document.body.style.fontSize = "0.95rem";
  } else {
    document.body.style.fontSize = "1rem";
  }
}

function saveState() {
  try {
    const state = {
      contador,
      letraIndex,
      modoActual,
      anguloRotacion,
      rotado,
    };

    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    // almacenamiento no disponible
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;

    const s = JSON.parse(raw);

    if (typeof s.contador === "number") contador = s.contador;
    if (typeof s.letraIndex === "number") letraIndex = s.letraIndex;
    if (typeof s.modoActual === "number") modoActual = s.modoActual;
    if (typeof s.anguloRotacion === "number") anguloRotacion = s.anguloRotacion;
    if (typeof s.rotado === "boolean") rotado = s.rotado;

    const modo = modos[modoActual] || modos[0];
    if (typeof contador === "number") {
      if (contador < 0) contador = 0;
      if (contador > modo.maximo) contador = modo.maximo;
    }
    if (typeof letraIndex === "number") {
      if (letraIndex < 0) letraIndex = 0;
      if (letraIndex >= LETRAS.length) letraIndex = 0;
    }
  } catch (e) {
    // estado no cargado
  }
}

document.addEventListener("keydown", (e) => {
  if (menuAbierto) {
    switch (e.key) {
      case "ArrowUp":
        opcionSeleccionada--;
        if (opcionSeleccionada < 0) {
          opcionSeleccionada = modos.length - 1;
        }
        renderizarMenu();
        break;
      case "ArrowDown":
        opcionSeleccionada++;
        if (opcionSeleccionada >= modos.length) {
          opcionSeleccionada = 0;
        }
        renderizarMenu();
        break;
      case "Enter":
      case "ArrowRight":
        seleccionarModo();
        break;
      case "Escape":
      case "ArrowLeft":
        cerrarMenu();
        break;
    }
    return;
  }

  switch (e.key) {
    case "Enter":
      abrirMenu();
      break;
    case "ArrowRight":
      siguienteTurno();
      break;
    case "ArrowLeft":
      turnoAnterior();
      break;
  }
});

loadState();
aplicarConfiguracionResponsive();

if (rotado && anguloRotacion) {
  aplicarRotacion();
  document.documentElement.classList.add("rotado");
}

actualizarTurno();
