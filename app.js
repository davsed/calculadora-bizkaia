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

  const ATEP_POR_DEFECTO = '1,00';
  const UMBRAL_DECLARAR = P.irpf.umbralObligacionDeclarar;

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

  // Sin céntimos: para las cifras grandes y los importes aproximados ("unos 59 €").
  function euroRedondo(x) {
    return eurosSinCentimos.format(Math.round(x) || 0);
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

  // "a 1 %, b 2 % y c 3 %"
  function enumerar(partes) {
    return partes.length > 1 ? partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1] : partes.join('');
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
      if (e.modo === 'bruto' && e.pagas === 14) return 'El bruto de cada una de las 14 pagas.';
      if (e.modo === 'neto' && e.pagas === 14) return 'El neto de la nómina de un mes normal, sin contar las pagas extra.';
      if (e.modo === 'neto') return 'El neto de la nómina de cada mes.';
      if (e.modo === 'coste') return 'La media al mes: el coste anual entre 12.';
    }
    if (e.modo === 'neto') return 'Lo que llega en el año, contando la declaración de la renta.';
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

  // === Resumen: coste → bruto → neto y qué parte llega al trabajador ===

  function pintarResumen(r) {
    const pagas = r.opciones.pagas;
    const hayDatos = r.costeAnual > 0;
    const parte = hayDatos ? r.netoAnual / r.costeAnual : 0;

    $('cifra-coste').textContent = euroRedondo(r.costeAnual);
    $('detalle-coste').textContent = 'al año · ' + euroRedondo(r.costeAnual / 12) + ' al mes de media';
    $('cifra-bruto').textContent = euroRedondo(r.brutoAnual);
    $('detalle-bruto').textContent = 'al año · ' + euroRedondo(r.brutoAnual / pagas) + ' × ' + pagas + ' pagas';
    $('cifra-neto').textContent = euroRedondo(r.netoAnual);
    $('detalle-neto').textContent = 'al año · ' + euroRedondo(r.nomina.neto) + ' al mes' +
      (r.pagaExtra ? ' y 2 pagas extra de ' + euroRedondo(r.pagaExtra.neto) : '');

    $('porcentaje-neto').textContent = hayDatos ? porcentaje.format(parte) : '—';
    $('medidor-neto').style.width = (parte * 100) + '%';
    $('medidor').setAttribute('aria-label', hayDatos
      ? porcentaje.format(parte) + ' para el trabajador y ' + porcentaje.format(1 - parte) + ' en impuestos y cotizaciones'
      : 'Sin datos');
    $('leyenda-neto').textContent = 'Para el trabajador: ' + euroRedondo(r.netoAnual) + (hayDatos ? ' (' + porcentaje.format(parte) + ')' : '');
    $('leyenda-resto').textContent = 'Impuestos y cotizaciones: ' + euroRedondo(r.costeAnual - r.netoAnual) +
      (hayDatos ? ' (' + porcentaje.format(1 - parte) + ')' : '');
  }

  // === Cascada: cada paso del coste al neto, con su explicación ===

  function textoCotizacion(total, bruto, tipos) {
    let texto = 'El ' + tipo.format(bruto > 0 ? total / bruto : 0) + ' del bruto: ' + enumerar(tipos) + '.';
    if (bruto / 12 > P.seguridadSocial.baseMaximaMensual) {
      texto += ' Se cotiza como máximo por ' + importeRedondo(P.seguridadSocial.baseMaximaMensual) +
        ' al mes; por encima solo se paga la cotización de solidaridad.';
    }
    return texto;
  }

  function resumenIrpf(r) {
    const ir = r.irpf;
    const minimo = esRetencionMinima(r) ? ' (el mínimo en contratos de menos de un año)' : '';
    const retencion = 'En nómina se retiene un ' + porcentajeEntero.format(ir.tipoRetencion) + minimo;
    if (!ir.obligadoADeclarar) {
      if (ir.retencion === 0) return 'Hasta ' + importeRedondo(UMBRAL_DECLARAR) + ' brutos no hay retención ni obligación de declarar.';
      if (ir.resultadoDeclaracion < -0.5) return retencion + '; declarando se recuperan unos ' + euroRedondo(-ir.resultadoDeclaracion) + '.';
      return retencion + ' y no hay obligación de declarar.';
    }
    if (ir.resultadoDeclaracion > 0.5) return retencion + ' y en la renta salen a pagar unos ' + euroRedondo(ir.resultadoDeclaracion) + '.';
    if (ir.resultadoDeclaracion < -0.5) return retencion + ' y en la renta salen a devolver unos ' + euroRedondo(-ir.resultadoDeclaracion) + '.';
    return retencion + ', que cubre casi justo el IRPF del año.';
  }

  function esRetencionMinima(r) {
    const segunTabla = C.tipoRetencion(r.brutoAnual, Object.assign({}, r.opciones, { contrato: 'indefinido' }));
    return r.irpf.tipoRetencion > segunTabla;
  }

  function pintarCascada(r) {
    const lista = $('cascada');
    lista.textContent = '';
    const coste = r.costeAnual;
    if (!(coste > 0)) return;

    const ss = r.cotizaciones;
    const o = r.opciones;
    const bruto = r.brutoAnual;
    const trasCotizar = bruto - ss.totalTrabajador;
    const e = P.seguridadSocial.empresa;
    const t = P.seguridadSocial.trabajador;

    const pasos = [
      {
        nombre: 'Coste total para la empresa', valor: coste, desde: 0, color: '--gris-dato', clase: 'total',
        texto: 'Lo que paga la empresa por el puesto en un año: ' + dinero(coste / 12) + ' al mes de media.'
      },
      {
        signo: '−', leido: 'menos', nombre: 'Seguridad Social de la empresa', valor: ss.totalEmpresa, desde: bruto, color: '--serie-4',
        texto: textoCotizacion(ss.totalEmpresa, bruto, [
          'contingencias comunes ' + tipo.format(e.contingenciasComunes),
          'desempleo ' + tipo.format(e.desempleo[o.contrato]),
          'FOGASA ' + tipo.format(e.fogasa),
          'formación ' + tipo.format(e.formacion),
          'MEI ' + tipo.format(e.mei),
          'accidentes de trabajo ' + tipo.format(o.atEp)
        ])
      },
      {
        signo: '=', leido: 'igual a', nombre: 'Sueldo bruto', valor: bruto, desde: 0, color: '--gris-dato', clase: 'total',
        texto: 'El sueldo del contrato: ' + dinero(bruto / o.pagas) + ' en cada una de las ' + o.pagas + ' pagas.'
      },
      {
        signo: '−', leido: 'menos', nombre: 'Seguridad Social del trabajador', valor: ss.totalTrabajador, desde: trasCotizar, color: '--serie-3',
        texto: textoCotizacion(ss.totalTrabajador, bruto, [
          'contingencias comunes ' + tipo.format(t.contingenciasComunes),
          'desempleo ' + tipo.format(t.desempleo[o.contrato]),
          'formación ' + tipo.format(t.formacion),
          'MEI ' + tipo.format(t.mei)
        ])
      },
      {
        signo: '−', leido: 'menos', nombre: 'IRPF', valor: r.irpf.aPagar, desde: r.netoAnual, color: '--serie-2',
        texto: 'El ' + porcentaje.format(r.tipoEfectivoIrpf) + ' del bruto' + (o.hijos > 0 ? ', ya con la deducción por hijos' : '') + '. ' + resumenIrpf(r)
      },
      {
        signo: '=', leido: 'igual a', nombre: 'Neto para el trabajador', valor: r.netoAnual, desde: 0, color: '--serie-1', clase: 'total neto',
        texto: 'Lo que llega a su cuenta en el año, contando la declaración de la renta. Cada mes, ' + dinero(r.nomina.neto) +
          (r.pagaExtra ? ', y ' + dinero(r.pagaExtra.neto) + ' en cada paga extra.' : '.')
      }
    ];

    pasos.forEach(function (paso) {
      const barra = el('div', { clase: 'paso-barra', 'aria-hidden': 'true' });
      if (paso.valor > 0) {
        barra.appendChild(el('span', {
          style: 'left:' + (100 * paso.desde / coste) + '%;width:' + (100 * paso.valor / coste) + '%;background:var(' + paso.color + ')'
        }));
      }
      lista.appendChild(el('li', { clase: 'paso ' + (paso.clase || '') }, [
        el('div', { clase: 'paso-fila' }, [
          el('span', { clase: 'paso-nombre' }, [
            el('span', { clase: 'paso-signo', 'aria-hidden': 'true', texto: paso.signo || '' }),
            paso.leido ? el('span', { clase: 'oculto', texto: paso.leido + ' ' }) : null,
            document.createTextNode(paso.nombre)
          ]),
          el('span', { clase: 'paso-importe', texto: dinero(paso.valor) }),
          el('span', { clase: 'paso-porcentaje', texto: porcentaje.format(paso.valor / coste) })
        ]),
        barra,
        el('p', { clase: 'paso-explicacion', texto: paso.texto })
      ]));
    });
  }

  // === Nómina de cada mes ===

  function pintarNomina(r) {
    const n = r.nomina;
    const x = r.pagaExtra;
    const filas = [
      ['Bruto', n.bruto, x && x.bruto],
      ['Seguridad Social', -n.cotizacion, x && -x.cotizacion],
      ['Retención IRPF (' + porcentajeEntero.format(r.irpf.tipoRetencion) + ')', -n.irpf, x && -x.irpf],
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
    $('nota-nomina').textContent = textoDeclaracion(r);
  }

  // Lo retenido en nómina frente a lo que sale en la declaración.
  function textoDeclaracion(r) {
    const ir = r.irpf;
    if (!(r.brutoAnual > 0)) return '';
    const minimo = esRetencionMinima(r) ? ' (el mínimo en contratos de menos de un año)' : '';
    const retencion = ir.tipoRetencion > 0
      ? 'La retención de IRPF es del ' + porcentajeEntero.format(ir.tipoRetencion) + minimo + ', según la tabla de retenciones de Bizkaia de ' + P.anio + '. '
      : 'Con este sueldo la tabla de retenciones de Bizkaia no aplica retención de IRPF. ';
    if (!ir.obligadoADeclarar) {
      const sinObligacion = 'Con un solo pagador y hasta ' + importeRedondo(UMBRAL_DECLARAR) + ' brutos no hay obligación de hacer la declaración';
      if (ir.resultadoDeclaracion < -0.5) return retencion + sinObligacion + ', pero compensa hacerla: devolverían unos ' + euroRedondo(-ir.resultadoDeclaracion) + '.';
      if (ir.retencion > 0) return retencion + sinObligacion + ', así que el IRPF se queda en lo retenido.';
      return retencion + sinObligacion + ', así que no se paga IRPF (si no hay otros ingresos).';
    }
    if (ir.resultadoDeclaracion > 0.5) return retencion + 'En la declaración de la renta saldrá a pagar la diferencia: unos ' + euroRedondo(ir.resultadoDeclaracion) + '.';
    if (ir.resultadoDeclaracion < -0.5) return retencion + 'En la declaración de la renta saldrán a devolver unos ' + euroRedondo(-ir.resultadoDeclaracion) + '.';
    return retencion + 'Cubre casi justo el IRPF del año, así que la declaración saldrá a cero o casi.';
  }

  // === Cálculo detallado ===

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

    fila('IRPF del año (' + porcentaje.format(r.tipoEfectivoIrpf) + ')', -ir.aPagar);
    detalle('Rendimiento neto (bruto menos Seguridad Social)', ir.rendimientoNeto);
    detalle('Bonificación del trabajo', -ir.bonificacion);
    detalle('Base liquidable', ir.baseLiquidable);
    detalle('Cuota según la tarifa', ir.cuotaIntegra);
    detalle('Minoración de cuota', -ir.minoracion);
    if (o.hijos > 0) detalle('Deducción por hijos', -ir.deduccionDescendientes);
    detalle('Cuota líquida', ir.cuotaLiquida);
    detalle('Retenido en nómina (' + porcentajeEntero.format(ir.tipoRetencion) + ')', ir.retencion);
    if (ir.obligadoADeclarar || ir.resultadoDeclaracion < -0.005) {
      detalle(ir.resultadoDeclaracion >= 0 ? 'A pagar en la declaración' : 'A devolver en la declaración', Math.abs(ir.resultadoDeclaracion));
    } else {
      detalle('Sin obligación de declarar: se paga lo retenido', ir.aPagar);
    }

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

  // === Avisos y dato marginal ===

  const ICONO_INFO = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const ICONO_AVISO = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 15 14H1z" fill="#fab219"/><path d="M8 6v4M8 12v.1" stroke="#0b0b0b" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function textoAviso(aviso) {
    switch (aviso.codigo) {
      case 'bajo-smi':
        return ['Ojo: ', 'es menos que el salario mínimo de ' + P.anio + ' a jornada completa (' + importeRedondo(P.smiAnual) + ' brutos al año). A jornada parcial es normal.', ICONO_AVISO];
      case 'escalon-20000':
        return ['Ojo: ', 'al pasar de ' + importeRedondo(UMBRAL_DECLARAR) + ' brutos empiezan las retenciones y hay que hacer la declaración. Con este sueldo llegan ' + dinero(aviso.perdida) + ' netos al año menos que con ' + importeRedondo(UMBRAL_DECLARAR) + ' justos.', ICONO_AVISO];
      case 'solidaridad':
        return ['Base máxima: ', 'el sueldo supera el tope de cotización (' + importeRedondo(P.seguridadSocial.baseMaximaMensual) + ' al mes). Por el exceso solo se paga la cotización de solidaridad.', ICONO_INFO];
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

    const marginal = $('dato-marginal');
    if (!(r.brutoAnual > 0)) marginal.textContent = '';
    else if (r.netoPorCada100 >= 0) {
      marginal.textContent = 'Si el bruto anual sube 100 €, a la empresa le cuesta ' + dinero(r.costePorCada100) +
        ' más y al trabajador le llegan ' + dinero(r.netoPorCada100) + ' más.';
    } else {
      marginal.textContent = 'Si el bruto anual subiera 100 €, se pasaría de ' + importeRedondo(UMBRAL_DECLARAR) + ': a la empresa le costaría ' +
        dinero(r.costePorCada100) + ' más y al trabajador le llegarían ' + dinero(-r.netoPorCada100) + ' menos.';
    }
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
    pintarResumen(r);
    pintarAvisos(r);
    pintarCascada(r);
    pintarNomina(r);
    pintarDesglose(r);

    clearTimeout(temporizadorUrl);
    temporizadorUrl = setTimeout(function () { escribirUrl(e); }, 300);

    clearTimeout(temporizadorResumen);
    temporizadorResumen = setTimeout(function () {
      $('resumen').textContent = r.costeAnual > 0
        ? 'Cuesta a la empresa ' + euroRedondo(r.costeAnual) + ' al año. Sueldo bruto ' + euroRedondo(r.brutoAnual) +
          '. Llegan al trabajador ' + euroRedondo(r.netoAnual) + ', el ' + porcentaje.format(r.netoAnual / r.costeAnual) + ' del coste.'
        : '';
    }, 700);
  }

  function alCambiar(evento) {
    if (evento.target === selectHijos) actualizarOpcionesHijos();
    calcular();
  }
  formulario.addEventListener('submit', function (evento) { evento.preventDefault(); });
  formulario.addEventListener('input', alCambiar);
  formulario.addEventListener('change', alCambiar);

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
