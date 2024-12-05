document.addEventListener("DOMContentLoaded", () => {
    const orderForm = document.getElementById("orderForm");
    const customOrderForm = document.getElementById("customOrderForm");
    const closedOrdersTableBody = document.getElementById("closedOrdersTableBody");
    const customOrdersTableBody = document.getElementById("customOrdersTableBody");

    let db;
    const request = indexedDB.open("PedidosDB", 2);

    request.onupgradeneeded = (event) => {
        db = event.target.result;

        if (!db.objectStoreNames.contains("closedOrders")) {
            db.createObjectStore("closedOrders", { keyPath: "id", autoIncrement: true });
        }

        if (!db.objectStoreNames.contains("customOrders")) {
            db.createObjectStore("customOrders", { keyPath: "id", autoIncrement: true });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadOrders(); // Carregar os pedidos salvos no banco ao iniciar a aplicação
    };

    request.onerror = () => {
        console.error("Erro ao abrir o banco de dados.");
    };

    // Função para exibir notificações de animações
    const showAnimationMessage = (message, type) => {
        const animationMessage = document.createElement("div");
        animationMessage.classList.add("animation-message", type);
        animationMessage.textContent = message;

        document.body.appendChild(animationMessage);

        setTimeout(() => {
            animationMessage.remove();
        }, 2000); // A animação dura 2 segundos
    };

    // Função para adicionar pedido
    const addOrder = (storeName, order, emailData) => {
        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        store.add(order);

        transaction.oncomplete = () => {
            loadOrders(); // Recarregar as tabelas após adicionar
            sendEmailNotification(emailData);
        };
    };

    // Função para enviar notificação por e-mail
    const sendEmailNotification = (emailData) => {
        // Usando EmailJS para enviar e-mail
        emailjs.send('service_6ronz1m', 'template_7nfzyhm', emailData, '-xkYWQt1a02rMG6lr')
            .then((response) => {
                console.log(emailData);  // Verifique se as variáveis estão sendo passadas corretamente
                console.log('E-mail enviado com sucesso', response);
            }, (error) => {
                console.log('Erro ao enviar o e-mail', error);
            });
    };

    // Função para carregar pedidos
    const loadOrders = () => {
        loadTable("closedOrders", closedOrdersTableBody, true);
        loadTable("customOrders", customOrdersTableBody, false);
    };

    const loadTable = (storeName, tableBody, isClosed) => {
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);

        const request = store.getAll();
        request.onsuccess = () => {
            const orders = request.result;
            tableBody.innerHTML = "";

            orders.forEach((order) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${order.cliente}</td>
                    <td>R$ ${parseFloat(order.valorPago).toFixed(2)}</td>
                    <td>${order.dataEntrega}</td>
                    <td>${order.sabores}</td>
                    <td>${isClosed ? order.quantidade : ""}</td>
                    <td>
                        <button class="confirmBtn" data-id="${order.id}" data-store="${storeName}">Confirmar</button>
                        <button class="deleteBtn" data-id="${order.id}" data-store="${storeName}">Remover</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            addActionListeners();
        };
    };

    const addActionListeners = () => {
        document.querySelectorAll(".confirmBtn").forEach((button) =>
            button.addEventListener("click", (event) => confirmOrder(event))
        );

        document.querySelectorAll(".deleteBtn").forEach((button) =>
            button.addEventListener("click", (event) => deleteOrder(event))
        );
    };

    const confirmOrder = (event) => {
        const id = parseInt(event.target.dataset.id, 10);
        const storeName = event.target.dataset.store;

        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        store.delete(id);

        transaction.oncomplete = () => {
            loadOrders();
            showAnimationMessage("Pedido concluído com sucesso!", "happy");
        };
    };

    const deleteOrder = (event) => {
        const id = parseInt(event.target.dataset.id, 10);
        const storeName = event.target.dataset.store;

        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        store.delete(id);

        transaction.oncomplete = () => {
            loadOrders();
            showAnimationMessage("Pedido removido!", "sad");
        };
    };

    orderForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const clientName = document.getElementById("clientName").value;

        const order = {
            cliente: clientName,
            valorPago: parseFloat(document.getElementById("paymentValue").value),
            dataEntrega: document.getElementById("deliveryDate").value,
            sabores: document.getElementById("flavors").value,
            quantidade: parseInt(document.getElementById("quantity").value, 10),
        };

        // Dados do e-mail para o pedido fechado
        const emailData = {
            pedido_tipo: "Fechado",
            cliente_nome: clientName, // Use clientName to match the template
            valor_pago: order.valorPago,
            data_entrega: order.dataEntrega,
            sabores: order.sabores,
        };

        addOrder("closedOrders", order, emailData);
        orderForm.reset();

        showAnimationMessage(`Pedido Fechado de "${clientName}" registrado!`, "happy");
    });

    customOrderForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const clientName = document.getElementById("customClientName").value;

        const saboresInput = document.getElementById("customFlavors").value;
        const sabores = saboresInput.split(",").map((s) => s.trim());

        if (sabores.length > 4) {
            alert("Um pedido personalizado pode conter no máximo 4 sabores.");
            return;
        }

        const order = {
            cliente: clientName,
            valorPago: parseFloat(document.getElementById("customPaymentValue").value),
            dataEntrega: document.getElementById("customDeliveryDate").value,
            sabores: sabores.join(", "),
        };

        // Dados do e-mail para o pedido personalizado
        const emailDataPersonalizado = {
            pedido_tipo: "Personalizado",
            cliente_nome: clientName, // Use clientName to match the template
            valor_pago: order.valorPago,
            data_entrega: order.dataEntrega,
            sabores: order.sabores,
        };

        addOrder("customOrders", order, emailDataPersonalizado);
        customOrderForm.reset();

        showAnimationMessage(`Pedido Personalizado de "${clientName}" registrado!`, "happy");
    });
});
