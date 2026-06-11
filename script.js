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
      modoActual: 3,           // Modo seleccionado por defecto (índice 3 = "3 cifras con letra")
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
    this.bindElements();               // Obtiene referencias a los elementos del DOM
    this.addEventListeners();         // Registra eventos de teclado y ventana
    this.loadState();                 // Restaura estado guardado (número, letra, modo, rotación)
    this.startClock();                // Inicia el reloj que actualiza fecha/hora
    this.applyResponsiveConfig();     // Ajusta estilos según tamaño/orientación

    /* Si el estado guardado indica rotación, se aplica al cargar */
    if (this.state.rotado && this.state.anguloRotacion) {
      this.applyRotation();
      document.documentElement.classList.add("rotado");
    }

    this.updateTurno();               // Muestra el turno actual en pantalla
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
    this.updateDateTime();                     // Actualización inmediata
    setInterval(() => this.updateDateTime(), 1000); // Repite cada segundo
  }

  /* Actualiza los campos de fecha y hora en la interfaz */
  updateDateTime() {
    const ahora = new Date();

    if (this.refs.fecha) {
      this.refs.fecha.textContent = ahora.toLocaleDateString("es-DO", {
        weekday: "long",   // Ej: "lunes"
        day: "numeric",    // Ej: "15"
        month: "long",     // Ej: "enero"
        year: "numeric",   // Ej: "2025"
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
    // Convierte el contador a string rellenando con ceros a la izquierda
    const numero = String(this.state.contador).padStart(this.currentMode.digitos, "0");
    // Si el modo usa letra, la antepone; si no, solo el número
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
    this.animateTurn();    // Cambia el número visualmente con animación
    this.saveState();      // Persiste el estado actual en localStorage
    this.announceTurn();   // Lee el número por voz (3 repeticiones)
  }

  /* Anuncia el número de turno por voz usando SpeechSynthesis */
  announceTurn() {
    // Cancela cualquier temporizador y anuncio previo
    if (this.state.timerAnuncio !== null) {
      clearTimeout(this.state.timerAnuncio);
      this.state.timerAnuncio = null;
    }

    speechSynthesis.cancel();
    const textoTurno = this.turnText;
    let reproduccionesRestantes = 3;

    const reproducirVoz = () => {
      if (reproduccionesRestantes === 0) return;
      this.animateTurn();   // Refuerza la animación en cada repetición
      const utterance = new SpeechSynthesisUtterance(textoTurno);
      utterance.lang = "es-ES";
      utterance.rate = 0.7;   // Velocidad más lenta para mejor entendimiento
      utterance.pitch = 1;    // Tono normal
      utterance.volume = 1;   // Volumen máximo
      speechSynthesis.speak(utterance);
      reproduccionesRestantes -= 1;

      if (reproduccionesRestantes > 0) {
        // Programa la siguiente repetición después de 3 segundos
        this.state.timerAnuncio = setTimeout(reproducirVoz, 3000);
      }
    };

    reproducirVoz();
  }

  /* Avanza al siguiente turno, con control de límite y letras */
  siguienteTurno() {
    this.state.contador += 1;

    // Si supera el máximo del modo actual, reinicia contador a 0 y avanza letra si corresponde
    if (this.state.contador > this.currentMode.maximo) {
      this.state.contador = 0;
      if (this.currentMode.usaLetra) {
        this.state.letraIndex += 1;
        if (this.state.letraIndex >= this.LETRAS.length) {
          this.state.letraIndex = 0;   // Vuelve a la A después de Z
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
          this.state.letraIndex = this.LETRAS.length - 1;   // Última letra
        }
      }
    }

    this.updateTurno();
  }

  /* Abre el menú de configuración */
  openMenu() {
    this.state.menuAbierto = true;
    this.refs.modalConfig?.classList.remove("oculto");  // Muestra el modal
    this.renderMenu();   // Dibuja la lista de opciones
  }

  /* Cierra el menú de configuración */
  closeMenu() {
    this.state.menuAbierto = false;
    this.refs.modalConfig?.classList.add("oculto");    // Oculta el modal
  }

  /* Dibuja las opciones del menú en el modal */
  renderMenu() {
    if (!this.refs.listaModos || !this.refs.modoActual) return;

    this.refs.listaModos.innerHTML = "";
    this.modos.forEach((modo, index) => {
      const li = document.createElement("li");
      li.textContent = modo.nombre;
      // Resalta la opción actualmente seleccionada con una clase CSS
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

    // Si es la opción "Reiniciar contador"
    if (opcion.accion === "reiniciar") {
      this.resetCounter();
      this.closeMenu();
      return;
    }

    // Si es la opción "Girar contenido"
    if (opcion.accion === "rotar") {
      this.rotateContent();
      this.closeMenu();
      return;
    }

    // En caso contrario, es un modo de turno normal: actualiza modo, reinicia contador y letra
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

    this.saveState();   // Guarda la preferencia de rotación
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

    // Calcula las propiedades de transformación según el ángulo
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

    // Aplica estilos al elemento raíz y al body para lograr la rotación
    document.documentElement.style.cssText =
      `transform: rotate(${angle}deg); transform-origin: 0 0; position: absolute; top: ${top}px; left: ${left}px; width: ${width}px; height: ${height}px; overflow: hidden;`;
    document.body.style.cssText =
      `position: absolute; top: 0; left: 0; width: ${width}px; height: ${height}px; overflow: hidden; margin: 0; padding: 0;`;

    this.applyResponsiveConfig();   // Reajusta tamaños después de rotar
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
    this.bindElements();   // Vuelve a obtener referencias por si el DOM cambió

    // Calcula dimensiones teniendo en cuenta si está rotado (intercambia ancho/alto)
    const ancho = this.state.rotado && (this.state.anguloRotacion === 90 || this.state.anguloRotacion === 270)
      ? window.innerHeight
      : window.innerWidth;
    const alto = this.state.rotado && (this.state.anguloRotacion === 90 || this.state.anguloRotacion === 270)
      ? window.innerWidth
      : window.innerHeight;
    const esPortrait = alto > ancho;

    // Verifica que los elementos existan antes de modificarlos
    if (!this.refs.turnero || !this.refs.numeroTurno || !this.refs.fechaHora || !this.refs.identificador || !this.refs.modalContenido) {
      return;
    }

    // Caso: pantalla rotada (90° o 270°)
    if (this.state.rotado && (this.state.anguloRotacion === 90 || this.state.anguloRotacion === 270)) {
      const alturaTurnero = Math.min(Math.max(Math.round(ancho * 0.26), 220), Math.round(alto * 0.1));
      const tamanoTurno = Math.min(Math.max(Math.round(ancho * 0.18), 72), 200);
      this.refs.turnero.style.height = `${alturaTurnero}px`;
      this.refs.numeroTurno.style.fontSize = `${tamanoTurno}px`;
      this.refs.fechaHora.style.padding = "0.35rem 0.75rem";
      this.refs.identificador.style.fontSize = "clamp(0.95rem, 2.8vw, 1.2rem)";
      this.refs.modalContenido.style.maxWidth = "95vw";
      this.refs.numeroTurno.style.marginTop = "1rem";
    } 
    // Caso: orientación vertical (portrait)
    else if (esPortrait) {
      this.refs.turnero.style.height = "28vh";
      this.refs.numeroTurno.style.fontSize = "clamp(4.5rem, 20vw, 10rem)";
      this.refs.fechaHora.style.padding = "0.4rem 0.75rem";
      this.refs.identificador.style.fontSize = "clamp(0.95rem, 2.8vw, 1.2rem)";
      this.refs.modalContenido.style.maxWidth = "95vw";
      this.refs.numeroTurno.style.marginTop = "";
    } 
    // Caso: ancho menor o igual a 720px
    else if (ancho <= 720) {
      this.refs.turnero.style.height = "24vh";
      this.refs.numeroTurno.style.fontSize = "clamp(3.5rem, 18vw, 9.5rem)";
      this.refs.fechaHora.style.padding = "0.35rem 0.7rem";
      this.refs.identificador.style.fontSize = "clamp(0.9rem, 2.2vw, 1.1rem)";
      this.refs.modalContenido.style.maxWidth = "95vw";
      this.refs.numeroTurno.style.marginTop = "";
    } 
    // Caso: ancho menor o igual a 1024px (tablets)
    else if (ancho <= 1024) {
      this.refs.turnero.style.height = "25vh";
      this.refs.numeroTurno.style.fontSize = "clamp(5.5rem, 18vw, 12rem)";
      this.refs.fechaHora.style.padding = "0.4rem 1rem";
      this.refs.identificador.style.fontSize = "clamp(1rem, 2vw, 1.2rem)";
      this.refs.modalContenido.style.maxWidth = "90vw";
      this.refs.numeroTurno.style.marginTop = "1.5rem";
    } 
    // Caso: pantallas grandes (escritorio)
    else {
      this.refs.turnero.style.height = "23vh";
      this.refs.numeroTurno.style.fontSize = "clamp(7.5rem, 28vw, 17rem)";
      this.refs.fechaHora.style.padding = "0.3rem 0.8rem";
      this.refs.identificador.style.fontSize = "clamp(1rem, 2vw, 1.3rem)";
      this.refs.modalContenido.style.maxWidth = "650px";
      this.refs.numeroTurno.style.marginTop = "";
    }

    // Ajuste global del tamaño base de la fuente
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

      // Validación de límites para evitar valores inconsistentes
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
    // Si el menú está abierto, las teclas controlan la selección dentro del menú
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
          this.selectMode();   // Confirma la opción seleccionada
          break;
        case "Escape":
        case "ArrowLeft":
          this.closeMenu();    // Cierra el menú sin cambios
          break;
      }
      return;
    }

    // Si el menú está cerrado, las teclas controlan el turno
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
      this.applyRotation();   // Vuelve a aplicar la rotación con las nuevas dimensiones
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