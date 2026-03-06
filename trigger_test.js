const mongoose = require('mongoose');

async function triggerDirectTest() {
    await mongoose.connect('mongodb+srv://gonzapal18:Rochio18*@meeetingdb.z1yv0.mongodb.net/meeting_db?retryWrites=true&w=majority&appName=meeetingDB');
    const Order = mongoose.connection.collection('orders');

    const fakeId = new mongoose.Types.ObjectId();
    const now = new Date();

    await Order.insertOne({
        _id: fakeId,
        orderNumber: `TEST-AGENT-${Date.now().toString().slice(-4)}`,
        location: { locationId: "location1" },
        paymentStatus: "approved",
        status: "confirmed",
        printStatus: { printed: false, error: false },
        printHistory: [],
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        customer: { name: "Prueba Local" },
        items: [
            {
                _id: new mongoose.Types.ObjectId(),
                itemId: new mongoose.Types.ObjectId('67ad84aa9cfad0fb1eb24cf7'), // Cualquier item id real de la BD
                name: "BEBIDA DE PRUEBA BARRA COM1",
                quantity: 1,
                price: 0
            }
        ]
    });
    console.log("Orden inyectada. Esperando al agente...");
    process.exit(0);
}

triggerDirectTest();
