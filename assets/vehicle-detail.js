// ================================
// VEHICLE-DETAIL.JS (OPTIMIZED & FIXED)
// ================================

const params = new URLSearchParams(window.location.search);
const vehicleId = Number(params.get("id"));

const plateEl = document.getElementById("plate");
const ownerEl = document.getElementById("owner");
const brandEl = document.getElementById("brand");
const modelEl = document.getElementById("model");
const yearEl = document.getElementById("year");
const balanceEl = document.getElementById("balance");
const carImage = document.getElementById("carImage");
const serviceBody = document.getElementById("serviceBody");
const saveBtn = document.getElementById("saveService");
const serviceNameInput = document.getElementById("serviceName");
const partNameInput = document.getElementById("partName");
const priceInput = document.getElementById("price");

let currentVehicle = null;
let currentCustomer = null;
let settings = {};
window.addEventListener("DOMContentLoaded", async() => {
    const settings = await window.api.getSettings();
    if (settings && settings.theme === "light") {
        document.body.classList.add("light-mode");
    }
});
async function loadSettings() {
    settings = await window.api.getSettings();
}

/* ===================== */
/* LOAD VEHICLE     */
/* ===================== */
async function loadVehicle() {
    // Çökmeyi engellemek için müşteri ve araçları tek seferde veya daha optimize bir API ile almak gerekir.
    // Şimdilik mevcut API'nle en hafif şekilde dönüyoruz:
    const customers = await window.api.getCustomers();

    let foundVehicle = null;
    let foundCustomer = null;

    for (const customer of customers) {
        const vehicles = await window.api.getVehicles(customer.id);
        const vehicle = vehicles.find(v => Number(v.id) === vehicleId);

        if (vehicle) {
            foundVehicle = vehicle;
            foundCustomer = customer;
            break; // Aracı bulduğumuz an döngüden çıkıyoruz (RAM'i korur)
        }
    }

    if (!foundVehicle || !foundCustomer) {
        alert("Araç bulunamadı");
        window.location.href = "vehicles.html";
        return;
    }

    currentVehicle = foundVehicle;
    currentCustomer = foundCustomer;

    plateEl.innerText = foundVehicle.plate;
    ownerEl.innerText = `${foundCustomer.name} • ${foundCustomer.phone}`;
    brandEl.innerText = foundVehicle.brand;
    modelEl.innerText = foundVehicle.model;
    yearEl.innerText = foundVehicle.year;

    carImage.src = foundVehicle.image || "../images/no-car.png";

    updateStatusUI();

    document.getElementById("editPlate").value = foundVehicle.plate || "";
    document.getElementById("editBrand").value = foundVehicle.brand || "";
    document.getElementById("editModel").value = foundVehicle.model || "";
    document.getElementById("editYear").value = foundVehicle.year || "";
    document.getElementById("editCurrentKm").value = foundVehicle.currentKm || 0;

    document.getElementById("currentKmText").innerText = `${foundVehicle.currentKm || 0} KM`;

    const nextOilEl = document.getElementById("nextOilKmText");
    const remainingKm = (foundVehicle.nextOilChangeKm || 0) - (foundVehicle.currentKm || 0);

    nextOilEl.innerText = `${foundVehicle.nextOilChangeKm || 0} KM`;
    nextOilEl.style.color = remainingKm <= 2000 ? "#ef4444" : "white";

    await loadServices();
    await loadVehicleAppointments(vehicleId);
}

/* ===================== */
/* STATUS UI        */
/* ===================== */
function updateStatusUI() {
    const statusText = document.getElementById("statusText");
    const printArea = document.getElementById("printArea");

    if (!statusText || !currentVehicle) return;

    const status = currentVehicle.status || "Serviste";
    statusText.innerText = `● ${status}`;

    if (status === "Serviste") {
        statusText.style.background = "#f59e0b";
        printArea.style.display = "none";
    } else if (status === "Hazır") {
        statusText.style.background = "#2563eb";
        printArea.style.display = "flex";
    } else {
        statusText.style.background = "#22c55e";
        printArea.style.display = "flex";
    }
}

/* ===================== */
/* SET VEHICLE STATUS  */
/* ===================== */
async function setVehicleStatus(status) {
    if (!currentVehicle) return;

    let deliveredAt = currentVehicle.deliveredAt || null;
    if (status === "Teslim Edildi") {
        deliveredAt = new Date().toISOString();
    }

    await window.api.updateVehicle({
        ...currentVehicle,
        status,
        deliveredAt
    });

    currentVehicle.status = status;
    currentVehicle.deliveredAt = deliveredAt;

    updateStatusUI();
    alert("Araç durumu güncellendi");
}
window.setVehicleStatus = setVehicleStatus;

