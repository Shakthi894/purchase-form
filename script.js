const el = (id) => document.getElementById(id);
const materials = [];

// --- AUTO REQUISITION NUMBER LOGIC --- //
function pad(num, size) {
  var s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

function setNextRequisitionNo() {
  let storedSeq = localStorage.getItem("pr_seq");
  let seq = storedSeq ? parseInt(storedSeq, 10) + 1 : 1;
  el("requisitionNo").value = "GR-" + pad(seq, 6);
}

function incrementRequisitionNo() {
  let currentVal = el("requisitionNo").value;
  let seq = parseInt(currentVal.replace("GR-", ""), 10) || 1;
  localStorage.setItem("pr_seq", seq);
  el("requisitionNo").value = "GR-" + pad(seq + 1, 6);
}
// --- END AUTO REQUISITION NUMBER LOGIC --- //

function formatMoney(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}


// -------------------- RECALC --------------------
function recalc() {
  const tbody = el("materialsBody");
  tbody.innerHTML = "";

  let estTotal = 0;
  let actTotal = 0;

  materials.forEach((m, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td style='text-align:center;'>${i + 1}</td>
      <td>${m.name}</td>
      <td style='text-align:center;'>${m.qty}</td>
      <td style='text-align:right;'>${formatMoney(m.estPrice)}</td>
      <td style='text-align:right;'>${formatMoney(m.actPrice)}</td>
      <td><button class='btn-danger' data-index='${i}'>Remove</button></td>
    `;

    tbody.appendChild(tr);

    estTotal += m.qty * m.estPrice;
    actTotal += m.qty * m.actPrice;
  });

  if (materials.length === 0) {
    tbody.innerHTML =
      `<tr><td colspan="6" class="small">No materials added yet.</td></tr>`;
  }

  el("estTotal").textContent = formatMoney(estTotal);
  el("actTotal").textContent = formatMoney(actTotal);
}


// -------------------- ADD MATERIAL --------------------
function addMaterial() {
  const name = el("materialName").value.trim();
  const qty = Number(el("qty").value);
  const estPrice = Number(el("estPrice").value);
  const actPrice = Number(el("actPrice").value);

  if (!name) return alert("Please enter material name.");
  if (!(qty > 0)) return alert("Invalid quantity.");
  if (!(estPrice >= 0)) return alert("Invalid estimated price.");
  if (!(actPrice >= 0)) return alert("Invalid actual price.");

  materials.push({ name, qty, estPrice, actPrice });

  el("materialName").value = "";
  el("qty").value = "";
  el("estPrice").value = "";
  el("actPrice").value = "";
  recalc();
}


// -------------------- RESET FORM --------------------
function resetAll() {
  el("projectName").value = "";
  setNextRequisitionNo();
  el("date").value = todayISO();
  el("engineer").value = "";
  materials.length = 0;
  recalc();
}


// -------------------- BUILD PDF --------------------
function buildPdfArea() {
  el("pdf_projectName").textContent = el("projectName").value;
  el("pdf_requisitionNo").textContent = el("requisitionNo").value;
  el("pdf_date").textContent = new Date(el("date").value).toLocaleDateString();
  el("pdf_engineer").textContent = el("engineer").value;

  const tbody = el("pdf_table_body");
  tbody.innerHTML = "";

  let estTotal = 0;
  let actTotal = 0;

  materials.forEach((m, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style='text-align:center;'>${i + 1}</td>
      <td>${m.name}</td>
      <td style='text-align:center;'>${m.qty}</td>
      <td style='text-align:right;'>${formatMoney(m.estPrice)}</td>
      <td style='text-align:right;'>${formatMoney(m.actPrice)}</td>
    `;
    tbody.appendChild(tr);

    estTotal += m.qty * m.estPrice;
    actTotal += m.qty * m.actPrice;
  });

  el("pdf_estTotal").textContent = formatMoney(estTotal);
  el("pdf_actTotal").textContent = formatMoney(actTotal);
}


// -------------------- SUBMIT PDF --------------------
async function submitPdf() {
  if (!el("projectName").value.trim()) return alert("Project Name required");
  if (!el("engineer").value.trim()) return alert("Engineer required");

  buildPdfArea();
  const pdfArea = el("pdfArea");
  pdfArea.classList.remove("hide");

  await new Promise((r) => setTimeout(r, 300));

  await html2pdf()
    .set({
      margin: 10,
      filename: `${el("requisitionNo").value}.pdf`,
      html2canvas: { scale: 2, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    })
    .from(pdfArea)
    .save();

  pdfArea.classList.add("hide");
  incrementRequisitionNo();
}


// -------------------- EVENTS --------------------
el("addBtn").addEventListener("click", addMaterial);
el("resetBtn").addEventListener("click", resetAll);
el("submitBtn").addEventListener("click", submitPdf);

el("materialsBody").addEventListener("click", (e) => {
  if (e.target.matches("button.btn-danger")) {
    const index = e.target.dataset.index;
    materials.splice(index, 1);
    recalc();
  }
});

["materialName", "qty", "estPrice", "actPrice"].forEach(id => {
  el(id).addEventListener("keyup", (ev) => {
    if (ev.key === "Enter") addMaterial();
  });
});

el("date").value = todayISO();
window.addEventListener("DOMContentLoaded", setNextRequisitionNo);
