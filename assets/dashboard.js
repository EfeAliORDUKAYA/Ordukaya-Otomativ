let settings = {};

const totalProductsEl = document.getElementById("totalProducts");
const lowStockEl = document.getElementById("lowStock");
const cashEl = document.getElementById("cash");
const dailyProfitEl = document.getElementById("dailyProfit");
const salesBody = document.getElementById("salesBody");

/* ===================== */
/* FORMAT */
/* ===================== */
function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("tr-TR");
}

/* ===================== */
/* 🎨 TEMA UYGULAYICI */
/* ===================== */
function applyTheme(theme) {
    if (theme === "light") {
        document.body.classList.add("light", "light-theme", "light-mode");
    } else {
        document.body.classList.remove("light", "light-theme", "light-mode");
    }
}

/* ===================== */
/* SETTINGS & COMPANY INFO */
/* ===================== */
async function loadInitialConfig() {
    try {
        settings = await window.api.getSettings() || {};

        // Temayı güvenli bir şekilde ilk açılışta basıyoruz
        applyTheme(settings.theme || "dark");

        // Firma isimlerini senkronize etme
        const companyName = settings.companyName || "ORDUKAYA OTOMOTİV";
        const topbarTitle = document.querySelector(".topbar h2");
        const sidebarTitle = document.getElementById("companyTitleSidebar");

        if (topbarTitle) topbarTitle.textContent = companyName;
        if (sidebarTitle) sidebarTitle.textContent = companyName;
    } catch (err) {
        console.error("Ayarlar yüklenirken hata oluştu:", err);
    }
}

/* ===================== */
/* DASHBOARD MAIN */
/* ===================== */
async function loadDashboard() {
    try {
        // Verileri arka plandan güvenle çekiyoruz
        const sales = await window.api.getSales() || [];
        const products = await window.api.getProducts() || [];
        const customers = await window.api.getCustomers() || [];

        /* ===================== */
        /* LOW STOCK (STOK UYARISI) */
        /* ===================== */
        const minStock = Number(settings.minStock || 5);
        let lowStockCount = 0;
        let lowStockProducts = [];

        products.forEach(p => {
            if (Number(p.stock) <= minStock) {
                lowStockCount++;
                lowStockProducts.push(p);
            }
        });

        // Eski uyarı kutusunu temizle
        let oldWarning = document.getElementById("lowStockWarning");
        if (oldWarning) oldWarning.remove();

        const warningBox = document.createElement("div");
        warningBox.id = "lowStockWarning";
        warningBox.className = "table-area";

        // 🌟 TEMA FIX: Sabit siyah renkler kaldırıldı, CSS değişkenleri ve temaya duyarlı sarı uyarı tonları eklendi
        if (lowStockProducts.length > 0) {
            warningBox.innerHTML = `
                <div class="table-header">
                    <h2 style="color: #eab308;">⚠ Kritik Stok Uyarıları</h2>
                </div>
                <div style="display:flex; flex-direction:column; gap:14px; max-height: 300px; overflow-y: auto;">
                    ${lowStockProducts.map(p => `
                        <div style="background: rgba(234, 179, 8, 0.1); border-radius:16px; padding:18px; border:1px solid #eab308; color:#eab308; font-weight:600;">
                            ${p.name} → ${p.stock} adet kaldı
                        </div>
                    `).join("")}
                </div>
            `;
        } else {
            warningBox.innerHTML = `
                <div class="table-header">
                    <h2 style="color: #22c55e;">✅ Stok Durumu İyi</h2>
                </div>
            `;
        }

        const mainContent = document.querySelector(".main");
        if (mainContent) mainContent.appendChild(warningBox);
        if (lowStockEl) lowStockEl.innerText = lowStockCount;

        /* ===================== */
        /* CASH TOTAL */
        /* ===================== */
        let totalCash = 0;
        sales.forEach(s => {
            if (s.paid !== false) {
                totalCash += Number(s.total || 0);
            }
        });
        if (cashEl) cashEl.innerText = "₺" + formatMoney(totalCash);

        /* ===================== */
        /* DAILY PROFIT */
        /* ===================== */
        const today = new Date().toDateString();
        let daily = 0;

        sales.forEach(s => {
            const saleDate = new Date(s.date).toDateString();
            if (saleDate === today && s.paid !== false) {
                daily += Number(s.total || 0);
            }
        });
        if (dailyProfitEl) dailyProfitEl.innerText = "₺" + formatMoney(daily);

        /* ===================== */
        /* LAST SALES (SON SATIŞLAR) */
        /* ===================== */
        if (salesBody) {
            if (sales.length === 0) {
                salesBody.innerHTML = `<tr><td colspan="5">Satış bulunamadı</td></tr>`;
            } else {
                const customerMap = new Map(customers.map(c => [Number(c.id), c.name]));
                salesBody.innerHTML = sales.slice(0, 10).map(s => {
                    const customerName = customerMap.get(Number(s.customerId)) || "-";
                    return `
                        <tr>
                            <td>${customerName}</td>
                            <td>${s.productName}</td>
                            <td>${s.qty}</td>
                            <td>₺${formatMoney(s.total)}</td>
                            <td>${new Date(s.date).toLocaleString("tr-TR")}</td>
                        </tr>
                    `;
                }).join("");
            }
        }

        if (totalProductsEl) totalProductsEl.innerText = products.length;

    } catch (err) {
        console.error("Dashboard verileri yüklenirken hata:", err);
    }
}

/* ===================== */
/* VEHICLE STATS */
/* ===================== */
async function loadVehicleStats() {
    try {
        const stats = await window.api.getVehicleStatusCounts();
        
        const serviste = document.getElementById("servisteCount");
        const hazir = document.getElementById("hazirCount");
        const teslim = document.getElementById("teslimCount");

        if (serviste) serviste.innerText = stats.serviste || 0;
        if (hazir) hazir.innerText = stats.hazir || 0;
        if (teslim) teslim.innerText = stats.teslim || 0;
    } catch (error) {
        console.error("İstatistikler alınırken hata oluştu:", error);
    }
}

/* ===================== */
/* START APP (CLEAN INIT) */
/* ===================== */
window.addEventListener("DOMContentLoaded", async () => {
    // Sıralı ve güvenli yükleme zinciri
    await loadInitialConfig();
    await loadDashboard();
    await loadVehicleStats();

    // Veritabanını yormayacak şekilde sadece araç sayılarını 5 saniyede bir hafifçe güncelliyoruz
    setInterval(loadVehicleStats, 5000);
});

// 🚀 KİLİTLENME FIX: window focus event'i tamamen kaldırıldı! 
// Sayfaya her tıklandığında arka arkaya binlerce gereksiz sorgu atılması engellendi.