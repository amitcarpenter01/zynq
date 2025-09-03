export const appointmentBookedTemplate = {
  subject: ({ user_name, appointment_date }) =>
    `New Appointment Booked by ${user_name} - Appointment Booked For ${appointment_date}`,

  body: ({
    user_name,
    doctor_name,
    appointment_date,
    total_price,
    clinic_name
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
        </div>
 
        <!-- Content -->
        <div style="padding:20px; color:#333; max-width:600px; margin:0 auto;">
            <p>Hi <strong>${doctor_name}</strong>,</p>
 
            <p>A new appointment has been booked via the app. Here are the booking details:</p>
 
            <p><strong>User Name:</strong> ${user_name}</p>
            <p><strong>Expert Name:</strong> ${doctor_name}</p>
            <p><strong>Clinic Name:</strong> ${clinic_name}</p>
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


export const orderConfirmationTemplate = ({
  orderDate,
  customerName,
  products,
  totalAmount,
  logoUrl = "https://51.21.123.99:4000/white_logo.png",
  bannerImageUrl = "https://51.21.123.99:4000/product_main.png",
  clinicAddress,
  clinicName
}) => {
  return {
    subject: `Your Order Purchased`,
    body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Confirmation</title>
</head>
<style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
*{
   font-family: 'Poppins', sans-serif;
}
</style>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#ffffff;">
 
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;margin-top: 30px; margin-bottom: 30px;">
    <tr>
      <td align="center">
 
        <!-- Wrapper -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
 
          <!-- Header Logo -->
          <tr>
            <td align="center" style="background-color:#1a1a1a; padding:15px 0; color:#ffffff; font-size:20px; font-weight:bold;">
              <img src="${logoUrl}" style="width: 120px;object-fit: contain;">
            </td>
          </tr>
 
          <!-- Order Info -->
          <tr>
            <td align="center" style="padding:25px 20px 10px 20px; font-size:20px; font-weight:bold; color:#000000;">
              ORDER Purchased
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 20px 20px 20px; font-size:14px; color:#555555;">
              ${orderDate}
            </td>
          </tr>
 
          <!-- Banner Image -->
          <tr>
            <td align="center">
              <img src="${bannerImageUrl}" alt="Order Confirmed" width="600" style="display:block; width:100%; max-width:600px; height:335px; object-fit: cover;">
            </td>
          </tr>
 
          <!-- Thank You Message -->
          <tr>
            <td align="center" style="padding:30px 20px 10px 20px; color:#000000; font-size:20px; font-weight:bold;">
              We Appreciate Your Purchase!
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 20px 20px 20px; font-size:14px; color:#555555; line-height:1.5;">
              Hello ${customerName}, We're getting your order ready for dispatch. We'll notify you as soon as it's on its way.
            </td>
          </tr>
        <tr>
  <td align="center" style="padding:10px 20px 20px 20px;">
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; font-size:14px; color:#555555;">
      <tr style="background-color:#f5f5f5; font-weight:bold;">
        <th align="left">Clinic Name</th>
        <th align="left">Clinic Address</th>
        <th align="left">Date</th>
      </tr>
      <tr>
        <td>${clinicName}</td>
        <td>${clinicAddress}</td>
        <td>${orderDate}</td>
      </tr>
    </table>
  </td>
</tr>
 
          <!-- Product Details -->
          <tr>
            <td style="padding:0 0px; border-radius: 10px; box-shadow: 0px 4px 44px 3px #00000040;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e0e0e0; border-radius:8px; overflow:hidden;">
                <tr>
                  <td colspan="3" style="padding:15px; font-size:16px; font-weight:bold; color:#000000; border-bottom:1px solid #e0e0e0;">
                    Product Details
                  </td>
                </tr>
 
                ${products.map(product => `
                <!-- Product Item -->
                <tr>
               <!--   <td style="padding:15px; width:80px;">
                    <img src="${product.imageUrl || 'product_img.png'}" width="80" style="display:block; border-radius:6px;">
                  </td> -->
                  <td style="padding:15px; font-size:14px; color:#000000;">
                    ${product.name}<br>
                    <span style="color:#777777; font-size:12px;">QTY: ${product.quantity || 1}</span>
                  </td>
                  <td align="right" style="padding:15px; font-size:14px; color:#0056ff; font-weight:bold;">
                    $${product.price}
                  </td>
                </tr>
                `).join('')}
 
                <!-- Total -->
                <tr>
                  <td colspan="2" align="right" style="padding:15px; font-size:14px; color:#000000; border-top:1px solid #e0e0e0;">
                    Total
                  </td>
                  <td align="right" style="padding:15px; font-size:14px; color:#000000; font-weight:bold; border-top:1px solid #e0e0e0;">
                    $${totalAmount}
                  </td>
 
 
 
                 
                </tr>
 
              </table>
 
            </td>
          </tr>
 
        </table>
 
      </td>
    </tr>
  </table>
 
                    <div style="padding-top: 50px; text-align: left;">
<h4 style="margin-bottom: 10px;font-family: 'Poppins', sans-serif;">Cheers,</h4>
<p style="margin-top: 0px;font-family: 'Poppins', sans-serif;">ZYNQ  Team</p>
</div>
 
    <!-- Start footer -->
<table align="center" style="text-align: center; vertical-align: top; width: 100%; max-width: 600px; background-color: #282828;" width="600">
<tbody>
<tr>
<td style="width: 600px; vertical-align: top; padding-left: 30px; padding-right: 30px; padding-top: 30px; padding-bottom: 30px;" width="600px">
 
         
 
              <p style="margin-bottom:10px; margin-top: 0px; text-align:center; color:#fff;font-family: 'Poppins', sans-serif;">Need More Help?</p>
 
              <a href="#" style="color:#fff; text-decoration: underline; text-align:center; display: block; font-family: 'Poppins', sans-serif;">We are here to help you out</a>
 
            </td>
</tr>
</tbody>
</table>
<!-- End footer -->
 
 
 
</body>
</html>
    `
  };
};

export const orderConfirmationTemplateClinic = ({
  orderDate,
  customerName,
  customerAddress,
  clinicName,
  products,
  totalAmount,
  logoUrl = "https://51.21.123.99:4000/white_logo.png",
  bannerImageUrl = "https://51.21.123.99:4000/product_main.png",
  customerState,
  customerCity,
  customerzipCode,
  customerPhoneNumber
}) => {
  return {
    subject: `Your Order Purchased`,
    body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Confirmation</title>
</head>
<style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
*{
   font-family: 'Poppins', sans-serif;
}
</style>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#ffffff;">
 
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;margin-top: 30px; margin-bottom: 30px;">
    <tr>
      <td align="center">
 
        <!-- Wrapper -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
 
          <!-- Header Logo -->
          <tr>
            <td align="center" style="background-color:#1a1a1a; padding:15px 0; color:#ffffff; font-size:20px; font-weight:bold;">
              <img src="${logoUrl}" style="width: 120px;object-fit: contain;">
            </td>
          </tr>
 
          <!-- Order Info -->
          <tr>
            <td align="center" style="padding:25px 20px 10px 20px; font-size:20px; font-weight:bold; color:#000000;">
              ORDER Purchased
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 20px 20px 20px; font-size:14px; color:#555555;">
              ${orderDate}
            </td>
          </tr>
 
          <!-- Banner Image -->
          <tr>
            <td align="center">
              <img src="${bannerImageUrl}" alt="Order Confirmed" width="600" style="display:block; width:100%; max-width:600px; height:335px; object-fit: cover;">
            </td>
          </tr>
 
          <!-- Thank You Message -->
        <tr>
  <td align="center" style="padding:0 20px 20px 20px; font-size:14px; color:#555555; line-height:1.5;">
    Hello ${clinicName}, you have received a new order from ${customerName}.
  </td>
</tr>
<tr>
  <td align="center" style="padding:10px 20px 20px 20px;">
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; font-size:14px; color:#555555;">
      <tr style="background-color:#f5f5f5; font-weight:bold;">
        <th align="left">Customer Name</th>
        <th align="left">Customer Address</th>
        <th align="left">Customer State</th>
        <th align="left">Customer City</th>
        <th align="left">Customer Zip Code</th>
        <th align="left">Customer Phone Number</th>
        <th align="left">Date</th>
      </tr>
      <tr>
        <td>${customerName}</td>
        <td>${customerAddress}</td>
        <td>${customerState}</td>
        <td>${customerCity}</td>
        <td>${customerzipCode}</td>
        <td>${customerPhoneNumber}</td>
        <td>${orderDate}</td>
      </tr>
    </table>
  </td>
</tr>
 
 
          <!-- Product Details -->
          <tr>
            <td style="padding:0 0px; border-radius: 10px; box-shadow: 0px 4px 44px 3px #00000040;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e0e0e0; border-radius:8px; overflow:hidden;">
                <tr>
                  <td colspan="3" style="padding:15px; font-size:16px; font-weight:bold; color:#000000; border-bottom:1px solid #e0e0e0;">
                    Product Details
                  </td>
                </tr>
 
                ${products.map(product => `
                <!-- Product Item -->
                <tr>
               <!--   <td style="padding:15px; width:80px;">
                    <img src="${product.imageUrl || 'product_img.png'}" width="80" style="display:block; border-radius:6px;">
                  </td> -->
                  <td style="padding:15px; font-size:14px; color:#000000;">
                    ${product.name}<br>
                    <span style="color:#777777; font-size:12px;">QTY: ${product.quantity || 1}</span>
                  </td>
                  <td align="right" style="padding:15px; font-size:14px; color:#0056ff; font-weight:bold;">
                    $${product.price}
                  </td>
                </tr>
                `).join('')}
 
                <!-- Total -->
                <tr>
                  <td colspan="2" align="right" style="padding:15px; font-size:14px; color:#000000; border-top:1px solid #e0e0e0;">
                    Total
                  </td>
                  <td align="right" style="padding:15px; font-size:14px; color:#000000; font-weight:bold; border-top:1px solid #e0e0e0;">
                    $${totalAmount}
                  </td>
 
 
 
                 
                </tr>
 
              </table>
 
            </td>
          </tr>
 
        </table>
 
      </td>
    </tr>
  </table>
 
                    <div style="padding-top: 50px; text-align: left;">
<h4 style="margin-bottom: 10px;font-family: 'Poppins', sans-serif;">Cheers,</h4>
<p style="margin-top: 0px;font-family: 'Poppins', sans-serif;">ZYNQ  Team</p>
</div>
 
    <!-- Start footer -->
<table align="center" style="text-align: center; vertical-align: top; width: 100%; max-width: 600px; background-color: #282828;" width="600">
<tbody>
<tr>
<td style="width: 600px; vertical-align: top; padding-left: 30px; padding-right: 30px; padding-top: 30px; padding-bottom: 30px;" width="600px">
 
         
 
              <p style="margin-bottom:10px; margin-top: 0px; text-align:center; color:#fff;font-family: 'Poppins', sans-serif;">Need More Help?</p>
 
              <a href="#" style="color:#fff; text-decoration: underline; text-align:center; display: block; font-family: 'Poppins', sans-serif;">We are here to help you out</a>
 
            </td>
</tr>
</tbody>
</table>
<!-- End footer -->
 
 
 
</body>
</html>
    `
  };
};

export const faceScanPDFTemplate = ({
  logoUrl = "https://51.21.123.99:4000/logo1.png",
  pdf, // URL to the PDF
}) => {
  return {
    subject: `Face Scan Report PDF`,
    body: `
      <div style="text-align: center; font-family: Arial, sans-serif;">
        <img src="${logoUrl}" alt="Logo" style="width: 150px; margin-bottom: 20px;" />
        <h2>Face Scan Report</h2>
        <p>Your face scan report is ready. Click the button below to view/download it:</p>
        <a href="${pdf}" target="_blank" 
           style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
          Download PDF
        </a>
      </div>
    `
  };
};
