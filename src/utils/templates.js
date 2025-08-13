export const appointmentBookedTemplate = {
    subject: ({ user_name, appointment_date }) =>
        `New Appointment Booked by ${user_name} - Appointment Booked For ${appointment_date}`,

    body: ({
        user_name,
        doctor_name,
        appointment_date,
        total_price,
    }) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Appointment Confirmation</title>
    </head>
    <body style="margin:0; font-family: Arial, sans-serif; background-color:#ffffff;">

        <!-- Header -->
        <div style="text-align:center; padding:20px 0; font-size:24px; font-weight:bold;">
            ZYNQ
        </div>

        <!-- Title Section -->
        <div style="background-color:#1e1e1e; color:#ffffff; padding:40px 20px; text-align:center;">
            <h2 style="margin:0;">New Appointment Booked by ${user_name}</h2>
            <p style="margin:8px 0 0;">Appointment Booked For ${appointment_date.split(",")[1]?.trim() || ""}</p>
        </div>

        <!-- Content -->
        <div style="padding:20px; color:#333; max-width:600px; margin:0 auto;">
            <p>Hi <strong>${user_name}</strong>,</p>

            <p>A new appointment has been booked via the app. Here are the booking details:</p>

            <p><strong>User Name:</strong> ${user_name}</p>
            <p><strong>Doctor Name:</strong> ${doctor_name}</p>
            <p><strong>Date & Time:</strong> ${appointment_date}</p>
            <p><strong>Amount Paid:</strong> ${total_price}</p>

            <p>Please prepare for the scheduled session accordingly.<br/>
               This booking has been confirmed and payment has been received.</p>

            <p>Best regards,<br/>
            ZYNQ Team</p>
        </div>

        <!-- Footer -->
        <div style="text-align:center; font-size:14px; color:#999; padding:20px;">
            <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;" />
            <p>ZYNQ</p>
        </div>

    </body>
    </html>
    `
};
