const sqlite3 = require("sqlite3").verbose();
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require("electron-updater");
const path = require('path');
const fs = require('fs');

// Veritabanı dosyasını garantiye almak için güvenli kullanıcı verisi klasörüne taşıyoruz
const dbPath = path.join(app.getPath('userData'), 'database.db');
const db = new sqlite3.Database(dbPath);

// 🚀 SİHİRLİ DOKUNUŞ: SQLite'ın eşzamanlı sorgularda kilitlenmesini önleyen WAL modu ve bekleme süresi
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA busy_timeout = 5000;");

// Güncelleme Loglarını takip etmek için log mekanizması
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

/* ========================================== */
/* VERİTABANI BAŞLATICISI                     */
/* ========================================== */
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS products(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            stock INTEGER,
            buyPrice REAL,
            sellPrice REAL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS customers(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            phone TEXT,
            debt REAL DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS settings(
            id INTEGER PRIMARY KEY,
            companyName TEXT,
            companyPhone TEXT,
            whatsappTemplate TEXT,
            oilWhatsappTemplate TEXT,
            receiptTemplate TEXT,
            invoiceTemplate TEXT,
            theme TEXT DEFAULT 'dark',
            minStock INTEGER DEFAULT 5
        )
    `);

    db.run(`
        INSERT OR IGNORE INTO settings(id, companyName, companyPhone, theme, minStock)
        VALUES(1, 'ORDUKAYA OTOMOTİV', '', 'dark', 5)
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sales(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customerId INTEGER,
            productName TEXT,
            qty INTEGER,
            total REAL,
            paid INTEGER DEFAULT 1,
            date TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS vehicles(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customerId INTEGER,
            plate TEXT,
            brand TEXT,
            model TEXT,
            year TEXT,
            image TEXT,
            note TEXT,
            status TEXT DEFAULT 'Serviste',
            deliveredAt TEXT,
            currentKm INTEGER DEFAULT 0,
            oilChangeKm INTEGER DEFAULT 0,
            nextOilChangeKm INTEGER DEFAULT 0,
            oilChangeDate TEXT
        )
    `, () => {
        db.run("ALTER TABLE vehicles ADD COLUMN deliveredAt TEXT", (err) => {
            if (err) console.log("deliveredAt kolonu zaten mevcut veya gerek yok.");
            else console.log("deliveredAt kolonu başarıyla eklendi.");
        });
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS services(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicleId INTEGER,
            serviceName TEXT,
            partName TEXT,
            price REAL,
            date TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS cashbox(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total REAL DEFAULT 0
        )
    `);

    db.run(`INSERT OR IGNORE INTO cashbox(id, total) VALUES(1,0)`);

    db.run(`
        CREATE TABLE IF NOT EXISTS appointments(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customerId INTEGER,
            vehicleId INTEGER,
            date TEXT,
            note TEXT,
            status TEXT DEFAULT 'Bekliyor'
        )
    `);
});

/* ========================================== */
/* PENCERE YÖNETİMİ & GÜNCELLEME             */
/* ========================================== */
function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile("pages/dashboard.html");
}

app.whenReady().then(() => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    db.run(`DELETE FROM appointments WHERE date < ?`, [twoDaysAgo], (err) => {
        if (err) console.error("Eski randevular silinirken hata:", err);
    });

    createWindow();

    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify();
    }
});

autoUpdater.on("update-available", () => {
    autoUpdater.logger.info("Yeni güncelleme var, indiriliyor...");
});

autoUpdater.on("update-downloaded", () => {
    autoUpdater.logger.info("Güncelleme indi, kuruluyor...");
    autoUpdater.quitAndInstall();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        db.close();
        app.quit();
    }
});

