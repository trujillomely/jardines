const {Timestamp} = require("firebase-admin/firestore");
const {db} = require("../src/config");

const execute = process.argv.includes("--execute");
const inCents = process.env.LEGACY_AMOUNT_MODE === "cents";
const amountToCents = (value) => {
  const amount = Number(value || 0);
  return inCents ? Math.round(amount) : Math.round(amount * 100);
};
const timestamp = (value) => value || Timestamp.now();

const mappings = [
  {
    source: "personas",
    target: "people",
    map: (value) => ({
      type: value.tipo === "vecino" ? "resident" : "vendor",
      firstName: value.nombre || "",
      lastName: value.apellido || null,
      phone: value.telefono || "",
      authUid: null,
      lotId: value.loteId || null,
      serviceType: value.servicioTipo || null,
      status: value.estado === "inactivo" ? "inactive" : "active",
      createdAt: timestamp(value.createdAt),
      updatedAt: timestamp(value.updatedAt),
    }),
  },
  {
    source: "lotes",
    target: "lots",
    map: (value) => ({
      number: value.numero || "",
      address: value.direccion || "",
      currentResidentId: value.residenteActualId || null,
      status: value.estado === "inactivo" ? "inactive" : "active",
      createdAt: timestamp(value.createdAt),
      updatedAt: timestamp(value.updatedAt),
    }),
  },
  {
    source: "vehiculos",
    target: "vehicles",
    map: (value) => ({
      ownerId: value.titularId,
      ownerType: value.titularTipo === "vecino" ? "resident" : "vendor",
      type: value.tipo === "carro" ? "car" : "motorcycle",
      plate: value.placa,
      isAdditional: Boolean(value.esExtra),
      permit: {
        requiresExtraPayment: Boolean(value.marbete &&
          value.marbete.requierePagoExtra),
        amountCents: amountToCents(value.marbete && value.marbete.monto),
        validUntil: value.marbete && value.marbete.vigenciaHasta || null,
      },
      status: value.estado === "inactivo" ? "inactive" : "active",
      createdAt: timestamp(value.createdAt),
      updatedAt: timestamp(value.updatedAt),
    }),
  },
  {
    source: "cuotas",
    target: "invoices",
    map: (value) => ({
      personId: value.personaId,
      period: value.periodo,
      concept: value.concepto === "cuota_mensual" ?
        "monthly_fee" : value.concepto,
      originalAmountCents: amountToCents(value.montoOriginal),
      paidAmountCents: amountToCents(value.montoPagado),
      outstandingAmountCents: amountToCents(value.saldoPendiente),
      status: value.estado === "pagada" ? "paid" : value.estado,
      dueDate: timestamp(value.fechaVencimiento),
      lateFeeApplied: Boolean(value.moraAplicada),
      paidInFullAt: value.fechaPagoCompleto || null,
      createdAt: timestamp(value.createdAt),
      updatedAt: timestamp(value.updatedAt),
    }),
  },
  {
    source: "tarifas",
    target: "rates",
    map: (value) => ({
      status: value.estado === "activa" ? "active" : "inactive",
      residentMonthlyAmountCents: amountToCents(value.cuotaMensual),
      residentLateFeeCents: amountToCents(value.moraVecino),
      createdAt: timestamp(value.createdAt),
      updatedAt: timestamp(value.updatedAt),
    }),
  },
];

const paymentMethod = (value) => ({
  efectivo: "cash",
  deposito: "deposit",
  transferencia: "transfer",
}[value] || value);

const migratePayments = async () => {
  const source = await db.collection("pagos").get();
  console.log(`pagos: ${source.size} document(s) found.`);
  if (!execute) return;
  for (const payment of source.docs) {
    const value = payment.data();
    const target = db.collection("payments").doc(payment.id);
    await target.create({
      personId: value.personaId,
      paidAt: timestamp(value.fechaPago),
      totalAmountCents: amountToCents(value.montoTotal),
      method: paymentMethod(value.metodo),
      reference: value.referencia || null,
      bank: value.banco || null,
      receiptUrl: value.comprobanteUrl || null,
      status: value.estado === "confirmado" ? "confirmed" : value.estado,
      createdBy: value.creadoPor || "legacy-migration",
      createdAt: timestamp(value.createdAt),
    });
    const applications = await payment.ref.collection("aplicaciones").get();
    const batch = db.batch();
    applications.docs.forEach((application, index) => {
      const data = application.data();
      batch.create(target.collection("applications").doc(String(index)), {
        invoiceId: data.cuotaId,
        amountCents: amountToCents(data.monto),
        createdAt: timestamp(data.createdAt),
      });
    });
    if (!applications.empty) await batch.commit();
  }
};

const run = async () => {
  for (const mapping of mappings) {
    const source = await db.collection(mapping.source).get();
    console.log(`${mapping.source}: ${source.size} document(s) found.`);
    if (!execute) continue;
    let batch = db.batch();
    let count = 0;
    for (const document of source.docs) {
      batch.create(db.collection(mapping.target).doc(document.id),
          mapping.map(document.data()));
      count += 1;
      if (count === 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
  }
  await migratePayments();
  if (!execute) {
    console.log("Dry run only. Re-run with --execute to write data.");
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
