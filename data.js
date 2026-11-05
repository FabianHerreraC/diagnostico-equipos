// Datos dummy: un equipo ficticio recorriendo las cinco herramientas.
// Todo está enlazado por id para poder seguir el hilo de una batalla
// desde el SWOT hasta las decisiones de capacidad.

window.DATA = {
  equipo: {
    nombre: "Unidad Comercial Pyme",
    organizacion: "Grupo Andino (ficticio)",
    horizonte: "Ene 2027 – Jun 2028",
    meses: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May", "Jun"],
    anios: [2027, 2027, 2027, 2027, 2027, 2027, 2027, 2027, 2027, 2027, 2027, 2027, 2028, 2028, 2028, 2028, 2028, 2028],
    presupuesto: 1300 // kUSD disponibles para el plan
  },

  // ───────────── 1. SWOT ─────────────
  swot: {
    S: [
      { id: "S1", t: "Clientes leales", d: "NPS de 62 y renovación anual del 81% en la base pyme." },
      { id: "S2", t: "Equipo de datos sólido", d: "Analítica avanzada y data warehouse ya operando." },
      { id: "S3", t: "Marca reconocida en pyme", d: "Top-3 de recordación en el segmento en 4 países." },
      { id: "S4", t: "Red de distribución regional", d: "180 distribuidores activos en 6 países." }
    ],
    W: [
      { id: "W1", t: "Procesos comerciales manuales", d: "Cotización y alta de cliente en hojas de cálculo; ciclo de venta de 34 días." },
      { id: "W2", t: "Baja adopción del CRM", d: "Solo 38% de oportunidades registradas." },
      { id: "W3", t: "Rotación alta en ventas junior", d: "27% anual; el onboarding tarda 5 meses." },
      { id: "W4", t: "Oferta digital limitada", d: "No hay compra en línea ni autoservicio." },
      { id: "W5", t: "Silos marketing–operaciones", d: "Dos funnels, dos métricas, cero acuerdos de servicio." }
    ],
    O: [
      { id: "O1", t: "Digitalización acelerada de pymes", d: "El 64% de las pymes de la región compra insumos en línea." },
      { id: "O2", t: "Demanda de suscripción", d: "Clientes piden pagar mensual con servicio incluido." },
      { id: "O3", t: "Alianzas con fintech", d: "Financiar compras pyme sin riesgo propio de crédito." },
      { id: "O4", t: "Entrada a México", d: "Mercado 3× el actual, con competencia fragmentada." },
      { id: "O5", t: "IA generativa en ventas", d: "Copilotos para preparar visitas, cotizar y dar seguimiento." },
      { id: "O6", t: "Licitaciones públicas", d: "Programas de conectividad pyme con fondos estatales." },
      { id: "O7", t: "Corporativos buscan proveedor único", d: "Consolidar compras de sus redes de franquicias." }
    ],
    T: [
      { id: "T1", t: "Competidor regional low-cost", d: "Entró con precios 18% menores y canal 100% digital." },
      { id: "T2", t: "Regulación de datos", d: "Nueva ley de protección de datos personales en 2027." },
      { id: "T3", t: "Volatilidad cambiaria", d: "Márgenes expuestos en importados." },
      { id: "T4", t: "Escasez de talento técnico", d: "Tiempo medio de contratación de perfiles de datos: 4 meses." }
    ]
  },

  // ───────────── 2. Análisis de oportunidades ─────────────
  // Puntajes 1–5. Se editan en la interfaz.
  oportunidades: {
    O1: { impacto: 5, factibilidad: 4, alineacion: 5, nota: "Mercado grande y la marca ya está ahí." },
    O2: { impacto: 4, factibilidad: 4, alineacion: 5, nota: "Cambia el modelo de ingresos; pide billing nuevo." },
    O3: { impacto: 3, factibilidad: 5, alineacion: 3, nota: "Rápida de ejecutar; impacto indirecto." },
    O4: { impacto: 5, factibilidad: 2, alineacion: 4, nota: "Gran premio, alta incertidumbre de ejecución." },
    O5: { impacto: 4, factibilidad: 3, alineacion: 4, nota: "Depende de limpiar los datos del CRM primero." },
    O6: { impacto: 3, factibilidad: 2, alineacion: 2, nota: "Ciclos largos y fuera del foco pyme." },
    O7: { impacto: 3, factibilidad: 3, alineacion: 4, nota: "Requiere venta consultiva que hoy no existe." }
  },

  // ───────────── 3. Must Win Battles ─────────────
  batallas: [
    {
      id: "B1", nombre: "Ganar la pyme digital", color: "b1",
      ambicion: "Ser la primera opción de compra en línea para la pyme de la región.",
      kpi: "Pymes activas en canal digital", hoy: 3100, meta: 12000, unidad: "pymes",
      opps: ["O1", "O3"], apoya: ["S3", "S4"], corrige: ["W4"], mitiga: ["T1"]
    },
    {
      id: "B2", nombre: "Pasar a ingresos recurrentes", color: "b2",
      ambicion: "Que un tercio del ingreso llegue por suscripción, no por pedido.",
      kpi: "% de ingresos por suscripción", hoy: 9, meta: 35, unidad: "%",
      opps: ["O2", "O7"], apoya: ["S1"], corrige: ["W1"], mitiga: ["T3"]
    },
    {
      id: "B3", nombre: "Vender con datos e IA", color: "b3",
      ambicion: "Cada vendedor sabe a quién llamar, qué ofrecer y cuándo.",
      kpi: "Adopción del CRM", hoy: 38, meta: 85, unidad: "%",
      opps: ["O5"], apoya: ["S2"], corrige: ["W2", "W5"], mitiga: ["T2"]
    },
    {
      id: "B4", nombre: "Abrir México con un equipo que se queda", color: "b4",
      ambicion: "Operación rentable en México sostenida por talento propio.",
      kpi: "Clientes activos en México", hoy: 0, meta: 1500, unidad: "clientes",
      opps: ["O4"], apoya: ["S4"], corrige: ["W3"], mitiga: ["T4"]
    }
  ],

  // ───────────── 4. Integrated Action Plan ─────────────
  // inicio: índice de mes (0 = Ene 2027). dur: meses. fte: dedicación al plan. kusd: presupuesto.
  areas: ["Comercial", "Marketing", "Datos", "TI", "Operaciones", "Finanzas", "Personas"],
  acciones: [
    { id: "A1",  b: "B1", t: "Tienda digital pyme (MVP)",                 resp: "Laura Méndez", area: "TI",          inicio: 0,  dur: 5,  fte: 1.5, kusd: 180, kpi: "Tienda en línea en 3 países", deps: [] },
    { id: "A2",  b: "B1", t: "Adquisición por performance",              resp: "Diego Ríos",   area: "Marketing",   inicio: 4,  dur: 12, fte: 1.0, kusd: 220, kpi: "CAC < 45 USD", deps: ["A1"] },
    { id: "A3",  b: "B1", t: "Alianza fintech: compra ahora, paga después", resp: "Ana Paredes", area: "Finanzas",  inicio: 2,  dur: 6,  fte: 0.5, kusd: 40,  kpi: "2 alianzas firmadas", deps: [] },
    { id: "A4",  b: "B1", t: "Distribuidores certificados en venta digital", resp: "Jorge Salas", area: "Comercial", inicio: 5,  dur: 6,  fte: 1.0, kusd: 35,  kpi: "80% certificados", deps: ["A1"] },
    { id: "A18", b: "B1", t: "Un solo funnel marketing–operaciones",     resp: "Diego Ríos",   area: "Marketing",   inicio: 4,  dur: 4,  fte: 0.5, kusd: 20,  kpi: "Una métrica de funnel compartida", deps: ["A9"] },

    { id: "A5",  b: "B2", t: "Portafolio de planes de suscripción",      resp: "Marta Ochoa",  area: "Comercial",   inicio: 0,  dur: 4,  fte: 1.0, kusd: 30,  kpi: "3 planes validados con clientes", deps: [] },
    { id: "A6",  b: "B2", t: "Plataforma de billing recurrente",         resp: "Laura Méndez", area: "TI",          inicio: 3,  dur: 6,  fte: 1.0, kusd: 150, kpi: "100% facturación automática", deps: ["A5"] },
    { id: "A7",  b: "B2", t: "Proceso comercial end-to-end",             resp: "Pablo Núñez",  area: "Operaciones", inicio: 1,  dur: 7,  fte: 1.5, kusd: 60,  kpi: "Ciclo de venta −25%", deps: [] },
    { id: "A8",  b: "B2", t: "Programa de cuentas corporativas",         resp: "Marta Ochoa",  area: "Comercial",   inicio: 7,  dur: 10, fte: 1.5, kusd: 70,  kpi: "20 cuentas corporativas", deps: ["A5", "A7"] },

    { id: "A9",  b: "B3", t: "Limpieza y migración de datos al CRM",     resp: "Sofía Vega",   area: "Datos",       inicio: 0,  dur: 4,  fte: 1.0, kusd: 45,  kpi: "95% registros válidos", deps: [] },
    { id: "A10", b: "B3", t: "Modelo de propensión de compra",           resp: "Sofía Vega",   area: "Datos",       inicio: 4,  dur: 5,  fte: 1.0, kusd: 50,  kpi: "Lift ×2 en el decil superior", deps: ["A9"] },
    { id: "A11", b: "B3", t: "Copiloto IA para vendedores",              resp: "Andrés Lima",  area: "TI",          inicio: 6,  dur: 6,  fte: 1.0, kusd: 120, kpi: "70% de vendedores lo usan a diario", deps: ["A9", "A10"] },
    { id: "A12", b: "B3", t: "Gobierno de datos y cumplimiento",         resp: "Pablo Núñez",  area: "Operaciones", inicio: 2,  dur: 6,  fte: 0.5, kusd: 30,  kpi: "Auditoría sin hallazgos", deps: [] },
    { id: "A13", b: "B3", t: "Rituales comerciales sobre el CRM",        resp: "Jorge Salas",  area: "Comercial",   inicio: 4,  dur: 14, fte: 0.5, kusd: 10,  kpi: "Adopción CRM 85%", deps: ["A9"] },

    { id: "A14", b: "B4", t: "Estudio de entrada y entidad legal MX",    resp: "Ana Paredes",  area: "Finanzas",    inicio: 0,  dur: 5,  fte: 0.5, kusd: 80,  kpi: "Entidad legal operativa", deps: [] },
    { id: "A15", b: "B4", t: "Reclutar country manager y equipo MX",     resp: "Lucía Torres", area: "Personas",    inicio: 4,  dur: 5,  fte: 0.8, kusd: 90,  kpi: "Equipo de 5 contratado", deps: ["A14"] },
    { id: "A16", b: "B4", t: "Plan de carrera y retención comercial",    resp: "Lucía Torres", area: "Personas",    inicio: 1,  dur: 8,  fte: 0.7, kusd: 60,  kpi: "Rotación < 15%", deps: [] },
    { id: "A17", b: "B4", t: "Go-to-market México",                      resp: "Jorge Salas",  area: "Comercial",   inicio: 9,  dur: 9,  fte: 2.0, kusd: 200, kpi: "1.500 clientes en México", deps: ["A15", "A1"] }
  ],

  // ───────────── 5. Capacity Action Plan ─────────────
  // FTE que cada área puede dedicar al plan además de la operación diaria.
  capacidad: { Comercial: 3.0, Marketing: 1.0, Datos: 1.0, TI: 1.5, Operaciones: 1.0, Finanzas: 0.5, Personas: 0.5 },

  competencias: [
    { id: "C1", t: "Growth y marketing digital",    actual: 2, requerido: 4, battles: ["B1"] },
    { id: "C2", t: "Pricing de suscripción",        actual: 2, requerido: 4, battles: ["B2"] },
    { id: "C3", t: "Venta consultiva corporativa",  actual: 3, requerido: 4, battles: ["B2"] },
    { id: "C4", t: "Ingeniería de datos y ML",      actual: 3, requerido: 4, battles: ["B3"] },
    { id: "C5", t: "IA aplicada a la venta",        actual: 1, requerido: 4, battles: ["B3"] },
    { id: "C6", t: "Cumplimiento y privacidad",     actual: 2, requerido: 3, battles: ["B3"] },
    { id: "C7", t: "Reclutamiento internacional",   actual: 1, requerido: 3, battles: ["B4"] },
    { id: "C8", t: "Gestión de alianzas",           actual: 3, requerido: 3, battles: ["B1", "B4"] }
  ],

  herramientas: [
    { id: "H1", t: "CRM",                        estado: "subutilizada", battles: ["B3", "B2"], cubre: "A13" },
    { id: "H2", t: "E-commerce pyme",            estado: "falta",        battles: ["B1"], cubre: "A1" },
    { id: "H3", t: "Billing de suscripción",     estado: "falta",        battles: ["B2"], cubre: "A6" },
    { id: "H4", t: "Data warehouse",             estado: "existe",       battles: ["B3"], cubre: null },
    { id: "H5", t: "Copiloto IA comercial",      estado: "falta",        battles: ["B3"], cubre: "A11" },
    { id: "H6", t: "ATS de reclutamiento",       estado: "falta",        battles: ["B4"], cubre: null }
  ],

  // Decisiones: desarrollar, contratar o dejar de hacer.
  // fte: capacidad que suma a un área desde el mes `desde`.
  // kusd: costo (+) o ahorro (−). sube: competencia que eleva y a qué nivel.
  decisiones: [
    { id: "D1",  tipo: "desarrollar", t: "Academia de IA aplicada para 20 vendedores", kusd: 40,  battles: ["B3"], sube: { C5: 3 } },
    { id: "D2",  tipo: "desarrollar", t: "Certificación en venta consultiva",          kusd: 30,  battles: ["B2"], sube: { C3: 4 } },
    { id: "D3",  tipo: "desarrollar", t: "Mentoría en privacidad para operaciones",     kusd: 12,  battles: ["B3"], sube: { C6: 3 } },
    { id: "D4",  tipo: "contratar",   t: "Dos growth marketers",                       kusd: 140, battles: ["B1"], area: "Marketing",   fte: 1.0, desde: 3, sube: { C1: 4 } },
    { id: "D5",  tipo: "contratar",   t: "Pricing lead de suscripción",                kusd: 75,  battles: ["B2"], area: "Comercial",   fte: 0.5, desde: 0, sube: { C2: 4 } },
    { id: "D6",  tipo: "contratar",   t: "Ingeniero/a de plataforma",                  kusd: 95,  battles: ["B1", "B2", "B3"], area: "TI", fte: 1.0, desde: 2, sube: { C4: 4 } },
    { id: "D7",  tipo: "contratar",   t: "Country manager + 4 vendedores MX",          kusd: 260, battles: ["B4"], area: "Comercial",   fte: 2.0, desde: 9, sube: { C7: 2 } },
    { id: "D8",  tipo: "contratar",   t: "HR business partner regional",               kusd: 60,  battles: ["B4"], area: "Personas",    fte: 1.0, desde: 1, sube: { C7: 3 } },
    { id: "D9",  tipo: "dejar",       t: "Reportes comerciales manuales semanales",    kusd: 0,   battles: ["B3"], area: "Comercial",   fte: 0.8, desde: 4 },
    { id: "D10", tipo: "dejar",       t: "Eventos presenciales de bajo retorno",       kusd: -90, battles: ["B1"], area: "Marketing",   fte: 0.5, desde: 0 },
    { id: "D11", tipo: "dejar",       t: "Desarrollos a medida para cuentas pequeñas", kusd: -40, battles: ["B1", "B2"], area: "TI", fte: 0.5, desde: 0 },
    { id: "D12", tipo: "dejar",       t: "Comités de aprobación duplicados",           kusd: 0,   battles: ["B2"], area: "Operaciones", fte: 0.5, desde: 1 },
    { id: "D13", tipo: "dejar",       t: "Cierre contable manual del distribuidor",    kusd: -20, battles: ["B1", "B4"], area: "Finanzas", fte: 0.5, desde: 0 }
  ]
};
