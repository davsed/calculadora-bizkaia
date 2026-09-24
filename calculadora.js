/*
 * Calculadora de sueldo neto, bruto y coste de empresa en Bizkaia (2026), para
 * personas asalariadas y para socios de su propia sociedad dados de alta en el RETA.
 *
 * Lógica de cálculo pura, sin DOM: la usa index.html en el navegador y los
 * tests con Node (`node --test`). Todos los importes son anuales salvo que el
 * nombre diga lo contrario.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CalculadoraBizkaia = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // === Parámetros 2026 ===
  // Seguridad Social: Orden PJC/297/2026 (régimen general).
  // IRPF: Norma Foral 13/2013 de Bizkaia, con la bonificación del trabajo de la
  // NF 2/2025 y la deflactación del 2 % de la NF 7/2025 (Presupuestos 2026).
  // Retenciones: art. 88 del Reglamento del IRPF (DF 47/2014), según el DF 134/2025.
  // RETA: arts. 18 y 37 de la Orden PJC/297/2026 y art. 308 de la Ley General de la
  // Seguridad Social.
  const PARAMETROS = {
    anio: 2026,
    seguridadSocial: {
      baseMaximaMensual: 5101.20,
      empresa: {
        contingenciasComunes: 0.2360,
        desempleo: { indefinido: 0.0550, temporal: 0.0670 },
        fogasa: 0.0020,
        formacion: 0.0060,
        mei: 0.0075
      },
      trabajador: {
        contingenciasComunes: 0.0470,
        desempleo: { indefinido: 0.0155, temporal: 0.0160 },
        formacion: 0.0010,
        mei: 0.0015
      },
      // Accidentes de trabajo y enfermedades profesionales: depende de la actividad.
      // 1,00 % es el de trabajo exclusivo de oficina (tarifa de primas, cuadro II).
      atEpPorDefecto: 0.0100,
      // Cotización adicional de solidaridad sobre la parte del salario que supera
      // la base máxima. `hasta` es el final de cada tramo en fracción de la base máxima.
      solidaridad: [
        { hasta: 0.10, empresa: 0.0096, trabajador: 0.0019 },
        { hasta: 0.50, empresa: 0.0104, trabajador: 0.0021 },
        { hasta: Infinity, empresa: 0.0122, trabajador: 0.0024 }
      ]
    },
    // SMI 2026: 1.221 € x 14 pagas.
    smiAnual: 17094,
    irpf: {
      // Tarifa general (art. 75, en la redacción de la NF 7/2025).
      escala: [
        { hasta: 18080, tipo: 0.23 },
        { hasta: 36160, tipo: 0.28 },
        { hasta: 54240, tipo: 0.35 },
        { hasta: 77450, tipo: 0.40 },
        { hasta: 107260, tipo: 0.45 },
        { hasta: 142960, tipo: 0.46 },
        { hasta: 208390, tipo: 0.47 },
        { hasta: Infinity, tipo: 0.49 }
      ],
      // Bonificación de los rendimientos del trabajo (art. 23).
      bonificacionTrabajo: { maxima: 8000, minima: 3000, desde: 14800, hasta: 23000, pendiente: 0.6098 },
      // Minoración general de cuota (art. 77).
      minoracionCuota: 1615,
      // Deducción por descendientes (art. 79): 1.º, 2.º, 3.º, 4.º, 5.º y siguientes.
      deduccionDescendientes: [682, 844, 1421, 1680, 2195],
      deduccionMenor6: 394,
      // Con solo rendimientos del trabajo (un pagador) hasta este bruto anual no hay
      // obligación de declarar: se paga lo retenido en nómina.
      umbralObligacionDeclarar: 20000,
      // Tabla general de retenciones sobre el bruto anual. Cada fila: [hasta, % según el
      // número de descendientes: 0, 1, 2, 3, 4, 5 y más de 5].
      tablaRetenciones: [
        [20000, [0, 0, 0, 0, 0, 0, 0]],
        [20510, [7, 5, 3, 0, 0, 0, 0]],
        [21300, [8, 6, 4, 1, 0, 0, 0]],
        [22150, [9, 7, 5, 2, 0, 0, 0]],
        [23220, [10, 9, 7, 4, 0, 0, 0]],
        [24050, [11, 10, 8, 5, 1, 0, 0]],
        [25410, [12, 11, 9, 6, 3, 0, 0]],
        [27440, [13, 12, 10, 7, 4, 0, 0]],
        [29790, [14, 13, 11, 9, 6, 2, 0]],
        [32610, [15, 14, 13, 10, 8, 4, 0]],
        [36350, [16, 15, 14, 12, 9, 6, 0]],
        [40670, [17, 16, 15, 13, 11, 8, 0]],
        [44560, [18, 17, 16, 15, 13, 10, 2]],
        [48060, [19, 18, 17, 16, 14, 12, 4]],
        [52020, [20, 19, 18, 17, 15, 13, 7]],
        [56780, [21, 20, 20, 18, 17, 15, 9]],
        [61820, [22, 21, 21, 20, 18, 16, 11]],
        [65710, [23, 22, 22, 21, 19, 18, 12]],
        [70080, [24, 23, 23, 22, 21, 19, 14]],
        [75020, [25, 25, 24, 23, 22, 20, 16]],
        [80730, [26, 26, 25, 24, 23, 22, 17]],
        [86770, [27, 27, 26, 25, 24, 23, 19]],
        [92190, [28, 28, 27, 26, 25, 24, 21]],
        [98350, [29, 29, 28, 27, 27, 25, 22]],
        [105380, [30, 30, 29, 29, 28, 27, 23]],
        [113180, [31, 31, 30, 30, 29, 28, 25]],
        [122030, [32, 32, 31, 31, 30, 29, 26]],
        [132200, [33, 33, 32, 32, 31, 30, 28]],
        [144140, [34, 34, 33, 33, 32, 32, 29]],
        [157300, [35, 35, 34, 34, 33, 33, 31]],
        [172280, [36, 36, 36, 35, 35, 34, 32]],
        [190410, [37, 37, 37, 36, 36, 35, 33]],
        [212820, [38, 38, 38, 37, 37, 36, 35]],
        [236060, [39, 39, 39, 38, 38, 37, 36]],
        [Infinity, [40, 40, 40, 39, 39, 39, 37]]
      ],
      // Mínimo de retención en contratos de duración inferior al año.
      retencionMinimaContratoCorto: 0.02
    },
    reta: {
      tipos: {
        contingenciasComunes: 0.2830,
        contingenciasProfesionales: 0.0130,
        ceseActividad: 0.0090,
        formacion: 0.0010,
        mei: 0.0090
      },
      // Tramos de rendimientos netos mensuales (tabla reducida y tabla general) con su
      // base mínima y máxima. La tabla reducida llega hasta 1.166,69 € (es "< 1.166,70").
      tramos: [
        { hasta: 670, min: 653.59, max: 718.94, nombre: 'Tabla reducida, tramo 1' },
        { hasta: 900, min: 718.95, max: 900, nombre: 'Tabla reducida, tramo 2' },
        { hasta: 1166.69, min: 849.67, max: 1166.70, nombre: 'Tabla reducida, tramo 3' },
        { hasta: 1300, min: 950.98, max: 1300, nombre: 'Tramo 1' },
        { hasta: 1500, min: 960.78, max: 1500, nombre: 'Tramo 2' },
        { hasta: 1700, min: 960.78, max: 1700, nombre: 'Tramo 3' },
        { hasta: 1850, min: 1143.79, max: 1850, nombre: 'Tramo 4' },
        { hasta: 2030, min: 1209.15, max: 2030, nombre: 'Tramo 5' },
        { hasta: 2330, min: 1274.51, max: 2330, nombre: 'Tramo 6' },
        { hasta: 2760, min: 1356.21, max: 2760, nombre: 'Tramo 7' },
        { hasta: 3190, min: 1437.91, max: 3190, nombre: 'Tramo 8' },
        { hasta: 3620, min: 1519.61, max: 3620, nombre: 'Tramo 9' },
        { hasta: 4050, min: 1601.31, max: 4050, nombre: 'Tramo 10' },
        { hasta: 6000, min: 1732.03, max: 5101.20, nombre: 'Tramo 11' },
        { hasta: Infinity, min: 1928.10, max: 5101.20, nombre: 'Tramo 12' }
      ],
      // Socios con control de su sociedad (art. 305.2.b LGSS): no pueden cotizar por menos
      // de la base mínima del grupo 7 del Régimen General y sus rendimientos se calculan con
      // una deducción por gastos genéricos del 3 % (art. 308.1).
      baseMinimaSocietario: 1424.40,
      gastosGenericosSocietario: 0.03
    }
  };

  const OPCIONES_POR_DEFECTO = {
    pagas: 14,
    contrato: 'indefinido',
    atEp: PARAMETROS.seguridadSocial.atEpPorDefecto,
    hijos: 0,
    menores6: 0,
    deduccionCompartida: true,
    // Solo para socios en el RETA.
    cuotaPagaSociedad: true,
    baseReta: null
  };

  function normalizarOpciones(opciones) {
    const o = Object.assign({}, OPCIONES_POR_DEFECTO, opciones);
    o.pagas = o.pagas === 12 ? 12 : 14;
    o.contrato = o.contrato === 'temporal' ? 'temporal' : 'indefinido';
    if (!Number.isFinite(o.atEp) || o.atEp < 0) o.atEp = OPCIONES_POR_DEFECTO.atEp;
    o.hijos = Math.max(0, Math.floor(o.hijos) || 0);
    o.menores6 = Math.min(o.hijos, Math.max(0, Math.floor(o.menores6) || 0));
    o.deduccionCompartida = o.deduccionCompartida !== false;
    o.cuotaPagaSociedad = o.cuotaPagaSociedad !== false;
    o.baseReta = Number.isFinite(o.baseReta) && o.baseReta > 0 ? o.baseReta : null;
    return o;
  }

  function suma(partidas) {
    return Object.keys(partidas).reduce(function (total, clave) { return total + partidas[clave]; }, 0);
  }

  function cotizaciones(brutoAnual, opciones) {
    const ss = PARAMETROS.seguridadSocial;
    const o = normalizarOpciones(opciones);

    // Las pagas extra se prorratean: la base mensual es 1/12 del bruto anual,
    // con tope en la base máxima.
    const salarioMensual = brutoAnual / 12;
    const base = Math.min(salarioMensual, ss.baseMaximaMensual) * 12;

    const exceso = Math.max(0, salarioMensual - ss.baseMaximaMensual);
    let solidaridadEmpresa = 0;
    let solidaridadTrabajador = 0;
    let desde = 0;
    for (const tramo of ss.solidaridad) {
      const tope = tramo.hasta * ss.baseMaximaMensual;
      const parte = Math.max(0, Math.min(exceso, tope) - desde) * 12;
      solidaridadEmpresa += parte * tramo.empresa;
      solidaridadTrabajador += parte * tramo.trabajador;
      desde = tope;
    }

    const e = ss.empresa;
    const t = ss.trabajador;
    const empresa = {
      contingenciasComunes: base * e.contingenciasComunes,
      desempleo: base * e.desempleo[o.contrato],
      fogasa: base * e.fogasa,
      formacion: base * e.formacion,
      mei: base * e.mei,
      atEp: base * o.atEp,
      solidaridad: solidaridadEmpresa
    };
    const trabajador = {
      contingenciasComunes: base * t.contingenciasComunes,
      desempleo: base * t.desempleo[o.contrato],
      formacion: base * t.formacion,
      mei: base * t.mei,
      solidaridad: solidaridadTrabajador
    };
    return {
      base: base,
      empresa: empresa,
      trabajador: trabajador,
      totalEmpresa: suma(empresa),
      totalTrabajador: suma(trabajador)
    };
  }

  function bonificacionTrabajo(rendimientoNeto) {
    const b = PARAMETROS.irpf.bonificacionTrabajo;
    let importe;
    if (rendimientoNeto <= b.desde) importe = b.maxima;
    else if (rendimientoNeto <= b.hasta) importe = b.maxima - b.pendiente * (rendimientoNeto - b.desde);
    else importe = b.minima;
    // La bonificación no puede dejar el rendimiento neto en negativo.
    return Math.max(0, Math.min(importe, rendimientoNeto));
  }

  function cuotaTarifa(baseLiquidable) {
    let cuota = 0;
    let desde = 0;
    for (const tramo of PARAMETROS.irpf.escala) {
      if (baseLiquidable <= desde) break;
      cuota += (Math.min(baseLiquidable, tramo.hasta) - desde) * tramo.tipo;
      desde = tramo.hasta;
    }
    return cuota;
  }

  function deduccionHijos(opciones) {
    const o = normalizarOpciones(opciones);
    const tabla = PARAMETROS.irpf.deduccionDescendientes;
    let total = 0;
    for (let i = 0; i < o.hijos; i++) total += tabla[Math.min(i, tabla.length - 1)];
    total += o.menores6 * PARAMETROS.irpf.deduccionMenor6;
    // Si otro contribuyente (el otro progenitor) también tiene derecho, se reparte a partes iguales.
    return o.deduccionCompartida ? total / 2 : total;
  }

  function tipoRetencion(brutoAnual, opciones) {
    const o = normalizarOpciones(opciones);
    const p = PARAMETROS.irpf;
    const bruto = Math.round(brutoAnual * 100) / 100;
    const fila = p.tablaRetenciones.find(function (f) { return bruto <= f[0]; });
    const tipo = fila[1][Math.min(o.hijos, 6)] / 100;
    // Tratamos el contrato temporal como de menos de un año.
    return o.contrato === 'temporal' ? Math.max(tipo, p.retencionMinimaContratoCorto) : tipo;
  }

  function irpf(brutoAnual, cotizacionTrabajador, opciones) {
    const p = PARAMETROS.irpf;
    const rendimientoNeto = Math.max(0, brutoAnual - cotizacionTrabajador);
    const bonificacion = bonificacionTrabajo(rendimientoNeto);
    const baseLiquidable = rendimientoNeto - bonificacion;
    const cuotaIntegra = cuotaTarifa(baseLiquidable);
    const minoracion = Math.min(p.minoracionCuota, cuotaIntegra);
    const deduccionDescendientes = Math.min(deduccionHijos(opciones), cuotaIntegra - minoracion);
    const cuotaLiquida = cuotaIntegra - minoracion - deduccionDescendientes;

    const tipo = tipoRetencion(brutoAnual, opciones);
    const retencion = brutoAnual * tipo;
    const obligadoADeclarar = Math.round(brutoAnual * 100) / 100 > p.umbralObligacionDeclarar;
    // Sin obligación de declarar, solo compensa hacerlo si sale a devolver.
    const aPagar = obligadoADeclarar ? cuotaLiquida : Math.min(cuotaLiquida, retencion);
    return {
      rendimientoNeto: rendimientoNeto,
      bonificacion: bonificacion,
      baseLiquidable: baseLiquidable,
      cuotaIntegra: cuotaIntegra,
      minoracion: minoracion,
      deduccionDescendientes: deduccionDescendientes,
      cuotaLiquida: cuotaLiquida,
      tipoRetencion: tipo,
      retencion: retencion,
      obligadoADeclarar: obligadoADeclarar,
      // IRPF del año, contando la declaración de la renta.
      aPagar: aPagar,
      // Positivo: a pagar en la declaración. Negativo: a devolver.
      resultadoDeclaracion: aPagar - retencion
    };
  }

  function netoAnual(brutoAnual, opciones) {
    const ss = cotizaciones(brutoAnual, opciones);
    return brutoAnual - ss.totalTrabajador - irpf(brutoAnual, ss.totalTrabajador, opciones).aPagar;
  }

  // Neto de una nómina normal (sin paga extra), con la retención de la tabla.
  function netoMensual(brutoAnual, opciones) {
    const o = normalizarOpciones(opciones);
    const ss = cotizaciones(brutoAnual, o);
    const retencion = brutoAnual * tipoRetencion(brutoAnual, o);
    return (brutoAnual - retencion) / o.pagas - ss.totalTrabajador / 12;
  }

  function calcularDesdeBruto(brutoAnual, opciones) {
    const o = normalizarOpciones(opciones);
    const ss = cotizaciones(brutoAnual, o);
    const renta = irpf(brutoAnual, ss.totalTrabajador, o);
    const neto = brutoAnual - ss.totalTrabajador - renta.aPagar;

    // En una nómina normal se descuenta 1/12 de la cotización anual (las pagas extra
    // ya están prorrateadas en la base) y el tipo de retención se aplica a cada paga.
    const nomina = {
      bruto: brutoAnual / o.pagas,
      cotizacion: ss.totalTrabajador / 12,
      irpf: renta.retencion / o.pagas
    };
    nomina.neto = nomina.bruto - nomina.cotizacion - nomina.irpf;
    const pagaExtra = o.pagas === 14 ? {
      bruto: brutoAnual / 14,
      cotizacion: 0,
      irpf: renta.retencion / 14,
      neto: (brutoAnual - renta.retencion) / 14
    } : null;

    const avisos = [];
    if (brutoAnual > 0 && brutoAnual < PARAMETROS.smiAnual) avisos.push({ codigo: 'bajo-smi' });
    if (renta.obligadoADeclarar) {
      const netoEnUmbral = netoAnual(PARAMETROS.irpf.umbralObligacionDeclarar, o);
      if (neto < netoEnUmbral) avisos.push({ codigo: 'escalon-20000', perdida: netoEnUmbral - neto });
    }
    if (ss.trabajador.solidaridad > 0) avisos.push({ codigo: 'solidaridad' });

    return {
      opciones: o,
      brutoAnual: brutoAnual,
      netoAnual: neto,
      costeAnual: brutoAnual + ss.totalEmpresa,
      cotizaciones: ss,
      irpf: renta,
      tipoEfectivoIrpf: brutoAnual > 0 ? renta.aPagar / brutoAnual : 0,
      // Cuánto neto y cuánto coste anual añaden 100 € más de bruto anual.
      netoPorCada100: netoAnual(brutoAnual + 100, o) - neto,
      costePorCada100: 100 + cotizaciones(brutoAnual + 100, o).totalEmpresa - ss.totalEmpresa,
      nomina: nomina,
      pagaExtra: pagaExtra,
      avisos: avisos
    };
  }

  // === Socio de su propia sociedad, dado de alta en el RETA ===
  // Todo se calcula a partir de lo que paga la sociedad por su trabajo en el año: la
  // nómina más, si la paga ella, la cuota de autónomo.

  function tramoReta(rendimientoMensual) {
    const r = Math.round(rendimientoMensual * 100) / 100;
    return PARAMETROS.reta.tramos.find(function (t) { return r <= t.hasta; });
  }

  function cotizacionReta(costeAnual, opciones) {
    const p = PARAMETROS.reta;
    const o = normalizarOpciones(opciones);
    // Para la Seguridad Social cuenta todo lo que cobra de la sociedad por su trabajo (también
    // la cuota, si se la paga ella) menos un 3 % de gastos genéricos.
    const rendimientoMensual = Math.max(0, costeAnual) * (1 - p.gastosGenericosSocietario) / 12;
    const tramo = tramoReta(rendimientoMensual);
    const baseMinima = Math.max(tramo.min, p.baseMinimaSocietario);
    const baseMaxima = Math.max(tramo.max, p.baseMinimaSocietario);
    const base = o.baseReta === null ? baseMinima : Math.min(Math.max(o.baseReta, baseMinima), baseMaxima);
    // Sin actividad no hay alta ni cuota.
    const cotizada = costeAnual > 0 ? base : 0;
    const t = p.tipos;
    const mensual = {
      contingenciasComunes: cotizada * t.contingenciasComunes,
      contingenciasProfesionales: cotizada * t.contingenciasProfesionales,
      ceseActividad: cotizada * t.ceseActividad,
      formacion: cotizada * t.formacion,
      mei: cotizada * t.mei
    };
    const cuotaMensual = suma(mensual);
    return {
      rendimientoMensual: rendimientoMensual,
      tramo: tramo,
      baseMinima: baseMinima,
      baseMaxima: baseMaxima,
      base: cotizada,
      detalleMensual: mensual,
      cuotaMensual: cuotaMensual,
      cuotaAnual: cuotaMensual * 12
    };
  }

  // Lo que le queda al socio en el año: el IRPF trata la cuota como rendimiento en especie
  // (si la paga la sociedad) y a la vez como gasto deducible, así que no depende de quién la pague.
  function netoAnualSocio(costeAnual, opciones) {
    const cuota = cotizacionReta(costeAnual, opciones).cuotaAnual;
    return costeAnual - cuota - irpf(costeAnual, cuota, opciones).aPagar;
  }

  // La nómina de un mes normal: si la cuota la paga la sociedad, va como sueldo en especie y
  // también lleva retención; si la paga el socio, sale de lo que cobra.
  function nominaSocio(costeAnual, cuota, tipoRetencion, o) {
    const bruto = o.cuotaPagaSociedad ? costeAnual - cuota : costeAnual;
    const especieMes = o.cuotaPagaSociedad ? cuota / 12 : 0;
    const nomina = {
      bruto: bruto / o.pagas,
      especie: especieMes,
      irpf: tipoRetencion * (bruto / o.pagas + especieMes),
      cuotaSocio: o.cuotaPagaSociedad ? 0 : cuota / 12
    };
    nomina.neto = nomina.bruto - nomina.irpf;
    nomina.disponible = nomina.neto - nomina.cuotaSocio;
    return nomina;
  }

  // Lo que le queda un mes normal: la nómina menos la retención y, si la paga el socio, la cuota.
  function netoMensualSocio(costeAnual, opciones) {
    const o = normalizarOpciones(opciones);
    const cuota = cotizacionReta(costeAnual, o).cuotaAnual;
    return nominaSocio(costeAnual, cuota, irpf(costeAnual, cuota, o).tipoRetencion, o).disponible;
  }

  function calcularSocioDesdeCoste(costeAnual, opciones) {
    const o = normalizarOpciones(opciones);
    const reta = cotizacionReta(costeAnual, o);
    const cuota = reta.cuotaAnual;
    // Para el IRPF, el rendimiento íntegro es todo lo que paga la sociedad y la cuota es gasto.
    const renta = irpf(costeAnual, cuota, o);
    const bruto = o.cuotaPagaSociedad ? costeAnual - cuota : costeAnual;
    const neto = costeAnual - cuota - renta.aPagar;

    const nomina = nominaSocio(costeAnual, cuota, renta.tipoRetencion, o);
    let pagaExtra = null;
    if (o.pagas === 14) {
      pagaExtra = { bruto: bruto / 14, especie: 0, irpf: renta.tipoRetencion * bruto / 14, cuotaSocio: 0 };
      pagaExtra.neto = pagaExtra.bruto - pagaExtra.irpf;
      pagaExtra.disponible = pagaExtra.neto;
    }

    const avisos = [];
    if (costeAnual > 0 && neto < 0) avisos.push({ codigo: 'cuota-supera' });
    if (renta.obligadoADeclarar) {
      const netoEnUmbral = netoAnualSocio(PARAMETROS.irpf.umbralObligacionDeclarar, o);
      if (neto < netoEnUmbral) avisos.push({ codigo: 'escalon-20000', perdida: netoEnUmbral - neto });
    }
    // Al subir a un tramo con una base mínima más alta, la cuota sube de golpe y el neto baja.
    const tramoAnterior = PARAMETROS.reta.tramos[PARAMETROS.reta.tramos.indexOf(reta.tramo) - 1];
    if (tramoAnterior) {
      const limite = Math.floor(tramoAnterior.hasta * 12 / (1 - PARAMETROS.reta.gastosGenericosSocietario));
      const netoEnLimite = netoAnualSocio(limite, o);
      if (neto < netoEnLimite) avisos.push({ codigo: 'escalon-tramo', limite: limite, perdida: netoEnLimite - neto });
    }

    // Cómo quedaría como asalariado con el mismo coste para la empresa.
    const asalariado = costeAnual > 0
      ? calcular({ modo: 'coste', periodo: 'anual', importe: costeAnual, pagas: o.pagas, hijos: o.hijos, menores6: o.menores6, deduccionCompartida: o.deduccionCompartida })
      : null;

    return {
      tipo: 'socio',
      opciones: o,
      costeAnual: costeAnual,
      brutoAnual: bruto,
      netoAnual: neto,
      reta: reta,
      irpf: renta,
      tipoEfectivoIrpf: costeAnual > 0 ? renta.aPagar / costeAnual : 0,
      netoPorCada100: netoAnualSocio(costeAnual + 100, o) - neto,
      costePorCada100: 100,
      nomina: nomina,
      pagaExtra: pagaExtra,
      avisos: avisos,
      comparacionAsalariado: asalariado && { netoAnual: asalariado.netoAnual, brutoAnual: asalariado.brutoAnual }
    };
  }

  // Donde el neto puede bajar de golpe: los tramos de retención y, para el socio, los del RETA.
  const CORTES_RETENCION = PARAMETROS.irpf.tablaRetenciones
    .map(function (fila) { return fila[0]; })
    .filter(Number.isFinite);
  const CORTES_SOCIO = CORTES_RETENCION.concat(PARAMETROS.reta.tramos
    .map(function (t) { return t.hasta * 12 / (1 - PARAMETROS.reta.gastosGenericosSocietario); })
    .filter(Number.isFinite))
    .sort(function (a, b) { return a - b; });

  function biseccion(f, objetivo, bajo, alto) {
    for (let i = 0; i < 200 && alto - bajo > 1e-7; i++) {
      const medio = (bajo + alto) / 2;
      if (f(medio) < objetivo) bajo = medio;
      else alto = medio;
    }
    return alto;
  }

  // Busca el importe más bajo con el que `f` alcanza `objetivo`. `f` crece entre dos
  // `cortes` consecutivos, pero puede bajar de golpe al pasar uno.
  function invertir(f, objetivo, cortes) {
    if (!(objetivo > 0)) return 0;
    let bajo = 0;
    for (const corte of cortes) {
      if (f(corte) >= objetivo) return biseccion(f, objetivo, bajo, corte);
      bajo = corte;
    }
    let alto = Math.max(bajo * 2, objetivo * 2);
    while (f(alto) < objetivo) alto *= 2;
    return biseccion(f, objetivo, bajo, alto);
  }

  /**
   * Calcula todo a partir del importe conocido.
   * entrada: { modo: 'bruto' | 'neto' | 'coste', periodo: 'anual' | 'mensual', importe,
   *            pagas, contrato, atEp, hijos, menores6, deduccionCompartida }
   * El neto mensual es el de la nómina de un mes normal (sin paga extra), con la retención
   * de la tabla; el neto anual es el del año contando la declaración de la renta. El bruto
   * mensual es el de cada paga y el coste mensual es siempre 1/12 del anual.
   */
  function calcular(entrada) {
    if (entrada.tipo === 'socio') return calcularSocio(entrada);
    const o = normalizarOpciones(entrada);
    const importe = Math.max(0, Number(entrada.importe) || 0);
    const mensual = entrada.periodo === 'mensual';
    let bruto;

    if (entrada.modo === 'neto') {
      const f = mensual
        ? function (b) { return netoMensual(b, o); }
        : function (b) { return netoAnual(b, o); };
      bruto = invertir(f, importe, CORTES_RETENCION);
    } else if (entrada.modo === 'coste') {
      const coste = mensual ? importe * 12 : importe;
      bruto = invertir(function (b) { return b + cotizaciones(b, o).totalEmpresa; }, coste, CORTES_RETENCION);
    } else {
      bruto = mensual ? importe * o.pagas : importe;
    }

    return calcularDesdeBruto(bruto, o);
  }

  /**
   * Igual que `calcular`, para un socio en el RETA. El coste es lo que paga la sociedad por
   * su trabajo; el bruto, el sueldo de la nómina (sin la cuota, aunque la pague la sociedad).
   */
  function calcularSocio(entrada) {
    const o = normalizarOpciones(entrada);
    const importe = Math.max(0, Number(entrada.importe) || 0);
    const mensual = entrada.periodo === 'mensual';
    let coste;

    if (entrada.modo === 'neto') {
      const f = mensual
        ? function (c) { return netoMensualSocio(c, o); }
        : function (c) { return netoAnualSocio(c, o); };
      coste = invertir(f, importe, CORTES_SOCIO);
    } else if (entrada.modo === 'bruto') {
      const bruto = mensual ? importe * o.pagas : importe;
      coste = o.cuotaPagaSociedad
        ? invertir(function (c) { return c - cotizacionReta(c, o).cuotaAnual; }, bruto, CORTES_SOCIO)
        : bruto;
    } else {
      coste = mensual ? importe * 12 : importe;
    }

    return calcularSocioDesdeCoste(coste, o);
  }

  /**
   * Convierte lo que escribe el usuario en un número. Acepta formato español
   * ("30.000", "1.500,50"), inglés ("30,000.50") y sin separadores ("30000").
   * Devuelve NaN si no es un importe válido.
   */
  function parseImporte(texto) {
    if (typeof texto === 'number') return texto >= 0 ? texto : NaN;
    let s = String(texto == null ? '' : texto)
      .replace(/[\s  €]/g, '')
      .replace(/eur(os)?$/i, '');
    if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return NaN;

    const ultimoPunto = s.lastIndexOf('.');
    const ultimaComa = s.lastIndexOf(',');
    if (ultimoPunto !== -1 && ultimaComa !== -1) {
      // Hay de los dos: el último es el decimal y el otro separa miles.
      const decimal = ultimoPunto > ultimaComa ? '.' : ',';
      const miles = decimal === '.' ? ',' : '.';
      s = s.split(miles).join('').replace(decimal, '.');
    } else if (ultimaComa !== -1) {
      // Solo comas: una es decimal ("1500,50"); varias separan miles ("1,234,567").
      s = s.indexOf(',') === ultimaComa ? s.replace(',', '.') : s.split(',').join('');
    } else if (ultimoPunto !== -1) {
      // Solo puntos: varios, o uno seguido de tres cifras, separan miles ("2.000").
      const varios = s.indexOf('.') !== ultimoPunto;
      if (varios || s.length - ultimoPunto - 1 === 3) s = s.split('.').join('');
    }
    if (!/^\d*\.?\d*$/.test(s)) return NaN;
    return parseFloat(s);
  }

  return {
    PARAMETROS: PARAMETROS,
    OPCIONES_POR_DEFECTO: OPCIONES_POR_DEFECTO,
    cotizaciones: cotizaciones,
    bonificacionTrabajo: bonificacionTrabajo,
    cuotaTarifa: cuotaTarifa,
    deduccionHijos: deduccionHijos,
    tipoRetencion: tipoRetencion,
    irpf: irpf,
    netoAnual: netoAnual,
    netoMensual: netoMensual,
    calcularDesdeBruto: calcularDesdeBruto,
    tramoReta: tramoReta,
    cotizacionReta: cotizacionReta,
    netoAnualSocio: netoAnualSocio,
    calcularSocioDesdeCoste: calcularSocioDesdeCoste,
    calcular: calcular,
    parseImporte: parseImporte
  };
});
