// Elementleri güvenli bir şekilde çekiyoruz
const companyName = document.getElementById("companyName");
const companyPhone = document.getElementById("companyPhone");
const minStock = document.getElementById("minStock");
const receiptTemplateEl = document.getElementById("receiptTemplate");
const whatsappTemplateEl = document.getElementById("whatsappTemplate");
const oilWhatsappTemplateEl = document.getElementById("oilWhatsappTemplate");

let settings = {};

/* ===================== */
/* LOAD SETTINGS (YÜKLEME VE VARSAYILANLAR) */
/* ===================== */
async function loadSettings() {
    try {
        settings = await window.api.getSettings() || {};

        // Firma ve Tema Bilgileri
        if (companyName) companyName.value = settings.companyName || "";
        if (companyPhone) companyPhone.value = settings.companyPhone || "";
        if (minStock) minStock.value = settings.minStock || 5;

        const themeSelect = document.getElementById("themeSelect");
        if (themeSelect) {
            themeSelect.value = settings.theme || "dark";
            applyTheme(settings.theme || "dark");
        }

        /* Normal WhatsApp Şablonu Yükleme */
        if (whatsappTemplateEl) {
            whatsappTemplateEl.value = settings.whatsappTemplate ||
                `Merhaba {customerName},\n\n{plate} plakalı aracınızın servis işlemleri tamamlanmıştır. \n\nToplam Tutar: {total} ₺\n\nHayırlı yolculuklar dileriz.\n\n{companyName}\n{companyPhone}`;
        }

        /* Yağ Bakım WhatsApp Şablonu Yükleme */
        if (oilWhatsappTemplateEl) {
            oilWhatsappTemplateEl.value = settings.oilWhatsappTemplate ||
                `Merhaba {customerName},\n\n{plate} plakalı aracınızın yağ bakım zamanı yaklaşmıştır.\n\nGüncel KM: {currentKm}\nSonraki Bakım: {nextKm}\n\n{companyName}\n{companyPhone}`;
        }

        // Önizlemeleri ilk açılışta tetikle
        updatePreviews();
    } catch (err) {
        console.error("Ayarlar yüklenirken hata oluştu:", err);
    }
}

/* 🎨 TEMAYI BODY'E ENJEKTE EDEN YARDIMCI FONKSİYON */
function applyTheme(theme) {
    // CSS'lerdeki tüm olası sınıfları (light, light-theme, light-mode) aynı anda ekliyoruz ki yazıların okunmama problemi kökten çözülsün!
    if (theme === "light") {
        document.body.classList.add("light", "light-theme", "light-mode");
    } else {
        document.body.classList.remove("light", "light-theme", "light-mode");
    }
}

/* ===================== */
/* EVENT LISTENERS (GÜVENLİ DİNLEYİCİLER) */
/* ===================== */
if (whatsappTemplateEl) whatsappTemplateEl.addEventListener("input", updatePreviews);
if (oilWhatsappTemplateEl) oilWhatsappTemplateEl.addEventListener("input", updatePreviews);
if (companyName) companyName.addEventListener("input", updatePreviews);
if (companyPhone) companyPhone.addEventListener("input", updatePreviews);


/* ===================== */
/* SAVE COMPANY (FİRMA KAYDET) */
/* ===================== */
const saveCompanyBtn = document.getElementById("saveCompany");
if (saveCompanyBtn) {
    saveCompanyBtn.onclick = async() => {
        // 🚀 Güvenlik Kilidi: Çift tıklayıp veritabanını darlamayı engelle
        saveCompanyBtn.disabled = true;

        // Bellekte zaten güncel ayarlar var, tekrar getSettings çağırmaya gerek yok (Kilitlenme Sebebi buydu)
        const updatedData = {
            ...settings,
            companyName: companyName ? companyName.value : "",
            companyPhone: companyPhone ? companyPhone.value : ""
        };

        const success = await window.api.saveSettings(updatedData);
        if (success) {
            settings = updatedData; // Belleği güncelle
            alert("Firma bilgileri başarıyla kaydedildi");
            window.location.reload();
        } else {
            alert("Kaydedilirken arka planda hata oluştu!");
            saveCompanyBtn.disabled = false;
        }
    };
}

/* ===================== */
/* SAVE SYSTEM (STOK UYARISI FIX) */
/* ===================== */
const saveSystemBtn = document.getElementById("saveSystem");
if (saveSystemBtn) {
    saveSystemBtn.onclick = async() => {
        saveSystemBtn.disabled = true;

        const updatedData = {
            ...settings,
            minStock: Number(minStock ? minStock.value : 5)
        };

        const success = await window.api.saveSettings(updatedData);
        if (success) {
            settings = updatedData;
            alert("Sistem ayarları başarıyla kaydedildi");
            window.location.reload();
        } else {
            alert("Kaydedilirken hata oluştu!");
            saveSystemBtn.disabled = false;
        }
    };
}


/* ===================== */
/* SAVE WHATSAPP TEMPLATES (ŞABLONLARI KAYDET) */
/* ===================== */
const saveWhatsappBtn = document.getElementById("saveWhatsapp");
if (saveWhatsappBtn) {
    saveWhatsappBtn.onclick = async() => {
        saveWhatsappBtn.disabled = true;

        const updatedData = {
            ...settings,
            whatsappTemplate: whatsappTemplateEl ? whatsappTemplateEl.value : ""
        };

        const success = await window.api.saveSettings(updatedData);
        if (success) {
            settings = updatedData;
            alert("Araç hazır şablonu başarıyla kaydedildi");
            window.location.reload();
        } else {
            alert("Kaydedilirken hata oluştu!");
            saveWhatsappBtn.disabled = false;
        }
    };
}

