/* Interfaz de la calculadora: lee el formulario, llama a calculadora.js y pinta el resultado. */
(function () {
  'use strict';

  const C = window.CalculadoraBizkaia;
  const P = C.PARAMETROS;
  const $ = (id) => document.getElementById(id);

  const formulario = $('formulario');
  const campoImporte = $('importe');
  const campoAtEp = $('atep');
  const selectHijos = $('hijos');
  const selectMenores6 = $('menores6');
  const tooltip = $('tooltip');

  const ATEP_POR_DEFECTO = '1,00';

  const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  const eurosSinCentimos = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  const porcentaje = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const porcentajeEntero = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 0 });
  const tipo = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Evita "-0,00 €" y permite forzar el signo en los desgloses.
  function dinero(x, conSigno) {
    const redondeado = Math.round(x * 100) / 100 || 0;
    const texto = euros.format(Math.abs(redondeado));
    if (redondeado < 0) return '−' + texto;
    return conSigno && redondeado > 0 ? '+' + texto : texto;
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

  // === Lectura del formulario ===

  function valorRadio(nombre) {
    const marcado = formulario.querySelector('input[name="' + nombre + '"]:checked');
    return marcado ? marcado.value : null;
  }

  function leerEntrada() {
    const texto = campoImporte.value.trim();
    return {
      modo: valorRadio('modo'),
      periodo: valorRadio('periodo'),
      pagas: Number(valorRadio('pagas')),
      textoImporte: texto,
      importe: texto === '' ? 0 : C.parseImporte(texto),
      hijos: Number(selectHijos.value),
      menores6: Number(selectMenores6.value),
      deduccionCompartida: $('compartida').checked,
      contrato: $('contrato').value,
      atEp: C.parseImporte(campoAtEp.value) / 100
    };
  }

  const ETIQUETAS_IMPORTE = {
    bruto: { anual: 'Sueldo bruto anual', mensual: 'Sueldo bruto mensual' },
    neto: { anual: 'Sueldo neto anual', mensual: 'Sueldo neto mensual' },
    coste: { anual: 'Coste anual para la empresa', mensual: 'Coste mensual para la empresa' }
  };

  function ayudaImporte(e) {
    if (e.periodo === 'mensual') {
      if (e.modo === 'bruto' && e.pagas === 14) return 'Lo que cobras en bruto en cada una de las 14 pagas.';
      if (e.modo === 'neto' && e.pagas === 14) return 'Lo que cobras en un mes normal, sin contar las pagas extra.';
      if (e.modo === 'coste') return 'La media al mes: el coste anual entre 12.';
    }
    return 'Puedes escribir 30000, 30.000 o 30.000,50.';
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

  // === Pintado del resultado ===

  function pintarTarjetas(r, e) {
    const pagas = r.opciones.pagas;
    const bruto = {
      etiqueta: 'Bruto anual',
      valor: dinero(r.brutoAnual),
      detalle: dinero(r.brutoAnual / pagas) + ' en cada una de las ' + pagas + ' pagas'
    };
    const neto = {
      etiqueta: 'Neto al mes',
      valor: dinero(r.nomina.neto),
      detalle: r.pagaExtra
        ? 'Más 2 pagas extra de ' + dinero(r.pagaExtra.neto) + '. ' + dinero(r.netoAnual) + ' al año.'
        : dinero(r.netoAnual) + ' al año'
    };
    const coste = {
      etiqueta: 'Coste anual para la empresa',
      valor: dinero(r.costeAnual),
      detalle: dinero(r.costeAnual / 12) + ' al mes de media'
    };
    const orden = e.modo === 'bruto' ? [neto, bruto, coste] : [bruto, neto, coste];
    const tarjetas = $('kpis').children;
    orden.forEach(function (datos, i) {
      tarjetas[i].querySelector('.kpi-etiqueta').textContent = datos.etiqueta;
      tarjetas[i].querySelector('.kpi-valor').textContent = datos.valor;
      tarjetas[i].querySelector('.kpi-detalle').textContent = datos.detalle;
    });
  }

  function pintarNomina(r) {
    const n = r.nomina;
    const x = r.pagaExtra;
    const filas = [
      ['Bruto', n.bruto, x && x.bruto],
      ['Seguridad Social', -n.cotizacion, x && -x.cotizacion],
      ['IRPF (' + porcentaje.format(r.tipoEfectivoIrpf) + ')', -n.irpf, x && -x.irpf],
      ['Neto', n.neto, x && x.neto, 'total']
    ];
    $('tabla-nomina').querySelector('.columna-mes').textContent = x ? 'Mes normal' : 'Al mes';
    const cuerpo = $('tabla-nomina').tBodies[0];
    cuerpo.textContent = '';
    filas.forEach(function (fila) {
      cuerpo.appendChild(el('tr', { clase: fila[3] || '' }, [
        el('th', { scope: 'row', texto: fila[0] }),
        el('td', { clase: 'num', texto: dinero(fila[1]) }),
        x ? el('td', { clase: 'num', texto: dinero(fila[2]) }) : null
      ]));
    });
    $('tabla-nomina').querySelector('.columna-extra').hidden = !x;
  }

  const PARTES = [
    { nombre: 'Neto para el trabajador', color: '--serie-1', valor: function (r) { return r.netoAnual; } },
    { nombre: 'IRPF', color: '--serie-2', valor: function (r) { return r.irpf.aPagar; } },
    { nombre: 'Seguridad Social del trabajador', color: '--serie-3', valor: function (r) { return r.cotizaciones.totalTrabajador; } },
    { nombre: 'Seguridad Social de la empresa', color: '--serie-4', valor: function (r) { return r.cotizaciones.totalEmpresa; } }
  ];

  // Texto blanco o negro según lo que contraste más con el color del segmento.
  function tintaPara(colorCss) {
    const rgb = (colorCss.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(function (v) {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const luminancia = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    return (luminancia + 0.05) / 0.05 >= 1.05 / (luminancia + 0.05) ? '#0b0b0b' : '#ffffff';
  }

  function pintarGrafico(r) {
    const figura = $('grafico');
    const barra = $('barra');
    const total = r.costeAnual;
    figura.hidden = !(total > 0);
    barra.textContent = '';
    ocultarTooltip();
    if (!(total > 0)) return;

    const leyenda = $('leyenda').tBodies[0];
    leyenda.textContent = '';
    let segmentoBruto = null;

    PARTES.forEach(function (parte, i) {
      const valor = parte.valor(r);
      const cuota = valor / total;
      const color = 'var(' + parte.color + ')';
      leyenda.appendChild(el('tr', {}, [
        el('td', {}, [el('span', { clase: 'muestra', style: 'background:' + color, 'aria-hidden': 'true' }), document.createTextNode(parte.nombre)]),
        el('td', { clase: 'num', texto: dinero(valor) }),
        el('td', { clase: 'num', texto: porcentaje.format(cuota) })
      ]));
      if (!(valor > 0)) return;

      const segmento = el('div', {
        clase: 'segmento',
        tabindex: '0',
        role: 'img',
        'aria-label': parte.nombre + ': ' + dinero(valor) + ' (' + porcentaje.format(cuota) + ' del coste)',
        style: 'flex: ' + valor + ' 1 0; background: ' + color
      }, [el('span', { clase: 'dentro', 'aria-hidden': 'true', texto: porcentajeEntero.format(cuota) })]);
      segmento.dataset.nombre = parte.nombre;
      segmento.dataset.valor = dinero(valor);
      segmento.dataset.porcentaje = porcentaje.format(cuota);
      segmento.dataset.color = color;
      barra.appendChild(segmento);
      if (i <= 2) segmentoBruto = segmento;
    });

    // La llave marca qué parte del coste es el sueldo bruto (neto + IRPF + cotización del trabajador).
    $('llave-texto').textContent = 'Sueldo bruto: ' + dinero(r.brutoAnual) + ' (' + porcentaje.format(r.brutoAnual / total) + ')';
    barra.dataset.segmentoBruto = segmentoBruto ? String(Array.prototype.indexOf.call(barra.children, segmentoBruto)) : '';
    ajustarGrafico();
  }

  // Lo que depende del tamaño real en pantalla: etiquetas dentro de los segmentos y la llave.
  function ajustarGrafico() {
    const barra = $('barra');
    Array.prototype.forEach.call(barra.children, function (segmento) {
      const texto = segmento.firstChild;
      texto.style.color = tintaPara(getComputedStyle(segmento).backgroundColor);
      texto.style.visibility = 'visible';
      if (texto.offsetWidth + 12 > segmento.clientWidth) texto.style.visibility = 'hidden';
    });
    const indice = barra.dataset.segmentoBruto;
    const segmentoBruto = indice === '' ? null : barra.children[Number(indice)];
    $('llave-tramo').style.width = segmentoBruto ? segmentoBruto.offsetLeft - barra.offsetLeft + segmentoBruto.offsetWidth + 'px' : '0';
  }

  function mostrarTooltip(segmento) {
    const figura = $('grafico');
    const caja = segmento.getBoundingClientRect();
    const cajaFigura = figura.getBoundingClientRect();
    tooltip.textContent = '';
    tooltip.appendChild(el('strong', { texto: segmento.dataset.valor }));
    tooltip.appendChild(el('span', { clase: 'clave', style: 'background:' + segmento.dataset.color, 'aria-hidden': 'true' }));
    tooltip.appendChild(document.createTextNode(segmento.dataset.nombre + ' · ' + segmento.dataset.porcentaje));
    tooltip.hidden = false;
    // Centrado sobre el segmento, sin salirse de la tarjeta.
    const mitad = tooltip.offsetWidth / 2;
    const centro = caja.left - cajaFigura.left + caja.width / 2;
    tooltip.style.left = Math.min(Math.max(centro, mitad), cajaFigura.width - mitad) + 'px';
    tooltip.style.top = caja.top - cajaFigura.top + 'px';
  }

  function ocultarTooltip() { tooltip.hidden = true; }

  function filasAnuales(r) {
    const ss = r.cotizaciones;
    const ir = r.irpf;
    const o = r.opciones;
    const t = P.seguridadSocial.trabajador;
    const e = P.seguridadSocial.empresa;
    const filas = [];
    const fila = function (nombre, valor, clase, conSigno) { filas.push({ nombre: nombre, valor: valor, clase: clase || '', conSigno: conSigno }); };
    const detalle = function (nombre, valor, conSigno) { fila(nombre, valor, 'detalle', conSigno); };

    fila('Sueldo bruto', r.brutoAnual, 'total');

    fila('Seguridad Social del trabajador', -ss.totalTrabajador);
    detalle('Contingencias comunes (' + tipo.format(t.contingenciasComunes) + ')', -ss.trabajador.contingenciasComunes);
    detalle('Desempleo (' + tipo.format(t.desempleo[o.contrato]) + ')', -ss.trabajador.desempleo);
    detalle('Formación profesional (' + tipo.format(t.formacion) + ')', -ss.trabajador.formacion);
    detalle('MEI (' + tipo.format(t.mei) + ')', -ss.trabajador.mei);
    if (ss.trabajador.solidaridad > 0) detalle('Cotización de solidaridad', -ss.trabajador.solidaridad);

    fila('IRPF', -ir.aPagar);
    detalle('Rendimiento neto (bruto menos Seguridad Social)', ir.rendimientoNeto);
    detalle('Bonificación del trabajo', -ir.bonificacion);
    detalle('Base liquidable', ir.baseLiquidable);
    detalle('Cuota según la tarifa', ir.cuotaIntegra);
    detalle('Minoración de cuota', -ir.minoracion);
    if (o.hijos > 0) detalle('Deducción por hijos', -ir.deduccionDescendientes);

    fila('Sueldo neto', r.netoAnual, 'total');

    fila('Seguridad Social de la empresa', ss.totalEmpresa, '', true);
    detalle('Contingencias comunes (' + tipo.format(e.contingenciasComunes) + ')', ss.empresa.contingenciasComunes);
    detalle('Desempleo (' + tipo.format(e.desempleo[o.contrato]) + ')', ss.empresa.desempleo);
    detalle('FOGASA (' + tipo.format(e.fogasa) + ')', ss.empresa.fogasa);
    detalle('Formación profesional (' + tipo.format(e.formacion) + ')', ss.empresa.formacion);
    detalle('MEI (' + tipo.format(e.mei) + ')', ss.empresa.mei);
    detalle('Accidentes de trabajo (' + tipo.format(o.atEp) + ')', ss.empresa.atEp);
    if (ss.empresa.solidaridad > 0) detalle('Cotización de solidaridad', ss.empresa.solidaridad);

    fila('Coste total para la empresa', r.costeAnual, 'total');
    return filas;
  }

  function pintarDesglose(r) {
    const cuerpo = $('tabla-anual').tBodies[0];
    cuerpo.textContent = '';
    filasAnuales(r).forEach(function (f) {
      cuerpo.appendChild(el('tr', { clase: f.clase }, [
        el('th', { scope: 'row', texto: f.nombre }),
        el('td', { clase: 'num', texto: dinero(f.valor, f.conSigno) })
      ]));
    });
  }

  const ICONO_INFO = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const ICONO_AVISO = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 15 14H1z" fill="#fab219"/><path d="M8 6v4M8 12v.1" stroke="#0b0b0b" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function textoAviso(aviso) {
    switch (aviso.codigo) {
      case 'bajo-smi':
        return ['Ojo: ', 'es menos que el salario mínimo de ' + P.anio + ' a jornada completa (' + importeRedondo(P.smiAnual) + ' brutos al año). Si trabajas a jornada parcial, es normal.', ICONO_AVISO];
      case 'sin-obligacion':
        return ['Declaración: ', 'con un solo pagador y hasta ' + importeRedondo(P.irpf.umbralObligacionDeclarar) + ' brutos al año no estás obligado a hacerla. Si no la haces, tu IRPF es lo que te hayan retenido en nómina, que puede no coincidir con esta cifra; si te retuvieron más, te conviene declarar para que te devuelvan la diferencia.', ICONO_INFO];
      case 'solidaridad':
        return ['Base máxima: ', 'tu sueldo supera el tope de cotización (' + importeRedondo(P.seguridadSocial.baseMaximaMensual) + ' al mes). Por el exceso solo se paga la cotización de solidaridad.', ICONO_INFO];
      default:
        return null;
    }
  }

  function pintarAvisos(r) {
    const caja = $('avisos');
    caja.textContent = '';
    r.avisos.forEach(function (aviso) {
      const partes = textoAviso(aviso);
      if (!partes) return;
      const nodo = el('div', { clase: 'aviso' });
      nodo.innerHTML = partes[2]; // icono fijo, sin datos del usuario
      nodo.appendChild(el('p', { style: 'margin:0' }, [el('strong', { texto: partes[0] }), document.createTextNode(partes[1])]));
      caja.appendChild(nodo);
    });

    $('dato-marginal').textContent = r.brutoAnual > 0
      ? 'Si tu bruto anual sube 100 €, tu neto sube ' + dinero(r.netoPorCada100) + '.'
      : '';
  }

  // === Enlace compartible ===

  function escribirUrl(e) {
    const q = new URLSearchParams();
    q.set('modo', e.modo);
    q.set('importe', e.textoImporte);
    q.set('periodo', e.periodo);
    q.set('pagas', String(e.pagas));
    if (e.hijos > 0) {
      q.set('hijos', String(e.hijos));
      if (e.menores6 > 0) q.set('menores6', String(e.menores6));
      if (!e.deduccionCompartida) q.set('compartida', 'no');
    }
    if (e.contrato === 'temporal') q.set('contrato', 'temporal');
    if (campoAtEp.value.trim() !== ATEP_POR_DEFECTO) q.set('atep', campoAtEp.value.trim());
    try { history.replaceState(null, '', location.pathname + '?' + q.toString()); } catch { /* file:// */ }
  }

  function leerUrl() {
    const q = new URLSearchParams(location.search);
    const marcar = function (nombre, valor) {
      const radio = formulario.querySelector('input[name="' + nombre + '"][value="' + CSS.escape(valor || '') + '"]');
      if (radio) radio.checked = true;
    };
    marcar('modo', q.get('modo'));
    marcar('periodo', q.get('periodo'));
    marcar('pagas', q.get('pagas'));
    if (q.has('importe')) campoImporte.value = q.get('importe');
    if (/^[0-6]$/.test(q.get('hijos') || '')) selectHijos.value = q.get('hijos');
    actualizarOpcionesHijos();
    if (/^[0-6]$/.test(q.get('menores6') || '')) selectMenores6.value = String(Math.min(Number(q.get('menores6')), Number(selectHijos.value)));
    if (q.get('compartida') === 'no') $('compartida').checked = false;
    if (q.get('contrato') === 'temporal') $('contrato').value = 'temporal';
    if (q.has('atep')) campoAtEp.value = q.get('atep');
    if (q.has('contrato') || q.has('atep')) formulario.querySelector('details.mas').open = true;
  }

  // === Bucle principal ===

  let temporizadorResumen = null;
  let temporizadorUrl = null;

  function calcular() {
    const e = leerEntrada();
    $('etiqueta-importe').textContent = ETIQUETAS_IMPORTE[e.modo][e.periodo];

    const valido = Number.isFinite(e.importe) && e.importe >= 0;
    const ayuda = $('ayuda-importe');
    ayuda.className = valido ? 'ayuda' : 'error';
    ayuda.textContent = valido ? ayudaImporte(e) : 'Escribe un importe válido, por ejemplo 30.000 o 2.150,50.';
    campoImporte.setAttribute('aria-invalid', String(!valido));

    const r = C.calcular(Object.assign({}, e, { importe: valido ? e.importe : 0 }));
    pintarTarjetas(r, e);
    pintarNomina(r);
    pintarGrafico(r);
    pintarDesglose(r);
    pintarAvisos(r);

    clearTimeout(temporizadorUrl);
    temporizadorUrl = setTimeout(function () { escribirUrl(e); }, 300);

    clearTimeout(temporizadorResumen);
    temporizadorResumen = setTimeout(function () {
      $('resumen').textContent = 'Bruto anual ' + dinero(r.brutoAnual) + '. Neto al mes ' + dinero(r.nomina.neto) +
        '. Coste anual para la empresa ' + dinero(r.costeAnual) + '.';
    }, 700);
  }

  function alCambiar(evento) {
    if (evento.target === selectHijos) actualizarOpcionesHijos();
    calcular();
  }
  formulario.addEventListener('submit', function (evento) { evento.preventDefault(); });
  formulario.addEventListener('input', alCambiar);
  formulario.addEventListener('change', alCambiar);

  const barra = $('barra');
  ['pointerenter', 'pointermove'].forEach(function (tipoEvento) {
    barra.addEventListener(tipoEvento, function (evento) {
      const segmento = evento.target.closest('.segmento');
      if (segmento) mostrarTooltip(segmento);
    });
  });
  barra.addEventListener('pointerleave', function (evento) { if (evento.pointerType !== 'touch') ocultarTooltip(); });
  barra.addEventListener('focusin', function (evento) { mostrarTooltip(evento.target); });
  barra.addEventListener('focusout', ocultarTooltip);
  if ('ResizeObserver' in window) new ResizeObserver(ajustarGrafico).observe(barra);

  const botonDetalle = $('ver-detalle');
  botonDetalle.addEventListener('click', function () {
    const abierto = $('tabla-anual').classList.toggle('sin-detalle') === false;
    botonDetalle.setAttribute('aria-expanded', String(abierto));
    botonDetalle.textContent = abierto ? 'Ocultar el detalle' : 'Ver el detalle';
  });

  const botonCompartir = $('compartir');
  if (navigator.clipboard && window.isSecureContext) {
    botonCompartir.hidden = false;
    botonCompartir.addEventListener('click', function () {
      navigator.clipboard.writeText(location.href).then(function () {
        botonCompartir.textContent = 'Enlace copiado';
      }, function () {
        botonCompartir.textContent = 'No se ha podido copiar: copia la dirección del navegador';
      }).then(function () {
        setTimeout(function () { botonCompartir.textContent = 'Copiar enlace a este cálculo'; }, 2500);
      });
    });
  }

  leerUrl();
  calcular();
})();
