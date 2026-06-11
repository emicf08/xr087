/* Clase principal que controla toda la aplicación del turnero */
class TurneroApp {
  constructor() {
    /* Letras usadas para el modo con letra (A00, B01, etc.) */
    this.LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    /* Clave para guardar el estado en localStorage */
    this.STATE_KEY = "turnero_state";

    /* Definición de los modos disponibles y acciones especiales */
    this.modos = [
      { nombre: "2 cifras (00-99)", digitos: 2, usaLetra: false, maximo: 99 },
      { nombre: "2 cifras con letra (A00-Z99)", digitos: 2, usaLetra: true, maximo: 99 },
      { nombre: "3 cifras (000-999)", digitos: 3, usaLetra: false, maximo: 999 },
      { nombre: "3 cifras con letra (A000-Z999)", digitos: 3, usaLetra: true, maximo: 999 },
      { nombre: "🔄 Reiniciar contador", accion: "reiniciar" },
      { nombre: "↻ Girar contenido", accion: "rotar" },
    ];

    /* Estado interno de la aplicación */
    this.state = {
      contador: 1,             // Número actual del turno
      letraIndex: 0,           // Índice de letra actual cuando se usa letra
      modoActual: 3,           // Modo seleccionado por defecto
      menuAbierto: false,      // Si el modal de configuración está abierto
      opcionSeleccionada: 0,   // Opción seleccionada en el menú
      rotado: false,           // Si el contenido está rotado
      anguloRotacion: 0,       // Ángulo de rotación actual (0, 90, 180, 270)
      timerAnuncio: null,      // Temporizador para repetir anuncio de voz
    };

    /* Referencias a elementos DOM que se usarán en varios métodos */
    this.refs = {
      fecha: null,
      hora: null,
      turno: null,
      modalConfig: null,
      listaModos: null,
      modoActual: null,
      turnero: null,
      numeroTurno: null,
      fechaHora: null,
      identificador: null,
      modalContenido: null,
    };

    /* Bind para mantener el contexto correcto en los manejadores de eventos */
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleOrientationChange = this.handleOrientationChange.bind(this);
  }

  /* Inicializa la aplicación cuando la página está lista */
  init() {
    this.bindElements();
    this.addEventListeners();
    this.loadState();
    this.startClock();
    this.applyResponsiveConfig();

    /* Si el estado guardado indica rotación, se aplica al cargar */
    if (this.state.rotado && this.state.anguloRotacion) {
      this.applyRotation();
      document.documentElement.classList.add("rotado");
    }

    this.updateTurno();
  }

  /* Guarda las referencias a los elementos HTML usados en la aplicación */
  bindElements() {
    this.refs.fecha = document.getElementById("fecha");
    this.refs.hora = document.getElementById("hora");
    this.refs.turno = document.getElementById("turno");
    this.refs.modalConfig = document.getElementById("modalConfig");
    this.refs.listaModos = document.getElementById("listaModos");
    this.refs.modoActual = document.getElementById("modoActual");
    this.refs.turnero = document.querySelector(".turnero");
    this.refs.numeroTurno = document.querySelector(".numero-turno");
    this.refs.fechaHora = document.querySelector(".fecha-hora");
    this.refs.identificador = document.querySelector(".identificador");
    this.refs.modalContenido = document.querySelector(".modal-contenido");
  }

