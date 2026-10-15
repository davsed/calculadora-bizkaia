/* Interfaz de la calculadora de dividendos: lee el formulario, llama a calculadora.js y pinta el resultado. */
(function () {
  'use strict';

  const C = window.CalculadoraBizkaia;
  const P = C.PARAMETROS;
  const I = window.InterfazBizkaia;
  const { porcentaje, dinero, euroRedondo, importeRedondo, el } = I;
  const $ = (id) => document.getElementById(id);

  const formulario = $('formulario');
  const campoImporte = $('importe');
  // "19 %", "25,5 %"
  const tipoTramo = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 });

  const ETIQUETAS = { bruto: 'Su dividendo bruto del año', neto: 'Lo que quiere que le quede en el año' };
  const AYUDAS = {
    bruto: 'Lo que le toca del reparto, antes de la retención. Si hay varios repartos en el año, súmalos.',
    neto: 'Ya hecha la declaración de la renta.'
  };

  function valorRadio(nombre) {
    const marcado = formulario.querySelector('input[name="' + nombre + '"]:checked');
    return marcado ? marcado.value : null;
  }

  function leerEntrada() {
    const texto = campoImporte.value.trim();
    return { modo: valorRadio('modo'), textoImporte: texto, importe: texto === '' ? 0 : C.parseImporte(texto) };
  }

  // Lo que sale en la renta, en palabras: "a devolver unos 275 €".
  function textoRenta(resultado) {
    if (resultado > 0.5) return 'a pagar unos ' + euroRedondo(resultado);
    if (resultado < -0.5) return 'a devolver unos ' + euroRedondo(-resultado);
    return 'a cero';
  }

  // === Resumen: dividendo → lo que cobra → lo que le queda ===

  function pintarResumen(r) {
    const ir = r.irpf;
    const hayDatos = r.brutoAnual > 0;
    const parte = hayDatos ? r.netoAnual / r.brutoAnual : 0;
    $('cifra-bruto').textContent = euroRedondo(r.brutoAnual);
    $('detalle-bruto').textContent = 'en el año, antes de la retención';
    $('cifra-cobrado').textContent = euroRedondo(r.cobrado);
    $('detalle-cobrado').textContent = 'le retienen el ' + tipoTramo.format(P.irpf.retencionDividendos) + ': ' + euroRedondo(ir.retencion);
    $('cifra-neto').textContent = euroRedondo(r.netoAnual);
    $('detalle-neto').textContent = 'tras la renta, que sale ' + textoRenta(ir.resultadoDeclaracion);

    $('porcentaje-neto').textContent = hayDatos ? porcentaje.format(parte) : '—';
    $('medidor-neto').style.width = Math.max(0, Math.min(1, parte)) * 100 + '%';
    $('medidor').setAttribute('aria-label', hayDatos
      ? porcentaje.format(parte) + ' para el socio y ' + porcentaje.format(1 - parte) + ' de IRPF'
      : 'Sin datos');
    $('leyenda-neto').textContent = 'Para el socio: ' + euroRedondo(r.netoAnual) + (hayDatos ? ' (' + porcentaje.format(parte) + ')' : '');
    $('leyenda-resto').textContent = 'IRPF: ' + euroRedondo(ir.cuota) + (hayDatos ? ' (' + porcentaje.format(1 - parte) + ')' : '');
  }

  // === Resultado al momento, debajo del importe (en una columna) ===

  function pintarResultadoRapido(e, r, valido) {
    const boton = $('resultado-rapido');
    boton.hidden = !(valido && r.brutoAnual > 0);
    if (boton.hidden) return;
    const desdeNeto = e.modo === 'neto';
    $('rapido-etiqueta').textContent = desdeNeto ? 'Hay que repartirle' : 'Le queda';
    $('rapido-valor').textContent = euroRedondo(desdeNeto ? r.brutoAnual : r.netoAnual);
    $('rapido-detalle').textContent = (desdeNeto ? 'brutos' : 'tras la renta') + ' · cobra ' + euroRedondo(r.cobrado) + ' al repartir';
  }

  // === Avisos ===

  const ICONO_AVISO = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 15 14H1z" fill="#fab219"/><path d="M8 6v4M8 12v.1" stroke="#0b0b0b" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function pintarAvisos(r) {
    const caja = $('avisos');
    caja.textContent = '';
    if (!(r.brutoAnual > 0)) return;
    const nodo = el('div', { clase: 'aviso' });
    nodo.innerHTML = ICONO_AVISO; // icono fijo, sin datos del usuario
    nodo.appendChild(el('p', { style: 'margin:0' }, [
      el('strong', { texto: 'Cuota de autónomo: ' }),
      document.createTextNode('con el 33 % del capital, o el 25 % siendo administrador, suma unos ' +
        euroRedondo(r.brutoAnual / 12) + ' al mes a sus rendimientos del RETA y la cuota puede subir al regularizar.')
    ]));
    caja.appendChild(nodo);
  }

  // === El IRPF del dividendo ===

  function redondeoCentimos(x) {
    return Math.round(x * 100) / 100;
  }

  // "Hasta 7.500 € al 19 %", "De 7.500 € a 8.500 € al 20 %": la parte de su base en cada tramo.
  function nombreTramo(t) {
    const hasta = importeRedondo(redondeoCentimos(t.desde + t.base));
    return (t.desde === 0 ? 'Hasta ' + hasta : 'De ' + importeRedondo(t.desde) + ' a ' + hasta) + ' al ' + tipoTramo.format(t.tipo);
  }

  function pintarIrpf(r) {
    const ir = r.irpf;
    const filas = [];
    const fila = function (nombre, valor, clase) { filas.push({ nombre: nombre, valor: valor, clase: clase || '' }); };
    fila('Dividendo bruto', r.brutoAnual, 'total');
    fila('Exento (hasta ' + importeRedondo(P.irpf.exencionDividendos) + ' al año)', -ir.exento);
    fila('Base del ahorro', ir.baseAhorro);
    ir.tramos.forEach(function (t) { fila(nombreTramo(t), t.cuota, 'detalle'); });
    fila('IRPF del año', ir.cuota, 'total');
    fila('Retenido al cobrar (' + tipoTramo.format(P.irpf.retencionDividendos) + ')', ir.retencion);
    fila(ir.resultadoDeclaracion >= 0 ? 'A pagar en la declaración' : 'A devolver en la declaración', Math.abs(ir.resultadoDeclaracion));
    fila('Le queda', r.netoAnual, 'total');

    const cuerpo = $('tabla-irpf').tBodies[0];
    cuerpo.textContent = '';
    filas.forEach(function (f) {
      cuerpo.appendChild(el('tr', { clase: f.clase }, [
        el('th', { scope: 'row', texto: f.nombre }),
        el('td', { clase: 'num', texto: dinero(f.valor) })
      ]));
    });

    $('nota-declaracion').textContent = textoDeclaracion(r);
  }

  function textoDeclaracion(r) {
    const ir = r.irpf;
    if (!(r.brutoAnual > 0)) return '';
    if (!ir.obligadoADeclarar) {
      return 'Con hasta ' + importeRedondo(P.irpf.umbralCapitalSinDeclarar) + ' de dividendos y un sueldo de hasta ' +
        importeRedondo(P.irpf.umbralObligacionDeclarar) + ' no hay obligación de declarar, pero compensa: devuelven unos ' + euroRedondo(-ir.resultadoDeclaracion) + '.';
    }
    const obligado = 'Con más de ' + importeRedondo(P.irpf.umbralCapitalSinDeclarar) + ' de dividendos hay que hacer la declaración. ';
    if (ir.resultadoDeclaracion > 0.5) return obligado + 'Lo retenido no llega al IRPF del año: salen a pagar unos ' + euroRedondo(ir.resultadoDeclaracion) + '.';
    if (ir.resultadoDeclaracion < -0.5) return obligado + 'Se retuvo de más: salen a devolver unos ' + euroRedondo(-ir.resultadoDeclaracion) + '.';
    return obligado + 'Lo retenido cubre casi justo el IRPF del año.';
  }

  function pintarMarginal(r) {
    $('dato-marginal').textContent = r.brutoAnual > 0
      ? 'Si la sociedad le reparte 100 € más, le quedan ' + dinero(r.netoPorCada100) + ' más.'
      : '';
  }

  // === Enlace compartible ===

  function escribirUrl(e) {
    const q = new URLSearchParams();
    q.set('modo', e.modo);
    q.set('importe', e.textoImporte);
    I.escribirUrl(q);
  }

  function leerUrl() {
    const q = new URLSearchParams(location.search);
    const radio = formulario.querySelector('input[name="modo"][value="' + CSS.escape(q.get('modo') || '') + '"]');
    if (radio) radio.checked = true;
    if (q.has('importe')) campoImporte.value = I.cifraDeUrl(q.get('importe'));
  }

  // === Bucle principal ===

  let temporizadorResumen = null;
  let temporizadorUrl = null;

  function calcular() {
    const e = leerEntrada();
    $('etiqueta-importe').textContent = ETIQUETAS[e.modo];
    const valido = Number.isFinite(e.importe) && e.importe >= 0;
    const ayuda = $('ayuda-importe');
    ayuda.className = valido ? 'ayuda' : 'error';
    ayuda.textContent = valido ? AYUDAS[e.modo] : 'Escribe un importe válido, por ejemplo 10.000 o 2.150,50.';
    campoImporte.setAttribute('aria-invalid', String(!valido));

    const r = C.calcularDividendos({ modo: e.modo, importe: valido ? e.importe : 0 });
    pintarResultadoRapido(e, r, valido);
    pintarResumen(r);
    pintarAvisos(r);
    pintarIrpf(r);
    pintarMarginal(r);

    clearTimeout(temporizadorUrl);
    temporizadorUrl = setTimeout(function () { escribirUrl(e); }, 300);

    clearTimeout(temporizadorResumen);
    temporizadorResumen = setTimeout(function () {
      $('resumen').textContent = r.brutoAnual > 0
        ? 'Le reparte ' + euroRedondo(r.brutoAnual) + '. Cobra ' + euroRedondo(r.cobrado) + '. Le queda ' + euroRedondo(r.netoAnual) +
          ', el ' + porcentaje.format(r.netoAnual / r.brutoAnual) + ' del dividendo.'
        : '';
    }, 700);
  }

  I.prepararCampoImporte(campoImporte, { seleccionarAlTocar: true });
  I.prepararFormulario(formulario);
  formulario.addEventListener('input', calcular);
  formulario.addEventListener('change', calcular);
  $('resultado-rapido').addEventListener('click', function () { I.irA(document.querySelector('.resultados')); });
  I.prepararPlegables();
  I.prepararCompartir($('compartir'));

  leerUrl();
  calcular();
})();
