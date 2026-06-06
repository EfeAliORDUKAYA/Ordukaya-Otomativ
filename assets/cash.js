const table = document.getElementById("cashTable");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");
const searchInput = document.getElementById("searchInput");

let currentPage = 1;
const pageLimit = 15;
let totalLogs = 0;
let searchTimeout;
window.addEventListener("DOMContentLoaded", async() => {
    const settings = await window.api.getSettings();
    if (settings && settings.theme === "light") {
        document.body.classList.add("light-mode");
    }
});

function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("tr-TR");
}

async function loadCash() {
    const searchVal = searchInput ? searchInput.value.trim() : "";

    // Performans için sadece o sayfaya ait veriyi çekiyoruz
    const result = await window.api.getCashPaged({
        page: currentPage,
        limit: pageLimit,
        search: searchVal
    });

    totalLogs = result.total;
    renderCashTable(result.data);
    updatePaginationControls();

    // Genel toplamları (Sayaçları) asenkron hesaplatabilirsiniz
    await loadCashCounters();
}

function renderCashTable(logs) {
    if (!logs || logs.length === 0) {
        table.innerHTML = `<tr><td colspan="4" style="text-align:center;">Kasa hareketi bulunamadı</td></tr>`;
        return;
    }

    table.innerHTML = logs.map(log => {
        const isVeresiye = log.type === "Veresiye";
        return `
            <tr>
                <td>${new Date(log.date).toLocaleString("tr-TR")}</td>
                <td>${log.type}</td>
                <td>${log.text}</td>
                <td style="font-weight:700; color:${isVeresiye ? "#facc15" : "#22c55e"};">
                    ${isVeresiye ? "?" : "+"} ₺${formatMoney(log.amount)}
                </td>
            </tr>
        `;
    }).join("");
}

async function loadCashCounters() {
    // Toplam kasa widget kartlarının değerlerini bozmamak için eski usul çalışan genel toplam
    const sales = await window.api.getSales();
    let totalSales = 0;
    let totalPayments = 0;

    sales.forEach(s => {
        if (Number(s.paid) === 1) totalSales += Number(s.total || 0);
    });

    const paymentLogs = JSON.parse(localStorage.getItem("cashLogs") || "[]");
    paymentLogs.forEach(p => {
        if (p.type === "payment") totalPayments += Number(p.amount || 0);
    });

    const totalCash = totalSales + totalPayments;

    document.getElementById("totalCash").innerText = "₺" + formatMoney(totalCash);
    document.getElementById("salesCash").innerText = "₺" + formatMoney(totalSales);
    document.getElementById("paymentCash").innerText = "₺" + formatMoney(totalPayments);
}

function updatePaginationControls() {
    if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
    const totalPages = Math.ceil(totalLogs / pageLimit) || 1;
    pageInfo.innerText = `Sayfa ${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    prevPageBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
    nextPageBtn.style.opacity = currentPage === totalPages ? "0.5" : "1";
}

prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadCash();
    }
});
nextPageBtn.addEventListener("click", () => {
    if (currentPage < Math.ceil(totalLogs / pageLimit)) {
        currentPage++;
        loadCash();
    }
});

if (searchInput) {
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadCash();
        }, 300);
    });
}

window.addEventListener("DOMContentLoaded", loadCash);