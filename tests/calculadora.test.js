const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../calculadora.js');

function cerca(real, esperado, tolerancia = 0.01) {
  assert.ok(Math.abs(real - esperado) <= tolerancia, `${real} no está a ${tolerancia} de ${esperado}`);
}

test('parseImporte entiende formatos españoles e ingleses', () => {
  assert.equal(C.parseImporte('30000'), 30000);
  assert.equal(C.parseImporte('30.000'), 30000);
  assert.equal(C.parseImporte('2.000'), 2000);
  assert.equal(C.parseImporte('1.500,50'), 1500.5);
  assert.equal(C.parseImporte('1500,50'), 1500.5);
  assert.equal(C.parseImporte('1.234.567'), 1234567);
  assert.equal(C.parseImporte('30,000.50'), 30000.5);
  assert.equal(C.parseImporte('12,345,678'), 12345678);
  assert.equal(C.parseImporte('2.5'), 2.5);
  assert.equal(C.parseImporte(' 30.000 € '), 30000);
  assert.equal(C.parseImporte('1.000,'), 1000);
  assert.ok(Number.isNaN(C.parseImporte('')));
  assert.ok(Number.isNaN(C.parseImporte('abc')));
  assert.ok(Number.isNaN(C.parseImporte('-5')));
  assert.ok(Number.isNaN(C.parseImporte('1,2,3.4.5')));
});

test('tarifa general 2026', () => {
  assert.equal(C.cuotaTarifa(0), 0);
  // Cuotas acumuladas de la tabla del art. 75 (NF 7/2025).
  cerca(C.cuotaTarifa(18080), 4158.4);
  cerca(C.cuotaTarifa(36160), 9220.8);
  cerca(C.cuotaTarifa(54240), 15548.8);
  cerca(C.cuotaTarifa(77450), 24832.8);
  cerca(C.cuotaTarifa(107260), 38247.3);
  cerca(C.cuotaTarifa(142960), 54669.3);
  cerca(C.cuotaTarifa(208390), 85421.4);
  cerca(C.cuotaTarifa(25050), 6110);
  // Por encima del último límite se aplica el 49 %.
  cerca(C.cuotaTarifa(300000) - C.cuotaTarifa(299000), 490);
});

test('bonificación de los rendimientos del trabajo', () => {
  assert.equal(C.bonificacionTrabajo(5000), 5000); // no puede dejar el rendimiento en negativo
  assert.equal(C.bonificacionTrabajo(14800), 8000);
  cerca(C.bonificacionTrabajo(18900), 8000 - 0.6098 * 4100);
  cerca(C.bonificacionTrabajo(23000), 3000, 1);
  assert.equal(C.bonificacionTrabajo(40000), 3000);
});

test('cotizaciones 2026 con contrato indefinido y temporal', () => {
  const indefinido = C.cotizaciones(30000, {});
  cerca(indefinido.totalTrabajador, 1950); // 6,50 %
  cerca(indefinido.totalEmpresa, 9495); // 31,65 % con AT/EP de oficina
  const temporal = C.cotizaciones(30000, { contrato: 'temporal' });
  cerca(temporal.totalTrabajador, 1965);
  cerca(temporal.totalEmpresa, 9855);
  const conAtEp = C.cotizaciones(30000, { atEp: 0.035 });
  cerca(conAtEp.totalEmpresa - indefinido.totalEmpresa, 30000 * 0.025);
});

test('base máxima y cotización de solidaridad', () => {
  const tope = C.cotizaciones(61214.4, {});
  cerca(tope.base, 61214.4);
  assert.equal(tope.trabajador.solidaridad, 0);

  const alto = C.cotizaciones(70000, {});
  cerca(alto.base, 61214.4);
  // Exceso mensual 732,13 €: 510,12 € al primer tramo y 222,01 € al segundo.
  cerca(alto.trabajador.solidaridad, (510.12 * 0.0019 + 222.0133 * 0.0021) * 12);
  cerca(alto.empresa.solidaridad, (510.12 * 0.0096 + 222.0133 * 0.0104) * 12);
});

