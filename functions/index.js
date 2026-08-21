const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const configurarHeaders = (res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
};

// Validador de números seguros
const valNum = (v) => typeof v === "number" && !isNaN(v) && v >= 0;

exports.crearPersona = onRequest(async (req, res) => {
  configurarHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  try {
    const {
      personaId,
      tipo,
      nombre,
      apellido,
      telefono,
      loteId,
      servicioTipo,
    } = req.body;
    if (!personaId || !tipo || !nombre || !telefono) {
      return res.status(400).send({error: "Campos faltantes"});
    }
    if (!["vecino", "proveedor"].includes(tipo)) {
      return res.status(400).send({error: "Tipo de persona inválido"});
    }

    const ahora = Timestamp.now();
    await db.collection("personas").doc(personaId).set({
      tipo,
      nombre,
      apellido: apellido || null,
      telefono,
      loteId: loteId || null,
      servicioTipo: servicioTipo || null,
      estado: "activo",
      createdAt: ahora,
      updatedAt: ahora,
    });
    res.status(201).send({mensaje: "Persona creada con éxito"});
  } catch (e) {
    res.status(500).send({error: e.message});
  }
});

exports.crearLote = onRequest(async (req, res) => {
  configurarHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  try {
    const {loteId, numero, direccion, estado, residenteActualId} = req.body;
    if (!loteId || !numero || !direccion || !estado) {
      return res.status(400).send({error: "Campos faltantes"});
    }
    if (!["activo", "inactivo"].includes(estado)) {
      return res.status(400).send({error: "Estado de lote inválido"});
    }

    const ahora = Timestamp.now();
    await db.collection("lotes").doc(loteId).set({
      numero,
      direccion,
      estado,
      residenteActualId: residenteActualId || null,
      createdAt: ahora,
      updatedAt: ahora,
    });
    res.status(201).send({mensaje: "Lote registrado con éxito"});
  } catch (e) {
    res.status(500).send({error: e.message});
  }
});

exports.registrarVehiculo = onRequest(async (req, res) => {
  configurarHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  try {
    const {
      vehiculoId,
      titularId,
      titularTipo,
      tipo,
      placa,
      esExtra,
      marbete,
    } = req.body;
    if (!vehiculoId || !titularId || !titularTipo || !tipo || !placa) {
      return res.status(400).send({error: "Campos faltantes"});
    }
    if (!["carro", "moto"].includes(tipo)) {
      return res.status(400).send({error: "Tipo de vehículo inválido"});
    }
    if (marbete && marbete.monto && !valNum(marbete.monto)) {
      return res.status(400).send({error: "Monto de marbete inválido"});
    }

    const ahora = Timestamp.now();
    await db.collection("vehiculos").doc(vehiculoId).set({
      titularId, titularTipo, tipo, placa, esExtra: !!esExtra,
      marbete: {
        requierePagoExtra: !!(marbete && marbete.requierePagoExtra),
        monto: Number((marbete && marbete.monto) || 0),
        vigenciaHasta: marbete && marbete.vigenciaHasta ?
          Timestamp.fromDate(new Date(marbete.vigenciaHasta)) :
          null,
      },
      estado: "activo", createdAt: ahora, updatedAt: ahora,
    });
    res.status(201).send({mensaje: "Vehículo registrado con éxito"});
  } catch (e) {
    res.status(500).send({error: e.message});
  }
});

exports.registrarPago = onRequest(async (req, res) => {
  configurarHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  try {
    const {
      pagoId, personaId, montoTotal, metodo,
      referencia, banco, comprobanteUrl, creadoPor,
      aplicaciones,
    } = req.body;
    if (!pagoId || !personaId || !montoTotal || !metodo || !creadoPor) {
      return res.status(400).send({error: "Campos faltantes"});
    }
    if (!valNum(Number(montoTotal)) || Number(montoTotal) <= 0) {
      return res.status(400).send({error: "Monto debe ser mayor a 0"});
    }
    if (!["efectivo", "deposito", "transferencia"].includes(metodo)) {
      return res.status(400).send({error: "Método de pago inválido"});
    }

    if (
      (metodo === "transferencia" || metodo === "deposito") &&
      (!banco || !referencia)
    ) {
      return res.status(400).send({
        error: "Se requiere banco y referencia para transferencia o depósito",
      });
    }

    const ahora = Timestamp.now();
    const batch = db.batch();
    batch.set(db.collection("pagos").doc(pagoId), {
      personaId,
      fechaPago: ahora,
      montoTotal: Number(montoTotal),
      metodo,
      referencia: referencia || null,
      banco: banco || null,
      comprobanteUrl: comprobanteUrl || null,
      estado: "confirmado",
      creadoPor,
      createdAt: ahora,
    });

    if (aplicaciones && Array.isArray(aplicaciones)) {
      aplicaciones.forEach((app, i) => {
        const appRef = db
            .collection(`pagos/${pagoId}/aplicaciones`)
            .doc(`app-${i}-${ahora.seconds}`);
        batch.set(appRef, {
          cuotaId: app.cuotaId,
          monto: Number(app.monto),
          saldoAnterior: Number(app.saldoAnterior),
          saldoNuevo: Number(app.saldoNuevo),
          createdAt: ahora,
        });
      });
    }
    await batch.commit();
    res.status(201).send({
      mensaje: "Pago y aplicaciones registrados con éxito",
    });
  } catch (e) {
    res.status(500).send({error: e.message});
  }
});

