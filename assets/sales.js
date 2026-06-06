const productSearch =
    document.getElementById("productSearch");

const customerSearch =
    document.getElementById("customerSearch");

const productDropdown =
    document.getElementById("productDropdown");

const customerDropdown =
    document.getElementById("customerDropdown");

const qtyInput =
    document.getElementById("qty");

const sellBtn =
    document.getElementById("sellBtn");

const stockInfo =
    document.getElementById("stockInfo");

const priceInfo =
    document.getElementById("priceInfo");

const toast =
    document.getElementById("toast");

const paidCheck =
    document.getElementById("paidCheck");

let products = [];
let customers = [];
let settings = {};
let selectedProduct = null;
let selectedCustomer = null;

window.addEventListener("DOMContentLoaded", async() => {
    const settings = await window.api.getSettings();
    if (settings && settings.theme === "light") {
        document.body.classList.add("light-mode");
    }
});
/* TOAST */
async function loadSettings() {
    settings = await window.api.getSettings() || {};
}

function showToast(msg, type = "success") {

    toast.innerText = msg;
    toast.className = "";
    toast.classList.add("show");

    if (type === "error") {
        toast.style.background = "#7f1d1d";
    } else {
        toast.style.background = "#111827";
    }

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

/* LOAD PRODUCTS */

async function loadProducts() {

    products =
        await window.api.getProducts();

}

/* LOAD CUSTOMERS */

async function loadCustomers() {

    customers =
        await window.api.getCustomers();

}

/* PRODUCT SEARCH */

productSearch.addEventListener(
    "input",
    () => {

        const value =
            productSearch.value.toLowerCase();

        if (!value) {

            productDropdown.style.display =
                "none";

            return;

        }

        const filtered =
            products.filter(p =>
                p.name.toLowerCase()
                .includes(value)
            );

        productDropdown.innerHTML =
            filtered.map(p => `

                <div class="search-item"
                    data-id="${p.id}">

                    ${p.name}

                </div>

            `).join("");

        productDropdown.style.display =
            filtered.length ?
            "block" :
            "none";

        document
            .querySelectorAll(
                "#productDropdown .search-item"
            )
            .forEach(item => {

                item.addEventListener(
                    "click",
                    () => {

                        const id =
                            Number(
                                item.dataset.id
                            );

                        selectedProduct =
                            products.find(p =>
                                Number(p.id) === id
                            );

                        productSearch.value =
                            selectedProduct.name;

                        productDropdown.style.display =
                            "none";

                        updateInfo();

                    }
                );

            });

    }
);

/* CUSTOMER SEARCH */

customerSearch.addEventListener(
    "input",
    () => {

        const value =
            customerSearch.value.toLowerCase();

        if (!value) {

            customerDropdown.style.display =
                "none";

            return;

        }

        const filtered =
            customers.filter(c =>
                c.name.toLowerCase()
                .includes(value)
            );

        customerDropdown.innerHTML =
            filtered.map(c => `

                <div class="search-item"
                    data-id="${c.id}">

                    ${c.name}

                </div>

            `).join("");

        customerDropdown.style.display =
            filtered.length ?
            "block" :
            "none";

        document
            .querySelectorAll(
                "#customerDropdown .search-item"
            )
            .forEach(item => {

                item.addEventListener(
                    "click",
                    () => {

                        const id =
                            Number(
                                item.dataset.id
                            );

                        selectedCustomer =
                            customers.find(c =>
                                Number(c.id) === id
                            );

                        customerSearch.value =
                            selectedCustomer.name;

                        customerDropdown.style.display =
                            "none";

                    }
                );

            });

    }
);

/* INFO */

function updateInfo() {

    if (!selectedProduct) return;

    stockInfo.innerText =
        "Stok: " + selectedProduct.stock;

    priceInfo.innerText =
        "Satış: ₺" + selectedProduct.sellPrice;

}

/* SELL */

sellBtn.addEventListener(
    "click",
    async() => {

        if (!selectedProduct) {

            showToast("Ürün seç");

            return;

        }

        if (!selectedCustomer) {

            showToast("Müşteri seç");

            return;

        }

        const qty =
            Number(qtyInput.value);

        const paid =
            paidCheck.checked;

        if (selectedProduct.stock < qty) {

            showToast("Stok yetersiz");

            return;

        }

        /* STOCK */

        await window.api.updateProduct({

            ...selectedProduct,

            stock: selectedProduct.stock - qty

        });

        /* SALE */

        await window.api.addSale({

            customerId: selectedCustomer.id,

            productName: selectedProduct.name,

            qty: qty,

            total: qty *
                selectedProduct.sellPrice,

            paid: paid,

            date: new Date().toISOString()

        });

        /* DEBT */

        if (!paid) {

            await window.api.addDebt({

                customerId: selectedCustomer.id,

                amount: qty *
                    selectedProduct.sellPrice

            });

        }
        showToast(

            paid ?
            "Satış tamamlandı ✅" :
            "Borç olarak kaydedildi 💰"

        );

        qtyInput.value = 1;

        paidCheck.checked = true;

        selectedProduct = null;
        selectedCustomer = null;

        productSearch.value = "";
        customerSearch.value = "";

        stockInfo.innerText =
            "Stok: -";

        priceInfo.innerText =
            "Satış: -";

        loadProducts();

    }
);
/* ===================== */
/*      PRINT PDF        */
/* ===================== */

const printBtn =
    document.getElementById("printInvoiceBtn");

printBtn.addEventListener(
    "click",
    async() => {

        if (!selectedProduct) {

            showToast("Ürün seç");

            return;

        }

        if (!selectedCustomer) {

            showToast("Müşteri seç");

            return;

        }

        const qty =
            Number(qtyInput.value);

        const total =
            qty * selectedProduct.sellPrice;

        const paid =
            paidCheck.checked;

        const html = `

        <html>

        <head>

            <title>Fatura</title>

            <style>

                body{
                    font-family:Arial;
                    padding:40px;
                    color:#111;
                }

                .top{
                    display:flex;
                    justify-content:space-between;
                    margin-bottom:40px;
                }



                .logo-area{
                    display:flex;
                    align-items:center;
                    gap:20px;
                }

                .logo{
                    width:90px;
                    height:90px;
                    object-fit:contain;
                }

                .logo-box {
                    width: 60px;
                    height: 60px;
                    border-radius: 18px;
                    overflow: hidden;
                    background: #111827;
                    box-shadow: 0 0 25px rgba(56, 189, 248, 0.25);
                }

                .logo-box img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                 .brand{
                font-size:32px;
                font-weight:700;
            }


                .info{
                    margin-top:30px;
                    line-height:32px;
                    font-size:18px;
                }

                table{
                    width:100%;
                    border-collapse:collapse;
                    margin-top:40px;
                }

                th,td{
                    border:1px solid #ddd;
                    padding:14px;
                    text-align:left;
                }

                th{
                    background:#f3f4f6;
                }

                .total{
                    margin-top:30px;
                    text-align:right;
                    font-size:26px;
                    font-weight:700;
                }

                .status{
                    margin-top:15px;
                    text-align:right;
                    font-size:18px;
                }

            </style>

        </head>

        <body>

            <div class="top">

                <div class="logo-area">

                <img
                    class="logo"
                    src="../images/Logo1.png"
                >

                <div>

                    <h2>
                        ${settings.companyName || "ORDUKAYA OTOMOTİV"}
                    </h2>

                    <div>
                        Satış Faturası
                    </div>
                                <div>
                                Telefon:
                ${settings.companyPhone || ""}
            </div>

                </div>

            </div>


                <div>

                    ${new Date()
                        .toLocaleString("tr-TR")}

                </div>

            </div>

            <div class="info">

                <div>
                    <b>Müşteri:</b>
                    ${selectedCustomer.name}
                </div>

                <div>
                    <b>Telefon:</b>
                    ${selectedCustomer.phone}
                </div>

            </div>

            <table>

                <thead>

                    <tr>

                        <th>Ürün</th>
                        <th>Adet</th>
                        <th>Birim Fiyat</th>
                        <th>Toplam</th>

                    </tr>

                </thead>

                <tbody>

                    <tr>

                        <td>
                            ${selectedProduct.name}
                        </td>

                        <td>
                            ${qty}
                        </td>

                        <td>
                            ₺${Number(selectedProduct.sellPrice)
                                .toLocaleString("tr-TR")}
                        </td>

                        <td>
                            ₺${Number(total)
                                .toLocaleString("tr-TR")}
                        </td>

                    </tr>

                </tbody>

            </table>

            <div class="total">

                Toplam:
                ₺${Number(total)
                    .toLocaleString("tr-TR")}

            </div>

            <div class="status">

                ${
                    paid
                    ? "Ödeme Alındı ✅"
                    : "Veresiye Satış 💰"
                }

            </div>

        </body>

        </html>

        `;

        const win =
            window.open("", "_blank");

        win.document.write(html);

        win.document.close();

        win.focus();

        setTimeout(() => {

            win.print();

        }, 500);

    }
);

/* START */

window.addEventListener(
    "DOMContentLoaded",
    async() => {
        await loadSettings();
        await loadProducts();

        await loadCustomers();

    }
);

/* CLOSE DROPDOWN */

document.addEventListener(
    "click",
    (e) => {

        if (!e.target.closest(".field")) {

            productDropdown.style.display =
                "none";

            customerDropdown.style.display =
                "none";

        }

    }
);