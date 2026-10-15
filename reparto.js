/* Interfaz de «Sueldo o dividendos»: busca el mejor reparto con calculadora.js y pinta el resultado. */
(function () {
  'use strict';

  const C = window.CalculadoraBizkaia;
  const I = window.InterfazBizkaia;
  const { porcentaje, dinero, euroRedondo, el } = I;
  const $ = (id) => document.getElementById(id);

  const formulario = $('formulario');
  const campoImporte = $('importe');
  const campoTipoIS = $('tipo-is');
  const campoCapital = $('capital');
  const casillaAdministrador = $('administrador');
  const CAPITAL_POR_DEFECTO = '100';
  const selectHijos = $('hijos');
  const selectMenores6 = $('menores6');
  const TIPO_IS_POR_DEFECTO = '20';
  const tipoCorto = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 2 });
  // Ejes del gráfico: "20 mil".
  const compacto = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });
  const AYUDA_TIPO_IS = $('ayuda-tipo-is').textContent;

  function leerEntrada() {
    const texto = campoImporte.value.trim();
    const textoTipo = campoTipoIS.value.trim().replace('%', '');
    const tipo = C.parseImporte(textoTipo);
    const textoCapital = campoCapital.value.trim().replace('%', '');
    const capital = C.parseImporte(textoCapital);
    return {
      textoImporte: texto,
      importe: texto === '' ? 0 : C.parseImporte(texto),
      textoTipoIS: textoTipo,
      tipoIS: Number.isFinite(tipo) && tipo < 100 ? tipo / 100 : NaN,
      textoCapital: textoCapital,
      participacion: Number.isFinite(capital) && capital <= 100 ? capital / 100 : NaN,
      administrador: casillaAdministrador.checked,
      hijos: Number(selectHijos.value),
      menores6: Number(selectMenores6.value),
      deduccionCompartida: $('compartida').checked
    };
  }

  function actualizarOpcionesHijos() {
    const hijos = Number(selectHijos.value);
    const anterior = Number(selectMenores6.value) || 0;
    selectMenores6.textContent = '';
    for (let i = 0; i <= hijos; i++) {
      selectMenores6.appendChild(el('option', { value: String(i), texto: i === 0 ? 'Ninguno' : String(i) }));
    }
    selectMenores6.value = String(Math.min(anterior, hijos));
    $('opciones-hijos').hidden = hijos === 0;
  }

  function resumenOpciones(e, r) {
    const hijos = e.hijos === 0 ? 'sin hijos' : e.hijos === 1 ? '1 hijo' : (e.hijos === 6 ? '6 o más' : e.hijos) + ' hijos';
    const capital = Number.isFinite(e.participacion) ? tipoCorto.format(e.participacion) + ' del capital' + (e.administrador ? ', administrador' : '') : null;
    return [capital, hijos, 'IS al ' + tipoCorto.format(r.tipoIS)].filter(Boolean).join(' · ');
  }

  // === Resumen: nómina + dividendos → lo que le queda ===

  function pintarResumen(r) {
    const m = r.mejor;
    $('cifra-nomina').textContent = euroRedondo(m.nomina);
    $('detalle-nomina').textContent = 'su sueldo bruto, con la cuota de autónomo';
    $('cifra-dividendos').textContent = euroRedondo(m.beneficio);
    let detalleDividendos = 'con dividendos le quedaría menos';
    if (!r.nominaMinima) detalleDividendos = 'no llega ni para la cuota de autónomo';
    else if (m.beneficio > 0) detalleDividendos = 'de beneficio: dividendo de ' + euroRedondo(m.dividendo) + ' tras el IS';
    $('detalle-dividendos').textContent = detalleDividendos;
    $('cifra-neto').textContent = euroRedondo(m.neto);
    $('detalle-neto').textContent = r.presupuesto > 0 && r.nominaMinima
      ? 'al año, el ' + porcentaje.format(m.neto / r.presupuesto) + ' de lo que gasta la sociedad'
      : 'al año';

    const todo = r.todoNomina;
    const minima = r.nominaMinima;
    let texto = '';
    if (r.presupuesto > 0 && minima) {
      texto = m.beneficio > 0
        ? 'Todo en nómina le dejaría ' + euroRedondo(todo.neto) + ': ' + euroRedondo(m.neto - todo.neto) + ' menos al año.'
        : 'Lo mejor es todo en nómina.';
      if (minima.nomina < m.nomina) {
        texto += ' Con la nómina justa para la cuota (' + euroRedondo(minima.nomina) + ') y el resto en dividendos, ' + euroRedondo(minima.neto) + '.';
      }
    }
    $('comparacion').textContent = texto;
  }

  // === Resultado al momento, debajo del importe (en una columna) ===

  function pintarResultadoRapido(r, valido) {
    const boton = $('resultado-rapido');
    boton.hidden = !(valido && r.presupuesto > 0 && r.nominaMinima);
    if (boton.hidden) return;
    const m = r.mejor;
    $('rapido-etiqueta').textContent = 'Le queda';
    $('rapido-valor').textContent = euroRedondo(m.neto);
    $('rapido-detalle').textContent = m.beneficio > 0
      ? euroRedondo(m.nomina) + ' a nómina y ' + euroRedondo(m.beneficio) + ' a dividendos'
      : 'todo en nómina';
  }

  // === Avisos ===

  const ICONO_AVISO = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 15 14H1z" fill="#fab219"/><path d="M8 6v4M8 12v.1" stroke="#0b0b0b" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function aviso(titulo, texto) {
    const nodo = el('div', { clase: 'aviso' });
    nodo.innerHTML = ICONO_AVISO; // icono fijo, sin datos del usuario
    nodo.appendChild(el('p', { style: 'margin:0' }, [el('strong', { texto: titulo }), document.createTextNode(texto)]));
    return nodo;
  }

  function pintarAvisos(r) {
    const caja = $('avisos');
    caja.textContent = '';
    if (!(r.presupuesto > 0)) return;
    if (!r.nominaMinima) {
      caja.appendChild(aviso('Ojo: ', 'no llega ni para la cuota mínima de autónomo de un socio, unos ' + euroRedondo(r.todoNomina.cuotaReta) + ' al año.'));
    } else if (r.mejor.beneficio > r.presupuesto * 0.1) {
      caja.appendChild(aviso('Valor de mercado: ', 'la nómina tiene que corresponder a lo que vale su trabajo. Un sueldo muy bajo con el resto en dividendos lo puede discutir Hacienda.'));
    }
  }

  // === Gráfico: lo que le queda según cuánto vaya a nómina ===

  const NS = 'http://www.w3.org/2000/svg';
  let ultimo = null;

  function svg(nombre, atributos, texto) {
    const nodo = document.createElementNS(NS, nombre);
    Object.keys(atributos || {}).forEach(function (clave) { nodo.setAttribute(clave, atributos[clave]); });
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  }

  // Marcas redondas para un eje: unas `cuantas` entre `min` y `max`.
  function marcas(min, max, cuantas) {
    const paso0 = (max - min || 1) / cuantas;
    const potencia = Math.pow(10, Math.floor(Math.log10(paso0)));
    const paso = [1, 2, 2.5, 5, 10].map(function (m) { return m * potencia; }).find(function (p) { return p >= paso0; });
    const lista = [];
    for (let v = Math.ceil(min / paso) * paso; v <= max + paso * 1e-9; v += paso) lista.push(v);
    return lista;
  }

  function dibujarGrafico(r) {
    ultimo = r;
    const caja = $('grafico');
    caja.textContent = '';
    const puntos = r.curva;
    if (puntos.length < 2) {
      caja.appendChild(el('p', { clase: 'ayuda', texto: r.presupuesto > 0 ? 'Sin repartos posibles: no llega ni para la cuota de autónomo.' : 'Escribe lo que puede gastar la sociedad.' }));
      return;
    }

    const ancho = Math.max(260, caja.clientWidth);
    const alto = ancho < 500 ? 220 : 260;
    // Arriba queda sitio para la ficha, que así no tapa ni la línea ni el título.
    const m = { arriba: 64, derecha: 12, abajo: 26, izquierda: 52 };
    const x0 = puntos[0].nomina;
    const x1 = puntos[puntos.length - 1].nomina;
    let y0 = Math.min.apply(null, puntos.map(function (p) { return p.neto; }));
    let y1 = Math.max.apply(null, puntos.map(function (p) { return p.neto; }));
    const margenY = (y1 - y0) * 0.08 || 100;
    y0 -= margenY;
    y1 += margenY;
    const marcasY = marcas(y0, y1, 4);
    y0 = Math.min(y0, marcasY[0]);
    y1 = Math.max(y1, marcasY[marcasY.length - 1]);
    const X = function (v) { return m.izquierda + (v - x0) / (x1 - x0 || 1) * (ancho - m.izquierda - m.derecha); };
    const Y = function (v) { return alto - m.abajo - (v - y0) / (y1 - y0 || 1) * (alto - m.arriba - m.abajo); };

    const lienzo = svg('svg', {
      viewBox: '0 0 ' + ancho + ' ' + alto, width: ancho, height: alto, tabindex: '0', role: 'img',
      'aria-label': 'Lo que le queda según lo que va a nómina, de ' + euroRedondo(x0) + ' a ' + euroRedondo(x1) +
        '. El máximo, ' + euroRedondo(r.mejor.neto) + ', con ' + euroRedondo(r.mejor.nomina) + ' a nómina. Usa las flechas para recorrerlo.'
    });

    // Cuadrícula y ejes, discretos.
    marcasY.forEach(function (v) {
      lienzo.appendChild(svg('line', { class: 'eje-linea', x1: m.izquierda, x2: ancho - m.derecha, y1: Y(v), y2: Y(v) }));
      lienzo.appendChild(svg('text', { x: m.izquierda - 8, y: Y(v) + 4, 'text-anchor': 'end' }, compacto.format(v)));
    });
    marcas(x0, x1, ancho < 500 ? 3 : 5).forEach(function (v) {
      if (v < x0 || v > x1) return;
      // Las de los extremos, hacia dentro, para que no se corten.
      const px = X(v);
      const ancla = px > ancho - 30 ? 'end' : px < m.izquierda + 20 ? 'start' : 'middle';
      lienzo.appendChild(svg('text', { x: px, y: alto - m.abajo + 18, 'text-anchor': ancla }, compacto.format(v)));
    });
    lienzo.appendChild(svg('text', { x: 0, y: m.arriba - 14, 'text-anchor': 'start' }, 'Le queda'));

    // La serie.
    const d = puntos.map(function (p, i) { return (i ? 'L' : 'M') + X(p.nomina).toFixed(1) + ' ' + Y(p.neto).toFixed(1); }).join(' ');
    lienzo.appendChild(svg('path', { class: 'serie', d: d }));

    // El mejor reparto, marcado y con su cifra.
    const bx = X(r.mejor.nomina);
    const by = Y(r.mejor.neto);
    lienzo.appendChild(svg('circle', { class: 'punto', cx: bx, cy: by, r: 5 }));
    const ancla = bx > ancho - 90 ? 'end' : bx < m.izquierda + 90 ? 'start' : 'middle';
    lienzo.appendChild(svg('text', { class: 'etiqueta', x: bx, y: by - 12, 'text-anchor': ancla }, 'Mejor: ' + euroRedondo(r.mejor.neto)));

    // Cruz y ficha al pasar el dedo, el ratón o las flechas del teclado.
    const cruz = svg('line', { class: 'cruz', y1: m.arriba - 4, y2: alto - m.abajo, visibility: 'hidden' });
    const marca = svg('circle', { class: 'punto', r: 4, visibility: 'hidden' });
    lienzo.appendChild(cruz);
    lienzo.appendChild(marca);
    const ficha = el('div', { clase: 'ficha', hidden: '' });
    const fichaValor = el('strong');
    const fichaTexto = el('span');
    ficha.appendChild(fichaValor);
    ficha.appendChild(fichaTexto);

    let actual = puntos.findIndex(function (p) { return p.nomina === r.mejor.nomina; });
    function mostrar(i) {
      actual = Math.max(0, Math.min(puntos.length - 1, i));
      const p = puntos[actual];
      const px = X(p.nomina);
      cruz.setAttribute('x1', px);
      cruz.setAttribute('x2', px);
      marca.setAttribute('cx', px);
      marca.setAttribute('cy', Y(p.neto));
      cruz.setAttribute('visibility', 'visible');
      marca.setAttribute('visibility', 'visible');
      fichaValor.textContent = euroRedondo(p.neto) + ' le quedan';
      fichaTexto.textContent = euroRedondo(p.nomina) + ' a nómina · dividendo de ' + euroRedondo(p.dividendo);
      ficha.hidden = false;
      // La ficha encima del gráfico, centrada en la cruz sin salirse por los lados.
      const escala = caja.clientWidth / ancho;
      const mitad = ficha.offsetWidth / 2;
      ficha.style.left = Math.max(0, Math.min(caja.clientWidth - ficha.offsetWidth, px * escala - mitad)) + 'px';
    }
    function ocultar() {
      cruz.setAttribute('visibility', 'hidden');
      marca.setAttribute('visibility', 'hidden');
      ficha.hidden = true;
    }
    function masCercano(evento) {
      const caja2 = lienzo.getBoundingClientRect();
      const v = x0 + ((evento.clientX - caja2.left) / caja2.width * ancho - m.izquierda) / (ancho - m.izquierda - m.derecha) * (x1 - x0);
      let mejorI = 0;
      puntos.forEach(function (p, i) { if (Math.abs(p.nomina - v) < Math.abs(puntos[mejorI].nomina - v)) mejorI = i; });
      return mejorI;
    }
    lienzo.addEventListener('pointermove', function (evento) { mostrar(masCercano(evento)); });
    lienzo.addEventListener('pointerdown', function (evento) { mostrar(masCercano(evento)); });
    lienzo.addEventListener('pointerleave', ocultar);
    lienzo.addEventListener('focus', function () { mostrar(actual); });
    lienzo.addEventListener('blur', ocultar);
    lienzo.addEventListener('keydown', function (evento) {
      const saltos = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -10, ArrowUp: 10 };
      if (evento.key in saltos) mostrar(actual + saltos[evento.key]);
      else if (evento.key === 'Home') mostrar(0);
      else if (evento.key === 'End') mostrar(puntos.length - 1);
      else return;
      evento.preventDefault();
    });

    caja.appendChild(lienzo);
    caja.appendChild(ficha);
  }

  // === El reparto, frente a todo en nómina ===

  function pintarTabla(r) {
    const a = r.mejor;
    const b = r.todoNomina;
    const filas = [
      ['A nómina', a.nomina, b.nomina, ''],
      ['Cuota de autónomo', -a.cuotaReta, -b.cuotaReta, 'detalle'],
      ['IRPF de la nómina', -a.irpfNomina, -b.irpfNomina, 'detalle'],
      ['A dividendos (beneficio)', a.beneficio, b.beneficio, ''],
      ['Impuesto sobre Sociedades', -a.impuestoSociedades, -b.impuestoSociedades, 'detalle'],
      ['IRPF del dividendo', -a.irpfDividendo, -b.irpfDividendo, 'detalle'],
      ['Impuestos y cuota', -(a.cuotaReta + a.irpfNomina + a.impuestoSociedades + a.irpfDividendo),
        -(b.cuotaReta + b.irpfNomina + b.impuestoSociedades + b.irpfDividendo), ''],
      ['Le queda', a.neto, b.neto, 'total']
    ];
    const cuerpo = $('tabla-reparto').tBodies[0];
    cuerpo.textContent = '';
    filas.forEach(function (f) {
      cuerpo.appendChild(el('tr', { clase: f[3] }, [
        el('th', { scope: 'row', texto: f[0] }),
        el('td', { clase: 'num', texto: euroRedondo(f[1]) }),
        el('td', { clase: 'num', texto: euroRedondo(f[2]) })
      ]));
    });
  }

  // Por qué se para ahí: lo que dejarían 100 € más por cada lado.
  function pintarMarginal(r) {
    let texto = '';
    if (r.presupuesto > 0 && r.nominaMinima) {
      const efecto = function (x) { return x >= 0 ? 'le dejarían ' + dinero(x) : 'le costarían ' + dinero(-x); };
      texto = 'Con este reparto, 100 € más de nómina ' + efecto(r.margenNomina) + ' y 100 € más para dividendos, ' +
        efecto(r.margenDividendo).replace('le dejarían ', '') + '.';
    }
    $('dato-marginal').textContent = texto;
  }

  // === Enlace compartible ===

  function escribirUrl(e) {
    const q = new URLSearchParams();
    q.set('importe', e.textoImporte);
    if (e.textoCapital !== CAPITAL_POR_DEFECTO) q.set('capital', e.textoCapital);
    if (!e.administrador) q.set('admin', 'no');
    if (e.hijos > 0) {
      q.set('hijos', String(e.hijos));
      if (e.menores6 > 0) q.set('menores6', String(e.menores6));
      if (!e.deduccionCompartida) q.set('compartida', 'no');
    }
    if (e.textoTipoIS !== TIPO_IS_POR_DEFECTO) q.set('is', e.textoTipoIS);
    I.escribirUrl(q);
  }

  function leerUrl() {
    const q = new URLSearchParams(location.search);
    if (q.has('importe')) campoImporte.value = I.cifraDeUrl(q.get('importe'));
    if (q.has('capital')) campoCapital.value = q.get('capital');
    if (q.get('admin') === 'no') casillaAdministrador.checked = false;
    if (/^[0-6]$/.test(q.get('hijos') || '')) selectHijos.value = q.get('hijos');
    actualizarOpcionesHijos();
    if (/^[0-6]$/.test(q.get('menores6') || '')) selectMenores6.value = String(Math.min(Number(q.get('menores6')), Number(selectHijos.value)));
    if (q.get('compartida') === 'no') $('compartida').checked = false;
    if (q.has('is')) campoTipoIS.value = q.get('is');
  }

  // === Bucle principal ===

  let temporizadorCalculo = null;
  let temporizadorUrl = null;
  let temporizadorResumen = null;

  function calcular() {
    const e = leerEntrada();
    const valido = Number.isFinite(e.importe) && e.importe >= 0;
    const ayuda = $('ayuda-importe');
    ayuda.className = valido ? 'ayuda' : 'error';
    ayuda.textContent = valido ? 'Nómina y dividendos juntos, antes del Impuesto sobre Sociedades.' : 'Escribe un importe válido, por ejemplo 30.000 o 45.500,50.';
    campoImporte.setAttribute('aria-invalid', String(!valido));

    const tipoValido = Number.isFinite(e.tipoIS);
    const ayudaTipo = $('ayuda-tipo-is');
    ayudaTipo.className = tipoValido ? 'ayuda' : 'error';
    ayudaTipo.textContent = tipoValido ? AYUDA_TIPO_IS : 'Escribe un porcentaje entre 0 y 99, por ejemplo 20 o 17,5.';
    campoTipoIS.setAttribute('aria-invalid', String(!tipoValido));

    const capitalValido = Number.isFinite(e.participacion);
    campoCapital.setAttribute('aria-invalid', String(!capitalValido));

    const r = C.calcularReparto(Object.assign({}, e, {
      importe: valido ? e.importe : 0,
      tipoIS: tipoValido ? e.tipoIS : undefined,
      participacion: capitalValido ? e.participacion : undefined
    }));
    const ayudaCapital = $('ayuda-capital');
    ayudaCapital.className = capitalValido ? 'ayuda' : 'error';
    ayudaCapital.textContent = !capitalValido
      ? 'Escribe un porcentaje entre 0 y 100. Mientras, sus dividendos cuentan para la cuota.'
      : r.dividendosEnReta
        ? 'Sus dividendos cuentan para su cuota de autónomo: tiene ' +
          (e.participacion >= C.PARAMETROS.reta.participacionDividendos - 1e-9 ? 'un 33 % o más del capital.' : 'un 25 % o más y es administrador.')
        : 'Sus dividendos no cuentan para su cuota de autónomo: haría falta el 33 % del capital, o el 25 % siendo administrador.';
    $('resumen-opciones').textContent = resumenOpciones(e, r);
    pintarResultadoRapido(r, valido);
    pintarResumen(r);
    pintarAvisos(r);
    dibujarGrafico(r);
    pintarTabla(r);
    pintarMarginal(r);

    clearTimeout(temporizadorUrl);
    temporizadorUrl = setTimeout(function () { escribirUrl(e); }, 300);

    clearTimeout(temporizadorResumen);
    temporizadorResumen = setTimeout(function () {
      $('resumen').textContent = r.presupuesto > 0
        ? 'Mejor reparto: ' + euroRedondo(r.mejor.nomina) + ' a nómina y ' + euroRedondo(r.mejor.beneficio) + ' a dividendos. Le quedan ' +
          euroRedondo(r.mejor.neto) + ' al año; todo en nómina, ' + euroRedondo(r.todoNomina.neto) + '.'
        : '';
    }, 700);
  }

  // Probar todos los repartos lleva unos milisegundos: mientras se escribe, se espera a una pausa corta.
  function calcularEnUnMomento() {
    clearTimeout(temporizadorCalculo);
    temporizadorCalculo = setTimeout(calcular, 120);
  }

  I.prepararCampoImporte(campoImporte, { seleccionarAlTocar: true });
  I.prepararFormulario(formulario);
  formulario.addEventListener('input', calcularEnUnMomento);
  formulario.addEventListener('change', function (evento) {
    if (evento.target === selectHijos) actualizarOpcionesHijos();
    calcularEnUnMomento();
  });
  $('resultado-rapido').addEventListener('click', function () { I.irA(document.querySelector('.resultados')); });
  I.prepararPlegables();
  I.prepararCompartir($('compartir'));
  let temporizadorAncho = null;
  window.addEventListener('resize', function () {
    clearTimeout(temporizadorAncho);
    temporizadorAncho = setTimeout(function () { if (ultimo) dibujarGrafico(ultimo); }, 150);
  });

  leerUrl();
  calcular();
})();