/* ========================================== */
/* YEDEKLEME & GERİ YÜKLEME MOTORU            */
/* ========================================== */
ipcMain.handle("backup-database", async() => {
    const { filePath } = await dialog.showSaveDialog({
        title: "Veritabanını Yedekle",
        defaultPath: path.join(app.getPath("desktop"), `ordukaya_yedek_${Date.now()}.db`),
        filters: [{ name: "SQLite Veritabanı", extensions: ["db"] }]
    });

    if (!filePath) return { success: false, message: "İşlem iptal edildi." };

    try {
        fs.copyFileSync(dbPath, filePath);
        return { success: true, message: "Yedek başarıyla oluşturuldu!" };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle("restore-database", async() => {
    const { filePaths } = await dialog.showOpenDialog({
        title: "Yedek Dosyası Seçin",
        filters: [{ name: "SQLite Veritabanı", extensions: ["db"] }],
        properties: ["openFile"]
    });

    if (!filePaths || filePaths.length === 0) return { success: false, message: "Dosya seçilmedi." };

    const selectedBackupPath = filePaths[0];

    try {
        await new Promise((resolve) => db.close(() => resolve()));
        fs.copyFileSync(selectedBackupPath, dbPath);
        app.relaunch();
        app.exit(0);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

/* ========================================== */
/* IPC HANDLERS                               */
/* ========================================== */
ipcMain.handle("get-logo-path", () => {
    return path.join(__dirname, "images", "Logo1.png");
});

ipcMain.handle('save-pdf', async(event, htmlContent) => {
    let pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    const absoluteLogoPath = path.join(__dirname, 'images', 'Logo1.png').replace(/\\/g, '/');
    let fixedHtmlContent = htmlContent.replace('../images/Logo1.png', `file:///${absoluteLogoPath}`);

    const tempHtmlPath = path.join(app.getPath('userData'), 'temp-print.html');
    fs.writeFileSync(tempHtmlPath, fixedHtmlContent, 'utf8');

    try {
        await pdfWindow.loadFile(tempHtmlPath);
        await new Promise(resolve => setTimeout(resolve, 600));

        const { filePath } = await dialog.showSaveDialog({
            title: 'Servis Fişini Kaydet',
            defaultPath: path.join(app.getPath('downloads'), `servis-fisi-${Date.now()}.pdf`),
            filters: [{ name: 'PDF Dosyaları', extensions: ['pdf'] }]
        });

        if (!filePath) {
            pdfWindow.close();
            if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
            return null;
        }

        const pdfOptions = {
            marginsType: 0,
            pageSize: 'A4',
            printBackground: true,
            landscape: false
        };

        const data = await pdfWindow.webContents.printToPDF(pdfOptions);
        fs.writeFileSync(filePath, data);

        pdfWindow.close();
        if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);

        return filePath;
    } catch (error) {
        if (pdfWindow) pdfWindow.close();
        if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
        throw error;
    }
});

// CASHBOX
ipcMain.handle("add-cash", (event, amount) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE cashbox SET total = total + ? WHERE id = 1`, [amount], err => {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

ipcMain.handle("get-cash", () => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM cashbox WHERE id = 1`, [], (err, row) => {
            if (err) resolve(null);
            else resolve(row);
        });
    });
});

// DEBT
ipcMain.handle("add-debt", (event, data) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE customers SET debt = debt + ? WHERE id = ?`, [data.amount, data.customerId], err => {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

ipcMain.handle("reduce-debt", (event, data) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE customers SET debt = MAX(debt - ?, 0) WHERE id = ?`, [data.amount, data.customerId], err => {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

// VEHICLES
ipcMain.handle("add-vehicle", async(event, vehicle) => {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO vehicles(customerId, plate, brand, model, year, note, image, currentKm, oilChangeKm, nextOilChangeKm, oilChangeDate, status)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
        `, [
            vehicle.customerId, vehicle.plate, vehicle.brand, vehicle.model, vehicle.year, vehicle.note, vehicle.image,
            vehicle.currentKm || 0, vehicle.oilChangeKm || 0, vehicle.nextOilChangeKm || 0, vehicle.oilChangeDate || null, "Serviste"
        ], function(err) {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

ipcMain.handle("get-vehicles", async(event, customerId) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM vehicles WHERE customerId = ?`, [customerId], (err, rows) => {
            if (err) resolve([]);
            else resolve(rows);
        });
    });
});

