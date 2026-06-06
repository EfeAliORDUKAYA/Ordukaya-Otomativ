const vehicleGrid = document.getElementById("vehicleGrid");
const modal = document.getElementById("modal");
const customerSelect = document.getElementById("customer");
const saveBtn = document.getElementById("saveBtn");
const searchInput = document.getElementById("searchInput");
const plateInput = document.getElementById("plate");
const brandInput = document.getElementById("brand");
const modelInput = document.getElementById("model");
const yearInput = document.getElementById("year");
const noteInput = document.getElementById("note");
const imageInput = document.getElementById("image");
const vehicleKmInput = document.getElementById("vehicleKm");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

// Sayfalama Durum Değişkenleri
let currentPage = 1;
const pageLimit = 12; // Ekranda kart tasarımı olduğu için 3'ün katı (12) çok şık durur
let totalVehicles = 0;
let searchTimeout;
window.addEventListener("DOMContentLoaded", async() => {
    const settings = await window.api.getSettings();
    if (settings && settings.theme === "light") {
        document.body.classList.add("light-mode");
    }
});
/* MODAL CONTROL */
function openModal() { modal.style.display = "flex"; }
window.openModal = openModal;

modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
});

/* LOAD CUSTOMERS (Sadece araç ekleme modalı içindeki selectbox için - Hafif ve hızlı) */
async function loadCustomers() {
    const customers = await window.api.getCustomers();
    customerSelect.innerHTML = customers.map(c => `
        <option value="${c.id}">${c.name}</option>
    `).join("");
}

/* LOAD VEHICLES (ARTIK DÖNGÜ YOK! Saniyede 1 milyon aracı bile kasmadan yönetir) */
async function loadVehicles() {
    const searchVal = searchInput.value.trim();

    const result = await window.api.getVehiclesPaged({
        page: currentPage,
        limit: pageLimit,
        search: searchVal
    });

    totalVehicles = result.total;
    renderVehicles(result.data);
    updatePaginationControls();
}

/* RENDER VEHICLES */
function renderVehicles(vehicles) {
    if (!vehicles || vehicles.length === 0) {
        vehicleGrid.innerHTML = `<div style="color:#94a3b8; font-size:18px; grid-column: 1/-1; text-align:center; padding:40px;">Araç bulunamadı</div>`;
        return;
    }

    vehicleGrid.innerHTML = vehicles.map(v => `
        <div class="card" onclick="openVehicle(${v.id})">
            <img class="car-image" src="${v.image || '../images/no-car.png'}">
            <div class="content">
                <div class="plate">${v.plate}</div>
                <div class="owner">👤 ${v.customerName || 'Bilinmeyen Müşteri'}</div>
                <div class="info-row">
                    <div class="badge">${v.brand}</div>
                    <div class="badge">${v.model}</div>
                    <div class="badge">${v.year}</div>
                    <div class="badge">${v.currentKm || 0} KM</div>
                </div>
                <div class="note">${v.note || "Araç notu bulunmuyor"}</div>
                <button class="detail-btn">Detaya Git →</button>
            </div>
        </div>
    `).join("");
}

/* PAGINATION CONTROLS */
function updatePaginationControls() {
    const totalPages = Math.ceil(totalVehicles / pageLimit) || 1;
    pageInfo.innerText = `Sayfa ${currentPage} / ${totalPages}`;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    prevPageBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
    nextPageBtn.style.opacity = currentPage === totalPages ? "0.5" : "1";
}

prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadVehicles();
    }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(totalVehicles / pageLimit);
    if (currentPage < totalPages) {
        currentPage++;
        loadVehicles();
    }
});

/* SEARCH */
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadVehicles();
    }, 300);
});

/* SAVE VEHICLE */
saveBtn.addEventListener("click", async() => {
    const file = imageInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            await saveVehicle(e.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        await saveVehicle("");
    }
});

async function saveVehicle(imagePath) {
    await window.api.addVehicle({
        customerId: Number(customerSelect.value),
        plate: plateInput.value,
        brand: brandInput.value,
        model: modelInput.value,
        year: yearInput.value,
        note: noteInput.value,
        image: imagePath,
        status: "Serviste",
        currentKm: Number(vehicleKmInput.value || 0),
        oilChangeKm: 0,
        nextOilChangeKm: Number(vehicleKmInput.value || 0) + 10000,
        oilChangeDate: null
    });

    modal.style.display = "none";
    plateInput.value = "";
    brandInput.value = "";
    modelInput.value = "";
    yearInput.value = "";
    noteInput.value = "";
    vehicleKmInput.value = "";
    imageInput.value = "";

    currentPage = 1;
    await loadVehicles();
}

function openVehicle(id) { window.location.href = `vehicle-detail.html?id=${id}`; }
window.openVehicle = openVehicle;

/* START */
window.addEventListener("DOMContentLoaded", () => {
    loadCustomers();
    loadVehicles();
});