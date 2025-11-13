const el = (id) => document.getElementById(id);
const materials = [];

// Serial number management
function getSerialNumber() {
  const serial = localStorage.getItem("pdfSerialNumber");
  return serial ? parseInt(serial) : 0;
}

function incrementSerialNumber() {
  const currentSerial = getSerialNumber();
  const newSerial = currentSerial + 1;
  localStorage.setItem("pdfSerialNumber", newSerial);
  return newSerial;
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

function recalc() {
  const tbody = el("materialsBody");
  tbody.innerHTML = "";
  let total = 0;

  materials.forEach((m, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style='text-align:center;'>${i + 1}</td>
      <td>${m.name}</td>
      <td style='text-align:right;'>${m.qty}</td>
      <td style='text-align:right;'>${formatMoney(m.price)}</td>
      <td style='text-align:right;'><button class='btn-danger' data-index='${i}'>Remove</button></td>
    `;
    tbody.appendChild(tr);
    total += Number(m.qty) * Number(m.price);
  });

  if (materials.length === 0) {
    const tr = document.createElement("tr");
    tr.className = "empty-row";
    tr.innerHTML = "<td colspan='5' class='small'>No materials added yet.</td>";
    tbody.appendChild(tr);
  }

  el("totalCell").textContent = formatMoney(total);
}

function addMaterial() {
  const name = el("materialName").value.trim();
  const qty = Number(el("qty").value);
  const price = Number(el("price").value);

  if (!name) return alert("Please enter material name/description.");
  if (!(qty > 0)) return alert("Please enter a valid quantity.");
  if (!(price >= 0)) return alert("Please enter a valid price.");

  materials.push({ name, qty, price });
  el("materialName").value = "";
  el("qty").value = "";
  el("price").value = "";
  el("materialName").focus();
  recalc();
}

function resetAll() {
  el("projectName").value = "";
  el("requisitionNo").value = "";
  el("date").value = todayISO();
  el("engineer").value = "";
  materials.splice(0, materials.length);
  recalc();
}

function buildPdfArea() {
  el("pdf_projectName").textContent = el("projectName").value;
  el("pdf_requisitionNo").textContent = el("requisitionNo").value;
  el("pdf_date").textContent = el("date").value ? new Date(el("date").value).toLocaleDateString() : "";
  el("pdf_engineer").textContent = el("engineer").value;
  el("pdf_serial").textContent = getSerialNumber();

  // Clear old content
  const tbody = el("pdf_table_body");
  tbody.innerHTML = "";

  // Define page break threshold (rows per PDF page)
  const itemsPerPage = 15;

  materials.forEach((m, i) => {
    // Insert a page-break row when threshold reached
    if (i > 0 && i % itemsPerPage === 0) {
      const brTr = document.createElement("tr");
      brTr.className = "page-break-row";
      brTr.innerHTML = `<td colspan="4"><div class="page-break"></div></td>`;
      tbody.appendChild(brTr);
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style='text-align:center;'>${i + 1}</td>
      <td>${m.name}</td>
      <td style='text-align:center;'>${m.qty}</td>
      <td style='text-align:right;'>${formatMoney(m.price)}</td>
    `;
    tbody.appendChild(tr);
  });

  const total = materials.reduce((acc, m) => acc + Number(m.qty) * Number(m.price), 0);
  el("pdf_total").textContent = formatMoney(total);
}

async function submitPdf() {
  if (!el("requisitionNo").value.trim()) return alert("Requisition No is required.");
  if (!el("date").value) return alert("Date is required.");
  if (!el("projectName").value.trim()) return alert("Project Name is required.");
  if (!el("engineer").value.trim()) return alert("Purchase Engineer name is required.");
  buildPdfArea();
  const pdfArea = el("pdfArea");
  pdfArea.classList.remove("hide");

  await new Promise((resolve) => setTimeout(resolve, 300));

  const opt = {
    margin: [10, 10, 10, 10],
    filename: `${el("requisitionNo").value || "PurchaseRequisition"}.pdf`,
    image: { type: "jpeg", quality: 1 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] } // ✅ enable CSS page breaks
  };

  await html2pdf().set(opt).from(pdfArea).save();

  pdfArea.classList.add("hide");
}

// Event bindings
el("addBtn").addEventListener("click", addMaterial);
el("resetBtn").addEventListener("click", resetAll);
el("submitBtn").addEventListener("click", submitPdf);

el("materialsBody").addEventListener("click", (e) => {
  if (e.target.matches("button.btn-danger")) {
    const index = Number(e.target.getAttribute("data-index"));
    if (!isNaN(index)) {
      materials.splice(index, 1);
      recalc();
    }
  }
});

["materialName", "qty", "price"].forEach(id => {
  el(id).addEventListener("keyup", (ev) => {
    if (ev.key === "Enter") addMaterial();
  });
});

// Initialize defaults
el("date").value = todayISO();