ipcMain.handle("update-vehicle", async(event, v) => {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE vehicles
            SET plate=?, brand=?, model=?, year=?, image=?, note=?, status=?, deliveredAt=?, currentKm=?, oilChangeKm=?, nextOilChangeKm=?, oilChangeDate=?
            WHERE id=?
        `, [
            v.plate, v.brand, v.model, v.year, v.image, v.note, v.status, v.deliveredAt || null,
            v.currentKm || 0, v.oilChangeKm || 0, v.nextOilChangeKm || 0, v.oilChangeDate || null, v.id
        ], (err) => {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

ipcMain.handle("delete-vehicle", async(event, id) => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM vehicles WHERE id=?`, [id], function(err) {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

// SERVICES
ipcMain.handle("add-service", async(event, service) => {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO services(vehicleId, serviceName, partName, price, date)
            VALUES(?,?,?,?,?)
        `, [service.vehicleId, service.serviceName, service.partName, service.price, service.date], function(err) {
            if (err) return resolve(false);

            db.get(`SELECT customerId FROM vehicles WHERE id=?`, [service.vehicleId], (err2, vehicle) => {
                if (vehicle) {
                    db.run(`UPDATE customers SET debt = debt + ? WHERE id=?`, [service.price, vehicle.customerId], () => {
                        resolve(true);
                    });
                } else {
                    resolve(true);
                }
            });
        });
    });
});

ipcMain.handle("get-services", async(event, vehicleId) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM services WHERE vehicleId = ? ORDER BY id DESC`, [vehicleId], (err, rows) => {
            if (err) resolve([]);
            else resolve(rows);
        });
    });
});

// SALES
ipcMain.handle("add-sale", (event, s) => {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO sales(customerId, productName, qty, total, paid, date)
            VALUES(?,?,?,?,?,?)
        `, [s.customerId, s.productName, s.qty, s.total, s.paid ? 1 : 0, s.date], function(err) {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

ipcMain.handle("get-sales", () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM sales ORDER BY id DESC LIMIT 10`, [], (err, rows) => {
            if (err) resolve([]);
            else resolve(rows);
        });
    });
});

ipcMain.handle("get-logo", () => {
    const logoPath = path.join(__dirname, "images/Logo1.png");
    const image = fs.readFileSync(logoPath);
    return "data:image/png;base64," + image.toString("base64");
});

// PRODUCTS (🔥 SÜTUN HATALARI VE ASILI KALMA DURUMU TAMAMEN DÜZELTİLDİ)
ipcMain.handle("add-product", async(event, product) => {
    return new Promise((resolve) => {
        // Tablondaki gerçek sütun isimleri: name, stock, buyPrice, sellPrice
        db.run(`INSERT INTO products (name, stock, buyPrice, sellPrice) VALUES (?, ?, ?, ?)`, [product.name, Number(product.qty || product.stock || 0), Number(product.price || product.buyPrice || 0), Number(product.sellPrice || 0)],
            function(err) {
                if (err) {
                    console.error("Ürün eklenirken DB Hatası:", err);
                    resolve({ success: false, error: err.message });
                } else {
                    resolve({ success: true, id: this.lastID });
                }
            }
        );
    });
});

