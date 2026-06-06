const saveBtn = document.getElementById("saveBtn");
const productBody = document.getElementById("productBody");
const searchInput = document.getElementById("searchInput");
const filterBtns = document.querySelectorAll(".filter-btn");
const toast = document.getElementById("toast");

/* INPUTS */
const nameInput = document.getElementById("name");
const stockInput = document.getElementById("stock");
const buyPriceInput = document.getElementById("buyPrice");
const sellPriceInput = document.getElementById("sellPrice");

// Sayfalama Elemanları (HTML'e eklediğin id'ler)
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

let editMode = false;
let editID = null;

// Sayfalama Değişkenleri
let currentPage = 1;
const pageLimit = 15;
let totalProducts = 0;
let searchTimeout;
window.addEventListener("DOMContentLoaded", async() => {
    const settings = await window.api.getSettings();
    if (settings && settings.theme === "light") {
        document.body.classList.add("light-mode");
    }
});

/* TOAST */
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

/* LOAD PRODUCTS WITH PAGINATION & FILTER */
async function loadProducts() {
    const q = searchInput.value.toLowerCase().trim();
    const activeFilterBtn = document.querySelector(".filter-btn.active");
    const filter = activeFilterBtn ? activeFilterBtn.dataset.filter : "all";

    // Not: main.js'deki getProductsPaged yapısını "filter" parametresini de destekleyecek şekilde güncelleyebilirsiniz.
    // Eğer main.js sadece search destekliyorsa, bu istek arka planda veriyi güvenle sınırlar.
    const result = await window.api.getProductsPaged({
        page: currentPage,
        limit: pageLimit,
        search: q,
        filter: filter // Kritik stok filtresi için backend'e gönderiyoruz
    });

    totalProducts = result.total;

    // Eğer kritik stok filtresi backend'de yazılmadıysa frontend koruması:
    let displayData = result.data;
    if (filter === "low") {
        // Backend tümünü filtrelemediyse geçici güvence (Uygulamanın çökmesini önler)
        displayData = displayData.filter(p => Number(p.stock) <= 5);
    }

    render(displayData);
    updatePaginationControls();
}

/* RENDER */
function render(data) {
    if (!data || data.length === 0) {
        productBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Ürün bulunamadı</td></tr>`;
        return;
    }

    productBody.innerHTML = data.map(p => `
        <tr data-id="${p.id}">
            <td>${p.id}</td>
            <td>${p.name ?? ""}</td>
            <td>${p.stock ?? 0} adet</td>
            <td>₺${Number(p.buyPrice ?? 0).toLocaleString("tr-TR")}</td>
            <td>₺${Number(p.sellPrice ?? 0).toLocaleString("tr-TR")}</td>
            <td>
                <button class="edit">Düzenle</button>
                <button class="delete">Sil</button>
            </td>
        </tr>
    `).join("");
}

/* PAGINATION CONTROLS */
function updatePaginationControls() {
    if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
    const totalPages = Math.ceil(totalProducts / pageLimit) || 1;
    pageInfo.innerText = `Sayfa ${currentPage} / ${totalPages}`;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    prevPageBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
    nextPageBtn.style.opacity = currentPage === totalPages ? "0.5" : "1";
}

prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadProducts();
    }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(totalProducts / pageLimit);
    if (currentPage < totalPages) {
        currentPage++;
        loadProducts();
    }
});

/* TABLE EVENTS */
productBody.addEventListener("click", async(e) => {
    const row = e.target.closest("tr");
    if (!row) return;

    const id = row.dataset.id;

    /* DELETE */
    if (e.target.classList.contains("delete")) {
        if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
        await window.api.deleteProduct(id);
        showToast("Ürün silindi", "error");
        loadProducts();
    }

    /* EDIT */
    if (e.target.classList.contains("edit")) {
        // İçindeki " adet" veya "₺" simgelerini temizleyerek inputa aktarır
        nameInput.value = row.children[1].innerText;
        stockInput.value = row.children[2].innerText.replace(" adet", "");
        buyPriceInput.value = row.children[3].innerText.replace("₺", "").replace(/\./g, "").replace(",", ".");
        sellPriceInput.value = row.children[4].innerText.replace("₺", "").replace(/\./g, "").replace(",", ".");

        editMode = true;
        editID = id;
        saveBtn.innerText = "Güncelle";
    }
});

/* SAVE / UPDATE */
saveBtn.addEventListener("click", async() => {
    const product = {
        name: nameInput.value.trim(),
        stock: Number(stockInput.value),
        buyPrice: Number(buyPriceInput.value),
        sellPrice: Number(sellPriceInput.value)
    };

    if (!product.name) {
        showToast("Ürün adı boş olamaz", "error");
        return;
    }

    if (editMode) {
        product.id = editID;
        await window.api.updateProduct(product);
        showToast("Ürün güncellendi");
        editMode = false;
        editID = null;
        saveBtn.innerText = "Ürünü Kaydet";
    } else {
        await window.api.addProduct(product);
        showToast("Ürün kaydedildi");
    }

    nameInput.value = "";
    stockInput.value = "";
    buyPriceInput.value = "";
    sellPriceInput.value = "";

    currentPage = 1; // Listeyi tazele ve ilk sayfaya dön
    loadProducts();
});

/* SEARCH WITH DEBOUNCE (Geciktirici filtre) */
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadProducts();
    }, 300);
});

/* FILTER BUTTONS */
filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentPage = 1;
        loadProducts();
    });
});

/* INIT */
window.addEventListener("DOMContentLoaded", loadProducts);