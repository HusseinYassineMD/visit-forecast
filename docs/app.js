const COLORS = {
  dha: "#13253a",
  pe4: "#0f6e6a",
  dbs: "#b05a2c",
  vista: "#c4922a",
};

const monthLabel = (ym) => {
  if (!ym || String(ym).startsWith("Backlog")) return String(ym);
  const [y, m] = String(ym).split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[Number(m) - 1]} '${String(y).slice(2)}`;
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "className") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return node;
}

function kpi(label, value, detail = "", className = "") {
  return el("div", { className: `kpi ${className}`.trim() }, [
    el("p", { className: "label", text: label }),
    el("p", { className: "value", text: String(value) }),
    detail ? el("p", { className: "detail", text: detail }) : el("span"),
  ]);
}

async function loadData() {
  const res = await fetch("./data.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load data.json (${res.status})`);
  return res.json();
}

function renderKpis(data) {
  const t = data.totals;
  const grid = document.getElementById("kpi-grid");
  grid.replaceChildren(
    kpi("12-mo clinical visits", t.total, "Nov 2026 – Oct 2027", "accent"),
    kpi("DHA + PE4 PT visits", t.dha_pe4, `${t.dha} DHA · ${t.pe4} PE4`),
    kpi("DBS visit events", t.dbs_events, `${t.dbs_y3} Y3 pts · ${t.dbs_y4} Y4 pts`),
    kpi("Vista clinical (est.)", t.vista_clinical, `${data.vista.enrolled} enrolled`),
  );
}

function renderBacklog(data) {
  const b = data.backlog;
  if (!b) return;
  const panel = document.getElementById("backlog-panel");
  panel.hidden = false;
  document.getElementById("backlog-note").textContent = b.notes || "";
  document.getElementById("backlog-kpis").replaceChildren(
    kpi("DHA/PE4 unscheduled", b.dha_pe4, "Past Month Due"),
    kpi("DBS Y3 overdue", b.dbs_y3, "", "warn"),
    kpi("DBS Y4 overdue", b.dbs_y4, "", "warn"),
    kpi("Est. DBS events", b.dbs_events, "Y3×2 + Y4×1"),
  );
}

function renderChart(data) {
  const labels = data.months.map((m) => monthLabel(m.month));
  const legend = document.getElementById("chart-legend");
  const items = [
    ["DHA PT", COLORS.dha],
    ["PE4 PT", COLORS.pe4],
    ["DBS events", COLORS.dbs],
    ["Vista clinical", COLORS.vista],
  ];
  legend.replaceChildren(
    ...items.map(([name, color]) => {
      const span = el("span");
      span.append(el("i", { style: `background:${color}` }), document.createTextNode(name));
      return span;
    }),
  );

  const ctx = document.getElementById("monthly-chart");
  // eslint-disable-next-line no-new
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "DHA PT", data: data.months.map((m) => m.dha), backgroundColor: COLORS.dha, stack: "visits" },
        { label: "PE4 PT", data: data.months.map((m) => m.pe4), backgroundColor: COLORS.pe4, stack: "visits" },
        { label: "DBS events", data: data.months.map((m) => m.dbs_events), backgroundColor: COLORS.dbs, stack: "visits" },
        { label: "Vista clinical", data: data.months.map((m) => m.vista_clinical), backgroundColor: COLORS.vista, stack: "visits" },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            footer: (items) => {
              const total = items.reduce((s, i) => s + i.parsed.y, 0);
              return `Total: ${total}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: "#5c6b7a", font: { family: "DM Sans", size: 11 } },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: { color: "rgba(19,37,58,0.08)" },
          ticks: { color: "#5c6b7a", font: { family: "DM Sans", size: 11 } },
          title: { display: true, text: "Estimated clinical visits", color: "#5c6b7a" },
        },
      },
    },
  });
}

function renderOverviewTable(data) {
  const tbody = document.querySelector("#overview-table tbody");
  tbody.replaceChildren(
    ...data.months.map((m) => {
      const tr = el("tr", { className: m.total >= 25 ? "peak" : "" });
      [
        monthLabel(m.month),
        m.dha,
        m.pe4,
        m.dbs_y3,
        m.dbs_y4,
        m.dbs_events,
        m.vista_clinical,
        m.total,
      ].forEach((v, i) => {
        tr.appendChild(el("td", { className: i === 0 ? "" : "num", text: String(v) }));
      });
      return tr;
    }),
  );
}

function fillMonthOptions(selectId, values) {
  const sel = document.getElementById(selectId);
  [...new Set(values)].sort().forEach((m) => {
    sel.appendChild(el("option", { value: m, text: monthLabel(m) }));
  });
}

function renderDhaTable(data) {
  fillMonthOptions("dha-month-filter", data.dha_pe4.map((r) => r.month_due));
  const tbody = document.querySelector("#dha-table tbody");

  const paint = () => {
    const month = document.getElementById("dha-month-filter").value;
    const study = document.getElementById("dha-study-filter").value;
    const status = document.getElementById("dha-status-filter").value;
    const q = document.getElementById("dha-search").value.trim().toLowerCase();

    const rows = data.dha_pe4.filter((r) => {
      if (month !== "all" && r.month_due !== month) return false;
      if (study !== "all" && r.study !== study) return false;
      if (status !== "all" && r.status !== status) return false;
      if (q && !String(r.id).toLowerCase().includes(q)) return false;
      return true;
    });

    tbody.replaceChildren(
      ...rows.map((r) => {
        const tr = el("tr", { className: r.month_due < "2026-11" && r.status === "Needs scheduling" ? "overdue" : "" });
        const statusClass = r.status === "Scheduled" ? "scheduled" : "needs";
        tr.append(
          el("td", { text: monthLabel(r.month_due) }),
          el("td", { text: r.study }),
          el("td", { text: r.id }),
          el("td", {}, [el("span", { className: `status ${statusClass}`, text: r.status })]),
          el("td", { text: r.visit_date ? monthLabel(r.visit_date) : "—" }),
          el("td", { text: r.modality || "—" }),
          el("td", { text: r.staff || "—" }),
          el("td", { text: r.notes || "—" }),
        );
        return tr;
      }),
    );
  };

  ["dha-month-filter", "dha-study-filter", "dha-status-filter", "dha-search"].forEach((id) => {
    document.getElementById(id).addEventListener("input", paint);
    document.getElementById(id).addEventListener("change", paint);
  });
  paint();
}

function renderDbsTable(data) {
  fillMonthOptions("dbs-month-filter", data.dbs_pending.map((r) => r.month_due));
  const tbody = document.querySelector("#dbs-table tbody");

  const paint = () => {
    const month = document.getElementById("dbs-month-filter").value;
    const year = document.getElementById("dbs-year-filter").value;
    const q = document.getElementById("dbs-search").value.trim().toLowerCase();

    const rows = data.dbs_pending.filter((r) => {
      if (month !== "all" && r.month_due !== month) return false;
      if (year !== "all" && r.year !== year) return false;
      if (q && !String(r.id).toLowerCase().includes(q)) return false;
      return true;
    });

    tbody.replaceChildren(
      ...rows.map((r) => {
        const tr = el("tr", { className: r.month_due < "2026-11" ? "overdue" : "" });
        tr.append(
          el("td", { text: monthLabel(r.month_due) }),
          el("td", { text: r.year }),
          el("td", { text: r.id }),
          el("td", { text: r.bundle }),
          el("td", { className: "num", text: String(r.events) }),
          el("td", { text: r.mri_date ? monthLabel(r.mri_date) : "—" }),
          el("td", { text: r.np_date ? monthLabel(r.np_date) : "—" }),
          el("td", { text: r.notes || "—" }),
        );
        return tr;
      }),
    );
  };

  ["dbs-month-filter", "dbs-year-filter", "dbs-search"].forEach((id) => {
    document.getElementById(id).addEventListener("input", paint);
    document.getElementById(id).addEventListener("change", paint);
  });
  paint();
}

function renderVista(data) {
  const v = data.vista;
  document.getElementById("vista-kpis").replaceChildren(
    kpi("Enrolled", v.enrolled, "", "accent"),
    kpi("Pending pharmacy", v.pending_pharmacy, "Financial info", "warn"),
    kpi("Clinical-ready", v.clinical_ready, "Enrolled − hold"),
  );
  document.getElementById("vista-pathway").replaceChildren(
    ...v.pathway.map((step, i) => el("li", { text: `${i + 1}. ${step}` })),
  );
  document.getElementById("vista-note").textContent = v.note;
  document.querySelector("#vista-table tbody").replaceChildren(
    ...v.months.map((m) => {
      const tr = el("tr");
      tr.append(
        el("td", { text: monthLabel(m.month) }),
        el("td", { className: "num", text: String(m.screening) }),
        el("td", { className: "num", text: String(m.virtual_baseline) }),
        el("td", { className: "num", text: String(m.pharmacy) }),
      );
      return tr;
    }),
  );
}

function renderSources(data) {
  document.querySelector("#sources-table tbody").replaceChildren(
    ...data.sources.map((s) => {
      const tr = el("tr");
      tr.append(
        el("td", { text: s.study }),
        el("td", { text: s.owner }),
        el("td", { text: s.source }),
      );
      return tr;
    }),
  );
}

function setupTabs() {
  const tabs = [...document.querySelectorAll(".tab")];
  const panels = {
    overview: document.getElementById("tab-overview"),
    dha: document.getElementById("tab-dha"),
    dbs: document.getElementById("tab-dbs"),
    vista: document.getElementById("tab-vista"),
    sources: document.getElementById("tab-sources"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      Object.entries(panels).forEach(([key, panel]) => {
        const on = key === tab.dataset.tab;
        panel.hidden = !on;
        panel.classList.toggle("active", on);
      });
    });
  });
}

async function main() {
  setupTabs();
  const data = await loadData();
  document.getElementById("as-of").textContent = `As of ${data.as_of}`;
  document.getElementById("horizon").textContent = data.horizon;
  renderKpis(data);
  renderBacklog(data);
  renderChart(data);
  renderOverviewTable(data);
  renderDhaTable(data);
  renderDbsTable(data);
  renderVista(data);
  renderSources(data);
}

main().catch((err) => {
  console.error(err);
  document.querySelector(".hero-copy p").textContent =
    `Could not load forecast data. ${err.message}`;
});