ipcMain.handle("get-products", async() => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM products ORDER BY id DESC`, [], (err, rows) => {
            if (err) resolve([]);
            else resolve(rows);
        });
    });
});

ipcMain.handle("update-product", (event, product) => {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE products SET name=?, stock=?, buyPrice=?, sellPrice=? WHERE id=?
        `, [product.name, product.stock, product.buyPrice, product.sellPrice, product.id], err => {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

ipcMain.handle("delete-product", async(event, id) => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM products WHERE id = ?`, [id], function(err) {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

// CUSTOMERS
ipcMain.handle("add-customer", async(event, customer) => {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO customers(name, phone, debt) VALUES(?,?,?)
        `, [customer.name, customer.phone, 0], function(err) {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

ipcMain.handle("get-customers", async() => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM customers ORDER BY id DESC`, [], (err, rows) => {
            if (err) resolve([]);
            else resolve(rows);
        });
    });
});

ipcMain.handle("delete-customer", async(event, id) => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM customers WHERE id=?`, [id], function(err) {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

ipcMain.handle("update-customer", async(event, customer) => {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE customers SET name=?, phone=?, debt=? WHERE id=?
        `, [customer.name, customer.phone, customer.debt, customer.id], function(err) {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

// APPOINTMENTS
ipcMain.handle("add-appointment", (event, a) => {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO appointments(customerId, vehicleId, date, note, status) VALUES(?,?,?,?,?)
        `, [a.customerId, a.vehicleId, a.date, a.note, "Bekliyor"], function(err) {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

ipcMain.handle("get-appointments", () => {
    return new Promise((resolve, reject) => {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        db.all(`SELECT * FROM appointments WHERE date >= ? ORDER BY date ASC`, [twoDaysAgo], (err, rows) => {
            if (err) resolve([]);
            else resolve(rows);
        });
    });
});

ipcMain.handle("update-appointment-status", (event, d) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE appointments SET status=? WHERE id=?`, [d.status, d.id], (err) => {
            if (err) resolve(false);
            else resolve(true);
        });
    });
});

// SETTINGS
ipcMain.handle("get-settings", () => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM settings WHERE id=1`, [], (err, row) => {
            if (err) resolve({});
            else resolve(row || {});
        });
    });
});

// 🔥 SAVE SETTINGS TAMAMEN GÜVENLİ VE ASLA KİLİTLENMEYEN HALE GETİRİLDİ
ipcMain.handle("save-settings", async(event, data) => {
    return new Promise((resolve) => {
        db.run(`UPDATE settings SET 
            companyName = ?, 
            companyPhone = ?, 
            whatsappTemplate = ?, 
            oilWhatsappTemplate = ?, 
            theme = ?, 
            minStock = ? WHERE id = 1`, [data.companyName, data.companyPhone, data.whatsappTemplate, data.oilWhatsappTemplate, data.theme, data.minStock],
            (err) => {
                if (err) {
                    console.error("Ayarlar güncellenirken DB Hatası:", err);
                    resolve(false);
                } else {
                    resolve(true);
                }
            }
        );
    });
});

ipcMain.handle("get-vehicle-status-counts", () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT status, deliveredAt FROM vehicles`, [], (err, rows) => {
            if (err) return resolve({ serviste: 0, hazir: 0, teslim: 0 });

            let serviste = 0;
            let hazir = 0;
            let teslim = 0;

            (rows || []).forEach(v => {
                const status = v.status || "Serviste";
                if (status === "Serviste") serviste++;
                else if (status === "Hazır") hazir++;
                else if (status === "Teslim Edildi" && v.deliveredAt) {
                    const diff = Date.now() - new Date(v.deliveredAt).getTime();
                    const minutes = diff / 1000 / 60;
                    if (minutes < 15) teslim++;
                }
            });

            resolve({ serviste, hazir, teslim });
        });
    });
});

ipcMain.handle("get-customers-paged", (event, { page, limit, search }) => {
    return new Promise((resolve, reject) => {
        const offset = (page - 1) * limit;
        let query = `SELECT * FROM customers`;
        let countQuery = `SELECT COUNT(*) as total FROM customers`;
        let params = [];

        if (search) {
            query += ` WHERE name LIKE ? OR phone LIKE ?`;
            countQuery += ` WHERE name LIKE ? OR phone LIKE ?`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;

        db.get(countQuery, params, (err, countRow) => {
            if (err) return resolve({ data: [], total: 0 });
            const total = countRow ? countRow.total : 0;

            db.all(query, [...params, limit, offset], (err, rows) => {
                if (err) return resolve({ data: [], total: 0 });
                resolve({ data: rows, total });
            });
        });
    });
});

ipcMain.handle("get-vehicles-paged", (event, { page, limit, search }) => {
    return new Promise((resolve, reject) => {
        const offset = (page - 1) * limit;
        let query = `
            SELECT v.*, c.name as customerName 
            FROM vehicles v
            LEFT JOIN customers c ON v.customerId = c.id
        `;
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM vehicles v
            LEFT JOIN customers c ON v.customerId = c.id
        `;
        let params = [];

        if (search) {
            query += ` WHERE v.plate LIKE ? OR v.brand LIKE ? OR v.model LIKE ? OR c.name LIKE ?`;
            countQuery += ` WHERE v.plate LIKE ? OR v.brand LIKE ? OR v.model LIKE ? OR c.name LIKE ?`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY v.id DESC LIMIT ? OFFSET ?`;

        db.get(countQuery, params, (err, countRow) => {
            if (err) return resolve({ data: [], total: 0 });
            const total = countRow ? countRow.total : 0;

            db.all(query, [...params, limit, offset], (err, rows) => {
                if (err) return resolve({ data: [], total: 0 });
                resolve({ data: rows, total });
            });
        });
    });
});

ipcMain.handle("get-products-paged", (event, { page, limit, search }) => {
    return new Promise((resolve, reject) => {
        const offset = (page - 1) * limit;
        let query = `SELECT * FROM products`;
        let countQuery = `SELECT COUNT(*) as total FROM products`;
        let params = [];

        if (search) {
            query += ` WHERE name LIKE ?`;
            countQuery += ` WHERE name LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;

        db.get(countQuery, params, (err, countRow) => {
            if (err) return resolve({ data: [], total: 0 });
            const total = countRow ? countRow.total : 0;

            db.all(query, [...params, limit, offset], (err, rows) => {
                if (err) return resolve({ data: [], total: 0 });
                resolve({ data: rows, total });
            });
        });
    });
});

ipcMain.handle("get-sales-paged", (event, { page, limit, search }) => {
    return new Promise((resolve, reject) => {
        const offset = (page - 1) * limit;
        let query = `
            SELECT s.*, c.name as customerName 
            FROM sales s
            LEFT JOIN customers c ON s.customerId = c.id
        `;
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM sales s
            LEFT JOIN customers c ON s.customerId = c.id
        `;
        let params = [];

        if (search) {
            query += ` WHERE s.productName LIKE ? OR c.name LIKE ?`;
            countQuery += ` WHERE s.productName LIKE ? OR c.name LIKE ?`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY s.id DESC LIMIT ? OFFSET ?`;

        db.get(countQuery, params, (err, countRow) => {
            if (err) return resolve({ data: [], total: 0 });
            const total = countRow ? countRow.total : 0;

            db.all(query, [...params, limit, offset], (err, rows) => {
                if (err) return resolve({ data: [], total: 0 });
                resolve({ data: rows, total });
            });
        });
    });
});

ipcMain.handle("get-cash-paged", (event, { page, limit, search }) => {
    return new Promise((resolve, reject) => {
        const offset = (page - 1) * limit;
        let params = [];

        let baseQuery = `
            SELECT 
                s.date as date,
                CASE WHEN CAST(s.paid AS INTEGER) = 1 THEN 'Satış' ELSE 'Veresiye' END as type,
                c.name || ' : ' || s.productName || ' x' || s.qty || CASE WHEN CAST(s.paid AS INTEGER) = 1 THEN '' ELSE ' - VERESİYE' END as text,
                s.total as amount,
                s.paid as paid
            FROM sales s
            LEFT JOIN customers c ON s.customerId = c.id
        `;

        let countQuery = `SELECT COUNT(*) as total FROM sales s LEFT JOIN customers c ON s.customerId = c.id`;

        if (search) {
            baseQuery += ` WHERE s.productName LIKE ? OR c.name LIKE ?`;
            countQuery += ` WHERE s.productName LIKE ? OR c.name LIKE ?`;
            params.push(`%${search}%`, `%${search}%`);
        }

        baseQuery += ` ORDER BY date DESC LIMIT ? OFFSET ?`;

        db.get(countQuery, params, (err, countRow) => {
            if (err) return resolve({ data: [], total: 0 });
            const total = countRow ? countRow.total : 0;

            db.all(baseQuery, [...params, limit, offset], (err, rows) => {
                if (err) return resolve({ data: [], total: 0 });
                resolve({ data: rows, total });
            });
        });
    });
});

ipcMain.handle("get-appointments-paged", (event, { page, limit, search }) => {
    return new Promise((resolve, reject) => {
        const offset = (page - 1) * limit;
        let params = [];

        let query = `
            SELECT a.*, c.name as customerName, v.plate as vehiclePlate
            FROM appointments a
            LEFT JOIN customers c ON a.customerId = c.id
            LEFT JOIN vehicles v ON a.vehicleId = v.id
        `;

        let countQuery = `
            SELECT COUNT(*) as total 
            FROM appointments a 
            LEFT JOIN customers c ON a.customerId = c.id
        `;

        if (search) {
            query += ` WHERE c.name LIKE ? OR v.plate LIKE ? OR a.note LIKE ?`;
            countQuery += ` WHERE c.name LIKE ? OR v.plate LIKE ? OR a.note LIKE ?`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY a.date DESC LIMIT ? OFFSET ?`;

        db.get(countQuery, params, (err, countRow) => {
            if (err) return resolve({ data: [], total: 0 });
            const total = countRow ? countRow.total : 0;

            db.all(query, [...params, limit, offset], (err, rows) => {
                if (err) return resolve({ data: [], total: 0 });
                resolve({ data: rows, total });
            });
        });
    });
});