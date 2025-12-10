const el = (id) => document.getElementById(id);
const materials = [];

// --- AUTO REQUISITION NUMBER LOGIC --- //
// pad with zeroes: 1 -> "000001"
function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

/**
 * On load: read last used number from localStorage ("pr_seq")
 * and show NEXT number (last + 1) in the box.
 * If none stored, start from GR-000001.
 */
function setNextRequisitionNo() {
  const storedSeq = localStorage.getItem("pr_seq");
  const lastUsed = storedSeq ? parseInt(storedSeq, 10) : 0; // last used number
  const next = lastUsed + 1;                                // next to use
  el("requisitionNo").value = "GR-" + pad(next, 6);
}

/**
 * After a successful PDF download:
 * 1) Take the current value in the box (e.g. "GR-000003")
 * 2) Save 3 as the LAST used number
 * 3) Immediately set the box to GR-000004 for the next entry
 *    (and this will also be used next time the page is opened)
 */
function incrementRequisitionNo() {
  const currentVal = el("requisitionNo").value || "";
  const currentNum = parseInt(currentVal.replace("GR-", ""), 10) || 1;

  // store the LAST used number so next session starts from currentNum + 1
  localStorage.setItem("pr_seq", currentNum);

  // update input to next number for immediate use
  const next = currentNum + 1;
  el("requisitionNo").value = "GR-" + pad(next, 6);
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
  setNextRequisitionNo();       // show the next number based on last saved
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
  incrementRequisitionNo();     // move to next GR number after successful PDF
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

// initial setup on load
el("date").value = todayISO();
window.addEventListener("DOMContentLoaded", setNextRequisitionNo);
