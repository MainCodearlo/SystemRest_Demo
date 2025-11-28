// src/utils/printService.js

/**
 * Envía HTML al Bridge para impresión silenciosa en impresora USB
 * @param {string} title - Título del ticket (Ej: "COMANDA COCINA" o "PRE-CUENTA")
 */
export const printOrderUSB = async (tableName, items, waiterName, title = "COMANDA COCINA") => {
    try {
        // Construimos el HTML del ticket
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: sans-serif; font-size: 12px; width: 80mm; margin: 0; padding: 10px; }
                    h2 { text-align: center; margin: 0 0 5px 0; font-size: 16px; }
                    .meta { text-align: center; margin-bottom: 10px; font-size: 11px; color: #333; }
                    .line { border-top: 1px dashed #000; margin: 5px 0; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 3px; }
                    .qty { font-weight: bold; margin-right: 5px; min-width: 20px; }
                    .name { flex: 1; }
                    .price { margin-left: 5px; font-weight: bold; }
                    .total-row { display: flex; justify-content: space-between; margin-top: 10px; font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
                </style>
            </head>
            <body>
                <h2>${title}</h2>
                <div class="meta">
                    Mesa: <strong>${tableName}</strong><br>
                    Mesero: ${waiterName}<br>
                    ${new Date().toLocaleString('es-PE')}
                </div>
                <div class="line"></div>
                
                ${items.map(item => `
                    <div class="item">
                        <span class="qty">${item.quantity}</span>
                        <span class="name">${item.name}</span>
                        <span class="price">S/${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                
                <div class="line"></div>
                
                <div class="total-row">
                    <span>TOTAL:</span>
                    <span>S/${items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}</span>
                </div>
                
                <div style="text-align: center; font-size: 10px; margin-top: 15px;">*** GRACIAS POR SU VISITA ***</div>
            </body>
            </html>
        `;

        // Enviamos el HTML al bridge local
        const res = await fetch('http://localhost:3030/imprimir-usb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ htmlContent })
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        
        return true;

    } catch (error) {
        console.error("Error impresión USB:", error);
        alert("⚠️ Error de conexión con el Bridge de impresión.\nAsegúrate de que 'node server.js' esté corriendo.");
        return false;
    }
};