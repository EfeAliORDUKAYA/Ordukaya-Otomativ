const table = document.getElementById("salesTable"); // HTML'deki tbody id'si ile eşleştiğinden emin olun
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");
const searchInput = document.getElementById("searchInput");

let salesCache = [];

// Sayfalama Ayarları
let currentPage = 1;
const pageLimit = 20;
let totalSales = 0;
let searchTimeout;
window.addEventListener("DOMContentLoaded", async() => {
    const settings = await window.api.getSettings();
    if (settings && settings.theme === "light") {
        document.body.classList.add("light-mode");
    }
});

async function loadSales() {
    const searchVal = searchInput ? searchInput.value.trim() : "";

    // Arka plandaki JOIN'li akıllı sorguyu çağırıyoruz
    const result = await window.api.getSalesPaged({
        page: currentPage,
        limit: pageLimit,
        search: searchVal
    });

    totalSales = result.total;
    salesCache = result.data; // Yazdırma işlemi için hafızada tutuyoruz

    if (!salesCache || salesCache.length === 0) {
        table.innerHTML = `<tr><td colspan="7" style="text-align:center;">Satış bulunamadı</td></tr>`;
        updatePaginationControls();
        return;
    }

    table.innerHTML = salesCache.map(s => `
        <tr>
            <td>${new Date(s.date).toLocaleString("tr-TR")}</td>
            <td>${s.customerName || "-"}</td>
            <td>${s.productName}</td>
            <td>${s.qty} adet</td>
            <td>₺${Number(s.total).toLocaleString("tr-TR")}</td>
            <td>
                ${Number(s.paid) === 1 ? "Ödendi ✅" : "Veresiye 💰"}
            </td>
            <td>
                <div class="actions">
                    <button class="btn print" onclick="printInvoice(${s.id})">Yazdır</button>
                    <button class="btn pdf" onclick="savePDF(${s.id})">PDF</button>
                </div>
            </td>
        </tr>
    `).join("");

    updatePaginationControls();
}

/* PAGINATION CONTROLS */
function updatePaginationControls() {
    if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
    const totalPages = Math.ceil(totalSales / pageLimit) || 1;
    pageInfo.innerText = `Sayfa ${currentPage} / ${totalPages}`;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    prevPageBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
    nextPageBtn.style.opacity = currentPage === totalPages ? "0.5" : "1";
}

prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadSales();
    }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(totalSales / pageLimit);
    if (currentPage < totalPages) {
        currentPage++;
        loadSales();
    }
});

/* SEARCH IN SALES HISTORY */
if (searchInput) {
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadSales();
        }, 300);
    });
}

/* ===================== */
/* PRINT INVOICE (ID Tabanlı Güvenli Sistem) */
/* ===================== */
async function printInvoice(saleId) {
    const sale = salesCache.find(s => s.id === saleId);
    if (!sale) return;

    // customerName zaten sorgudan join ile hazır geliyor
    const mockCustomer = { name: sale.customerName, phone: sale.customerPhone || "-" };

    const html = createInvoiceHTML(sale, mockCustomer);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => { win.print(); }, 500);
}

/* ===================== */
/* SAVE PDF (ID Tabanlı Güvenli Sistem) */
/* ===================== */
async function savePDF(saleId) {
    const sale = salesCache.find(s => s.id === saleId);
    if (!sale) return;

    const mockCustomer = { name: sale.customerName, phone: sale.customerPhone || "-" };

    const html = createInvoiceHTML(sale, mockCustomer);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => { win.print(); }, 500);
}

/* ===================== */
/* INVOICE TEMPLATE */
/* ===================== */
function createInvoiceHTML(sale, customer) {
    const isPaid = Number(sale.paid) === 1;
    return `
<html>
<head>
<title>Fatura</title>
<style>
body{ font-family:Arial; padding:40px; color:#111; }
.top{ display:flex; justify-content:space-between; align-items:center; margin-bottom:40px; }
.logo-area{ display:flex; align-items:center; gap:20px; }
.logo{ width:80px; height:80px; object-fit:contain; }
.brand{ font-size:28px; font-weight:700; }
.info{ margin-top:25px; line-height:28px; font-size:16px; }
table{ width:100%; border-collapse:collapse; margin-top:30px; }
th,td{ border:1px solid #ddd; padding:12px; }
th{ background:#f3f4f6; }
.total{ margin-top:25px; text-align:right; font-size:24px; font-weight:700; }
.status{ margin-top:10px; text-align:right; font-size:16px; font-weight:600; }
</style>
</head>
<body>
<div class="top">
    <div class="logo-area">
        <img class="logo" src="../images/Logo1.png">
        <div>
            <div class="brand">ORDUKAYA OTOMOTİV</div>
            <div>Satış Faturası</div>
        </div>
    </div>
    <div>${new Date(sale.date).toLocaleString("tr-TR")}</div>
</div>
<div class="info">
    <div><b>Müşteri:</b> ${customer?.name || "-"}</div>
</div>
<table>
    <thead>
        <tr><th>Ürün</th><th>Adet</th><th>Tutar</th></tr>
    </thead>
    <tbody>
        <tr>
            <td>${sale.productName}</td>
            <td>${sale.qty}</td>
            <td>₺${Number(sale.total).toLocaleString("tr-TR")}</td>
        </tr>
    </tbody>
</table>
<div class="total">Toplam: ₺${Number(sale.total).toLocaleString("tr-TR")}</div>
<div class="status">${isPaid ? "Ödeme Alındı ✅" : "Veresiye Satış 💰"}</div>
</body>
</html>`;
}

// Global scope tanımlamaları (Düğmeler inline onclick kullandığı için şart)
window.printInvoice = printInvoice;
window.savePDF = savePDF;

window.addEventListener("DOMContentLoaded", loadSales);