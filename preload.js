const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

    /* PRODUCTS */
    getVehicleStatusCounts: () => ipcRenderer.invoke("get-vehicle-status-counts"),
    getProducts: () => ipcRenderer.invoke("get-products"),
    addProduct: (p) => ipcRenderer.invoke("add-product", p),
    updateProduct: (p) => ipcRenderer.invoke("update-product", p),
    deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),

    /* CUSTOMERS */
    addCustomer: (c) => ipcRenderer.invoke("add-customer", c),
    getCustomers: () => ipcRenderer.invoke("get-customers"),
    updateCustomer: (c) => ipcRenderer.invoke("update-customer", c),
    deleteCustomer: (id) => ipcRenderer.invoke("delete-customer", id),

    addDebt: (d) => ipcRenderer.invoke("add-debt", d),
    reduceDebt: (d) => ipcRenderer.invoke("reduce-debt", d),

    /* CASH */
    addCash: (a) => ipcRenderer.invoke("add-cash", a),
    getCash: () => ipcRenderer.invoke("get-cash"),

    /* SALES */
    addSale: (s) => ipcRenderer.invoke("add-sale", s),
    getSales: () => ipcRenderer.invoke("get-sales"),

    /* VEHICLES */
    addVehicle: (v) => ipcRenderer.invoke("add-vehicle", v),
    getVehicles: (id) => ipcRenderer.invoke("get-vehicles", id),
    updateVehicle: (v) => ipcRenderer.invoke("update-vehicle", v),
    deleteVehicle: (id) => ipcRenderer.invoke("delete-vehicle", id),

    /* SERVICES */
    addService: (s) => ipcRenderer.invoke("add-service", s),
    getServices: (id) => ipcRenderer.invoke("get-services", id),
    /* RANDEVU */
    addAppointment: (a) => ipcRenderer.invoke("add-appointment", a),
    getAppointments: () => ipcRenderer.invoke("get-appointments"),

    // updateAppointmentStatus: (d) => ipcRenderer.invoke("update-appointment-status", d),
    updateAppointmentStatus: (data) =>
        ipcRenderer.invoke(
            "update-appointment-status",
            data
        ),
    savePDF: (html) => ipcRenderer.invoke("save-pdf", html),
    getLogoPath: () => ipcRenderer.invoke("get-logo-path"),

    //SETTİNGS

    getSettings: () => ipcRenderer.invoke("get-settings"),
    saveSettings: (data) => ipcRenderer.invoke("save-settings", data),
    getCustomersPaged: (args) => ipcRenderer.invoke("get-customers-paged", args),
    getVehiclesPaged: (args) => ipcRenderer.invoke("get-vehicles-paged", args),
    getProductsPaged: (args) => ipcRenderer.invoke("get-products-paged", args),
    getSalesPaged: (args) => ipcRenderer.invoke("get-sales-paged", args),
    getCashPaged: (args) => ipcRenderer.invoke("get-cash-paged", args),
    getAppointmentsPaged: (args) => ipcRenderer.invoke("get-appointments-paged", args),
    backupDatabase: () => ipcRenderer.invoke("backup-database"),
    restoreDatabase: () => ipcRenderer.invoke("restore-database"),

});