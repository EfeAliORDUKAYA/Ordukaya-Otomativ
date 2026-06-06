const params = new URLSearchParams(window.location.search);

const customerId = Number(params.get("id"));
window.addEventListener("DOMContentLoaded", async() => {
    const settings = await window.api.getSettings();
    if (settings && settings.theme === "light") {
        document.body.classList.add("light-mode");
    }
});

async function load() {

    const customers =
        await window.api.getCustomers();

    const sales =
        await window.api.getSales();

    const customer =
        customers.find(c =>
            Number(c.id) === customerId
        );

    if (!customer) return;

    /* CUSTOMER INFO */

    document.getElementById("name").innerText =
        customer.name;

    document.getElementById("phone").innerText =
        formatPhone(customer.phone);

    document.getElementById("debt").innerText =
        "₺" + Number(customer.debt || 0)
        .toLocaleString("tr-TR");

    /* SALES */

    const mySales =
        sales.filter(s =>
            Number(s.customerId) === customerId
        );

    let totalSales = 0;

    mySales.forEach(s => {

        totalSales +=
            Number(s.total || 0);

    });

    /* VEHICLES */

    const vehicles =
        await window.api.getVehicles(customerId);

    let totalService = 0;

    for (const vehicle of vehicles) {

        const services =
            await window.api.getServices(vehicle.id);

        services.forEach(serv => {

            totalService +=
                Number(serv.price || 0);

        });

    }

    /* TOTAL */

    const total =
        totalSales + totalService;

    document.getElementById("totalSpent").innerText =
        "₺" + total.toLocaleString("tr-TR");

    document.getElementById("balanceText").innerText =
        "₺" + (
            total -
            Number(customer.debt || 0)
        ).toLocaleString("tr-TR");

    /* LAST BUY */

    if (mySales.length > 0) {

        document.getElementById("lastBuy").innerText =
            mySales[0].productName;

    }

    /* VEHICLE AREA */

    const vehiclesArea =
        document.getElementById("vehiclesArea");

    if (vehicles.length === 0) {

        vehiclesArea.innerHTML = `
            <div style="
                color:#94a3b8;
                font-size:18px;
            ">
                Bu müşteriye ait araç yok
            </div>
        `;

    } else {

        vehiclesArea.innerHTML =
            vehicles.map(v => `

                <div class="vehicle-card"
                    onclick="openVehicle(${v.id})">

                    <img
                        src="${v.image || '../images/no-car.png'}"
                    >

                    <div class="vehicle-body">

                        <div class="vehicle-plate">
                            ${v.plate}
                        </div>

                        <div class="vehicle-model">
                            ${v.brand} ${v.model}
                        </div>

                    </div>

                </div>

            `).join("");

    }

    /* SERVICES */

    let allServices = [];

    for (const vehicle of vehicles) {

        const services =
            await window.api.getServices(vehicle.id);

        services.forEach(s => {

            allServices.push({
                ...s,
                plate: vehicle.plate
            });

        });

    }

    allServices.sort((a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );

    const serviceTable =
        document.getElementById("serviceTable");

    if (allServices.length === 0) {

        serviceTable.innerHTML = `
            <tr>
                <td colspan="5">
                    Servis kaydı bulunamadı
                </td>
            </tr>
        `;

    } else {

        serviceTable.innerHTML =
            allServices.map(s => `

                <tr>

                    <td>
                        ${new Date(s.date)
                            .toLocaleString("tr-TR")}
                    </td>

                    <td>
                        ${s.serviceName}
                    </td>

                    <td>
                        ${s.partName || "-"}
                    </td>

                    <td>
                        ₺${Number(s.price)
                            .toLocaleString("tr-TR")}
                    </td>

                    <td>
                        ${s.plate}
                    </td>

                </tr>

            `).join("");

    }

    /* PURCHASES */

    createPurchaseArea(mySales);

    /* PAYMENT */

    setupPaymentButton();

    /* EDIT FORM */

    setupEditForm(customer);

}

/* ===================== */
/*      EDIT FORM        */
/* ===================== */

function setupEditForm(customer) {

    const editName =
        document.getElementById("editName");

    const editPhone =
        document.getElementById("editPhone");

    const saveBtn =
        document.getElementById("saveCustomerBtn");

    if (!editName ||
        !editPhone ||
        !saveBtn
    ) return;

    editName.value =
        customer.name || "";

    editPhone.value =
        customer.phone || "";

    /* PHONE FORMAT */

    editPhone.oninput = (e) => {

        let value =
            e.target.value.replace(/\D/g, "");

        value = value.substring(0, 11);

        let formatted = "";

        if (value.length > 0) {
            formatted += value.substring(0, 4);
        }

        if (value.length >= 5) {
            formatted += " " + value.substring(4, 7);
        }

        if (value.length >= 8) {
            formatted += " " + value.substring(7, 9);
        }

        if (value.length >= 10) {
            formatted += " " + value.substring(9, 11);
        }

        e.target.value = formatted;

    };

    saveBtn.onclick = async() => {

        const newName =
            editName.value.trim();

        const newPhone =
            editPhone.value.trim();

        if (!newName) {

            alert("Müşteri adı gir");

            return;

        }

        try {

            saveBtn.disabled = true;

            saveBtn.innerText =
                "Kaydediliyor...";

            await window.api.updateCustomer({

                id: customer.id,

                name: newName,

                phone: newPhone,

                debt: customer.debt

            });

            alert("Müşteri güncellendi");

            await load();

        } catch (err) {

            console.error(err);

            alert("Güncelleme başarısız");

        }

        saveBtn.disabled = false;

        saveBtn.innerText =
            "Kaydet";

    };

}

/* ===================== */
/*     PURCHASE AREA     */
/* ===================== */

function createPurchaseArea(mySales) {

    let oldArea =
        document.getElementById("purchaseAreaBox");

    if (oldArea) {
        oldArea.remove();
    }

    const section =
        document.createElement("div");

    section.className = "section";

    section.id = "purchaseAreaBox";

    section.innerHTML = `

        <div class="section-title">
            🛒 Son Satın Alımlar
        </div>

        <table>

            <thead>
                <tr>
                    <th>Tarih</th>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>Tutar</th>
                </tr>
            </thead>

            <tbody id="purchaseTable"></tbody>

        </table>

    `;

    document.body.appendChild(section);

    const tbody =
        document.getElementById("purchaseTable");

    if (mySales.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    Satın alım bulunamadı
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        mySales.map(s => `

            <tr>

                <td>
                    ${new Date(s.date)
                        .toLocaleString("tr-TR")}
                </td>

                <td>
                    ${s.productName}
                </td>

                <td>
                    ${s.qty}
                </td>

                <td>
                    ₺${Number(s.total)
                        .toLocaleString("tr-TR")}
                </td>

            </tr>

        `).join("");
}

/* ===================== */
/*       PAYMENT         */
/* ===================== */

async function setupPaymentButton() {

    const btn =
        document.getElementById("paymentBtn");

    const input =
        document.getElementById("paymentAmount");

    if (!btn || !input) return;

    const customers =
        await window.api.getCustomers();

    const customer =
        customers.find(c =>
            Number(c.id) === customerId
        );

    if (!customer ||
        Number(customer.debt) <= 0
    ) {

        btn.disabled = true;

        btn.style.opacity = ".5";

        btn.style.cursor =
            "not-allowed";

        btn.innerText =
            "Borç Yok";

        return;

    }

    btn.disabled = false;

    btn.style.opacity = "1";

    btn.style.cursor = "pointer";

    btn.innerText = "Ödeme Al";

    btn.onclick = async() => {

        const amount =
            Number(input.value);
        if (amount > customer.debt) {
            alert(
                `Maksimum ödeme:
        ${customer.debt} TL`
            );
            return;
        }

        btn.disabled = true;

        btn.innerText =
            "İşleniyor...";

        const updatedCustomers =
            await window.api.getCustomers();

        const updatedCustomer =
            updatedCustomers.find(c =>
                Number(c.id) === customerId
            );

        if (!updatedCustomer) return;

        let newDebt =
            Number(updatedCustomer.debt || 0) -
            amount;

        if (newDebt < 0) {
            newDebt = 0;
        }

        await window.api.updateCustomer({

            ...updatedCustomer,

            debt: newDebt

        });

        /* CASH LOG */

        const cashLogs =
            JSON.parse(
                localStorage.getItem("cashLogs") || "[]"
            );

        cashLogs.unshift({

            type: "payment",

            customerName: updatedCustomer.name,

            amount: amount,

            date: new Date().toISOString()

        });

        localStorage.setItem(
            "cashLogs",
            JSON.stringify(cashLogs)
        );

        input.value = "";

        await load();

        alert("Ödeme alındı");

    };

}

/* ===================== */
/*     PHONE FORMAT      */
/* ===================== */

function formatPhone(phone) {

    if (!phone) return "-";

    const cleaned =
        phone.replace(/\D/g, "");

    if (cleaned.length !== 11) {
        return phone;
    }

    return `(${cleaned.slice(0,4)}) ${cleaned.slice(4,7)} ${cleaned.slice(7,9)} ${cleaned.slice(9,11)}`;

}

/* ===================== */
/*     OPEN VEHICLE      */
/* ===================== */

function openVehicle(id) {

    window.location.href =
        `vehicle-detail.html?id=${id}`;

}

/* ===================== */
/*        START          */
/* ===================== */

window.addEventListener(
    "DOMContentLoaded",
    load
);