exports.generarCuotasMensuales = onRequest(async (req, res) => {
  configurarHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  try {
    const {periodo, montoOriginal, fechaVencimiento} = req.body;
    if (
      !periodo ||
      !montoOriginal ||
      !fechaVencimiento
    ) {
      return res.status(400).send({error: "Campos faltantes"});
    }
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).send({
        error: "Periodo debe tener formato YYYY-MM",
      });
    }
    if (
      !valNum(Number(montoOriginal)) ||
      Number(montoOriginal) <= 0
    ) {
      return res.status(400).send({error: "Monto debe ser mayor a 0"});
    }
    if (isNaN(Date.parse(fechaVencimiento))) {
      return res.status(400).send({
        error: "Fecha de vencimiento inválida",
      });
    }

    const lotesSnap = await db.collection("lotes")
        .where("estado", "==", "activo")
        .get();
    if (lotesSnap.empty) {
      return res.status(404).send({
        mensaje: "No hay lotes activos para facturar",
      });
    }

    const batch = db.batch();
    const ahora = Timestamp.now();
    const vencimiento = Timestamp.fromDate(new Date(fechaVencimiento));
    lotesSnap.forEach((loteDoc) => {
      const residenteId = loteDoc.data().residenteActualId;
      if (residenteId) {
        batch.set(
            db.collection("cuotas").doc(`cuota-${residenteId}-${periodo}`),
            {
              personaId: residenteId,
              personaTipo: "vecino",
              periodo,
              concepto: "cuota_mensual",
              montoOriginal: Number(montoOriginal),
              montoPagado: 0,
              saldoPendiente: Number(montoOriginal),
              estado: "pendiente",
              fechaVencimiento: vencimiento,
              fechaPagoCompleto: null,
              createdAt: ahora,
              updatedAt: ahora,
            });
      }
    });
    await batch.commit();
    res.status(200).send({mensaje: `Facturación de ${periodo} completada`});
  } catch (e) {
    res.status(500).send({error: e.message});
  }
});

exports.procesarAplicacionPago = onDocumentCreated(
    "pagos/{pagoId}/aplicaciones/{aplicacionId}", async (event) => {
      const app = event.data.data();
      const cuotaRef = db.collection("cuotas").doc(app.cuotaId);
      await db.runTransaction(async (transaction) => {
        const cuotaDoc = await transaction.get(cuotaRef);
        if (!cuotaDoc.exists) return;
        const datos = cuotaDoc.data();
        const nuevoSaldo = Math.max(0, datos.saldoPendiente - app.monto);
        const nuevoPagado = (datos.montoPagado || 0) + app.monto;
        transaction.update(cuotaRef, {
          saldoPendiente: nuevoSaldo,
          montoPagado: nuevoPagado,
          estado: nuevoSaldo === 0 ? "pagada" : "parcial",
          fechaPagoCompleto: nuevoSaldo === 0 ? Timestamp.now() : null,
          updatedAt: Timestamp.now(),
        });
      });
    });

exports.aplicarMoraVencida = onRequest(async (req, res) => {
  configurarHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  try {
    const ahora = Timestamp.now();
    const tarifasSnap = await db.collection("tarifas")
        .where("estado", "==", "activa").limit(1).get();
    if (tarifasSnap.empty) {
      return res.status(404).send({
        error: "No hay ninguna tarifa activa.",
      });
    }

    const tarifaActiva = tarifasSnap.docs[0].data();
    const moraVecinoVal = Number(tarifaActiva.moraVecino || 0);
    const moraProveedorVal = Number(tarifaActiva.moraProveedor || 0);

    const cuotasSnap = await db.collection("cuotas")
        .where("estado", "in", ["pendiente", "parcial"])
        .where("fechaVencimiento", "<", ahora)
        .get();
    if (cuotasSnap.empty) {
      return res.status(200).send({
        mensaje: "No hay cuotas vencidas para aplicar mora.",
      });
    }

    const batch = db.batch();
    cuotasSnap.forEach((docSnap) => {
      const cuota = docSnap.data();
      if (cuota.moraAplicada) return;

      const recargoMora = cuota.personaTipo === "proveedor" ?
        moraProveedorVal :
        moraVecinoVal;
      batch.update(docSnap.ref, {
        montoOriginal: cuota.montoOriginal + recargoMora,
        saldoPendiente: cuota.saldoPendiente + recargoMora,
        moraAplicada: true,
        updatedAt: ahora,
      });
    });
    await batch.commit();
    res.status(200).send({
      mensaje: "Mora aplicada con éxito a cuotas vencidas.",
    });
  } catch (error) {
    res.status(500).send({error: error.message});
  }
});