  /* Inicia el reloj y actualiza la hora cada segundo */
  startClock() {
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);
  }

  /* Actualiza los campos de fecha y hora en la interfaz */
  updateDateTime() {
    const ahora = new Date();

    if (this.refs.fecha) {
      this.refs.fecha.textContent = ahora.toLocaleDateString("es-DO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    if (this.refs.hora) {
      this.refs.hora.textContent = ahora.toLocaleTimeString("es-DO");
    }
  }

  /* Devuelve el modo de turno actual según la selección */
  get currentMode() {
    return this.modos[this.state.modoActual];
  }

  /* Calcula el texto completo del turno según el modo */
  get turnText() {
    const numero = String(this.state.contador).padStart(this.currentMode.digitos, "0");
    return this.currentMode.usaLetra
      ? this.LETRAS[this.state.letraIndex] + numero
      : numero;
  }

  /* Actualiza visualmente el número de turno y aplica la animación */
  animateTurn() {
    if (!this.refs.turno) return;

    this.refs.turno.textContent = this.turnText;
    this.refs.turno.classList.remove("animar-turno");
    void this.refs.turno.offsetWidth; // Fuerza reflow para reiniciar animación
    this.refs.turno.classList.add("animar-turno");
  }

  /* Actualiza el turno en pantalla, guarda estado y anuncia el cambio */
  updateTurno() {
    this.animateTurn();
    this.saveState();
    this.announceTurn();
  }

  /* Anuncia el número de turno por voz usando SpeechSynthesis */
  announceTurn() {
    if (this.state.timerAnuncio !== null) {
      clearTimeout(this.state.timerAnuncio);
      this.state.timerAnuncio = null;
    }

    speechSynthesis.cancel();
    const textoTurno = this.turnText;
    let reproduccionesRestantes = 3;

    const reproducirVoz = () => {
      if (reproduccionesRestantes === 0) return;
      this.animateTurn();
      const utterance = new SpeechSynthesisUtterance(textoTurno);
      utterance.lang = "es-ES";
      utterance.rate = 0.7;
      utterance.pitch = 1;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
      reproduccionesRestantes -= 1;

      if (reproduccionesRestantes > 0) {
        this.state.timerAnuncio = setTimeout(reproducirVoz, 3000);
      }
    };

    reproducirVoz();
  }

  /* Avanza al siguiente turno, con control de límite y letras */
  siguienteTurno() {
    this.state.contador += 1;

    if (this.state.contador > this.currentMode.maximo) {
      this.state.contador = 0;
      if (this.currentMode.usaLetra) {
        this.state.letraIndex += 1;
        if (this.state.letraIndex >= this.LETRAS.length) {
          this.state.letraIndex = 0;
        }
      }
    }

    this.updateTurno();
  }

  /* Retrocede un turno, manteniendo la secuencia correcta */
  turnoAnterior() {
    this.state.contador -= 1;

    if (this.state.contador < 0) {
      this.state.contador = this.currentMode.maximo;
      if (this.currentMode.usaLetra) {
        this.state.letraIndex -= 1;
        if (this.state.letraIndex < 0) {
          this.state.letraIndex = this.LETRAS.length - 1;
        }
      }
    }

    this.updateTurno();
  }

  /* Abre el menú de configuración */
  openMenu() {
    this.state.menuAbierto = true;
    this.refs.modalConfig?.classList.remove("oculto");
    this.renderMenu();
  }

  /* Cierra el menú de configuración */
  closeMenu() {
    this.state.menuAbierto = false;
    this.refs.modalConfig?.classList.add("oculto");
  }

  /* Dibuja las opciones del menú en el modal */
  renderMenu() {
    if (!this.refs.listaModos || !this.refs.modoActual) return;

    this.refs.listaModos.innerHTML = "";
    this.modos.forEach((modo, index) => {
      const li = document.createElement("li");
      li.textContent = modo.nombre;
      if (index === this.state.opcionSeleccionada) {
        li.classList.add("seleccionado");
      }
      this.refs.listaModos.appendChild(li);
    });

    this.refs.modoActual.textContent = "Modo actual: " + this.currentMode.nombre;
  }

  /* Selecciona una opción del menú y ejecuta la acción correspondiente */
  selectMode() {
    const opcion = this.modos[this.state.opcionSeleccionada];

    if (opcion.accion === "reiniciar") {
      this.resetCounter();
      this.closeMenu();
      return;
    }

    if (opcion.accion === "rotar") {
      this.rotateContent();
      this.closeMenu();
      return;
    }

    this.state.modoActual = this.state.opcionSeleccionada;
    this.state.contador = 0;
    this.state.letraIndex = 0;
    this.updateTurno();
    this.closeMenu();
  }

  /* Rota el contenido de la pantalla 90 grados y guarda el estado */
  rotateContent() {
    this.state.anguloRotacion = (this.state.anguloRotacion + 90) % 360;
    this.state.rotado = this.state.anguloRotacion !== 0;

    if (this.state.rotado) {
      this.applyRotation();
      document.documentElement.classList.add("rotado");
    } else {
      this.clearRotation();
      document.documentElement.classList.remove("rotado");
    }

    this.saveState();
  }

  /* Aplica el CSS necesario para rotar la pantalla completa */
  applyRotation() {
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    const angle = this.state.anguloRotacion;
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

    this.applyResponsiveConfig();
  }

  /* Limpia la rotación y restablece los estilos normales */
  clearRotation() {
    document.documentElement.style.cssText = "";
    document.body.style.cssText = "";
    this.applyResponsiveConfig();
  }

  /* Reinicia el contador de turno a 0 y borra la letra */
  resetCounter() {
    this.state.contador = 0;
    this.state.letraIndex = 0;
    this.updateTurno();
  }

  /* Ajusta tamaños y estilos según el ancho/alto de pantalla y la rotación */
  applyResponsiveConfig() {
    this.bindElements();

    const ancho = this.state.rotado && (this.state.anguloRotacion === 90 || this.state.anguloRotacion === 270)
      ? window.innerHeight
      : window.innerWidth;
    const alto = this.state.rotado && (this.state.anguloRotacion === 90 || this.state.anguloRotacion === 270)
      ? window.innerWidth
      : window.innerHeight;
    const esPortrait = alto > ancho;

    if (!this.refs.turnero || !this.refs.numeroTurno || !this.refs.fechaHora || !this.refs.identificador || !this.refs.modalContenido) {
      return;
    }

    if (this.state.rotado && (this.state.anguloRotacion === 90 || this.state.anguloRotacion === 270)) {
      /* Cuando la pantalla está rotada, ajustamos el turno según el ancho disponible */
      const alturaTurnero = Math.min(Math.max(Math.round(ancho * 0.26), 220), Math.round(alto * 0.5));
      const tamanoTurno = Math.min(Math.max(Math.round(ancho * 0.18), 72), 200);

      this.refs.turnero.style.height = `${alturaTurnero}px`;
      this.refs.numeroTurno.style.fontSize = `${tamanoTurno}px`;
      this.refs.fechaHora.style.padding = "0.35rem 0.75rem";
      this.refs.identificador.style.fontSize = "clamp(0.95rem, 2.8vw, 1.2rem)";
      this.refs.modalContenido.style.maxWidth = "95vw";
      this.refs.numeroTurno.style.marginTop = "1rem";
    } else if (esPortrait) {
      this.refs.turnero.style.height = "28vh";
      this.refs.numeroTurno.style.fontSize = "clamp(4.5rem, 20vw, 10rem)";
      this.refs.fechaHora.style.padding = "0.4rem 0.75rem";
      this.refs.identificador.style.fontSize = "clamp(0.95rem, 2.8vw, 1.2rem)";
      this.refs.modalContenido.style.maxWidth = "95vw";
      this.refs.numeroTurno.style.marginTop = "";
    } else if (ancho <= 720) {
      this.refs.turnero.style.height = "24vh";
      this.refs.numeroTurno.style.fontSize = "clamp(3.5rem, 18vw, 9.5rem)";
      this.refs.fechaHora.style.padding = "0.35rem 0.7rem";
      this.refs.identificador.style.fontSize = "clamp(0.9rem, 2.2vw, 1.1rem)";
      this.refs.modalContenido.style.maxWidth = "95vw";
      this.refs.numeroTurno.style.marginTop = "";
    } else if (ancho <= 1024) {
      this.refs.turnero.style.height = "25vh";
      this.refs.numeroTurno.style.fontSize = "clamp(5.5rem, 18vw, 12rem)";
      this.refs.fechaHora.style.padding = "0.4rem 1rem";
      this.refs.identificador.style.fontSize = "clamp(1rem, 2vw, 1.2rem)";
      this.refs.modalContenido.style.maxWidth = "90vw";
      this.refs.numeroTurno.style.marginTop = "1.5rem";
    } else {
      this.refs.turnero.style.height = "23vh";
      this.refs.numeroTurno.style.fontSize = "clamp(7.5rem, 28vw, 17rem)";
      this.refs.fechaHora.style.padding = "0.3rem 0.8rem";
      this.refs.identificador.style.fontSize = "clamp(1rem, 2vw, 1.3rem)";
      this.refs.modalContenido.style.maxWidth = "650px";
      this.refs.numeroTurno.style.marginTop = "";
    }

    document.body.style.fontSize = ancho <= 540 || esPortrait ? "0.95rem" : "1rem";
  }

  /* Guarda el estado actual en el navegador para restaurarlo después */
  saveState() {
    try {
      const data = {
        contador: this.state.contador,
        letraIndex: this.state.letraIndex,
        modoActual: this.state.modoActual,
        anguloRotacion: this.state.anguloRotacion,
        rotado: this.state.rotado,
      };
      localStorage.setItem(this.STATE_KEY, JSON.stringify(data));
    } catch (error) {
      // Si localStorage no está disponible, no hacemos nada.
    }
  }

  /* Carga el estado guardado si existe y corrige valores inválidos */
  loadState() {
    try {
      const raw = localStorage.getItem(this.STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);

      if (typeof saved.contador === "number") this.state.contador = saved.contador;
      if (typeof saved.letraIndex === "number") this.state.letraIndex = saved.letraIndex;
      if (typeof saved.modoActual === "number") this.state.modoActual = saved.modoActual;
      if (typeof saved.anguloRotacion === "number") this.state.anguloRotacion = saved.anguloRotacion;
      if (typeof saved.rotado === "boolean") this.state.rotado = saved.rotado;

      const modo = this.modos[this.state.modoActual] || this.modos[0];
      if (this.state.contador < 0) this.state.contador = 0;
      if (this.state.contador > modo.maximo) this.state.contador = modo.maximo;
      if (this.state.letraIndex < 0) this.state.letraIndex = 0;
      if (this.state.letraIndex >= this.LETRAS.length) this.state.letraIndex = 0;
    } catch (error) {
      // Si hay error leyendo el estado, lo ignoramos y usamos los valores por defecto.
    }
  }

  /* Manejador de teclas para navegación y control del menú */
  handleKeydown(event) {
    if (this.state.menuAbierto) {
      switch (event.key) {
        case "ArrowUp":
          this.state.opcionSeleccionada -= 1;
          if (this.state.opcionSeleccionada < 0) {
            this.state.opcionSeleccionada = this.modos.length - 1;
          }
          this.renderMenu();
          break;
        case "ArrowDown":
          this.state.opcionSeleccionada += 1;
          if (this.state.opcionSeleccionada >= this.modos.length) {
            this.state.opcionSeleccionada = 0;
          }
          this.renderMenu();
          break;
        case "Enter":
        case "ArrowRight":
          this.selectMode();
          break;
        case "Escape":
        case "ArrowLeft":
          this.closeMenu();
          break;
      }
      return;
    }

    switch (event.key) {
      case "Enter":
        this.openMenu();
        break;
      case "ArrowRight":
        this.siguienteTurno();
        break;
      case "ArrowLeft":
        this.turnoAnterior();
        break;
    }
  }

  /* Ajusta la UI cuando la ventana cambia de tamaño */
  handleResize() {
    this.applyResponsiveConfig();
    if (this.state.rotado) {
      this.applyRotation();
    }
  }

  /* Ajustes extra cuando cambia la orientación del dispositivo */
  handleOrientationChange() {
    this.applyResponsiveConfig();
  }

  /* Registra los eventos del teclado y de la ventana */
  addEventListeners() {
    document.addEventListener("keydown", this.handleKeydown);
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("orientationchange", this.handleOrientationChange);
  }
}

/* Crea la aplicación cuando el DOM está listo */
window.addEventListener("DOMContentLoaded", () => {
  const app = new TurneroApp();
  app.init();
});
