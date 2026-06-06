const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const addBtn = document.getElementById("addBtn");
const tbody = document.getElementById("tbody");
const searchInput = document.getElementById("searchInput");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

// Sayfalama Durum Değişkenleri
let currentPage = 1;
const pageLimit = 15; // Bir sayfada kaç müşteri listelenecek
let totalCustomers = 0;
let searchTimeout;
window.addEventListener("DOMContentLoaded", async() => {
    const settings = await window.api.getSettings();
    if (settings && settings.theme === "light") {
        document.body.classList.add("light-mode");
    }
});
/* PHONE FORMAT */
phoneInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    value = value.substring(0, 11);
    let formatted = "";
    if (value.length > 0) formatted += value.substring(0, 4);
    if (value.length >= 5) formatted += " " + value.substring(4, 7);
    if (value.length >= 8) formatted += " " + value.substring(7, 9);
    if (value.length >= 10) formatted += " " + value.substring(9, 11);
    e.target.value = formatted;
});

/* LOAD CUSTOMERS */
async function loadCustomers() {
    const searchVal = searchInput.value.trim();

    // Devasa listeyi değil, sadece o sayfaya ait dilimi istiyoruz
    const result = await window.api.getCustomersPaged({
        page: currentPage,
        limit: pageLimit,
        search: searchVal
    });

    totalCustomers = result.total;
    renderCustomers(result.data);
    updatePaginationControls();
}

/* RENDER */
function renderCustomers(customers) {
    if (!customers || customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Müşteri bulunamadı</td></tr>`;
        return;
    }

    tbody.innerHTML = customers.map(c => `
        <tr>
            <td onclick="openCustomer(${c.id})">${c.name}</td>
            <td onclick="openCustomer(${c.id})">${c.phone}</td>
            <td class="debt" onclick="openCustomer(${c.id})">₺${c.debt || 0}</td>
            <td>
                <div class="actions">
                    <button class="delete-btn" onclick="deleteCustomer(event, ${c.id})">Sil</button>
                </div>
            </td>
        </tr>
    `).join("");
}

/* PAGINATION CONTROLS */
function updatePaginationControls() {
    const totalPages = Math.ceil(totalCustomers / pageLimit) || 1;
    pageInfo.innerText = `Sayfa ${currentPage} / ${totalPages}`;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    prevPageBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
    nextPageBtn.style.opacity = currentPage === totalPages ? "0.5" : "1";
}

prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadCustomers();
    }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(totalCustomers / pageLimit);
    if (currentPage < totalPages) {
        currentPage++;
        loadCustomers();
    }
});

/* SEARCH (Kasmayı önleyen akıllı geciktirici - Debounce) */
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage = 1; // Yeni aramada 1. sayfaya dön
        loadCustomers();
    }, 300);
});

/* OPEN & DELETE & ADD */
function openCustomer(id) { window.location.href = `customer-detail.html?id=${id}`; }

async function deleteCustomer(event, id) {
    event.stopPropagation();
    if (!confirm("Müşteriyi silmek istiyor musun?")) return;
    try {
        await window.api.deleteCustomer(id);
        loadCustomers();
    } catch (err) {
        console.error(err);
        alert("Müşteri silinemedi");
    }
}

addBtn.addEventListener("click", async() => {
    if (!nameInput.value.trim() || !phoneInput.value.trim()) return;
    await window.api.addCustomer({ name: nameInput.value, phone: phoneInput.value });
    nameInput.value = "";
    phoneInput.value = "";
    currentPage = 1;
    loadCustomers();
});

window.addEventListener("DOMContentLoaded", loadCustomers);