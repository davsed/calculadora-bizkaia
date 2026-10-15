/* Lo que comparten las páginas de la calculadora: formato de importes, casillas y bloques plegables. */
(function () {
  'use strict';

  const C = window.CalculadoraBizkaia;

  const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  const eurosSinCentimos = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  // Con el signo menos tipográfico, como en los importes.
  const formatoPorcentaje = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const porcentaje = { format: function (x) { return formatoPorcentaje.format(x || 0).replace('-', '−'); } };
  // Para escribir dentro de las casillas: "2.150,5".
  const cifraHastaCentimos = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, useGrouping: 'always' });

  // Evita "-0,00 €" y permite forzar el signo en los desgloses.
  function dinero(x, conSigno) {
    const redondeado = Math.round(x * 100) / 100 || 0;
    const texto = euros.format(Math.abs(redondeado));
    if (redondeado < 0) return '−' + texto;
    return conSigno && redondeado > 0 ? '+' + texto : texto;
  }

  // Sin céntimos: para las cifras grandes y los importes aproximados ("unos 59 €").
  function euroRedondo(x) {
    const redondeado = Math.round(x) || 0;
    return (redondeado < 0 ? '−' : '') + eurosSinCentimos.format(Math.abs(redondeado));
  }

  // Para cifras fijas dentro de un texto: "20.000 €" en vez de "20.000,00 €".
  function importeRedondo(x) {
    return Number.isInteger(x) ? eurosSinCentimos.format(x) : euros.format(x);
  }

  function el(etiqueta, atributos, hijos) {
    const nodo = document.createElement(etiqueta);
    Object.keys(atributos || {}).forEach(function (clave) {
      if (clave === 'texto') nodo.textContent = atributos[clave];
      else if (clave === 'clase') nodo.className = atributos[clave];
      else nodo.setAttribute(clave, atributos[clave]);
    });
    (hijos || []).forEach(function (hijo) { if (hijo) nodo.appendChild(hijo); });
    return nodo;
  }

  // Los enlaces antiguos pueden traer "30000" o "2150.5": se muestran como "30.000" y "2.150,5".
  function cifraDeUrl(texto) {
    const valor = C.parseImporte(texto);
    return Number.isFinite(valor) ? cifraHastaCentimos.format(valor) : texto;
  }

  function escribirUrl(q) {
    try { history.replaceState(null, '', location.pathname + '?' + q.toString()); } catch { /* file:// */ }
  }

  // === Casillas de importe ===

  // Pone el punto de los miles mientras se escribe, sin mover el cursor de su sitio.
  function agruparCampo(campo, evento) {
    if (evento.inputType === 'insertFromPaste' || evento.inputType === 'insertFromDrop') {
      const pegado = C.parseImporte(campo.value);
      if (Number.isFinite(pegado)) {
        campo.value = cifraHastaCentimos.format(pegado);
        return;
      }
    }
    const resultado = C.agruparMiles(campo.value, campo.selectionStart);
    if (resultado.texto === campo.value) return;
    campo.value = resultado.texto;
    campo.setSelectionRange(resultado.cursor, resultado.cursor);
  }

  // Al borrar un punto de los miles se borra la cifra de al lado; si no, el punto volvería a salir.
  function saltarPuntoAlBorrar(evento) {
    const campo = evento.target;
    if (campo.selectionStart !== campo.selectionEnd) return;
    const posicion = campo.selectionStart;
    if (evento.inputType === 'deleteContentBackward' && campo.value[posicion - 1] === '.') {
      campo.setSelectionRange(posicion - 1, posicion - 1);
    } else if (evento.inputType === 'deleteContentForward' && campo.value[posicion] === '.') {
      campo.setSelectionRange(posicion + 1, posicion + 1);
    }
  }

  // Punto de los miles al escribir. Va en la propia casilla, así que corre antes que los
  // avisos del formulario y el cálculo ya lee el importe agrupado. Con `seleccionarAlTocar`,
  // en pantallas táctiles el importe se selecciona entero para escribir encima.
  function prepararCampoImporte(campo, opciones) {
    campo.addEventListener('beforeinput', saltarPuntoAlBorrar);
    campo.addEventListener('input', function (evento) { agruparCampo(campo, evento); });
    if (opciones && opciones.seleccionarAlTocar && window.matchMedia('(pointer: coarse)').matches) {
      campo.addEventListener('focus', function () {
        setTimeout(function () { campo.select(); }, 0);
      });
    }
  }

  // Sin envío, y la tecla Intro (u «OK» en el teclado del móvil) cierra el teclado para ver el resultado.
  function prepararFormulario(formulario) {
    formulario.addEventListener('submit', function (evento) { evento.preventDefault(); });
    formulario.addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter' && evento.target.type === 'text') evento.target.blur();
    });
  }

  // === Botones y bloques ===

  // Un botón que pone o quita una clase y cambia su texto: textos = [cerrado, abierto].
  function alternar(boton, nodo, clase, textos) {
    boton.addEventListener('click', function () {
      const abierto = nodo.classList.toggle(clase);
      boton.setAttribute('aria-expanded', String(abierto));
      boton.textContent = textos[abierto ? 1 : 0];
    });
  }

  // Baja hasta los resultados (desde el resultado rápido del móvil).
  function irA(nodo) {
    if (document.activeElement) document.activeElement.blur();
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nodo.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
  }

  // Lo que en el móvil va plegado se queda abierto en pantalla ancha, también al ensanchar la
  // ventana. Al cargar lo abre un script en la propia página, para que no se vea cerrado un momento.
  function prepararPlegables() {
    const escritorio = window.matchMedia('(min-width: 860px)');
    const plegables = document.querySelectorAll('.plegable-movil');
    function abrirEnEscritorio() {
      if (escritorio.matches) plegables.forEach(function (d) { d.open = true; });
    }
    plegables.forEach(function (d) { d.addEventListener('toggle', abrirEnEscritorio); });
    escritorio.addEventListener('change', abrirEnEscritorio);
  }

  function prepararCompartir(boton) {
    const texto = boton.textContent;
    if (!(navigator.clipboard && window.isSecureContext)) return;
    boton.hidden = false;
    boton.addEventListener('click', function () {
      navigator.clipboard.writeText(location.href).then(function () {
        boton.textContent = 'Enlace copiado';
      }, function () {
        boton.textContent = 'No se ha podido copiar: copia la dirección del navegador';
      }).then(function () {
        setTimeout(function () { boton.textContent = texto; }, 2500);
      });
    });
  }

  window.InterfazBizkaia = {
    porcentaje: porcentaje,
    cifraHastaCentimos: cifraHastaCentimos,
    dinero: dinero,
    euroRedondo: euroRedondo,
    importeRedondo: importeRedondo,
    el: el,
    cifraDeUrl: cifraDeUrl,
    escribirUrl: escribirUrl,
    prepararCampoImporte: prepararCampoImporte,
    prepararFormulario: prepararFormulario,
    alternar: alternar,
    irA: irA,
    prepararPlegables: prepararPlegables,
    prepararCompartir: prepararCompartir
  };
})();
