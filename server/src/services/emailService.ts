import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

interface EmailOrder {
    id: number;
    items: any[];
    total: number;
    customer: {
        name: string;
        email: string;
        phoneNo: string;
        address: string;
    };
    status: string;
    date: string;
    estimatedReadyAt?: string;
}

const formatItems = (items: any[]) => {
    return items.map(item => `- ${item.name} (x${item.quantity || 1}): $${(Number(item.price) * (item.quantity || 1)).toFixed(2)}`).join('\n');
};

export const sendOrderConfirmation = async (order: EmailOrder) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.customer.email,
        subject: `Order Confirmation - Order #${order.id}`,
        text: `Dear ${order.customer.name},\n\nThank you for your order!\n\nOrder Details:\nOrder ID: #${order.id}\nItems:\n${formatItems(order.items)}\n\nTotal: $${Number(order.total).toFixed(2)}\n\nWe will notify you when your order status changes.\n\nBest regards,\nAntigravity Restaurant Team`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Confirmation email sent to ${order.customer.email}`);
    } catch (error) {
        console.error('Error sending confirmation email:', error);
    }
};

export const sendAdminNotification = async (order: EmailOrder) => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `New Order Received - Order #${order.id}`,
        text: `New order received!\n\nOrder Details:\nOrder ID: #${order.id}\nCustomer: ${order.customer.name} (${order.customer.email})\nPhone: ${order.customer.phoneNo}\nAddress: ${order.customer.address}\n\nItems:\n${formatItems(order.items)}\n\nTotal: $${Number(order.total).toFixed(2)}\n\nPlease check the admin dashboard for details.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Admin notification sent to ${adminEmail}`);
    } catch (error) {
        console.error('Error sending admin notification email:', error);
    }
};

export const sendOrderStatusUpdate = async (order: EmailOrder) => {
    const readyTimeText = order.estimatedReadyAt ? `\n\nEstimated Ready Time: ${new Date(order.estimatedReadyAt).toLocaleString()}` : '';
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.customer.email,
        subject: `Order Status Update - Order #${order.id}`,
        text: `Dear ${order.customer.name},\n\nYour order status has been updated to: ${order.status.toUpperCase()}.${readyTimeText}\n\nOrder ID: #${order.id}\nItems:\n${formatItems(order.items)}\nTotal: $${Number(order.total).toFixed(2)}\n\nThank you for choosing us!\n\nBest regards,\nAntigravity Restaurant Team`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Status update email sent to ${order.customer.email}`);
    } catch (error) {
        console.error('Error sending status update email:', error);
    }
};