/* ===================== */
/* WHATSAPP MESSAGES   */
/* ===================== */

// 1. Standart Hazır Mesajı
window.sendWhatsApp = async function() {
    if (!currentVehicle || !currentCustomer) {
        alert("Araç veya müşteri yüklenmedi");
        return;
    }

    const currentSettings = await window.api.getSettings();
    const template = currentSettings.whatsappTemplate || "Merhaba {customerName}, aracınız {plate} hazır. Toplam: {total} TL";

    const msg = template
        .replaceAll("{customerName}", currentCustomer.name)
        .replaceAll("{plate}", currentVehicle.plate)
        .replaceAll("{total}", balanceEl.innerText || "0")
        .replaceAll("{companyName}", currentSettings.companyName || "")
        .replaceAll("{companyPhone}", currentSettings.companyPhone || "")
        .replaceAll("{date}", new Date().toLocaleString("tr-TR"));

    const phone = (currentCustomer.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/90${phone}?text=${encodeURIComponent(msg)}`, "_blank");
};

// 2. Yağ Bakım Hatırlatma (Ayarlardan dinamik çeker)
window.sendOilReminder = async function() {
    if (!currentVehicle || !currentCustomer) {
        alert("Araç bilgisi yok");
        return;
    }

    const currentSettings = await window.api.getSettings();

    // Varsayılan şablon (eğer ayarlarda boşsa devreye girer)
    const defaultTemplate = `Merhaba {customerName},\n\n{plate} plakalı aracınızın yağ bakım zamanı yaklaşmıştır.\n\nGüncel KM: {currentKm}\nSonraki Bakım: {nextKm}\n\n{companyName}`;
    const template = currentSettings.oilWhatsappTemplate || defaultTemplate;

    // Şablondaki verileri dinamik olarak değiştiriyoruz
    const msg = template
        .replaceAll("{customerName}", currentCustomer.name)
        .replaceAll("{plate}", currentVehicle.plate)
        .replaceAll("{currentKm}", currentVehicle.currentKm || "0")
        .replaceAll("{nextKm}", currentVehicle.nextOilChangeKm || "0")
        .replaceAll("{companyName}", currentSettings.companyName || "")
        .replaceAll("{companyPhone}", currentSettings.companyPhone || "");

    const phone = currentCustomer.phone.replace(/\D/g, "");
    window.open(`https://wa.me/90${phone}?text=${encodeURIComponent(msg)}`, "_blank");
};

// 3. Teslim Edildi Mesajı
window.sendDeliveryMessage = async function() {
    if (!currentVehicle || !currentCustomer) return;

    const currentSettings = await window.api.getSettings();

    // Sabit metin yerine istersen buna da ayarlardan şablon yapabilirsin, şimdilik dinamik firma adını bağlıyoruz
    const msg = `Merhaba ${currentCustomer.name},\n\n${currentVehicle.plate} aracınız hazır ve teslim edilmiştir 🚗\n\nBizi tercih ettiğiniz için teşekkür ederiz.\n\n${currentSettings.companyName || ""}`;

    const phone = currentCustomer.phone.replace(/\D/g, "");
    window.open(`https://wa.me/90${phone}?text=${encodeURIComponent(msg)}`, "_blank");
};

/* ===================== */
/* SAVE SERVICE     */
/* ===================== */
saveBtn.addEventListener("click", async() => {
    if (!serviceNameInput.value || !priceInput.value) {
        alert("İşlem ve fiyat gerekli");
        return;
    }

    await window.api.addService({
        vehicleId,
        serviceName: serviceNameInput.value,
        partName: partNameInput.value,
        price: Number(priceInput.value),
        date: new Date().toISOString()
    });

    serviceNameInput.value = "";
    partNameInput.value = "";
    priceInput.value = "";

    await loadServices();
});

/* ===================== */
/* LOAD SERVICES    */
/* ===================== */
async function loadServices() {
    const services = await window.api.getServices(vehicleId);
    let total = 0;

    services.forEach(s => {
        total += Number(s.price || 0);
    });

    balanceEl.innerText = "₺" + total.toLocaleString("tr-TR");

    if (services.length === 0) {
        serviceBody.innerHTML = `<tr><td colspan="4">Servis kaydı yok</td></tr>`;
        return;
    }

    serviceBody.innerHTML = services.map(s => `
        <tr>
            <td>${s.serviceName}</td>
            <td>${s.partName || "-"}</td>
            <td>₺${Number(s.price).toLocaleString("tr-TR")}</td>
            <td>${formatDate(s.date)}</td>
        </tr>
    `).join("");
}

document.getElementById("oilServiceBtn").addEventListener("click", async() => {
    if (!currentVehicle) return;

    const currentKm = Number(document.getElementById("editCurrentKm").value);
    const nextKm = currentKm + 10000;

    await window.api.updateVehicle({
        ...currentVehicle,
        currentKm: currentKm,
        oilChangeKm: currentKm,
        nextOilChangeKm: nextKm,
        oilChangeDate: new Date().toISOString(),
        status: currentVehicle.status
    });

    currentVehicle.currentKm = currentKm;
    currentVehicle.oilChangeKm = currentKm;
    currentVehicle.nextOilChangeKm = nextKm;

    alert("Yağ bakımı kaydedildi ✔");
    await loadVehicle();
});

document.getElementById("servicePrintBtn").addEventListener("click", async() => {
            if (!currentVehicle || !currentCustomer) return;

            const services = await window.api.getServices(vehicleId);
            const currentSettings = await window.api.getSettings();
            let total = 0;

            const fullHtml = `
<html>
<head>
<title>Servis Fişi</title>
<style>
@media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .receipt { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
body { font-family: Arial; background: #f5f5f5; padding: 20px; }
.receipt { background: rgb(255, 255, 255); padding: 20px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
.header { text-align: center; border-bottom: 1px dashed #ccc; padding-bottom: 10px; margin-bottom: 15px; }
.logo { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
.sub { font-size: 12px; color: gray; }
.info { font-size: 13px; margin-bottom: 10px; }
.row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
.items { border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; margin: 10px 0; padding: 10px 0; }
.total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 10px; }
.footer { text-align: center; font-size: 11px; color: gray; margin-top: 15px; }
</style>
</head>
<body>
<div class="receipt">
<div class="header">
        <img src="../images/Logo1.png" style="width:60px; margin-bottom:10px;">
        <div class="logo"><h2>${currentSettings.companyName || "ORDUKAYA OTOMOTİV"}</h2></div>
        <div class="sub">Servis Fişi</div>
    </div>
    <div class="info">
        <div class="row"><span>Plaka</span><b>${currentVehicle.plate}</b></div>
        <div class="row"><span>Müşteri</span><b>${currentCustomer.name}</b></div>
        <div class="row"><span>Tarih</span><span>${new Date().toLocaleString("tr-TR")}</span></div>
    </div>
    <div class="items">
        ${services.map(s => {
            total += Number(s.price || 0);
            return `
                <div class="row">
                    <span>${s.serviceName}</span>
                    <span>${Number(s.price).toLocaleString("tr-TR")} ₺</span>
                </div>
            `;
        }).join("")}
    </div>
    <div class="total">TOPLAM: ₺${total.toLocaleString("tr-TR")}</div>
    <div class="footer">Teşekkür ederiz • <h2>${currentSettings.companyName || "ORDUKAYA OTOMOTİV"}</h2></div>
</div>
</body>
</html>
`;

    const win = window.open("", "", "width=900,height=700");
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    
    setTimeout(async () => {
        win.print();
        try {
            await window.api.savePDF(fullHtml);
        } catch (err) {
            console.error("PDF kaydedilirken hata oluştu:", err);
        }
    }, 500);
});

document.getElementById("saveEditBtn").addEventListener("click", async() => {
    if (!currentVehicle) return;

    await window.api.updateVehicle({
        ...currentVehicle,
        plate: document.getElementById("editPlate").value,
        brand: document.getElementById("editBrand").value,
        model: document.getElementById("editModel").value,
        year: document.getElementById("editYear").value,
        currentKm: Number(document.getElementById("editCurrentKm").value)
    });

    alert("Araç güncellendi");
    await loadVehicle();
});

/* ===================== */
/* FORMAT DATE      */
/* ===================== */
function formatDate(date) {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function loadVehicleAppointments(vehicleId) {
     const all = await window.api.getAppointments();
     const filtered = all.filter(a => a.vehicleId === vehicleId);
     const container = document.getElementById("vehicleAppointments");

     if (filtered.length === 0) {
         container.innerHTML = `<div style="color:#94a3b8">Randevu yok</div>`;
         return;
     }

     const html = filtered.map(a => `
         <div style="background:#0f172a; padding:12px; border-radius:12px; margin-bottom:10px;">
             <div><b>${new Date(a.date).toLocaleString("tr-TR")}</b></div>
             <div>${a.note || "-"}</div>
             <div style="margin-top:6px;">${a.status}</div>
         </div>
     `).join("");
     container.innerHTML = html;
}

/* ===================== */
/* START APP       */
/* ===================== */
// 🔥 Çift tetiklenen event listener'lar tek bir çatı altında birleştirildi.
window.addEventListener("DOMContentLoaded", async () => {
    await loadSettings();
    await loadVehicle();
});