test('IRPF foral: 30.000 € brutos sin hijos', () => {
  const r = C.calcularDesdeBruto(30000, {});
  cerca(r.irpf.rendimientoNeto, 28050);
  assert.equal(r.irpf.bonificacion, 3000);
  cerca(r.irpf.cuotaIntegra, 6110);
  assert.equal(r.irpf.minoracion, 1615);
  cerca(r.irpf.aPagar, 4495);
  cerca(r.netoAnual, 23555);
  cerca(r.costeAnual, 39495);
});

test('deducción por hijos, compartida o no, y con tope en la cuota', () => {
  const compartida = C.calcularDesdeBruto(30000, { hijos: 2, menores6: 1 });
  cerca(compartida.irpf.deduccionDescendientes, (682 + 844 + 394) / 2);
  cerca(compartida.irpf.aPagar, 4495 - 960);

  const entera = C.calcularDesdeBruto(30000, { hijos: 2, menores6: 1, deduccionCompartida: false });
  cerca(entera.irpf.aPagar, 4495 - 1920);

  // Del quinto hijo en adelante se repite el último importe.
  assert.equal(C.deduccionHijos({ hijos: 6, deduccionCompartida: false }), 682 + 844 + 1421 + 1680 + 2195 * 2);

  const muchos = C.calcularDesdeBruto(21000, { hijos: 5, deduccionCompartida: false });
  assert.equal(muchos.irpf.aPagar, 0);
});

test('tabla de retenciones 2026', () => {
  assert.equal(C.tipoRetencion(20000, {}), 0);
  assert.equal(C.tipoRetencion(20000.01, {}), 0.07);
  assert.equal(C.tipoRetencion(30000, {}), 0.15);
  assert.equal(C.tipoRetencion(30000, { hijos: 2 }), 0.13);
  assert.equal(C.tipoRetencion(250000, {}), 0.4);
  // La última columna vale para más de cinco descendientes.
  assert.equal(C.tipoRetencion(250000, { hijos: 6 }), 0.37);
  assert.equal(C.tipoRetencion(250000, { hijos: 9 }), 0.37);
  // Contrato de menos de un año: mínimo del 2 %.
  assert.equal(C.tipoRetencion(15000, { contrato: 'temporal' }), 0.02);
  assert.equal(C.tipoRetencion(21000, { hijos: 3, contrato: 'temporal' }), 0.02);
  assert.equal(C.tipoRetencion(30000, { contrato: 'temporal' }), 0.15);
});

test('hasta 20.000 € no hay obligación de declarar: se paga lo retenido', () => {
  // Sin retención no se paga IRPF aunque la cuota salga positiva.
  const indefinido = C.calcularDesdeBruto(18000, {});
  const rn = 18000 * (1 - 0.065);
  const base = rn - (8000 - 0.6098 * (rn - 14800));
  cerca(indefinido.irpf.cuotaLiquida, base * 0.23 - 1615);
  assert.equal(indefinido.irpf.retencion, 0);
  assert.equal(indefinido.irpf.aPagar, 0);

  // Con el 2 % mínimo se queda en lo retenido si es menos que la cuota...
  const temporal = C.calcularDesdeBruto(18000, { contrato: 'temporal' });
  cerca(temporal.irpf.aPagar, 360);
  assert.equal(temporal.irpf.resultadoDeclaracion, 0);

  // ...y si es más, compensa declarar para que lo devuelvan.
  const devolver = C.calcularDesdeBruto(15000, { contrato: 'temporal' });
  assert.equal(devolver.irpf.aPagar, 0);
  cerca(devolver.irpf.resultadoDeclaracion, -300);
  assert.ok(devolver.avisos.some((a) => a.codigo === 'bajo-smi'));
});

test('declaración con 30.000 €: la retención del 15 % casi cubre la cuota', () => {
  const r = C.calcularDesdeBruto(30000, {});
  cerca(r.irpf.retencion, 4500);
  cerca(r.irpf.aPagar, 4495);
  cerca(r.irpf.resultadoDeclaracion, -5);
});

test('al pasar de 20.000 € el neto del año baja de golpe', () => {
  const justo = C.calcularDesdeBruto(20000, {});
  const encima = C.calcularDesdeBruto(21000, {});
  const escalon = encima.avisos.find((a) => a.codigo === 'escalon-20000');
  assert.ok(escalon);
  cerca(escalon.perdida, justo.netoAnual - encima.netoAnual);
  assert.ok(!C.calcularDesdeBruto(23000, {}).avisos.some((a) => a.codigo === 'escalon-20000'));

  // Fuera de ese salto, el neto del año siempre crece con el bruto.
  let anterior = -1;
  for (let bruto = 0; bruto <= 260000; bruto += 250) {
    const neto = C.netoAnual(bruto, {});
    if (bruto !== 20250) assert.ok(neto > anterior, `el neto baja al pasar a ${bruto} €`);
    anterior = neto;
  }
});

