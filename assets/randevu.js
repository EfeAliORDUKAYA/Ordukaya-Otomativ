const customerSelect = document.getElementById("customer");
const vehicleSelect = document.getElementById("vehicle");
const noteInput = document.getElementById("note");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("list");
const dateText = document.getElementById("dateText");
const hiddenDate = document.getElementById("hiddenDate");
const dateBox = document.getElementById("dateBox");
const appointmentSearch = document.getElementById("appointmentSearch");

const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

let selectedDate = null;
let currentPage = 1;
const pageLimit = 10;
let totalAppointments = 0;
let searchTimeout;
window.addEventListener("DOMContentLoaded", async() => {
    const settings = await window.api.getSettings();
    if (settings && settings.theme === "light") {
        document.body.classList.add("light-mode");
    }
});
async function init() {
    const customers = await window.api.getCustomers();
    customerSelect.innerHTML = `<option value="">Müşteri Seç</option>` +
        customers.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

    await loadAppointments();
    await loadDailyStats();
    await setupCalendar();
    await loadCounters();
}

/* LIST & PAGINATION GENERATOR */
async function loadAppointments() {
    const searchText = appointmentSearch ? appointmentSearch.value.trim() : "";

    const result = await window.api.getAppointmentsPaged({
        page: currentPage,
        limit: pageLimit,
        search: searchText
    });

    totalAppointments = result.total;
    renderAppointments(result.data);
    updatePaginationControls();
}

function renderAppointments(data) {
    if (!data || data.length === 0) {
        list.innerHTML = `<tr><td colspan="5" style="text-align:center;">Randevu bulunamadı</td></tr>`;
        return;
    }

    list.innerHTML = data.map(a => `
        <tr>
            <td>${a.customerName || "-"}</td>
            <td>${a.vehiclePlate || "-"}</td>
            <td>${new Date(a.date).toLocaleString("tr-TR")}</td>
            <td>${a.note || ""}</td>
            <td>
                <div class="status-group">
                    <button class="st ${a.status === 'Bekliyor' ? 'waiting' : ''}" onclick="changeStatus(${a.id},'Bekliyor')">Bekliyor</button>
                    <button class="st ${a.status === 'Onaylandı' ? 'in' : ''}" onclick="changeStatus(${a.id},'Onaylandı')">Onaylandı</button>
                    <button class="st ${a.status === 'Tamamlandı' ? 'done' : ''}" onclick="changeStatus(${a.id},'Tamamlandı')">Tamamlandı</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function updatePaginationControls() {
    if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
    const totalPages = Math.ceil(totalAppointments / pageLimit) || 1;
    pageInfo.innerText = `Sayfa ${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    prevPageBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
    nextPageBtn.style.opacity = currentPage === totalPages ? "0.5" : "1";
}

/* EVENT LISTENERS */
prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadAppointments();
    }
});
nextPageBtn.addEventListener("click", () => {
    if (currentPage < Math.ceil(totalAppointments / pageLimit)) {
        currentPage++;
        loadAppointments();
    }
});

if (appointmentSearch) {
    appointmentSearch.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadAppointments();
        }, 300);
    });
}

/* STATUS CHANGE */
async function changeStatus(id, status) {
    await window.api.updateAppointmentStatus({ id, status });
    await loadAppointments();
    await loadCounters();
}

/* DATE PICKER ACTIONS */
dateBox.addEventListener("click", () => {
    hiddenDate.focus();
    if (hiddenDate.showPicker) hiddenDate.showPicker();
    else hiddenDate.click();
});

hiddenDate.addEventListener("change", () => {
    selectedDate = hiddenDate.value;
    if (!selectedDate) return;
    dateText.innerText = new Date(selectedDate).toLocaleString("tr-TR");
});

customerSelect.onchange = async() => {
    const id = customerSelect.value;
    if (!id) return;
    const vehicles = await window.api.getVehicles(id);
    vehicleSelect.innerHTML = `<option value="">Araç Seç</option>` +
        vehicles.map(v => `<option value="${v.id}">${v.plate}</option>`).join("");
};

addBtn.onclick = async() => {
    if (!customerSelect.value || !vehicleSelect.value || !selectedDate) {
        alert("Tüm alanları doldur");
        return;
    }
    await window.api.addAppointment({
        customerId: Number(customerSelect.value),
        vehicleId: Number(vehicleSelect.value),
        date: selectedDate,
        note: noteInput.value
    });
    selectedDate = null;
    dateText.innerText = "Tarih seç";
    noteInput.value = "";
    currentPage = 1;
    await loadAppointments();
    await loadDailyStats();
    await setupCalendar();
    await loadCounters();
};

/* COUNTERS & CALENDAR STATS */
async function loadCounters() {
    const appointments = await window.api.getAppointments();
    const today = new Date().toISOString().split("T")[0];

    document.getElementById("todayCount").innerText = appointments.filter(a => a.date.startsWith(today)).length;
    document.getElementById("totalCount").innerText = appointments.length;
    document.getElementById("waitingCount").innerText = appointments.filter(a => a.status === "Bekliyor").length;
    document.getElementById("incomingCount").innerText = appointments.filter(a => a.status === "Onaylandı").length;
    document.getElementById("completedCount").innerText = appointments.filter(a => a.status === "Tamamlandı").length;
}

async function setupCalendar() {
    const data = await window.api.getAppointments();
    const map = {};
    data.forEach(a => {
        const d = new Date(a.date).toISOString().split("T")[0];
        map[d] = (map[d] || 0) + 1;
    });

    const calendar = document.getElementById("calendar");
    calendar.innerHTML = Object.keys(map).sort().map(day => `
        <div onclick="openDay('${day}')" class="appointment-card">
            <b>📅 ${day}</b>
            <div class="appointment-row">Toplam Randevu: <b>${map[day]}</b></div>
        </div>
    `).join("");
}

async function loadDailyStats() {
    const all = await window.api.getAppointments();
    const map = {};
    all.forEach(a => {
        const d = new Date(a.date).toLocaleDateString("tr-TR");
        map[d] = (map[d] || 0) + 1;
    });
    document.getElementById("dailyTable").innerHTML = Object.entries(map).map(([k, v]) => `
        <tr><td>${k}</td><td><b>${v}</b></td></tr>
    `).join("");
}

async function openDay(day) {
    const data = await window.api.getAppointments();
    const customers = await window.api.getCustomers();
    const list = data.filter(a => new Date(a.date).toISOString().split("T")[0] === day);

    const html = list.map(a => {
        const c = customers.find(x => x.id === a.customerId);
        return `<div><b>${c?.name || "-"}</b><br>⏰ ${new Date(a.date).toLocaleString("tr-TR")}<br>📝 ${a.note || "-"}</div><hr>`;
    }).join("");

    const win = window.open("", "", "width=500,height=600");
    win.document.write(`<h3>${day}</h3>${html}`);
}

window.changeStatus = changeStatus;
window.openDay = openDay;
window.addEventListener("DOMContentLoaded", init);