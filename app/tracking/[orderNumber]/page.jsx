import OrderTracker from '@/components/order/OrderTracker';

export const metadata = {
    title: 'Seguimiento de Pedido - Meeting Resto Bar',
    description: 'Seguí el estado de tu pedido en tiempo real',
};

export default async function TrackingPage({ params }) {
    const { orderNumber } = await params;

    return <OrderTracker orderNumber={orderNumber} />;
}
