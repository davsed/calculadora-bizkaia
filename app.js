/* Interfaz de la calculadora: lee el formulario, llama a calculadora.js y pinta el resultado. */
(function () {
  'use strict';

  const C = window.CalculadoraBizkaia;
  const P = C.PARAMETROS;
  const $ = (id) => document.getElementById(id);

  const formulario = $('formulario');
  const campoImporte = $('importe');
  const campoAtEp = $('atep');
  const campoBaseReta = $('base-reta');
  const selectHijos = $('hijos');
  const selectMenores6 = $('menores6');

  const ATEP_POR_DEFECTO = '1,00';
  const UMBRAL_DECLARAR = P.irpf.umbralObligacionDeclarar;

  const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  const eurosSinCentimos = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  // Con el signo menos tipográfico, como en los importes.
  const formatoPorcentaje = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const porcentaje = { format: function (x) { return formatoPorcentaje.format(x || 0).replace('-', '−'); } };
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

  // "a 1 %, b 2 % y c 3 %"
  function enumerar(partes) {
    return partes.length > 1 ? partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1] : partes.join('');
  }

  // Textos que cambian entre asalariado y socio.
  function textos(esSocio) {
    return esSocio
      ? { pagador: 'la sociedad', persona: 'el socio', alPersona: 'al socio', cuesta: 'Cuesta a la sociedad', bruto: 'Sueldo en nómina', llega: 'Llega al socio' }
      : { pagador: 'la empresa', persona: 'el trabajador', alPersona: 'al trabajador', cuesta: 'Cuesta a la empresa', bruto: 'Sueldo bruto', llega: 'Llega al trabajador' };
  }

  // === Lectura del formulario ===

  function valorRadio(nombre) {
    const marcado = formulario.querySelector('input[name="' + nombre + '"]:checked');
    return marcado ? marcado.value : null;
  }

  function leerEntrada() {
    const texto = campoImporte.value.trim();
    const base = campoBaseReta.value.trim();
    return {
      tipo: valorRadio('tipo'),
      modo: valorRadio('modo'),
      periodo: valorRadio('periodo'),
      pagas: Number(valorRadio('pagas')),
      textoImporte: texto,
      importe: texto === '' ? 0 : C.parseImporte(texto),
      hijos: Number(selectHijos.value),
      menores6: Number(selectMenores6.value),
      deduccionCompartida: $('compartida').checked,
      contrato: $('contrato').value,
      atEp: C.parseImporte(campoAtEp.value) / 100,
      cuotaPagaSociedad: valorRadio('pagaCuota') !== 'socio',
      textoBaseReta: base,
      baseReta: base === '' ? null : C.parseImporte(base)
    };
  }

  const ETIQUETAS_IMPORTE = {
    asalariado: {
      bruto: { anual: 'Sueldo bruto anual', mensual: 'Sueldo bruto mensual' },
      neto: { anual: 'Sueldo neto anual', mensual: 'Sueldo neto mensual' },
      coste: { anual: 'Coste anual para la empresa', mensual: 'Coste mensual para la empresa' }
    },
    socio: {
      bruto: { anual: 'Sueldo bruto anual en nómina', mensual: 'Sueldo bruto mensual en nómina' },
      neto: { anual: 'Neto anual del socio', mensual: 'Neto mensual del socio' },
      coste: { anual: 'Coste anual para la sociedad', mensual: 'Coste mensual para la sociedad' }
    }
  };

  function ayudaImporte(e) {
    if (e.tipo === 'socio') {
      if (e.modo === 'bruto') return 'Sin contar la cuota de autónomo, aunque la pague la sociedad.' + (e.periodo === 'mensual' && e.pagas === 14 ? ' Es el de cada una de las 14 pagas.' : '');
      if (e.modo === 'coste') return 'Todo lo que paga la sociedad por su trabajo: la nómina y, si la paga ella, la cuota.' + (e.periodo === 'mensual' ? ' Media al mes.' : '');
      return e.periodo === 'mensual'
        ? 'Lo que le queda en un mes normal, ya pagada la cuota de autónomo.'
        : 'Lo que le queda en el año, contando la cuota y la declaración de la renta.';
    }
    if (e.periodo === 'mensual') {
      if (e.modo === 'bruto' && e.pagas === 14) return 'El bruto de cada una de las 14 pagas.';
      if (e.modo === 'neto' && e.pagas === 14) return 'El neto de la nómina de un mes normal, sin contar las pagas extra.';
      if (e.modo === 'neto') return 'El neto de la nómina de cada mes.';
      if (e.modo === 'coste') return 'La media al mes: el coste anual entre 12.';
    }
    if (e.modo === 'neto') return 'Lo que llega en el año, contando la declaración de la renta.';
    return 'Puedes escribir 30000, 30.000 o 30.000,50.';
  }

  function textoBaseReta(e, r, baseValida) {
    const reta = r.reta;
    if (!baseValida) return 'Escribe una base válida o déjalo vacío.';
    if (!(r.costeAnual > 0)) return 'Déjalo vacío para usar la mínima, que es lo habitual.';
    if (reta.baseMinima === reta.baseMaxima) {
      return 'Con este importe solo puede cotizar por ' + dinero(reta.base) + ' al mes, la mínima de un socio.';
    }
    let texto = (e.baseReta === null ? 'Déjalo vacío para usar la mínima, que es lo habitual. ' : '') +
      'Con este importe puede ir de ' + dinero(reta.baseMinima) + ' a ' + dinero(reta.baseMaxima) + ' al mes';
    if (e.baseReta !== null && Math.abs(e.baseReta - reta.base) >= 0.005) texto += ', así que se usa ' + dinero(reta.base);
    return texto + '.';
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

  function actualizarTipo(esSocio) {
    $('opciones-socio').hidden = !esSocio;
    $('ayuda-socio').hidden = !esSocio;
    $('opciones-asalariado').hidden = esSocio;
    $('texto-modo-coste').textContent = esSocio ? 'Coste sociedad' : 'Coste empresa';
    $('etiqueta-hijos').textContent = esSocio ? 'Hijos que conviven con el socio' : 'Hijos que conviven con el trabajador';
  }

  // === Resumen: coste → bruto → neto y qué parte llega a la persona ===

  function pintarResumen(r) {
    const esSocio = r.tipo === 'socio';
    const t = textos(esSocio);
    const pagas = r.opciones.pagas;
    const hayDatos = r.costeAnual > 0;
    const parte = hayDatos ? r.netoAnual / r.costeAnual : 0;

    $('etiqueta-cifra-coste').textContent = t.cuesta;
    $('etiqueta-cifra-bruto').textContent = t.bruto;
    $('etiqueta-cifra-neto').textContent = t.llega;
    $('cifra-coste').textContent = euroRedondo(r.costeAnual);
    $('detalle-coste').textContent = 'al año · ' + euroRedondo(r.costeAnual / 12) + ' al mes de media';
    $('cifra-bruto').textContent = euroRedondo(r.brutoAnual);
    $('detalle-bruto').textContent = 'al año · ' + euroRedondo(r.brutoAnual / pagas) + ' × ' + pagas + ' pagas' +
      (esSocio && r.opciones.cuotaPagaSociedad ? ', sin la cuota' : '');
    $('cifra-neto').textContent = euroRedondo(r.netoAnual);
    $('detalle-neto').textContent = 'al año · ' + euroRedondo(r.nomina.disponible === undefined ? r.nomina.neto : r.nomina.disponible) + ' al mes' +
      (r.pagaExtra ? ' y 2 pagas extra de ' + euroRedondo(r.pagaExtra.neto) : '');

    $('porcentaje-neto').textContent = hayDatos ? porcentaje.format(parte) : '—';
    $('proporcion-texto').textContent = 'de lo que paga ' + t.pagador + ' llega a la cuenta ' + (esSocio ? 'del socio' : 'del trabajador');
    $('medidor-neto').style.width = Math.max(0, Math.min(1, parte)) * 100 + '%';
    const resto = esSocio ? 'Cuota de autónomo e IRPF' : 'Impuestos y cotizaciones';
    $('medidor').setAttribute('aria-label', hayDatos
      ? porcentaje.format(parte) + ' para ' + t.persona + ' y ' + porcentaje.format(1 - parte) + ' en ' + resto.toLowerCase()
      : 'Sin datos');
    $('leyenda-neto').textContent = 'Para ' + t.persona + ': ' + euroRedondo(r.netoAnual) + (hayDatos ? ' (' + porcentaje.format(parte) + ')' : '');
    $('leyenda-resto').textContent = resto + ': ' + euroRedondo(r.costeAnual - r.netoAnual) +
      (hayDatos ? ' (' + porcentaje.format(1 - parte) + ')' : '');

    const comparacion = $('comparacion');
    comparacion.hidden = !(esSocio && r.comparacionAsalariado);
    if (!comparacion.hidden) {
      const diferencia = r.netoAnual - r.comparacionAsalariado.netoAnual;
      comparacion.textContent = 'Como asalariado, con el mismo coste para la empresa, le llegarían ' +
        euroRedondo(r.comparacionAsalariado.netoAnual) + ' al año (' + porcentaje.format(r.comparacionAsalariado.netoAnual / r.costeAnual) + '): ' +
        (Math.abs(diferencia) < 1 ? 'lo mismo.'
          : euroRedondo(Math.abs(diferencia)) + (diferencia > 0 ? ' menos que como socio.' : ' más que como socio.'));
    }
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

  function esRetencionMinima(r) {
    if (r.tipo === 'socio') return false;
    const segunTabla = C.tipoRetencion(r.brutoAnual, Object.assign({}, r.opciones, { contrato: 'indefinido' }));
    return r.irpf.tipoRetencion > segunTabla;
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

  function textoCuotaReta(r) {
    const reta = r.reta;
    const tipoTotal = Object.keys(P.reta.tipos).reduce(function (s, k) { return s + P.reta.tipos[k]; }, 0);
    let base;
    if (r.opciones.baseReta !== null) base = 'la base elegida';
    else if (reta.base === P.reta.baseMinimaSocietario) base = 'la base mínima de un socio de sociedad';
    else base = 'la base mínima de su tramo';
    return reta.tramo.nombre + ' del RETA: sus rendimientos son ' + dinero(reta.rendimientoMensual) +
      ' al mes (lo que cobra de la sociedad menos un 3 %). Cotiza por ' + dinero(reta.base) + ' al mes, ' + base +
      ', al ' + tipo.format(tipoTotal) + ': ' + dinero(reta.cuotaMensual) + ' al mes. Es provisional: al año siguiente la Seguridad Social' +
      ' la regulariza con los rendimientos reales, que incluyen también los dividendos de la sociedad.';
  }

  function pasosAsalariado(r) {
    const ss = r.cotizaciones;
    const o = r.opciones;
    const bruto = r.brutoAnual;
    const e = P.seguridadSocial.empresa;
    const t = P.seguridadSocial.trabajador;
    return [
      {
        nombre: 'Coste total para la empresa', valor: r.costeAnual, desde: 0, color: '--gris-dato', clase: 'total',
        texto: 'Lo que paga la empresa por el puesto en un año: ' + dinero(r.costeAnual / 12) + ' al mes de media.'
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
        signo: '−', leido: 'menos', nombre: 'Seguridad Social del trabajador', valor: ss.totalTrabajador, desde: bruto - ss.totalTrabajador, color: '--serie-3',
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
  }

  function pasosSocio(r) {
    const o = r.opciones;
    const cuota = r.reta.cuotaAnual;
    const trasCuota = r.costeAnual - cuota;
    return [
      {
        nombre: 'Coste total para la sociedad', valor: r.costeAnual, desde: 0, color: '--gris-dato', clase: 'total',
        texto: o.cuotaPagaSociedad
          ? 'La nómina, ' + dinero(r.brutoAnual) + ', más la cuota de autónomo, que paga la sociedad.'
          : 'La nómina del socio. La cuota de autónomo la paga el socio aparte, de su bolsillo.'
      },
      {
        signo: '−', leido: 'menos', nombre: 'Cuota de autónomo (RETA)', valor: cuota, desde: trasCuota, color: '--serie-3',
        texto: textoCuotaReta(r)
      },
      {
        signo: '=', leido: 'igual a', nombre: 'Rendimiento neto del trabajo', valor: trasCuota, desde: 0, color: '--gris-dato', clase: 'total',
        texto: o.cuotaPagaSociedad
          ? 'Es el sueldo bruto de la nómina: ' + dinero(r.brutoAnual / o.pagas) + ' en cada una de las ' + o.pagas + ' pagas.'
          : 'La nómina menos la cuota de autónomo, que el IRPF resta como gasto.'
      },
      {
        signo: '−', leido: 'menos', nombre: 'IRPF', valor: r.irpf.aPagar, desde: r.netoAnual, color: '--serie-2',
        texto: 'El ' + porcentaje.format(r.tipoEfectivoIrpf) + ' de lo que paga la sociedad' + (o.hijos > 0 ? ', ya con la deducción por hijos' : '') +
          '. La cuota de autónomo se resta como gasto. ' + resumenIrpf(r)
      },
      {
        signo: '=', leido: 'igual a', nombre: 'Neto para el socio', valor: r.netoAnual, desde: 0, color: '--serie-1', clase: 'total neto',
        texto: 'Lo que le queda en el año, ya pagada la cuota y contando la declaración de la renta. Cada mes, ' + dinero(r.nomina.disponible) +
          (r.pagaExtra ? ', y ' + dinero(r.pagaExtra.disponible) + ' en cada paga extra.' : '.')
      }
    ];
  }

  function pintarCascada(r) {
    const esSocio = r.tipo === 'socio';
    $('titulo-cascada').textContent = esSocio
      ? 'De lo que paga la sociedad al neto del socio'
      : 'Del coste de la empresa al neto del trabajador';
    const lista = $('cascada');
    lista.textContent = '';
    const coste = r.costeAnual;
    if (!(coste > 0)) return;

    (esSocio ? pasosSocio(r) : pasosAsalariado(r)).forEach(function (paso) {
      const barra = el('div', { clase: 'paso-barra', 'aria-hidden': 'true' });
      const desde = Math.max(0, paso.desde);
      const hasta = Math.min(coste, paso.desde + paso.valor);
      if (hasta > desde) {
        barra.appendChild(el('span', {
          style: 'left:' + (100 * desde / coste) + '%;width:' + (100 * (hasta - desde) / coste) + '%;background:var(' + paso.color + ')'
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
    const esSocio = r.tipo === 'socio';
    const n = r.nomina;
    const x = r.pagaExtra;
    const retencion = 'Retención IRPF (' + porcentajeEntero.format(r.irpf.tipoRetencion) + ')';
    let filas;
    if (!esSocio) {
      filas = [
        ['Bruto', n.bruto, x && x.bruto],
        ['Seguridad Social', -n.cotizacion, x && -x.cotizacion],
        [retencion, -n.irpf, x && -x.irpf],
        ['Neto', n.neto, x && x.neto, 'total']
      ];
    } else if (r.opciones.cuotaPagaSociedad) {
      filas = [
        ['Bruto', n.bruto, x && x.bruto],
        [retencion, -n.irpf, x && -x.irpf],
        ['Neto en la cuenta', n.neto, x && x.neto, 'total']
      ];
    } else {
      filas = [
        ['Bruto', n.bruto, x && x.bruto],
        [retencion, -n.irpf, x && -x.irpf],
        ['Neto de la nómina', n.neto, x && x.neto],
        ['Cuota de autónomo', -n.cuotaSocio, x && -x.cuotaSocio],
        ['Le queda', n.disponible, x && x.disponible, 'total']
      ];
    }
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

    let nota = textoDeclaracion(r);
    if (esSocio && r.costeAnual > 0) {
      nota = (r.opciones.cuotaPagaSociedad
        ? 'La sociedad paga además la cuota de autónomo, ' + dinero(n.especie) + ' al mes. Cuenta como sueldo en especie, así que también lleva retención. '
        : 'El socio paga la cuota de autónomo de su bolsillo, ' + dinero(n.cuotaSocio) + ' al mes. ') + nota;
    }
    $('nota-nomina').textContent = nota;
  }

  // Lo retenido en nómina frente a lo que sale en la declaración.
  function textoDeclaracion(r) {
    const ir = r.irpf;
    if (!(r.costeAnual > 0)) return '';
    const esSocio = r.tipo === 'socio';
    const minimo = esRetencionMinima(r) ? ' (el mínimo en contratos de menos de un año)' : '';
    const retencion = ir.tipoRetencion > 0
      ? 'La retención de IRPF es del ' + porcentajeEntero.format(ir.tipoRetencion) + minimo + ', según la tabla de retenciones de Bizkaia de ' + P.anio + '. '
      : 'Con este sueldo la tabla de retenciones de Bizkaia no aplica retención de IRPF. ';
    if (!ir.obligadoADeclarar) {
      const sinObligacion = 'Sin otros ingresos, hasta ' + importeRedondo(UMBRAL_DECLARAR) + ' brutos al año no hay obligación de hacer la declaración' +
        (esSocio ? ' (tampoco con dividendos de hasta 1.600 € al año)' : '');
      if (ir.resultadoDeclaracion < -0.5) return retencion + sinObligacion + ', pero compensa hacerla: devolverían unos ' + euroRedondo(-ir.resultadoDeclaracion) + '.';
      if (ir.retencion > 0) return retencion + sinObligacion + ', así que el IRPF se queda en lo retenido.';
      return retencion + sinObligacion + ', así que no se paga IRPF.';
    }
    if (ir.resultadoDeclaracion > 0.5) return retencion + 'En la declaración de la renta saldrá a pagar la diferencia: unos ' + euroRedondo(ir.resultadoDeclaracion) + '.';
    if (ir.resultadoDeclaracion < -0.5) return retencion + 'En la declaración de la renta saldrán a devolver unos ' + euroRedondo(-ir.resultadoDeclaracion) + '.';
    return retencion + 'Cubre casi justo el IRPF del año, así que la declaración saldrá a cero o casi.';
  }

  // === Cálculo detallado ===

  function filasIrpf(r, detalle) {
    const ir = r.irpf;
    const o = r.opciones;
    if (r.tipo === 'socio') {
      detalle('Rendimiento íntegro del trabajo (todo lo que paga la sociedad)', r.costeAnual);
      detalle('Cuota de autónomo (gasto deducible)', -r.reta.cuotaAnual);
    }
    detalle(r.tipo === 'socio' ? 'Rendimiento neto' : 'Rendimiento neto (bruto menos Seguridad Social)', ir.rendimientoNeto);
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
  }

  function filasAnuales(r) {
    const filas = [];
    const fila = function (nombre, valor, clase, conSigno) { filas.push({ nombre: nombre, valor: valor, clase: clase || '', conSigno: conSigno }); };
    const detalle = function (nombre, valor, conSigno) { fila(nombre, valor, 'detalle', conSigno); };
    const o = r.opciones;

    if (r.tipo === 'socio') {
      const reta = r.reta;
      const tiposReta = P.reta.tipos;
      fila('Coste para la sociedad', r.costeAnual, 'total');
      if (o.cuotaPagaSociedad) {
        detalle('Sueldo bruto en nómina', r.brutoAnual);
        detalle('Cuota de autónomo que paga la sociedad', reta.cuotaAnual);
      }
      fila('Cuota de autónomo (RETA)', -reta.cuotaAnual);
      detalle('Rendimientos para el RETA, al mes (' + reta.tramo.nombre.toLowerCase() + ')', reta.rendimientoMensual);
      detalle('Base de cotización, al mes', reta.base);
      detalle('Contingencias comunes (' + tipo.format(tiposReta.contingenciasComunes) + ')', -reta.detalleMensual.contingenciasComunes * 12);
      detalle('Contingencias profesionales (' + tipo.format(tiposReta.contingenciasProfesionales) + ')', -reta.detalleMensual.contingenciasProfesionales * 12);
      detalle('Cese de actividad (' + tipo.format(tiposReta.ceseActividad) + ')', -reta.detalleMensual.ceseActividad * 12);
      detalle('Formación profesional (' + tipo.format(tiposReta.formacion) + ')', -reta.detalleMensual.formacion * 12);
      detalle('MEI (' + tipo.format(tiposReta.mei) + ')', -reta.detalleMensual.mei * 12);
      fila('IRPF del año (' + porcentaje.format(r.tipoEfectivoIrpf) + ')', -r.irpf.aPagar);
      filasIrpf(r, detalle);
      fila('Neto para el socio', r.netoAnual, 'total');
      return filas;
    }

    const ss = r.cotizaciones;
    const t = P.seguridadSocial.trabajador;
    const e = P.seguridadSocial.empresa;
    fila('Sueldo bruto', r.brutoAnual, 'total');

    fila('Seguridad Social del trabajador', -ss.totalTrabajador);
    detalle('Contingencias comunes (' + tipo.format(t.contingenciasComunes) + ')', -ss.trabajador.contingenciasComunes);
    detalle('Desempleo (' + tipo.format(t.desempleo[o.contrato]) + ')', -ss.trabajador.desempleo);
    detalle('Formación profesional (' + tipo.format(t.formacion) + ')', -ss.trabajador.formacion);
    detalle('MEI (' + tipo.format(t.mei) + ')', -ss.trabajador.mei);
    if (ss.trabajador.solidaridad > 0) detalle('Cotización de solidaridad', -ss.trabajador.solidaridad);

    fila('IRPF del año (' + porcentaje.format(r.tipoEfectivoIrpf) + ')', -r.irpf.aPagar);
    filasIrpf(r, detalle);

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

  function textoAviso(aviso, r) {
    const t = textos(r.tipo === 'socio');
    switch (aviso.codigo) {
      case 'bajo-smi':
        return ['Ojo: ', 'es menos que el salario mínimo de ' + P.anio + ' a jornada completa (' + importeRedondo(P.smiAnual) + ' brutos al año). A jornada parcial es normal.', ICONO_AVISO];
      case 'escalon-20000':
        return ['Ojo: ', 'al pasar de ' + importeRedondo(UMBRAL_DECLARAR) + ' brutos empiezan las retenciones y hay que hacer la declaración. Con este importe llegan ' + t.alPersona + ' ' + dinero(aviso.perdida) + ' netos al año menos que con ' + importeRedondo(UMBRAL_DECLARAR) + ' justos.', ICONO_AVISO];
      case 'solidaridad':
        return ['Base máxima: ', 'el sueldo supera el tope de cotización (' + importeRedondo(P.seguridadSocial.baseMaximaMensual) + ' al mes). Por el exceso solo se paga la cotización de solidaridad.', ICONO_INFO];
      case 'escalon-tramo':
        return ['Ojo: ', 'al pasar de ' + euroRedondo(aviso.limite) + ' al año sube de tramo en el RETA y la cuota mínima es más alta. Con este importe llegan al socio ' + dinero(aviso.perdida) + ' netos al año menos que con ' + euroRedondo(aviso.limite) + ' justos.', ICONO_AVISO];
      case 'cuota-supera':
        return ['Ojo: ', 'la cuota mínima de autónomo de un socio (' + dinero(r.reta.cuotaMensual) + ' al mes) se come todo lo que paga la sociedad y más.', ICONO_AVISO];
      default:
        return null;
    }
  }

  function pintarAvisos(r) {
    const caja = $('avisos');
    caja.textContent = '';
    r.avisos.forEach(function (aviso) {
      const partes = textoAviso(aviso, r);
      if (!partes) return;
      const nodo = el('div', { clase: 'aviso' });
      nodo.innerHTML = partes[2]; // icono fijo, sin datos del usuario
      nodo.appendChild(el('p', { style: 'margin:0' }, [el('strong', { texto: partes[0] }), document.createTextNode(partes[1])]));
      caja.appendChild(nodo);
    });

    const marginal = $('dato-marginal');
    const esSocio = r.tipo === 'socio';
    if (!(r.costeAnual > 0)) marginal.textContent = '';
    else if (esSocio) {
      const cambiaTramo = C.cotizacionReta(r.costeAnual + 100, r.opciones).tramo !== r.reta.tramo;
      marginal.textContent = r.netoPorCada100 >= 0
        ? 'Si la sociedad paga 100 € más al año, al socio le llegan ' + dinero(r.netoPorCada100) + ' más.'
        : 'Si la sociedad pagara 100 € más al año, ' +
          (cambiaTramo ? 'pasaría al siguiente tramo del RETA, con una cuota mínima más alta,' : 'se pasaría de ' + importeRedondo(UMBRAL_DECLARAR)) +
          ' y al socio le llegarían ' + dinero(-r.netoPorCada100) + ' menos.';
    } else if (r.netoPorCada100 >= 0) {
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
    if (e.tipo === 'socio') q.set('tipo', 'socio');
    q.set('modo', e.modo);
    q.set('importe', e.textoImporte);
    q.set('periodo', e.periodo);
    q.set('pagas', String(e.pagas));
    if (e.hijos > 0) {
      q.set('hijos', String(e.hijos));
      if (e.menores6 > 0) q.set('menores6', String(e.menores6));
      if (!e.deduccionCompartida) q.set('compartida', 'no');
    }
    if (e.tipo === 'socio') {
      if (!e.cuotaPagaSociedad) q.set('pagacuota', 'socio');
      if (e.textoBaseReta) q.set('base', e.textoBaseReta);
    } else {
      if (e.contrato === 'temporal') q.set('contrato', 'temporal');
      if (campoAtEp.value.trim() !== ATEP_POR_DEFECTO) q.set('atep', campoAtEp.value.trim());
    }
    try { history.replaceState(null, '', location.pathname + '?' + q.toString()); } catch { /* file:// */ }
  }

  function leerUrl() {
    const q = new URLSearchParams(location.search);
    const marcar = function (nombre, valor) {
      const radio = formulario.querySelector('input[name="' + nombre + '"][value="' + CSS.escape(valor || '') + '"]');
      if (radio) radio.checked = true;
    };
    marcar('tipo', q.get('tipo'));
    marcar('modo', q.get('modo'));
    marcar('periodo', q.get('periodo'));
    marcar('pagas', q.get('pagas'));
    marcar('pagaCuota', q.get('pagacuota'));
    if (q.has('importe')) campoImporte.value = q.get('importe');
    if (q.has('base')) campoBaseReta.value = q.get('base');
    if (/^[0-6]$/.test(q.get('hijos') || '')) selectHijos.value = q.get('hijos');
    actualizarOpcionesHijos();
    if (/^[0-6]$/.test(q.get('menores6') || '')) selectMenores6.value = String(Math.min(Number(q.get('menores6')), Number(selectHijos.value)));
    if (q.get('compartida') === 'no') $('compartida').checked = false;
    if (q.get('contrato') === 'temporal') $('contrato').value = 'temporal';
    if (q.has('atep')) campoAtEp.value = q.get('atep');
    if (q.has('contrato') || q.has('atep')) $('opciones-asalariado').open = true;
  }

  // === Bucle principal ===

  let temporizadorResumen = null;
  let temporizadorUrl = null;

  function calcular() {
    const e = leerEntrada();
    const esSocio = e.tipo === 'socio';
    actualizarTipo(esSocio);
    $('etiqueta-importe').textContent = ETIQUETAS_IMPORTE[esSocio ? 'socio' : 'asalariado'][e.modo][e.periodo];

    const valido = Number.isFinite(e.importe) && e.importe >= 0;
    const ayuda = $('ayuda-importe');
    ayuda.className = valido ? 'ayuda' : 'error';
    ayuda.textContent = valido ? ayudaImporte(e) : 'Escribe un importe válido, por ejemplo 30.000 o 2.150,50.';
    campoImporte.setAttribute('aria-invalid', String(!valido));

    const baseValida = e.baseReta === null || (Number.isFinite(e.baseReta) && e.baseReta > 0);
    const ayudaBase = $('ayuda-base-reta');
    ayudaBase.className = baseValida ? 'ayuda' : 'error';
    campoBaseReta.setAttribute('aria-invalid', String(!baseValida));

    const r = C.calcular(Object.assign({}, e, {
      importe: valido ? e.importe : 0,
      baseReta: baseValida ? e.baseReta : null
    }));
    if (esSocio) ayudaBase.textContent = textoBaseReta(e, r, baseValida);

    pintarResumen(r);
    pintarAvisos(r);
    pintarCascada(r);
    pintarNomina(r);
    pintarDesglose(r);

    clearTimeout(temporizadorUrl);
    temporizadorUrl = setTimeout(function () { escribirUrl(e); }, 300);

    clearTimeout(temporizadorResumen);
    temporizadorResumen = setTimeout(function () {
      const t = textos(esSocio);
      $('resumen').textContent = r.costeAnual > 0
        ? t.cuesta + ' ' + euroRedondo(r.costeAnual) + ' al año. ' + t.bruto + ' ' + euroRedondo(r.brutoAnual) +
          '. ' + t.llega + ' ' + euroRedondo(r.netoAnual) + ', el ' + porcentaje.format(r.netoAnual / r.costeAnual) + ' del coste.'
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
