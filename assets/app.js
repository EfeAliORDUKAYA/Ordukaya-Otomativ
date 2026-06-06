const menuItems = document.querySelectorAll(".sidebar li");

menuItems.forEach(item => {

    item.addEventListener("click", () => {

        const text = item.innerText;

        if (text === "Ürünler") {
            window.location.href = "products.html";
        }

        if (text === "Satışlar") {
            window.location.href = "sales.html";
        }

        if (text === "Müşteriler") {
            window.location.href = "customers.html";
        }
        if (text === "Araçlar") {
            window.location.href = "vehicle.html";
        }

        if (text === "Kasa") {
            window.location.href = "cash.html";
        }

        if (text === "Servis Kayıtları") {
            window.location.href = "service.html";
        }

        if (text === "Ayarlar") {
            window.location.href = "settings.html";
        }

        if (text === "Dashboard") {
            window.location.href = "dashboard.html";
        }
        if (text === "Son Satışlar") {
            window.location.href = "sales-history.html";
        }

    });

});
async function loadDashboard() {

    const products = await window.api.getProducts();
    const sales = await window.api.getSales();

    const cards = document.querySelectorAll(".cards .card h1");

    const dailyProfitEl = cards[0];
    const totalProductEl = cards[1];
    const debtEl = cards[2];
    const cashEl = cards[3];

    /* ===== ÜRÜN ===== */
    totalProductEl.innerText = products.length;

    /* ===== STOK & KASA ===== */
    let totalStock = 0;
    let cash = 0;

    products.forEach(p => {
        totalStock += Number(p.stock || 0);
    });

    /* ===== GERÇEK KASA (SATIŞTAN) ===== */
    let totalSales = 0;

    sales.forEach(s => {
        totalSales += Number(s.total || 0);
    });

    cash = totalSales;

    /* ===== GÜNLÜK KAZANÇ ===== */
    const today = new Date().toDateString();

    let dailyProfit = sales
        .filter(s => new Date(s.date).toLocaleString("tr-TR"))
        .reduce((sum, s) => sum + Number(s.total), 0);

    /* ===== BORÇ (şimdilik fake kalabilir) ===== */
    let debt = cash * 0.4;

    /* ===== UI ===== */
    dailyProfitEl.innerText = "₺" + Math.round(dailyProfit);
    totalProductEl.innerText = products.length;
    debtEl.innerText = "₺" + Math.round(debt);
    cashEl.innerText = "₺" + Math.round(cash);

    /* ===== TABLO (GERÇEK SATIŞLAR) ===== */
    const tableBody = document.querySelector("tbody");

    tableBody.innerHTML = sales.slice(0, 5).map(s => `
        <tr>
            <td>${s.productName}</td>
            <td>${s.qty}</td>
            <td>₺${s.total}</td>
            <td>${new Date(s.date).toLocaleString("tr-TR")}</td>
        </tr>
    `).join("");
}

window.addEventListener("DOMContentLoaded", loadDashboard);
setInterval(loadDashboard, 5000);