test('nómina con 14 pagas: las nóminas más la declaración dan el neto del año', () => {
  const r = C.calcularDesdeBruto(30000, { pagas: 14 });
  cerca(r.nomina.bruto, 30000 / 14);
  cerca(r.nomina.cotizacion, 1950 / 12);
  cerca(r.nomina.irpf, 30000 / 14 * 0.15);
  cerca(r.pagaExtra.cotizacion, 0);
  cerca(r.nomina.neto * 12 + r.pagaExtra.neto * 2, r.netoAnual + r.irpf.resultadoDeclaracion);

  const doce = C.calcularDesdeBruto(30000, { pagas: 12 });
  assert.equal(doce.pagaExtra, null);
  cerca(doce.nomina.neto * 12, doce.netoAnual + doce.irpf.resultadoDeclaracion);
  cerca(doce.netoAnual, r.netoAnual);
});

test('de neto a bruto: alcanza el neto pedido con el bruto más bajo posible', () => {
  for (const bruto of [9000, 15000, 19500, 20000, 21000, 23000, 30000, 45000, 61214.4, 80000, 150000, 400000]) {
    for (const pagas of [12, 14]) {
      for (const hijos of [0, 2]) {
        const opciones = { pagas, hijos };
        const directo = C.calcularDesdeBruto(bruto, opciones);

        const anual = C.calcular(Object.assign({ modo: 'neto', periodo: 'anual', importe: directo.netoAnual }, opciones));
        cerca(anual.netoAnual, directo.netoAnual);
        assert.ok(anual.brutoAnual <= bruto + 0.01);

        // El neto de la nómina baja un poco al saltar de tramo de retención, así que a veces
        // un bruto algo menor da el mismo neto.
        const mensual = C.calcular(Object.assign({ modo: 'neto', periodo: 'mensual', importe: directo.nomina.neto }, opciones));
        cerca(mensual.nomina.neto, directo.nomina.neto);
        assert.ok(mensual.brutoAnual <= bruto + 0.01);
      }
    }
  }
  // Justo al entrar en el tramo del 15 %, un bruto algo menor ya da ese neto de nómina.
  const objetivo = C.netoMensual(29790.01, {});
  assert.ok(C.calcular({ modo: 'neto', periodo: 'mensual', importe: objetivo }).brutoAnual < 29790);
  // Sin saltos de por medio, la vuelta da el mismo bruto.
  cerca(C.calcular({ modo: 'neto', periodo: 'anual', importe: C.netoAnual(45000, {}) }).brutoAnual, 45000);
});

test('coste de empresa a bruto y vuelta', () => {
  for (const bruto of [12000, 30000, 70000]) {
    const coste = C.calcularDesdeBruto(bruto, {}).costeAnual;
    cerca(C.calcular({ modo: 'coste', periodo: 'anual', importe: coste }).brutoAnual, bruto);
    cerca(C.calcular({ modo: 'coste', periodo: 'mensual', importe: coste / 12 }).brutoAnual, bruto);
  }
});

test('importes mensuales según el modo', () => {
  cerca(C.calcular({ modo: 'bruto', periodo: 'mensual', importe: 2000, pagas: 14 }).brutoAnual, 28000);
  cerca(C.calcular({ modo: 'bruto', periodo: 'mensual', importe: 2000, pagas: 12 }).brutoAnual, 24000);
  cerca(C.calcular({ modo: 'neto', periodo: 'mensual', importe: 1800, pagas: 14 }).nomina.neto, 1800);
});

test('importe vacío o cero no rompe nada', () => {
  for (const modo of ['bruto', 'neto', 'coste']) {
    const r = C.calcular({ modo, periodo: 'anual', importe: 0 });
    assert.equal(r.brutoAnual, 0);
    assert.equal(r.netoAnual, 0);
    assert.equal(r.costeAnual, 0);
    assert.deepEqual(r.avisos, []);
  }
});