const saveOilWhatsappBtn = document.getElementById("saveOilWhatsapp");
if (saveOilWhatsappBtn) {
    saveOilWhatsappBtn.onclick = async() => {
        saveOilWhatsappBtn.disabled = true;

        const updatedData = {
            ...settings,
            oilWhatsappTemplate: oilWhatsappTemplateEl ? oilWhatsappTemplateEl.value : ""
        };

        const success = await window.api.saveSettings(updatedData);
        if (success) {
            settings = updatedData;
            alert("Yağ bakım şablonu başarıyla kaydedildi");
            window.location.reload();
        } else {
            alert("Kaydedilirken hata oluştu!");
            saveOilWhatsappBtn.disabled = false;
        }
    };
}

/* ===================== */
/* SAVE THEME (TEMA KAYDET) */
/* ===================== */
const saveThemeBtn = document.getElementById("saveTheme");
if (saveThemeBtn) {
    saveThemeBtn.onclick = async() => {
        saveThemeBtn.disabled = true;
        const themeSelect = document.getElementById("themeSelect");
        const chosenTheme = themeSelect ? themeSelect.value : "dark";

        const updatedData = {
            ...settings,
            theme: chosenTheme
        };

        const success = await window.api.saveSettings(updatedData);
        if (success) {
            settings = updatedData;
            applyTheme(chosenTheme);
            alert("Tema başarıyla güncellendi!");
            window.location.reload();
        } else {
            alert("Tema kaydedilirken hata oluştu!");
            saveThemeBtn.disabled = false;
        }
    };
}

/* ===================== */
/* RECEIPT ENGINE (FİŞ MOTORU FIX) */
/* ===================== */
window.buildReceipt = async function(data) {
        const s = await window.api.getSettings() || {};
        const template = s.receiptTemplate || ["company", "date", "customer", "items", "total"];

        let html = "";
        template.forEach(block => {
                    switch (block) {
                        case "company":
                            html += `<h2>${s.companyName || ""}</h2>`;
                            break;
                        case "date":
                            html += `<div>Tarih: ${new Date().toLocaleString("tr-TR")}</div>`;
                            break;
                        case "customer":
                            html += `<div>Müşteri: ${data.customer?.name || "-"}</div>`;
                            break;
                        case "items":
                            html += `
                    <table>
                        ${data.items?.map(i => `
                            <tr>
                                <td>${i.name}</td>
                                <td>${i.qty} adet</td>
                                <td>${i.total} ₺</td>
                            </tr>
                        `).join("") || ""}
                    </table>`;
                break;
            case "total":
                html += `<h3>Toplam: ${data.total || 0} ₺</h3>`;
                break;
            case "line":
                html += `<hr>`;
                break;
        }
    });
    return html;
};

/* ===================== */
/* WHATSAPP ENGINE */
/* ===================== */
window.buildWhatsappMessage = function (template, data) {
    return (template || "")
        .replaceAll("{customerName}", data.customerName || "")
        .replaceAll("{plate}", data.plate || "")
        .replaceAll("{total}", data.total || "")
        .replaceAll("{currentKm}", data.currentKm || "")
        .replaceAll("{nextKm}", data.nextKm || "")
        .replaceAll("{companyName}", settings.companyName || "")
        .replaceAll("{companyPhone}", settings.companyPhone || "")
        .replaceAll("{date}", new Date().toLocaleString("tr-TR"));
};

/* ===================== */
/* PREVIEWS ENGINE (ANLIK ÖNİZLEME MOTORU) */
/* ===================== */
function updatePreviews() {
    const company = (companyName && companyName.value) ? companyName.value : "ORDUKAYA OTOMOTİV";
    const phone = (companyPhone && companyPhone.value) ? companyPhone.value : "0555 555 55 55";

    const whatsappPreviewEl = document.getElementById("whatsappPreview");
    if (whatsappPreviewEl && whatsappTemplateEl && whatsappTemplateEl.value) {
        whatsappPreviewEl.innerText = whatsappTemplateEl.value
            .replaceAll("{customerName}", "Faruk Ordukaya")
            .replaceAll("{plate}", "34ABC34")
            .replaceAll("{total}", "2500")
            .replaceAll("{companyName}", company)
            .replaceAll("{companyPhone}", phone);
    }

    const oilWhatsappPreviewEl = document.getElementById("oilWhatsappPreview");
    if (oilWhatsappPreviewEl && oilWhatsappTemplateEl && oilWhatsappTemplateEl.value) {
        oilWhatsappPreviewEl.innerText = oilWhatsappTemplateEl.value
            .replaceAll("{customerName}", "Ahmet Yılmaz")
            .replaceAll("{plate}", "34ABC34")
            .replaceAll("{currentKm}", "145000")
            .replaceAll("{nextKm}", "155000")
            .replaceAll("{companyName}", company)
            .replaceAll("{companyPhone}", phone);
    }
}

const btnBackup = document.getElementById("btnBackup");
if (btnBackup) {
    btnBackup.onclick = async () => {
        const res = await window.api.backupDatabase();
        alert(res.message);
    };
}

const btnRestore = document.getElementById("btnRestore");
if (btnRestore) {
    btnRestore.onclick = async () => {
        if(confirm("Mevcut tüm veriler silinecek ve yedekteki veriler yüklenecektir. Emin misiniz?")) {
            const res = await window.api.restoreDatabase();
            if(res && !res.success) {
                alert("Hata oluştu: " + res.message);
            } else {
                window.location.reload();
            }
        }
    };
}

// DOM tamamen yüklendiğinde ayarları getir
window.addEventListener("DOMContentLoaded", loadSettings);